import { useId } from "react";
import type { MemorialFixture } from "../../content/cardFixtures";
import { FACTION_ASSET_URLS, RACE_ASSET_URLS, inferRaceFromHeadline } from "../../content/identityAssets";
import type { ClassId } from "../../icons/types";
import { CLASS_ASSET_URLS } from "../../content/identityAssets";
import { IdentityPortrait } from "../IdentityPortrait";
import { MemorialMarkIcon } from "../../icons/MemorialMarkIcon";

type Props = {
  data: MemorialFixture;
  /** Tighter padding for share combo column */
  compact?: boolean;
  /** When shown beside a destiny, link class / race portraits into the memorial strip. */
  linkedClassId?: ClassId;
  linkedHeadline?: string;
};

const factionLabel: Record<MemorialFixture["faction"], string> = {
  horde: "Horde",
  alliance: "Alliance",
  neutral: "Neutral",
};

export function MemorialCard({ data, compact, linkedClassId, linkedHeadline }: Props) {
  const epitaphId = useId();
  const fc = `memorial-card__faction memorial-card__faction--${data.faction}`;
  const raceId = linkedHeadline ? inferRaceFromHeadline(linkedHeadline) : null;

  return (
    <article
      className="memorial-card"
      style={compact ? { padding: "14px 14px 26px" } : undefined}
      aria-labelledby={epitaphId}
    >
      <div className="memorial-card__meta">
        <span className="memorial-card__mark">
          <MemorialMarkIcon />
        </span>
        <span className={fc}>{factionLabel[data.faction]}</span>
      </div>
      <div className="memorial-card__portrait-row">
        <IdentityPortrait src={FACTION_ASSET_URLS[data.faction]} alt={`${data.faction} crest`} className="memorial-card__portrait" />
        {linkedClassId ? (
          <span className="memorial-card__class-crest" title={`${linkedClassId}`}>
            <IdentityPortrait
              src={CLASS_ASSET_URLS[linkedClassId]}
              alt={`${linkedClassId} class`}
              className="memorial-card__class-crest-img"
            />
          </span>
        ) : null}
        {raceId ? (
          <IdentityPortrait
            src={RACE_ASSET_URLS[raceId]}
            alt={`${raceId.replace("_", " ")} rune`}
            className="memorial-card__portrait"
          />
        ) : null}
      </div>
      <p className="memorial-card__facts">
        <strong>{data.characterName}</strong> · Level {data.level ?? "?"} · {data.location} · {data.cause}
      </p>
      <p id={epitaphId} className="memorial-card__epitaph">
        &ldquo;{data.epitaph}&rdquo;
      </p>
      <span className="card-watermark">wegoagane.com</span>
    </article>
  );
}
