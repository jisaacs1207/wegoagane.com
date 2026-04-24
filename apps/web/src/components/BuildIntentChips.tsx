import { useState } from "react";
import type { BuildIntentSignals } from "../lib/buildIntentTypes";

const STAT_OPTIONS = [
  { id: "stamina_forward", label: "Stam first" },
  { id: "intellect_forward", label: "Int" },
  { id: "agility_forward", label: "Agi" },
  { id: "strength_forward", label: "Str" },
  { id: "spirit_forward", label: "Spirit" },
  { id: "balanced", label: "Balanced" },
  { id: "meme_glass", label: "Spicy / glass" },
] as const;

const PROF_OPTIONS = [
  { id: "engineering_outs", label: "Engineering" },
  { id: "herbalism_alchemy_pair", label: "Herb + Alch" },
  { id: "mining_engineering_pair", label: "Mine + Eng" },
  { id: "dual_gathering_bootstrap", label: "Dual gather" },
  { id: "leatherworker_hunter_synergy", label: "LW + leather" },
  { id: "cooking_high_value", label: "Cooking focus" },
  { id: "fishing_supports_cooking", label: "Fish + cook" },
] as const;

const VECTOR_OPTIONS = [
  { id: "solo", label: "Solo" },
  { id: "pet", label: "Pet class" },
  { id: "melee", label: "Melee" },
  { id: "ranged", label: "Ranged" },
  { id: "heal", label: "Healing" },
  { id: "tank", label: "Tanky" },
  { id: "mana", label: "Mana" },
  { id: "demonic", label: "Dark fantasy" },
  { id: "holy", label: "Holy fantasy" },
] as const;

const RACE_MODES = [
  { id: "signal_inferred", label: "From answers" },
  { id: "optimize_theme", label: "Optimize" },
  { id: "surprise", label: "Surprise me" },
  { id: "user_pick", label: "I pick race" },
] as const;

type Props = {
  storageKey: string;
};

function readStorage(key: string): BuildIntentSignals {
  try {
    const r = sessionStorage.getItem(key);
    if (!r) return {};
    return JSON.parse(r) as BuildIntentSignals;
  } catch {
    return {};
  }
}

function toggleList(list: string[] | undefined, id: string, max: number): string[] {
  const cur = list ?? [];
  if (cur.includes(id)) return cur.filter((x) => x !== id);
  if (cur.length >= max) return [...cur.slice(1), id];
  return [...cur, id];
}

export function BuildIntentChips({ storageKey }: Props) {
  const [value, setValue] = useState<BuildIntentSignals>(() => readStorage(storageKey));

  function persist(next: BuildIntentSignals) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setValue(next);
  }

  return (
    <div className="build-intent card" style={{ marginTop: 12 }}>
      <p className="step-label" style={{ marginBottom: 8 }}>
        Build focus (optional)
      </p>
      <p className="hero-sub" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
        Tunes viability filtering and your HC build sheet. Uses Classic Era Hardcore assumptions. Refresh the page
        before generating if you change these mid-load.
      </p>
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 12, color: "var(--ts)", marginBottom: 6 }}>Stat lean</legend>
        <div className="chip-row">
          {STAT_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`chip-btn ${value.statPhilosophy?.includes(o.id) ? "chip-btn--on" : ""}`}
              onClick={() =>
                persist({
                  ...value,
                  statPhilosophy: toggleList(value.statPhilosophy, o.id, 3) as BuildIntentSignals["statPhilosophy"],
                })
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: "none", padding: 0, margin: "12px 0 0" }}>
        <legend style={{ fontSize: 12, color: "var(--ts)", marginBottom: 6 }}>Professions / economy</legend>
        <div className="chip-row">
          {PROF_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`chip-btn ${value.professionIntents?.includes(o.id) ? "chip-btn--on" : ""}`}
              onClick={() =>
                persist({
                  ...value,
                  professionIntents: toggleList(value.professionIntents, o.id, 4) as BuildIntentSignals["professionIntents"],
                })
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: "none", padding: 0, margin: "12px 0 0" }}>
        <legend style={{ fontSize: 12, color: "var(--ts)", marginBottom: 6 }}>Playstyle</legend>
        <div className="chip-row">
          {VECTOR_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`chip-btn ${value.buildVectors?.includes(o.id) ? "chip-btn--on" : ""}`}
              onClick={() =>
                persist({
                  ...value,
                  buildVectors: toggleList(value.buildVectors, o.id, 6) as BuildIntentSignals["buildVectors"],
                })
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 12, color: "var(--ts)", display: "block", marginBottom: 6 }}>Race mode</label>
        <select
          className="chip-select"
          value={value.raceMode ?? "signal_inferred"}
          onChange={(e) =>
            persist({
              ...value,
              raceMode: e.target.value as BuildIntentSignals["raceMode"],
            })
          }
        >
          {RACE_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
