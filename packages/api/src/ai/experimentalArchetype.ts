import type { ApiEnv } from "../db/client";
import { fetchRuntimeKvValue, KV_EXPERIMENTAL_SUPPLEMENT } from "../db/archetypeLearning";
import { archetypes } from "../domain/archetypes";
import { mergeDesiredTags } from "../domain/intentTags";
import type { Archetype, ClassId, RankedArchetype, RecommendInput, Tier } from "../domain/types";
import { callAiGateway, extractJsonPayload, getAiGateStatus } from "./adapter";

const TIER_VALUES: Tier[] = ["safe", "off_beaten", "high_risk", "just_fun"];

function hashToUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * AI-drafts a new archetype-shaped row (experimental prototype), anchored to a class from viability.
 * Curated fixtures stay the source of truth for structure; this expands the *effective* option space.
 */
export async function buildExperimentalRankedArchetype(
  env: ApiEnv["Bindings"],
  input: RecommendInput,
  allowedClasses: ClassId[],
): Promise<RankedArchetype | null> {
  if (!getAiGateStatus(env).ready) return null;
  if (allowedClasses.length === 0) return null;

  const preferred = input.signals.preferredClass;
  const classPick = preferred && allowedClasses.includes(preferred) ? preferred : allowedClasses[Math.floor(hashToUnit(`${input.sessionId}|xp`) * allowedClasses.length)]!;

  const base = archetypes.find((a) => a.classId === classPick) ?? archetypes[0]!;
  const model = env.AI_MODEL_DESTINY ?? "openrouter/auto";
  const tagsHint = mergeDesiredTags(input).slice(0, 12).join(", ");

  const supplement = (await fetchRuntimeKvValue(env.DB, KV_EXPERIMENTAL_SUPPLEMENT))?.trim() ?? "";

  const promptLines = [
    "You help generate ONE hardcore Classic WoW style archetype for a recommender.",
    "Return JSON only with keys: title,subline,tier,safetyMechanism,first10,tags,raceSuggestion,factionSuggestion,genderLean",
    `tier must be one of: ${TIER_VALUES.join(",")}`,
    "first10: array of 3 to 5 strings, each <=100 chars — concrete HC pull/kit cadence, no slurs, no politics, no real-money RMT.",
    "tags: 2 to 8 short tokens (snake_case or single words); prefer tags from this hint list when they fit:",
    tagsHint || "safe,solo,steady",
    `class is fixed at ${classPick} — do not output classId.`,
    "factionSuggestion must be one of: horde, alliance, neutral",
    "genderLean must be one of: masculine, feminine, neutral",
    `Inspiration only (do not copy verbatim): title=${base.title}; subline=${base.subline}; mechanism=${base.safetyMechanism}`,
    `Player signals JSON: ${JSON.stringify(input.signals)}`,
  ];
  if (supplement.length > 0) {
    promptLines.push("Learning-loop addendum (follow strictly):", supplement);
  }
  const prompt = promptLines.join("\n");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await callAiGateway(env, model, prompt, 18_000);
    if (!res.ok) continue;
    try {
      const parsed = JSON.parse(extractJsonPayload(res.content)) as {
        title?: string;
        subline?: string;
        tier?: string;
        safetyMechanism?: string;
        first10?: string[];
        tags?: string[];
        raceSuggestion?: string;
        factionSuggestion?: string;
        genderLean?: string;
      };
      const tier = (TIER_VALUES.includes(parsed.tier as Tier) ? parsed.tier : "off_beaten") as Tier;
      const first10 = (parsed.first10 ?? [])
        .filter((s) => typeof s === "string" && s.trim().length > 0 && s.length <= 120)
        .map((s) => s.trim())
        .slice(0, 5);
      if (first10.length < 3) continue;
      const tags = (parsed.tags ?? [])
        .filter((t) => typeof t === "string" && t.length > 0 && t.length <= 40)
        .map((t) => t.trim().toLowerCase())
        .slice(0, 10);
      const archetype: Archetype = {
        key: `exp_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`,
        classId: classPick,
        faction:
          parsed.factionSuggestion === "horde" || parsed.factionSuggestion === "alliance"
            ? parsed.factionSuggestion
            : base.faction,
        raceSuggestion: typeof parsed.raceSuggestion === "string" ? parsed.raceSuggestion.slice(0, 40) : "TBD",
        genderLean:
          parsed.genderLean === "masculine" || parsed.genderLean === "feminine" || parsed.genderLean === "neutral"
            ? parsed.genderLean
            : "neutral",
        title: (parsed.title ?? `${base.title} (experimental)`).slice(0, 80),
        subline: (parsed.subline ?? base.subline).slice(0, 120),
        tier,
        tags: tags.length ? tags : [...base.tags, "experimental_lane"],
        safetyMechanism: (parsed.safetyMechanism ?? base.safetyMechanism).slice(0, 220),
        first10,
      };
      return {
        archetype,
        score: 6,
        reasons: ["experimental_lane_ai"],
      };
    } catch {
      /* try again */
    }
  }
  return null;
}
