import { z } from "zod";
import { archetypes, classFactionMap } from "./archetypes";
import type {
  DestinyFeedbackInput,
  DestinyOutput,
  MemorialInput,
  MemorialOutput,
  RecommendInput,
} from "./types";

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
    preferredClass: z.enum(classValues).optional(),
  }),
});

export const memorialInputSchema = z.object({
  sessionId: z.string().min(1).max(80).optional(),
  zone: z.string().min(1).max(120),
  cause: z.string().min(1).max(160),
  mood: z.string().max(80).optional(),
  nextSignal: z.string().max(80).optional(),
  faction: z.enum(factionValues).optional(),
  characterName: z.string().max(80).optional(),
  level: z.number().int().min(1).max(60).optional(),
});

export const destinyFeedbackInputSchema = z.object({
  sessionId: z.string().min(1).max(80),
  destinyId: z.string().min(1).max(80),
  choice: z.enum(["accept", "almost_right", "miss"]),
  stage: z.enum(["reroll_gate", "post_accept"]).optional(),
  rerollReason: z
    .enum(["wrong_class", "wrong_energy", "wrong_goals", "almost_right", "just_curious"])
    .optional(),
  postAcceptRating: z.enum(["not_this", "itll_do", "good_pick", "this_is_it", "perfect"]).optional(),
  note: z.string().max(240).optional(),
  rerollFromClassId: z.enum(classValues).optional(),
  rerollToClassId: z.enum(classValues).optional(),
});

export function validateRecommendInput(payload: unknown): RecommendInput {
  return recommendInputSchema.parse(payload);
}

export function validateMemorialInput(payload: unknown): MemorialInput {
  return memorialInputSchema.parse(payload);
}

export function validateDestinyFeedbackInput(payload: unknown): DestinyFeedbackInput {
  return destinyFeedbackInputSchema.parse(payload);
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

export function validateMemorialOutput(output: MemorialOutput): string[] {
  const failures: string[] = [];

  if (!output.epitaph || output.epitaph.length < 8 || output.epitaph.length > 180) {
    failures.push("invalid_epitaph");
  }
  if (!output.characterName || output.characterName.length > 80) failures.push("invalid_character_name");
  if (!output.location || output.location.length > 120) failures.push("invalid_location");
  if (!output.cause || output.cause.length > 160) failures.push("invalid_cause");
  if (output.level !== null && (output.level < 1 || output.level > 60)) failures.push("invalid_level");
  if (!["horde", "alliance", "neutral"].includes(output.faction)) failures.push("invalid_faction");

  return failures;
}
