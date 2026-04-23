import { drizzle } from "drizzle-orm/d1";

export type ApiEnv = {
  Bindings: {
    DB: D1Database;
    APP_ENV: string;
    SITE_ORIGIN?: string;
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
