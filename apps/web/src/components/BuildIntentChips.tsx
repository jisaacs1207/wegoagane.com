import { useMemo, useState } from "react";
import type { BuildIntentSignals } from "../lib/buildIntentTypes";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";
import {
  applyCorePreset,
  DEPTH_OPTIONS,
  optionLabel,
  toggleList,
  type CorePreset,
  type IntentDepth,
} from "./intent/intentOptions";
import { type JourneyVectorKey, VECTOR_JOURNEY_URLS, wowPackUrl } from "../content/identityAssets";
import { IdentityPortrait } from "./IdentityPortrait";
import { readPowerCurve, type PowerCurveId } from "../lib/journeySignalsExtras";

type Props = {
  storageKey: string;
  onGenerate: (signals: BuildIntentSignals, depth: IntentDepth) => void;
  isGenerating?: boolean;
  hasGenerated?: boolean;
  /** Shown on the review step when recommend failed due to over-tight filters. */
  filterRecoveryAction?: { label: string; onSoften: () => void } | null;
};
type JourneyStep = "depth" | "vector" | "question" | "review";
type VectorKey = JourneyVectorKey;

const VECTOR_ICON_GLIMPSE: Record<VectorKey, string[]> = {
  profession: [VECTOR_JOURNEY_URLS.profession, wowPackUrl("Trade", "herbalism.png"), wowPackUrl("Trade", "fishing.png")],
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
  { id: "balanced", label: "Balanced curve" },
];

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


export function BuildIntentChips({
  storageKey,
  onGenerate,
  isGenerating = false,
  hasGenerated = false,
  filterRecoveryAction = null,
}: Props) {
  const [value, setValue] = useState<BuildIntentSignals>(() => readStorage(storageKey));
  const [depth, setDepth] = useState<IntentDepth>(() => readDepth(storageKey));
  const [step, setStep] = useState<JourneyStep>("depth");
  const [vector, setVector] = useState<VectorKey>("survivability");
  const [selectedVectors, setSelectedVectors] = useState<VectorKey[]>([]);
  const [vectorCursor, setVectorCursor] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [corePreset, setCorePreset] = useState<CorePreset>("balanced");
  const [powerCurve, setPowerCurve] = useState<PowerCurveId | null>(() => readPowerCurve(storageKey));

  function persist(next: BuildIntentSignals) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setValue(next);
  }

  function persistDepth(nextDepth: IntentDepth) {
    setDepth(nextDepth);
    writeDepth(storageKey, nextDepth);
    if (nextDepth === "quick") {
      setStep("review");
    }
  }

  const activeIds = useMemo(() => {
    const ids: string[] = [];
    ids.push(...(value.statPhilosophy ?? []));
    ids.push(...(value.professionIntents ?? []));
    ids.push(...(value.buildVectors ?? []));
    if (value.raceMode) ids.push(value.raceMode);
    return ids;
  }, [value]);
  const eventContext = useMemo(
    () => ({
      storageKey,
      depth,
      step,
      vector: selectedVectors[vectorCursor] ?? vector,
      questionIndex,
      statCount: value.statPhilosophy?.length ?? 0,
      professionCount: value.professionIntents?.length ?? 0,
      vectorCount: value.buildVectors?.length ?? 0,
      raceMode: value.raceMode ?? "signal_inferred",
      activeCount: activeIds.length,
    }),
    [
      activeIds.length,
      depth,
      questionIndex,
      step,
      storageKey,
      vector,
      selectedVectors,
      vectorCursor,
      value.buildVectors?.length,
      value.professionIntents?.length,
      value.raceMode,
      value.statPhilosophy?.length,
    ],
  );

  const depthHelper = DEPTH_OPTIONS.find((o) => o.id === depth)?.helper;

  const questionsByVector: Record<VectorKey, Array<{ id: string; prompt: string; answers: string[]; apply: (a: string) => BuildIntentSignals }>> = {
    profession: [
      {
        id: "prof_priority",
        prompt: "Which profession priority fits this run?",
        answers: ["Gold pacing", "Self-sustain", "Consumables", "Power spikes"],
        apply: (a) =>
          ({
            ...value,
            professionIntents: toggleList(
              value.professionIntents,
              a === "Gold pacing"
                ? "auction_house_play"
                : a === "Self-sustain"
                  ? "engineering_outs"
                  : a === "Consumables"
                    ? "alchemy_consumables"
                    : "mining_engineering_pair",
              4,
            ) as BuildIntentSignals["professionIntents"],
          }),
      },
      {
        id: "prof_tempo",
        prompt: "When should professions matter most?",
        answers: ["Early", "Mid", "Late", "Any"],
        apply: (a) =>
          ({
            ...value,
            professionIntents: toggleList(
              value.professionIntents,
              a === "Early"
                ? "skinning_mining_early"
                : a === "Mid"
                  ? "dual_gathering_bootstrap"
                  : a === "Late"
                    ? "early_gathering_then_pivot_engineering"
                    : "fishing_optional",
              4,
            ) as BuildIntentSignals["professionIntents"],
          }),
      },
    ],
    playstyle: [
      {
        id: "style_risk",
        prompt: "How much risk are you comfortable with?",
        answers: ["Very low", "Low", "Balanced", "High"],
        apply: (a) =>
          ({
            ...value,
            statPhilosophy: toggleList(
              value.statPhilosophy,
              a === "Very low" ? "stamina_forward" : a === "Low" ? "balanced" : a === "Balanced" ? "balanced" : "meme_glass",
              3,
            ) as BuildIntentSignals["statPhilosophy"],
          }),
      },
      {
        id: "style_pulls",
        prompt: "Preferred pull cadence?",
        answers: ["Singles only", "Controlled chains", "Mixed", "Fast pulls"],
        apply: (a) =>
          ({
            ...value,
            buildVectors: toggleList(
              value.buildVectors,
              a === "Singles only" ? "solo" : a === "Controlled chains" ? "tank" : a === "Mixed" ? "hybrid" : "rage",
              6,
            ) as BuildIntentSignals["buildVectors"],
          }),
      },
    ],
    class_fantasy: [
      {
        id: "fantasy_tone",
        prompt: "Which fantasy tone do you want?",
        answers: ["Holy", "Nature", "Arcane", "Shadow"],
        apply: (a) =>
          ({
            ...value,
            buildVectors: toggleList(
              value.buildVectors,
              a === "Holy" ? "holy" : a === "Nature" ? "nature" : a === "Arcane" ? "caster" : "demonic",
              6,
            ) as BuildIntentSignals["buildVectors"],
          }),
      },
      {
        id: "fantasy_weapon",
        prompt: "Weapon style preference?",
        answers: ["Two-hander", "Dual wield", "Caster focus", "Flexible"],
        apply: (a) =>
          ({
            ...value,
            buildVectors: toggleList(
              value.buildVectors,
              a === "Two-hander" ? "melee" : a === "Dual wield" ? "melee" : a === "Caster focus" ? "caster" : "hybrid",
              6,
            ) as BuildIntentSignals["buildVectors"],
          }),
      },
    ],
    combat_style: [
      {
        id: "combat_distance",
        prompt: "Preferred combat distance?",
        answers: ["Melee", "Ranged", "Hybrid", "No preference"],
        apply: (a) =>
          ({
            ...value,
            buildVectors: toggleList(
              value.buildVectors,
              a === "Melee" ? "melee" : a === "Ranged" ? "ranged" : a === "Hybrid" ? "hybrid" : "hybrid",
              6,
            ) as BuildIntentSignals["buildVectors"],
          }),
      },
      {
        id: "combat_ctrl",
        prompt: "More control or more damage pace?",
        answers: ["High control", "Balanced", "Higher damage pace", "Unpredictable is fine"],
        apply: (a) =>
          ({
            ...value,
            buildVectors: toggleList(
              value.buildVectors,
              a === "High control" ? "tank" : a === "Balanced" ? "hybrid" : a === "Higher damage pace" ? "rage" : "melee",
              6,
            ) as BuildIntentSignals["buildVectors"],
          }),
      },
    ],
    survivability: [
      {
        id: "survival_core",
        prompt: "What survival profile fits you?",
        answers: ["Never die", "Safe with speed", "Balanced", "High risk/high pace"],
        apply: (a) =>
          ({
            ...value,
            statPhilosophy: toggleList(
              value.statPhilosophy,
              a === "Never die" ? "stamina_forward" : a === "Safe with speed" ? "agility_forward" : a === "Balanced" ? "balanced" : "meme_glass",
              3,
            ) as BuildIntentSignals["statPhilosophy"],
          }),
      },
      {
        id: "survival_recovery",
        prompt: "Recovery style?",
        answers: ["Slow and steady", "Burst recovery", "Minimize downtime", "Map aware"],
        apply: (a) =>
          ({
            ...value,
            buildVectors: toggleList(
              value.buildVectors,
              a === "Slow and steady" ? "tank" : a === "Burst recovery" ? "hybrid" : a === "Minimize downtime" ? "solo" : "group_ok",
              6,
            ) as BuildIntentSignals["buildVectors"],
          }),
      },
    ],
    surprise: [
      {
        id: "surprise_mode",
        prompt: "How wild should the surprise be?",
        answers: ["Low variance", "Balanced", "High variance", "Full wildcard"],
        apply: (a) => ({ ...value, raceMode: a === "Full wildcard" ? "surprise" : "signal_inferred" }),
      },
      {
        id: "surprise_class",
        prompt: "Class flexibility for surprise?",
        answers: ["Any spec ok", "Avoid pet classes", "Prefer hybrid classes", "Full wildcard"],
        apply: (a) =>
          ({
            ...value,
            buildVectors: toggleList(
              value.buildVectors,
              a === "Avoid pet classes"
                ? "solo"
                : a === "Prefer hybrid classes"
                  ? "hybrid"
                  : a === "Full wildcard"
                    ? "caster"
                    : "group_ok",
              6,
            ) as BuildIntentSignals["buildVectors"],
          }),
      },
    ],
  };
  const activeVector = selectedVectors[vectorCursor] ?? vector;
  const currentQuestions = questionsByVector[activeVector];
  const currentQuestion = currentQuestions[Math.min(questionIndex, Math.max(0, currentQuestions.length - 1))];

  function removeActive(id: string) {
    if (value.statPhilosophy?.includes(id as never)) {
      persist({ ...value, statPhilosophy: value.statPhilosophy.filter((x) => x !== id) as BuildIntentSignals["statPhilosophy"] });
      return;
    }
    if (value.professionIntents?.includes(id as never)) {
      persist({
        ...value,
        professionIntents: value.professionIntents.filter((x) => x !== id) as BuildIntentSignals["professionIntents"],
      });
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

  function setStoredPowerCurve(next: PowerCurveId | null) {
    setPowerCurve(next);
    try {
      if (next) sessionStorage.setItem(`${storageKey}.powerCurve`, next);
      else sessionStorage.removeItem(`${storageKey}.powerCurve`);
    } catch {
      /* ignore */
    }
  }

  function resetJourneyFilters() {
    try {
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(depthStorageKey(storageKey));
      sessionStorage.removeItem(`${storageKey}.powerCurve`);
    } catch {
      /* ignore */
    }
    setValue({});
    setDepth("balanced");
    setStep("depth");
    setVector("survivability");
    setSelectedVectors([]);
    setVectorCursor(0);
    setQuestionIndex(0);
    setCorePreset("balanced");
    setPowerCurve(null);
  }

  return (
    <div className="build-intent card" style={{ marginTop: 12 }}>
      <p className="step-label" style={{ marginBottom: 8 }}>
        Build journey
      </p>
      <div className="flow-nav" style={{ marginTop: -4, marginBottom: 8 }}>
        <button type="button" className="btn-ghost" onClick={resetJourneyFilters}>
          Start fresh filters
        </button>
      </div>
      <p className="hero-sub" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
        Choose depth, pick one priority vector, answer two quick questions, then generate.
      </p>
      <p className="hero-sub" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
        Step {step === "depth" ? "1" : step === "vector" ? "2" : step === "question" ? "3" : "4"} of 4
      </p>
      {step === "depth" ? (
        <>
          <div className="chip-row">
            {DEPTH_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`chip-btn ${depth === o.id ? "chip-btn--on" : ""}`}
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
          <p className="hero-sub" style={{ marginTop: 8, marginBottom: 12, fontSize: 12 }}>
            {depthHelper}
          </p>
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 12px 0" }}>
            <legend style={{ fontSize: 12, color: "var(--ts)", marginBottom: 6 }}>Core preference</legend>
            <div className="chip-row">
              {[
                { id: "safe" as CorePreset, label: "Safe route" },
                { id: "balanced" as CorePreset, label: "Balanced route" },
                { id: "bold" as CorePreset, label: "Spicy route" },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`chip-btn ${corePreset === o.id ? "chip-btn--on" : ""}`}
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
          <fieldset className="journey-power-fieldset" style={{ border: "none", padding: 0, margin: "0 0 12px 0" }}>
            <legend style={{ fontSize: 12, color: "var(--ts)", marginBottom: 6 }}>Power curve (optional)</legend>
            <p className="hero-sub" style={{ marginTop: 0, marginBottom: 8, fontSize: 11 }}>
              Nudges the recommender toward early kit, mid climb, late spikes, or an even curve.
            </p>
            <div className="journey-power-curve">
              {POWER_CURVE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`journey-power-curve__btn ${powerCurve === o.id ? "journey-power-curve__btn--on" : ""}`}
                  onClick={() => {
                    setStoredPowerCurve(o.id);
                    trackEvent(AnalyticsEvent.IntentDepthSelected, { ...eventContext, powerCurve: o.id });
                  }}
                >
                  {o.label}
                </button>
              ))}
              <button type="button" className="journey-power-curve__clear" onClick={() => setStoredPowerCurve(null)}>
                Clear
              </button>
            </div>
          </fieldset>
          <div className="flow-nav">
            {depth === "quick" ? (
              <button type="button" className="btn-primary" onClick={() => setStep("review")}>
                Review filters
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => setStep("vector")}>
                Choose priority
              </button>
            )}
          </div>
        </>
      ) : null}
      {step === "vector" ? (
        <>
          <p className="hero-sub" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
            What should lead this build?
          </p>
          {selectedVectors.length > 0 ? (
            <p className="hero-sub" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
              Selected priorities: {selectedVectors.map((v) => VECTOR_ROWS.find((r) => r.id === v)?.title ?? v).join(" -> ")}
            </p>
          ) : null}
          <div className="journey-vector-grid">
            {VECTOR_ROWS.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`journey-vector-tile ${(selectedVectors.includes(row.id) || vector === row.id) ? "journey-vector-tile--on" : ""}`}
                onClick={() => {
                  setVector(row.id);
                  setSelectedVectors((prev) => {
                    if (prev.includes(row.id)) return prev.filter((v) => v !== row.id);
                    if (prev.length >= 3) return [...prev.slice(1), row.id];
                    return [...prev, row.id];
                  });
                  trackEvent(AnalyticsEvent.VectorSelected, { ...eventContext, vector: row.id });
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
            ))}
          </div>
          <div className="flow-nav" style={{ marginTop: 12 }}>
            <button type="button" className="btn-ghost" onClick={() => setStep("depth")}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const queue = selectedVectors.length > 0 ? selectedVectors : [vector];
                setSelectedVectors(queue);
                setVectorCursor(0);
                setQuestionIndex(0);
                setStep("question");
              }}
            >
              Refine priorities
            </button>
          </div>
        </>
      ) : null}
      {step === "question" ? (
        <>
          <p className="step-label" style={{ marginBottom: 6 }}>
            Refining: {VECTOR_ROWS.find((r) => r.id === activeVector)?.title ?? activeVector}
          </p>
          <p className="hero-sub" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
            {currentQuestion.prompt}
          </p>
          <div className="chip-row" style={{ marginBottom: 10 }}>
            {currentQuestion.answers.map((answer) => (
              <button
                key={answer}
                type="button"
                className="chip-btn"
                onClick={() => {
                  persist(currentQuestion.apply(answer));
                  trackEvent(AnalyticsEvent.QuestionAnswered, { ...eventContext, questionId: currentQuestion.id, answer });
                  if (questionIndex >= currentQuestions.length - 1) {
                    if (vectorCursor < selectedVectors.length - 1) {
                      setVectorCursor((prev) => prev + 1);
                      setQuestionIndex(0);
                    } else {
                      setStep("review");
                    }
                  } else {
                    setQuestionIndex((prev) => prev + 1);
                  }
                }}
              >
                {answer}
              </button>
            ))}
          </div>
          <div className="flow-nav flow-nav--wrap">
            <button type="button" className="btn-ghost" onClick={() => setStep("vector")}>
              Back
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setVectorCursor(0);
                setStep("vector");
              }}
            >
              Add another priority
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep("review")}>
              Skip to review
            </button>
          </div>
        </>
      ) : null}
      {step === "review" ? (
        <>
          {activeIds.length ? (
            <div style={{ marginBottom: 12 }}>
              <p className="step-label" style={{ marginBottom: 6 }}>
                Selected filters for this run
              </p>
              <div className="chip-row">
                {activeIds.map((id) => (
                  <button key={id} type="button" className="chip-btn chip-btn--on" onClick={() => removeActive(id)}>
                    {optionLabel(id)} ×
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="hero-sub" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
              No extra filters selected. We&apos;ll generate from your core preferences.
            </p>
          )}
          {filterRecoveryAction ? (
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn-ghost" onClick={filterRecoveryAction.onSoften}>
                {filterRecoveryAction.label}
              </button>
            </div>
          ) : null}
          <div className="flow-nav">
            <button type="button" className="btn-ghost" onClick={() => setStep(depth === "quick" ? "depth" : "question")}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isGenerating}
              onClick={() => {
                trackEvent(hasGenerated ? AnalyticsEvent.IntentRegenerateClicked : AnalyticsEvent.GenerateClicked, eventContext);
                onGenerate(value, depth);
              }}
            >
              {isGenerating ? "Generating..." : hasGenerated ? "Regenerate with these filters" : "Generate my card"}
            </button>
          </div>
          {hasGenerated ? (
            <p className="hero-sub" style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }}>
              You can return and adjust branches, then regenerate before reroll.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
