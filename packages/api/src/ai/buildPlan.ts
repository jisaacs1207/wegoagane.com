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

/** Keep prompt payloads bounded so gateway requests stay parseable even with huge client signals. */
const PROMPT_JSON_BUDGET = 12_000;
const REVIEWER_DRAFT_BUDGET = 120_000;

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

function buildGeneratorPrompt(
  input: RecommendInput,
  destiny: { headline: string; subline: string; classId: string; bullets: string[]; tierProse: string; rationale: string },
  archetypeKey: string,
  viabilityNotes: string[],
  rulesetPin: string,
): string {
  return [
    ...WOW_HC_JSON_GUARDS,
    "You are an expert on World of Warcraft Classic ERA HARDCORE (permanent death).",
    `Ruleset pin: ${rulesetPin}. Prefer accurate Classic Era talent NAMES and real profession pairings. If unsure, say so in warnings[].`,
    "Do not emit keys outside the schema. Keep arrays within stated limits so the reply stays one valid JSON object.",
    "Return ONE JSON object only matching this shape:",
    '{"v":1,"meta":{"publishTier":"draft","rulesetPin":"...","classId":"...","archetypeKey":"..."},"viabilityNotes":[],"warnings":[],"talents":{"summary":"...","keyPicks":[{"tier":"...","name":"talent name","rationale":"...","alternatives":[]}],"treeAllocations":[{"branch":"Feral","points":31},{"branch":"Restoration","points":20}],"path":[{"level":10,"branch":"Feral","talent":"Ferocity","rank":1,"rationale":"..."}]},"professions":{"primary":"...","secondary":"...","rationale":"...","secondarySkills":{"firstAid":"...","cooking":"...","fishing":"..."}},"stats":{"priority":["stamina","..."],"rationale":"..."},"race":{"suggestion":"...","rationale":"...","alternatives":[]},"identity":{"raceSuggestion":"...","factionSuggestion":"horde|alliance|neutral","genderLean":"masculine|feminine|neutral","buildFantasy":"...","archetypeSummary":"..."},"signature":{"tree":{"branch":"Holy|Protection|Retribution|Arms|Fury|...","weight":0.0},"strengths":["..."],"weaknesses":["..."],"whyDistinct":"...","keyItems":[{"name":"...","slot":"weapon|chest|trinket|...","rationale":"..."}]},"namesByLane":{"lore_world":["NameOne"],"hc_practical":[],"light_humor":[],"grimdark":[],"neutral":[],"pop_culture":[]},"forks":[{"title":"...","optionA":"...","optionB":"...","why":"..."}]}',
    "talents.treeAllocations + talents.path are REQUIRED when possible. Provide full or near-full leveling path (level 10 to 60 checkpoints) and realistic point allocations that sum to 51 by level 60.",
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
      await db
        .update(buildPlans)
        .set({
          status: "ready",
          payloadJson: JSON.stringify(cached),
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
    const gen = await callAiGateway(env, model, genPrompt, 95_000, 24_576);
    if (!gen.ok) throw new Error(gen.error);
    let raw = extractJsonPayload(gen.content);
    let rawGeneratorContent = gen.content;
    let rawReviewerContent = "";

    const revPrompt = buildReviewerPrompt(raw, params.input, rulesetPin);
    const rev = await callAiGateway(env, model, revPrompt, 95_000, 24_576);
    if (rev.ok) {
      rawReviewerContent = rev.content;
      raw = extractJsonPayload(rev.content);
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
