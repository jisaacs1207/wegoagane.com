import assert from "node:assert/strict";
import test from "node:test";
import {
  validateDestinyFeedbackInput,
  validateMemorialOutput,
  validateTemplateOutput,
} from "./validator";
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

test("validateTemplateOutput handles null bullets and null rationale without throwing", () => {
  const output = {
    headline: "Arcane frost path for mage players who enjoy mage",
    subline: "Safe path",
    classId: "mage",
    tierProse: "Safe path · template",
    bullets: null,
    rationale: null,
    sourceType: "ai",
  } as unknown as DestinyOutput;
  const failures = validateTemplateOutput(output);
  assert.ok(failures.includes("invalid_bullet_count"));
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

test("validateMemorialOutput allows omitted level (undefined) without invalid_level", () => {
  const output = {
    epitaph: "Honor found them in Elwynn and the lesson remains for us all today.",
    characterName: "Hero",
    level: undefined,
    location: "Elwynn Forest",
    cause: "Slain by wolves",
    faction: "alliance",
    sourceType: "template",
  } as unknown as MemorialOutput;
  assert.deepEqual(validateMemorialOutput(output), []);
});

test("validateDestinyFeedbackInput accepts valid M10 payload", () => {
  const input = validateDestinyFeedbackInput({
    sessionId: "session-1",
    destinyId: "destiny-1",
    choice: "almost_right",
    stage: "reroll_gate",
    rerollReason: "almost_right",
    rerollFromClassId: "mage",
    rerollToClassId: "warrior",
  });
  assert.equal(input.choice, "almost_right");
});
