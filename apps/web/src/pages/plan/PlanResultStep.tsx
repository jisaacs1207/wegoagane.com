import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { planningDestinyFixture, type DestinyFixture } from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import { fetchDestiny } from "../../lib/recommendClient";

export function PlanResultStep() {
  const [destiny, setDestiny] = useState<DestinyFixture>(planningDestinyFixture);

  useEffect(() => {
    const intent = sessionStorage.getItem("plan.intent") ?? undefined;
    const freeform = sessionStorage.getItem("plan.freeform") ?? undefined;

    void fetchDestiny({
      entryPath: "draft_a_run",
      signals: { intent, freeform },
    })
      .then(setDestiny)
      .catch(() => setDestiny(planningDestinyFixture));
  }, []);

  return (
    <div>
      <DestinyCard data={destiny} />
      <p style={{ marginTop: 14, fontSize: 13, color: "var(--ts)" }}>
        Planning mode skips memorial chrome — only the next Destiny card is shown here.
      </p>
      <div className="flow-nav" style={{ marginTop: 8 }}>
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
