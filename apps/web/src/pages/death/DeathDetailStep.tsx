import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { SessionKeys } from "../../lib/sessionKeys";

export function DeathDetailStep() {
  const navigate = useNavigate();
  const [zone, setZone] = useState(sessionStorage.getItem(SessionKeys.death.detailZone) ?? "");
  const [cause, setCause] = useState(sessionStorage.getItem(SessionKeys.death.detailCause) ?? "");
  const [level, setLevel] = useState(sessionStorage.getItem(SessionKeys.death.detailLevel) ?? "");
  const [note, setNote] = useState(sessionStorage.getItem(SessionKeys.death.detailNote) ?? "");

  return (
    <div className="card">
      <div className="flow-crumbs" aria-label="Flow navigation">
        <span className="flow-crumb">
          <Link to="/">Home</Link>
        </span>
        <span className="flow-crumb">/</span>
        <span className="flow-crumb">
          <Link to="/release-spirit/next">Death setup</Link>
        </span>
        <span className="flow-crumb">/</span>
        <span className="flow-crumb">Optional details</span>
      </div>
      <p className="step-label">Release spirit · optional details</p>
      <h1 className="hero-question">Add optional context</h1>
      <p className="hero-sub">Add quick details from the death to fine-tune your next recommendation.</p>
      <div className="ritual-detail-grid">
        <input
          value={zone}
          onChange={(e) => {
            const next = e.target.value.slice(0, 60);
            setZone(next);
            sessionStorage.setItem(SessionKeys.death.detailZone, next);
          }}
          placeholder="Zone (optional)"
        />
        <input
          value={cause}
          onChange={(e) => {
            const next = e.target.value.slice(0, 80);
            setCause(next);
            sessionStorage.setItem(SessionKeys.death.detailCause, next);
          }}
          placeholder="Cause (optional)"
        />
        <input
          value={level}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
            setLevel(next);
            sessionStorage.setItem(SessionKeys.death.detailLevel, next);
          }}
          placeholder="Level (optional)"
        />
        <textarea
          value={note}
          onChange={(e) => {
            const next = e.target.value.slice(0, 120);
            setNote(next);
            sessionStorage.setItem(SessionKeys.death.detailNote, next);
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
            sessionStorage.removeItem(SessionKeys.death.detailZone);
            sessionStorage.removeItem(SessionKeys.death.detailCause);
            sessionStorage.removeItem(SessionKeys.death.detailLevel);
            sessionStorage.removeItem(SessionKeys.death.detailNote);
            sessionStorage.removeItem(SessionKeys.death.buildIntent);
            sessionStorage.removeItem(SessionKeys.death.buildIntentDepth);
            sessionStorage.removeItem(SessionKeys.death.buildIntentPowerCurve);
            sessionStorage.removeItem(SessionKeys.death.generatedDestiny);
            sessionStorage.removeItem(SessionKeys.death.destinyId);
            navigate("/release-spirit/next");
          }}
        >
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate("/release-spirit/journey")}>
          Generate build
        </button>
      </div>
    </div>
  );
}
