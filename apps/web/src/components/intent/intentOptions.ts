import type { BuildIntentSignals, IntentDepth } from "../../lib/buildIntentTypes";
import { wowPackUrl } from "../../content/identityAssets";

export type { IntentDepth } from "../../lib/buildIntentTypes";
export type CorePreset = "safe" | "balanced" | "bold";

/** UI-side single-profession id (NOT a server tag). Primary picker emits one; secondary picker emits one. */
export type ProfessionId =
  | "engineering"
  | "alchemy"
  | "herbalism"
  | "mining"
  | "tailoring"
  | "leatherworking"
  | "blacksmithing"
  | "enchanting"
  | "skinning"
  | "auction_house";

export type ProfessionOption = {
  id: ProfessionId;
  label: string;
  iconUrl: string;
  /** When true, this option is hidden if soloSelfFound is on. */
  hideUnderSsf?: boolean;
};

/** Profession tags that act as a single "anchor" row in legacy paired-chip flows (filter + question stacks). */
export const PROFESSION_INTENT_ANCHOR_TAGS = new Set<string>([
  "engineering_outs",
  "herbalism_alchemy_pair",
  "tailoring_bags_arcane",
  "blacksmith_weaponsmith_fantasy",
  "leatherworker_hunter_synergy",
  "auction_house_play",
]);

/** Remove SSF-incompatible tags from a signal slice (used after quick roll + for balanced fill defaults). */
export function stripSsfIncompatibleSignals(s: BuildIntentSignals): BuildIntentSignals {
  return {
    ...s,
    professionIntents: (s.professionIntents ?? []).filter((p) => p !== "auction_house_play") as BuildIntentSignals["professionIntents"],
    buildVectors: (s.buildVectors ?? []).filter((v) => v !== "group_ok") as BuildIntentSignals["buildVectors"],
  };
}

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
  { id: "herbalism_alchemy_pair", label: "Herb + Alchemy" },
  { id: "alchemy_consumables", label: "Alchemy" },
  { id: "mining_engineering_pair", label: "Mining + Engineering" },
  { id: "dual_gathering_bootstrap", label: "Dual gathering" },
  { id: "skinning_mining_early", label: "Skinning + Mining" },
  { id: "leatherworker_hunter_synergy", label: "Leatherworking + Skinning" },
  { id: "tailoring_bags_arcane", label: "Tailoring" },
  { id: "enchanter_disenchant_route", label: "Enchanting" },
  { id: "blacksmith_weaponsmith_fantasy", label: "Blacksmithing" },
  { id: "cooking_high_value", label: "Cooking focus" },
  { id: "fishing_supports_cooking", label: "Fish + Cook" },
  { id: "fishing_optional", label: "Fishing optional" },
  { id: "early_gathering_then_pivot_engineering", label: "Gather then Eng pivot" },
  { id: "auction_house_play", label: "Auction house" },
] as const;

/**
 * Single-profession picker catalog (UI-only).
 * Fishing, Cooking, and First Aid are intentionally excluded — they're assumed always available.
 * Order roughly matches the WoW profession trainer panel.
 */
export const PROFESSION_PICKER_OPTIONS: ProfessionOption[] = [
  { id: "engineering", label: "Engineering", iconUrl: wowPackUrl("Trade", "engineering.png") },
  { id: "alchemy", label: "Alchemy", iconUrl: wowPackUrl("Trade", "alchemy.png") },
  { id: "herbalism", label: "Herbalism", iconUrl: wowPackUrl("Trade", "herbalism.png") },
  { id: "mining", label: "Mining", iconUrl: wowPackUrl("Trade", "mining.png") },
  { id: "tailoring", label: "Tailoring", iconUrl: wowPackUrl("Trade", "tailoring.png") },
  { id: "leatherworking", label: "Leatherworking", iconUrl: wowPackUrl("Trade", "leatherworking.png") },
  { id: "blacksmithing", label: "Blacksmithing", iconUrl: wowPackUrl("Trade", "blacksmithing.png") },
  { id: "enchanting", label: "Enchanting", iconUrl: wowPackUrl("Trade", "Disenchant.png") },
  { id: "skinning", label: "Skinning", iconUrl: wowPackUrl("Trade", "leatherworking.png") },
  { id: "auction_house", label: "Auction-house focus", iconUrl: wowPackUrl("Miscellaneous", "Coin_01.png"), hideUnderSsf: true },
];

/**
 * Convert a single-profession (or pair of single-profession) UI pick into the stored
 * `ProfessionIntentTag[]` understood by viability + the ranker. Recognises canonical pairs
 * (Mine+Eng, Herb+Alch, LW+Skin) and falls back to one or two single-profession tags.
 */
export function professionPickToTags(
  primary: ProfessionId | null,
  secondary: ProfessionId | null = null,
): NonNullable<BuildIntentSignals["professionIntents"]> {
  if (!primary && !secondary) return [];
  const pair = new Set<ProfessionId>();
  if (primary) pair.add(primary);
  if (secondary) pair.add(secondary);

  if (pair.has("mining") && pair.has("engineering")) {
    return ["mining_engineering_pair", "engineering_outs"];
  }
  if (pair.has("herbalism") && pair.has("alchemy")) {
    return ["herbalism_alchemy_pair"];
  }
  if (pair.has("leatherworking") && pair.has("skinning")) {
    return ["leatherworker_hunter_synergy"];
  }
  if (pair.has("herbalism") && pair.has("mining")) {
    return ["dual_gathering_bootstrap"];
  }
  if (pair.has("skinning") && pair.has("mining")) {
    return ["skinning_mining_early"];
  }

  const single = (id: ProfessionId | null): NonNullable<BuildIntentSignals["professionIntents"]> => {
    if (!id) return [];
    switch (id) {
      case "engineering":
        return ["engineering_outs"];
      case "alchemy":
        return ["alchemy_consumables"];
      case "herbalism":
        return ["herbalism_alchemy_pair"];
      case "mining":
        return ["mining_engineering_pair"];
      case "tailoring":
        return ["tailoring_bags_arcane"];
      case "leatherworking":
        return ["leatherworker_hunter_synergy"];
      case "blacksmithing":
        return ["blacksmith_weaponsmith_fantasy"];
      case "enchanting":
        return ["enchanter_disenchant_route"];
      case "skinning":
        return ["dual_gathering_bootstrap"];
      case "auction_house":
        return ["auction_house_play"];
      default:
        return [];
    }
  };

  const merged = new Set<NonNullable<BuildIntentSignals["professionIntents"]>[number]>([
    ...single(primary),
    ...single(secondary),
  ]);
  return [...merged];
}

/** Returns the visible profession picker list for the current SSF mode. */
export function professionOptionsFor(soloSelfFound: boolean): ProfessionOption[] {
  return PROFESSION_PICKER_OPTIONS.filter((o) => !(o.hideUnderSsf && soloSelfFound));
}

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
  { id: "quick", label: "Quick pick", helper: "Random bundle from the full filter catalog. Edit, reroll, generate." },
  { id: "balanced", label: "Balanced", helper: "One primary pillar + one secondary pillar. We infer the rest." },
  { id: "dialed_in", label: "Dialed-in", helper: "Open every category at once and tune chip-by-chip." },
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
    out.buildVectors = out.soloSelfFound ? ["solo", "hybrid", "tank"] : ["solo", "hybrid", "group_ok"];
  }
  if (!out.raceMode) out.raceMode = "signal_inferred";
  return out.soloSelfFound ? stripSsfIncompatibleSignals(out) : out;
}

/** Quick roll replaces intent chips but keeps identity fields the player may have set later. */
export function mergeQuickRollPreserveIdentity(
  base: BuildIntentSignals,
  rolled: BuildIntentSignals,
): BuildIntentSignals {
  const merged = {
    ...rolled,
    factionPreference: base.factionPreference,
    pickedRace: base.pickedRace,
    genderLean: base.genderLean,
    soloSelfFound: base.soloSelfFound,
  };
  return base.soloSelfFound ? stripSsfIncompatibleSignals(merged) : merged;
}

/** Human labels for chips the player picked in the build journey. */
export function signalSummaryLabels(s: BuildIntentSignals): string[] {
  const ids: string[] = [];
  ids.push(...(s.statPhilosophy ?? []));
  ids.push(...(s.professionIntents ?? []));
  ids.push(...(s.buildVectors ?? []));
  if (s.raceMode) ids.push(s.raceMode);
  const labels = ids.map((id) => optionLabel(id));
  return s.soloSelfFound ? ["Solo Self Found", ...labels] : labels;
}
