import { type Context, Hono } from "hono";
import { captureServerEvent } from "../analytics/posthog";
import { AnalyticsEvent } from "../analytics/events";
import { buildExperimentalRankedArchetype } from "../ai/experimentalArchetype";
import { enrichDestiny, getAiGateStatus } from "../ai/adapter";
import { getDb, type ApiEnv } from "../db/client";
import { archetypes } from "../domain/archetypes";
import { buildPlans, destinies, questionAnswers, recommendationLogs, sessions } from "../db/schema";
import { rankArchetypes } from "../domain/ranker";
import type { MemoryFeatures, MemoryRankingConfig, RankedArchetype } from "../domain/types";
import { renderTemplateDestiny } from "../domain/template";
import { recommendInputSchema, validateTemplateOutput } from "../domain/validator";
import { computeRelaxedViability, computeViability, filterArchetypesByViability } from "../domain/viability";
import { enqueueBuildPlanGeneration } from "./build";

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
    return { classAffinity: {}, rerollReasonCounts: {}, recentArchetypeKeys: [], confidence: 0, sampleSize: 0 };
  }

  let rows: { results?: Array<{ choice: "accept" | "almost_right" | "miss"; reroll_reason: string | null; class_id: string | null }> };
  let confidenceRow: { avg_confidence: number | null } | null = null;
  let recentArchetypes: { results?: Array<{ archetype_key: string | null }> };
  try {
    rows = await db
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
    confidenceRow = await db
      .prepare(
        `SELECT AVG(l.confidence_score) AS avg_confidence
         FROM recommendation_logs l
         INNER JOIN destinies d ON d.id = l.destiny_id
         WHERE d.session_id = ?1`,
      )
      .bind(sessionId)
      .first<{ avg_confidence: number | null }>();
    recentArchetypes = await db
      .prepare(
        `SELECT archetype_key
         FROM destinies
         WHERE session_id = ?1
         ORDER BY created_at DESC
         LIMIT 6`,
      )
      .bind(sessionId)
      .all<{ archetype_key: string | null }>();
  } catch {
    // Keep recommendations flowing even if memory tables/columns drift temporarily.
    return { classAffinity: {}, rerollReasonCounts: {}, recentArchetypeKeys: [], confidence: 0, sampleSize: 0 };
  }

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
    recentArchetypeKeys: (recentArchetypes.results ?? []).map((r) => r.archetype_key).filter((x): x is string => Boolean(x)),
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
    const strictViability = computeViability(input);
    let viability = strictViability;
    let archetypePool = filterArchetypesByViability(archetypes, viability);
    const aiReady = getAiGateStatus(c.env).ready;
    let filterRelaxedForAi = false;

    if (archetypePool.length === 0) {
      if (!aiReady) {
        c.executionCtx.waitUntil(
          captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
            reason: "no_viable_build",
            entryPath: input.entryPath,
            viabilityNotes: viability.notes,
          }),
        );
        return c.json({ error: "no_viable_build", notes: viability.notes }, 400);
      }
      const relaxed = computeRelaxedViability(input);
      viability = {
        ...relaxed,
        notes: [...strictViability.notes, ...relaxed.notes],
      };
      archetypePool = filterArchetypesByViability(archetypes, viability);
      filterRelaxedForAi = true;
      if (archetypePool.length === 0) {
        c.executionCtx.waitUntil(
          captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
            reason: "no_viable_build",
            entryPath: input.entryPath,
            viabilityNotes: [...viability.notes, "ai_relax_exhausted"],
          }),
        );
        return c.json({ error: "no_viable_build", notes: [...viability.notes, "ai_relax_exhausted"] }, 400);
      }
    }

    const memoryConfig = readMemoryConfig(c);
    const serverMemory = await deriveServerMemory(c.env.DB, input.sessionId, memoryConfig.lookbackLimit);
    const rankerMemory = {
      browserMemory: input.signals.memoryHints,
      serverMemory,
      config: memoryConfig,
    };

    const wantExperimental = input.signals.recommendLane === "experimental";
    if (wantExperimental && !aiReady) {
      c.executionCtx.waitUntil(
        captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
          reason: "experimental_requires_ai",
          entryPath: input.entryPath,
        }),
      );
      return c.json({ error: "experimental_requires_ai" }, 400);
    }

    let ranking: ReturnType<typeof rankArchetypes>;
    let top: RankedArchetype;
    let experimentalLane = false;

    if (wantExperimental) {
      if (viability.allowedClasses.length === 0) {
        c.executionCtx.waitUntil(
          captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
            reason: "no_viable_build",
            entryPath: input.entryPath,
            viabilityNotes: viability.notes,
          }),
        );
        return c.json({ error: "no_viable_build", notes: viability.notes }, 400);
      }
      const expTop = await buildExperimentalRankedArchetype(c.env, input, viability.allowedClasses);
      if (!expTop) {
        c.executionCtx.waitUntil(
          captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
            reason: "experimental_archetype_failed",
            entryPath: input.entryPath,
          }),
        );
        return c.json({ error: "experimental_archetype_failed" }, 503);
      }
      ranking = rankArchetypes(input, rankerMemory, [expTop.archetype]);
      const r0 = ranking.ranked[0];
      if (!r0) {
        c.executionCtx.waitUntil(
          captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
            reason: "experimental_archetype_failed",
            entryPath: input.entryPath,
          }),
        );
        return c.json({ error: "experimental_archetype_failed" }, 503);
      }
      top = r0;
      experimentalLane = true;
    } else {
      ranking = rankArchetypes(input, rankerMemory, archetypePool);
      let ranked = ranking.ranked;

      if (ranked.length === 0) {
        if (!aiReady || filterRelaxedForAi) {
          c.executionCtx.waitUntil(
            captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
              reason: "no_eligible_archetypes",
              entryPath: input.entryPath,
            }),
          );
          return c.json({ error: "no_eligible_archetypes" }, 400);
        }
        const relaxed = computeRelaxedViability(input);
        viability = {
          ...relaxed,
          notes: [...strictViability.notes, ...relaxed.notes],
        };
        archetypePool = filterArchetypesByViability(archetypes, viability);
        filterRelaxedForAi = true;
        if (archetypePool.length === 0) {
          c.executionCtx.waitUntil(
            captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
              reason: "no_eligible_archetypes",
              entryPath: input.entryPath,
            }),
          );
          return c.json({ error: "no_eligible_archetypes" }, 400);
        }
        ranking = rankArchetypes(input, rankerMemory, archetypePool);
        ranked = ranking.ranked;
        if (ranked.length === 0) {
          c.executionCtx.waitUntil(
            captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
              reason: "no_eligible_archetypes",
              entryPath: input.entryPath,
            }),
          );
          return c.json({ error: "no_eligible_archetypes" }, 400);
        }
      }

      top = ranked[0]!;
      if (!top) {
        c.executionCtx.waitUntil(
          captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, input.sessionId ?? "anonymous", {
            reason: "no_ranked_candidate",
            entryPath: input.entryPath,
          }),
        );
        return c.json({ error: "no_ranked_candidate" }, 400);
      }
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
      .map(([key, value]) => {
        if (typeof value === "string") {
          return {
            sessionId,
            questionKey: key,
            answerValue: value,
            freeformText: key === "freeform" ? value : null,
            skipped: false,
            createdAt: new Date(now),
          };
        }
        return {
          sessionId,
          questionKey: key,
          answerValue: JSON.stringify(value),
          freeformText: null,
          skipped: false,
          createdAt: new Date(now),
        };
      });
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

    let buildPlanId: string | undefined;
    try {
      buildPlanId = crypto.randomUUID();
      const rulesetPin = (c.env.RULESET_PIN ?? "classic-era-hc-2026-04").slice(0, 120);
      await db.insert(buildPlans).values({
        id: buildPlanId,
        destinyId,
        sessionId,
        status: "queued",
        publishTier: "draft",
        rulesetPin,
        signalsJson: JSON.stringify(input),
        payloadJson: null,
        error: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });

      c.executionCtx.waitUntil(
        enqueueBuildPlanGeneration(
          c.env,
          buildPlanId,
          destinyId,
          sessionId,
          top.archetype.key,
          JSON.stringify(output),
          input,
        ),
      );
    } catch {
      buildPlanId = undefined;
    }

    const confidenceScore = Math.min(1, Math.max(0.1, top.score / 10));
    try {
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
    } catch {
      /* non-fatal analytics/logging write */
    }

    c.executionCtx.waitUntil(
      captureServerEvent(c.env, AnalyticsEvent.DestinyGenerated, sessionId, {
        destinyId,
        entryPath: input.entryPath,
        sourceType: output.sourceType,
        fallbackUsed: aiResult.telemetry.fallbackUsed,
        resolvedModelId: aiResult.telemetry.resolvedModelId,
        aiErrorType: aiResult.telemetry.providerError,
        aiLatencyMs: aiResult.telemetry.latencyMs,
        filterRelaxedForAi,
        experimentalLane,
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
      buildPlanId,
      buildSheetPath: `/build/${destinyId}`,
      viabilityNotes: viability.notes,
      filterRelaxedForAi,
      experimentalLane,
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
