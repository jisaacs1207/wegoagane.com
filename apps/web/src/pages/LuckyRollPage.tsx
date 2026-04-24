import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { DestinyCard } from "../components/cards/DestinyCard";
import { destinyFixture, type DestinyFixture } from "../content/cardFixtures";
import { fetchDestiny, fetchGrowthAssignment, submitGrowthOutcome } from "../lib/recommendClient";
import { buildMemoryHints } from "../lib/memoryProfile";
import { BuildIntentChips } from "../components/BuildIntentChips";
import { readBuildIntent } from "../lib/readBuildIntent";

export function LuckyRollPage() {
  const [destiny, setDestiny] = useState<DestinyFixture>(destinyFixture);
  const [destinyId, setDestinyId] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = sessionStorage.getItem("lucky.sessionId") ?? crypto.randomUUID();
    sessionStorage.setItem("lucky.sessionId", sessionId);
    let assignmentId: string | null = null;
    let variantId: string | null = null;
    void fetchGrowthAssignment({ sessionId, surface: "recommendation", entryPath: "lucky_roll" })
      .then((assignment) => {
        assignmentId = assignment.assignmentId;
        variantId = assignment.variantId;
      })
      .catch(() => {});

    void fetchDestiny({
      entryPath: "lucky_roll",
      sessionId,
      signals: {
        nextSignal: "Surprise me",
        memoryHints: buildMemoryHints(),
        recommendVariantId: variantId ?? undefined,
        ...readBuildIntent("lucky.buildIntent"),
      },
    })
      .then((result) => {
        setDestiny(result.output);
        setDestinyId(result.destinyId);
        if (assignmentId) {
          void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "recommend_rendered", destinyId: result.destinyId } }).catch(() => {});
        }
      })
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
      <BuildIntentChips storageKey="lucky.buildIntent" />
      <DestinyCard data={destiny} />
      <div className="flow-nav" style={{ marginTop: 20 }}>
        <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
          Home
        </Link>
        {destinyId ? (
          <Link to={`/build/${destinyId}`} className="btn-ghost" style={{ textDecoration: "none" }}>
            Open HC build sheet
          </Link>
        ) : null}
        <Link to="/share/demo-roll" className="btn-primary" style={{ textDecoration: "none" }}>
          Preview share route
        </Link>
      </div>
    </div>
  );
}
