import type { BuildIntentSignals } from "./buildIntentTypes";

/** Drops one constraint from stored build intent (vectors → stats → professions → race mode). */
export function softenBuildIntentOneSlot(storageKey: string): boolean {
  try {
    const raw = sessionStorage.getItem(storageKey);
    const cur: BuildIntentSignals = raw ? (JSON.parse(raw) as BuildIntentSignals) : {};
    const next = { ...cur };

    if (next.buildVectors?.length) {
      next.buildVectors = next.buildVectors.slice(0, -1);
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      return true;
    }
    if (next.statPhilosophy?.length) {
      next.statPhilosophy = next.statPhilosophy.slice(0, -1);
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      return true;
    }
    if (next.professionIntents?.length) {
      next.professionIntents = next.professionIntents.slice(0, -1);
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      return true;
    }
    if (next.raceMode && next.raceMode !== "signal_inferred") {
      next.raceMode = "signal_inferred";
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
