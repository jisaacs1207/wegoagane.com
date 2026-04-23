import { useParams, Link } from "react-router-dom";

export function SharePlaceholderPage() {
  const { runId } = useParams();

  return (
    <div className="card">
      <p className="step-label">Share</p>
      <h1 className="hero-question">Share cards</h1>
      <p className="hero-sub">
        Run id: <strong>{runId}</strong> — Cloudflare Browser Rendering + R2 + OG tags ship in milestone M11. This
        route exists so routing and Pages SPA fallback can be tested on your domain today.
      </p>
      <Link to="/" className="btn-ghost" style={{ display: "inline-flex", marginTop: 16 }}>
        ← Home
      </Link>
    </div>
  );
}
