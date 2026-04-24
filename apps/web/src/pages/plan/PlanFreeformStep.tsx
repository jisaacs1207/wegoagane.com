import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";

export function PlanFreeformStep() {
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  return (
    <div className="card">
      <p className="step-label">Draft a run · step 2 of 3</p>
      <h1 className="hero-question">Add constraints (optional)</h1>
      <p className="hero-sub">Call out dealbreakers or hard preferences so the result is immediately usable.</p>
      <div className="ritual-constraint-row">
        <span className="ritual-constraint-chip">
          <IdentityPortrait src={wowPackUrl("Trade", "herbalism.png")} alt="" className="ritual-option__icon" />
          Profession bias
        </span>
        <span className="ritual-constraint-chip">
          <IdentityPortrait src={wowPackUrl("Abilities", "AimedShot.png")} alt="" className="ritual-option__icon" />
          Combat style
        </span>
        <span className="ritual-constraint-chip">
          <IdentityPortrait src={wowPackUrl("Spells", "Slow.png")} alt="" className="ritual-option__icon" />
          Pace / safety
        </span>
      </div>
      <textarea
        value={note}
        onChange={(e) => {
          const next = e.target.value.slice(0, 80);
          setNote(next);
          sessionStorage.setItem("plan.freeform", next);
        }}
        rows={3}
        placeholder="e.g. hate pet management, already tried mage"
        style={{
          width: "100%",
          marginTop: 12,
          padding: 12,
          borderRadius: "var(--radius-btn)",
          border: "1px solid var(--bm)",
          background: "var(--s3)",
          color: "var(--tp)",
          fontFamily: "inherit",
          fontSize: 14,
          resize: "vertical",
        }}
      />
      <div className="flow-nav">
        <button type="button" className="btn-ghost" onClick={() => navigate("/draft-a-run/intent")}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate("/draft-a-run/journey")}>
          Continue
        </button>
      </div>
    </div>
  );
}
