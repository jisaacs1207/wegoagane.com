/**
 * Fancy-punctuation sanitiser. We never ship em dashes, en dashes, ellipsis chars, or smart quotes
 * to the UI: they break copy density, confuse screen readers, and signal "AI slop". The model still
 * produces them despite system prompts forbidding it, so this is the post-parse safety net applied
 * to every recursively-walked string in `DestinyOutput`, `BuildPlanPayload`, and name candidates.
 *
 * Replacement rules:
 * - em dash (—)  -> " - "       (kept as a separator; collapsed below if surrounded by spaces)
 * - en dash (–)  -> "-"         (same; preserves ranges like "60-70")
 * - figure dash, horizontal bar, minus sign -> "-"
 * - ellipsis (…) -> "..."
 * - smart double quotes -> "
 * - smart single quotes -> '
 * - non-breaking / thin spaces -> regular space
 * - zero-width chars -> stripped
 */

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u2014]/g, " - "],
  [/[\u2013\u2012\u2015\u2212]/g, "-"],
  [/[\u2026]/g, "..."],
  [/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"'],
  [/[\u2018\u2019\u201A\u201B\u2039\u203A]/g, "'"],
  [/[\u00A0\u2007\u2009\u200A\u202F]/g, " "],
  [/[\u200B\u200C\u200D\uFEFF]/g, ""],
];

/** Apply replacements + collapse the " -  " runs em-dashes leave behind. Idempotent. */
export function stripFancyPunctuation(value: string): string {
  let next = value;
  for (const [re, repl] of REPLACEMENTS) {
    next = next.replace(re, repl);
  }
  // Collapse "  -  " -> " - " (em-dash replacement leaves doubled spaces if surrounded by spaces).
  next = next.replace(/[ \t]+-[ \t]+/g, " - ");
  next = next.replace(/[ \t]{2,}/g, " ");
  return next;
}

/** Recursively walk objects/arrays and rewrite every string leaf. Returns the same shape. */
export function deepStripFancyPunctuation<T>(value: T): T {
  if (typeof value === "string") {
    return stripFancyPunctuation(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deepStripFancyPunctuation(entry)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepStripFancyPunctuation(v);
    }
    return out as unknown as T;
  }
  return value;
}

/** Asserts a string contains none of the forbidden fancy chars. Used in tests + dev-only checks. */
export function containsFancyPunctuation(value: string): boolean {
  return /[\u2014\u2013\u2012\u2015\u2212\u2026\u201C\u201D\u201E\u201F\u00AB\u00BB\u2018\u2019\u201A\u201B\u2039\u203A]/.test(
    value,
  );
}
