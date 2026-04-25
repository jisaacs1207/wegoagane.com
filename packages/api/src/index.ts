import { Hono } from "hono";
import { handleRecommend } from "./routes/recommend";
import { handleMemorial } from "./routes/memorial";
import { handleFeedback, handleFeedbackSummary } from "./routes/feedback";
import { handleCreateShare, handleGetShare, handleGetShareImage, handleGetShareOg, handleShareSummary } from "./routes/share";
import { handleAnalyticsConfig, handleMemoryHealth } from "./routes/analytics";
import { growthRouter } from "./routes/growth";
import { buildRouter } from "./routes/build";
import { journeyRouter } from "./routes/journey";
import { runExperimentalLearningTick } from "./db/archetypeLearning";
import type { ApiEnv } from "./db/client";

const app = new Hono<ApiEnv>();

app.get("/", (c) =>
  c.json({
    name: "wegoagane-api",
    env: c.env.APP_ENV ?? "unknown",
    endpoints: [
      "GET /health",
      "POST /v1/recommend",
      "POST /v1/memorial",
      "POST /v1/feedback",
      "GET /v1/feedback/summary",
      "POST /v1/share",
      "GET /v1/share/:runId",
      "GET /v1/share/:runId/image",
      "GET /v1/share/:runId/og",
      "GET /v1/share/summary/health",
      "GET /v1/analytics/config",
      "GET /v1/analytics/memory-health",
      "POST /v1/growth/generate",
      "POST /v1/growth/assign",
      "POST /v1/growth/outcome",
      "POST /v1/growth/promote",
      "GET /v1/growth/health",
      "POST /v1/growth/tick",
      "POST /v1/build",
      "GET /v1/build/names",
      "GET /v1/build/:destinyId",
      "POST /v1/journey/start",
      "POST /v1/journey/answer",
      "GET /v1/journey/next-question",
      "POST /v1/journey/refine",
      "POST /v1/journey/commit",
      "GET /v1/journey/commit/:slug",
      "POST /v1/journey/commit/:slug/memorial",
    ],
  }),
);

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/v1/recommend", handleRecommend);
app.post("/v1/memorial", handleMemorial);
app.post("/v1/feedback", handleFeedback);
app.get("/v1/feedback/summary", handleFeedbackSummary);
app.post("/v1/share", handleCreateShare);
app.get("/v1/share/summary/health", handleShareSummary);
app.get("/v1/share/:runId", handleGetShare);
app.get("/v1/share/:runId/image", handleGetShareImage);
app.get("/v1/share/:runId/og", handleGetShareOg);
app.get("/v1/analytics/config", handleAnalyticsConfig);
app.get("/v1/analytics/memory-health", handleMemoryHealth);
app.route("/v1/growth", growthRouter);
app.route("/v1/build", buildRouter);
app.route("/v1/journey", journeyRouter);

// Same handlers under /api/* for live domain Worker Route patterns.
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/api/v1/recommend", handleRecommend);
app.post("/api/v1/memorial", handleMemorial);
app.post("/api/v1/feedback", handleFeedback);
app.get("/api/v1/feedback/summary", handleFeedbackSummary);
app.post("/api/v1/share", handleCreateShare);
app.get("/api/v1/share/summary/health", handleShareSummary);
app.get("/api/v1/share/:runId", handleGetShare);
app.get("/api/v1/share/:runId/image", handleGetShareImage);
app.get("/api/v1/share/:runId/og", handleGetShareOg);
app.get("/api/v1/analytics/config", handleAnalyticsConfig);
app.get("/api/v1/analytics/memory-health", handleMemoryHealth);
app.route("/api/v1/growth", growthRouter);
app.route("/api/v1/build", buildRouter);
app.route("/api/v1/journey", journeyRouter);

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: ApiEnv["Bindings"], ctx: ExecutionContext) => {
    const learningEnabled = String(env.EXPERIMENTAL_LEARNING_ENABLED ?? "true").toLowerCase() !== "false";
    if (learningEnabled) {
      ctx.waitUntil(runExperimentalLearningTick(env.DB).catch(() => {}));
    }

    const enabled = String(env.GROWTH_AUTOPILOT_ENABLED ?? "false").toLowerCase() === "true";
    if (!enabled) return;
    const origin = env.SITE_ORIGIN ?? "https://wegoagane.com";
    const headers: Record<string, string> = {};
    if (env.GROWTH_CONTROL_TOKEN) headers["x-growth-control-token"] = env.GROWTH_CONTROL_TOKEN;
    ctx.waitUntil(
      fetch(`${origin}/api/v1/growth/tick`, { method: "POST", headers }).catch(() => {
        // Keep cron non-blocking.
      }),
    );
  },
};
