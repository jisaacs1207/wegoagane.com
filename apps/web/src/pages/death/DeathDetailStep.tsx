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
      <h1 className="hero-question">Add optional context</h1>
      <p className="hero-sub">Add quick details from the death to fine-tune your next recommendation.</p>
      <div className="ritual-detail-grid">
        <input
          value={zone}
          onChange={(e) => {
            const next = e.target.value.slice(0, 60);
            setZone(next);
            sessionStorage.setItem("death.detail.zone", next);
          }}
          placeholder="Zone (optional)"
        />
        <input
          value={cause}
          onChange={(e) => {
            const next = e.target.value.slice(0, 80);
            setCause(next);
            sessionStorage.setItem("death.detail.cause", next);
          }}
          placeholder="Cause (optional)"
        />
        <input
          value={level}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
            setLevel(next);
            sessionStorage.setItem("death.detail.level", next);
          }}
          placeholder="Level (optional)"
        />
        <textarea
          value={note}
          onChange={(e) => {
            const next = e.target.value.slice(0, 120);
            setNote(next);
            sessionStorage.setItem("death.detail.note", next);
          }}
          placeholder="Anything we should avoid or prioritize next time? (optional)"
          rows={3}
        />
      </div>
      <div className="flow-nav">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            sessionStorage.removeItem("death.detail.zone");
            sessionStorage.removeItem("death.detail.cause");
            sessionStorage.removeItem("death.detail.level");
            sessionStorage.removeItem("death.detail.note");
            sessionStorage.removeItem("death.buildIntent");
            sessionStorage.removeItem("death.buildIntent.depth");
            sessionStorage.removeItem("death.buildIntent.powerCurve");
            sessionStorage.removeItem("death.generatedDestiny");
            sessionStorage.removeItem("death.destinyId");
            navigate("/release-spirit/next");
          }}
        >
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate("/release-spirit/journey")}>
          Continue
        </button>
      </div>
    </div>
  );
}
