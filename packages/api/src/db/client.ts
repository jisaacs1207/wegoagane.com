import { drizzle } from "drizzle-orm/d1";

export type ApiEnv = {
  Bindings: {
    DB: D1Database;
    APP_ENV: string;
  };
};

export function getDb(db: D1Database) {
  return drizzle(db);
}
