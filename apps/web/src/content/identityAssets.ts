import type { ClassId } from "../icons/types";

export type FactionId = "horde" | "alliance" | "neutral";
export type RaceId =
  | "human"
  | "dwarf"
  | "night_elf"
  | "gnome"
  | "orc"
  | "troll"
  | "tauren"
  | "undead"
  | "neutral";

/** Entrance-vector keys — aligned with `BuildIntentChips` vector step. */
export type JourneyVectorKey =
  | "profession"
  | "playstyle"
  | "class_fantasy"
  | "combat_style"
  | "survivability"
  | "surprise";

const RACE_PLACEHOLDER = "/placeholders/races/rune.svg";

/**
 * Drop-in placeholder asset manifest.
 * Replace files under `public/placeholders/` with licensed art as needed.
 */
export const CLASS_ASSET_URLS: Record<ClassId, string> = {
  warrior: "/placeholders/classes/warrior.svg",
  mage: "/placeholders/classes/mage.svg",
  rogue: "/placeholders/classes/rogue.svg",
  priest: "/placeholders/classes/priest.svg",
  hunter: "/placeholders/classes/hunter.svg",
  warlock: "/placeholders/classes/warlock.svg",
  druid: "/placeholders/classes/druid.svg",
  paladin: "/placeholders/classes/paladin.svg",
  shaman: "/placeholders/classes/shaman.svg",
};

export const FACTION_ASSET_URLS: Record<FactionId, string> = {
  horde: "/placeholders/factions/horde.svg",
  alliance: "/placeholders/factions/alliance.svg",
  neutral: "/placeholders/factions/neutral.svg",
};

export const RACE_ASSET_URLS: Record<RaceId, string> = {
  human: RACE_PLACEHOLDER,
  dwarf: RACE_PLACEHOLDER,
  night_elf: RACE_PLACEHOLDER,
  gnome: RACE_PLACEHOLDER,
  orc: RACE_PLACEHOLDER,
  troll: RACE_PLACEHOLDER,
  tauren: RACE_PLACEHOLDER,
  undead: RACE_PLACEHOLDER,
  neutral: RACE_PLACEHOLDER,
};

export const VECTOR_JOURNEY_URLS: Record<JourneyVectorKey, string> = {
  profession: "/placeholders/journey/vector-profession.svg",
  playstyle: "/placeholders/journey/vector-playstyle.svg",
  class_fantasy: "/placeholders/journey/vector-class-fantasy.svg",
  combat_style: "/placeholders/journey/vector-combat.svg",
  survivability: "/placeholders/journey/vector-survivability.svg",
  surprise: "/placeholders/journey/vector-surprise.svg",
};

export const DEPTH_JOURNEY_URL = "/placeholders/journey/depth.svg";

/** Depth-specific crest (replaces generic depth icon when strip is expanded). */
export const DEPTH_VISUAL_URLS: Record<"quick" | "balanced" | "dialed_in", string> = {
  quick: "/placeholders/journey/depth-quick.svg",
  balanced: "/placeholders/journey/depth-balanced.svg",
  dialed_in: "/placeholders/journey/depth-dialed.svg",
};

/** Core route preset from journey step 1. */
export const CORE_PRESET_VISUAL_URLS: Record<"safe" | "balanced" | "bold", string> = {
  safe: "/placeholders/journey/preset-safe.svg",
  balanced: "/placeholders/journey/preset-balanced.svg",
  bold: "/placeholders/journey/preset-bold.svg",
};

export const PROF_SLOT_URL = "/placeholders/journey/profession-slot.svg";
export const ITEM_SLOT_URL = "/placeholders/journey/item-slot.svg";

export function inferRaceFromHeadline(headline: string): RaceId {
  const h = headline.toLowerCase();
  if (h.includes("human")) return "human";
  if (h.includes("dwarf")) return "dwarf";
  if (h.includes("night elf")) return "night_elf";
  if (h.includes("gnome")) return "gnome";
  if (h.includes("orc")) return "orc";
  if (h.includes("troll")) return "troll";
  if (h.includes("tauren")) return "tauren";
  if (h.includes("undead")) return "undead";
  return "neutral";
}

export function inferFactionFromRace(raceId: RaceId): FactionId {
  if (raceId === "neutral") return "neutral";
  if (raceId === "human" || raceId === "dwarf" || raceId === "night_elf" || raceId === "gnome") return "alliance";
  return "horde";
}
