import { type Context, Hono } from "hono";
import { captureServerEvent } from "../analytics/posthog";
import { AnalyticsEvent } from "../analytics/events";
import { callAiGateway, extractJsonPayload, getAiGateStatus } from "../ai/adapter";
import { applyArchetypeCandidateFeedback } from "../db/archetypeLearning";
import { getDb, type ApiEnv } from "../db/client";
import { destinyFeedback } from "../db/schema";
import { validateDestinyFeedbackInput } from "../domain/validator";

export const feedbackRouter = new Hono<ApiEnv>();

async function parseFreeformSignal(env: ApiEnv["Bindings"], note: string | null | undefined): Promise<Record<string, unknown> | null> {
  if (!note || note.trim().length < 6) return null;
  if (!getAiGateStatus(env).ready) {
    return {
      mood: note.length > 80 ? "detailed" : "brief",
      mentionsClass: /\b(class|spec|paladin|shaman|mage|hunter|warrior|warlock|priest|rogue|druid)\b/i.test(note),
      sentiment: /\b(great|good|love|perfect)\b/i.test(note) ? "positive" : /\b(bad|wrong|off|hate)\b/i.test(note) ? "negative" : "mixed",
    };
  }
  const model = env.AI_MODEL_DESTINY ?? "openrouter/auto";
  const prompt = [
    "Return JSON only with keys: sentiment, issue_tags, user_goal_hint.",
    "sentiment must be one of: positive, mixed, negative.",
    "issue_tags should be array of short snake_case tokens.",
    `note=${note.slice(0, 240)}`,
  ].join("\n");
  const res = await callAiGateway(env, model, prompt, 10_000);
  if (!res.ok) return null;
  try {
    const parsed = JSON.parse(extractJsonPayload(res.content)) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

export async function handleFeedback(c: Context<ApiEnv>) {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  let input;
  try {
    input = validateDestinyFeedbackInput(payload);
  } catch {
    return c.json({ error: "invalid_input" }, 400);
  }
  const db = getDb(c.env.DB);

  await db.insert(destinyFeedback).values({
    sessionId: input.sessionId,
    destinyId: input.destinyId,
    choice: input.choice,
    stage: input.stage ?? "reroll_gate",
    rerollReason: input.rerollReason ?? null,
    postAcceptRating: input.postAcceptRating ?? null,
    note: input.note ?? null,
    rerollVerdict: input.rerollVerdict ?? null,
    parsedSignalJson: input.parsedSignalJson ? JSON.stringify(input.parsedSignalJson) : null,
    rerollFromClassId: input.rerollFromClassId ?? null,
    rerollToClassId: input.rerollToClassId ?? null,
    createdAt: new Date(Date.now()),
  });

  c.executionCtx.waitUntil(
    captureServerEvent(c.env, AnalyticsEvent.FeedbackSubmitted, input.sessionId, {
      destinyId: input.destinyId,
      choice: input.choice,
      stage: input.stage ?? "reroll_gate",
      rerollReason: input.rerollReason ?? null,
      postAcceptRating: input.postAcceptRating ?? null,
      rerollVerdict: input.rerollVerdict ?? null,
      rerollFromClassId: input.rerollFromClassId ?? null,
      rerollToClassId: input.rerollToClassId ?? null,
    }),
  );

  c.executionCtx.waitUntil(
    (async () => {
      const parsedSignals = input.parsedSignalJson ?? (await parseFreeformSignal(c.env, input.note ?? null));
      await applyArchetypeCandidateFeedback(c.env.DB, {
        destinyId: input.destinyId,
        choice: input.choice,
        stage: input.stage ?? "reroll_gate",
        postAcceptRating: input.postAcceptRating ?? null,
        rerollVerdict: input.rerollVerdict ?? null,
        parsedSignalJson: parsedSignals ?? null,
      });
    })().catch(() => {}),
  );

  return c.json({ ok: true });
}

feedbackRouter.post("/", handleFeedback);

export async function handleFeedbackSummary(c: Context<ApiEnv>) {
  const [totalsResult, rerollResult, groupedResult, postAcceptResult] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM destiny_feedback").first<{ total: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) AS rerolls FROM destiny_feedback WHERE choice = 'almost_right' AND reroll_to_class_id IS NOT NULL",
    ).first<{ rerolls: number }>(),
    c.env.DB.prepare("SELECT choice, COUNT(*) AS count FROM destiny_feedback GROUP BY choice").all<{
      choice: string;
      count: number;
    }>(),
    c.env.DB.prepare(
      "SELECT post_accept_rating AS rating, COUNT(*) AS count FROM destiny_feedback WHERE stage = 'post_accept' AND post_accept_rating IS NOT NULL GROUP BY post_accept_rating",
    ).all<{
      rating: string;
      count: number;
    }>(),
  ]);

  const counts = {
    accept: 0,
    almostRight: 0,
    miss: 0,
  };

  for (const row of groupedResult.results ?? []) {
    if (row.choice === "accept") counts.accept = row.count;
    if (row.choice === "almost_right") counts.almostRight = row.count;
    if (row.choice === "miss") counts.miss = row.count;
  }

  const postAcceptRatings: Record<string, number> = {
    not_this: 0,
    itll_do: 0,
    good_pick: 0,
    this_is_it: 0,
    perfect: 0,
  };
  for (const row of postAcceptResult.results ?? []) {
    if (row.rating in postAcceptRatings) {
      postAcceptRatings[row.rating] = row.count;
    }
  }

  return c.json({
    total: totalsResult?.total ?? 0,
    rerollsFromAlmostRight: rerollResult?.rerolls ?? 0,
    counts,
    postAcceptRatings,
  });
}

feedbackRouter.get("/summary", handleFeedbackSummary);
