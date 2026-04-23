import { archetypes } from "./archetypes";
import type { Archetype, RankedArchetype, RecommendInput } from "./types";

function normalizeText(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function inferTags(input: RecommendInput): string[] {
  const text = normalizeText(
    input.signals.intent,
    input.signals.nextSignal,
    input.signals.mood,
    input.signals.freeform,
  );

  const tags = new Set<string>();
  if (text.includes("safe") || text.includes("safer")) tags.add("safe");
  if (text.includes("fast") || text.includes("aggressive")) tags.add("fast");
  if (text.includes("solo")) tags.add("solo");
  if (text.includes("social") || text.includes("group")) tags.add("group_ok");
  if (text.includes("different") || text.includes("new")) tags.add("off_beaten");
  if (text.includes("pet")) tags.add("pet");
  if (text.includes("no pet")) tags.add("no_pet");
  if (text.includes("profession")) tags.add("steady");
  if (text.includes("surprise")) tags.add("just_fun");
  if (text.includes("bullshit")) tags.add("safe");
  if (text.includes("strange")) tags.add("off_beaten");
  if (input.entryPath === "lucky_roll") tags.add("just_fun");

  if (tags.size === 0) tags.add("safe");
  return [...tags];
}

function scoreArchetype(archetype: Archetype, desiredTags: string[]): RankedArchetype {
  let score = 0;
  const reasons: string[] = [];

  for (const tag of desiredTags) {
    if (archetype.tags.includes(tag)) {
      score += 2.5;
      reasons.push(`matches:${tag}`);
    }
  }

  if (desiredTags.includes("safe") && archetype.tier === "safe") {
    score += 2;
    reasons.push("tier:safe");
  }
  if (desiredTags.includes("off_beaten") && archetype.tier === "off_beaten") {
    score += 1.5;
    reasons.push("tier:off_beaten");
  }
  if (desiredTags.includes("just_fun") && archetype.tier === "just_fun") {
    score += 1.5;
    reasons.push("tier:just_fun");
  }

  score += 0.01 * archetype.first10.length;
  return { archetype, score, reasons };
}

export function rankArchetypes(input: RecommendInput): RankedArchetype[] {
  const desired = inferTags(input);
  const excluded = new Set(input.signals.excludedClasses ?? []);
  const factionPreference = input.signals.factionPreference;

  const filtered = archetypes.filter((a) => {
    if (excluded.has(a.classId)) return false;
    if (!factionPreference) return true;
    return a.faction === "either" || a.faction === factionPreference;
  });

  const preferredClass = input.signals.preferredClass;
  const ranked = filtered.map((a) => {
    const scored = scoreArchetype(a, desired);
    if (preferredClass && a.classId === preferredClass) {
      scored.score += 3;
      scored.reasons.push("preferred_class");
    }
    return scored;
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
