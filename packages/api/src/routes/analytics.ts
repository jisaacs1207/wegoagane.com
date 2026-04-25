import { type Context, Hono } from "hono";
import type { ApiEnv } from "../db/client";
import { AnalyticsEvent } from "../analytics/events";
import { captureServerEvent } from "../analytics/posthog";
import { getAiGateStatus } from "../ai/adapter";

export const analyticsRouter = new Hono<ApiEnv>();

export async function handleAnalyticsConfig(c: Context<ApiEnv>) {
  const enabled = String(c.env.POSTHOG_ENABLED ?? "false").toLowerCase() === "true";
  const memoryEnabled = String(c.env.MEMORY_BIAS_ENABLED ?? "true").toLowerCase() === "true";
  const aiReady = getAiGateStatus(c.env).ready;
  const rawOfferPercent = Math.min(100, Math.max(0, Number(c.env.EXPERIMENTAL_LANE_OFFER_PERCENT ?? "0")));
  return c.json({
    posthog: {
      enabled,
      host: c.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      key: c.env.POSTHOG_PROJECT_API_KEY ?? null,
      uiHost: "https://us.posthog.com",
    },
    memory: {
      enabled: memoryEnabled,
      browserWeight: Number(c.env.MEMORY_BROWSER_WEIGHT ?? "0.45"),
      serverWeight: Number(c.env.MEMORY_SERVER_WEIGHT ?? "0.55"),
      maxBias: Number(c.env.MEMORY_MAX_BIAS ?? "1.5"),
      degradeMode: String(c.env.MEMORY_DEGRADE_MODE ?? "false").toLowerCase() === "true",
      degradeScale: Number(c.env.MEMORY_DEGRADE_SCALE ?? "0.5"),
      lookbackLimit: Number(c.env.MEMORY_LOOKBACK_LIMIT ?? "80"),
    },
    growth: {
      autopilotEnabled: String(c.env.GROWTH_AUTOPILOT_ENABLED ?? "false").toLowerCase() === "true",
      hardStopEnabled: String(c.env.GROWTH_HARD_STOP_ENABLED ?? "true").toLowerCase() === "true",
      defaultTrafficPercent: Number(c.env.GROWTH_DEFAULT_TRAFFIC_PERCENT ?? "38"),
      defaultHoldoutPercent: Number(c.env.GROWTH_DEFAULT_HOLDOUT_PERCENT ?? "6"),
      minSampleSize: Number(c.env.GROWTH_MIN_SAMPLE_SIZE ?? "48"),
    },
    experimentalLane: {
      offerPercent: aiReady ? rawOfferPercent : 0,
    },
  });
}

export async function handleMemoryHealth(c: Context<ApiEnv>) {
  const rows = await c.env.DB.prepare(
    `SELECT choice, stage, reroll_reason, created_at
     FROM destiny_feedback
     ORDER BY created_at DESC
     LIMIT 300`,
  ).all<{ choice: "accept" | "almost_right" | "miss"; stage: "reroll_gate" | "post_accept"; reroll_reason: string | null; created_at: number }>();

  let accept = 0;
  let almostRight = 0;
  let miss = 0;
  const rerollReasonCounts: Record<string, number> = {};
  for (const row of rows.results ?? []) {
    if (row.choice === "accept") accept += 1;
    if (row.choice === "almost_right") almostRight += 1;
    if (row.choice === "miss") miss += 1;
    if (row.reroll_reason) {
      rerollReasonCounts[row.reroll_reason] = (rerollReasonCounts[row.reroll_reason] ?? 0) + 1;
    }
  }

  const total = accept + almostRight + miss;
  const acceptRate = total > 0 ? Number((accept / total).toFixed(4)) : 0;
  const rerollRate = total > 0 ? Number(((almostRight + miss) / total).toFixed(4)) : 0;
  const recommendedAction = rerollRate > 0.82 ? "disable_memory_bias" : rerollRate > 0.72 ? "reduce_weights" : "keep";

  c.executionCtx.waitUntil(
    captureServerEvent(c.env, AnalyticsEvent.MemoryHealthEvaluated, "memory_health", {
      sampleSize: total,
      acceptRate,
      rerollRate,
      recommendedAction,
    }),
  );

  return c.json({
    sampleSize: total,
    acceptRate,
    rerollRate,
    counts: { accept, almostRight, miss },
    rerollReasonCounts,
    recommendedAction,
  });
}

export async function handleExperimentalHealth(c: Context<ApiEnv>) {
  const counts = await c.env.DB.prepare(
    `SELECT
      SUM(CASE WHEN status='promoted' THEN 1 ELSE 0 END) AS promoted,
      SUM(CASE WHEN status='retired' THEN 1 ELSE 0 END) AS retired,
      SUM(CASE WHEN display_status='experimental_live' THEN 1 ELSE 0 END) AS live,
      COUNT(*) AS total
     FROM archetype_candidates`,
  ).first<{ promoted: number | null; retired: number | null; live: number | null; total: number | null }>();
  const metricsKv = await c.env.DB
    .prepare("SELECT value FROM runtime_kv WHERE key = 'experimental_archetype_learning_metrics_json' LIMIT 1")
    .first<{ value: string }>();
  let metrics: Record<string, unknown> | null = null;
  try {
    metrics = metricsKv?.value ? (JSON.parse(metricsKv.value) as Record<string, unknown>) : null;
  } catch {
    metrics = null;
  }
  return c.json({
    candidates: {
      total: Number(counts?.total ?? 0),
      live: Number(counts?.live ?? 0),
      promoted: Number(counts?.promoted ?? 0),
      retired: Number(counts?.retired ?? 0),
    },
    metrics,
  });
}

analyticsRouter.get("/config", handleAnalyticsConfig);
analyticsRouter.get("/memory-health", handleMemoryHealth);
