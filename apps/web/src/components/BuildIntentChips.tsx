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
import { JourneyIdentityStrip } from "./journey/JourneyIdentityStrip";
import type { JourneyVectorKey } from "../content/identityAssets";

type Props = {
  storageKey: string;
  onGenerate: (signals: BuildIntentSignals, depth: IntentDepth) => void;
  isGenerating?: boolean;
  hasGenerated?: boolean;
};
type JourneyStep = "depth" | "vector" | "question" | "review";
type VectorKey = JourneyVectorKey;

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


export function BuildIntentChips({ storageKey, onGenerate, isGenerating = false, hasGenerated = false }: Props) {
  const [value, setValue] = useState<BuildIntentSignals>(() => readStorage(storageKey));
  const [depth, setDepth] = useState<IntentDepth>(() => readDepth(storageKey));
  const [step, setStep] = useState<JourneyStep>("depth");
  const [vector, setVector] = useState<VectorKey>("survivability");
  const [questionIndex, setQuestionIndex] = useState(0);
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
      vector,
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
    ],
    surprise: [
      {
        id: "surprise_mode",
        prompt: "How wild should the surprise be?",
        answers: ["Stable surprise", "Balanced surprise", "Spicy surprise", "Maximum chaos"],
        apply: (a) => ({ ...value, raceMode: a === "Maximum chaos" ? "surprise" : "signal_inferred" }),
      },
    ],
  };
  const currentQuestions = questionsByVector[vector];
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

  return (
    <div className="build-intent card" style={{ marginTop: 12 }}>
      <JourneyIdentityStrip step={step} vector={vector} depth={depth} corePreset={corePreset} signals={value} />
      <p className="step-label" style={{ marginBottom: 8 }}>
        Build journey
      </p>
      <p className="hero-sub" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
        Choose a vector, answer one question per screen, and generate whenever you are ready.
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
              <button type="button" className="btn-primary" onClick={() => setStep("vector")}>
                Continue to vector
              </button>
            )}
          </div>
        </>
      ) : null}
      {step === "vector" ? (
        <>
          <p className="hero-sub" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>What is your build entrance vector?</p>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {[
              { id: "profession", label: "Profession-first" },
              { id: "playstyle", label: "Playstyle" },
              { id: "class_fantasy", label: "Class fantasy" },
              { id: "combat_style", label: "Combat style" },
              { id: "survivability", label: "Survivability" },
              { id: "surprise", label: "Surprise me" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip-btn ${vector === opt.id ? "chip-btn--on" : ""}`}
                onClick={() => {
                  setVector(opt.id as VectorKey);
                  trackEvent(AnalyticsEvent.VectorSelected, { ...eventContext, vector: opt.id });
                }}
              >
                {opt.label}
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
                setQuestionIndex(0);
                setStep("question");
              }}
            >
              Continue
            </button>
          </div>
        </>
      ) : null}
      {step === "question" ? (
        <>
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
                  if (questionIndex >= 4 || questionIndex >= currentQuestions.length - 1) {
                    setStep("review");
                  } else {
                    setQuestionIndex((prev) => prev + 1);
                  }
                }}
              >
                {answer}
              </button>
            ))}
          </div>
          <div className="flow-nav">
            <button type="button" className="btn-ghost" onClick={() => setStep("vector")}>
              Back
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep("review")}>
              Generate now
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
