import { Link } from "react-router-dom";

export function LuckyRollPage() {
  return (
    <div className="card">
      <p className="step-label">Lucky roll</p>
      <h1 className="hero-question">Your roll</h1>
      <p className="hero-sub">
        Weighted random Destiny (deterministic ranker + archetypes) will live here. For now, enjoy a fixed stub
        card.
      </p>
      <div className="destiny-preview">
        <h3>Human Discipline Priest · Off the beaten path</h3>
        <p>Wand rhythm, Spirit Tap, and dungeon etiquette — data-backed checklist later.</p>
      </div>
      <div className="flow-nav" style={{ marginTop: 20 }}>
        <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
          Home
        </Link>
        <Link to="/share/demo-roll" className="btn-primary" style={{ textDecoration: "none" }}>
          Preview share route
        </Link>
      </div>
    </div>
  );
}
