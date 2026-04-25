import { and, eq, or } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { applyArchetypeCandidateCommitSignal } from "../db/archetypeLearning";
import { getDb, type ApiEnv } from "../db/client";
import { buildCommits, buildPlans, buildRunsDraft, destinies, memorialRuns, nameSuggestions } from "../db/schema";

const startSchema = z.object({
  sessionId: z.string().min(1).max(80),
  entryPath: z.enum(["release_spirit", "draft_a_run", "lucky_roll"]),
  depth: z.enum(["quick", "balanced", "dialed_in"]).optional(),
  vector: z.string().max(80).optional(),
});

const answerSchema = z.object({
  draftId: z.string().min(1).max(80),
  questionKey: z.string().min(1).max(80),
  answer: z.string().min(1).max(120),
  signalsPatch: z.record(z.string(), z.unknown()).optional(),
});

const refineSchema = z.object({
  draftId: z.string().min(1).max(80),
});

const commitSchema = z.object({
  sessionId: z.string().min(1).max(80),
  destinyId: z.string().min(1).max(80),
  commitName: z.string().max(80).optional(),
});

/** Single display title for commit cardJson — never blank or whitespace-only. */
function destinyHeadlineFromPayload(destinyPayload: unknown): string {
  if (!destinyPayload || typeof destinyPayload !== "object") return "Committed build";
  const h = (destinyPayload as { headline?: unknown }).headline;
  if (typeof h !== "string") return "Committed build";
  const t = h.trim();
  return t.length > 0 ? t : "Committed build";
}

const memorialSchema = z.object({
  sessionId: z.string().min(1).max(80),
  level: z.number().min(1).max(60).optional(),
  zone: z.string().min(1).max(120),
  cause: z.string().min(1).max(120),
  killer: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
  rating: z.string().max(40).optional(),
});

function nextQuestionForDraft(draft: typeof buildRunsDraft.$inferSelect) {
  const count = draft.questionCount;
  const raw = draft.vector ?? "survivability";
  if (count >= 5) return null;

  /** Align web `JourneyVectorKey` with server question banks. */
  const key =
    raw === "combat_style"
      ? "combat"
      : raw === "class_fantasy"
        ? "class_fantasy"
        : raw === "playstyle"
          ? "playstyle"
          : raw === "surprise"
            ? "surprise"
            : raw;

  const questionBank: Record<string, Array<{ key: string; prompt: string; choices: string[] }>> = {
    survivability: [
      { key: "riskTolerance", prompt: "How safe should this run be?", choices: ["Ultra safe", "Safe", "Balanced", "Spicy"] },
      { key: "pullStyle", prompt: "How do you handle pulls?", choices: ["Single pulls only", "Controlled chains", "Balanced", "Aggressive"] },
      { key: "downtime", prompt: "How much downtime is okay?", choices: ["Minimal", "Low", "Medium", "Any"] },
      { key: "escapePlan", prompt: "How important are escapes?", choices: ["Mandatory", "High", "Medium", "Low"] },
      { key: "gearDependence", prompt: "Can this depend on early gear?", choices: ["No", "Low", "Medium", "Yes"] },
    ],
    profession: [
      { key: "econPosture", prompt: "What is your profession posture?", choices: ["Survival first", "Balanced", "Gold first", "Theme first"] },
      { key: "craftingTempo", prompt: "When should crafting matter?", choices: ["Immediately", "By 20", "By 40", "Late game"] },
      { key: "consumables", prompt: "Consumable intensity?", choices: ["Always on", "Frequent", "Situational", "Minimal"] },
      { key: "gathering", prompt: "Gathering commitment?", choices: ["Dual gather", "Single gather", "Pivot later", "Skip gather"] },
      { key: "auctionUse", prompt: "Auction house usage?", choices: ["Heavy", "Moderate", "Light", "None"] },
    ],
    combat: [
      { key: "combatRange", prompt: "Preferred combat distance?", choices: ["Melee", "Ranged", "Hybrid", "No preference"] },
      { key: "resourceStyle", prompt: "Preferred resource feel?", choices: ["Mana cadence", "Rage momentum", "Energy pace", "Any"] },
      { key: "groupRole", prompt: "How do you want to contribute in groups?", choices: ["Anchor/tank", "Support/heal", "Damage", "Solo mostly"] },
      { key: "fantasyTone", prompt: "Fantasy tone preference?", choices: ["Holy", "Nature", "Dark", "Neutral"] },
      { key: "complexity", prompt: "Rotation complexity tolerance?", choices: ["Simple", "Medium", "Advanced", "Any"] },
    ],
    playstyle: [
      { key: "riskFeel", prompt: "How much risk are you comfortable with?", choices: ["Very low", "Low", "Balanced", "High"] },
      { key: "pullCadence", prompt: "Preferred pull cadence?", choices: ["Singles only", "Controlled chains", "Mixed", "Fast pulls"] },
      { key: "tempo", prompt: "Preferred leveling tempo?", choices: ["Steady", "Efficient", "Aggressive", "Exploratory"] },
      { key: "social", prompt: "Solo vs group lean?", choices: ["Solo mostly", "Small group", "Either", "Dungeon focused"] },
      { key: "prep", prompt: "How much prep between sessions?", choices: ["Minimal", "Light", "Heavy", "Obsessive"] },
    ],
    class_fantasy: [
      { key: "tone", prompt: "Which fantasy tone do you want?", choices: ["Holy", "Nature", "Arcane", "Shadow"] },
      { key: "powerFantasy", prompt: "What power fantasy matters most?", choices: ["Control", "Burst", "Sustain", "Utility"] },
      { key: "identity", prompt: "Character identity weight?", choices: ["Lore-heavy", "Mechanics-first", "Balanced", "Meme-friendly"] },
      { key: "fantasyDepth", prompt: "How deep should fantasy read go?", choices: ["Light", "Medium", "Deep", "Surprise me"] },
      { key: "tone2", prompt: "Secondary tone (optional feel)?", choices: ["Grim", "Hopeful", "Mysterious", "Straightforward"] },
    ],
    surprise: [
      { key: "chaos", prompt: "How wild should the surprise be?", choices: ["Stable", "Balanced", "Spicy", "Maximum chaos"] },
      { key: "curveball", prompt: "Accept curveball constraints?", choices: ["No", "Maybe", "Yes", "Yes please"] },
      { key: "weirdOk", prompt: "Weird but viable picks OK?", choices: ["Avoid", "Sometimes", "Often", "Always"] },
      { key: "rerollBudget", prompt: "Reroll tolerance if spicy?", choices: ["One reroll", "A few", "Many", "Infinite"] },
      { key: "trust", prompt: "Trust the machine?", choices: ["Skeptical", "Cautious", "Open", "Full send"] },
    ],
  };
  const bank = questionBank[key] ?? questionBank.survivability ?? [];
  return bank[count] ?? null;
}

async function parseBody<T>(c: Context<ApiEnv>, schema: z.ZodType<T>) {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return { error: c.json({ error: "invalid_json" }, 400) as Response };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: c.json({ error: "invalid_input" }, 400) as Response };
  return { data: parsed.data };
}

export const journeyRouter = new Hono<ApiEnv>();

journeyRouter.post("/start", async (c) => {
  const parsed = await parseBody(c, startSchema);
  if (parsed.error) return parsed.error;
  const { sessionId, entryPath, depth, vector } = parsed.data;
  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(buildRunsDraft).values({
    id,
    sessionId,
    entryPath,
    depth: depth ?? "balanced",
    vector: vector ?? "survivability",
    answersJson: "{}",
    signalsJson: "{}",
    questionCount: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  const row = (await db.select().from(buildRunsDraft).where(eq(buildRunsDraft.id, id)).limit(1))[0];
  if (!row) return c.json({ error: "draft_create_failed" }, 500);
  return c.json({ draftId: row.id, sessionId: row.sessionId, depth: row.depth, vector: row.vector });
});

journeyRouter.post("/answer", async (c) => {
  const parsed = await parseBody(c, answerSchema);
  if (parsed.error) return parsed.error;
  const { draftId, questionKey, answer, signalsPatch } = parsed.data;
  const db = getDb(c.env.DB);
  const row = (await db.select().from(buildRunsDraft).where(eq(buildRunsDraft.id, draftId)).limit(1))[0];
  if (!row) return c.json({ error: "draft_not_found" }, 404);
  let answers: Record<string, string> = {};
  let signals: Record<string, unknown> = {};
  try {
    answers = JSON.parse(row.answersJson) as Record<string, string>;
  } catch {
    answers = {};
  }
  try {
    signals = JSON.parse(row.signalsJson) as Record<string, unknown>;
  } catch {
    signals = {};
  }
  answers[questionKey] = answer;
  const mergedSignals = { ...signals, ...(signalsPatch ?? {}) };
  const questionCount = Math.min(5, row.questionCount + 1);
  await db
    .update(buildRunsDraft)
    .set({
      answersJson: JSON.stringify(answers),
      signalsJson: JSON.stringify(mergedSignals),
      questionCount,
      updatedAt: new Date(),
    })
    .where(eq(buildRunsDraft.id, draftId));
  return c.json({ ok: true, draftId, questionCount });
});

journeyRouter.get("/next-question", async (c) => {
  const draftId = c.req.query("draftId");
  if (!draftId) return c.json({ error: "draft_id_required" }, 400);
  const db = getDb(c.env.DB);
  const row = (await db.select().from(buildRunsDraft).where(eq(buildRunsDraft.id, draftId)).limit(1))[0];
  if (!row) return c.json({ error: "draft_not_found" }, 404);
  const next = nextQuestionForDraft(row);
  return c.json({
    draftId,
    questionCount: row.questionCount,
    maxQuestions: 5,
    next,
    canGenerate: true,
  });
});

journeyRouter.post("/refine", async (c) => {
  const parsed = await parseBody(c, refineSchema);
  if (parsed.error) return parsed.error;
  const db = getDb(c.env.DB);
  const row = (await db.select().from(buildRunsDraft).where(eq(buildRunsDraft.id, parsed.data.draftId)).limit(1))[0];
  if (!row) return c.json({ error: "draft_not_found" }, 404);
  const next = nextQuestionForDraft(row);
  return c.json({ draftId: row.id, next, canGenerate: true, questionCount: row.questionCount, maxQuestions: 5 });
});

journeyRouter.post("/commit", async (c) => {
  const parsed = await parseBody(c, commitSchema);
  if (parsed.error) return parsed.error;
  const { sessionId, destinyId, commitName } = parsed.data;
  const db = getDb(c.env.DB);
  const destiny = (await db.select().from(destinies).where(and(eq(destinies.id, destinyId), eq(destinies.sessionId, sessionId))).limit(1))[0];
  if (!destiny) return c.json({ error: "destiny_not_found" }, 404);
  const plan = (await db.select().from(buildPlans).where(eq(buildPlans.destinyId, destinyId)).limit(1))[0];
  /** Slug is the full destiny id so commit URLs stay unique (short-prefix slugs could collide). */
  const slug = destinyId;
  const existing = (await db.select().from(buildCommits).where(eq(buildCommits.destinyId, destinyId)).limit(1))[0];
  if (existing) return c.json({ commitId: existing.id, slug: existing.slug, path: `/build/commit/${existing.slug}` });

  let planPayload: unknown = null;
  if (plan?.payloadJson) {
    try {
      planPayload = JSON.parse(plan.payloadJson) as unknown;
    } catch {
      planPayload = null;
    }
  }
  const id = crypto.randomUUID();
  const now = new Date();
  let destinyPayload: unknown = null;
  try {
    destinyPayload = JSON.parse(destiny.contentJson) as unknown;
  } catch {
    return c.json({ error: "invalid_destiny_payload" }, 500);
  }
  const payload = {
    destiny: destinyPayload,
    plan: planPayload,
    buildPlanId: plan?.id ?? null,
  };
  // Card headline now comes from the AI-generated destiny so the artifact has a single canonical name.
  // commitName is retained as an optional player annotation (used for memorials), not the artifact title.
  const destinyHeadline = destinyHeadlineFromPayload(destinyPayload);
  await db.insert(buildCommits).values({
    id,
    slug,
    sessionId,
    destinyId,
    buildPlanId: plan?.id ?? null,
    commitName: commitName ?? null,
    payloadJson: JSON.stringify(payload),
    cardJson: JSON.stringify({ headline: destinyHeadline, destinyId }),
    sourceType: "hybrid",
    createdAt: now,
    updatedAt: now,
  });
  c.executionCtx.waitUntil(applyArchetypeCandidateCommitSignal(c.env.DB, destinyId, sessionId));
  return c.json({ commitId: id, slug, path: `/build/commit/${slug}` }, 201);
});

journeyRouter.get("/commit/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = getDb(c.env.DB);
  const row = (
    await db
      .select()
      .from(buildCommits)
      .where(or(eq(buildCommits.slug, slug), eq(buildCommits.destinyId, slug)))
      .limit(1)
  )[0];
  if (!row) return c.json({ error: "build_commit_not_found" }, 404);
  let payload: unknown = null;
  if (row.payloadJson) {
    try {
      payload = JSON.parse(row.payloadJson) as unknown;
    } catch {
      payload = null;
    }
  }
  return c.json({
    id: row.id,
    slug: row.slug,
    sessionId: row.sessionId,
    destinyId: row.destinyId,
    buildPlanId: row.buildPlanId,
    commitName: row.commitName,
    sourceType: row.sourceType,
    payload,
    path: `/build/commit/${row.slug}`,
  });
});

journeyRouter.post("/commit/:slug/memorial", async (c) => {
  const slug = c.req.param("slug");
  const parsed = await parseBody(c, memorialSchema);
  if (parsed.error) return parsed.error;
  const db = getDb(c.env.DB);
  const commit = (
    await db
      .select()
      .from(buildCommits)
      .where(or(eq(buildCommits.slug, slug), eq(buildCommits.destinyId, slug)))
      .limit(1)
  )[0];
  if (!commit) return c.json({ error: "build_commit_not_found" }, 404);

  const rowId = crypto.randomUUID();
  const now = new Date();
  await db.insert(memorialRuns).values({
    id: rowId,
    buildCommitId: commit.id,
    sessionId: parsed.data.sessionId,
    level: parsed.data.level ?? null,
    zone: parsed.data.zone,
    cause: parsed.data.cause,
    killer: parsed.data.killer ?? null,
    note: parsed.data.note ?? null,
    rating: parsed.data.rating ?? null,
    memorialId: null,
    createdAt: now,
    updatedAt: now,
  });
  return c.json({ ok: true, memorialRunId: rowId }, 201);
});

journeyRouter.get("/name-suggestions", async (c) => {
  const signature = c.req.query("signature");
  if (!signature) return c.json({ names: [] });
  const db = getDb(c.env.DB);
  const rows = await db.select().from(nameSuggestions).where(eq(nameSuggestions.signature, signature)).limit(12);
  return c.json({
    names: rows.map((row) => ({
      id: row.id,
      name: row.name,
      lane: row.lane,
      source: row.source,
      qualityScore: row.qualityScore,
    })),
  });
});

