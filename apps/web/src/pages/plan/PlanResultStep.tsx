import { Link } from "react-router-dom";

export function PlanResultStep() {
  return (
    <div className="card">
      <p className="step-label">Destiny · stub</p>
      <div className="destiny-preview">
        <h3>Tauren Enhancement Shaman · Safe path</h3>
        <p>No memorial in planning mode — refinement and share land in later milestones.</p>
      </div>
      <div className="flow-nav" style={{ marginTop: 20 }}>
        <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
          Home
        </Link>
        <button type="button" className="btn-primary" disabled>
          Accept this fate (soon)
        </button>
      </div>
    </div>
  );
}
