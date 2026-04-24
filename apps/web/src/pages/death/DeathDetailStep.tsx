import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function DeathDetailStep() {
  const navigate = useNavigate();
  const [zone, setZone] = useState(sessionStorage.getItem("death.detail.zone") ?? "");
  const [cause, setCause] = useState(sessionStorage.getItem("death.detail.cause") ?? "");
  const [level, setLevel] = useState(sessionStorage.getItem("death.detail.level") ?? "");
  const [note, setNote] = useState(sessionStorage.getItem("death.detail.note") ?? "");

  return (
    <div className="card">
      <p className="step-label">Release spirit · step 3 of 4</p>
      <h1 className="hero-question">Optional details</h1>
      <p className="hero-sub">Add context from the death. We fold this into the next recommendation tone.</p>
      <div className="ritual-detail-grid">
        <input
          value={zone}
          onChange={(e) => {
            setZone(e.target.value);
            sessionStorage.setItem("death.detail.zone", e.target.value);
          }}
          placeholder="Zone (optional)"
        />
        <input
          value={cause}
          onChange={(e) => {
            setCause(e.target.value);
            sessionStorage.setItem("death.detail.cause", e.target.value);
          }}
          placeholder="Cause (optional)"
        />
        <input
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            sessionStorage.setItem("death.detail.level", e.target.value);
          }}
          placeholder="Level (optional)"
        />
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            sessionStorage.setItem("death.detail.note", e.target.value);
          }}
          placeholder="Short note to shape the reroll tone (optional)"
          rows={3}
        />
      </div>
      <div className="flow-nav">
        <button type="button" className="btn-ghost" onClick={() => navigate("/release-spirit/next")}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate("/release-spirit/journey")}>
          Continue
        </button>
      </div>
    </div>
  );
}
