/**
 * Slug helpers for `build_commits.slug` — short, URL-safe, hard to guess so casual visitors don't
 * walk the namespace, but readable when shared.
 */

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/**
 * 10-char base32-ish slug. Reserved chars (0/1/l/o) excluded so slugs never look ambiguous.
 */
export function generateBuildSlug(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length];
  }
  return out;
}

/**
 * Wilson lower bound (95%) for thumbs up / down. Returns 0 when no votes so empty rows sort last.
 * Smoothes single-vote outliers without blocking new builds from climbing.
 */
export function wilsonRatingScore(thumbsUp: number, thumbsDown: number): number {
  const n = thumbsUp + thumbsDown;
  if (n <= 0) return 0;
  const z = 1.96;
  const p = thumbsUp / n;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return Number(((center - margin) / denom).toFixed(6));
}
