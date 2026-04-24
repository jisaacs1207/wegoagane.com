import { useId, type CSSProperties } from "react";
import type { DestinyFixture } from "../../content/cardFixtures";
import {
  CLASS_ASSET_URLS,
  FACTION_ASSET_URLS,
  RACE_ASSET_URLS,
  inferFactionFromRace,
  inferRaceFromHeadline,
} from "../../content/identityAssets";
import { IdentityPortrait } from "../IdentityPortrait";
import { ClassIcon } from "../../icons/ClassIcon";

type Props = {
  data: DestinyFixture;
  compact?: boolean;
};

const CLASS_FANTASY_LABEL: Record<DestinyFixture["classId"], string> = {
  warrior: "Steel Vanguard",
  mage: "Arcane Keeper",
  rogue: "Shadow Agent",
  priest: "Sacred Anchor",
  hunter: "Wild Pathfinder",
  warlock: "Fel Strategist",
  druid: "Warden of Nature",
  paladin: "Lightbound Sentinel",
  shaman: "Stormbound Caller",
};

export function DestinyCard({ data, compact }: Props) {
  const headlineId = useId();
  const raceId = inferRaceFromHeadline(data.headline);
  const faction = inferFactionFromRace(raceId);
  const stripeStyle = {
    "--destiny-class": `var(--${data.classId})`,
  } as CSSProperties;

  return (
    <article
      className="destiny-card"
      style={
        compact
          ? { padding: "14px 14px 26px" }
          : { paddingBottom: 28 }
      }
      aria-labelledby={headlineId}
    >
      <div className="destiny-card__head">
        <div className="destiny-card__stripe" style={stripeStyle} />
        <div className="destiny-card__titles" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ClassIcon classId={data.classId} />
            <h2 id={headlineId}>{data.headline}</h2>
          </div>
          <p>{data.subline}</p>
          <div className="destiny-card__portrait-row">
            <IdentityPortrait
              src={CLASS_ASSET_URLS[data.classId]}
              alt={`${data.classId} crest`}
              className="destiny-card__portrait"
            />
            <IdentityPortrait
              src={RACE_ASSET_URLS[raceId]}
              alt={`${raceId.replace("_", " ")} crest`}
              className="destiny-card__portrait"
            />
            <IdentityPortrait src={FACTION_ASSET_URLS[faction]} alt={`${faction} banner`} className="destiny-card__portrait" />
          </div>
          <div className="destiny-card__identity-row">
            <span className={`destiny-card__class-tag destiny-card__class-tag--${data.classId}`}>
              {CLASS_FANTASY_LABEL[data.classId]}
            </span>
            <span className="destiny-card__identity-chip">Classic-era pacing</span>
            <span className="destiny-card__identity-chip">Hardcore survival lane</span>
          </div>
        </div>
      </div>
      <p className="destiny-card__tier">{data.tierProse}</p>
      <ul className="destiny-card__bullets">
        {data.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <span className="card-watermark">wegoagane.com</span>
    </article>
  );
}
