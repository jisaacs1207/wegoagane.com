import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Guard test: AI prompt sources must never contain fancy punctuation, otherwise the model is
// primed to mirror it back. We grep the prompt files directly so any future edit that introduces
// an em dash or smart quote fails CI fast.
const __dirname = dirname(fileURLToPath(import.meta.url));

const PROMPT_FILES = [
  join(__dirname, "adapter.ts"),
  join(__dirname, "buildPlan.ts"),
  join(__dirname, "experimentalArchetype.ts"),
];

const FANCY_RE = /[\u2014\u2013\u2026\u201C\u201D\u2018\u2019]/;

for (const file of PROMPT_FILES) {
  test(`prompt source has no fancy punctuation: ${file.split("/").slice(-2).join("/")}`, () => {
    const src = readFileSync(file, "utf-8");
    if (FANCY_RE.test(src)) {
      // Find first offender for a useful failure message.
      const match = src.match(FANCY_RE);
      const idx = match?.index ?? 0;
      const ctx = src.slice(Math.max(0, idx - 40), idx + 40);
      assert.fail(`Found fancy punctuation in ${file}: ...${ctx}...`);
    }
  });
}
