import type { BuildIntentSignals, IntentDepth } from "../../lib/buildIntentTypes";

export type { IntentDepth } from "../../lib/buildIntentTypes";
export type CorePreset = "safe" | "balanced" | "bold";

export const STAT_OPTIONS = [
  { id: "stamina_forward", label: "Stam first" },
  { id: "intellect_forward", label: "Intellect focus" },
  { id: "agility_forward", label: "Agility focus" },
  { id: "strength_forward", label: "Strength focus" },
  { id: "spirit_forward", label: "Spirit" },
  { id: "balanced", label: "Balanced" },
  { id: "meme_glass", label: "Spicy / glass" },
] as const;

export const PROF_OPTIONS = [
  { id: "engineering_outs", label: "Engineering" },
  { id: "first_aid_mandatory_mindset", label: "First Aid heavy" },
  { id: "herbalism_alchemy_pair", label: "Herb + Alch" },
  { id: "alchemy_consumables", label: "Potion economy" },
  { id: "mining_engineering_pair", label: "Mine + Eng" },
  { id: "dual_gathering_bootstrap", label: "Dual gather" },
  { id: "skinning_mining_early", label: "Skin + mine early" },
  { id: "leatherworker_hunter_synergy", label: "LW + leather" },
  { id: "tailoring_bags_arcane", label: "Tailor + bags" },
  { id: "enchanter_disenchant_route", label: "Enchant + DE" },
  { id: "blacksmith_weaponsmith_fantasy", label: "Smith fantasy" },
  { id: "cooking_high_value", label: "Cooking focus" },
  { id: "fishing_supports_cooking", label: "Fish + cook" },
  { id: "fishing_optional", label: "Fishing optional" },
  { id: "early_gathering_then_pivot_engineering", label: "Gather then Eng pivot" },
  { id: "auction_house_play", label: "Auction house play" },
] as const;

export const VECTOR_OPTIONS = [
  { id: "solo", label: "Solo" },
  { id: "group_ok", label: "Group okay" },
  { id: "hybrid", label: "Hybrid toolkit" },
  { id: "pet", label: "Pet class" },
  { id: "melee", label: "Melee" },
  { id: "ranged", label: "Ranged" },
  { id: "caster", label: "Caster" },
  { id: "heal", label: "Healing" },
  { id: "tank", label: "Tank focus" },
  { id: "mana", label: "Mana" },
  { id: "rage", label: "Rage" },
  { id: "energy", label: "Energy" },
  { id: "demonic", label: "Dark fantasy" },
  { id: "holy", label: "Holy fantasy" },
  { id: "nature", label: "Nature fantasy" },
] as const;

export const RACE_MODES = [
  { id: "signal_inferred", label: "From answers" },
  { id: "optimize_theme", label: "Optimize" },
  { id: "surprise", label: "Surprise me" },
  { id: "user_pick", label: "I pick race" },
] as const;

export const DEPTH_OPTIONS: Array<{ id: IntentDepth; label: string; helper: string }> = [
  { id: "quick", label: "Quick pick", helper: "Fast start, fewer knobs, still HC-aware." },
  { id: "balanced", label: "Balanced", helper: "Best first-pass fit for most players." },
  { id: "dialed_in", label: "Dialed-in", helper: "More inputs, tighter fit, slightly slower." },
];

export function toggleList(list: string[] | undefined, id: string, max: number): string[] {
  const cur = list ?? [];
  if (cur.includes(id)) return cur.filter((x) => x !== id);
  if (cur.length >= max) return [...cur.slice(1), id];
  return [...cur, id];
}

export function applyCorePreset(value: BuildIntentSignals, preset: CorePreset): BuildIntentSignals {
  if (preset === "safe") {
    return {
      ...value,
      statPhilosophy: ["stamina_forward", "balanced"],
      professionIntents: ["engineering_outs", "first_aid_mandatory_mindset"],
      buildVectors: ["solo", "tank", "mana"],
    };
  }
  if (preset === "bold") {
    return {
      ...value,
      statPhilosophy: ["meme_glass", "agility_forward"],
      professionIntents: ["dual_gathering_bootstrap", "auction_house_play"],
      buildVectors: ["melee", "ranged", "solo"],
    };
  }
  return {
    ...value,
    statPhilosophy: ["balanced"],
    professionIntents: ["engineering_outs", "cooking_high_value"],
    buildVectors: ["solo", "group_ok"],
  };
}

export function optionLabel(id: string): string {
  const all = [...STAT_OPTIONS, ...PROF_OPTIONS, ...VECTOR_OPTIONS, ...RACE_MODES];
  return all.find((x) => x.id === id)?.label ?? id;
}

const STAT_IDS = STAT_OPTIONS.map((o) => o.id);
const PROF_IDS = PROF_OPTIONS.map((o) => o.id);
const VECTOR_IDS = VECTOR_OPTIONS.map((o) => o.id);
const RACE_MODE_IDS = RACE_MODES.map((o) => o.id);

function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDistinct<T>(pool: readonly T[], count: number, rng: () => number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  const n = Math.min(count, copy.length);
  while (out.length < n && copy.length) {
    const i = Math.floor(rng() * copy.length);
    out.push(copy.splice(i, 1)[0]!);
  }
  return out;
}

/**
 * Random intent slice from the full stat/prof/vector catalogs (lucky-roll quick path).
 * Deterministic per `seedStr` so rerolls change when the seed changes.
 */
export function rollRandomQuickPickSignals(seedStr: string): BuildIntentSignals {
  const rng = mulberry32(hashString(seedStr));
  const nStats = 2 + Math.floor(rng() * 2);
  const nProf = 2 + Math.floor(rng() * 3);
  const nVec = 3 + Math.floor(rng() * 4);
  return {
    statPhilosophy: pickDistinct(STAT_IDS, nStats, rng) as BuildIntentSignals["statPhilosophy"],
    professionIntents: pickDistinct(PROF_IDS, nProf, rng) as BuildIntentSignals["professionIntents"],
    buildVectors: pickDistinct(VECTOR_IDS, nVec, rng) as BuildIntentSignals["buildVectors"],
    raceMode: RACE_MODE_IDS[Math.floor(rng() * RACE_MODE_IDS.length)] as BuildIntentSignals["raceMode"],
  };
}

/** After a short guided path, fill missing dimensions so the ranker always has a coherent profile. */
export function fillBalancedAssumptions(s: BuildIntentSignals): BuildIntentSignals {
  const out: BuildIntentSignals = { ...s };
  if (!out.statPhilosophy?.length) {
    out.statPhilosophy = ["balanced", "stamina_forward"];
  }
  if (!out.professionIntents?.length) {
    out.professionIntents = ["engineering_outs", "first_aid_mandatory_mindset"];
  }
  if (!out.buildVectors?.length) {
    out.buildVectors = ["solo", "hybrid", "group_ok"];
  }
  if (!out.raceMode) out.raceMode = "signal_inferred";
  return out;
}

/** Human labels for chips the player picked in the build journey. */
export function signalSummaryLabels(s: BuildIntentSignals): string[] {
  const ids: string[] = [];
  ids.push(...(s.statPhilosophy ?? []));
  ids.push(...(s.professionIntents ?? []));
  ids.push(...(s.buildVectors ?? []));
  if (s.raceMode) ids.push(s.raceMode);
  return ids.map((id) => optionLabel(id));
}
