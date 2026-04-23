import { Link } from "react-router-dom";
import { destinyFixture, memorialFixture } from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import { MemorialCard } from "../../components/cards/MemorialCard";

export function DeathResultStep() {
  return (
    <div>
      <MemorialCard data={memorialFixture} />
      <div style={{ marginTop: 14 }}>
        <DestinyCard data={destinyFixture} />
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)", lineHeight: 1.45 }}>
          Memorial and next destiny can export as one image for sharing. See a{" "}
          <strong>narrow side-by-side layout</strong> on{" "}
          <Link to="/design/cards">card shells</Link> — polish, imagery, and real copy ship in later milestones.
        </p>
        <div className="flow-nav" style={{ marginTop: 18 }}>
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
