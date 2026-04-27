import assert from "node:assert/strict";
import test from "node:test";
import { isStaleInProgressBuildPlan, shouldEmitEmergencyReadyFallback } from "./build";

test("isStaleInProgressBuildPlan is false for fresh generating rows", () => {
  const now = 1_000_000;
  const row = {
    status: "generating",
    updatedAt: new Date(now - 44_000),
  } as const;
  assert.equal(isStaleInProgressBuildPlan(row, now), false);
});

test("isStaleInProgressBuildPlan is true for stale queued rows", () => {
  const now = 1_000_000;
  const row = {
    status: "queued",
    updatedAt: new Date(now - 46_000),
  } as const;
  assert.equal(isStaleInProgressBuildPlan(row, now), true);
});

test("isStaleInProgressBuildPlan ignores terminal statuses", () => {
  const row = {
    status: "ready",
    updatedAt: new Date(0),
  } as const;
  assert.equal(isStaleInProgressBuildPlan(row, 1_000_000), false);
});

test("shouldEmitEmergencyReadyFallback is false before hard timeout", () => {
  const now = 1_000_000;
  const row = {
    status: "queued",
    updatedAt: new Date(now - 170_000),
  } as const;
  assert.equal(shouldEmitEmergencyReadyFallback(row, now), false);
});

test("shouldEmitEmergencyReadyFallback is true after hard timeout", () => {
  const now = 1_000_000;
  const row = {
    status: "generating",
    updatedAt: new Date(now - 181_000),
  } as const;
  assert.equal(shouldEmitEmergencyReadyFallback(row, now), true);
});

