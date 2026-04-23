import { Link } from "react-router-dom";
import { planningDestinyFixture } from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";

export function PlanResultStep() {
  return (
    <div>
      <DestinyCard data={planningDestinyFixture} />
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
