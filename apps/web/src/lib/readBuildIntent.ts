import type { BuildIntentSignals } from "./buildIntentTypes";

export function readBuildIntent(storageKey: string): BuildIntentSignals {
  try {
    const r = sessionStorage.getItem(storageKey);
    if (!r) return {};
    return JSON.parse(r) as BuildIntentSignals;
  } catch {
    return {};
  }
}
