import { druidTalents } from "./druid";
import { hunterTalents } from "./hunter";
import { mageTalents } from "./mage";
import { paladinTalents } from "./paladin";
import { priestTalents } from "./priest";
import { rogueTalents } from "./rogue";
import { shamanTalents } from "./shaman";
import { warlockTalents } from "./warlock";
import { warriorTalents } from "./warrior";
import type { ClassTalents } from "./types";

export type ClassId = ClassTalents["classId"];

/** Static map: classId -> canonical Classic Era talent grid. Same data feeds the renderer + AI snap. */
export const CLASS_TALENTS: Record<ClassId, ClassTalents> = {
  druid: druidTalents,
  hunter: hunterTalents,
  mage: mageTalents,
  paladin: paladinTalents,
  priest: priestTalents,
  rogue: rogueTalents,
  shaman: shamanTalents,
  warlock: warlockTalents,
  warrior: warriorTalents,
};

export function getClassTalents(classId: string | undefined | null): ClassTalents | null {
  if (!classId) return null;
  const key = classId.toLowerCase() as ClassId;
  return CLASS_TALENTS[key] ?? null;
}

export type { ClassTalents, TalentCell, TalentTreeBranch } from "./types";
export { resolveTalentByName } from "./types";
