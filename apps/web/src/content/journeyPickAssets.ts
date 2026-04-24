import type { BuildIntentSignals } from "../lib/buildIntentTypes";
import { PROF_OPTIONS, STAT_OPTIONS, VECTOR_OPTIONS, optionLabel } from "../components/intent/intentOptions";

export type PickCategory = "stat" | "prof" | "vector" | "race";

/** API-aligned ids from intent chips + legacy journey-only ids (old sessionStorage). */
const STAT_IDS = new Set<string>([
  ...STAT_OPTIONS.map((o) => o.id),
  "safety_first",
  "stability_first",
  "balanced_curve",
  "tempo_aggressive",
  "stamina_armor",
  "mobility_tools",
]);

const PROF_IDS = new Set<string>([
  ...PROF_OPTIONS.map((o) => o.id),
  "gold_first",
  "self_found_friendly",
  "consumable_loop",
  "crafting_power_spike",
  "early_power",
  "economy_stability",
  "endgame_prep",
  "flex_professions",
]);

const VECTOR_IDS = new Set<string>([
  ...VECTOR_OPTIONS.map((o) => o.id),
  "single_target_control",
  "tempo_control",
  "hybrid_flexible",
  "aoe_pressure",
  "support_anchor",
  "sustain_and_kite",
  "burst_windows",
  "attrition_control",
  "frontline_duelist",
  "kite_and_burst",
  "stance_weave",
  "adaptive",
]);

export const PICK_CATEGORY_URL: Record<PickCategory, string> = {
  stat: "/placeholders/picks/pick-stat.svg",
  prof: "/placeholders/picks/pick-prof.svg",
  vector: "/placeholders/picks/pick-vector.svg",
  race: "/placeholders/picks/pick-race.svg",
};

export type JourneyPickChip = { id: string; category: PickCategory; label: string };

function pickLabel(id: string): string {
  if (id.startsWith("race:")) {
    const mode = id.slice(5);
    const from = optionLabel(mode);
    if (from !== mode) return from;
    return mode.replaceAll("_", " ");
  }
  const from = optionLabel(id);
  if (from !== id) return from;
  return id.replaceAll("_", " ");
}

function categoryForId(id: string, signals: BuildIntentSignals): PickCategory {
  if (id.startsWith("race:")) return "race";
  if (signals.statPhilosophy?.includes(id as never)) return "stat";
  if (signals.professionIntents?.includes(id as never)) return "prof";
  if (signals.buildVectors?.includes(id as never)) return "vector";
  if (STAT_IDS.has(id)) return "stat";
  if (PROF_IDS.has(id)) return "prof";
  if (VECTOR_IDS.has(id)) return "vector";
  return "vector";
}

export function collectJourneyPickChips(signals: BuildIntentSignals): JourneyPickChip[] {
  const out: JourneyPickChip[] = [];
  const seen = new Set<string>();

  const push = (id: string, signalsRef: BuildIntentSignals) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, category: categoryForId(id, signalsRef), label: pickLabel(id) });
  };

  for (const id of signals.statPhilosophy ?? []) push(id, signals);
  for (const id of signals.professionIntents ?? []) push(id, signals);
  for (const id of signals.buildVectors ?? []) push(id, signals);
  if (signals.raceMode) {
    const rid = `race:${signals.raceMode}`;
    if (!seen.has(rid)) {
      seen.add(rid);
      out.push({
        id: rid,
        category: "race",
        label: pickLabel(rid),
      });
    }
  }
  return out;
}
