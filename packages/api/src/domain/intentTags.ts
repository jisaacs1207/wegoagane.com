import type { RecommendInput } from "./types";

function normalizeText(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function identityPriorityHint(p: RecommendInput["signals"]["identityPriority"]): string | undefined {
  if (p === "class_first") return "prioritize class fantasy before race";
  if (p === "race_first") return "prioritize race and faction before class";
  return undefined;
}

/** Keyword inference from mood/intent/freeform (legacy ranker behavior). */
export function inferTagsFromFreeText(input: RecommendInput): string[] {
  const text = normalizeText(
    input.signals.intent,
    input.signals.nextSignal,
    input.signals.mood,
    input.signals.freeform,
    identityPriorityHint(input.signals.identityPriority),
  );

  const tags = new Set<string>();
  if (text.includes("safe") || text.includes("safer")) tags.add("safe");
  if (text.includes("fast") || text.includes("aggressive")) tags.add("fast");
  if (text.includes("solo")) tags.add("solo");
  if (text.includes("social") || text.includes("group")) tags.add("group_ok");
  if (text.includes("different") || text.includes("new")) tags.add("off_beaten");
  const hasNoPet = text.includes("no pet") || text.includes("no pets") || text.includes("no pet class");
  if (hasNoPet) tags.add("no_pet");
  if (text.includes("pet") && !hasNoPet) tags.add("pet");
  if (text.includes("profession") || text.includes("engineering") || text.includes("alchemy")) tags.add("steady");
  if (text.includes("surprise")) tags.add("just_fun");
  if (text.includes("bullshit")) tags.add("safe");
  if (text.includes("strange")) tags.add("off_beaten");
  if (text.includes("melee")) tags.add("melee");
  if (text.includes("ranged")) tags.add("ranged");
  if (text.includes("heal")) tags.add("heal");
  if (text.includes("tank")) tags.add("tank");
  if (input.entryPath === "lucky_roll") tags.add("just_fun");

  if (tags.size === 0) tags.add("safe");
  return [...tags];
}

/** Map structured signals to ranker tag strings (overlap with archetype.tags where possible). */
export function tagsFromStructuredSignals(input: RecommendInput): string[] {
  const s = input.signals;
  const out = new Set<string>();

  for (const st of s.statPhilosophy ?? []) {
    if (st === "stamina_forward") out.add("safe");
    if (st === "meme_glass") out.add("off_beaten");
    if (st === "balanced") out.add("steady");
  }

  for (const p of s.professionIntents ?? []) {
    if (p === "engineering_outs" || p === "mining_engineering_pair") out.add("steady");
    if (p === "herbalism_alchemy_pair" || p === "alchemy_consumables") out.add("steady");
    if (p === "dual_gathering_bootstrap" || p === "skinning_mining_early") out.add("solo");
    if (p === "leatherworker_hunter_synergy") {
      out.add("pet");
      out.add("solo");
    }
    if (p === "tailoring_bags_arcane") out.add("solo");
  }

  for (const v of s.buildVectors ?? []) {
    if (v === "solo") out.add("solo");
    if (v === "group_ok") out.add("group_ok");
    if (v === "pet") out.add("pet");
    if (v === "melee") out.add("melee");
    if (v === "ranged") out.add("ranged");
    if (v === "heal") out.add("group_ok");
    if (v === "tank") out.add("safe");
    if (v === "mana" || v === "caster") out.add("no_pet");
    if (v === "demonic" || v === "nature" || v === "holy") out.add("off_beaten");
  }

  if (s.soloSelfFound) {
    out.add("solo");
    out.add("self_found");
    out.add("steady");
    out.delete("group_ok");
  }

  return [...out];
}

/** Merged desired tags for archetype scoring. */
export function mergeDesiredTags(input: RecommendInput): string[] {
  const inferred = inferTagsFromFreeText(input);
  const structured = tagsFromStructuredSignals(input);
  const merged = new Set([...inferred, ...structured]);
  if (merged.size === 0) merged.add("safe");
  return [...merged];
}
