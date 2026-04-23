import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function PlanFreeformStep() {
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  return (
    <div className="card">
      <p className="step-label">Draft a run · step 2 of 3</p>
      <h1 className="hero-question">Anything else?</h1>
      <p className="hero-sub">Optional — 80 characters max in production.</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 80))}
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
        <button type="button" className="btn-primary" onClick={() => navigate("/draft-a-run/result")}>
          Generate Destiny
        </button>
      </div>
    </div>
  );
}
