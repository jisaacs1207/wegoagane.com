import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";
import { SessionKeys } from "../../lib/sessionKeys";

const MOODS = [
  { id: "my_fault", label: "My fault" },
  { id: "bullshit", label: "Felt unfair" },
  { id: "first_time", label: "First time" },
  { id: "long_time_coming", label: "Long time coming" },
  { id: "just_generate", label: "Skip mood" },
] as const;

const SIGNALS = [
  { id: "safer", label: "Safer", hint: "Higher margin, lower volatility.", icon: wowPackUrl("Abilities", "ShieldWall.png") },
  { id: "faster", label: "Faster", hint: "Tempo and route speed matter most.", icon: wowPackUrl("Spells", "BurningSpeed.png") },
  { id: "different", label: "Different playstyle", hint: "Pull me away from the old pattern.", icon: wowPackUrl("Miscellaneous", "QuestionMark.png") },
  { id: "social", label: "Social", hint: "Group viability and shared value.", icon: wowPackUrl("Miscellaneous", "Tournaments_banner_Human.png") },
  { id: "strange", label: "Off-meta", hint: "Unusual but still hardcore sane.", icon: wowPackUrl("Spells", "ShadowMeld.png") },
  { id: "no_pet", label: "No pet classes", hint: "Avoid pet-centric gameplay.", icon: wowPackUrl("Abilities", "AspectOfTheMonkey.png") },
  { id: "surprise", label: "Surprise me", hint: "Bias for novelty within guardrails.", icon: wowPackUrl("Miscellaneous", "Dice_02.png") },
] as const;

export function DeathNextSignalStep() {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState<string | null>(sessionStorage.getItem(SessionKeys.death.mood));
  const [selected, setSelected] = useState<string | null>(sessionStorage.getItem(SessionKeys.death.nextSignal));

  useEffect(() => {
    // Entering a new rerun intent should not silently reuse old build filters.
    sessionStorage.removeItem(SessionKeys.death.buildIntent);
    sessionStorage.removeItem(SessionKeys.death.buildIntentDepth);
    sessionStorage.removeItem(SessionKeys.death.buildIntentPowerCurve);
    sessionStorage.removeItem(SessionKeys.death.generatedDestiny);
    sessionStorage.removeItem(SessionKeys.death.destinyId);
  }, []);

  return (
    <div className="card">
      <p className="step-label">Release spirit · step 1 of 2</p>
      <h1 className="hero-question">What should the next run optimize for?</h1>
      <p className="hero-sub">Set mood and one priority, then generate.</p>
      <div className="flow-nav flow-nav--wrap" style={{ marginBottom: 10 }}>
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={selectedMood === m.id ? "btn-primary" : "btn-ghost"}
            onClick={() => {
              setSelectedMood(m.id);
              sessionStorage.setItem(SessionKeys.death.mood, m.id);
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="ritual-option-grid">
        {SIGNALS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ritual-option ${selected === s.id ? "ritual-option--on" : ""}`}
            onClick={() => {
              setSelected(s.id);
              sessionStorage.setItem(SessionKeys.death.nextSignal, s.id);
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
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
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
            navigate("/");
          }}
        >
          Back
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            if (!selected) {
              setSelected("surprise");
              sessionStorage.setItem(SessionKeys.death.nextSignal, "surprise");
            }
            navigate("/release-spirit/detail");
          }}
        >
          Add optional details
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (!selectedMood) {
              setSelectedMood("just_generate");
              sessionStorage.setItem(SessionKeys.death.mood, "just_generate");
            }
            if (!selected) {
              setSelected("surprise");
              sessionStorage.setItem(SessionKeys.death.nextSignal, "surprise");
            }
            navigate("/release-spirit/journey");
          }}
        >
          Generate build
        </button>
      </div>
    </div>
  );
}
