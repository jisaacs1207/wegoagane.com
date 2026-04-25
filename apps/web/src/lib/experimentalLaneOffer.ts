/** Deterministic cohort roll for experimental-lane UI offer (matches server-side traffic splits). */
export function experimentalCohortHit(sessionId: string, offerPercent: number): boolean {
  if (offerPercent <= 0 || offerPercent > 100) return false;
  let h = 2166136261;
  for (let i = 0; i < sessionId.length; i += 1) {
    h ^= sessionId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bucket = (h >>> 0) % 100;
  return bucket < offerPercent;
}
