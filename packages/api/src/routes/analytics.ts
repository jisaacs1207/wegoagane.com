import { type Context, Hono } from "hono";
import type { ApiEnv } from "../db/client";

export const analyticsRouter = new Hono<ApiEnv>();

export async function handleAnalyticsConfig(c: Context<ApiEnv>) {
  const enabled = String(c.env.POSTHOG_ENABLED ?? "false").toLowerCase() === "true";
  return c.json({
    posthog: {
      enabled,
      host: c.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      key: c.env.POSTHOG_PROJECT_API_KEY ?? null,
      uiHost: "https://us.posthog.com",
    },
  });
}

analyticsRouter.get("/config", handleAnalyticsConfig);
