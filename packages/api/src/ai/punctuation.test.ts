import test from "node:test";
import assert from "node:assert/strict";
import { containsFancyPunctuation, deepStripFancyPunctuation, stripFancyPunctuation } from "./punctuation";

test("stripFancyPunctuation replaces em dashes with hyphenated separator", () => {
  const out = stripFancyPunctuation("hot — sticky");
  assert.equal(out, "hot - sticky");
  assert.ok(!containsFancyPunctuation(out));
});

test("stripFancyPunctuation replaces en dashes with hyphen", () => {
  const out = stripFancyPunctuation("levels 60–70");
  assert.equal(out, "levels 60-70");
});

test("stripFancyPunctuation replaces ellipsis with three dots", () => {
  const out = stripFancyPunctuation("wait for it…");
  assert.equal(out, "wait for it...");
});

test("stripFancyPunctuation rewrites smart quotes to straight quotes", () => {
  const out = stripFancyPunctuation("\u201Csay it ain\u2019t so\u201D");
  assert.equal(out, "\"say it ain't so\"");
});

test("deepStripFancyPunctuation walks nested objects and arrays", () => {
  const input = {
    headline: "Edge of valor — proven",
    bullets: ["pull two — three at most", "no AH — SSF only"],
    nested: {
      whyDistinct: "soft cap heals \u2014 no GCD waste",
    },
  };
  const out = deepStripFancyPunctuation(input);
  assert.ok(!containsFancyPunctuation(out.headline));
  assert.ok(!containsFancyPunctuation(out.bullets[0]!));
  assert.ok(!containsFancyPunctuation(out.bullets[1]!));
  assert.ok(!containsFancyPunctuation(out.nested.whyDistinct));
});

test("stripFancyPunctuation is idempotent", () => {
  const once = stripFancyPunctuation("a — b — c");
  const twice = stripFancyPunctuation(once);
  assert.equal(once, twice);
});

test("containsFancyPunctuation true for em dash, false for ascii", () => {
  assert.ok(containsFancyPunctuation("we — go"));
  assert.ok(!containsFancyPunctuation("we - go"));
});
