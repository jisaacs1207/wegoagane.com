import { type Context, Hono } from "hono";
import { enrichMemorial, getAiGateStatus } from "../ai/adapter";
import { getDb, type ApiEnv } from "../db/client";
import { memorials, questionAnswers, sessions } from "../db/schema";
import { renderTemplateMemorial } from "../domain/memorialTemplate";
import { validateMemorialInput, validateMemorialOutput } from "../domain/validator";

export const memorialRouter = new Hono<ApiEnv>();

export async function handleMemorial(c: Context<ApiEnv>) {
  const payload = await c.req.json();
  const input = validateMemorialInput(payload);
  const templateOutput = renderTemplateMemorial(input);
  const aiResult = await enrichMemorial(c.env, templateOutput);
  const output = aiResult.output;
  const failures =
    aiResult.validationFailures.length > 0 ? aiResult.validationFailures : validateMemorialOutput(output);
  if (failures.length > 0) {
    return c.json({ error: "validation_failed", failures }, 422);
  }

  const now = Date.now();
  const sessionId = input.sessionId ?? crypto.randomUUID();
  const memorialId = crypto.randomUUID();
  const db = getDb(c.env.DB);

  await db
    .insert(sessions)
    .values({
      id: sessionId,
      createdAt: new Date(now),
      entryPath: "release_spirit",
    })
    .onConflictDoNothing();

  const answers = [
    { questionKey: "zone", answerValue: input.zone },
    { questionKey: "cause", answerValue: input.cause },
    { questionKey: "mood", answerValue: input.mood },
    { questionKey: "nextSignal", answerValue: input.nextSignal },
    { questionKey: "faction", answerValue: input.faction },
  ]
    .filter((entry) => entry.answerValue !== undefined)
    .map((entry) => ({
      sessionId,
      questionKey: entry.questionKey,
      answerValue: entry.answerValue ?? null,
      freeformText: null,
      skipped: false,
      createdAt: new Date(now),
    }));
  if (answers.length > 0) {
    await db.insert(questionAnswers).values(answers);
  }

  await db.insert(memorials).values({
    id: memorialId,
    sessionId,
    destinyId: null,
    createdAt: new Date(now),
    characterName: output.characterName,
    level: output.level,
    location: output.location,
    cause: output.cause,
    faction: output.faction,
    epitaph: output.epitaph,
    sourceType: output.sourceType,
    contentJson: JSON.stringify(output),
  });

  return c.json({
    sessionId,
    memorialId,
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

memorialRouter.post("/", handleMemorial);
