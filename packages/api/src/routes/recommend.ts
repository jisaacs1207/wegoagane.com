import { type Context, Hono } from "hono";
import { captureServerEvent } from "../analytics/posthog";
import { AnalyticsEvent } from "../analytics/events";
import { enrichDestiny, getAiGateStatus } from "../ai/adapter";
import { getDb, type ApiEnv } from "../db/client";
import { destinies, questionAnswers, recommendationLogs, sessions } from "../db/schema";
import { rankArchetypes } from "../domain/ranker";
import { renderTemplateDestiny } from "../domain/template";
import { validateRecommendInput, validateTemplateOutput } from "../domain/validator";

export const recommendRouter = new Hono<ApiEnv>();

export async function handleRecommend(c: Context<ApiEnv>) {
  const payload = await c.req.json();
  const input = validateRecommendInput(payload);
  const ranked = rankArchetypes(input);

  if (ranked.length === 0) {
    c.executionCtx.waitUntil(
      captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, payload?.sessionId ?? "anonymous", {
        reason: "no_eligible_archetypes",
        entryPath: payload?.entryPath ?? null,
      }),
    );
    return c.json({ error: "no_eligible_archetypes" }, 400);
  }

  const top = ranked[0];
  if (!top) {
    c.executionCtx.waitUntil(
      captureServerEvent(c.env, AnalyticsEvent.DestinyGenerationFailed, payload?.sessionId ?? "anonymous", {
        reason: "no_ranked_candidate",
        entryPath: payload?.entryPath ?? null,
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
    output,
  });
}

recommendRouter.post("/", handleRecommend);
