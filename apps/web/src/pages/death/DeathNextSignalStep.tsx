import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";

const SIGNALS = [
  { id: "safer", label: "Safer", hint: "Higher margin, lower volatility.", icon: wowPackUrl("Abilities", "ShieldWall.png") },
  { id: "faster", label: "Faster", hint: "Tempo and route speed matter most.", icon: wowPackUrl("Spells", "BurningSpeed.png") },
  { id: "different", label: "Different", hint: "Pull me away from the old pattern.", icon: wowPackUrl("Miscellaneous", "QuestionMark.png") },
  { id: "social", label: "Social", hint: "Group viability and shared value.", icon: wowPackUrl("Miscellaneous", "Tournaments_banner_Human.png") },
  { id: "strange", label: "Strange", hint: "Unusual but still hardcore sane.", icon: wowPackUrl("Spells", "ShadowMeld.png") },
  { id: "no_pet", label: "No pet class", hint: "Avoid pet-centric gameplay.", icon: wowPackUrl("Abilities", "AspectOfTheMonkey.png") },
  { id: "surprise", label: "Surprise me", hint: "Bias for novelty within guardrails.", icon: wowPackUrl("Miscellaneous", "Dice_02.png") },
] as const;

export function DeathNextSignalStep() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="card">
      <p className="step-label">Release spirit · step 2 of 4</p>
      <h1 className="hero-question">What do you want next?</h1>
      <p className="hero-sub">Choose the strongest next-run priority. This directly biases the reroll engine.</p>
      <div className="ritual-option-grid">
        {SIGNALS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ritual-option ${selected === s.id ? "ritual-option--on" : ""}`}
            onClick={() => {
              setSelected(s.id);
              sessionStorage.setItem("death.nextSignal", s.label);
            }}
          >
            <IdentityPortrait src={s.icon} alt="" className="ritual-option__icon" />
            <span className="ritual-option__text">
              <span className="ritual-option__title">{s.label}</span>
              <span className="ritual-option__hint">{s.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flow-nav">
        <button type="button" className="btn-ghost" onClick={() => navigate("/release-spirit/mood")}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate("/release-spirit/detail")}>
          Continue
        </button>
      </div>
    </div>
  );
}
