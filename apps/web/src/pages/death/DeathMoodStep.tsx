import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";

const MOODS = [
  { id: "my_fault", label: "My fault", hint: "I misplayed and want a cleaner safety loop.", icon: wowPackUrl("Abilities", "ShieldGuard.png") },
  { id: "bullshit", label: "Bullshit death", hint: "I got clipped by chaos and want stability.", icon: wowPackUrl("Spells", "Slow.png") },
  { id: "first_time", label: "First time", hint: "I need conservative guidance and confidence.", icon: wowPackUrl("Abilities", "HealingInstincts.png") },
  { id: "long_time_coming", label: "Long time coming", hint: "I was checked out and want a fresh tone.", icon: wowPackUrl("Spells", "StarFall.png") },
  { id: "just_generate", label: "Skip details", hint: "Jump straight to build tuning.", icon: wowPackUrl("Miscellaneous", "Dice_01.png") },
] as const;

export function DeathMoodStep() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.removeItem("death.generatedDestiny");
    sessionStorage.removeItem("death.destinyId");
  }, []);

  return (
    <div className="card">
      <p className="step-label">Release spirit · step 1 of 4</p>
      <h1 className="hero-question">What happened?</h1>
      <p className="hero-sub">Pick the emotional context so the next recommendation lands in the right lane.</p>
      <div className="ritual-option-grid">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`ritual-option ${selected === m.id ? "ritual-option--on" : ""}`}
            onClick={() => {
              setSelected(m.id);
              sessionStorage.setItem("death.mood", m.label);
              sessionStorage.removeItem("death.generatedDestiny");
              sessionStorage.removeItem("death.destinyId");
            }}
          >
            <IdentityPortrait src={m.icon} alt="" className="ritual-option__icon" />
            <span className="ritual-option__text">
              <span className="ritual-option__title">{m.label}</span>
              <span className="ritual-option__hint">{m.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flow-nav">
        <button type="button" className="btn-ghost" onClick={() => navigate("/")}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate("/release-spirit/next")}>
          Continue
        </button>
      </div>
    </div>
  );
}
