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
import { callAiGateway, extractJsonPayload, getAiGateStatus, isTruthyEnv } from "./adapter";
import type { RecommendInput } from "../domain/types";
import { computeViability } from "../domain/viability";

function rulesetPinFromEnv(env: ApiEnv["Bindings"]): string {
  return (env.RULESET_PIN ?? "classic-era-hc-2026-04").trim().slice(0, 120);
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
    "You are an expert on World of Warcraft Classic ERA HARDCORE (permanent death).",
    `Ruleset pin: ${rulesetPin}. Prefer accurate Classic Era talent NAMES and real profession pairings. If unsure, say so in warnings[].`,
    "Return ONE JSON object only matching this shape:",
    '{"v":1,"meta":{"publishTier":"draft","rulesetPin":"...","classId":"...","archetypeKey":"..."},"viabilityNotes":[],"warnings":[],"talents":{"summary":"...","keyPicks":[{"tier":"...","name":"talent name","rationale":"...","alternatives":[]}]},"professions":{"primary":"...","secondary":"...","rationale":"...","secondarySkills":{"firstAid":"...","cooking":"...","fishing":"..."}},"stats":{"priority":["stamina","..."],"rationale":"..."},"race":{"suggestion":"...","rationale":"...","alternatives":[]},"namesByLane":{"lore_world":["NameOne"],"hc_practical":[],"light_humor":[],"grimdark":[],"neutral":[],"pop_culture":[]},"forks":[{"title":"...","optionA":"...","optionB":"...","why":"..."}]}',
    "namesByLane: each array 4-8 names; WoW rules: ASCII letters only, length 2-12 each, no spaces or punctuation. Include pop_culture lane with clever original blends (no trademark strings).",
    "forks: 2-3 entries for major build decisions.",
    `Player signals JSON: ${JSON.stringify(input.signals)}`,
    `Chosen archetypeKey: ${archetypeKey}`,
    `Viability notes: ${JSON.stringify(viabilityNotes)}`,
    `Destiny card summary JSON: ${JSON.stringify(destiny)}`,
  ].join("\n");
}

function buildReviewerPrompt(draft: string, input: RecommendInput, rulesetPin: string): string {
  return [
    "You are a hostile reviewer for WoW Classic Era Hardcore build advice.",
    `Ruleset pin: ${rulesetPin}.`,
    "Given the JSON draft below, find contradictions with the player signals, factual impossibilities, or non-viable HC choices.",
    "Also argue viability: pull risk, downtime, gear dependence, melee tax, first-HC suitability.",
    "Return ONE revised JSON object of the SAME schema. If you cannot fix, keep issues in warnings[] array strings.",
    `Player signals: ${JSON.stringify(input.signals)}`,
    "DRAFT JSON:",
    draft,
  ].join("\n");
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
    classId: string;
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

  try {
    await db
      .update(buildPlans)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(buildPlans.id, params.buildPlanId));

    const genPrompt = buildGeneratorPrompt(params.input, { ...destiny, tierProse: destiny.tierProse ?? "", rationale: destiny.rationale ?? "" }, params.archetypeKey, params.viabilityNotes, rulesetPin);
    const gen = await callAiGateway(env, model, genPrompt, 95_000);
    if (!gen.ok) throw new Error(gen.error);
    let raw = extractJsonPayload(gen.content);

    const revPrompt = buildReviewerPrompt(raw, params.input, rulesetPin);
    const rev = await callAiGateway(env, model, revPrompt, 95_000);
    if (rev.ok) {
      raw = extractJsonPayload(rev.content);
    }

    let parsed: BuildPlanPayload;
    try {
      const obj = JSON.parse(raw) as unknown;
      const safe = buildPlanPayloadSchema.safeParse(obj);
      if (!safe.success) throw new Error(`schema:${safe.error.message}`);
      parsed = sanitizeBuildPlanNames(safe.data);
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
