import assert from "node:assert/strict";
import test from "node:test";
import { fallbackShareSvg, renderShareSvg, shareImageUrl } from "./share";

test("renderShareSvg includes destiny headline and optional memorial data", () => {
  const svg = renderShareSvg({
    destiny: {
      headline: "Orc Frost Mage",
      subline: "Safe path",
      classId: "mage",
      tierProse: "Suggested path",
      bullets: ["A", "B", "C"],
    },
    memorial: {
      epitaph: "They pulled once too often.",
      characterName: "Stonkee",
      level: 47,
      location: "STV",
      cause: "Patrol",
      faction: "horde",
    },
  });
  assert.ok(svg.includes("Orc Frost Mage"));
  assert.ok(svg.includes("Stonkee"));
});

test("fallbackShareSvg embeds run id", () => {
  const svg = fallbackShareSvg("run-123");
  assert.ok(svg.includes("run-123"));
});

test("shareImageUrl uses configured base when present", () => {
  const url = shareImageUrl(
    {
      APP_ENV: "test",
      DB: {} as D1Database,
      SHARE_IMAGES: {} as R2Bucket,
      SHARE_IMAGE_BASE_URL: "https://wegoagane.com/api/v1/share",
    },
    "run-abc",
  );
  assert.equal(url, "https://wegoagane.com/api/v1/share/run-abc/image");
});
