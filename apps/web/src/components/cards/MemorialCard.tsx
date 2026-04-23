import { useId } from "react";
import type { MemorialFixture } from "../../content/cardFixtures";
import { MemorialMarkIcon } from "../../icons/MemorialMarkIcon";

type Props = {
  data: MemorialFixture;
  /** Tighter padding for share combo column */
  compact?: boolean;
};

const factionLabel: Record<MemorialFixture["faction"], string> = {
  horde: "Horde",
  alliance: "Alliance",
  neutral: "Neutral",
};

export function MemorialCard({ data, compact }: Props) {
  const epitaphId = useId();
  const fc = `memorial-card__faction memorial-card__faction--${data.faction}`;

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
