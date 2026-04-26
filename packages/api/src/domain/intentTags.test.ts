import test from "node:test";
import assert from "node:assert/strict";
import { inferTagsFromFreeText } from "./intentTags";

test("inferTagsFromFreeText includes identity priority hints", () => {
  const classFirst = inferTagsFromFreeText({
    entryPath: "draft_a_run",
    signals: { identityPriority: "class_first" },
  });
  const raceFirst = inferTagsFromFreeText({
    entryPath: "draft_a_run",
    signals: { identityPriority: "race_first" },
  });
  assert.ok(classFirst.length > 0);
  assert.ok(raceFirst.length > 0);
});
