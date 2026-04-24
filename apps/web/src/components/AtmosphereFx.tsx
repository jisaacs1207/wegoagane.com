import type { CSSProperties } from "react";
const SPARKS = [
  { x: 6, y: 14, d: 0.2, s: 1.2 },
  { x: 18, y: 26, d: 0.8, s: 1.1 },
  { x: 34, y: 10, d: 1.4, s: 1.4 },
  { x: 48, y: 34, d: 0.4, s: 1.3 },
  { x: 62, y: 16, d: 1.2, s: 1.5 },
  { x: 74, y: 28, d: 0.9, s: 1.2 },
  { x: 86, y: 8, d: 1.7, s: 1.1 },
  { x: 12, y: 66, d: 1.1, s: 1.3 },
  { x: 28, y: 78, d: 0.5, s: 1.2 },
  { x: 44, y: 58, d: 1.8, s: 1.4 },
  { x: 58, y: 74, d: 0.6, s: 1.3 },
  { x: 72, y: 62, d: 1.5, s: 1.5 },
];

export function AtmosphereFx() {
  return (
    <div className="atmo-layer" aria-hidden="true">
      <div className="atmo-vignette" />
      <div className="atmo-glow atmo-glow--gold" />
      <div className="atmo-glow atmo-glow--blue" />
      {SPARKS.map((spark, index) => (
        <span
          key={`${spark.x}-${spark.y}-${index}`}
          className="atmo-spark"
          style={
            {
              "--spark-x": `${spark.x}%`,
              "--spark-y": `${spark.y}%`,
              "--spark-delay": `${spark.d}s`,
              "--spark-scale": spark.s,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

