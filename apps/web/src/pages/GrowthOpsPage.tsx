import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type GrowthHealth = {
  experimentsRunning: number;
  variantsTotal: number;
  recentDecisions: Array<{
    variantId: string;
    action: "promote" | "hold" | "retire";
    reason: string;
    createdAt: string;
  }>;
};

export function GrowthOpsPage() {
  const [health, setHealth] = useState<GrowthHealth | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    void fetch("/api/v1/growth/health")
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        const data = (await response.json()) as GrowthHealth;
        setHealth(data);
      })
      .catch(() => setError("Could not load growth health."));
  }, []);

  return (
    <div className="card">
      <p className="step-label">Ops</p>
      <h1 className="hero-question">Autonomous growth health</h1>
      <p className="hero-sub">Single-operator status for variant lifecycle automation.</p>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {health ? (
        <>
          <p style={{ marginBottom: 4 }}>Running experiments: {health.experimentsRunning}</p>
          <p style={{ marginTop: 0 }}>Tracked variants: {health.variantsTotal}</p>
          <div style={{ marginTop: 12 }}>
            {health.recentDecisions.map((decision) => (
              <div key={`${decision.variantId}-${decision.createdAt}`} style={{ marginBottom: 8, padding: 8, border: "1px solid var(--line)", borderRadius: 8 }}>
                <div style={{ fontSize: 12 }}>{decision.variantId}</div>
                <strong>{decision.action}</strong> - {decision.reason}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p>Loading...</p>
      )}
      <Link to="/" className="btn-ghost" style={{ display: "inline-flex", marginTop: 12 }}>
        Back home
      </Link>
    </div>
  );
}
