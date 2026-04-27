import { z } from "zod";
import { WOW_NAME_MAX, isValidCharacterName } from "./nameRules";

export const nameLaneKeys = [
  "lore_world",
  "hc_practical",
  "light_humor",
  "grimdark",
  "neutral",
  "pop_culture",
] as const;

const talentRowSchema = z.object({
  tier: z.string().max(40),
  name: z.string().max(80),
  rationale: z.string().max(400),
  alternatives: z.array(z.string().max(80)).max(4).optional(),
});

const talentTreeAllocationSchema = z.object({
  branch: z.string().max(40),
  points: z.number().int().min(0).max(61),
});

const talentPathStepSchema = z.object({
  level: z.number().int().min(10).max(60),
  branch: z.string().max(40),
  talent: z.string().max(80),
  rank: z.number().int().min(1).max(5).optional(),
  rationale: z.string().max(300).optional(),
});

/** Optional pick the model skipped at this level, with a one-line tradeoff (Classic HC). */
const talentLevelAlternativeSchema = z.object({
  talent: z.string().max(80),
  branch: z.string().max(40).optional(),
  tradeoff: z.string().max(220),
});

/** One talent point: Classic grants the first point at level 10, then one per level through 60 (51 total). */
const talentLevelByLevelStepSchema = z.object({
  level: z.number().int().min(10).max(60),
  branch: z.string().max(40),
  talent: z.string().max(80),
  rankAfter: z.number().int().min(1).max(5).optional(),
  rationale: z.string().max(280).optional(),
  alternatives: z.array(talentLevelAlternativeSchema).max(3).optional(),
});

const forkSchema = z.object({
  title: z.string().max(120),
  optionA: z.string().max(200),
  optionB: z.string().max(200),
  why: z.string().max(400),
});

const namesByLaneSchema = z
  .object({
    lore_world: z.array(z.string().max(WOW_NAME_MAX)).max(12).optional(),
    hc_practical: z.array(z.string().max(WOW_NAME_MAX)).max(12).optional(),
    light_humor: z.array(z.string().max(WOW_NAME_MAX)).max(12).optional(),
    grimdark: z.array(z.string().max(WOW_NAME_MAX)).max(12).optional(),
    neutral: z.array(z.string().max(WOW_NAME_MAX)).max(12).optional(),
    pop_culture: z.array(z.string().max(WOW_NAME_MAX)).max(12).optional(),
  })
  .strict();

export const buildPlanPayloadSchema = z.object({
  v: z.literal(1),
  meta: z.object({
    publishTier: z.enum(["draft", "reviewed", "verified"]),
    rulesetPin: z.string().max(120),
    classId: z.string().max(20),
    archetypeKey: z.string().max(80),
  }),
  viabilityNotes: z.array(z.string().max(200)).optional(),
  warnings: z.array(z.string().max(400)).optional(),
  talents: z.object({
    summary: z.string().max(600).optional(),
    /** Second-pass prose: what this build is optimizing for in Classic HC. */
    buildIntentSummary: z.string().max(900).optional(),
    keyPicks: z.array(talentRowSchema).max(12),
    /** Per-tree point allocation, e.g. Feral 31 / Resto 20. */
    treeAllocations: z.array(talentTreeAllocationSchema).max(3).optional(),
    /** Full leveling path (or near-full) so UI can show complete talent journey. */
    path: z.array(talentPathStepSchema).max(60).optional(),
    /** Level 10..60 in order — one row per talent point (51 rows when complete). Filled by a dedicated second AI pass. */
    levelByLevel: z.array(talentLevelByLevelStepSchema).max(51).optional(),
  }),
  professions: z.object({
    primary: z.string().max(40),
    secondary: z.string().max(40),
    rationale: z.string().max(800),
    secondarySkills: z.object({
      firstAid: z.string().max(300),
      cooking: z.string().max(300),
      fishing: z.string().max(300),
    }),
  }),
  stats: z.object({
    priority: z.array(z.string().max(40)).max(8),
    rationale: z.string().max(600),
  }),
  race: z.object({
    suggestion: z.string().max(80),
    rationale: z.string().max(500),
    alternatives: z.array(z.string().max(80)).max(4).optional(),
  }),
  identity: z
    .object({
      raceSuggestion: z.string().max(80).optional(),
      factionSuggestion: z.enum(["horde", "alliance", "neutral"]).optional(),
      genderLean: z.enum(["masculine", "feminine", "neutral"]).optional(),
      buildFantasy: z.string().max(300).optional(),
      archetypeSummary: z.string().max(500).optional(),
    })
    .optional(),
  signature: z
    .object({
      tree: z
        .object({
          branch: z.string().max(40),
          weight: z.number().min(0).max(1),
        })
        .optional(),
      strengths: z.array(z.string().max(120)).max(5).optional(),
      weaknesses: z.array(z.string().max(120)).max(5).optional(),
      whyDistinct: z.string().max(300).optional(),
      keyItems: z
        .array(
          z.object({
            name: z.string().max(80),
            slot: z.string().max(40).optional(),
            rationale: z.string().max(200).optional(),
          }),
        )
        .max(8)
        .optional(),
    })
    .optional(),
  namesByLane: namesByLaneSchema,
  forks: z.array(forkSchema).max(6),
  /** Raw AI outputs retained for deeper debugging and downstream features. */
  aiRaw: z
    .object({
      generatorJson: z.string().max(50000).optional(),
      reviewerJson: z.string().max(50000).optional(),
    })
    .optional(),
});

export type BuildPlanPayload = z.infer<typeof buildPlanPayloadSchema>;

/** Strip invalid names from payload in-place semantics via clone. */
export function sanitizeBuildPlanNames(payload: BuildPlanPayload): BuildPlanPayload {
  const names = { ...payload.namesByLane };
  for (const lane of nameLaneKeys) {
    const arr = names[lane];
    if (!arr) continue;
    names[lane] = arr.filter((n) => isValidCharacterName(n));
  }
  return { ...payload, namesByLane: names };
}
