import { drizzle } from "drizzle-orm/d1";

export type ApiEnv = {
  Bindings: {
    DB: D1Database;
    SHARE_IMAGES?: R2Bucket;
    APP_ENV: string;
    SITE_ORIGIN?: string;
    SHARE_IMAGE_BASE_URL?: string;
    SHARE_RENDER_TIMEOUT_MS?: string;
    POSTHOG_ENABLED?: string | boolean;
    POSTHOG_HOST?: string;
    POSTHOG_PROJECT_API_KEY?: string;
    MEMORY_BIAS_ENABLED?: string | boolean;
    MEMORY_BROWSER_WEIGHT?: string;
    MEMORY_SERVER_WEIGHT?: string;
    MEMORY_MAX_BIAS?: string;
    MEMORY_DEGRADE_MODE?: string | boolean;
    MEMORY_DEGRADE_SCALE?: string;
    MEMORY_LOOKBACK_LIMIT?: string;
    GROWTH_AUTOPILOT_ENABLED?: string | boolean;
    GROWTH_HARD_STOP_ENABLED?: string | boolean;
    GROWTH_DEFAULT_TRAFFIC_PERCENT?: string;
    GROWTH_DEFAULT_HOLDOUT_PERCENT?: string;
    GROWTH_MIN_SAMPLE_SIZE?: string;
    /** 0–100: experimental vs curated lane offer (see analytics config). */
    EXPERIMENTAL_LANE_OFFER_PERCENT?: string;
    GROWTH_CONTROL_TOKEN?: string;
    /** Plain var or JSON binding; compare with `isTruthyEnv` in adapter, not `=== "true"` only */
    AI_ENABLED?: string | boolean;
    AI_GATEWAY_URL?: string;
    AI_GATEWAY_TOKEN?: string;
    AI_MODEL_DESTINY?: string;
    AI_MODEL_MEMORIAL?: string;
    /** Optional heavier model for build-plan generation + review */
    AI_MODEL_BUILD?: string;
    /** When true, run a second AI pass to revise the build JSON. Default off to avoid double timeouts. */
    AI_BUILD_PLAN_REVIEW?: string | boolean;
    AI_APP_TITLE?: string;
    AI_PROVIDER_SORT?: string;
    /** Internal pin for Classic Era HC ruleset (build plans, prompts) */
    RULESET_PIN?: string;
    /** Bumped when changing static experimental prompt; stored on archetype_candidates rows. */
    EXPERIMENTAL_PROMPT_REVISION?: string;
    /** When false, skip cron-driven experimental prompt supplement updates. */
    EXPERIMENTAL_LEARNING_ENABLED?: string | boolean;
  };
};

export function getDb(db: D1Database) {
  return drizzle(db);
}
