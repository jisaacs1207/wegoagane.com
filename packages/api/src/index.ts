import { Hono } from "hono";
import { handleRecommend } from "./routes/recommend";
import { handleMemorial } from "./routes/memorial";
import { handleFeedback, handleFeedbackSummary } from "./routes/feedback";
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
    ],
  }),
);

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/v1/recommend", handleRecommend);
app.post("/v1/memorial", handleMemorial);
app.post("/v1/feedback", handleFeedback);
app.get("/v1/feedback/summary", handleFeedbackSummary);

// Same handlers under /api/* for live domain Worker Route patterns.
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/api/v1/recommend", handleRecommend);
app.post("/api/v1/memorial", handleMemorial);
app.post("/api/v1/feedback", handleFeedback);
app.get("/api/v1/feedback/summary", handleFeedbackSummary);

export default app;
