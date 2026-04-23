import { z } from "zod";
import { archetypes, classFactionMap } from "./archetypes";
import type { DestinyOutput, RecommendInput } from "./types";

const classValues = [
  "mage",
  "hunter",
  "warrior",
  "warlock",
  "priest",
  "rogue",
  "druid",
  "paladin",
  "shaman",
] as const;

const factionValues = ["horde", "alliance"] as const;
const entryPathValues = ["release_spirit", "draft_a_run", "lucky_roll"] as const;

export const recommendInputSchema = z.object({
  sessionId: z.string().min(1).max(80).optional(),
  entryPath: z.enum(entryPathValues),
  signals: z.object({
    mood: z.string().max(80).optional(),
    nextSignal: z.string().max(80).optional(),
    intent: z.string().max(120).optional(),
    freeform: z.string().max(240).optional(),
    factionPreference: z.enum(factionValues).optional(),
    excludedClasses: z.array(z.enum(classValues)).max(6).optional(),
  }),
});

export function validateRecommendInput(payload: unknown): RecommendInput {
  return recommendInputSchema.parse(payload);
}

export function validateTemplateOutput(
  output: DestinyOutput,
  factionPreference?: "horde" | "alliance",
): string[] {
  const failures: string[] = [];

  if (!output.headline || output.headline.length > 120) failures.push("invalid_headline");
  if (output.bullets.length < 3 || output.bullets.length > 6) failures.push("invalid_bullet_count");

  const classFaction = classFactionMap[output.classId];
  if (!classFaction) failures.push("unknown_class");
  if (classFaction && classFaction !== "either" && factionPreference && classFaction !== factionPreference) {
    failures.push("invalid_class_faction_combo");
  }

  const source = archetypes.find((a) => output.headline.toLowerCase().includes(a.classId));
  if (!source && output.rationale.length < 12) failures.push("thin_rationale");

  return failures;
}
