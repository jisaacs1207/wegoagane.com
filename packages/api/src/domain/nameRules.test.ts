import test from "node:test";
import assert from "node:assert/strict";
import { isValidCharacterName } from "./nameRules";

test("rejects punctuation and spaces", () => {
  assert.equal(isValidCharacterName("Bad Name"), false);
  assert.equal(isValidCharacterName("Bad-Name"), false);
});

test("accepts valid wow-style names", () => {
  assert.equal(isValidCharacterName("Thalren"), true);
  assert.equal(isValidCharacterName("AB"), true);
});

test("rejects wrong length", () => {
  assert.equal(isValidCharacterName("A"), false);
  assert.equal(isValidCharacterName("A".repeat(13)), false);
});
