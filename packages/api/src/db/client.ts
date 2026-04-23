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
    /** Plain var or JSON binding; compare with `isTruthyEnv` in adapter, not `=== "true"` only */
    AI_ENABLED?: string | boolean;
    AI_GATEWAY_URL?: string;
    AI_GATEWAY_TOKEN?: string;
    AI_MODEL_DESTINY?: string;
    AI_MODEL_MEMORIAL?: string;
    AI_APP_TITLE?: string;
    AI_PROVIDER_SORT?: string;
  };
};

export function getDb(db: D1Database) {
  return drizzle(db);
}
