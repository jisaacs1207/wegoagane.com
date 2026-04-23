import { enrichDestiny, enrichMemorial } from "../src/ai/adapter";
import { renderTemplateDestiny } from "../src/domain/template";
import { renderTemplateMemorial } from "../src/domain/memorialTemplate";
import { rankArchetypes } from "../src/domain/ranker";
import type { ApiEnv } from "../src/db/client";
import type { MemorialInput, RecommendInput } from "../src/domain/types";

type EvalRow = {
  model: string;
  lane: "destiny" | "memorial";
  calls: number;
  aiSuccessRate: number;
  fallbackRate: number;
  avgLatencyMs: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  errorRate: number;
  score: number;
};

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function evaluateDestinyModel(env: ApiEnv["Bindings"], model: string, runs: number): Promise<EvalRow> {
  const samples: RecommendInput[] = [
    { entryPath: "release_spirit", signals: { mood: "tilted", nextSignal: "slow down", factionPreference: "horde" } },
    { entryPath: "draft_a_run", signals: { intent: "stable climb", freeform: "avoid high risk pulls" } },
    { entryPath: "lucky_roll", signals: { nextSignal: "surprise me" } },
  ];

  const fallbackUsed: number[] = [];
  const aiSuccess: number[] = [];
  const errors: number[] = [];
  const latencies: number[] = [];
  const inputTokens: number[] = [];
  const outputTokens: number[] = [];

  for (let i = 0; i < runs; i += 1) {
    const sample = samples[i % samples.length]!;
    const ranked = rankArchetypes(sample);
    const top = ranked[0];
    if (!top) continue;
    const template = renderTemplateDestiny(top);
    const result = await enrichDestiny({ ...env, AI_MODEL_DESTINY: model }, sample, template);
    const telemetry = result.telemetry;
    fallbackUsed.push(telemetry.fallbackUsed ? 1 : 0);
    aiSuccess.push(result.output.sourceType === "ai" ? 1 : 0);
    errors.push(telemetry.providerError ? 1 : 0);
    latencies.push(telemetry.latencyMs ?? 0);
    inputTokens.push(telemetry.inputTokens ?? 0);
    outputTokens.push(telemetry.outputTokens ?? 0);
  }

  const aiSuccessRate = mean(aiSuccess);
  const fallbackRate = mean(fallbackUsed);
  const avgLatencyMs = mean(latencies);
  const avgInputTokens = mean(inputTokens);
  const avgOutputTokens = mean(outputTokens);
  const errorRate = mean(errors);
  const score = aiSuccessRate * 0.55 + (1 - fallbackRate) * 0.25 + (1 - errorRate) * 0.15 + 0.05 * (1 - avgLatencyMs / 6000);

  return {
    model,
    lane: "destiny",
    calls: latencies.length,
    aiSuccessRate,
    fallbackRate,
    avgLatencyMs,
    avgInputTokens,
    avgOutputTokens,
    errorRate,
    score,
  };
}

async function evaluateMemorialModel(env: ApiEnv["Bindings"], model: string, runs: number): Promise<EvalRow> {
  const samples: MemorialInput[] = [
    { zone: "Durotar", cause: "Overpull", mood: "frustrated", nextSignal: "pull smaller", faction: "horde", level: 12 },
    { zone: "Westfall", cause: "Defias ambush", mood: "confident", nextSignal: "watch patrols", faction: "alliance", level: 19 },
    { zone: "Stranglethorn Vale", cause: "Chain aggro", mood: "rushed", nextSignal: "reset often", level: 37 },
  ];

  const fallbackUsed: number[] = [];
  const aiSuccess: number[] = [];
  const errors: number[] = [];
  const latencies: number[] = [];
  const inputTokens: number[] = [];
  const outputTokens: number[] = [];

  for (let i = 0; i < runs; i += 1) {
    const sample = samples[i % samples.length]!;
    const template = renderTemplateMemorial(sample);
    const result = await enrichMemorial({ ...env, AI_MODEL_MEMORIAL: model }, template);
    const telemetry = result.telemetry;
    fallbackUsed.push(telemetry.fallbackUsed ? 1 : 0);
    aiSuccess.push(result.output.sourceType === "ai" ? 1 : 0);
    errors.push(telemetry.providerError ? 1 : 0);
    latencies.push(telemetry.latencyMs ?? 0);
    inputTokens.push(telemetry.inputTokens ?? 0);
    outputTokens.push(telemetry.outputTokens ?? 0);
  }

  const aiSuccessRate = mean(aiSuccess);
  const fallbackRate = mean(fallbackUsed);
  const avgLatencyMs = mean(latencies);
  const avgInputTokens = mean(inputTokens);
  const avgOutputTokens = mean(outputTokens);
  const errorRate = mean(errors);
  const score = aiSuccessRate * 0.6 + (1 - fallbackRate) * 0.2 + (1 - errorRate) * 0.15 + 0.05 * (1 - avgLatencyMs / 6000);

  return {
    model,
    lane: "memorial",
    calls: latencies.length,
    aiSuccessRate,
    fallbackRate,
    avgLatencyMs,
    avgInputTokens,
    avgOutputTokens,
    errorRate,
    score,
  };
}

async function main() {
  const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL;
  const AI_GATEWAY_TOKEN = process.env.AI_GATEWAY_TOKEN;
  if (!AI_GATEWAY_URL || !AI_GATEWAY_TOKEN) {
    throw new Error("Missing AI_GATEWAY_URL or AI_GATEWAY_TOKEN");
  }

  const destinyModels = parseList(process.env.DESTINY_MODELS);
  const memorialModels = parseList(process.env.MEMORIAL_MODELS);
  const runs = Number(process.env.BAKEOFF_RUNS ?? "6");

  if (destinyModels.length === 0) {
    throw new Error("Set DESTINY_MODELS as comma-separated model ids");
  }
  const effectiveMemorialModels = memorialModels.length > 0 ? memorialModels : destinyModels;

  const env: ApiEnv["Bindings"] = {
    DB: {} as D1Database,
    APP_ENV: "eval",
    AI_ENABLED: "true",
    AI_GATEWAY_URL,
    AI_GATEWAY_TOKEN,
  };

  const rows: EvalRow[] = [];
  for (const model of destinyModels) {
    rows.push(await evaluateDestinyModel(env, model, runs));
  }
  for (const model of effectiveMemorialModels) {
    rows.push(await evaluateMemorialModel(env, model, runs));
  }

  const sortedDestiny = rows.filter((r) => r.lane === "destiny").sort((a, b) => b.score - a.score);
  const sortedMemorial = rows.filter((r) => r.lane === "memorial").sort((a, b) => b.score - a.score);

  console.log(JSON.stringify({ rows, recommended: { destiny: sortedDestiny[0], memorial: sortedMemorial[0] } }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
