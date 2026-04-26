import { archetypes } from "./archetypes";
import type { Archetype, ClassId, Faction, RecommendInput } from "./types";

const ALL_CLASSES: ClassId[] = [
  "mage",
  "hunter",
  "warrior",
  "warlock",
  "priest",
  "rogue",
  "druid",
  "paladin",
  "shaman",
];

function intersect(a: ClassId[], b: ClassId[]): ClassId[] {
  const setB = new Set(b);
  return a.filter((c) => setB.has(c));
}

function classesForStatPhilosophy(tags: NonNullable<RecommendInput["signals"]["statPhilosophy"]>): ClassId[] {
  if (tags.length === 0) return [...ALL_CLASSES];
  let pool: ClassId[] | null = null;
  for (const t of tags) {
    let slice: ClassId[];
    switch (t) {
      case "intellect_forward":
        slice = ["mage", "warlock", "priest", "druid"];
        break;
      case "spirit_forward":
        slice = ["priest", "druid", "mage", "warlock"];
        break;
      case "agility_forward":
        slice = ["hunter", "rogue", "druid", "shaman", "warrior"];
        break;
      case "strength_forward":
        slice = ["warrior", "paladin", "shaman"];
        break;
      case "stamina_forward":
      case "balanced":
      case "meme_glass":
        slice = [...ALL_CLASSES];
        break;
      default:
        slice = [...ALL_CLASSES];
    }
    pool = pool === null ? slice : intersect(pool, slice);
  }
  return pool ?? [...ALL_CLASSES];
}

function classesForProfessionIntents(
  intents: NonNullable<RecommendInput["signals"]["professionIntents"]>,
): ClassId[] {
  if (intents.length === 0) return [...ALL_CLASSES];
  let pool: ClassId[] | null = null;
  for (const p of intents) {
    let slice: ClassId[];
    switch (p) {
      case "leatherworker_hunter_synergy":
        slice = ["hunter", "rogue", "druid"];
        break;
      case "tailoring_bags_arcane":
        slice = ["mage", "warlock", "priest"];
        break;
      case "blacksmith_weaponsmith_fantasy":
        slice = ["warrior", "paladin", "shaman"];
        break;
      default:
        slice = [...ALL_CLASSES];
    }
    pool = pool === null ? slice : intersect(pool, slice);
  }
  return pool ?? [...ALL_CLASSES];
}

function classesForVectors(vectors: NonNullable<RecommendInput["signals"]["buildVectors"]>): ClassId[] {
  if (vectors.length === 0) return [...ALL_CLASSES];
  let pool: ClassId[] | null = null;
  for (const v of vectors) {
    let slice: ClassId[];
    switch (v) {
      case "pet":
        slice = ["hunter", "warlock"];
        break;
      case "rage":
        slice = ["warrior", "druid"];
        break;
      case "energy":
        slice = ["rogue", "druid"];
        break;
      case "mana":
      case "caster":
      case "ranged":
        slice = ["mage", "warlock", "priest", "hunter", "druid", "shaman"];
        break;
      case "melee":
        slice = ["warrior", "rogue", "paladin", "shaman", "druid", "hunter"];
        break;
      case "heal":
        slice = ["priest", "paladin", "druid", "shaman"];
        break;
      case "tank":
        slice = ["warrior", "paladin", "druid"];
        break;
      case "holy":
        slice = ["paladin", "priest"];
        break;
      case "demonic":
        slice = ["warlock"];
        break;
      case "nature":
        slice = ["druid", "shaman"];
        break;
      case "hybrid":
        slice = ["druid", "shaman", "paladin"];
        break;
      default:
        slice = [...ALL_CLASSES];
    }
    pool = pool === null ? slice : intersect(pool, slice);
  }
  return pool ?? [...ALL_CLASSES];
}

function applyFaction(classes: ClassId[], faction?: Faction): ClassId[] {
  if (!faction) return classes;
  if (faction === "alliance") return classes.filter((c) => c !== "shaman");
  return classes.filter((c) => c !== "paladin");
}

export type ViabilityResult = {
  allowedClasses: ClassId[];
  allowedArchetypeKeys: string[];
  notes: string[];
};

/**
 * Whole-build viability: intersect constraints from stats, professions, vectors, faction.
 */
export function computeViability(input: RecommendInput): ViabilityResult {
  const notes: string[] = [];
  const { signals } = input;

  let classes = [...ALL_CLASSES];
  classes = applyFaction(classes, signals.factionPreference);

  const stat = signals.statPhilosophy ?? [];
  let prof = signals.professionIntents ?? [];
  let vec = signals.buildVectors ?? [];

  if (signals.soloSelfFound) {
    const before = prof.length;
    prof = prof.filter((p) => p !== "auction_house_play");
    if (prof.length !== before) notes.push("ssf_dropped_auction_house_play");
    if (!vec.includes("solo")) {
      vec = [...vec, "solo"];
      notes.push("ssf_added_solo_vector");
    }
    if (vec.includes("group_ok")) {
      vec = vec.filter((v) => v !== "group_ok");
      notes.push("ssf_dropped_group_ok");
    }
  }

  const byStat = classesForStatPhilosophy(stat);
  const byProf = classesForProfessionIntents(prof);
  const byVec = classesForVectors(vec);

  if (stat.length) classes = intersect(classes, byStat);
  if (prof.length) classes = intersect(classes, byProf);
  if (vec.length) classes = intersect(classes, byVec);

  if (stat.length) notes.push("applied_stat_philosophy");
  if (prof.length) notes.push("applied_profession_intents");
  if (vec.length) notes.push("applied_build_vectors");
  if (signals.soloSelfFound) notes.push("applied_solo_self_found");

  if (signals.preferredClass && !classes.includes(signals.preferredClass)) {
    notes.push("preferred_class_incompatible_with_constraints");
  }

  const excluded = new Set(signals.excludedClasses ?? []);
  classes = classes.filter((c) => !excluded.has(c));

  const allowedArchetypeKeys = archetypes.filter((a) => classes.includes(a.classId)).map((a) => a.key);

  if (classes.length === 0) notes.push("no_class_survived_filters");

  return { allowedClasses: classes, allowedArchetypeKeys, notes };
}

/**
 * Widen class eligibility to faction + excluded-classes only (ignore stat/profession/vector tags).
 * Used when strict `computeViability` yields zero archetypes but AI is available so we can still
 * pick a template archetype, rank it, and let `enrichDestiny` shape copy toward the player's signals.
 */
export function computeRelaxedViability(input: RecommendInput): ViabilityResult {
  const notes: string[] = ["relaxed_stat_prof_vector_for_ai_sink"];
  const { signals } = input;

  let classes = [...ALL_CLASSES];
  classes = applyFaction(classes, signals.factionPreference);

  const excluded = new Set(signals.excludedClasses ?? []);
  classes = classes.filter((c) => !excluded.has(c));

  if (signals.preferredClass && !classes.includes(signals.preferredClass)) {
    notes.push("preferred_class_incompatible_with_faction_or_exclusions");
  }

  const allowedArchetypeKeys = archetypes.filter((a) => classes.includes(a.classId)).map((a) => a.key);

  return { allowedClasses: classes, allowedArchetypeKeys, notes };
}

export function filterArchetypesByViability(archetypeList: Archetype[], viability: ViabilityResult): Archetype[] {
  const allowed = new Set(viability.allowedArchetypeKeys);
  return archetypeList.filter((a) => allowed.has(a.key));
}
