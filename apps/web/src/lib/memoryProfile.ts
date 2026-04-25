import type { ClassId } from "../icons/types";
import type { MemoryHints, PostAcceptRating, RerollReason } from "./recommendClient";

const STORAGE_KEY = "wegoagane.memory.v1";

type MemoryProfile = {
  version: 1;
  classSignals: Partial<Record<ClassId, { accepts: number; misses: number; almostRights: number }>>;
  rerollReasonCounts: Partial<Record<RerollReason, number>>;
  updatedAt: number;
};

const EMPTY_PROFILE: MemoryProfile = {
  version: 1,
  classSignals: {},
  rerollReasonCounts: {},
  updatedAt: Date.now(),
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Clears persisted browser memory so the next recommend request can rebuild hints from scratch. */
export function clearMemoryProfile(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-blocking storage.
  }
}

export function readMemoryProfile(): MemoryProfile {
  if (!canUseStorage()) return { ...EMPTY_PROFILE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed = JSON.parse(raw) as Partial<MemoryProfile>;
    if (parsed.version !== 1) return { ...EMPTY_PROFILE };
    return {
      version: 1,
      classSignals: parsed.classSignals ?? {},
      rerollReasonCounts: parsed.rerollReasonCounts ?? {},
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

function writeMemoryProfile(next: MemoryProfile): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-blocking storage.
  }
}

function ensureClassSignal(profile: MemoryProfile, classId: ClassId) {
  const existing = profile.classSignals[classId];
  if (existing) return existing;
  const created = { accepts: 0, misses: 0, almostRights: 0 };
  profile.classSignals[classId] = created;
  return created;
}

function bump(profile: MemoryProfile, reason: RerollReason) {
  profile.rerollReasonCounts[reason] = (profile.rerollReasonCounts[reason] ?? 0) + 1;
}

export function rememberAccept(classId: ClassId): void {
  const profile = readMemoryProfile();
  ensureClassSignal(profile, classId).accepts += 1;
  profile.updatedAt = Date.now();
  writeMemoryProfile(profile);
}

export function rememberReroll(reason: RerollReason, classId?: ClassId): void {
  const profile = readMemoryProfile();
  bump(profile, reason);
  if (classId) {
    const signal = ensureClassSignal(profile, classId);
    if (reason === "almost_right" || reason === "wrong_energy") {
      signal.almostRights += 1;
    } else {
      signal.misses += 1;
    }
  }
  profile.updatedAt = Date.now();
  writeMemoryProfile(profile);
}

export function rememberPostAcceptRating(classId: ClassId, rating: PostAcceptRating): void {
  const profile = readMemoryProfile();
  const signal = ensureClassSignal(profile, classId);
  if (rating === "good_pick" || rating === "this_is_it" || rating === "perfect") {
    signal.accepts += 1;
  } else {
    signal.misses += 1;
  }
  profile.updatedAt = Date.now();
  writeMemoryProfile(profile);
}

export function buildMemoryHints(): MemoryHints {
  const profile = readMemoryProfile();
  const classAffinity: Partial<Record<ClassId, number>> = {};
  let totalSamples = 0;
  for (const [classId, counts] of Object.entries(profile.classSignals) as Array<
    [ClassId, { accepts: number; misses: number; almostRights: number }]
  >) {
    const denom = counts.accepts + counts.misses + counts.almostRights;
    if (denom <= 0) continue;
    totalSamples += denom;
    const raw = (counts.accepts + counts.almostRights * 0.35 - counts.misses) / denom;
    classAffinity[classId] = clamp(Number(raw.toFixed(4)), -1, 1);
  }

  const confidence = clamp(totalSamples / 24, 0.05, 1);
  const rerollReasonCounts: Partial<Record<RerollReason, number>> = {};
  for (const [k, v] of Object.entries(profile.rerollReasonCounts)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const n = Math.min(1000, Math.max(0, Math.floor(v)));
    if (n > 0) rerollReasonCounts[k as RerollReason] = n;
  }
  return {
    version: 1,
    classAffinity: Object.keys(classAffinity).length > 0 ? classAffinity : undefined,
    rerollReasonCounts: Object.keys(rerollReasonCounts).length > 0 ? rerollReasonCounts : undefined,
    confidence,
    updatedAt: profile.updatedAt,
  };
}
