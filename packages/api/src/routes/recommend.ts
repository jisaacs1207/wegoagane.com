import { type Context, Hono } from "hono";
import { captureServerEvent } from "../analytics/posthog";
import { AnalyticsEvent } from "../analytics/events";
import { enrichDestiny, getAiGateStatus } from "../ai/adapter";
import { getDb, type ApiEnv } from "../db/client";
import { destinies, questionAnswers, recommendationLogs, sessions } from "../db/schema";
import { rankArchetypes } from "../domain/ranker";
import type { MemoryFeatures, MemoryRankingConfig } from "../domain/types";
import { renderTemplateDestiny } from "../domain/template";
import { recommendInputSchema, validateTemplateOutput } from "../domain/validator";

export const recommendRouter = new Hono<ApiEnv>();

function envFlag(value: string | boolean | undefined, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return value.toLowerCase() === "true";
}

function envNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function readMemoryConfig(c: Context<ApiEnv>): MemoryRankingConfig & { lookbackLimit: number } {
  return {
    enabled: envFlag(c.env.MEMORY_BIAS_ENABLED, true),
    browserWeight: envNumber(c.env.MEMORY_BROWSER_WEIGHT, 0.45),
    serverWeight: envNumber(c.env.MEMORY_SERVER_WEIGHT, 0.55),
    maxBias: envNumber(c.env.MEMORY_MAX_BIAS, 1.5),
    degradeMode: envFlag(c.env.MEMORY_DEGRADE_MODE, false),
    degradeScale: envNumber(c.env.MEMORY_DEGRADE_SCALE, 0.5),
    lookbackLimit: Math.max(10, Math.min(200, Math.floor(envNumber(c.env.MEMORY_LOOKBACK_LIMIT, 80)))),
  };
}

async function deriveServerMemory(
  db: D1Database,
  sessionId: string | undefined,
  lookbackLimit: number,
): Promise<MemoryFeatures> {
  if (!sessionId) {
    return { classAffinity: {}, rerollReasonCounts: {}, confidence: 0, sampleSize: 0 };
  }

  const rows = await db
    .prepare(
      `SELECT
        d.choice AS choice,
        d.reroll_reason AS reroll_reason,
        COALESCE(d.reroll_from_class_id, t.class_id) AS class_id
       FROM destiny_feedback d
       LEFT JOIN destinies t ON t.id = d.destiny_id
       WHERE d.session_id = ?1
       ORDER BY d.created_at DESC
       LIMIT ?2`,
    )
    .bind(sessionId, lookbackLimit)
    .all<{ choice: "accept" | "almost_right" | "miss"; reroll_reason: string | null; class_id: string | null }>();
  const confidenceRow = await db
    .prepare(
      `SELECT AVG(l.confidence_score) AS avg_confidence
       FROM recommendation_logs l
       INNER JOIN destinies d ON d.id = l.destiny_id
       WHERE d.session_id = ?1`,
    )
    .bind(sessionId)
    .first<{ avg_confidence: number | null }>();

  const counts: Record<string, { accept: number; almostRight: number; miss: number }> = {};
  const rerollReasonCounts: Record<string, number> = {};
  for (const row of rows.results ?? []) {
    if (row.class_id) {
      counts[row.class_id] ??= { accept: 0, almostRight: 0, miss: 0 };
      const bucket = counts[row.class_id];
      if (!bucket) continue;
      if (row.choice === "accept") bucket.accept += 1;
      if (row.choice === "almost_right") bucket.almostRight += 1;
      if (row.choice === "miss") bucket.miss += 1;
    }
    if (row.reroll_reason) {
      rerollReasonCounts[row.reroll_reason] = (rerollReasonCounts[row.reroll_reason] ?? 0) + 1;
    }
  }

  const classAffinity: Record<string, number> = {};
  let sampleSize = 0;
  for (const [classId, value] of Object.entries(counts)) {
    const denom = value.accept + value.almostRight + value.miss;
    if (denom <= 0) continue;
    sampleSize += denom;
    classAffinity[classId] = Number(((value.accept + value.almostRight * 0.35 - value.miss) / denom).toFixed(4));
  }

  const activityConfidence = Math.min(1, sampleSize / Math.max(lookbackLimit, 1));
  const logConfidence = Math.max(0, Math.min(1, confidenceRow?.avg_confidence ?? 0));
  return {
    classAffinity,
    rerollReasonCounts,
    confidence: Number(((activityConfidence + logConfidence) / 2).toFixed(4)),
    sampleSize,
  };
}

export async function handleRecommend(c: Context<ApiEnv>) {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const parsed = recommendInputSchema.safeParse(payload);
  if (!parsed.success) {
    c.executionCtx.waitUntil(
      captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, "anonymous", {
        reason: "invalid_input",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
        })),
      }),
    );
    return c.json({ error: "invalid_input" }, 400);
  }

  const input = parsed.data;
  try {
    const memoryConfig = readMemoryConfig(c);
    const serverMemory = await deriveServerMemory(c.env.DB, input.sessionId, memoryConfig.lookbackLimit);
    const ranking = rankArchetypes(input, {
      browserMemory: input.signals.memoryHints,
      serverMemory,
      config: memoryConfig,
    });
    const ranked = ranking.ranked;

    if (ranked.length === 0) {
      c.executionCtx.waitUntil(
        captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
          reason: "no_eligible_archetypes",
          entryPath: input.entryPath,
        }),
      );
      return c.json({ error: "no_eligible_archetypes" }, 400);
    }

    const top = ranked[0];
    if (!top) {
      c.executionCtx.waitUntil(
        captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
          reason: "no_ranked_candidate",
          entryPath: input.entryPath,
        }),
      );
      return c.json({ error: "no_ranked_candidate" }, 400);
    }
    const templateOutput = renderTemplateDestiny(top);
    const aiResult = await enrichDestiny(c.env, input, templateOutput);
    const output = aiResult.output;
    const failures =
      aiResult.validationFailures.length > 0
        ? aiResult.validationFailures
        : validateTemplateOutput(output, input.signals.factionPreference);
    if (failures.length > 0) {
      c.executionCtx.waitUntil(
        captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
          reason: "validation_failed",
          entryPath: input.entryPath,
          validationFailures: failures,
        }),
      );
      return c.json({ error: "validation_failed", failures }, 422);
    }

    const now = Date.now();
    const sessionId = input.sessionId ?? crypto.randomUUID();
    const destinyId = crypto.randomUUID();
    const db = getDb(c.env.DB);

    await db
      .insert(sessions)
      .values({
        id: sessionId,
        createdAt: new Date(now),
        entryPath: input.entryPath,
      })
      .onConflictDoNothing();

    const answers = Object.entries(input.signals)
      .filter(([, v]) => v !== undefined)
      .map(([key, value]) => ({
        sessionId,
        questionKey: key,
        answerValue: typeof value === "string" ? value : null,
        freeformText: key === "freeform" && typeof value === "string" ? value : null,
        skipped: false,
        createdAt: new Date(now),
      }));
    if (answers.length > 0) {
      await db.insert(questionAnswers).values(answers);
    }

    await db.insert(destinies).values({
      id: destinyId,
      sessionId,
      generatedAt: new Date(now),
      classId: output.classId,
      archetypeKey: top.archetype.key,
      tierProse: output.tierProse,
      contentJson: JSON.stringify(output),
      sourceType: output.sourceType,
    });

    const confidenceScore = Math.min(1, Math.max(0.1, top.score / 10));
    await db.insert(recommendationLogs).values({
      destinyId,
      selectedArchetype: top.archetype.key,
      rankingScore: top.score,
      confidenceScore,
      reasonsJson: JSON.stringify(top.reasons),
      validationFailures: failures.length,
      sourceType: output.sourceType,
      fallbackUsed: aiResult.telemetry.fallbackUsed,
      aiModelId: aiResult.telemetry.resolvedModelId ?? aiResult.telemetry.modelId,
      aiLatencyMs: aiResult.telemetry.latencyMs,
      aiRetries: aiResult.telemetry.retries,
      aiInputTokens: aiResult.telemetry.inputTokens,
      aiOutputTokens: aiResult.telemetry.outputTokens,
      aiErrorType: aiResult.telemetry.providerError,
      growthVariantId: input.signals.recommendVariantId ?? null,
      createdAt: new Date(now),
    });

    c.executionCtx.waitUntil(
      captureServerEvent(c.env, AnalyticsEvent.DestinyGenerated, sessionId, {
        destinyId,
        entryPath: input.entryPath,
        sourceType: output.sourceType,
        fallbackUsed: aiResult.telemetry.fallbackUsed,
        resolvedModelId: aiResult.telemetry.resolvedModelId,
        aiErrorType: aiResult.telemetry.providerError,
        aiLatencyMs: aiResult.telemetry.latencyMs,
        memoryEnabled: ranking.memoryMeta.enabled,
        memoryDegradeMode: ranking.memoryMeta.degradeMode,
        memoryBrowserWeight: ranking.memoryMeta.browserWeight,
        memoryServerWeight: ranking.memoryMeta.serverWeight,
        memoryBrowserConfidence: ranking.memoryMeta.browserConfidence,
        memoryServerConfidence: ranking.memoryMeta.serverConfidence,
        memoryAverageAppliedBias: ranking.memoryMeta.averageAppliedBias,
        memoryClampHits: ranking.memoryMeta.clampHits,
        selectedMemoryBias: top.memoryBiasApplied ?? 0,
        growthVariantId: input.signals.recommendVariantId ?? null,
      }),
    );

    return c.json({
      sessionId,
      destinyId,
      selectedArchetype: top.archetype.key,
      score: top.score,
      confidenceScore,
      reasons: top.reasons,
      sourceType: output.sourceType,
      fallbackUsed: aiResult.telemetry.fallbackUsed,
      validationFailures: failures,
      aiMeta: {
        gate: getAiGateStatus(c.env),
        providerError: aiResult.telemetry.providerError,
        modelId: aiResult.telemetry.modelId,
        resolvedModelId: aiResult.telemetry.resolvedModelId,
        latencyMs: aiResult.telemetry.latencyMs,
        retries: aiResult.telemetry.retries,
      },
      memoryMeta: {
        ...ranking.memoryMeta,
        selectedMemoryBias: top.memoryBiasApplied ?? 0,
        serverSampleSize: serverMemory.sampleSize,
      },
      output,
    });
  } catch (error) {
    c.executionCtx.waitUntil(
      captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
        reason: "recommend_internal_error",
        entryPath: input.entryPath,
        message: error instanceof Error ? error.message : "unknown_error",
      }),
    );
    return c.json({ error: "recommend_internal_error" }, 503);
  }
}

recommendRouter.post("/", handleRecommend);
