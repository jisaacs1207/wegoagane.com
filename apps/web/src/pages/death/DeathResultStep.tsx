import { Link } from "react-router-dom";
import { destinyFixture, memorialFixture } from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import { MemorialCard } from "../../components/cards/MemorialCard";
import { ShareComboLayout } from "../../components/cards/ShareComboLayout";

export function DeathResultStep() {
  return (
    <div>
      <MemorialCard data={memorialFixture} />
      <DestinyCard data={destinyFixture} />
      <div className="card">
        <ShareComboLayout memorial={memorialFixture} destiny={destinyFixture} />
        <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--ts)" }}>
          Combo layout is the default death-flow share artifact (handbook §15.1). Image export + OG land in M11.
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
