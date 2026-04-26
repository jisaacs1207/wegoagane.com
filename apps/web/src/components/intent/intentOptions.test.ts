import { describe, expect, it } from "vitest";
import {
  fillBalancedAssumptions,
  mergeQuickRollPreserveIdentity,
  professionOptionsFor,
  professionPickToTags,
  rollRandomQuickPickSignals,
  stripSsfIncompatibleSignals,
  toggleList,
} from "./intentOptions";
import { balancedQuestionFor } from "./vectorQuestions";

describe("toggleList", () => {
  it("adds id when absent and under max", () => {
    expect(toggleList(undefined, "a", 3)).toEqual(["a"]);
    expect(toggleList(["a"], "b", 3)).toEqual(["a", "b"]);
  });

  it("removes id when present", () => {
    expect(toggleList(["a", "b"], "a", 3)).toEqual(["b"]);
  });

  it("at max length replaces oldest when adding new id", () => {
    expect(toggleList(["a", "b", "c"], "d", 3)).toEqual(["b", "c", "d"]);
  });
});

describe("rollRandomQuickPickSignals", () => {
  it("samples stats, professions, vectors, and race from full catalogs", () => {
    const a = rollRandomQuickPickSignals("seed-a");
    expect(a.statPhilosophy?.length).toBeGreaterThanOrEqual(2);
    expect(a.professionIntents?.length).toBeGreaterThanOrEqual(2);
    expect(a.buildVectors?.length).toBeGreaterThanOrEqual(3);
    expect(a.raceMode).toBeTruthy();
  });
});

describe("fillBalancedAssumptions", () => {
  it("fills only empty dimensions", () => {
    const filled = fillBalancedAssumptions({ statPhilosophy: ["balanced"] });
    expect(filled.statPhilosophy).toEqual(["balanced"]);
    expect(filled.professionIntents?.length).toBeGreaterThan(0);
    expect(filled.buildVectors?.length).toBeGreaterThan(0);
    expect(filled.raceMode).toBe("signal_inferred");
  });

  it("does not inject group_ok defaults when solo self found", () => {
    const filled = fillBalancedAssumptions({ soloSelfFound: true, statPhilosophy: ["balanced"] });
    expect(filled.buildVectors).not.toContain("group_ok");
    expect(filled.buildVectors?.length).toBeGreaterThan(0);
  });
});

describe("stripSsfIncompatibleSignals", () => {
  it("removes auction house and group_ok tags", () => {
    const out = stripSsfIncompatibleSignals({
      professionIntents: ["mining_engineering_pair", "auction_house_play"],
      buildVectors: ["solo", "group_ok", "melee"],
    });
    expect(out.professionIntents).toEqual(["mining_engineering_pair"]);
    expect(out.buildVectors).toEqual(["solo", "melee"]);
  });
});

describe("professionPickToTags", () => {
  it("returns empty when nothing picked", () => {
    expect(professionPickToTags(null, null)).toEqual([]);
  });

  it("recognises mining + engineering as a paired anchor", () => {
    expect(professionPickToTags("mining", "engineering")).toEqual([
      "mining_engineering_pair",
      "engineering_outs",
    ]);
    expect(professionPickToTags("engineering", "mining")).toEqual([
      "mining_engineering_pair",
      "engineering_outs",
    ]);
  });

  it("recognises herb + alch and lw + skinning pairs", () => {
    expect(professionPickToTags("herbalism", "alchemy")).toEqual(["herbalism_alchemy_pair"]);
    expect(professionPickToTags("leatherworking", "skinning")).toEqual(["leatherworker_hunter_synergy"]);
  });

  it("emits two single-prof tags when no canonical pair is picked", () => {
    const tags = professionPickToTags("blacksmithing", "enchanting");
    expect(tags).toContain("blacksmith_weaponsmith_fantasy");
    expect(tags).toContain("enchanter_disenchant_route");
  });

  it("emits a single tag when only primary is set", () => {
    expect(professionPickToTags("alchemy", null)).toEqual(["alchemy_consumables"]);
  });

  it("never emits fishing, cooking, or first aid tags via the picker", () => {
    const all = professionOptionsFor(false);
    for (const o of all) {
      const tags = professionPickToTags(o.id, null);
      for (const t of tags) {
        expect(t).not.toMatch(/fishing|cooking|first_aid/);
      }
    }
  });

  it("hides the auction-house option under solo self found", () => {
    const ssfOptions = professionOptionsFor(true);
    expect(ssfOptions.find((o) => o.id === "auction_house")).toBeUndefined();
    const normalOptions = professionOptionsFor(false);
    expect(normalOptions.find((o) => o.id === "auction_house")).toBeTruthy();
  });
});

describe("mergeQuickRollPreserveIdentity", () => {
  it("preserves identity + soloSelfFound when rolling new chips", () => {
    const merged = mergeQuickRollPreserveIdentity(
      {
        factionPreference: "horde",
        pickedRace: "tauren",
        genderLean: "neutral",
        soloSelfFound: true,
      },
      { statPhilosophy: ["agility_forward"], buildVectors: ["melee"] },
    );
    expect(merged.factionPreference).toBe("horde");
    expect(merged.pickedRace).toBe("tauren");
    expect(merged.genderLean).toBe("neutral");
    expect(merged.soloSelfFound).toBe(true);
    expect(merged.statPhilosophy).toEqual(["agility_forward"]);
    expect(merged.buildVectors).toEqual(["melee"]);
  });

  it("strips SSF-incompatible tags from rolled bundle when solo self found", () => {
    const merged = mergeQuickRollPreserveIdentity(
      { soloSelfFound: true },
      {
        statPhilosophy: ["balanced"],
        professionIntents: ["auction_house_play", "engineering_outs"],
        buildVectors: ["solo", "group_ok"],
      },
    );
    expect(merged.professionIntents).toEqual(["engineering_outs"]);
    expect(merged.buildVectors).toEqual(["solo"]);
  });
});

describe("Balanced two-stage flow (pillar -> question -> pillar -> question)", () => {
  it("answering primary then secondary pillar persists distinct signals", () => {
    let value = {} as ReturnType<typeof fillBalancedAssumptions>;
    const primaryQ = balancedQuestionFor("survivability");
    value = primaryQ.apply(value, "Never die");
    expect(value.statPhilosophy).toContain("stamina_forward");
    const secondaryQ = balancedQuestionFor("class_fantasy");
    value = secondaryQ.apply(value, "Holy");
    expect(value.statPhilosophy).toContain("stamina_forward");
    expect(value.buildVectors).toContain("holy");
    expect(value.statPhilosophy?.length ?? 0).toBeGreaterThan(0);
    expect(value.buildVectors?.length ?? 0).toBeGreaterThan(0);
  });

  it("balanced primary as profession pillar produces correct tags", () => {
    let value = {} as ReturnType<typeof fillBalancedAssumptions>;
    const profTags = professionPickToTags("mining", "engineering");
    value = { ...value, professionIntents: profTags };
    const survivalQ = balancedQuestionFor("survivability");
    value = survivalQ.apply(value, "Safe with speed");
    expect(value.professionIntents).toContain("mining_engineering_pair");
    expect(value.statPhilosophy).toContain("agility_forward");
  });
});
