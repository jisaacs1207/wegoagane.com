import { archetypes } from "./archetypes";
import type { Archetype, MemoryFeatures, MemoryRankingConfig, RankedArchetype, RecommendInput } from "./types";

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

export type RankerMemoryInput = {
  browserMemory?: RecommendInput["signals"]["memoryHints"];
  serverMemory?: MemoryFeatures;
  config: MemoryRankingConfig;
};

export type RankerMemoryMeta = {
  enabled: boolean;
  degradeMode: boolean;
  browserWeight: number;
  serverWeight: number;
  maxBias: number;
  browserConfidence: number;
  serverConfidence: number;
  averageAppliedBias: number;
  clampHits: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function combinedAffinity(
  classId: Archetype["classId"],
  memory: RankerMemoryInput,
): { bias: number; clamped: boolean } {
  if (!memory.config.enabled) return { bias: 0, clamped: false };
  const browserAffinity = memory.browserMemory?.classAffinity?.[classId] ?? 0;
  const serverAffinity = memory.serverMemory?.classAffinity?.[classId] ?? 0;
  const browserConfidence = memory.browserMemory?.confidence ?? 0;
  const serverConfidence = memory.serverMemory?.confidence ?? 0;
  const weighted =
    browserAffinity * memory.config.browserWeight * browserConfidence +
    serverAffinity * memory.config.serverWeight * serverConfidence;
  const scaled = weighted * (memory.config.degradeMode ? memory.config.degradeScale : 1);
  const clamped = clamp(scaled, -memory.config.maxBias, memory.config.maxBias);
  return { bias: clamped, clamped: clamped !== scaled };
}

export function rankArchetypes(
  input: RecommendInput,
  memory: RankerMemoryInput,
): { ranked: RankedArchetype[]; memoryMeta: RankerMemoryMeta } {
  const desired = inferTags(input);
  const excluded = new Set(input.signals.excludedClasses ?? []);
  const factionPreference = input.signals.factionPreference;

  const filtered = archetypes.filter((a) => {
    if (excluded.has(a.classId)) return false;
    if (!factionPreference) return true;
    return a.faction === "either" || a.faction === factionPreference;
  });

  const preferredClass = input.signals.preferredClass;
  let clampHits = 0;
  let biasTotal = 0;
  const ranked = filtered.map((a) => {
    const scored = scoreArchetype(a, desired);
    if (preferredClass && a.classId === preferredClass) {
      scored.score += 3;
      scored.reasons.push("preferred_class");
    }
    const memoryBias = combinedAffinity(a.classId, memory);
    if (memoryBias.bias !== 0) {
      scored.score += memoryBias.bias;
      scored.memoryBiasApplied = memoryBias.bias;
      scored.reasons.push(`memory_bias:${memoryBias.bias > 0 ? "+" : ""}${memoryBias.bias.toFixed(2)}`);
      biasTotal += memoryBias.bias;
    }
    if (memoryBias.clamped) clampHits += 1;
    return scored;
  });
  ranked.sort((a, b) => b.score - a.score);
  return {
    ranked,
    memoryMeta: {
      enabled: memory.config.enabled,
      degradeMode: memory.config.degradeMode,
      browserWeight: memory.config.browserWeight,
      serverWeight: memory.config.serverWeight,
      maxBias: memory.config.maxBias,
      browserConfidence: memory.browserMemory?.confidence ?? 0,
      serverConfidence: memory.serverMemory?.confidence ?? 0,
      averageAppliedBias: ranked.length > 0 ? Number((biasTotal / ranked.length).toFixed(4)) : 0,
      clampHits,
    },
  };
}
