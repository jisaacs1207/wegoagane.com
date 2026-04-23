import { useId, type CSSProperties } from "react";
import type { DestinyFixture } from "../../content/cardFixtures";
import { ClassIcon } from "../../icons/ClassIcon";

type Props = {
  data: DestinyFixture;
  compact?: boolean;
};

export function DestinyCard({ data, compact }: Props) {
  const headlineId = useId();
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
