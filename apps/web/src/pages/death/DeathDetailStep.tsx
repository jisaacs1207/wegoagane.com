import { useNavigate } from "react-router-dom";

export function DeathDetailStep() {
  const navigate = useNavigate();

  return (
    <div className="card">
      <p className="step-label">Release spirit · step 3 of 4</p>
      <h1 className="hero-question">Optional details</h1>
      <p className="hero-sub">
        Zone map, cause, level, class, short note — all coming. For now, tap continue to see a stub memorial +
        destiny layout.
      </p>
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
