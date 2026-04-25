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
const rerollReasonValues = ["wrong_class", "wrong_energy", "wrong_goals", "almost_right", "just_curious"] as const;
const rerollVerdictValues = ["totally_off", "close_but_off", "resolved"] as const;
const growthSurfaceValues = ["content", "recommendation", "ui", "share", "onboarding"] as const;

const statPhilosophyValues = [
  "stamina_forward",
  "strength_forward",
  "agility_forward",
  "intellect_forward",
  "spirit_forward",
  "balanced",
  "meme_glass",
] as const;

const professionIntentValues = [
  "engineering_outs",
  "alchemy_consumables",
  "herbalism_alchemy_pair",
  "mining_engineering_pair",
  "dual_gathering_bootstrap",
  "skinning_mining_early",
  "leatherworker_hunter_synergy",
  "tailoring_bags_arcane",
  "enchanter_disenchant_route",
  "blacksmith_weaponsmith_fantasy",
  "first_aid_mandatory_mindset",
  "cooking_high_value",
  "fishing_supports_cooking",
  "fishing_optional",
  "early_gathering_then_pivot_engineering",
  "auction_house_play",
] as const;

const buildVectorValues = [
  "tank",
  "heal",
  "hybrid",
  "pet",
  "melee",
  "ranged",
  "caster",
  "mana",
  "rage",
  "energy",
  "holy",
  "demonic",
  "nature",
  "solo",
  "group_ok",
] as const;

const raceModeValues = ["user_pick", "signal_inferred", "optimize_theme", "surprise"] as const;

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
    recommendVariantId: z.string().min(1).max(120).optional(),
    statPhilosophy: z.array(z.enum(statPhilosophyValues)).max(8).optional(),
    professionIntents: z.array(z.enum(professionIntentValues)).max(12).optional(),
    buildVectors: z.array(z.enum(buildVectorValues)).max(16).optional(),
    raceMode: z.enum(raceModeValues).optional(),
    pickedRace: z.string().min(2).max(24).optional(),
    genderLean: z.enum(["masculine", "feminine", "neutral"]).optional(),
    recommendLane: z.enum(["curated", "experimental"]).optional(),
    memoryHints: z
      .object({
        version: z.number().int().min(1).max(8),
        // Allow unknown historical keys from older browser memory snapshots.
        classAffinity: z.record(z.string(), z.number().min(-1).max(1)).optional(),
        rerollReasonCounts: z.record(z.string(), z.number().int().min(0).max(1000)).optional(),
        confidence: z.number().min(0).max(1).optional(),
        updatedAt: z.number().int().min(0).optional(),
      })
      .optional(),
  }),
});

export const growthAssignInputSchema = z.object({
  sessionId: z.string().min(1).max(120),
  entryPath: z.enum(entryPathValues).optional(),
  surface: z.enum(growthSurfaceValues),
});

export const growthOutcomeInputSchema = z.object({
  assignmentId: z.string().min(1).max(120),
  converted: z.boolean().optional(),
  outcome: z.record(z.string(), z.unknown()).optional(),
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
  rerollVerdict: z.enum(rerollVerdictValues).optional(),
  parsedSignalJson: z.record(z.string(), z.unknown()).optional(),
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
  const bullets = Array.isArray(output.bullets) ? output.bullets : [];
  if (bullets.length < 3 || bullets.length > 6) failures.push("invalid_bullet_count");
  if (output.genderLean && !["masculine", "feminine", "neutral"].includes(output.genderLean)) failures.push("invalid_gender_lean");
  if (output.factionSuggestion && !["horde", "alliance", "neutral"].includes(output.factionSuggestion)) failures.push("invalid_faction_suggestion");
  if (output.raceSuggestion && output.raceSuggestion.length > 40) failures.push("invalid_race_suggestion");

  const classFaction = classFactionMap[output.classId];
  if (!classFaction) failures.push("unknown_class");
  if (classFaction && classFaction !== "either" && factionPreference && classFaction !== factionPreference) {
    failures.push("invalid_class_faction_combo");
  }

  const rationale = typeof output.rationale === "string" ? output.rationale : "";
  const source = archetypes.find((a) => output.headline.toLowerCase().includes(a.classId));
  if (!source && rationale.length < 12) failures.push("thin_rationale");

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
  const lv = output.level;
  if (lv !== null && lv !== undefined && (typeof lv !== "number" || !Number.isInteger(lv) || lv < 1 || lv > 60)) {
    failures.push("invalid_level");
  }
  if (!["horde", "alliance", "neutral"].includes(output.faction)) failures.push("invalid_faction");

  return failures;
}
