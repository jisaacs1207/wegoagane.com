import { useId, type CSSProperties } from "react";
import type { DestinyFixture } from "../../content/cardFixtures";
import {
  CLASS_ASSET_URLS,
  FACTION_ASSET_URLS,
  RACE_ASSET_URLS,
  formatRaceLabel,
  inferFactionFromRace,
  inferRaceFromHeadline,
} from "../../content/identityAssets";
import { IdentityPortrait } from "../IdentityPortrait";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { signalSummaryLabels } from "../intent/intentOptions";

type Props = {
  data: DestinyFixture;
  compact?: boolean;
  /** When set, shows journey chips under the headline so picks read alongside the card. */
  intentSignals?: BuildIntentSignals | null;
};

export function DestinyCard({ data, compact, intentSignals }: Props) {
  const headlineId = useId();
  const raceLabel = data.raceSuggestion ?? formatRaceLabel(inferRaceFromHeadline(data.headline));
  const raceId = inferRaceFromHeadline(raceLabel);
  const faction = data.factionSuggestion ?? inferFactionFromRace(raceId);
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
            <IdentityPortrait
              src={CLASS_ASSET_URLS[data.classId]}
              alt=""
              className="destiny-card__title-class-icon"
              title={`Class: ${data.classId}`}
            />
            <h2 id={headlineId}>{data.headline}</h2>
            {data.isExperimental ? (
              <span className="destiny-card__intent-chip" title="Experimental candidate used in normal cycles">
                Experimental
              </span>
            ) : null}
          </div>
          <p>{data.subline}</p>
          <div className="destiny-card__identity-band">
            <div className="destiny-card__class-ring" title={`Class: ${data.classId}`}>
              <IdentityPortrait
                src={CLASS_ASSET_URLS[data.classId]}
                alt={`${data.classId} class`}
                className="destiny-card__class-ring-img"
              />
            </div>
            <div className="destiny-card__race-faction">
              <IdentityPortrait
                src={RACE_ASSET_URLS[raceId]}
                alt={`${formatRaceLabel(raceId)}`}
                className="destiny-card__race-portrait"
                title={formatRaceLabel(raceId)}
              />
              <div className="destiny-card__race-faction-text">
                <span className="destiny-card__race-line">{raceLabel}</span>
                <span className={`destiny-card__faction-pill destiny-card__faction-pill--${faction}`}>
                  <IdentityPortrait
                    src={FACTION_ASSET_URLS[faction]}
                    alt={`${faction} banner`}
                    className="destiny-card__faction-icon"
                  />
                  {faction === "horde" ? "Horde" : faction === "alliance" ? "Alliance" : "Neutral"}
                </span>
              </div>
            </div>
          </div>
          {intentSignals && signalSummaryLabels(intentSignals).length > 0 ? (
            <div className="destiny-card__intent-wrap">
              <div className="destiny-card__intent-chips">
                {signalSummaryLabels(intentSignals).map((label) => (
                  <span key={label} className="destiny-card__intent-chip">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
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
