import test from "node:test";
import assert from "node:assert/strict";
import { supplementFromExperimentalRates } from "./archetypeLearning";

test("supplementFromExperimentalRates returns empty when sample too small", () => {
  const r = supplementFromExperimentalRates(3, 2);
  assert.equal(r.label, "insufficient_sample");
  assert.equal(r.supplement, "");
});

test("supplementFromExperimentalRates flags high miss rate", () => {
  const r = supplementFromExperimentalRates(4, 10);
  assert.equal(r.label, "high_miss_rate");
  assert.ok(r.supplement.includes("first10"));
});

test("supplementFromExperimentalRates praises healthy lane", () => {
  const r = supplementFromExperimentalRates(12, 2);
  assert.equal(r.label, "healthy_accept_rate");
  assert.ok(r.supplement.includes("accepted"));
});
