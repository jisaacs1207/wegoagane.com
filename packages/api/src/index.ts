import { Hono } from "hono";
import { handleRecommend } from "./routes/recommend";
import type { ApiEnv } from "./db/client";

const app = new Hono<ApiEnv>();

app.get("/", (c) =>
  c.json({
    name: "wegoagane-api",
    env: c.env.APP_ENV ?? "unknown",
    endpoints: ["GET /health", "POST /v1/recommend"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/v1/recommend", handleRecommend);

// Same handlers under /api/* for live domain Worker Route patterns.
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/api/v1/recommend", handleRecommend);

export default app;
