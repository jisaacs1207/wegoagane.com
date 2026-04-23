import assert from "node:assert/strict";
import test from "node:test";
import { validateMemorialOutput, validateTemplateOutput } from "./validator";
import type { DestinyOutput, MemorialOutput } from "./types";

test("validateTemplateOutput accepts a valid template destiny", () => {
  const output: DestinyOutput = {
    headline: "Orc Frost Mage",
    subline: "Safe path",
    classId: "mage",
    tierProse: "Safe path · template",
    bullets: ["a", "b", "c"],
    rationale: "Long enough rationale for validation checks.",
    sourceType: "template",
  };
  assert.deepEqual(validateTemplateOutput(output, "horde"), []);
});

test("validateMemorialOutput rejects invalid memorial content", () => {
  const output: MemorialOutput = {
    epitaph: "short",
    characterName: "",
    level: 99,
    location: "",
    cause: "",
    faction: "neutral",
    sourceType: "template",
  };
  assert.ok(validateMemorialOutput(output).length > 0);
});
