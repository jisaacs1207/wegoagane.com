import { Link } from "react-router-dom";
import {
  destinyFixture,
  memorialFixture,
  planningDestinyFixture,
} from "../content/cardFixtures";
import { DestinyCard } from "../components/cards/DestinyCard";
import { MemorialCard } from "../components/cards/MemorialCard";
import { ShareComboLayout } from "../components/cards/ShareComboLayout";
import { ClassIcon } from "../icons/ClassIcon";
import { CLASS_IDS } from "../icons/types";

/** M2 design QA — all class glyphs + card shells with fixtures */
export function DesignCardsPage() {
  return (
    <div>
      <p className="step-label">M2 · design QA</p>
      <h1 className="hero-question">Card shells & icons</h1>
      <p className="hero-sub">Original SVG glyphs (§14.4) and static fixtures. Not shipped to casual visitors — link from handbook / dev only.</p>

      <div className="card" style={{ marginTop: 20 }}>
        <p className="step-label">Class icons</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 16px", alignItems: "center" }}>
          {CLASS_IDS.map((id) => (
            <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ts)", fontSize: 12 }}>
              <ClassIcon classId={id} />
              {id}
            </span>
          ))}
        </div>
      </div>

      <div className="design-cards-grid" style={{ marginTop: 20 }}>
        <MemorialCard data={memorialFixture} />
        <DestinyCard data={destinyFixture} />
      </div>

      <div style={{ marginTop: 20 }}>
        <DestinyCard data={planningDestinyFixture} />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <ShareComboLayout memorial={memorialFixture} destiny={destinyFixture} />
      </div>

      <div className="flow-nav" style={{ marginTop: 24 }}>
        <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
          ← Home
        </Link>
      </div>
    </div>
  );
}
