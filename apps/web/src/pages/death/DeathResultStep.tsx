import { Link } from "react-router-dom";

export function DeathResultStep() {
  return (
    <div>
      <div className="card">
        <p className="step-label">Memorial · stub</p>
        <h1 className="hero-question" style={{ fontStyle: "italic", fontWeight: 600 }}>
          &ldquo;They pulled once too often.&rdquo;
        </h1>
        <p className="hero-sub">Level 47 · Stranglethorn · patrol (placeholder)</p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)" }}>
          Real epitaphs and post-mortem copy will come from the memorial pipeline + validator.
        </p>
      </div>
      <div className="card">
        <p className="step-label">Destiny · stub</p>
        <div className="destiny-preview">
          <h3>Orc Frost Mage · Safe path</h3>
          <p>First 10 Levels checklist, talents, and share card — wired in later milestones.</p>
        </div>
        <div className="flow-nav" style={{ marginTop: 20 }}>
          <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
            Home
          </Link>
          <button type="button" className="btn-primary" disabled title="Rating gate + share in a later milestone">
            Accept this fate (soon)
          </button>
        </div>
      </div>
    </div>
  );
}
