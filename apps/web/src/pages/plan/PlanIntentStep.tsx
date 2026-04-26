import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";
import { SessionKeys } from "../../lib/sessionKeys";

const INTENTS = [
  { id: "safe_60", label: "Safest path to 60", hint: "Lower variance and stable progression.", icon: wowPackUrl("Abilities", "ShieldWall.png") },
  { id: "something_new", label: "Try something new", hint: "Break prior patterns for a fresh run.", icon: wowPackUrl("Miscellaneous", "QuestionMark.png") },
  { id: "profession_first", label: "Profession-first", hint: "Crafting/economy route shapes class choice.", icon: wowPackUrl("Trade", "engineering.png") },
  { id: "social_value", label: "Social / group value", hint: "Bring utility and resilience to party play.", icon: wowPackUrl("Miscellaneous", "Tournaments_banner_Human.png") },
  { id: "solo_comfort", label: "Solo comfort", hint: "Self-sufficient loop with safer pull plans.", icon: wowPackUrl("Abilities", "HealingInstincts.png") },
  { id: "fast_aggressive", label: "Fast and aggressive", hint: "Higher tempo with controlled risk.", icon: wowPackUrl("Spells", "BurningSpeed.png") },
  { id: "just_fun", label: "Comfort-first", hint: "Personal fit first, while keeping HC guardrails.", icon: wowPackUrl("Miscellaneous", "Dice_01.png") },
] as const;

type IdentityPriority = "class_first" | "race_first";

function readIntentGoalId(): string | null {
  try {
    const id = sessionStorage.getItem(SessionKeys.plan.intentGoalId);
    if (id && INTENTS.some((x) => x.id === id)) return id;
    const label = sessionStorage.getItem(SessionKeys.plan.intent);
    if (!label) return null;
    const row = INTENTS.find((x) => x.label === label);
    return row?.id ?? null;
  } catch {
    return null;
  }
}

function readIdentityPriority(): IdentityPriority {
  try {
    const v = sessionStorage.getItem(SessionKeys.plan.identityPriority);
    if (v === "race_first") return "race_first";
  } catch {
    /* ignore */
  }
  return "class_first";
}

export function PlanIntentStep() {
  const navigate = useNavigate();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(() => readIntentGoalId());
  const [identityPriority, setIdentityPriority] = useState<IdentityPriority>(() => readIdentityPriority());

  useEffect(() => {
    sessionStorage.removeItem(SessionKeys.plan.generatedDestiny);
    sessionStorage.removeItem(SessionKeys.plan.destinyId);
  }, []);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SessionKeys.plan.identityPriority)) {
        sessionStorage.setItem(SessionKeys.plan.identityPriority, "class_first");
      }
    } catch {
      /* ignore */
    }
  }, []);

  function persistIdentityPriority(next: IdentityPriority) {
    setIdentityPriority(next);
    try {
      sessionStorage.setItem(SessionKeys.plan.identityPriority, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="card">
      <div className="flow-crumbs" aria-label="Flow navigation">
        <span className="flow-crumb">
          <Link to="/">Home</Link>
        </span>
        <span className="flow-crumb">/</span>
        <span className="flow-crumb">Detailed setup</span>
      </div>
      <p className="step-label">Draft a run · step 1 of 3</p>
      <h1 className="hero-question">What is this run trying to achieve?</h1>
      <p className="hero-sub">Choose identity order, then tap a goal; you go straight to filters.</p>
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 18px 0" }}>
        <legend className="ui-caption" style={{ marginBottom: 8 }}>
          Resolve first
        </legend>
        <div className="chip-row" role="group" aria-label="Class or race first">
          <button
            type="button"
            className={`chip-btn ${identityPriority === "class_first" ? "chip-btn--on" : ""}`}
            aria-pressed={identityPriority === "class_first"}
            onClick={() => persistIdentityPriority("class_first")}
          >
            Class first
          </button>
          <button
            type="button"
            className={`chip-btn ${identityPriority === "race_first" ? "chip-btn--on" : ""}`}
            aria-pressed={identityPriority === "race_first"}
            onClick={() => persistIdentityPriority("race_first")}
          >
            Race first
          </button>
        </div>
        <p className="ui-caption ui-caption--xs" style={{ marginTop: 8 }}>
          Tells the recommender whether to lean class fantasy or race and faction when both are open.
        </p>
      </fieldset>
      <div className="ritual-option-grid">
        {INTENTS.map((i) => (
          <button
            key={i.id}
            type="button"
            className={`ritual-option ${selectedGoalId === i.id ? "ritual-option--on" : ""}`}
            onClick={() => {
              setSelectedGoalId(i.id);
              try {
                sessionStorage.setItem(SessionKeys.plan.intent, i.label);
                sessionStorage.setItem(SessionKeys.plan.intentGoalId, i.id);
                sessionStorage.removeItem(SessionKeys.plan.buildIntent);
                sessionStorage.removeItem(SessionKeys.plan.buildIntentDepth);
                sessionStorage.removeItem(SessionKeys.plan.buildIntentPowerCurve);
                sessionStorage.removeItem(SessionKeys.plan.generatedDestiny);
                sessionStorage.removeItem(SessionKeys.plan.destinyId);
              } catch {
                /* ignore */
              }
              navigate("/draft-a-run/journey");
            }}
          >
            <IdentityPortrait src={i.icon} alt="" className="ritual-option__icon" />
            <span className="ritual-option__text">
              <span className="ritual-option__title">{i.label}</span>
              <span className="ritual-option__hint">{i.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flow-nav" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            sessionStorage.removeItem(SessionKeys.plan.intent);
            sessionStorage.removeItem(SessionKeys.plan.intentGoalId);
            sessionStorage.removeItem(SessionKeys.plan.identityPriority);
            sessionStorage.removeItem(SessionKeys.plan.freeform);
            sessionStorage.removeItem(SessionKeys.plan.buildIntent);
            sessionStorage.removeItem(SessionKeys.plan.buildIntentDepth);
            sessionStorage.removeItem(SessionKeys.plan.buildIntentPowerCurve);
            sessionStorage.removeItem(SessionKeys.plan.generatedDestiny);
            sessionStorage.removeItem(SessionKeys.plan.destinyId);
            navigate("/");
          }}
        >
          Back
        </button>
      </div>
      <p className="ui-caption" style={{ marginTop: 10 }}>
        Optional notes and dealbreakers are on the next step, above the filter sheet.
      </p>
    </div>
  );
}
