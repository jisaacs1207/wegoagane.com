import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";

const INTENTS = [
  { id: "safe_60", label: "Safest path to 60", hint: "Lower variance and stable progression.", icon: wowPackUrl("Abilities", "ShieldWall.png") },
  { id: "something_new", label: "Try something new", hint: "Break prior patterns for a fresh run.", icon: wowPackUrl("Miscellaneous", "QuestionMark.png") },
  { id: "profession_first", label: "Profession-first", hint: "Crafting/economy route shapes class choice.", icon: wowPackUrl("Trade", "engineering.png") },
  { id: "social_value", label: "Social / group value", hint: "Bring utility and resilience to party play.", icon: wowPackUrl("Miscellaneous", "Tournaments_banner_Human.png") },
  { id: "solo_comfort", label: "Solo comfort", hint: "Self-sufficient loop with safer pull plans.", icon: wowPackUrl("Abilities", "HealingInstincts.png") },
  { id: "fast_aggressive", label: "Fast and aggressive", hint: "Higher tempo with controlled risk.", icon: wowPackUrl("Spells", "BurningSpeed.png") },
  { id: "just_fun", label: "Fun-first", hint: "Style-first recommendation with HC guardrails.", icon: wowPackUrl("Miscellaneous", "Dice_01.png") },
] as const;

export function PlanIntentStep() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.removeItem("plan.generatedDestiny");
    sessionStorage.removeItem("plan.destinyId");
  }, []);

  return (
    <div className="card">
      <p className="step-label">Draft a run · step 1 of 3</p>
      <h1 className="hero-question">What is this run trying to achieve?</h1>
      <p className="hero-sub">Pick the primary win condition for this run. We tune around this first.</p>
      <div className="ritual-option-grid">
        {INTENTS.map((i) => (
          <button
            key={i.id}
            type="button"
            className={`ritual-option ${selected === i.id ? "ritual-option--on" : ""}`}
            onClick={() => {
              setSelected(i.id);
              sessionStorage.setItem("plan.intent", i.label);
              // Starting a new plan run should not inherit stale journey filters.
              sessionStorage.removeItem("plan.buildIntent");
              sessionStorage.removeItem("plan.buildIntent.depth");
              sessionStorage.removeItem("plan.buildIntent.powerCurve");
              sessionStorage.removeItem("plan.generatedDestiny");
              sessionStorage.removeItem("plan.destinyId");
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
      <div className="flow-nav">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            sessionStorage.removeItem("plan.intent");
            sessionStorage.removeItem("plan.freeform");
            sessionStorage.removeItem("plan.buildIntent");
            sessionStorage.removeItem("plan.buildIntent.depth");
            sessionStorage.removeItem("plan.buildIntent.powerCurve");
            sessionStorage.removeItem("plan.generatedDestiny");
            sessionStorage.removeItem("plan.destinyId");
            navigate("/");
          }}
        >
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate("/draft-a-run/freeform")}>
          Continue
        </button>
      </div>
    </div>
  );
}
