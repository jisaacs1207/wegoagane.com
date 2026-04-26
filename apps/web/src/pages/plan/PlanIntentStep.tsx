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

export function PlanIntentStep() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(sessionStorage.getItem(SessionKeys.plan.intent));
  const [note, setNote] = useState(sessionStorage.getItem(SessionKeys.plan.freeform) ?? "");
  const [showConstraints, setShowConstraints] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(SessionKeys.plan.generatedDestiny);
    sessionStorage.removeItem(SessionKeys.plan.destinyId);
  }, []);

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
      <p className="hero-sub">Pick the main goal for this run. We tune around this first.</p>
      <div className="ritual-option-grid">
        {INTENTS.map((i) => (
          <button
            key={i.id}
            type="button"
            className={`ritual-option ${selected === i.id ? "ritual-option--on" : ""}`}
            onClick={() => {
              setSelected(i.id);
              sessionStorage.setItem(SessionKeys.plan.intent, i.label);
              // Starting a new plan run should not inherit stale journey filters.
              sessionStorage.removeItem(SessionKeys.plan.buildIntent);
              sessionStorage.removeItem(SessionKeys.plan.buildIntentDepth);
              sessionStorage.removeItem(SessionKeys.plan.buildIntentPowerCurve);
              sessionStorage.removeItem(SessionKeys.plan.generatedDestiny);
              sessionStorage.removeItem(SessionKeys.plan.destinyId);
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
      <div className="flow-nav" style={{ marginTop: 12 }}>
        <button type="button" className="btn-ghost" onClick={() => setShowConstraints((v) => !v)}>
          {showConstraints ? "Hide optional constraints" : "Add optional constraints"}
        </button>
      </div>
      {showConstraints ? (
        <label className="ui-caption" style={{ marginTop: 12, display: "block" }}>
          Optional constraints
          <textarea
            value={note}
            onChange={(e) => {
              const next = e.target.value.slice(0, 120);
              setNote(next);
              sessionStorage.setItem(SessionKeys.plan.freeform, next);
            }}
            placeholder="e.g. no pet micromanagement, avoid mage, prioritize sustain"
            rows={3}
            style={{ width: "100%", marginTop: 6 }}
          />
        </label>
      ) : null}
      <div className="flow-nav">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            sessionStorage.removeItem(SessionKeys.plan.intent);
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
        <button type="button" className="btn-primary" onClick={() => navigate("/draft-a-run/journey")} disabled={!selected}>
          Continue to filters
        </button>
      </div>
      <p className="ui-caption" style={{ marginTop: 10 }}>
        Next: tune chips, review, then generate — you stay in control of each step.
      </p>
    </div>
  );
}
