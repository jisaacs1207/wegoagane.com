import { type Context, Hono } from "hono";
import type { ApiEnv } from "../db/client";
import { AnalyticsEvent } from "../analytics/events";
import { captureServerEvent } from "../analytics/posthog";

export const analyticsRouter = new Hono<ApiEnv>();

export async function handleAnalyticsConfig(c: Context<ApiEnv>) {
  const enabled = String(c.env.POSTHOG_ENABLED ?? "false").toLowerCase() === "true";
  const memoryEnabled = String(c.env.MEMORY_BIAS_ENABLED ?? "true").toLowerCase() === "true";
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

analyticsRouter.get("/config", handleAnalyticsConfig);
analyticsRouter.get("/memory-health", handleMemoryHealth);
