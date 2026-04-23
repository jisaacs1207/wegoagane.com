import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { DestinyCard } from "../components/cards/DestinyCard";
import { destinyFixture, type DestinyFixture } from "../content/cardFixtures";
import { fetchDestiny } from "../lib/recommendClient";
import { buildMemoryHints } from "../lib/memoryProfile";

export function LuckyRollPage() {
  const [destiny, setDestiny] = useState<DestinyFixture>(destinyFixture);

  useEffect(() => {
    void fetchDestiny({
      entryPath: "lucky_roll",
      signals: { nextSignal: "Surprise me", memoryHints: buildMemoryHints() },
    })
      .then((result) => setDestiny(result.output))
      .catch(() => setDestiny(destinyFixture));
  }, []);

  return (
    <div className="card">
      <p className="step-label">Lucky roll</p>
      <h1 className="hero-question">Your roll</h1>
      <p className="hero-sub">
        Weighted Destiny from the deterministic ranker + archetype fixtures. Falls back to local fixture when API is
        unavailable.
      </p>
      <DestinyCard data={destiny} />
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
