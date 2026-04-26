import { useEffect, useMemo, useState } from "react";
import type { BuildIntentSignals } from "../lib/buildIntentTypes";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";
import {
  applyCorePreset,
  DEPTH_OPTIONS,
  fillBalancedAssumptions,
  mergeQuickRollPreserveIdentity,
  optionLabel,
  PROF_OPTIONS,
  PROF_OPTIONS_ADVANCED,
  PROFESSION_INTENT_ANCHOR_TAGS,
  RACE_MODES,
  RACE_MODE_IDS,
  professionPickToTags,
  rollRandomQuickPickSignals,
  STAT_OPTIONS,
  STAT_IDS,
  toggleList,
  type CorePreset,
  type IntentDepth,
  type ProfessionId,
  VECTOR_IDS,
  VECTOR_OPTIONS,
} from "./intent/intentOptions";
import { ProfessionPicker } from "./intent/ProfessionPicker";
import { balancedQuestionFor } from "./intent/vectorQuestions";
import {
  DEPTH_JOURNEY_URL,
  formatRaceLabel,
  type JourneyVectorKey,
  VECTOR_JOURNEY_URLS,
  wowPackUrl,
} from "../content/identityAssets";
import { CLASS_IDS, type ClassId } from "../icons/types";
import { IdentityPortrait } from "./IdentityPortrait";
import { readPowerCurve, type PowerCurveId } from "../lib/journeySignalsExtras";

type Props = {
  storageKey: string;
  onGenerate: (signals: BuildIntentSignals, depth: IntentDepth) => void;
  isGenerating?: boolean;
  hasGenerated?: boolean;
  /** Flow context: detailed draft skips depth and opens the full sheet immediately. */
  intentSurface?: BuildIntentSurface;
  /** Draft run only: back from the filter sheet returns to the run-goal step. */
  onLeaveDetailedBuild?: () => void;
  /** Shown on the review step when recommend failed due to over-tight filters. */
  filterRecoveryAction?: { label: string; onSoften: () => void } | null;
  /** Server-driven cohort (`cohort`) or tight-filter recovery (`forced`). */
  experimentalOffer?: "none" | "cohort" | "forced";
  recommendLane?: "curated" | "experimental" | null;
  onRecommendLaneChange?: (lane: "curated" | "experimental") => void;
};
type JourneyStep =
  | "depth"
  | "quick_roll"
  | "bal_primary"
  | "bal_secondary"
  | "dialed_sheet"
  | "review";
type VectorKey = JourneyVectorKey;
type BalancedSlot = "primary" | "secondary";

const VECTOR_ICON_GLIMPSE: Record<VectorKey, string[]> = {
  profession: [VECTOR_JOURNEY_URLS.profession, wowPackUrl("Trade", "herbalism.png"), wowPackUrl("Trade", "mining.png")],
  playstyle: [VECTOR_JOURNEY_URLS.playstyle, wowPackUrl("Abilities", "ShieldReflection.png"), wowPackUrl("Spells", "BurningSpeed.png")],
  class_fantasy: [VECTOR_JOURNEY_URLS.class_fantasy, wowPackUrl("Spells", "StarFall.png"), wowPackUrl("Spells", "ShadowFlame.png")],
  combat_style: [VECTOR_JOURNEY_URLS.combat_style, wowPackUrl("Abilities", "AimedShot.png"), wowPackUrl("Abilities", "ShieldBash.png")],
  survivability: [VECTOR_JOURNEY_URLS.survivability, wowPackUrl("Abilities", "HealingInstincts.png"), wowPackUrl("Abilities", "WaterShield.png")],
  surprise: [VECTOR_JOURNEY_URLS.surprise, wowPackUrl("Miscellaneous", "Dice_02.png"), wowPackUrl("Miscellaneous", "QuestionMark.png")],
};

const VECTOR_ROWS: Array<{ id: VectorKey; title: string; blurb: string }> = [
  { id: "profession", title: "Profession-first", blurb: "Economy, crafting, and utility loops lead the plan." },
  { id: "playstyle", title: "Playstyle", blurb: "Pacing, risk comfort, and pull rhythm." },
  { id: "class_fantasy", title: "Class fantasy", blurb: "Tone and archetype identity before specifics." },
  { id: "combat_style", title: "Combat style", blurb: "Range, control profile, and engagement shape." },
  { id: "survivability", title: "Survivability", blurb: "Recovery tools and wipe-avoidance bias." },
  { id: "surprise", title: "Surprise me", blurb: "Novel picks inside hardcore-safe boundaries." },
];

const VECTOR_ICON_LAYOUT: Record<VectorKey, "lead" | "overlap" | "arc"> = {
  profession: "lead",
  playstyle: "arc",
  class_fantasy: "arc",
  combat_style: "overlap",
  survivability: "lead",
  surprise: "overlap",
};

const POWER_CURVE_OPTIONS: Array<{ id: PowerCurveId; label: string }> = [
  { id: "early", label: "Early power" },
  { id: "mid", label: "Mid climb" },
  { id: "late", label: "Late spikes" },
  { id: "balanced", label: "Even curve" },
];

/** Where chips are shown — draft run skips “depth” and matches Home’s detailed path. */
type BuildIntentSurface = "lucky_roll" | "draft_a_run" | "release_spirit";

const CORE_PRESET_UI: Array<{ id: CorePreset; label: string }> = [
  { id: "safe", label: "Safety first" },
  { id: "balanced", label: "Steady path" },
  { id: "bold", label: "Push pace" },
];

const QUICK_ADD_STATS = STAT_IDS;
const QUICK_ADD_PROF = PROF_OPTIONS_ADVANCED.map((o) => o.id);
const QUICK_ADD_VECTORS = VECTOR_IDS;
const QUICK_ADD_RACE_MODES = RACE_MODE_IDS;
const RACE_FILTER_OPTIONS = ["human", "dwarf", "night_elf", "gnome", "orc", "troll", "tauren", "undead"] as const;
function profPickStorageKey(storageKey: string) {
  return `${storageKey}.profPick`;
}

function readProfPick(storageKey: string): { primary: ProfessionId | null; secondary: ProfessionId | null } {
  try {
    const raw = sessionStorage.getItem(profPickStorageKey(storageKey));
    if (!raw) return { primary: null, secondary: null };
    const o = JSON.parse(raw) as { primary?: ProfessionId | null; secondary?: ProfessionId | null };
    return { primary: o.primary ?? null, secondary: o.secondary ?? null };
  } catch {
    return { primary: null, secondary: null };
  }
}

function writeProfPick(storageKey: string, primary: ProfessionId | null, secondary: ProfessionId | null) {
  try {
    if (!primary && !secondary) sessionStorage.removeItem(profPickStorageKey(storageKey));
    else sessionStorage.setItem(profPickStorageKey(storageKey), JSON.stringify({ primary, secondary }));
  } catch {
    /* ignore */
  }
}

function readStorage(key: string): BuildIntentSignals {
  try {
    const r = sessionStorage.getItem(key);
    if (!r) return {};
    return JSON.parse(r) as BuildIntentSignals;
  } catch {
    return {};
  }
}


function depthStorageKey(storageKey: string) {
  return `${storageKey}.depth`;
}

function readDepth(key: string): IntentDepth {
  try {
    const raw = sessionStorage.getItem(depthStorageKey(key));
    if (raw === "quick" || raw === "balanced" || raw === "dialed_in") return raw;
  } catch {
    /* ignore */
  }
  return "balanced";
}

function writeDepth(key: string, depth: IntentDepth) {
  try {
    sessionStorage.setItem(depthStorageKey(key), depth);
  } catch {
    /* ignore */
  }
}

function ssfStorageKey(storageKey: string) {
  return `${storageKey}.ssf`;
}

function readSsf(key: string): boolean {
  try {
    return sessionStorage.getItem(ssfStorageKey(key)) === "1";
  } catch {
    return false;
  }
}

function writeSsf(key: string, on: boolean) {
  try {
    if (on) sessionStorage.setItem(ssfStorageKey(key), "1");
    else sessionStorage.removeItem(ssfStorageKey(key));
  } catch {
    /* ignore */
  }
}

function toggleIntentList<T extends string>(list: T[] | undefined, value: T, max: number): T[] {
  const cur = list ?? [];
  if (cur.includes(value)) return cur.filter((x) => x !== value);
  if (cur.length >= max) return [...cur.slice(1), value];
  return [...cur, value];
}

type RunContextFieldsProps = {
  value: BuildIntentSignals;
  corePreset: CorePreset;
  setCorePreset: (p: CorePreset) => void;
  persist: (next: BuildIntentSignals) => void;
  soloSelfFound: boolean;
  persistSsf: (on: boolean) => void;
  powerCurve: PowerCurveId | null;
  setStoredPowerCurve: (id: PowerCurveId | null) => void;
  analyticsBase: Record<string, unknown>;
};

/** Core stat/prof/vector nudge, SSF, and power curve — shared by lucky depth step and draft-a-run sheet. */
function RunContextFields({
  value,
  corePreset,
  setCorePreset,
  persist,
  soloSelfFound,
  persistSsf,
  powerCurve,
  setStoredPowerCurve,
  analyticsBase,
}: RunContextFieldsProps) {
  return (
    <>
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 12px 0" }}>
        <legend className="ui-caption" style={{ marginBottom: 6 }}>
          Starting kit bias (optional)
        </legend>
        <p className="ui-caption ui-caption--xs" style={{ marginTop: 0, marginBottom: 8 }}>
          Quick nudge to stats, professions, and vectors. You can still override every chip below.
        </p>
        <div className="chip-row">
          {CORE_PRESET_UI.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`chip-btn ${corePreset === o.id ? "chip-btn--on" : ""}`}
              aria-pressed={corePreset === o.id}
              onClick={() => {
                setCorePreset(o.id);
                persist(applyCorePreset(value, o.id));
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 12px 0" }}>
        <legend className="ui-caption" style={{ marginBottom: 6 }}>
          Run mode
        </legend>
        <button
          type="button"
          role="switch"
          aria-checked={soloSelfFound}
          className={`ssf-toggle ${soloSelfFound ? "ssf-toggle--on" : ""}`}
          onClick={() => persistSsf(!soloSelfFound)}
        >
          <IdentityPortrait src={DEPTH_JOURNEY_URL} alt="" className="ssf-toggle__icon" title="Solo Self Found" />
          Solo Self Found
        </button>
        <p className="ui-caption ui-caption--xs" style={{ marginTop: 6 }}>
          {soloSelfFound
            ? "On: no Auction House, no trade buying — gather and craft your own gear."
            : "Off: AH, trades, and group help are fair game."}
        </p>
      </fieldset>
      <fieldset className="journey-power-fieldset" style={{ border: "none", padding: 0, margin: "0 0 12px 0" }}>
        <legend className="ui-caption" style={{ marginBottom: 6 }}>
          Power curve (optional)
        </legend>
        <p className="ui-caption ui-caption--xs" style={{ marginTop: 0, marginBottom: 8 }}>
          Nudges the recommender toward early kit, mid climb, late spikes, or an even curve.
        </p>
        <div className="journey-power-curve" role="group" aria-label="Power curve bias">
          {POWER_CURVE_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`journey-power-curve__btn ${powerCurve === o.id ? "journey-power-curve__btn--on" : ""}`}
              aria-pressed={powerCurve === o.id}
              onClick={() => {
                setStoredPowerCurve(o.id);
                trackEvent(AnalyticsEvent.IntentDepthSelected, { ...analyticsBase, powerCurve: o.id });
              }}
            >
              {o.label}
            </button>
          ))}
          <button
            type="button"
            className="journey-power-curve__clear"
            aria-label="Clear power curve selection"
            onClick={() => setStoredPowerCurve(null)}
          >
            Clear
          </button>
        </div>
      </fieldset>
    </>
  );
}

export function BuildIntentChips({
  storageKey,
  onGenerate,
  isGenerating = false,
  hasGenerated = false,
  intentSurface = "lucky_roll",
  onLeaveDetailedBuild,
  filterRecoveryAction = null,
  experimentalOffer = "none",
  recommendLane = null,
  onRecommendLaneChange,
}: Props) {
  const isDraftRunSurface = intentSurface === "draft_a_run";

  const [value, setValue] = useState<BuildIntentSignals>(() => readStorage(storageKey));
  const [depth, setDepth] = useState<IntentDepth>(() => {
    if (isDraftRunSurface) {
      writeDepth(storageKey, "dialed_in");
      return "dialed_in";
    }
    return readDepth(storageKey);
  });
  const [step, setStep] = useState<JourneyStep>(() => (isDraftRunSurface ? "dialed_sheet" : "depth"));
  const [pulseVector, setPulseVector] = useState<VectorKey | null>(null);
  const [corePreset, setCorePreset] = useState<CorePreset>("balanced");
  const [powerCurve, setPowerCurve] = useState<PowerCurveId | null>(() => readPowerCurve(storageKey));
  const [soloSelfFound, setSoloSelfFound] = useState<boolean>(() => {
    if (readSsf(storageKey)) return true;
    return Boolean(readStorage(storageKey).soloSelfFound);
  });
  /** Balanced flow: player's chosen primary + secondary pillars and an in-flight answered flag per slot. */
  const [balPrimaryPillar, setBalPrimaryPillar] = useState<VectorKey | null>(null);
  const [balSecondaryPillar, setBalSecondaryPillar] = useState<VectorKey | null>(null);
  const [profPrimary, setProfPrimary] = useState<ProfessionId | null>(() => readProfPick(storageKey).primary);
  const [profSecondary, setProfSecondary] = useState<ProfessionId | null>(() => readProfPick(storageKey).secondary);

  useEffect(() => {
    if (!pulseVector) return;
    const id = window.setTimeout(() => setPulseVector(null), 260);
    return () => window.clearTimeout(id);
  }, [pulseVector]);

  function persist(next: BuildIntentSignals) {
    const { intentDepth: _strip, ...rest } = next;
    void _strip;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(rest));
    } catch {
      /* ignore */
    }
    setValue(rest);
  }

  function persistDepth(nextDepth: IntentDepth) {
    setDepth(nextDepth);
    writeDepth(storageKey, nextDepth);
  }

  function persistSsf(on: boolean) {
    setSoloSelfFound(on);
    writeSsf(storageKey, on);
    persist({ ...value, soloSelfFound: on });
  }

  /** In Quick mode the player edits chips directly; in Balanced/Dialed-in vectors come from pillar picks. */
  const maxVectors = depth === "dialed_in" ? 6 : depth === "balanced" ? 4 : 6;

  const activeIds = useMemo(() => {
    const ids: string[] = [];
    ids.push(...(value.statPhilosophy ?? []));
    ids.push(...(value.professionIntents ?? []));
    ids.push(...(value.buildVectors ?? []));
    if (value.raceMode) ids.push(value.raceMode);
    if (value.factionPreference) ids.push(`faction:${value.factionPreference}`);
    ids.push(...(value.preferredClasses ?? []).map((c) => `class+${c}`));
    ids.push(...(value.excludedClasses ?? []).map((c) => `class-${c}`));
    ids.push(...(value.preferredRaces ?? []).map((r) => `race+${r}`));
    ids.push(...(value.excludedRaces ?? []).map((r) => `race-${r}`));
    return ids;
  }, [value]);
  const eventContext = useMemo(
    () => ({
      storageKey,
      depth,
      step,
      balPrimaryPillar,
      balSecondaryPillar,
      soloSelfFound,
      statCount: value.statPhilosophy?.length ?? 0,
      professionCount: value.professionIntents?.length ?? 0,
      vectorCount: value.buildVectors?.length ?? 0,
      raceMode: value.raceMode ?? "signal_inferred",
      activeCount: activeIds.length,
    }),
    [
      activeIds.length,
      depth,
      step,
      storageKey,
      balPrimaryPillar,
      balSecondaryPillar,
      soloSelfFound,
      value.buildVectors?.length,
      value.professionIntents?.length,
      value.raceMode,
      value.statPhilosophy?.length,
    ],
  );

  const depthFlowCaption =
    depth === "quick"
      ? "Random bundle from the full filter catalog. Edit, reroll, generate."
      : depth === "balanced"
        ? "Pick a primary and secondary focus; we infer supporting picks from your answers."
        : "Open every category at once and tune chip-by-chip.";

  const { stepNumerator, stepDenominator } = useMemo(() => {
    if (isDraftRunSurface) {
      const order: JourneyStep[] = ["dialed_sheet", "review"];
      const idx = Math.max(0, order.indexOf(step));
      return { stepNumerator: idx + 1, stepDenominator: 2 };
    }
    if (depth === "quick") {
      const order: JourneyStep[] = ["depth", "quick_roll", "review"];
      const idx = Math.max(0, order.indexOf(step));
      return { stepNumerator: idx + 1, stepDenominator: 3 };
    }
    if (depth === "dialed_in") {
      // Single-sheet flow has no numeric counter (lucky / release spirit only).
      return { stepNumerator: 0, stepDenominator: 0 };
    }
    const order: JourneyStep[] = ["depth", "bal_primary", "bal_secondary", "review"];
    const idx = Math.max(0, order.indexOf(step));
    return { stepNumerator: idx + 1, stepDenominator: 4 };
  }, [depth, isDraftRunSurface, step]);

  /**
   * Persist profession picker state into stored signals via professionPickToTags so the
   * picker stays the single source of truth for profession intent in Balanced + Dialed-in.
   */
  function commitProfessionPicker(primary: ProfessionId | null, secondary: ProfessionId | null) {
    setProfPrimary(primary);
    setProfSecondary(secondary);
    writeProfPick(storageKey, primary, secondary);
    persist({
      ...value,
      professionIntents: professionPickToTags(primary, secondary),
    });
  }

  function removeActive(id: string) {
    if (id.startsWith("faction:")) {
      persist({ ...value, factionPreference: undefined });
      return;
    }
    if (id.startsWith("class+")) {
      const cls = id.slice("class+".length) as ClassId;
      persist({
        ...value,
        preferredClasses: (value.preferredClasses ?? []).filter((c) => c !== cls),
      });
      return;
    }
    if (id.startsWith("class-")) {
      const cls = id.slice("class-".length) as ClassId;
      persist({
        ...value,
        excludedClasses: (value.excludedClasses ?? []).filter((c) => c !== cls),
      });
      return;
    }
    if (id.startsWith("race+")) {
      const race = id.slice("race+".length);
      persist({
        ...value,
        preferredRaces: (value.preferredRaces ?? []).filter((r) => r !== race),
      });
      return;
    }
    if (id.startsWith("race-")) {
      const race = id.slice("race-".length);
      persist({
        ...value,
        excludedRaces: (value.excludedRaces ?? []).filter((r) => r !== race),
      });
      return;
    }
    if (value.statPhilosophy?.includes(id as never)) {
      persist({ ...value, statPhilosophy: value.statPhilosophy.filter((x) => x !== id) as BuildIntentSignals["statPhilosophy"] });
      return;
    }
    if (value.professionIntents?.includes(id as never)) {
      const nextProf = value.professionIntents.filter((x) => x !== id) as BuildIntentSignals["professionIntents"];
      persist({ ...value, professionIntents: nextProf });
      setProfPrimary(null);
      setProfSecondary(null);
      writeProfPick(storageKey, null, null);
      return;
    }
    if (value.buildVectors?.includes(id as never)) {
      persist({ ...value, buildVectors: value.buildVectors.filter((x) => x !== id) as BuildIntentSignals["buildVectors"] });
      return;
    }
    if (value.raceMode === id) {
      persist({ ...value, raceMode: undefined });
    }
  }

  function activeLabel(id: string): string {
    if (id.startsWith("faction:")) {
      const v = id.slice("faction:".length);
      return v === "horde" ? "Faction: Horde" : "Faction: Alliance";
    }
    if (id.startsWith("class+")) return `Class include: ${id.slice("class+".length)}`;
    if (id.startsWith("class-")) return `Class exclude: ${id.slice("class-".length)}`;
    if (id.startsWith("race+")) return `Race include: ${formatRaceLabel(id.slice("race+".length) as never)}`;
    if (id.startsWith("race-")) return `Race exclude: ${formatRaceLabel(id.slice("race-".length) as never)}`;
    return optionLabel(id);
  }

  function setStoredPowerCurve(next: PowerCurveId | null) {
    setPowerCurve(next);
    try {
      if (next) sessionStorage.setItem(`${storageKey}.powerCurve`, next);
      else sessionStorage.removeItem(`${storageKey}.powerCurve`);
    } catch {
      /* ignore */
    }
  }

  function quickToggle(id: string) {
    if (STAT_OPTIONS.some((s) => s.id === id)) {
      persist({
        ...value,
        statPhilosophy: toggleList(value.statPhilosophy, id, 3) as BuildIntentSignals["statPhilosophy"],
      });
      return;
    }
    if (PROF_OPTIONS.some((p) => p.id === id)) {
      const existing = (value.professionIntents ?? []).filter((p) => !PROFESSION_INTENT_ANCHOR_TAGS.has(p));
      const next = PROFESSION_INTENT_ANCHOR_TAGS.has(id)
        ? [id, ...existing].slice(0, 4)
        : toggleList(value.professionIntents, id, 4);
      persist({
        ...value,
        professionIntents: next as BuildIntentSignals["professionIntents"],
      });
      setProfPrimary(null);
      setProfSecondary(null);
      writeProfPick(storageKey, null, null);
      return;
    }
    if (VECTOR_OPTIONS.some((v) => v.id === id)) {
      persist({
        ...value,
        buildVectors: toggleList(value.buildVectors, id, 6) as BuildIntentSignals["buildVectors"],
      });
      return;
    }
    if (RACE_MODES.some((r) => r.id === id)) {
      persist({
        ...value,
        raceMode: value.raceMode === id ? undefined : (id as BuildIntentSignals["raceMode"]),
      });
    }
  }

  function generateNowFromCurrent(currentDepth: IntentDepth) {
    trackEvent(hasGenerated ? AnalyticsEvent.IntentRegenerateClicked : AnalyticsEvent.GenerateClicked, eventContext);
    const base = currentDepth === "balanced" ? fillBalancedAssumptions(value) : value;
    const payload: BuildIntentSignals = { ...base, soloSelfFound };
    onGenerate(payload, currentDepth);
  }

  function resetJourneyFilters() {
    try {
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(depthStorageKey(storageKey));
      sessionStorage.removeItem(ssfStorageKey(storageKey));
      sessionStorage.removeItem(`${storageKey}.powerCurve`);
      sessionStorage.removeItem(profPickStorageKey(storageKey));
    } catch {
      /* ignore */
    }
    setValue({});
    if (isDraftRunSurface) {
      setDepth("dialed_in");
      writeDepth(storageKey, "dialed_in");
      setStep("dialed_sheet");
    } else {
      setDepth("balanced");
      writeDepth(storageKey, "balanced");
      setStep("depth");
    }
    setBalPrimaryPillar(null);
    setBalSecondaryPillar(null);
    setProfPrimary(null);
    setProfSecondary(null);
    setCorePreset("balanced");
    setPowerCurve(null);
    setSoloSelfFound(false);
    writeSsf(storageKey, false);
  }

  function startDepthFlow() {
    if (depth === "quick") {
      const rolled = rollRandomQuickPickSignals(`${storageKey}|${crypto.randomUUID()}`);
      persist(mergeQuickRollPreserveIdentity(value, rolled));
      setStep("quick_roll");
      return;
    }
    if (depth === "balanced") {
      setStep("bal_primary");
      return;
    }
    setStep("dialed_sheet");
  }

  function backToTuning() {
    if (isDraftRunSurface) return setStep("dialed_sheet");
    if (depth === "quick") return setStep("quick_roll");
    if (depth === "balanced") return setStep(balSecondaryPillar ? "bal_secondary" : "bal_primary");
    return setStep("dialed_sheet");
  }

  function sheetBack() {
    if (isDraftRunSurface && onLeaveDetailedBuild) {
      onLeaveDetailedBuild();
      return;
    }
    setStep("depth");
  }

  return (
    <div className="build-intent card" style={{ marginTop: 12 }}>
      <p className="step-label" style={{ marginBottom: 8 }}>
        {isDraftRunSurface ? "Detailed build · filters" : "Build setup"}
      </p>
      <p className="ui-caption" style={{ marginTop: 0, marginBottom: 10 }}>
        {isDraftRunSurface
          ? "This step layers chips on the run goal you already picked. Use the sheet, review everything, then generate."
          : "Choose how much control you want — each path leads to its own setup before generate."}
      </p>
      {stepDenominator > 0 ? (
        <p className="ui-caption" style={{ marginTop: 0, marginBottom: 12 }}>
          {isDraftRunSurface ? (
            <>
              Sheet &amp; review · Step {stepNumerator} of {stepDenominator}
              {step === "dialed_sheet" ? " — filter sheet" : " — review"}
            </>
          ) : (
            <>
              {depth === "balanced" ? "Guided pillars · " : depth === "quick" ? "Quick pick · " : ""}Step {stepNumerator} of{" "}
              {stepDenominator}
              {depth === "balanced" && (step === "bal_primary" || step === "bal_secondary") ? (
                <>
                  {" "}
                  — {step === "bal_primary" ? "Primary pillar" : "Secondary pillar"}
                </>
              ) : null}
            </>
          )}
        </p>
      ) : depth === "dialed_in" && step === "dialed_sheet" && !isDraftRunSurface ? (
        <p className="ui-caption" style={{ marginTop: 0, marginBottom: 12 }}>
          Full sheet · single view
        </p>
      ) : null}
      {step === "depth" ? (
        <>
          <div className="chip-row" role="group" aria-label="Intent depth">
            {DEPTH_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`chip-btn ${depth === o.id ? "chip-btn--on" : ""}`}
                aria-pressed={depth === o.id}
                onClick={() => {
                  persistDepth(o.id);
                  trackEvent(AnalyticsEvent.IntentDepthSelected, {
                    ...eventContext,
                    nextDepth: o.id,
                    switchedAfterGenerate: hasGenerated,
                  });
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="ui-caption" style={{ marginTop: 8, marginBottom: 12 }}>
            {depthFlowCaption}
          </p>
          <RunContextFields
            value={value}
            corePreset={corePreset}
            setCorePreset={setCorePreset}
            persist={persist}
            soloSelfFound={soloSelfFound}
            persistSsf={persistSsf}
            powerCurve={powerCurve}
            setStoredPowerCurve={setStoredPowerCurve}
            analyticsBase={eventContext}
          />
          <div className="flow-nav">
            <button type="button" className="btn-primary" onClick={startDepthFlow}>
              {depth === "quick" ? "Roll random filters" : depth === "balanced" ? "Pick primary pillar" : "Open full sheet"}
            </button>
          </div>
        </>
      ) : null}
      {step === "quick_roll" ? (
        <>
          <p className="step-label" style={{ marginBottom: 6 }}>
            Quick roll
          </p>
          <p className="ui-caption" style={{ marginTop: 0, marginBottom: 12 }}>
            Tap × on anything you do not want. Roll again for a fresh random bundle from the full filter list.
          </p>
          {activeIds.length ? (
            <div style={{ marginBottom: 12 }}>
              <p className="step-label" style={{ marginBottom: 6 }}>
                Rolled filters
              </p>
              <div className="chip-row" role="group" aria-label="Rolled filters, click to remove">
                {activeIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="chip-btn chip-btn--on"
                    aria-pressed={true}
                    aria-label={`${activeLabel(id)}, remove`}
                    onClick={() => removeActive(id)}
                  >
                    {activeLabel(id)} ×
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="ui-caption" style={{ marginTop: 0, marginBottom: 12 }}>
              No filters yet—use Roll again to sample the catalog.
            </p>
          )}
          <div className="flow-nav flow-nav--wrap">
            <button type="button" className="btn-ghost" onClick={() => setStep("depth")}>
              Back
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const rolled = rollRandomQuickPickSignals(`${storageKey}|${crypto.randomUUID()}`);
                persist(mergeQuickRollPreserveIdentity(value, rolled));
              }}
            >
              Roll again
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isGenerating}
              onClick={() => generateNowFromCurrent("quick")}
            >
              {isGenerating ? "Generating..." : "Generate now"}
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep("review")}>
              Open full review
            </button>
          </div>
        </>
      ) : null}
      {step === "bal_primary" || step === "bal_secondary" ? (
        <BalancedPillarStep
          slot={step === "bal_primary" ? "primary" : "secondary"}
          activePrimary={balPrimaryPillar}
          activeSecondary={balSecondaryPillar}
          pulseVector={pulseVector}
          onPulse={setPulseVector}
          profPrimary={profPrimary}
          profSecondary={profSecondary}
          soloSelfFound={soloSelfFound}
          onPickPillar={(pillar) => {
            if (step === "bal_primary") {
              if (balPrimaryPillar === pillar) setBalPrimaryPillar(null);
              else {
                setBalPrimaryPillar(pillar);
                if (balSecondaryPillar === pillar) setBalSecondaryPillar(null);
              }
            } else if (balSecondaryPillar === pillar) {
              setBalSecondaryPillar(null);
            } else {
              setBalSecondaryPillar(pillar);
            }
            trackEvent(AnalyticsEvent.VectorSelected, { ...eventContext, vector: pillar, slot: step });
          }}
          onAnswer={(question, answer) => {
            persist(question.apply(value, answer));
            trackEvent(AnalyticsEvent.QuestionAnswered, {
              ...eventContext,
              questionId: question.id,
              answer,
              slot: step,
            });
            if (step === "bal_primary") setStep("bal_secondary");
            else setStep("review");
          }}
          onProfessionChange={({ primary, secondary }) => {
            commitProfessionPicker(primary, secondary);
          }}
          onSkipProfessionPair={() => {
            if (step === "bal_primary") setStep("bal_secondary");
            else setStep("review");
          }}
          onBack={() => {
            if (step === "bal_primary") return setStep("depth");
            return setStep("bal_primary");
          }}
        />
      ) : null}
      {step === "dialed_sheet" ? (
        <>
          {isDraftRunSurface ? (
            <RunContextFields
              value={value}
              corePreset={corePreset}
              setCorePreset={setCorePreset}
              persist={persist}
              soloSelfFound={soloSelfFound}
              persistSsf={persistSsf}
              powerCurve={powerCurve}
              setStoredPowerCurve={setStoredPowerCurve}
              analyticsBase={eventContext}
            />
          ) : null}
          <DialedSheet
            variant={isDraftRunSurface ? "draft" : "default"}
            value={value}
            soloSelfFound={soloSelfFound}
            profPrimary={profPrimary}
            profSecondary={profSecondary}
            onProfessionChange={({ primary, secondary }) => {
              commitProfessionPicker(primary, secondary);
            }}
            onToggleStat={(id) => {
              persist({
                ...value,
                statPhilosophy: toggleList(value.statPhilosophy, id, 3) as BuildIntentSignals["statPhilosophy"],
              });
            }}
            onToggleVector={(id) => {
              persist({
                ...value,
                buildVectors: toggleList(value.buildVectors, id, maxVectors) as BuildIntentSignals["buildVectors"],
              });
            }}
            onToggleProfIntent={(id) => {
              persist({
                ...value,
                professionIntents: toggleList(value.professionIntents, id, 12) as BuildIntentSignals["professionIntents"],
              });
              setProfPrimary(null);
              setProfSecondary(null);
              writeProfPick(storageKey, null, null);
            }}
            onToggleRaceMode={(id) => {
              persist({
                ...value,
                raceMode: value.raceMode === id ? undefined : (id as BuildIntentSignals["raceMode"]),
              });
            }}
            onIdentityChange={(patch) => persist({ ...value, ...patch })}
            onBack={sheetBack}
            onContinue={() => setStep("review")}
            onReset={resetJourneyFilters}
          />
        </>
      ) : null}
      {step === "review" ? (
        <>
          {isDraftRunSurface ? (
            <div className="flow-nav flow-nav--wrap" style={{ marginBottom: 12 }}>
              <button type="button" className="btn-ghost" onClick={() => setStep("dialed_sheet")}>
                Back to filter sheet
              </button>
            </div>
          ) : (
            <div className="flow-nav flow-nav--wrap" style={{ marginBottom: 12 }}>
              <button type="button" className="btn-ghost" onClick={backToTuning}>
                Back to tuning
              </button>
              <button
                type="button"
                className={`btn-ghost ${depth === "quick" ? "chip-btn--on" : ""}`}
                aria-pressed={depth === "quick"}
                onClick={() => persistDepth("quick")}
              >
                Quick mode
              </button>
              <button
                type="button"
                className={`btn-ghost ${depth === "balanced" ? "chip-btn--on" : ""}`}
                aria-pressed={depth === "balanced"}
                onClick={() => persistDepth("balanced")}
              >
                Guided pillars
              </button>
              <button
                type="button"
                className={`btn-ghost ${depth === "dialed_in" ? "chip-btn--on" : ""}`}
                aria-pressed={depth === "dialed_in"}
                onClick={() => persistDepth("dialed_in")}
              >
                Full sheet
              </button>
            </div>
          )}
          <div className="card" style={{ marginBottom: 12, padding: 10 }}>
            <p className="step-label" style={{ marginBottom: 6 }}>
              Quick add filters
            </p>
            <p className="ui-caption ui-caption--xs" style={{ marginTop: 0, marginBottom: 8 }}>
              Full catalog: stats, profession intents, vectors, and race mode.
            </p>
            <div className="chip-row" style={{ marginTop: 6 }}>
              {QUICK_ADD_STATS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`chip-btn ${activeIds.includes(id) ? "chip-btn--on" : ""}`}
                  onClick={() => quickToggle(id)}
                >
                  {optionLabel(id)}
                </button>
              ))}
            </div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {QUICK_ADD_PROF.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`chip-btn ${activeIds.includes(id) ? "chip-btn--on" : ""}`}
                  onClick={() => quickToggle(id)}
                >
                  {optionLabel(id)}
                </button>
              ))}
            </div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {QUICK_ADD_VECTORS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`chip-btn ${activeIds.includes(id) ? "chip-btn--on" : ""}`}
                  onClick={() => quickToggle(id)}
                >
                  {optionLabel(id)}
                </button>
              ))}
            </div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {QUICK_ADD_RACE_MODES.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`chip-btn ${activeIds.includes(id) ? "chip-btn--on" : ""}`}
                  onClick={() => quickToggle(id)}
                >
                  {optionLabel(id)}
                </button>
              ))}
            </div>
          </div>
          {experimentalOffer !== "none" ? (
            <fieldset style={{ border: "none", padding: 0, margin: "0 0 14px 0" }}>
              <legend className="step-label" style={{ marginBottom: 6 }}>
                Deck source
              </legend>
              <p className="ui-caption" style={{ marginTop: 0, marginBottom: 10 }}>
                {experimentalOffer === "forced"
                  ? "No curated template matched every filter together. You can try an experimental AI-drafted lane (still HC-grounded), or soften filters and stay on curated fixtures."
                  : "Part of this session can try an experimental AI-drafted lane alongside our curated fixture deck — pick one before generating."}
              </p>
              <div className="flow-nav flow-nav--wrap">
                <button
                  type="button"
                  className={`btn-ghost ${recommendLane === "curated" ? "chip-btn--on" : ""}`}
                  aria-pressed={recommendLane === "curated"}
                  onClick={() => {
                    onRecommendLaneChange?.("curated");
                    trackEvent(AnalyticsEvent.ExperimentalLaneChosen, { lane: "curated", storageKey });
                  }}
                >
                  Curated baseline
                </button>
                <button
                  type="button"
                  className={`btn-ghost ${recommendLane === "experimental" ? "chip-btn--on" : ""}`}
                  aria-pressed={recommendLane === "experimental"}
                  onClick={() => {
                    onRecommendLaneChange?.("experimental");
                    trackEvent(AnalyticsEvent.ExperimentalLaneChosen, { lane: "experimental", storageKey });
                  }}
                >
                  AI candidate
                </button>
              </div>
            </fieldset>
          ) : null}
          {activeIds.length ? (
            <div style={{ marginBottom: 12 }}>
              <p className="step-label" style={{ marginBottom: 6 }}>
                Active filters
              </p>
              <div className="chip-row" role="group" aria-label="Active filters, click to remove">
                {activeIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="chip-btn chip-btn--on"
                    aria-pressed={true}
                    aria-label={`${activeLabel(id)}, remove`}
                    onClick={() => removeActive(id)}
                  >
                    {activeLabel(id)} ×
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="ui-caption" style={{ marginTop: 0, marginBottom: 12 }}>
              No extra filters selected. We&apos;ll generate from your core preferences.
            </p>
          )}
          <div className="card" style={{ marginBottom: 12, padding: 10 }}>
            <p className="step-label" style={{ marginBottom: 6 }}>
              Identity preference (optional)
            </p>
            <p className="ui-caption ui-caption--xs" style={{ marginTop: 0, marginBottom: 6 }}>
              Faction
            </p>
            <div className="chip-row" style={{ marginBottom: 8 }}>
              {[
                { id: "all", label: "Any faction" },
                { id: "alliance", label: "Alliance" },
                { id: "horde", label: "Horde" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`chip-btn ${(f.id === "all" ? !value.factionPreference : value.factionPreference === f.id) ? "chip-btn--on" : ""}`}
                  onClick={() => persist({ ...value, factionPreference: f.id === "all" ? undefined : (f.id as "horde" | "alliance") })}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="ui-caption ui-caption--xs" style={{ marginTop: 0, marginBottom: 6 }}>
              Class intent (include / exclude)
            </p>
            <div className="chip-row" style={{ marginBottom: 8 }}>
              {CLASS_IDS.map((c) => (
                <button
                  key={`review-class+${c}`}
                  type="button"
                  className={`chip-btn ${(value.preferredClasses ?? []).includes(c) ? "chip-btn--on" : ""}`}
                  onClick={() =>
                    persist({
                      ...value,
                      preferredClasses: toggleIntentList(value.preferredClasses, c, 6),
                      excludedClasses: (value.excludedClasses ?? []).filter((x) => x !== c),
                    })
                  }
                >
                  + {c}
                </button>
              ))}
            </div>
            <div className="chip-row" style={{ marginBottom: 8 }}>
              {CLASS_IDS.map((c) => (
                <button
                  key={`review-class-${c}`}
                  type="button"
                  className={`chip-btn ${(value.excludedClasses ?? []).includes(c) ? "chip-btn--on" : ""}`}
                  onClick={() =>
                    persist({
                      ...value,
                      excludedClasses: toggleIntentList(value.excludedClasses, c, 6),
                      preferredClasses: (value.preferredClasses ?? []).filter((x) => x !== c),
                    })
                  }
                >
                  - {c}
                </button>
              ))}
            </div>
            <p className="ui-caption ui-caption--xs" style={{ marginTop: 0, marginBottom: 6 }}>
              Race intent (include / exclude)
            </p>
            <div className="chip-row" style={{ marginBottom: 8 }}>
              {RACE_FILTER_OPTIONS.map((r) => (
                <button
                  key={`review-race+${r}`}
                  type="button"
                  className={`chip-btn ${(value.preferredRaces ?? []).includes(r) ? "chip-btn--on" : ""}`}
                  onClick={() =>
                    persist({
                      ...value,
                      preferredRaces: toggleIntentList(value.preferredRaces, r, 8),
                      excludedRaces: (value.excludedRaces ?? []).filter((x) => x !== r),
                    })
                  }
                >
                  + {formatRaceLabel(r)}
                </button>
              ))}
            </div>
            <div className="chip-row">
              {RACE_FILTER_OPTIONS.map((r) => (
                <button
                  key={`review-race-${r}`}
                  type="button"
                  className={`chip-btn ${(value.excludedRaces ?? []).includes(r) ? "chip-btn--on" : ""}`}
                  onClick={() =>
                    persist({
                      ...value,
                      excludedRaces: toggleIntentList(value.excludedRaces, r, 8),
                      preferredRaces: (value.preferredRaces ?? []).filter((x) => x !== r),
                    })
                  }
                >
                  - {formatRaceLabel(r)}
                </button>
              ))}
            </div>
          </div>
          {filterRecoveryAction ? (
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn-ghost" onClick={filterRecoveryAction.onSoften}>
                {filterRecoveryAction.label}
              </button>
            </div>
          ) : null}
          <div className="flow-nav flow-nav--wrap">
            <button type="button" className="btn-ghost" onClick={backToTuning}>
              Back to tuning
            </button>
            <button type="button" className="journey-power-curve__clear" onClick={resetJourneyFilters}>
              Reset setup
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isGenerating || (experimentalOffer === "cohort" && recommendLane === null)}
              onClick={() => generateNowFromCurrent(depth)}
            >
              {isGenerating ? "Generating..." : hasGenerated ? "Regenerate build" : "Generate build"}
            </button>
          </div>
          {hasGenerated ? (
            <p className="ui-caption" style={{ marginTop: 10, marginBottom: 0 }}>
              You can return and adjust branches, then regenerate before reroll.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

type BalancedSlotPropsBase = {
  slot: BalancedSlot;
  activePrimary: VectorKey | null;
  activeSecondary: VectorKey | null;
  pulseVector: VectorKey | null;
  onPulse: (v: VectorKey | null) => void;
  profPrimary: ProfessionId | null;
  profSecondary: ProfessionId | null;
  soloSelfFound: boolean;
  onPickPillar: (pillar: VectorKey) => void;
  onAnswer: (question: ReturnType<typeof balancedQuestionFor>, answer: string) => void;
  onProfessionChange: (next: { primary: ProfessionId | null; secondary: ProfessionId | null }) => void;
  onSkipProfessionPair: () => void;
  onBack: () => void;
};

function BalancedPillarStep({
  slot,
  activePrimary,
  activeSecondary,
  pulseVector,
  onPulse,
  profPrimary,
  profSecondary,
  soloSelfFound,
  onPickPillar,
  onAnswer,
  onProfessionChange,
  onSkipProfessionPair,
  onBack,
}: BalancedSlotPropsBase) {
  const activePillar = slot === "primary" ? activePrimary : activeSecondary;
  const blockedPillar = slot === "secondary" ? activePrimary : null;
  const visibleRows = VECTOR_ROWS.filter((r) => r.id !== blockedPillar);
  const slotLabel = slot === "primary" ? "Pick your primary focus" : "Pick your secondary focus";
  const recapPrimary = activePrimary ? VECTOR_ROWS.find((r) => r.id === activePrimary)?.title ?? activePrimary : null;
  const recapSecondary = activeSecondary ? VECTOR_ROWS.find((r) => r.id === activeSecondary)?.title ?? activeSecondary : null;
  const question = activePillar ? balancedQuestionFor(activePillar, { soloSelfFound }) : null;
  return (
    <>
      <p className="step-label" style={{ marginBottom: 6 }}>
        {slotLabel}
      </p>
      <p className="ui-caption" style={{ marginTop: 0, marginBottom: 10 }}>
        Balanced uses one primary pillar plus one secondary pillar — we infer the rest.
      </p>
      {(recapPrimary || recapSecondary) ? (
        <p className="ui-caption" style={{ marginTop: 0, marginBottom: 10 }}>
          {recapPrimary ? <>Primary: <strong>{recapPrimary}</strong></> : null}
          {recapPrimary && recapSecondary ? " · " : null}
          {recapSecondary ? <>Secondary: <strong>{recapSecondary}</strong></> : null}
        </p>
      ) : null}
      <div className="journey-vector-grid" role="radiogroup" aria-label={slotLabel}>
        {visibleRows.map((row) => {
          const active = activePillar === row.id;
          return (
            <button
              key={row.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`journey-vector-tile ${active ? "journey-vector-tile--on" : ""} ${pulseVector === row.id ? "journey-vector-tile--pulse" : ""}`}
              onClick={() => {
                onPulse(row.id);
                onPickPillar(row.id);
              }}
            >
              <div className={`journey-vector-tile__icons journey-vector-tile__icons--${VECTOR_ICON_LAYOUT[row.id]}`} aria-hidden>
                {VECTOR_ICON_GLIMPSE[row.id].map((src, i) => (
                  <IdentityPortrait
                    key={`${row.id}-${i}`}
                    src={src}
                    alt=""
                    className="journey-vector-tile__classimg"
                    title={row.title}
                  />
                ))}
              </div>
              <span className="journey-vector-tile__title">{row.title}</span>
              <span className="journey-vector-tile__blurb">{row.blurb}</span>
            </button>
          );
        })}
      </div>
      {activePillar === "profession" ? (
        <div style={{ marginTop: 14 }}>
          <ProfessionPicker
            primary={profPrimary}
            secondary={profSecondary}
            soloSelfFound={soloSelfFound}
            onChange={onProfessionChange}
          />
          <div className="flow-nav" style={{ marginTop: 12 }}>
            <button type="button" className="btn-ghost" onClick={onBack}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!profPrimary}
              onClick={onSkipProfessionPair}
            >
              {slot === "primary" ? "Continue to secondary pillar" : "Review and generate"}
            </button>
          </div>
        </div>
      ) : activePillar && question ? (
        <div style={{ marginTop: 14 }}>
          <p className="step-label" style={{ marginBottom: 6 }}>
            {question.prompt}
          </p>
          <div className="chip-row" role="group" aria-label={question.prompt}>
            {question.answers.map((answer) => (
              <button
                key={answer}
                type="button"
                className="chip-btn"
                onClick={() => onAnswer(question, answer)}
              >
                {answer}
              </button>
            ))}
          </div>
          <div className="flow-nav" style={{ marginTop: 10 }}>
            <button type="button" className="btn-ghost" onClick={onBack}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flow-nav" style={{ marginTop: 12 }}>
          <button type="button" className="btn-ghost" onClick={onBack}>
            Back
          </button>
        </div>
      )}
    </>
  );
}

type DialedSheetProps = {
  variant?: "default" | "draft";
  value: BuildIntentSignals;
  soloSelfFound: boolean;
  profPrimary: ProfessionId | null;
  profSecondary: ProfessionId | null;
  onProfessionChange: (next: { primary: ProfessionId | null; secondary: ProfessionId | null }) => void;
  onToggleStat: (id: string) => void;
  onToggleVector: (id: string) => void;
  onToggleProfIntent: (id: string) => void;
  onToggleRaceMode: (id: string) => void;
  onIdentityChange: (patch: Partial<BuildIntentSignals>) => void;
  onBack: () => void;
  onContinue: () => void;
  onReset: () => void;
};

function DialedSheet({
  variant = "default",
  value,
  soloSelfFound,
  profPrimary,
  profSecondary,
  onProfessionChange,
  onToggleStat,
  onToggleVector,
  onToggleProfIntent,
  onToggleRaceMode,
  onIdentityChange,
  onBack,
  onContinue,
  onReset,
}: DialedSheetProps) {
  const activeStats = new Set<string>(value.statPhilosophy ?? []);
  const activeVectors = new Set<string>(value.buildVectors ?? []);
  const activeProfIntents = new Set<string>(value.professionIntents ?? []);
  const isDraft = variant === "draft";
  return (
    <>
      <p className="step-label" style={{ marginBottom: 6 }}>
        {isDraft ? "Filter sheet" : "Full sheet"}
      </p>
      <p className="ui-caption" style={{ marginTop: 0, marginBottom: 12 }}>
        {isDraft
          ? "Tune every category below. SSF and power curve sit above this sheet for quick access."
          : "Open every category and tune chip-by-chip. Each section is multi-select up to its cap."}
      </p>
      <details className="dialed-sheet__section" open>
        <summary className="dialed-sheet__summary">
          Stats <span className="ui-caption ui-caption--xs">{activeStats.size}/3</span>
        </summary>
        <div className="dialed-sheet__body">
          <div className="chip-row" role="group" aria-label="Stat philosophy">
            {STAT_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`chip-btn ${activeStats.has(o.id) ? "chip-btn--on" : ""}`}
                aria-pressed={activeStats.has(o.id)}
                onClick={() => onToggleStat(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </details>
      <details className="dialed-sheet__section" open>
        <summary className="dialed-sheet__summary">
          Professions <span className="ui-caption ui-caption--xs">primary + secondary</span>
        </summary>
        <div className="dialed-sheet__body">
          <p className="ui-caption ui-caption--xs" style={{ marginBottom: 8 }}>
            Pick a primary craft, then a secondary — counts {profPrimary ? 1 : 0}+{profSecondary ? 1 : 0}.
          </p>
          <ProfessionPicker
            primary={profPrimary}
            secondary={profSecondary}
            soloSelfFound={soloSelfFound}
            onChange={onProfessionChange}
          />
        </div>
      </details>
      <details className="dialed-sheet__section">
        <summary className="dialed-sheet__summary">
          Advanced profession intents <span className="ui-caption ui-caption--xs">{activeProfIntents.size}/12</span>
        </summary>
        <div className="dialed-sheet__body">
          <p className="ui-caption ui-caption--xs" style={{ marginBottom: 8 }}>
            Add profession strategy filters beyond your two primary crafts.
          </p>
          <div className="chip-row" role="group" aria-label="Advanced profession intents">
            {PROF_OPTIONS_ADVANCED.map((o) => (
              (soloSelfFound && o.id === "auction_house_play") ? null : (
              <button
                key={o.id}
                type="button"
                className={`chip-btn ${activeProfIntents.has(o.id) ? "chip-btn--on" : ""}`}
                aria-pressed={activeProfIntents.has(o.id)}
                onClick={() => onToggleProfIntent(o.id)}
              >
                {o.label}
              </button>
              )
            ))}
          </div>
        </div>
      </details>
      <details className="dialed-sheet__section" open>
        <summary className="dialed-sheet__summary">
          Vectors <span className="ui-caption ui-caption--xs">{activeVectors.size}/6</span>
        </summary>
        <div className="dialed-sheet__body">
          <div className="chip-row" role="group" aria-label="Build vectors">
            {VECTOR_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`chip-btn ${activeVectors.has(o.id) ? "chip-btn--on" : ""}`}
                aria-pressed={activeVectors.has(o.id)}
                onClick={() => onToggleVector(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </details>
      <details className="dialed-sheet__section">
        <summary className="dialed-sheet__summary">Race selection mode</summary>
        <div className="dialed-sheet__body">
          <div className="chip-row" role="group" aria-label="Race mode">
            {RACE_MODES.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`chip-btn ${value.raceMode === o.id ? "chip-btn--on" : ""}`}
                aria-pressed={value.raceMode === o.id}
                onClick={() => onToggleRaceMode(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </details>
      <details className="dialed-sheet__section">
        <summary className="dialed-sheet__summary">Identity (optional)</summary>
        <div className="dialed-sheet__body">
          <p className="ui-caption ui-caption--xs" style={{ marginTop: 0, marginBottom: 6 }}>
            Faction
          </p>
          <div className="chip-row" style={{ marginBottom: 8 }}>
            {[
              { id: "all", label: "Any faction" },
              { id: "alliance", label: "Alliance" },
              { id: "horde", label: "Horde" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip-btn ${(f.id === "all" ? !value.factionPreference : value.factionPreference === f.id) ? "chip-btn--on" : ""}`}
                onClick={() =>
                  onIdentityChange({ factionPreference: f.id === "all" ? undefined : (f.id as "horde" | "alliance") })
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="ui-caption ui-caption--xs" style={{ marginTop: 0, marginBottom: 6 }}>
            Class intent (include / exclude)
          </p>
          <div className="chip-row" style={{ marginBottom: 8 }}>
            {CLASS_IDS.map((c) => (
              <button
                key={`class+${c}`}
                type="button"
                className={`chip-btn ${(value.preferredClasses ?? []).includes(c) ? "chip-btn--on" : ""}`}
                onClick={() =>
                  onIdentityChange({
                    preferredClasses: toggleIntentList(value.preferredClasses, c, 6),
                    excludedClasses: (value.excludedClasses ?? []).filter((x) => x !== c),
                  })
                }
              >
                + {c}
              </button>
            ))}
          </div>
          <div className="chip-row" style={{ marginBottom: 8 }}>
            {CLASS_IDS.map((c) => (
              <button
                key={`class-${c}`}
                type="button"
                className={`chip-btn ${(value.excludedClasses ?? []).includes(c) ? "chip-btn--on" : ""}`}
                onClick={() =>
                  onIdentityChange({
                    excludedClasses: toggleIntentList(value.excludedClasses, c, 6),
                    preferredClasses: (value.preferredClasses ?? []).filter((x) => x !== c),
                  })
                }
              >
                - {c}
              </button>
            ))}
          </div>
          <p className="ui-caption ui-caption--xs" style={{ marginTop: 0, marginBottom: 6 }}>
            Race intent (include / exclude)
          </p>
          <div className="chip-row" style={{ marginBottom: 8 }}>
            {RACE_FILTER_OPTIONS.map((r) => (
              <button
                key={`race+${r}`}
                type="button"
                className={`chip-btn ${(value.preferredRaces ?? []).includes(r) ? "chip-btn--on" : ""}`}
                onClick={() =>
                  onIdentityChange({
                    preferredRaces: toggleIntentList(value.preferredRaces, r, 8),
                    excludedRaces: (value.excludedRaces ?? []).filter((x) => x !== r),
                  })
                }
              >
                + {formatRaceLabel(r)}
              </button>
            ))}
          </div>
          <div className="chip-row">
            {RACE_FILTER_OPTIONS.map((r) => (
              <button
                key={`race-${r}`}
                type="button"
                className={`chip-btn ${(value.excludedRaces ?? []).includes(r) ? "chip-btn--on" : ""}`}
                onClick={() =>
                  onIdentityChange({
                    excludedRaces: toggleIntentList(value.excludedRaces, r, 8),
                    preferredRaces: (value.preferredRaces ?? []).filter((x) => x !== r),
                  })
                }
              >
                - {formatRaceLabel(r)}
              </button>
            ))}
          </div>
        </div>
      </details>
      <div className="flow-nav flow-nav--wrap" style={{ marginTop: 12 }}>
        <button type="button" className="btn-ghost" onClick={onBack}>
          {isDraft ? "Back to run goal" : "Back"}
        </button>
        <button type="button" className="btn-ghost" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="btn-primary" onClick={onContinue}>
          Continue to review
        </button>
      </div>
    </>
  );
}
