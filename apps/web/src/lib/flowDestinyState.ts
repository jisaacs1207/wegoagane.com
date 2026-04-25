import type { DestinyFixture } from "../content/cardFixtures";
import type { BuildIntentSignals } from "./buildIntentTypes";
import { SessionKeys } from "./sessionKeys";

type FlowKey = "death" | "plan" | "lucky";

export type StoredDestinyState = {
  sessionId: string;
  destinyId: string;
  output: DestinyFixture;
  /** Filters merged into the recommend call for this card — drives result UI so it stays in sync if session is edited later. */
  intentSnapshot?: BuildIntentSignals;
};

function key(flow: FlowKey) {
  if (flow === "plan") return SessionKeys.plan.generatedDestiny;
  if (flow === "death") return SessionKeys.death.generatedDestiny;
  return SessionKeys.lucky.generatedDestiny;
}

export function writeStoredDestiny(flow: FlowKey, value: StoredDestinyState) {
  try {
    sessionStorage.setItem(key(flow), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function readStoredDestiny(flow: FlowKey): StoredDestinyState | null {
  try {
    const raw = sessionStorage.getItem(key(flow));
    if (!raw) return null;
    return JSON.parse(raw) as StoredDestinyState;
  } catch {
    return null;
  }
}
