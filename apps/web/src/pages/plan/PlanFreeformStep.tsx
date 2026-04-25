import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { IdentityPortrait } from "../../components/IdentityPortrait";
import { wowPackUrl } from "../../content/identityAssets";
import { SessionKeys } from "../../lib/sessionKeys";

export function PlanFreeformStep() {
  const navigate = useNavigate();
  const [note, setNote] = useState(sessionStorage.getItem(SessionKeys.plan.freeform) ?? "");

  return (
    <div className="card">
      <p className="step-label">Draft a run · optional constraints view</p>
      <h1 className="hero-question">Add constraints (optional)</h1>
      <p className="hero-sub">Add dealbreakers or must-haves so the result is usable right away.</p>
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
          sessionStorage.setItem(SessionKeys.plan.freeform, next);
        }}
        rows={3}
        placeholder="e.g. no pet micromanagement, no mage, prefer strong solo sustain"
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
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            sessionStorage.removeItem(SessionKeys.plan.freeform);
            sessionStorage.removeItem(SessionKeys.plan.buildIntent);
            sessionStorage.removeItem(SessionKeys.plan.buildIntentDepth);
            sessionStorage.removeItem(SessionKeys.plan.buildIntentPowerCurve);
            sessionStorage.removeItem(SessionKeys.plan.generatedDestiny);
            sessionStorage.removeItem(SessionKeys.plan.destinyId);
            navigate("/draft-a-run/intent");
          }}
        >
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate("/draft-a-run/journey")}>
          Continue
        </button>
      </div>
    </div>
  );
}
