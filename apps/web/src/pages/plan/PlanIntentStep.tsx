import { useNavigate } from "react-router-dom";
import { useState } from "react";

const INTENTS = [
  "Safest path to 60",
  "Something new",
  "Profession-first",
  "Social / group value",
  "Solo comfort",
  "Fast and aggressive",
  "Just fun",
] as const;

export function PlanIntentStep() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="card">
      <p className="step-label">Draft a run · step 1 of 3</p>
      <h1 className="hero-question">Intent</h1>
      <p className="hero-sub">Pick what matters — constraints come next in a later slice.</p>
      <div className="chip-row">
        {INTENTS.map((i) => (
          <button
            key={i}
            type="button"
            className={`chip ${selected === i ? "chip-selected" : ""}`}
            onClick={() => setSelected(i)}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flow-nav">
        <button type="button" className="btn-ghost" onClick={() => navigate("/")}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate("/draft-a-run/freeform")}>
          Continue
        </button>
      </div>
    </div>
  );
}
