import { eq } from "drizzle-orm";
import type { ApiEnv } from "../db/client";
import { getDb } from "../db/client";
import { buildPlans, destinies } from "../db/schema";
import {
  buildPlanPayloadSchema,
  nameLaneKeys,
  sanitizeBuildPlanNames,
  type BuildPlanPayload,
} from "../domain/buildPlanSchema";
import { callAiGateway, extractJsonPayload, getAiGateStatus, isTruthyEnv, WOW_HC_JSON_GUARDS } from "./adapter";
import type { ClassId, RecommendInput } from "../domain/types";
import { computeViability } from "../domain/viability";
import { coerceClassRaceSuggestions } from "../domain/classRaceRules";
import { deepStripFancyPunctuation } from "./punctuation";
import {
  buildPlanCanonicalSignals,
  getFragment,
  hashSignalsForCache,
  putFragment,
} from "./fragmentCache";
import { captureServerEvent } from "../analytics/posthog";
import { AnalyticsEvent } from "../analytics/events";

function rulesetPinFromEnv(env: ApiEnv["Bindings"]): string {
  return (env.RULESET_PIN ?? "classic-era-hc-2026-04").trim().slice(0, 120);
}

/** Canonical Classic Era tree names per class (must match UI / player expectations). */
const CLASS_TALENT_TREE_NAMES: Record<ClassId, readonly [string, string, string]> = {
  warrior: ["Arms", "Fury", "Protection"],
  mage: ["Arcane", "Fire", "Frost"],
  rogue: ["Assassination", "Combat", "Subtlety"],
  priest: ["Discipline", "Holy", "Shadow"],
  hunter: ["Beast Mastery", "Marksmanship", "Survival"],
  warlock: ["Affliction", "Demonology", "Destruction"],
  druid: ["Balance", "Feral", "Restoration"],
  paladin: ["Holy", "Protection", "Retribution"],
  shaman: ["Elemental", "Enhancement", "Restoration"],
};

/** Keep prompt payloads bounded so gateway requests stay parseable even with huge client signals. */
const PROMPT_JSON_BUDGET = 12_000;
const REVIEWER_DRAFT_BUDGET = 120_000;
// Build generation is launched from request `waitUntil`; keep total AI time bounded so jobs can
// actually settle instead of sitting in `generating` after runtime interruption.
const BUILD_PLAN_TOTAL_AI_BUDGET_MS = 28_000;
const BUILD_PLAN_GEN_TIMEOUT_MS = 16_000;
const BUILD_PLAN_REVIEW_TIMEOUT_MS = 8_000;

function jsonForPrompt(label: string, value: unknown): string {
  try {
    const raw = JSON.stringify(value);
    if (raw.length <= PROMPT_JSON_BUDGET) return raw;
    return `${raw.slice(0, PROMPT_JSON_BUDGET)}\n/* ${label}: truncated for token safety - infer missing tail conservatively */`;
  } catch {
    return "{}";
  }
}

function stubPayload(input: {
  classId: string;
  archetypeKey: string;
  destiny: { headline: string; subline: string; bullets: string[] };
  viabilityNotes: string[];
  rulesetPin: string;
}): BuildPlanPayload {
  const namesByLane: BuildPlanPayload["namesByLane"] = {
    lore_world: [],
    hc_practical: [],
    light_humor: [],
    grimdark: [],
    neutral: [],
    pop_culture: [],
  };
  return {
    v: 1,
    meta: {
      publishTier: "draft",
      rulesetPin: input.rulesetPin,
      classId: input.classId,
      archetypeKey: input.archetypeKey,
    },
    viabilityNotes: input.viabilityNotes,
    warnings: ["AI disabled: stub build plan only."],
    talents: {
      summary: "Enable AI on the API worker to generate full talent and profession guidance.",
      keyPicks: [],
    },
    professions: {
      primary: "TBD",
      secondary: "TBD",
      rationale: "Configure AI_GATEWAY_URL and AI_GATEWAY_TOKEN for tailored HC recommendations.",
      secondarySkills: {
        firstAid: "Train First Aid on every Hardcore character.",
        cooking: "Cooking provides cheap stat food while leveling.",
        fishing: "Optional: supports cooking and calm gold; time-intensive.",
      },
    },
    stats: {
      priority: ["stamina", "mainstat"],
      rationale: "Hardcore defaults favor surviving spikes while keeping damage reasonable.",
    },
    race: {
      suggestion: "Pick a race you will enjoy looking at for 60 levels.",
      rationale: "Racial advantages matter less than pull discipline in Era HC.",
    },
    identity: {
      raceSuggestion: "player choice",
      factionSuggestion: "neutral",
      genderLean: "neutral",
      buildFantasy: "Hardcore-safe baseline until AI details are available.",
      archetypeSummary: input.destiny.headline,
    },
    namesByLane,
    forks: [
      {
        title: "Survival vs speed",
        optionA: "Extra stamina and safer routes",
        optionB: "Faster kills with slightly more risk",
        why: "Both are viable; choose based on your patience with slow leveling.",
      },
    ],
  };
}

type TalentPathStep = NonNullable<BuildPlanPayload["talents"]["path"]>[number];
type TalentLevelRailStep = NonNullable<BuildPlanPayload["talents"]["levelByLevel"]>[number];

/** One row per level 10..60 from sparse path checkpoints (forward-fill between nodes). */
function expandSparsePathTo51(path: TalentPathStep[] | undefined | null): TalentLevelRailStep[] | null {
  if (!path?.length) return null;
  const sorted = [...path]
    .filter((p) => p.level >= 10 && p.level <= 60 && p.branch && p.talent)
    .sort((a, b) => a.level - b.level);
  if (!sorted.length) return null;
  const first = sorted[0];
  if (!first) return null;
  const out: TalentLevelRailStep[] = [];
  for (let L = 10; L <= 60; L++) {
    let pick: TalentPathStep = first;
    for (const p of sorted) {
      if (p.level <= L) pick = p;
      else break;
    }
    const atTier = pick.level === L;
    out.push({
      level: L,
      branch: pick.branch,
      talent: pick.talent,
      rankAfter: atTier && pick.rank != null ? pick.rank : undefined,
      rationale: atTier ? pick.rationale : undefined,
    });
  }
  return out;
}

/** Exactly one row per level 10..60, sorted. */
function orderFullLevelByLevel(rows: TalentLevelRailStep[] | undefined | null): TalentLevelRailStep[] | null {
  if (!rows?.length) return null;
  const byL = new Map<number, TalentLevelRailStep>();
  for (const r of rows) {
    if (r.level >= 10 && r.level <= 60 && r.branch && r.talent) byL.set(r.level, r);
  }
  if (byL.size !== 51) return null;
  for (let L = 10; L <= 60; L++) {
    if (!byL.has(L)) return null;
  }
  return Array.from({ length: 51 }, (_, i) => byL.get(10 + i)!);
}

/** Fill missing levels by carrying forward the last known spend (model returned a partial rail). */
function padPartialLevelByLevel(rows: TalentLevelRailStep[] | undefined | null): TalentLevelRailStep[] | null {
  if (!rows?.length) return null;
  const sorted = [...rows]
    .filter((r) => r.level >= 10 && r.level <= 60 && r.branch && r.talent)
    .sort((a, b) => a.level - b.level);
  if (!sorted.length) return null;
  const byL = new Map<number, TalentLevelRailStep>();
  for (const r of sorted) byL.set(r.level, r);
  const out: TalentLevelRailStep[] = [];
  let last: TalentLevelRailStep | null = null;
  for (let L = 10; L <= 60; L++) {
    const hit = byL.get(L);
    if (hit) {
      last = hit;
      out.push({ ...hit, level: L });
    } else if (last) {
      out.push({
        level: L,
        branch: last.branch,
        talent: last.talent,
        rationale: "Filled to complete the 10-60 rail (model omitted this level).",
      });
    } else {
      return null;
    }
  }
  return out;
}

/**
 * After the monolithic generator (+ optional reviewer), guarantee a usable 51-step rail for the UI
 * without a second AI call: prefer valid model levelByLevel, else derive from path, else pad partials.
 */
function ensureMonolithicTalentLevelRail(payload: BuildPlanPayload): BuildPlanPayload {
  const talents = payload.talents;
  const summaryFallback =
    talents.buildIntentSummary?.trim() ||
    (typeof talents.summary === "string" ? talents.summary.slice(0, 900) : "Classic Era Hardcore leveling path.");

  const extraWarnings: string[] = [];

  const strict = orderFullLevelByLevel(talents.levelByLevel);
  if (strict) {
    return {
      ...payload,
      talents: {
        ...talents,
        levelByLevel: strict,
        buildIntentSummary: summaryFallback,
      },
    };
  }

  const fromPath = expandSparsePathTo51(talents.path ?? undefined);
  if (fromPath) {
    extraWarnings.push("Talent rail derived from talents.path (levelByLevel was incomplete or invalid).");
    return {
      ...payload,
      talents: {
        ...talents,
        levelByLevel: fromPath,
        buildIntentSummary: summaryFallback,
      },
      warnings: [...(payload.warnings ?? []), ...extraWarnings].slice(0, 24),
    };
  }

  const padded = padPartialLevelByLevel(talents.levelByLevel);
  if (padded) {
    extraWarnings.push("Talent rail padded to 51 steps from partial levelByLevel output.");
    return {
      ...payload,
      talents: {
        ...talents,
        levelByLevel: padded,
        buildIntentSummary: summaryFallback,
      },
      warnings: [...(payload.warnings ?? []), ...extraWarnings].slice(0, 24),
    };
  }

  return {
    ...payload,
    talents: {
      ...talents,
      buildIntentSummary: summaryFallback,
    },
    warnings: [
      ...(payload.warnings ?? []),
      "Could not derive a full 51-step talent rail (no valid path or levelByLevel).",
    ].slice(0, 24),
  };
}

function talentTreeGuiderailLine(classId: ClassId): string {
  const treeNames = CLASS_TALENT_TREE_NAMES[classId];
  if (!treeNames) return "Use exactly three branch strings that match the three Classic Era talent trees for this class (real in-game tree names).";
  return `For this class (${classId}), talents.branch on EVERY path and levelByLevel row MUST be exactly one of: ${JSON.stringify([...treeNames])}; spell them exactly as in the Classic Era client.`;
}

function buildGeneratorPrompt(
  input: RecommendInput,
  destiny: { headline: string; subline: string; classId: ClassId; bullets: string[]; tierProse: string; rationale: string },
  archetypeKey: string,
  viabilityNotes: string[],
  rulesetPin: string,
): string {
  const rail = talentTreeGuiderailLine(destiny.classId);
  return [
    ...WOW_HC_JSON_GUARDS,
    "You are an expert on World of Warcraft Classic ERA HARDCORE (permanent death; one life; no retail or Dragonflight+ rules).",
    `Ruleset pin: ${rulesetPin}. Prefer accurate Classic Era talent NAMES and real profession pairings. If unsure, say so in warnings[].`,
    "Do not emit keys outside the schema. Keep arrays within stated limits so the reply stays one valid JSON object.",
    "Return ONE JSON object only matching this shape (same top-level keys as before; talents MUST include buildIntentSummary + levelByLevel + path + treeAllocations):",
    '{"v":1,"meta":{"publishTier":"draft","rulesetPin":"...","classId":"...","archetypeKey":"..."},"viabilityNotes":[],"warnings":[],"talents":{"summary":"...","buildIntentSummary":"2-5 sentences: HC survival posture, leveling fantasy, pull discipline, how this differs from a generic path","keyPicks":[{"tier":"...","name":"talent name","rationale":"...","alternatives":[]}],"treeAllocations":[{"branch":"...","points":31}],"path":[{"level":10,"branch":"...","talent":"...","rank":1,"rationale":"..."}],"levelByLevel":[{"level":10,"branch":"...","talent":"...","rankAfter":1,"rationale":"...","alternatives":[{"talent":"...","branch":"...","tradeoff":"..."}]}]},"professions":{...},"stats":{...},"race":{...},"identity":{...},"signature":{...},"namesByLane":{...},"forks":[...]}',
    "### BUILD PATH GUIDERAILS (mandatory: same response as everything else)",
    rail,
    "Classic talent rule: first point at character level 10, then exactly one additional point each level through 60 (51 total points).",
    "talents.levelByLevel: REQUIRED. Output EXACTLY 51 objects, sorted ascending by level, one object per character level 10 through 60 inclusive (level field 10,11,12,...,60; no gaps, no duplicates).",
    'Each levelByLevel object MUST include: "level" (int), "branch" (see tree list above), "talent" (exact Classic Era name in that tree), optional "rankAfter" (1-5), optional short "rationale", optional "alternatives" (0-2 entries with talent + tradeoff).',
    "Respect prerequisite order for Classic Era; every spend must be legal in-game. Do not skip levels or merge two points into one row.",
    "talents.path: REQUIRED: checkpoints that align with levelByLevel (same branches/talents; path can be sparser but must not contradict levelByLevel).",
    "talents.treeAllocations: REQUIRED: three rows max, point totals that sum to 51 at level 60 and match levelByLevel branch tallies.",
    "talents.buildIntentSummary: REQUIRED: 2-5 sentences, non-empty.",
    "signature: REQUIRED for hardcore differentiation. tree.branch is the dominant talent tree by point spend; tree.weight is 0..1 share of points in that branch. strengths/weaknesses 3-5 short HC-specific bullets each (e.g. 'low downtime between pulls', 'weak vs casters'). whyDistinct: 1-2 sentences on what separates this build from a generic same-class run. keyItems 4-6 leveling-tier upgrades with slot.",
    "Use widely accepted WoW Classic Era HC community guidance (e.g. Wowhead/classic forums/reddit consensus) for talent progression realism; never invent fake citations or URLs.",
    "namesByLane: each array 4-8 names; WoW rules: ASCII letters only, length 2-12 each, no spaces or punctuation. Include pop_culture lane with clever original blends (no trademark strings).",
    "forks: 2-3 entries for major build decisions.",
    `Player signals JSON: ${jsonForPrompt("signals", input.signals)}`,
    `Chosen archetypeKey: ${archetypeKey}`,
    `Viability notes: ${jsonForPrompt("viabilityNotes", viabilityNotes)}`,
    `Destiny card summary JSON: ${jsonForPrompt("destiny", destiny)}`,
  ].join("\n");
}

function buildReviewerPrompt(draft: string, input: RecommendInput, rulesetPin: string): string {
  const draftBody =
    draft.length > REVIEWER_DRAFT_BUDGET
      ? `${draft.slice(0, REVIEWER_DRAFT_BUDGET)}\n/* DRAFT truncated for reviewer context - preserve schema and fix top issues */`
      : draft;
  return [
    ...WOW_HC_JSON_GUARDS,
    "You are a hostile reviewer for WoW Classic Era Hardcore build advice.",
    `Ruleset pin: ${rulesetPin}.`,
    "Given the JSON draft below, find contradictions with the player signals, factual impossibilities, or non-viable HC choices.",
    "Also argue viability: pull risk, downtime, gear dependence, melee tax, first-HC suitability.",
    "Preserve talents.levelByLevel as EXACTLY 51 rows (levels 10..60, one per level) when present; fix ordering, duplicates, or illegal spends instead of deleting the rail.",
    "Return ONE revised JSON object of the SAME schema. If you cannot fix, keep issues in warnings[] array strings.",
    `Player signals: ${jsonForPrompt("signals", input.signals)}`,
    "DRAFT JSON:",
    draftBody,
  ].join("\n");
}

function clampText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

/** Clamp common AI overflows before strict schema validation. */
function normalizeBuildPlanCandidate(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = { ...obj };

  if (Array.isArray(out.warnings)) out.warnings = out.warnings.map((w) => clampText(w, 400)).filter(Boolean);
  if (Array.isArray(out.viabilityNotes)) out.viabilityNotes = out.viabilityNotes.map((n) => clampText(n, 200)).filter(Boolean);

  if (out.talents && typeof out.talents === "object") {
    const t = { ...(out.talents as Record<string, unknown>) };
    if (typeof t.summary === "string") t.summary = clampText(t.summary, 600);
    if (Array.isArray(t.keyPicks)) {
      t.keyPicks = t.keyPicks
      .slice(0, 12)
      .map((row) => {
        if (!row || typeof row !== "object") return row;
        const r = { ...(row as Record<string, unknown>) };
        r.tier = clampText(r.tier, 40);
        r.name = clampText(r.name, 80);
        r.rationale = clampText(r.rationale, 400);
        if (Array.isArray(r.alternatives)) r.alternatives = r.alternatives.slice(0, 4).map((a) => clampText(a, 80)).filter(Boolean);
        return r;
      })
      .filter((row) => {
        if (!row || typeof row !== "object") return false;
        const name = String((row as Record<string, unknown>).name ?? "").toLowerCase();
        // Hardcore mode: avoid dead-character recovery utility as recommended talent picks.
        return !/(soulstone|rebirth|reincarnation|divine intervention)/.test(name);
      });
    }
    if (Array.isArray(t.treeAllocations)) {
      t.treeAllocations = t.treeAllocations
        .slice(0, 3)
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = { ...(row as Record<string, unknown>) };
          r.branch = clampText(r.branch, 40);
          const points = typeof r.points === "number" ? r.points : Number(r.points);
          r.points = Number.isFinite(points) ? Math.max(0, Math.min(61, Math.round(points))) : 0;
          return r.branch ? r : null;
        })
        .filter((row): row is Record<string, unknown> => Boolean(row));
    }
    if (Array.isArray(t.path)) {
      t.path = t.path
        .slice(0, 60)
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = { ...(row as Record<string, unknown>) };
          const lv = typeof r.level === "number" ? r.level : Number(r.level);
          r.level = Number.isFinite(lv) ? Math.max(10, Math.min(60, Math.round(lv))) : 10;
          r.branch = clampText(r.branch, 40);
          r.talent = clampText(r.talent, 80);
          if (r.rank !== undefined) {
            const rank = typeof r.rank === "number" ? r.rank : Number(r.rank);
            r.rank = Number.isFinite(rank) ? Math.max(1, Math.min(5, Math.round(rank))) : 1;
          }
          if (r.rationale !== undefined) r.rationale = clampText(r.rationale, 300);
          return r.branch && r.talent ? r : null;
        })
        .filter((row): row is Record<string, unknown> => Boolean(row));
    }
    if (typeof t.buildIntentSummary === "string") {
      t.buildIntentSummary = clampText(t.buildIntentSummary, 900);
    }
    if (Array.isArray(t.levelByLevel)) {
      const rows = t.levelByLevel
        .slice(0, 55)
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = { ...(row as Record<string, unknown>) };
          const lv = typeof r.level === "number" ? r.level : Number(r.level);
          r.level = Number.isFinite(lv) ? Math.max(10, Math.min(60, Math.round(lv))) : 10;
          r.branch = clampText(r.branch, 40);
          r.talent = clampText(r.talent, 80);
          if (r.rankAfter !== undefined) {
            const ra = typeof r.rankAfter === "number" ? r.rankAfter : Number(r.rankAfter);
            r.rankAfter = Number.isFinite(ra) ? Math.max(1, Math.min(5, Math.round(ra))) : undefined;
          }
          if (r.rationale !== undefined) r.rationale = clampText(r.rationale, 280);
          if (Array.isArray(r.alternatives)) {
            r.alternatives = r.alternatives
              .slice(0, 3)
              .map((a) => {
                if (!a || typeof a !== "object") return null;
                const alt = { ...(a as Record<string, unknown>) };
                alt.talent = clampText(alt.talent, 80);
                alt.branch = alt.branch ? clampText(alt.branch, 40) : undefined;
                alt.tradeoff = clampText(alt.tradeoff, 220);
                return alt.talent && alt.tradeoff ? alt : null;
              })
              .filter((x): x is Record<string, unknown> => Boolean(x));
          }
          return r.branch && r.talent ? r : null;
        })
        .filter((row): row is Record<string, unknown> => Boolean(row));
      const byLevel = new Map<number, Record<string, unknown>>();
      for (const r of rows) byLevel.set(r.level as number, r);
      t.levelByLevel = [...byLevel.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
    }
    out.talents = t;
  }

  if (out.professions && typeof out.professions === "object") {
    const p = { ...(out.professions as Record<string, unknown>) };
    p.primary = clampText(p.primary, 40);
    p.secondary = clampText(p.secondary, 40);
    p.rationale = clampText(p.rationale, 800);
    let ss: Record<string, unknown> = {};
    if (Array.isArray(p.secondarySkills)) {
      ss = {
        firstAid: p.secondarySkills[0],
        cooking: p.secondarySkills[1],
        fishing: p.secondarySkills[2],
      };
    } else if (p.secondarySkills && typeof p.secondarySkills === "object") {
      ss = { ...(p.secondarySkills as Record<string, unknown>) };
    }
    p.secondarySkills = {
      firstAid: clampText(ss.firstAid ?? "Train First Aid aggressively; it is core HC safety.", 300),
      cooking: clampText(ss.cooking ?? "Cooking provides reliable sustain for longer leveling sessions.", 300),
      fishing: clampText(ss.fishing ?? "Fishing is optional support for food supply and pacing.", 300),
    };
    out.professions = p;
  }

  if (out.stats && typeof out.stats === "object") {
    const s = { ...(out.stats as Record<string, unknown>) };
    if (Array.isArray(s.priority)) s.priority = s.priority.slice(0, 8).map((x) => clampText(x, 40)).filter(Boolean);
    s.rationale = clampText(s.rationale, 600);
    out.stats = s;
  }

  if (out.race && typeof out.race === "object") {
    const r = { ...(out.race as Record<string, unknown>) };
    r.suggestion = clampText(r.suggestion, 80);
    r.rationale = clampText(r.rationale, 500);
    if (Array.isArray(r.alternatives)) r.alternatives = r.alternatives.slice(0, 4).map((x) => clampText(x, 80)).filter(Boolean);
    out.race = r;
  }

  if (out.forks && Array.isArray(out.forks)) {
    out.forks = out.forks.slice(0, 6).map((fork) => {
      if (!fork || typeof fork !== "object") return fork;
      const f = { ...(fork as Record<string, unknown>) };
      f.title = clampText(f.title, 120);
      f.optionA = clampText(f.optionA, 200);
      f.optionB = clampText(f.optionB, 200);
      f.why = clampText(f.why, 400);
      return f;
    });
  }

  if (out.identity && typeof out.identity === "object") {
    const i = { ...(out.identity as Record<string, unknown>) };
    i.raceSuggestion = clampText(i.raceSuggestion, 80);
    i.buildFantasy = clampText(i.buildFantasy, 300);
    i.archetypeSummary = clampText(i.archetypeSummary, 500);
    if (i.factionSuggestion !== "horde" && i.factionSuggestion !== "alliance" && i.factionSuggestion !== "neutral") {
      delete i.factionSuggestion;
    }
    if (i.genderLean !== "masculine" && i.genderLean !== "feminine" && i.genderLean !== "neutral") {
      delete i.genderLean;
    }
    out.identity = i;
  }

  if (out.aiRaw && typeof out.aiRaw === "object") {
    const r = { ...(out.aiRaw as Record<string, unknown>) };
    r.generatorJson = clampText(r.generatorJson, 50000);
    r.reviewerJson = clampText(r.reviewerJson, 50000);
    out.aiRaw = r;
  }

  if (out.signature && typeof out.signature === "object") {
    const sig = { ...(out.signature as Record<string, unknown>) };
    if (sig.tree && typeof sig.tree === "object") {
      const t = { ...(sig.tree as Record<string, unknown>) };
      t.branch = clampText(t.branch, 40);
      const w = typeof t.weight === "number" ? t.weight : Number(t.weight);
      t.weight = Number.isFinite(w) ? Math.max(0, Math.min(1, w)) : 0;
      sig.tree = t;
    }
    if (Array.isArray(sig.strengths)) {
      sig.strengths = sig.strengths.slice(0, 5).map((s) => clampText(s, 120)).filter(Boolean);
    }
    if (Array.isArray(sig.weaknesses)) {
      sig.weaknesses = sig.weaknesses.slice(0, 5).map((s) => clampText(s, 120)).filter(Boolean);
    }
    if (typeof sig.whyDistinct === "string") sig.whyDistinct = clampText(sig.whyDistinct, 300);
    if (Array.isArray(sig.keyItems)) {
      sig.keyItems = sig.keyItems
        .slice(0, 8)
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = { ...(row as Record<string, unknown>) };
          r.name = clampText(r.name, 80);
          r.slot = r.slot ? clampText(r.slot, 40) : undefined;
          r.rationale = r.rationale ? clampText(r.rationale, 200) : undefined;
          return r.name ? r : null;
        })
        .filter((row): row is Record<string, unknown> => Boolean(row));
    }
    out.signature = sig;
  }

  return out;
}

export async function runBuildPlanGeneration(
  env: ApiEnv["Bindings"],
  params: {
    destinyId: string;
    sessionId: string;
    input: RecommendInput;
    archetypeKey: string;
    destinyContent: Record<string, unknown>;
    viabilityNotes: string[];
    buildPlanId: string;
  },
): Promise<void> {
  const db = getDb(env.DB);
  const rulesetPin = rulesetPinFromEnv(env);
  const now = new Date();

  const destiny = params.destinyContent as {
    headline: string;
    subline: string;
    classId: ClassId;
    bullets: string[];
    tierProse?: string;
    rationale?: string;
  };

  const gate = getAiGateStatus(env);
  if (!gate.ready || !isTruthyEnv(env.AI_ENABLED)) {
    const stub = stubPayload({
      classId: destiny.classId,
      archetypeKey: params.archetypeKey,
      destiny: { headline: destiny.headline, subline: destiny.subline, bullets: destiny.bullets },
      viabilityNotes: params.viabilityNotes,
      rulesetPin,
    });
    await db
      .update(buildPlans)
      .set({
        status: "ready",
        payloadJson: JSON.stringify(stub),
        error: null,
        updatedAt: now,
      })
      .where(eq(buildPlans.id, params.buildPlanId));
    return;
  }

  const model = env.AI_MODEL_BUILD ?? env.AI_MODEL_DESTINY ?? "openrouter/auto";
  const aiBudgetStartedAt = Date.now();
  const remainingAiBudgetMs = () => BUILD_PLAN_TOTAL_AI_BUDGET_MS - (Date.now() - aiBudgetStartedAt);

  // Fragment cache short-circuit. Identical signals + class + archetype + ruleset reuse the prior
  // sanitised payload; we still write a fresh `build_plans` row so analytics/logs stay per-session.
  let signalsHash: string | null = null;
  try {
    signalsHash = await hashSignalsForCache(
      buildPlanCanonicalSignals({
        classId: destiny.classId,
        archetypeKey: params.archetypeKey,
        rulesetPin,
        signals: (params.input.signals ?? {}) as Record<string, unknown>,
      }),
    );
  } catch {
    signalsHash = null;
  }

  if (signalsHash) {
    const cached = await getFragment<BuildPlanPayload>(env, {
      kind: "build_plan",
      classId: destiny.classId,
      archetypeKey: params.archetypeKey,
      signalsHash,
    });
    if (cached) {
      const cacheReady = ensureMonolithicTalentLevelRail(deepStripFancyPunctuation(sanitizeBuildPlanNames({ ...cached })));
      await db
        .update(buildPlans)
        .set({
          status: "ready",
          payloadJson: JSON.stringify(cacheReady),
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(buildPlans.id, params.buildPlanId));
      try {
        await captureServerEvent(env, AnalyticsEvent.AiFragmentCacheHit, params.sessionId, {
          kind: "build_plan",
          classId: destiny.classId,
          archetypeKey: params.archetypeKey,
        });
      } catch {
        // Telemetry must never fail a build.
      }
      return;
    }
  }

  try {
    await db
      .update(buildPlans)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(buildPlans.id, params.buildPlanId));

    const genPrompt = buildGeneratorPrompt(params.input, { ...destiny, tierProse: destiny.tierProse ?? "", rationale: destiny.rationale ?? "" }, params.archetypeKey, params.viabilityNotes, rulesetPin);
    const genTimeout = Math.max(2_500, Math.min(BUILD_PLAN_GEN_TIMEOUT_MS, remainingAiBudgetMs()));
    if (genTimeout <= 2_500) throw new Error("ai_budget_exhausted:generator");
    const gen = await callAiGateway(env, model, genPrompt, genTimeout, 24_576);
    if (!gen.ok) throw new Error(gen.error);
    let raw = extractJsonPayload(gen.content);
    let rawGeneratorContent = gen.content;
    let rawReviewerContent = "";

    const revPrompt = buildReviewerPrompt(raw, params.input, rulesetPin);
    const revTimeout = Math.max(0, Math.min(BUILD_PLAN_REVIEW_TIMEOUT_MS, remainingAiBudgetMs()));
    if (revTimeout >= 2_500) {
      const rev = await callAiGateway(env, model, revPrompt, revTimeout, 24_576);
      if (rev.ok) {
        rawReviewerContent = rev.content;
        raw = extractJsonPayload(rev.content);
      }
    }

    let parsed: BuildPlanPayload;
    try {
      const obj = normalizeBuildPlanCandidate(JSON.parse(raw) as unknown);
      const safe = buildPlanPayloadSchema.safeParse(obj);
      if (!safe.success) throw new Error(`schema:${safe.error.message}`);
      const identity = coerceClassRaceSuggestions({
        classId: destiny.classId,
        raceSuggestion: safe.data.identity?.raceSuggestion ?? safe.data.race?.suggestion,
        factionSuggestion: safe.data.identity?.factionSuggestion,
      });
      parsed = sanitizeBuildPlanNames({
        ...safe.data,
        race: {
          ...safe.data.race,
          suggestion: identity.raceSuggestion,
        },
        identity: {
          ...safe.data.identity,
          raceSuggestion: identity.raceSuggestion,
          factionSuggestion: identity.factionSuggestion,
        },
        aiRaw: {
          generatorJson: rawGeneratorContent.slice(0, 50000),
          reviewerJson: rawReviewerContent.slice(0, 50000),
        },
      });
      parsed = deepStripFancyPunctuation(parsed);
      parsed = ensureMonolithicTalentLevelRail(parsed);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "parse_failed");
    }

    await db
      .update(buildPlans)
      .set({
        status: "ready",
        payloadJson: JSON.stringify(parsed),
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(buildPlans.id, params.buildPlanId));

    if (signalsHash) {
      try {
        // Store the cacheable subset only; aiRaw is per-generation and bloats the row.
        const { aiRaw: _omit, ...cacheable } = parsed as BuildPlanPayload & { aiRaw?: unknown };
        void _omit;
        await putFragment(env, {
          kind: "build_plan",
          classId: destiny.classId,
          archetypeKey: params.archetypeKey,
          signalsHash,
        }, cacheable);
        await captureServerEvent(env, AnalyticsEvent.AiFragmentCacheMiss, params.sessionId, {
          kind: "build_plan",
          classId: destiny.classId,
          archetypeKey: params.archetypeKey,
        });
      } catch {
        // Cache write is advisory.
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 500) : "build_failed";
    await db
      .update(buildPlans)
      .set({
        status: "failed",
        error: msg,
        updatedAt: new Date(),
      })
      .where(eq(buildPlans.id, params.buildPlanId));
  }
}

export async function loadDestinyRow(db: ReturnType<typeof getDb>, destinyId: string) {
  const rows = await db.select().from(destinies).where(eq(destinies.id, destinyId)).limit(1);
  return rows[0] ?? null;
}
