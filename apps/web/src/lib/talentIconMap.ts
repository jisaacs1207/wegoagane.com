import type { ClassId } from "../icons/types";
import { CLASS_ASSET_URLS, wowPackUrl } from "../content/identityAssets";

const ABIL = "Abilities";
const SPELL = "Spells";

/**
 * Curated map of common Classic-era talent / spell names to icons in the
 * vendored `wegoagane-wow-icon-pack-v1` pack. Keys are normalized
 * (lowercased, alphanumerics only) so prompts like "Holy Shield",
 * "holy-shield", or "HOLY  SHIELD" all resolve.
 *
 * If a name is not present here, callers should fall back to the class crest
 * via `getTalentIconUrl(name, classId)`.
 */
const TALENT_ICONS: Record<string, string> = {
  // Paladin
  holyshield: wowPackUrl(SPELL, "HolyProtection.png"),
  consecration: wowPackUrl(SPELL, "HolyNova.png"),
  judgement: wowPackUrl(SPELL, "HolyBolt.png"),
  sealofrighteousness: wowPackUrl(SPELL, "SealOfRighteousness.png"),
  sealofthemartyr: wowPackUrl(SPELL, "SealOfBlood.png"),
  sealofthemight: wowPackUrl(SPELL, "SealOfMight.png"),
  sealofcommand: wowPackUrl(SPELL, "SealOfFire.png"),
  blessingofkings: wowPackUrl(SPELL, "SealOfKings.png"),
  blessingofmight: wowPackUrl(SPELL, "BlessingOfStrength.png"),
  blessingofwisdom: wowPackUrl(SPELL, "DivineSpirit.png"),
  blessingofprotection: wowPackUrl(SPELL, "BlessingOfProtection.png"),
  blessingofstamina: wowPackUrl(SPELL, "BlessingOfStamina.png"),
  divinefavor: wowPackUrl(SPELL, "DivineProvidence.png"),
  divineshield: wowPackUrl(SPELL, "HolyProtection.png"),
  divineprotection: wowPackUrl(SPELL, "HolyProtection.png"),
  layonhands: wowPackUrl(SPELL, "DivineIllumination.png"),
  ardentdefender: wowPackUrl(SPELL, "ArdentDefender.png"),
  avengersshield: wowPackUrl(SPELL, "AvengersShield.png"),
  crusaderstrike: wowPackUrl(SPELL, "CrusaderStrike.png"),
  // Warrior
  shieldslam: wowPackUrl(ABIL, "ShieldMastery.png"),
  shieldwall: wowPackUrl(ABIL, "ShieldWall.png"),
  shieldblock: wowPackUrl(ABIL, "ShieldGuard.png"),
  shieldbash: wowPackUrl(ABIL, "ShieldBash.png"),
  bloodrage: wowPackUrl(ABIL, "BloodRage.png"),
  bloodthirst: wowPackUrl(ABIL, "BloodFrenzy.png"),
  mortalstrike: wowPackUrl(ABIL, "BladeTwisting.png"),
  whirlwind: wowPackUrl(ABIL, "Whirlwind.png"),
  cleave: wowPackUrl(ABIL, "Cleave.png"),
  charge: wowPackUrl(ABIL, "Charge.png"),
  rend: wowPackUrl(ABIL, "Bloodsurge.png"),
  hamstring: wowPackUrl(ABIL, "Disarm.png"),
  berserkerrage: wowPackUrl(ABIL, "Berserk.png"),
  recklessness: wowPackUrl(ABIL, "BloodBath.png"),
  // Rogue
  slicedice: wowPackUrl(ABIL, "SliceDice.png"),
  sliceanddice: wowPackUrl(ABIL, "SliceDice.png"),
  backstab: wowPackUrl(ABIL, "BackStab.png"),
  eviscerate: wowPackUrl(ABIL, "Eviscerate.png"),
  sinisterstrike: wowPackUrl(ABIL, "SinisterCalling.png"),
  kick: wowPackUrl(ABIL, "Kick.png"),
  ambush: wowPackUrl(ABIL, "Ambush.png"),
  bladetwisting: wowPackUrl(ABIL, "BladeTwisting.png"),
  // Hunter
  aimedshot: wowPackUrl(ABIL, "AimedShot.png"),
  trueshot: wowPackUrl(ABIL, "TrueShot.png"),
  trueshotaura: wowPackUrl(ABIL, "TrueShot.png"),
  aspectofthemonkey: wowPackUrl(ABIL, "AspectOfTheMonkey.png"),
  aspectoftheviper: wowPackUrl(ABIL, "AspectoftheViper.png"),
  beastmastery: wowPackUrl(ABIL, "BeastMastery.png"),
  // Mage
  frostbolt: wowPackUrl(SPELL, "Frostbolt.png"),
  frostnova: wowPackUrl(SPELL, "FrostNova.png"),
  frostarmor: wowPackUrl(SPELL, "FrostArmor.png"),
  iceblock: wowPackUrl(SPELL, "FrostNova.png"),
  fireball: wowPackUrl(SPELL, "Fireball.png"),
  pyroblast: wowPackUrl(SPELL, "Fireball02.png"),
  blink: wowPackUrl(SPELL, "Blink.png"),
  arcaneintellect: wowPackUrl(SPELL, "ArcaneIntellect.png"),
  polymorph: wowPackUrl(SPELL, "Polymorph.png"),
  // Priest
  innerfire: wowPackUrl(SPELL, "InnerFire.png"),
  powerwordshield: wowPackUrl(SPELL, "PowerWordBarrier.png"),
  holynova: wowPackUrl(SPELL, "HolyNova.png"),
  smite: wowPackUrl(SPELL, "HolySmite.png"),
  shadowform: wowPackUrl(SPELL, "AntiShadow.png"),
  // Warlock
  curseofagony: wowPackUrl(ABIL, "CurseOfAchimonde.png"),
  curseofelements: wowPackUrl(ABIL, "CurseOfMannoroth.png"),
  drainsoul: wowPackUrl(ABIL, "SoulLeech.png"),
  drainlife: wowPackUrl(ABIL, "DeathStrike.png"),
  demonicembrace: wowPackUrl(ABIL, "DemonicFortitude.png"),
  demonicfortitude: wowPackUrl(ABIL, "DemonicFortitude.png"),
  // Druid
  bearform: wowPackUrl(ABIL, "BearForm.png"),
  catform: wowPackUrl(ABIL, "CatForm.png"),
  rake: wowPackUrl(ABIL, "Rake.png"),
  ferociousbite: wowPackUrl(ABIL, "FerociousBite.png"),
  bash: wowPackUrl(ABIL, "Bash.png"),
  bladestorm: wowPackUrl(ABIL, "Bladestorm.png"),
  // Shaman
  frostshock: wowPackUrl(SPELL, "FrostShock.png"),
  chainlightning: wowPackUrl(SPELL, "ChainLightning.png"),
  bloodlust: wowPackUrl(SPELL, "BloodLust.png"),
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve a talent / spell name to an icon URL. Falls back to the class crest
 * when the talent is not in the curated catalog so the UI never renders a
 * broken image.
 */
export function getTalentIconUrl(name: string | undefined, classId: ClassId): string {
  if (!name) return CLASS_ASSET_URLS[classId];
  const key = normalize(name);
  return TALENT_ICONS[key] ?? CLASS_ASSET_URLS[classId];
}

/**
 * Best-effort icon for a profession name. Only returns a URL when the
 * vendored pack actually contains a tile for that profession; missing
 * professions (e.g. mining, skinning, enchanting) return `undefined` so the
 * caller can render a generic profession slot icon instead.
 */
export function getProfessionIconUrl(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const slug = name.toLowerCase().trim().replace(/\s+/g, "");
  const haveFile = new Set([
    "alchemy",
    "blacksmithing",
    "engineering",
    "fishing",
    "herbalism",
    "leatherworking",
    "tailoring",
  ]);
  if (!haveFile.has(slug)) return undefined;
  return wowPackUrl("Trade", `${slug}.png`);
}
