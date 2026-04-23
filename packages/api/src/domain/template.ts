import type { DestinyOutput, RankedArchetype } from "./types";

const tierLabel: Record<string, string> = {
  safe: "Safe path",
  off_beaten: "Off the beaten path",
  high_risk: "High risk, high story",
  just_fun: "Just fun",
};

export function renderTemplateDestiny(top: RankedArchetype): DestinyOutput {
  const { archetype, reasons } = top;
  const tier = tierLabel[archetype.tier] ?? "Suggested path";
  const rationale = [
    `${tier} because it aligns with your signals.`,
    `Safety mechanism: ${archetype.safetyMechanism}.`,
    reasons.slice(0, 3).join(", "),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline: archetype.title,
    subline: archetype.subline,
    classId: archetype.classId,
    tierProse: `${tier} · template`,
    bullets: archetype.first10.slice(0, 3),
    rationale,
    sourceType: "template",
  };
}
