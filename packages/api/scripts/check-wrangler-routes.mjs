#!/usr/bin/env node

import { readFileSync } from "node:fs";

const path = new URL("../wrangler.toml", import.meta.url);
const content = readFileSync(path, "utf8");

const lines = content.split("\n");
let inTopLevel = true;
let hasTopLevelRoutes = false;
for (const line of lines) {
  if (/^\s*\[/.test(line)) inTopLevel = false;
  if (inTopLevel && /^\s*routes\s*=\s*\[/.test(line)) {
    hasTopLevelRoutes = true;
    break;
  }
}

const hasProductionSection = /^\s*\[env\.production\]/m.test(content);
const hasProductionRoutes = /^\s*\[env\.production\][\s\S]*?^\s*routes\s*=\s*\[/m.test(content);

if (hasTopLevelRoutes) {
  console.error("wrangler.toml must not define top-level routes; use [env.production].routes only.");
  process.exit(1);
}

if (!hasProductionSection || !hasProductionRoutes) {
  console.error("wrangler.toml must define routes under [env.production].");
  process.exit(1);
}

console.log("Wrangler route scoping OK (production-only routes).");
