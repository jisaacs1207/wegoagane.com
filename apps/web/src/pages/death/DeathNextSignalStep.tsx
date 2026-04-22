import { useNavigate } from "react-router-dom";
import { useState } from "react";

const SIGNALS = ["Safer", "Faster", "Different", "Social", "Strange", "No pet class", "Surprise me"] as const;

export function DeathNextSignalStep() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="card">
      <p className="step-label">Release spirit · step 2 of 4</p>
      <h1 className="hero-question">What do you want next?</h1>
      <p className="hero-sub">One practical signal for the reroll engine (stub).</p>
      <div className="chip-row">
        {SIGNALS.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip ${selected === s ? "chip-selected" : ""}`}
            onClick={() => setSelected(s)}
          >
            {s}
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
