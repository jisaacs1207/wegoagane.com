import type { MemorialInput, MemorialOutput } from "./types";

export function renderTemplateMemorial(input: MemorialInput): MemorialOutput {
  const moodLead = input.mood ? `${input.mood} met the edge` : "Courage met the edge";
  const signalTail = input.nextSignal ? `Next sign was ${input.nextSignal}.` : "The lesson remains.";

  return {
    epitaph: `${moodLead} in ${input.zone}. ${signalTail}`,
    characterName: input.characterName?.trim() || "Unknown Adventurer",
    level: input.level ?? null,
    location: input.zone,
    cause: input.cause,
    faction: input.faction ?? "neutral",
    sourceType: "template",
  };
}
