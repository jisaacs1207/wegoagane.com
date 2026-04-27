import { eq } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { captureServerEvent } from "../analytics/posthog";
import { AnalyticsEvent } from "../analytics/events";
import { callAiGateway, extractJsonPayload, getAiGateStatus, WOW_HC_JSON_GUARDS } from "../ai/adapter";
import { runBuildPlanGeneration, loadDestinyRow } from "../ai/buildPlan";
import { getDb, type ApiEnv } from "../db/client";
import { buildPlans } from "../db/schema";
import { filterValidNames } from "../domain/nameRules";
import { recommendInputSchema } from "../domain/validator";
import type { RecommendInput } from "../domain/types";
import { computeViability } from "../domain/viability";

const postBodySchema = z.object({
  destinyId: z.string().min(1).max(80),
  sessionId: z.string().min(1).max(80),
  recommendInput: recommendInputSchema.optional(),
});
const generateNamesSchema = z.object({
  sessionId: z.string().min(1).max(120),
  destinyId: z.string().min(1).max(120).optional(),
  style: z.enum(["lore_world", "hc_practical", "light_humor", "grimdark", "neutral", "pop_culture"]).optional(),
  count: z.number().int().min(4).max(18).optional(),
  rerollSeed: z.string().max(80).optional(),
  currentName: z.string().max(80).optional(),
  mode: z.enum(["default", "reflective", "high_variance", "humor"]).optional(),
  variance: z.number().min(0).max(1).optional(),
  context: z.string().max(600).optional(),
});

export const buildRouter = new Hono<ApiEnv>();

type BuildPlanRow = typeof buildPlans.$inferSelect;
const FAILED_RETRY_COOLDOWN_MS = 8_000;
const STALE_IN_PROGRESS_REQUEUE_MS = 45_000;

function asBuildResponse(row: BuildPlanRow) {
  let plan: unknown = null;
  if (row.payloadJson) {
    try {
      plan = JSON.parse(row.payloadJson) as unknown;
    } catch {
      plan = null;
    }
  }
  return {
    buildPlanId: row.id,
    destinyId: row.destinyId,
    sessionId: row.sessionId,
    status: row.status,
    publishTier: row.publishTier,
    plan,
    error: row.error,
  };
}

/** Whether a queued/generating row is old enough to treat as abandoned work. */
export function isStaleInProgressBuildPlan(row: Pick<BuildPlanRow, "status" | "updatedAt">, nowMs = Date.now()): boolean {
  if (row.status !== "queued" && row.status !== "generating") return false;
  const lastUpdateMs = row.updatedAt?.getTime?.() ?? 0;
  if (!Number.isFinite(lastUpdateMs) || lastUpdateMs <= 0) return true;
  return nowMs - lastUpdateMs > STALE_IN_PROGRESS_REQUEUE_MS;
}

export async function handlePostBuild(c: Context<ApiEnv>) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const { destinyId, sessionId, recommendInput } = parsed.data;
  const db = getDb(c.env.DB);

  const destiny = await loadDestinyRow(db, destinyId);
  if (!destiny || destiny.sessionId !== sessionId) {
    return c.json({ error: "destiny_not_found" }, 404);
  }

  const existing = await db.select().from(buildPlans).where(eq(buildPlans.destinyId, destinyId)).limit(1);
  const row = existing[0];
  if (row) {
    if (row.status === "ready") return c.json(asBuildResponse(row));
    if (row.status === "generating" || row.status === "queued") {
      return c.json(asBuildResponse(row), 202);
    }
    if (row.status === "failed") {
      c.executionCtx.waitUntil(
        enqueueBuildPlanGeneration(
          c.env,
          row.id,
          destinyId,
          sessionId,
          destiny.archetypeKey,
          destiny.contentJson,
          recommendInput,
        ),
      );
      return c.json(asBuildResponse(row), 202);
    }
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const rulesetPin = (c.env.RULESET_PIN ?? "classic-era-hc-2026-04").slice(0, 120);
  const signalsJson = recommendInput ? JSON.stringify(recommendInput) : null;

  await db.insert(buildPlans).values({
    id,
    destinyId,
    sessionId,
    status: "queued",
    publishTier: "draft",
    rulesetPin,
    signalsJson,
    payloadJson: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  });

  const created = (await db.select().from(buildPlans).where(eq(buildPlans.id, id)).limit(1))[0];
  if (!created) return c.json({ error: "build_create_failed" }, 500);

  c.executionCtx.waitUntil(
    enqueueBuildPlanGeneration(c.env, id, destinyId, sessionId, destiny.archetypeKey, destiny.contentJson, recommendInput),
  );

  c.executionCtx.waitUntil(
    captureServerEvent(c.env, AnalyticsEvent.BuildPlanStarted, sessionId, {
      buildPlanId: id,
      destinyId,
    }),
  );

  return c.json(asBuildResponse(created), 201);
}

/** Starts or resumes AI build generation (also called from recommend after insert). */
export async function enqueueBuildPlanGeneration(
  env: ApiEnv["Bindings"],
  buildPlanId: string,
  destinyId: string,
  sessionId: string,
  archetypeKey: string,
  contentJson: string,
  recommendInput?: RecommendInput,
) {
  let input: RecommendInput;
  if (recommendInput) {
    input = recommendInput;
  } else {
    const db = getDb(env.DB);
    const row = (await db.select().from(buildPlans).where(eq(buildPlans.id, buildPlanId)).limit(1))[0];
    if (row?.signalsJson) {
      try {
        input = JSON.parse(row.signalsJson) as RecommendInput;
      } catch {
        input = {
          entryPath: "draft_a_run",
          signals: {},
        };
      }
    } else {
      input = { entryPath: "draft_a_run", signals: {} };
    }
  }

  let destinyContent: Record<string, unknown>;
  try {
    destinyContent = JSON.parse(contentJson) as Record<string, unknown>;
  } catch {
    destinyContent = {};
  }

  const viability = computeViability(input);
  await runBuildPlanGeneration(env, {
    destinyId,
    sessionId,
    input,
    archetypeKey,
    destinyContent,
    viabilityNotes: viability.notes,
    buildPlanId,
  });

  const db = getDb(env.DB);
  const done = (await db.select().from(buildPlans).where(eq(buildPlans.id, buildPlanId)).limit(1))[0];
  if (done?.status === "ready") {
    await captureServerEvent(env, AnalyticsEvent.BuildPlanReady, sessionId, {
      buildPlanId,
      destinyId,
    });
  } else {
    await captureServerEvent(env, AnalyticsEvent.BuildPlanFailed, sessionId, {
      buildPlanId,
      destinyId,
      error: done?.error ?? "unknown",
    });
  }
}

export async function handleGetBuild(c: Context<ApiEnv>) {
  const destinyId = c.req.param("destinyId");
  if (!destinyId) return c.json({ error: "invalid_destiny_id" }, 400);
  const db = getDb(c.env.DB);
  const rows = await db.select().from(buildPlans).where(eq(buildPlans.destinyId, destinyId)).limit(1);
  const row = rows[0];
  if (!row) return c.json({ error: "build_not_found" }, 404);
  if (isStaleInProgressBuildPlan(row)) {
    const destiny = await loadDestinyRow(db, destinyId);
    if (destiny && destiny.sessionId === row.sessionId) {
      await db
        .update(buildPlans)
        .set({ status: "queued", error: null, updatedAt: new Date() })
        .where(eq(buildPlans.id, row.id));
      c.executionCtx.waitUntil(
        enqueueBuildPlanGeneration(
          c.env,
          row.id,
          destinyId,
          row.sessionId,
          destiny.archetypeKey,
          destiny.contentJson,
        ),
      );
      return c.json({ ...asBuildResponse(row), status: "queued", error: null }, 202);
    }
    // Stale in-progress row cannot be resumed (orphaned destiny/session mismatch). Mark terminal
    // failed so commit-page polling exits instead of spinning forever.
    await db
      .update(buildPlans)
      .set({
        status: "failed",
        error: row.error ?? "stale_in_progress_unrecoverable",
        updatedAt: new Date(),
      })
      .where(eq(buildPlans.id, row.id));
    return c.json({ ...asBuildResponse(row), status: "failed", error: row.error ?? "stale_in_progress_unrecoverable" });
  }
  if (row.status === "failed") {
    const now = Date.now();
    const lastUpdate = row.updatedAt?.getTime?.() ?? 0;
    // Auto-heal failed plans when polled by client, but avoid rapid retry storms.
    if (now - lastUpdate > FAILED_RETRY_COOLDOWN_MS) {
      const destiny = await loadDestinyRow(db, destinyId);
      if (destiny && destiny.sessionId === row.sessionId) {
        await db
          .update(buildPlans)
          .set({ status: "queued", error: null, updatedAt: new Date() })
          .where(eq(buildPlans.id, row.id));
        c.executionCtx.waitUntil(
          enqueueBuildPlanGeneration(
            c.env,
            row.id,
            destinyId,
            row.sessionId,
            destiny.archetypeKey,
            destiny.contentJson,
          ),
        );
        return c.json({ ...asBuildResponse(row), status: "queued", error: null }, 202);
      }
    }
  }
  return c.json(asBuildResponse(row));
}

export async function handleGetNames(c: Context<ApiEnv>) {
  const lane = c.req.query("lane");
  const genderLean = c.req.query("genderLean");
  const limit = Math.min(40, Math.max(1, Number(c.req.query("limit") ?? "20") || 20));

  let res: { results?: Array<{ lane: string; genderLean: string | null; name: string }> };
  if (lane && genderLean) {
    res = await c.env.DB.prepare(
      "SELECT lane, gender_lean AS genderLean, name FROM character_name_candidates WHERE source IN ('seed','approved') AND moderated = 1 AND lane = ?1 AND (gender_lean IS NULL OR gender_lean = ?2) ORDER BY quality_score DESC LIMIT ?3",
    )
      .bind(lane, genderLean, limit)
      .all();
  } else if (lane) {
    res = await c.env.DB.prepare(
      "SELECT lane, gender_lean AS genderLean, name FROM character_name_candidates WHERE source IN ('seed','approved') AND moderated = 1 AND lane = ?1 ORDER BY quality_score DESC LIMIT ?2",
    )
      .bind(lane, limit)
      .all();
  } else {
    res = await c.env.DB.prepare(
      "SELECT lane, gender_lean AS genderLean, name FROM character_name_candidates WHERE source IN ('seed','approved') AND moderated = 1 ORDER BY quality_score DESC LIMIT ?1",
    )
      .bind(limit)
      .all();
  }

  return c.json({ names: res.results ?? [] });
}

function titleCase(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function fallbackGeneratedNames(seed: string, count: number): string[] {
  const prefixes = ["Ash", "Stone", "Frost", "Dusk", "Iron", "Rune", "Grim", "Storm", "Wild", "Ember"];
  const suffixes = ["veil", "ward", "rend", "moor", "blade", "hold", "fang", "crest", "weave", "bloom"];
  const out: string[] = [];
  for (let i = 0; i < count * 3 && out.length < count; i += 1) {
    const a = prefixes[(seed.length + i * 3) % prefixes.length];
    const b = suffixes[(seed.charCodeAt(i % Math.max(1, seed.length)) + i) % suffixes.length];
    const n = titleCase(`${a}${b}`);
    if (filterValidNames([n]).length === 0) continue;
    if (out.includes(n)) continue;
    out.push(n);
  }
  return out;
}

function makeHighVariance(base: string): string[] {
  const forms = [
    base,
    base.replace(/a/gi, "ae"),
    base.replace(/i/gi, "y"),
    `X${base}`,
    `${base}x`,
    base.replace(/o/gi, "oa"),
  ];
  return forms.map((x) => titleCase(x)).filter((n) => filterValidNames([n]).length > 0);
}

export async function handlePostGenerateNames(c: Context<ApiEnv>) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const parsed = generateNamesSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const data = parsed.data;
  const count = data.count ?? 10;
  const gate = getAiGateStatus(c.env);
  const seed = `${data.sessionId}|${data.destinyId ?? ""}|${data.style ?? "neutral"}|${data.rerollSeed ?? ""}`;
  const mode = data.mode ?? "default";
  const variance = Math.max(0, Math.min(1, data.variance ?? 0.35));

  if (!gate.ready) {
    const fallbackBase = fallbackGeneratedNames(seed, count);
    const fallback = mode === "high_variance" ? Array.from(new Set(fallbackBase.flatMap((n) => makeHighVariance(n)))).slice(0, count) : fallbackBase;
    return c.json({ names: fallback.map((name) => ({ lane: data.style ?? "neutral", genderLean: null, name })), aiUsed: false });
  }

  const prompt = [
    ...WOW_HC_JSON_GUARDS,
    "Return JSON with a single key `names` containing an array of character names.",
    "Rules: ASCII letters only, 2-12 chars, no spaces, no punctuation, no numbers.",
    "Use World of Warcraft Classic ERA HARDCORE-appropriate fantasy naming; avoid exact known lore hero names.",
    "Names should be original and practical for availability.",
    `Requested style lane: ${data.style ?? "neutral"}.`,
    `Mode: ${mode}.`,
    `Variance target (0..1): ${variance.toFixed(2)}.`,
    `Count: ${count}.`,
    `Current name to avoid repeating: ${data.currentName ?? "none"}.`,
    `Reroll seed: ${data.rerollSeed ?? "none"}.`,
    `Context hints from player choices: ${data.context ?? "none"}.`,
    mode === "humor"
      ? "Humor mode: produce playful but believable in-game names inspired by class fantasy and WoW community culture."
      : "Keep names immersive and setting-coherent.",
  ].join("\n");

  const ai = await callAiGateway(c.env, c.env.AI_MODEL_DESTINY ?? "openrouter/auto", prompt, 12_000, 2048);
  if (!ai.ok) {
    const fallbackBase = fallbackGeneratedNames(seed, count);
    const fallback = mode === "high_variance" ? Array.from(new Set(fallbackBase.flatMap((n) => makeHighVariance(n)))).slice(0, count) : fallbackBase;
    return c.json({ names: fallback.map((name) => ({ lane: data.style ?? "neutral", genderLean: null, name })), aiUsed: false });
  }
  let parsedAi: { names?: unknown } = {};
  try {
    parsedAi = JSON.parse(extractJsonPayload(ai.content)) as { names?: unknown };
  } catch {
    parsedAi = {};
  }
  const rawList = Array.isArray(parsedAi.names) ? parsedAi.names : [];
  const aiRaw = filterValidNames(rawList.map((n) => titleCase(String(n).trim())));
  const withVariance = mode === "high_variance" ? Array.from(new Set(aiRaw.flatMap((n) => makeHighVariance(n)))) : aiRaw;
  const unique = Array.from(new Set(withVariance));
  const names = unique.slice(0, count);
  if (names.length === 0) {
    const fallback = fallbackGeneratedNames(seed, count);
    return c.json({ names: fallback.map((name) => ({ lane: data.style ?? "neutral", genderLean: null, name })), aiUsed: false });
  }
  return c.json({ names: names.map((name) => ({ lane: data.style ?? "neutral", genderLean: null, name })), aiUsed: true });
}

buildRouter.post("/", handlePostBuild);
buildRouter.post("/names/generate", handlePostGenerateNames);
buildRouter.get("/names", handleGetNames);
buildRouter.get("/:destinyId", handleGetBuild);
