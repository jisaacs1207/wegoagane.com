import { useMemo, useState } from "react";
import type { BuildIntentSignals } from "../lib/buildIntentTypes";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";

const STAT_OPTIONS = [
  { id: "stamina_forward", label: "Stam first" },
  { id: "intellect_forward", label: "Int" },
  { id: "agility_forward", label: "Agi" },
  { id: "strength_forward", label: "Str" },
  { id: "spirit_forward", label: "Spirit" },
  { id: "balanced", label: "Balanced" },
  { id: "meme_glass", label: "Spicy / glass" },
] as const;

const PROF_OPTIONS = [
  { id: "engineering_outs", label: "Engineering" },
  { id: "first_aid_mandatory_mindset", label: "First Aid heavy" },
  { id: "herbalism_alchemy_pair", label: "Herb + Alch" },
  { id: "alchemy_consumables", label: "Potion economy" },
  { id: "mining_engineering_pair", label: "Mine + Eng" },
  { id: "dual_gathering_bootstrap", label: "Dual gather" },
  { id: "skinning_mining_early", label: "Skin + mine early" },
  { id: "leatherworker_hunter_synergy", label: "LW + leather" },
  { id: "tailoring_bags_arcane", label: "Tailor + bags" },
  { id: "enchanter_disenchant_route", label: "Enchant + DE" },
  { id: "blacksmith_weaponsmith_fantasy", label: "Smith fantasy" },
  { id: "cooking_high_value", label: "Cooking focus" },
  { id: "fishing_supports_cooking", label: "Fish + cook" },
  { id: "fishing_optional", label: "Fishing optional" },
  { id: "early_gathering_then_pivot_engineering", label: "Gather then Eng pivot" },
  { id: "auction_house_play", label: "Auction house play" },
] as const;

const VECTOR_OPTIONS = [
  { id: "solo", label: "Solo" },
  { id: "group_ok", label: "Group okay" },
  { id: "hybrid", label: "Hybrid toolkit" },
  { id: "pet", label: "Pet class" },
  { id: "melee", label: "Melee" },
  { id: "ranged", label: "Ranged" },
  { id: "caster", label: "Caster" },
  { id: "heal", label: "Healing" },
  { id: "tank", label: "Tanky" },
  { id: "mana", label: "Mana" },
  { id: "rage", label: "Rage" },
  { id: "energy", label: "Energy" },
  { id: "demonic", label: "Dark fantasy" },
  { id: "holy", label: "Holy fantasy" },
  { id: "nature", label: "Nature fantasy" },
] as const;

const RACE_MODES = [
  { id: "signal_inferred", label: "From answers" },
  { id: "optimize_theme", label: "Optimize" },
  { id: "surprise", label: "Surprise me" },
  { id: "user_pick", label: "I pick race" },
] as const;

type Props = {
  storageKey: string;
  onGenerate: (signals: BuildIntentSignals, depth: IntentDepth) => void;
  isGenerating?: boolean;
  hasGenerated?: boolean;
};

type IntentDepth = "quick" | "balanced" | "dialed_in";

type CorePreset = "safe" | "balanced" | "bold";
type JourneyStep = "depth" | "path" | "review";
type BranchKey = "survivability" | "economy" | "combat";

const DEPTH_OPTIONS: Array<{ id: IntentDepth; label: string; helper: string }> = [
  { id: "quick", label: "Quick pick", helper: "Fast start, fewer knobs, still HC-aware." },
  { id: "balanced", label: "Balanced", helper: "Best first-pass fit for most players." },
  { id: "dialed_in", label: "Dialed-in", helper: "More inputs, tighter fit, slightly slower." },
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

function toggleList(list: string[] | undefined, id: string, max: number): string[] {
  const cur = list ?? [];
  if (cur.includes(id)) return cur.filter((x) => x !== id);
  if (cur.length >= max) return [...cur.slice(1), id];
  return [...cur, id];
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

function applyCorePreset(value: BuildIntentSignals, preset: CorePreset): BuildIntentSignals {
  if (preset === "safe") {
    return {
      ...value,
      statPhilosophy: ["stamina_forward", "balanced"],
      professionIntents: ["engineering_outs", "first_aid_mandatory_mindset"],
      buildVectors: ["solo", "tank", "mana"],
    };
  }
  if (preset === "bold") {
    return {
      ...value,
      statPhilosophy: ["meme_glass", "agility_forward"],
      professionIntents: ["dual_gathering_bootstrap", "auction_house_play"],
      buildVectors: ["melee", "ranged", "solo"],
    };
  }
  return {
    ...value,
    statPhilosophy: ["balanced"],
    professionIntents: ["engineering_outs", "cooking_high_value"],
    buildVectors: ["solo", "group_ok"],
  };
}

function optionLabel(id: string): string {
  const all = [...STAT_OPTIONS, ...PROF_OPTIONS, ...VECTOR_OPTIONS, ...RACE_MODES];
  return all.find((x) => x.id === id)?.label ?? id;
}

export function BuildIntentChips({ storageKey, onGenerate, isGenerating = false, hasGenerated = false }: Props) {
  const [value, setValue] = useState<BuildIntentSignals>(() => readStorage(storageKey));
  const [depth, setDepth] = useState<IntentDepth>(() => readDepth(storageKey));
  const [step, setStep] = useState<JourneyStep>("depth");
  const [activeBranch, setActiveBranch] = useState<BranchKey>("survivability");
  const [corePreset, setCorePreset] = useState<CorePreset>("balanced");

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
      branch: activeBranch,
      statCount: value.statPhilosophy?.length ?? 0,
      professionCount: value.professionIntents?.length ?? 0,
      vectorCount: value.buildVectors?.length ?? 0,
      raceMode: value.raceMode ?? "signal_inferred",
      activeCount: activeIds.length,
    }),
    [
      activeBranch,
      activeIds.length,
      depth,
      step,
      storageKey,
      value.buildVectors?.length,
      value.professionIntents?.length,
      value.raceMode,
      value.statPhilosophy?.length,
    ],
  );

  const depthHelper = DEPTH_OPTIONS.find((o) => o.id === depth)?.helper;

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

  return (
    <div className="build-intent card" style={{ marginTop: 12 }}>
      <p className="step-label" style={{ marginBottom: 8 }}>
        Build journey
      </p>
      <p className="hero-sub" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
        Pick your depth, branch deeper if you want, then generate on the final screen.
      </p>
      <p className="hero-sub" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
        Step {step === "depth" ? "1" : step === "path" ? "2" : "3"} of 3
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
          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--ts)" }}>What changes in each mode</summary>
            <p className="hero-sub" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
              Quick asks only core preference. Balanced lets you branch into selected details. Dialed-in expects deeper
              tuning before final generation.
            </p>
          </details>
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
          <div className="flow-nav">
            {depth === "quick" ? (
              <button type="button" className="btn-primary" onClick={() => setStep("review")}>
                Continue to generation
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => setStep("path")}>
                Continue to branches
              </button>
            )}
          </div>
        </>
      ) : null}
      {step === "path" ? (
        <>
          <p className="hero-sub" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
            Choose a branch like a talent path. You can stop early and generate any time.
          </p>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`chip-btn ${activeBranch === "survivability" ? "chip-btn--on" : ""}`}
              onClick={() => setActiveBranch("survivability")}
            >
              Survivability
            </button>
            <button
              type="button"
              className={`chip-btn ${activeBranch === "economy" ? "chip-btn--on" : ""}`}
              onClick={() => setActiveBranch("economy")}
            >
              Economy/professions
            </button>
            <button
              type="button"
              className={`chip-btn ${activeBranch === "combat" ? "chip-btn--on" : ""}`}
              onClick={() => setActiveBranch("combat")}
            >
              Combat/fantasy
            </button>
          </div>
          {activeBranch === "survivability" ? (
            <>
              <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                <legend style={{ fontSize: 12, color: "var(--ts)", marginBottom: 6 }}>Stat lean</legend>
                <div className="chip-row">
                  {STAT_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={`chip-btn ${value.statPhilosophy?.includes(o.id) ? "chip-btn--on" : ""}`}
                      onClick={() =>
                        persist({
                          ...value,
                          statPhilosophy: toggleList(value.statPhilosophy, o.id, 3) as BuildIntentSignals["statPhilosophy"],
                        })
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset style={{ border: "none", padding: 0, margin: "12px 0 0" }}>
                <legend style={{ fontSize: 12, color: "var(--ts)", marginBottom: 6 }}>Race mode</legend>
                <div className="chip-row">
                  {RACE_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`chip-btn ${value.raceMode === m.id ? "chip-btn--on" : ""}`}
                      onClick={() => persist({ ...value, raceMode: m.id as BuildIntentSignals["raceMode"] })}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          ) : null}
          {activeBranch === "economy" ? (
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ fontSize: 12, color: "var(--ts)", marginBottom: 6 }}>Professions / economy</legend>
              <div className="chip-row">
                {PROF_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`chip-btn ${value.professionIntents?.includes(o.id) ? "chip-btn--on" : ""}`}
                    onClick={() =>
                      persist({
                        ...value,
                        professionIntents: toggleList(value.professionIntents, o.id, 4) as BuildIntentSignals["professionIntents"],
                      })
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {activeBranch === "combat" ? (
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ fontSize: 12, color: "var(--ts)", marginBottom: 6 }}>Combat / fantasy</legend>
              <div className="chip-row">
                {VECTOR_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`chip-btn ${value.buildVectors?.includes(o.id) ? "chip-btn--on" : ""}`}
                    onClick={() =>
                      persist({
                        ...value,
                        buildVectors: toggleList(value.buildVectors, o.id, 6) as BuildIntentSignals["buildVectors"],
                      })
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="flow-nav" style={{ marginTop: 12 }}>
            <button type="button" className="btn-ghost" onClick={() => setStep("depth")}>
              Back
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep("review")}>
              Continue to generation
            </button>
          </div>
        </>
      ) : null}
      {step === "review" ? (
        <>
          {activeIds.length ? (
            <div style={{ marginBottom: 12 }}>
              <p className="step-label" style={{ marginBottom: 6 }}>
                Final selected filters
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
              No advanced filters selected. We will generate from your core path.
            </p>
          )}
          <div className="flow-nav">
            <button type="button" className="btn-ghost" onClick={() => setStep(depth === "quick" ? "depth" : "path")}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isGenerating}
              onClick={() => {
                trackEvent(
                  hasGenerated ? AnalyticsEvent.IntentRegenerateClicked : AnalyticsEvent.IntentGenerateClicked,
                  eventContext,
                );
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
