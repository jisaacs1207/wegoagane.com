import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";
import { SessionKeys } from "../../lib/sessionKeys";

const MOODS = [
  { id: "my_fault", label: "My fault", hint: "I misplayed and want a cleaner safety loop.", icon: wowPackUrl("Abilities", "ShieldGuard.png") },
  { id: "bullshit", label: "Felt unfair", hint: "I got clipped by chaos and want stability.", icon: wowPackUrl("Spells", "Slow.png") },
  { id: "first_time", label: "First time", hint: "I need conservative guidance and confidence.", icon: wowPackUrl("Abilities", "HealingInstincts.png") },
  { id: "long_time_coming", label: "Long time coming", hint: "I was checked out and want a fresh tone.", icon: wowPackUrl("Spells", "StarFall.png") },
  { id: "just_generate", label: "Skip mood", hint: "Jump straight to build tuning.", icon: wowPackUrl("Miscellaneous", "Dice_01.png") },
] as const;

export function DeathMoodStep() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(sessionStorage.getItem(SessionKeys.death.mood));

  useEffect(() => {
    sessionStorage.removeItem(SessionKeys.death.generatedDestiny);
    sessionStorage.removeItem(SessionKeys.death.destinyId);
  }, []);

  return (
    <div className="card">
      <p className="step-label">Release spirit · optional mood-only view</p>
      <h1 className="hero-question">What was the tone of that death?</h1>
      <p className="hero-sub">Pick the mood so your next recommendation matches how you want to recover.</p>
      <div className="ritual-option-grid">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`ritual-option ${selected === m.id ? "ritual-option--on" : ""}`}
            onClick={() => {
              setSelected(m.id);
              sessionStorage.setItem(SessionKeys.death.mood, m.id);
              sessionStorage.removeItem(SessionKeys.death.nextSignal);
              sessionStorage.removeItem(SessionKeys.death.detailZone);
              sessionStorage.removeItem(SessionKeys.death.detailCause);
              sessionStorage.removeItem(SessionKeys.death.detailLevel);
              sessionStorage.removeItem(SessionKeys.death.detailNote);
              sessionStorage.removeItem(SessionKeys.death.buildIntent);
              sessionStorage.removeItem(SessionKeys.death.buildIntentDepth);
              sessionStorage.removeItem(SessionKeys.death.buildIntentPowerCurve);
              sessionStorage.removeItem(SessionKeys.death.generatedDestiny);
              sessionStorage.removeItem(SessionKeys.death.destinyId);
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
        <button type="button" className="btn-primary" onClick={() => navigate("/release-spirit/next")} disabled={!selected}>
          Continue
        </button>
      </div>
    </div>
  );
}
