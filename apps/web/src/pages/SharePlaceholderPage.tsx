import { useParams, Link } from "react-router-dom";
import { destinyFixture, memorialFixture } from "../content/cardFixtures";
import { ShareComboLayout } from "../components/cards/ShareComboLayout";

export function SharePlaceholderPage() {
  const { runId } = useParams();

  return (
    <div>
      <div className="card">
        <p className="step-label">Share</p>
        <h1 className="hero-question">Run preview</h1>
        <p className="hero-sub">
          Run id <strong>{runId}</strong> — static M2 shells below. Open Graph, R2 images, and Browser Rendering ship in{" "}
          <strong>M11</strong>.
        </p>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <ShareComboLayout memorial={memorialFixture} destiny={destinyFixture} />
      </div>
      <Link to="/" className="btn-ghost" style={{ display: "inline-flex", marginTop: 16 }}>
        ← Home
      </Link>
    </div>
  );
}
