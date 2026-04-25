import { Link } from "react-router-dom";
import {
  destinyFixture,
  memorialFixture,
  planningDestinyFixture,
} from "../content/cardFixtures";
import { DestinyCard } from "../components/cards/DestinyCard";
import { MemorialCard } from "../components/cards/MemorialCard";
import { ShareComboLayout } from "../components/cards/ShareComboLayout";
import { CLASS_ASSET_URLS, WOW_ICON_PACK_BASE } from "../content/identityAssets";
import { IdentityPortrait } from "../components/IdentityPortrait";
import { ClassIcon } from "../icons/ClassIcon";
import { CLASS_IDS } from "../icons/types";

/** M2 design QA — all class glyphs + card shells with fixtures */
export function DesignCardsPage() {
  return (
    <div>
      <p className="step-label">M2 · design QA</p>
      <h1 className="hero-question">Card shells & icons</h1>
      <p className="hero-sub">
        Reference layouts: vector class glyphs (§14.4), vendored class crests from <code>{WOW_ICON_PACK_BASE}</code>, memorial warmth, destiny stripe, and memorial+destiny share combo (§15.1).
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        <p className="step-label">Class · vector glyphs</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 16px", alignItems: "center" }}>
          {CLASS_IDS.map((id) => (
            <span key={id} className="ui-caption" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ClassIcon classId={id} />
              {id}
            </span>
          ))}
        </div>
        <p className="step-label" style={{ marginTop: 16 }}>
          Class · texture pack
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {CLASS_IDS.map((id) => (
            <span key={`tex-${id}`} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <IdentityPortrait src={CLASS_ASSET_URLS[id]} alt="" className="design-cards-class-tex" title={id} />
              <span className="ui-caption ui-caption--xs">{id}</span>
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
