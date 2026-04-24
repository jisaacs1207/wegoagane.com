/** Optional journey tuning stored beside `BuildIntentSignals` JSON. */

export type PowerCurveId = "early" | "mid" | "late" | "balanced";

export function readPowerCurve(storageKey: string): PowerCurveId | null {
  try {
    const raw = sessionStorage.getItem(`${storageKey}.powerCurve`);
    if (raw === "early" || raw === "mid" || raw === "late" || raw === "balanced") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function augmentMoodWithPower(mood: string | undefined, storageKey: string): string | undefined {
  const p = readPowerCurve(storageKey);
  if (!p) return mood;
  const tag = p === "balanced" ? "Balanced power curve" : `${p === "early" ? "Early" : p === "mid" ? "Mid" : "Late"}-weighted power`;
  const combined = [mood, `(${tag})`].filter(Boolean).join(" · ");
  return combined.slice(0, 80);
}

export function augmentFreeformWithPower(freeform: string | undefined, storageKey: string): string | undefined {
  const p = readPowerCurve(storageKey);
  if (!p) return freeform;
  const bit = `Power curve: ${p}.`;
  return [freeform, bit].filter(Boolean).join("\n").slice(0, 240);
}

export function augmentNextSignalWithPower(base: string, storageKey: string): string {
  const p = readPowerCurve(storageKey);
  if (!p) return base.slice(0, 80);
  return `${base} (${p} power)`.slice(0, 80);
}
