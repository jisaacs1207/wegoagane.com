/** WoW Classic-style character name: ASCII letters only, length 2–12 (US realms). */

export const WOW_NAME_MIN = 2;
export const WOW_NAME_MAX = 12;

const DENY_SUBSTRINGS = [
  "gm",
  "gm ",
  "admin",
  "mod",
  "hitler",
  "nazi",
  "nig",
  "fag",
  "rape",
];

export function isValidCharacterName(raw: string): boolean {
  const s = raw.trim();
  if (s.length < WOW_NAME_MIN || s.length > WOW_NAME_MAX) return false;
  if (!/^[A-Za-z]+$/.test(s)) return false;
  const lower = s.toLowerCase();
  for (const bad of DENY_SUBSTRINGS) {
    if (lower.includes(bad)) return false;
  }
  return true;
}

export function filterValidNames(names: string[]): string[] {
  return names.filter((n) => isValidCharacterName(n));
}
