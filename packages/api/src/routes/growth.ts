import { and, desc, eq, inArray } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { AnalyticsEvent } from "../analytics/events";
import { captureServerEvent } from "../analytics/posthog";
import { getDb, type ApiEnv } from "../db/client";
import {
  growthAssignments,
  growthDecisions,
  growthExperimentVariants,
  growthExperiments,
  growthRuns,
  growthVariants,
} from "../db/schema";
import type { GrowthDecisionAction, GrowthSurface, GrowthVariantPayload } from "../domain/types";
import { growthAssignInputSchema, growthOutcomeInputSchema } from "../domain/validator";

export const growthRouter = new Hono<ApiEnv>();

function isTruthy(value: string | boolean | undefined, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return value.toLowerCase() === "true";
}

function isControlAuthorized(c: Context<ApiEnv>): boolean {
  const token = c.env.GROWTH_CONTROL_TOKEN;
  const incoming = c.req.header("x-growth-control-token");
  if (token && incoming === token) return true;
  if ((c.env.APP_ENV ?? "dev") !== "production" && !token) return true;
  return false;
}

function requireControlAuth(c: Context<ApiEnv>): Response | null {
  if (isControlAuthorized(c)) return null;
  return c.json({ error: "forbidden" }, 403);
}

function jsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function hashPayload(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return `v${(h >>> 0).toString(16)}`;
}

function checkGuardrails(payload: GrowthVariantPayload): { pass: boolean; notes: string[] } {
  const banned = ["pay to win", "toxic", "slur"];
  const notes: string[] = [];
  const text = [payload.headline, payload.subline, payload.ctaPrimary, payload.ctaSecondary, payload.sharePromptPrefix]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const term of banned) if (text.includes(term)) notes.push(`banned_phrase:${term}`);
  if (payload.headline && payload.headline.length > 90) notes.push("headline_too_long");
  if (payload.ctaPrimary && payload.ctaPrimary.length > 32) notes.push("cta_primary_too_long");
  if (payload.provenance?.scrapedFrom) notes.push("scraped_source_not_allowed_v1");
  if (payload.provenance?.assetSource === "unknown") notes.push("unknown_asset_source");
  if (payload.provenance?.assetSource === "community_licensed" && !payload.provenance.licenseTag) {
    notes.push("missing_license_tag");
  }
  return { pass: notes.length === 0, notes };
}

function buildFallbackCandidates(surface: GrowthSurface): GrowthVariantPayload[] {
  if (surface === "ui" || surface === "onboarding") {
    return [
      { headline: "Choose your next hardcore path", subline: "Fast, subtle, tuned by your outcomes.", ctaPrimary: "Find my path", ctaSecondary: "Surprise me" },
      { headline: "One clean decision, zero noise", subline: "The system adapts from your accept vs reroll behavior.", ctaPrimary: "Draft my run", ctaSecondary: "Lucky roll" },
    ];
  }
  if (surface === "share") return [{ sharePromptPrefix: "Hardcore legacy:" }, { sharePromptPrefix: "Another run, another oath:" }];
  if (surface === "recommendation") return [{ rankerTweaks: { preferredClassBoost: 0.2, memoryWeightScale: 1.05 } }, { rankerTweaks: { preferredClassBoost: 0.35, memoryWeightScale: 0.95 } }];
  return [{ personaCombo: { playstyle: "safe_grinder", professionFocus: "alchemy_herbalism" } }, { personaCombo: { playstyle: "social_anchor", professionFocus: "tailoring_enchanting" } }];
}

function growthExperimentDefaultsFromEnv(env: ApiEnv["Bindings"] | undefined) {
  const traffic = Math.min(100, Math.max(0, Math.floor(Number(env?.GROWTH_DEFAULT_TRAFFIC_PERCENT ?? "25"))));
  const holdout = Math.min(100, Math.max(0, Math.floor(Number(env?.GROWTH_DEFAULT_HOLDOUT_PERCENT ?? "10"))));
  const minSample = Math.min(500, Math.max(5, Math.floor(Number(env?.GROWTH_MIN_SAMPLE_SIZE ?? "40"))));
  return { traffic, holdout, minSample };
}

async function ensureRunningExperiment(db: ReturnType<typeof getDb>, surface: GrowthSurface, env?: ApiEnv["Bindings"]) {
  const active = await db
    .select()
    .from(growthExperiments)
    .where(and(eq(growthExperiments.surface, surface), eq(growthExperiments.status, "running")))
    .limit(1);
  if (active[0]) return active[0];
  const id = crypto.randomUUID();
  const now = new Date();
  const d = growthExperimentDefaultsFromEnv(env);
  await db.insert(growthExperiments).values({
    id,
    surface,
    name: `${surface}-autogen`,
    status: "running",
    holdoutPercent: d.holdout,
    trafficPercent: d.traffic,
    minSampleSize: d.minSample,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  const created = await db.select().from(growthExperiments).where(eq(growthExperiments.id, id)).limit(1);
  return created[0]!;
}

export async function handleGenerateCandidates(c: Context<ApiEnv>) {
  if (c.req.query("authProbe") === "true") {
    return c.json({ ok: true, auth: "passed", route: "generate" });
  }
  const surface = (c.req.query("surface") ?? "ui") as GrowthSurface;
  const count = Math.max(1, Math.min(8, Number(c.req.query("count") ?? "3")));
  const now = new Date();
  const db = getDb(c.env.DB);
  const runId = crypto.randomUUID();
  await db.insert(growthRuns).values({ id: runId, runType: "candidate_generation", status: "running", inputJson: JSON.stringify({ surface, count }), startedAt: now, createdAt: now });
  const candidates = buildFallbackCandidates(surface).slice(0, count);
  const insertedIds: string[] = [];
  for (const payload of candidates) {
    const payloadJson = JSON.stringify(payload);
    const payloadHash = hashPayload(payloadJson);
    const dupe = await db.select({ id: growthVariants.id }).from(growthVariants).where(eq(growthVariants.payloadHash, payloadHash)).limit(1);
    if (dupe[0]) continue;
    const guardrail = checkGuardrails(payload);
    const id = crypto.randomUUID();
    await db.insert(growthVariants).values({
      id,
      surface,
      variantType: surface === "recommendation" ? "ranker_policy" : surface === "share" ? "share_prompt" : "copy",
      status: guardrail.pass ? "validated" : "draft",
      promptVersion: "growth-v1",
      promptText: "fallback_template_generator",
      payloadJson,
      payloadHash,
      noveltyScore: 0.6,
      guardrailStatus: guardrail.pass ? "pass" : "fail",
      guardrailNotes: guardrail.notes.join(","),
      createdAt: now,
      updatedAt: now,
    });
    insertedIds.push(id);
  }
  const experiment = await ensureRunningExperiment(db, surface, c.env);
  for (const variantId of insertedIds) {
    await db.insert(growthExperimentVariants).values({ experimentId: experiment.id, variantId, weight: 1, createdAt: now });
  }
  await db.update(growthRuns).set({ status: "completed", outputJson: JSON.stringify({ insertedIds }), finishedAt: new Date() }).where(eq(growthRuns.id, runId));
  c.executionCtx.waitUntil(captureServerEvent(c.env, AnalyticsEvent.GrowthCandidatesGenerated, "growth_engine", { runId, surface, inserted: insertedIds.length, experimentId: experiment.id }));
  return c.json({ runId, surface, experimentId: experiment.id, insertedIds });
}

function weightedPick(rows: Array<{ variantId: string; weight: number }>): string | null {
  if (!rows.length) return null;
  const total = rows.reduce((sum, r) => sum + Math.max(0.001, r.weight), 0);
  let t = Math.random() * total;
  for (const row of rows) {
    t -= Math.max(0.001, row.weight);
    if (t <= 0) return row.variantId;
  }
  return rows[rows.length - 1]?.variantId ?? null;
}

export async function handleAssignVariant(c: Context<ApiEnv>) {
  const input = growthAssignInputSchema.parse(await c.req.json());
  const db = getDb(c.env.DB);
  const now = new Date();
  const experiment = await ensureRunningExperiment(db, input.surface, c.env);
  const links = await db.select({ variantId: growthExperimentVariants.variantId, weight: growthExperimentVariants.weight }).from(growthExperimentVariants).where(eq(growthExperimentVariants.experimentId, experiment.id));
  const holdout = Math.random() * 100 < experiment.holdoutPercent;
  const inTraffic = Math.random() * 100 < experiment.trafficPercent;
  const variantId = !holdout && inTraffic ? weightedPick(links) : null;
  const assignmentId = crypto.randomUUID();
  await db.insert(growthAssignments).values({
    id: assignmentId,
    experimentId: experiment.id,
    variantId,
    surface: input.surface,
    sessionId: input.sessionId,
    entryPath: input.entryPath ?? null,
    assignedAt: now,
    seenAt: now,
    createdAt: now,
  });
  const row = variantId ? (await db.select({ payloadJson: growthVariants.payloadJson }).from(growthVariants).where(eq(growthVariants.id, variantId)).limit(1))[0] : null;
  const payload = row ? jsonParse<GrowthVariantPayload>(row.payloadJson, {}) : null;
  c.executionCtx.waitUntil(captureServerEvent(c.env, AnalyticsEvent.GrowthAssignmentServed, input.sessionId, { assignmentId, surface: input.surface, experimentId: experiment.id, variantId, holdout, inTraffic }));
  return c.json({ assignmentId, sessionId: input.sessionId, surface: input.surface, variantId, experimentId: experiment.id, payload, holdout });
}

export async function handleGrowthOutcome(c: Context<ApiEnv>) {
  const input = growthOutcomeInputSchema.parse(await c.req.json());
  const now = new Date();
  const db = getDb(c.env.DB);
  await db.update(growthAssignments).set({ convertedAt: input.converted ? now : null, outcomeJson: input.outcome ? JSON.stringify(input.outcome) : null }).where(eq(growthAssignments.id, input.assignmentId));
  return c.json({ ok: true });
}

function standardNormalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

function twoPropPValue(successA: number, totalA: number, successB: number, totalB: number): number {
  if (totalA <= 0 || totalB <= 0) return 1;
  const pPool = (successA + successB) / (totalA + totalB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / totalA + 1 / totalB));
  if (!Number.isFinite(se) || se === 0) return 1;
  const z = successA / totalA - successB / totalB;
  const zScore = z / se;
  return Math.min(1, Math.max(0, 2 * (1 - standardNormalCdf(Math.abs(zScore)))));
}

function decide(
  sampleSize: number,
  acceptRate: number,
  rerollsPerSession: number,
  postAcceptRatingAvg: number,
  validationFailureRate: number,
  baseline: { sampleSize: number; acceptRate: number } | null,
  minSampleSize: number,
): { action: GrowthDecisionAction; reason: string } {
  if (sampleSize < minSampleSize) return { action: "hold", reason: "under_sampled" };
  if (validationFailureRate > 0.12) return { action: "retire", reason: "validation_failures_high" };
  if (acceptRate >= 0.56 && rerollsPerSession <= 0.55 && postAcceptRatingAvg >= 3.2) {
    if (baseline && baseline.sampleSize >= minSampleSize) {
      const pValue = twoPropPValue(Math.round(acceptRate * sampleSize), sampleSize, Math.round(baseline.acceptRate * baseline.sampleSize), baseline.sampleSize);
      if (acceptRate <= baseline.acceptRate || pValue > 0.1) return { action: "hold", reason: "not_significant_vs_baseline" };
    }
    return { action: "promote", reason: "beats_thresholds" };
  }
  if (acceptRate < 0.38 || rerollsPerSession > 1.2) return { action: "retire", reason: "underperform_floor" };
  return { action: "hold", reason: "stat_unclear" };
}

export async function handlePromoteTick(c: Context<ApiEnv>) {
  if (c.req.query("authProbe") === "true") {
    return c.json({ ok: true, auth: "passed", route: "promote" });
  }
  const db = getDb(c.env.DB);
  const hardStopEnabled = isTruthy(c.env.GROWTH_HARD_STOP_ENABLED, true);
  const minSampleSize = Math.min(500, Math.max(5, Math.floor(Number(c.env.GROWTH_MIN_SAMPLE_SIZE ?? "40"))));
  const now = new Date();
  const active = await db
    .select({ id: growthVariants.id, surface: growthVariants.surface })
    .from(growthVariants)
    .where(inArray(growthVariants.status, ["validated", "active", "promoted"]));
  const decisions: Array<{ variantId: string; action: GrowthDecisionAction; reason: string }> = [];
  for (const item of active) {
    const agg = await c.env.DB
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM growth_assignments WHERE variant_id = ?1) AS sample_size,
          (SELECT AVG(CASE WHEN choice='accept' THEN 1 ELSE 0 END) FROM destiny_feedback f JOIN recommendation_logs r ON r.destiny_id=f.destiny_id WHERE r.growth_variant_id = ?1) AS accept_rate,
          (SELECT AVG(CASE WHEN choice IN ('almost_right','miss') THEN 1 ELSE 0 END) FROM destiny_feedback f JOIN recommendation_logs r ON r.destiny_id=f.destiny_id WHERE r.growth_variant_id = ?1) AS reroll_rate,
          (SELECT AVG(CASE WHEN post_accept_rating='not_this' THEN 1 WHEN post_accept_rating='itll_do' THEN 2 WHEN post_accept_rating='good_pick' THEN 3 WHEN post_accept_rating='this_is_it' THEN 4 WHEN post_accept_rating='perfect' THEN 5 ELSE NULL END) FROM destiny_feedback f JOIN recommendation_logs r ON r.destiny_id=f.destiny_id WHERE r.growth_variant_id = ?1) AS rating_avg,
          (SELECT AVG(validation_failures) FROM recommendation_logs WHERE growth_variant_id = ?1) AS vf`,
      )
      .bind(item.id)
      .first<{ sample_size: number | null; accept_rate: number | null; reroll_rate: number | null; rating_avg: number | null; vf: number | null }>();
    const sampleSize = Number(agg?.sample_size ?? 0);
    const acceptRate = Number(agg?.accept_rate ?? 0);
    const rerollsPerSession = Number(agg?.reroll_rate ?? 0);
    const postAcceptRatingAvg = Number(agg?.rating_avg ?? 0);
    const validationFailureRate = Number(agg?.vf ?? 0);
    const baselineIdRow = await db
      .select({ id: growthVariants.id })
      .from(growthVariants)
      .where(and(eq(growthVariants.surface, item.surface), eq(growthVariants.status, "promoted")))
      .limit(1);
    let baseline: { sampleSize: number; acceptRate: number } | null = null;
    if (baselineIdRow[0] && baselineIdRow[0].id !== item.id) {
      const baselineAgg = await c.env.DB
        .prepare(
          `SELECT
            (SELECT COUNT(*) FROM growth_assignments WHERE variant_id = ?1) AS sample_size,
            (SELECT AVG(CASE WHEN choice='accept' THEN 1 ELSE 0 END) FROM destiny_feedback f JOIN recommendation_logs r ON r.destiny_id=f.destiny_id WHERE r.growth_variant_id = ?1) AS accept_rate`,
        )
        .bind(baselineIdRow[0].id)
        .first<{ sample_size: number | null; accept_rate: number | null }>();
      baseline = {
        sampleSize: Number(baselineAgg?.sample_size ?? 0),
        acceptRate: Number(baselineAgg?.accept_rate ?? 0),
      };
    }

    const decision = decide(sampleSize, acceptRate, rerollsPerSession, postAcceptRatingAvg, validationFailureRate, baseline, minSampleSize);
    decisions.push({ variantId: item.id, action: decision.action, reason: decision.reason });
    await db.update(growthVariants).set({
      status: decision.action === "promote" ? "promoted" : decision.action === "retire" ? "retired" : "active",
      sampleSize,
      acceptRate,
      rerollsPerSession,
      postAcceptRatingAvg,
      validationFailureRate,
      promotedAt: decision.action === "promote" ? now : null,
      retiredAt: decision.action === "retire" ? now : null,
      updatedAt: now,
    }).where(eq(growthVariants.id, item.id));
    await db.insert(growthDecisions).values({
      id: crypto.randomUUID(),
      variantId: item.id,
      action: decision.action,
      reason: decision.reason,
      metricsJson: JSON.stringify({ sampleSize, acceptRate, rerollsPerSession, postAcceptRatingAvg, validationFailureRate }),
      thresholdJson: JSON.stringify({
        minSampleSize,
        promote: { acceptRate: 0.56, rerollsPerSession: 0.55, postAcceptRatingAvg: 3.2 },
        retire: { acceptRateFloor: 0.38, rerollsPerSessionCeiling: 1.2 },
        maxValidationFailureRate: 0.12,
      }),
      createdAt: now,
    });
    c.executionCtx.waitUntil(captureServerEvent(c.env, AnalyticsEvent.GrowthDecisionMade, "growth_engine", { variantId: item.id, action: decision.action, reason: decision.reason }));
  }
  const hardStop = decisions.some((d) => d.action === "retire");
  if (hardStop && hardStopEnabled) {
    await db.update(growthExperiments).set({ status: "paused", updatedAt: now }).where(eq(growthExperiments.status, "running"));
    c.executionCtx.waitUntil(captureServerEvent(c.env, AnalyticsEvent.GrowthHardStopTriggered, "growth_engine", { reason: "retire_detected_in_tick" }));
  }
  return c.json({ evaluated: decisions.length, hardStop, decisions });
}

export async function handleGrowthHealth(c: Context<ApiEnv>) {
  const db = getDb(c.env.DB);
  const running = await db.select({ id: growthExperiments.id, surface: growthExperiments.surface }).from(growthExperiments).where(eq(growthExperiments.status, "running"));
  const variants = await db.select({ id: growthVariants.id }).from(growthVariants);
  const decisionRows = await db.select().from(growthDecisions).orderBy(desc(growthDecisions.createdAt)).limit(15);
  return c.json({
    experimentsRunning: running.length,
    runningBySurface: running,
    variantsTotal: variants.length,
    recentDecisions: decisionRows.map((r) => ({ variantId: r.variantId, action: r.action, reason: r.reason, createdAt: r.createdAt })),
  });
}

export async function handleFullAutoTick(c: Context<ApiEnv>) {
  if (c.req.query("authProbe") === "true") {
    return c.json({ ok: true, auth: "passed" });
  }
  await handleGenerateCandidates(c);
  return handlePromoteTick(c);
}

growthRouter.use("/generate", async (c, next) => {
  const denied = requireControlAuth(c);
  if (denied) return denied;
  await next();
});

growthRouter.use("/promote", async (c, next) => {
  const denied = requireControlAuth(c);
  if (denied) return denied;
  await next();
});

growthRouter.use("/tick", async (c, next) => {
  const denied = requireControlAuth(c);
  if (denied) return denied;
  await next();
});

growthRouter.post("/generate", handleGenerateCandidates);
growthRouter.post("/assign", handleAssignVariant);
growthRouter.post("/outcome", handleGrowthOutcome);
growthRouter.post("/promote", handlePromoteTick);
growthRouter.get("/health", handleGrowthHealth);
growthRouter.post("/tick", handleFullAutoTick);
