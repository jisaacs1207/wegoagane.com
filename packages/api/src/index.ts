import { Hono } from "hono";
import { handleRecommend } from "./routes/recommend";
import { handleMemorial } from "./routes/memorial";
import { handleFeedback, handleFeedbackSummary } from "./routes/feedback";
import { handleCreateShare, handleGetShare, handleGetShareImage, handleGetShareOg } from "./routes/share";
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
    ],
  }),
);

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/v1/recommend", handleRecommend);
app.post("/v1/memorial", handleMemorial);
app.post("/v1/feedback", handleFeedback);
app.get("/v1/feedback/summary", handleFeedbackSummary);
app.post("/v1/share", handleCreateShare);
app.get("/v1/share/:runId", handleGetShare);
app.get("/v1/share/:runId/image", handleGetShareImage);
app.get("/v1/share/:runId/og", handleGetShareOg);

// Same handlers under /api/* for live domain Worker Route patterns.
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/api/v1/recommend", handleRecommend);
app.post("/api/v1/memorial", handleMemorial);
app.post("/api/v1/feedback", handleFeedback);
app.get("/api/v1/feedback/summary", handleFeedbackSummary);
app.post("/api/v1/share", handleCreateShare);
app.get("/api/v1/share/:runId", handleGetShare);
app.get("/api/v1/share/:runId/image", handleGetShareImage);
app.get("/api/v1/share/:runId/og", handleGetShareOg);

export default app;
