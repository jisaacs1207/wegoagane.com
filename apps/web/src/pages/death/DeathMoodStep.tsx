import { useNavigate } from "react-router-dom";
import { useState } from "react";

const MOODS = ["My fault", "Bullshit death", "First time", "Long time coming", "Just generate"] as const;

export function DeathMoodStep() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="card">
      <p className="step-label">Release spirit · step 1 of 4</p>
      <h1 className="hero-question">What happened?</h1>
      <p className="hero-sub">Tap one — or skip ahead. Nothing here is required yet.</p>
      <div className="chip-row">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            className={`chip ${selected === m ? "chip-selected" : ""}`}
            onClick={() => {
              setSelected(m);
              sessionStorage.setItem("death.mood", m);
            }}
          >
            {m}
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
