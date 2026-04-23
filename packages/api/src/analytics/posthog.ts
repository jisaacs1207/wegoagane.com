import type { ApiEnv } from "../db/client";
import type { AnalyticsEventName } from "./events";

type EventProperties = Record<string, unknown>;

function normalizeHost(host: string): string {
  if (host.endsWith("/")) return host.slice(0, -1);
  return host;
}

export async function captureServerEvent(
  env: ApiEnv["Bindings"],
  event: AnalyticsEventName,
  distinctId: string,
  properties: EventProperties = {},
) {
  const enabled = String(env.POSTHOG_ENABLED ?? "false").toLowerCase() === "true";
  const apiKey = env.POSTHOG_PROJECT_API_KEY;
  if (!enabled || !apiKey) return;

  const host = normalizeHost(env.POSTHOG_HOST ?? "https://us.i.posthog.com");
  const payload = {
    api_key: apiKey,
    event,
    properties: {
      ...properties,
      distinct_id: distinctId,
      app_env: env.APP_ENV,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics is non-blocking by design.
  }
}
