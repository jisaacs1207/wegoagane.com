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

/**
 * Vendored WoW UI texture pack (user-supplied). Served from `public/` as static files.
 * Internal folders keep original names (spaces OK); URLs encode each segment.
 */
export const WOW_ICON_PACK_BASE = "/wegoagane-wow-icon-pack-v1";

export function wowPackUrl(...pathSegments: string[]): string {
  return `${WOW_ICON_PACK_BASE}/${pathSegments.map((s) => encodeURIComponent(s)).join("/")}`;
}

const CHAR = "Characters and Creatures";
const TRADE = "Trade";
const ABIL = "Abilities";
const SPELL = "Spells";
const MISC = "Miscellaneous";
const ARMOUR = "Armour";

/** Class crest textures from pack (`mage.png`, `warrior.png`, …). */
export const CLASS_ASSET_URLS: Record<ClassId, string> = {
  warrior: wowPackUrl(CHAR, "warrior.png"),
  mage: wowPackUrl(CHAR, "mage.png"),
  rogue: wowPackUrl(CHAR, "rogue.png"),
  priest: wowPackUrl(CHAR, "priest.png"),
  hunter: wowPackUrl(CHAR, "hunter.png"),
  warlock: wowPackUrl(CHAR, "warlock.png"),
  druid: wowPackUrl(CHAR, "druid.png"),
  paladin: wowPackUrl(CHAR, "paladin.png"),
  shaman: wowPackUrl(CHAR, "shaman.png"),
};

/** Race portraits from pack (Classic-era humanoid busts). */
export const RACE_ASSET_URLS: Record<RaceId, string> = {
  human: wowPackUrl(CHAR, "human.png"),
  dwarf: wowPackUrl(CHAR, "dwarf.png"),
  night_elf: wowPackUrl(CHAR, "nelf.png"),
  gnome: wowPackUrl(CHAR, "gnome.png"),
  orc: wowPackUrl(CHAR, "orc.png"),
  troll: wowPackUrl(CHAR, "troll.png"),
  tauren: wowPackUrl(CHAR, "tauren.png"),
  undead: wowPackUrl(CHAR, "undead.png"),
  neutral: wowPackUrl(MISC, "QuestionMark.png"),
};

/** Faction banners / tabards from pack. */
export const FACTION_ASSET_URLS: Record<FactionId, string> = {
  horde: wowPackUrl(MISC, "Tournaments_banner_Orc.png"),
  alliance: wowPackUrl(MISC, "Tournaments_banner_Human.png"),
  neutral: wowPackUrl(MISC, "TabardPVP_02.png"),
};

export const VECTOR_JOURNEY_URLS: Record<JourneyVectorKey, string> = {
  profession: wowPackUrl(TRADE, "engineering.png"),
  playstyle: wowPackUrl(ABIL, "SliceDice.png"),
  class_fantasy: wowPackUrl(SPELL, "StarFire.png"),
  combat_style: wowPackUrl(ABIL, "SwordandBoard.png"),
  survivability: wowPackUrl(ABIL, "ShieldWall.png"),
  surprise: wowPackUrl(MISC, "Dice_01.png"),
};

export const DEPTH_JOURNEY_URL = wowPackUrl(SPELL, "BorrowedTime.png");

export const DEPTH_VISUAL_URLS: Record<"quick" | "balanced" | "dialed_in", string> = {
  quick: wowPackUrl(SPELL, "BurningSpeed.png"),
  balanced: wowPackUrl(SPELL, "BorrowedTime.png"),
  dialed_in: wowPackUrl(SPELL, "TimeStop.png"),
};

export const CORE_PRESET_VISUAL_URLS: Record<"safe" | "balanced" | "bold", string> = {
  safe: wowPackUrl(ABIL, "ShieldWall.png"),
  balanced: wowPackUrl(ABIL, "SwordandBoard.png"),
  bold: wowPackUrl(ABIL, "BloodFrenzy.png"),
};

export const PROF_SLOT_URL = wowPackUrl(TRADE, "engineering.png");
export const ITEM_SLOT_URL = wowPackUrl(ARMOUR, "Helm_Plate_Naxxramas_RaidWarrior_C_01.png");

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

export function formatRaceLabel(raceId: RaceId): string {
  if (raceId === "neutral") return "Race TBD";
  return raceId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
