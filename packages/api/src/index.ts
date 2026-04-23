import { Hono } from "hono";
import { handleRecommend } from "./routes/recommend";
import { handleMemorial } from "./routes/memorial";
import type { ApiEnv } from "./db/client";

const app = new Hono<ApiEnv>();

app.get("/", (c) =>
  c.json({
    name: "wegoagane-api",
    env: c.env.APP_ENV ?? "unknown",
    endpoints: ["GET /health", "POST /v1/recommend", "POST /v1/memorial"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/v1/recommend", handleRecommend);
app.post("/v1/memorial", handleMemorial);

// Same handlers under /api/* for live domain Worker Route patterns.
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));
app.post("/api/v1/recommend", handleRecommend);
app.post("/api/v1/memorial", handleMemorial);

export default app;
