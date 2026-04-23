import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div>
      <div className="card">
        <p className="step-label">What brings you here?</p>
        <h1 className="hero-question">Choose a path</h1>
        <p className="hero-sub">Each route is skippable where it matters — this is a living build.</p>
        <div className="entry-grid">
          <Link to="/release-spirit/mood" className="entry-btn">
            <span className="entry-btn-title">Release Spirit</span>
            <span className="entry-btn-desc">I just died — memorial + next Destiny</span>
          </Link>
          <Link to="/draft-a-run/intent" className="entry-btn">
            <span className="entry-btn-title">Draft a Run</span>
            <span className="entry-btn-desc">I&apos;m planning — next Destiny only</span>
          </Link>
          <Link to="/lucky-roll" className="entry-btn">
            <span className="entry-btn-title">Lucky Roll</span>
            <span className="entry-btn-desc">Surprise me with a full Destiny card</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
