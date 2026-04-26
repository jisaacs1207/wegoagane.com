/** Canonical sessionStorage keys — single source for flows and docs alignment. */
export const SessionKeys = {
  /** Set when generating a build so `/build/commit/:slug` can recover intent if `?flow=` is missing on a shared URL. */
  lastBuildFlow: "wega.lastBuildFlow",
  home: {
    sessionId: "session.id",
    lastAcceptedClassId: "last.acceptedClassId",
  },
  plan: {
    sessionId: "plan.sessionId",
    intent: "plan.intent",
    /** Stable id for `INTENTS` ritual tile (e.g. safe_60); `intent` holds API-facing label. */
    intentGoalId: "plan.intentGoalId",
    /** draft_a_run: ranker hint — resolve class fantasy before race, or the reverse. */
    identityPriority: "plan.identityPriority",
    freeform: "plan.freeform",
    destinyId: "plan.destinyId",
    seedDestinyId: "plan.seedDestinyId",
    generatedDestiny: "plan.generatedDestiny",
    buildIntent: "plan.buildIntent",
    buildIntentDepth: "plan.buildIntent.depth",
    buildIntentPowerCurve: "plan.buildIntent.powerCurve",
    /** One-shot banner after recommend widened filters for AI (see API `filterRelaxedForAi`). */
    recommendRelaxBanner: "plan.recommendRelaxBanner",
  },
  death: {
    sessionId: "death.sessionId",
    mood: "death.mood",
    nextSignal: "death.nextSignal",
    destinyId: "death.destinyId",
    generatedDestiny: "death.generatedDestiny",
    buildIntent: "death.buildIntent",
    buildIntentDepth: "death.buildIntent.depth",
    buildIntentPowerCurve: "death.buildIntent.powerCurve",
    recommendRelaxBanner: "death.recommendRelaxBanner",
    detailZone: "death.detail.zone",
    detailCause: "death.detail.cause",
    detailLevel: "death.detail.level",
    detailNote: "death.detail.note",
  },
  lucky: {
    sessionId: "lucky.sessionId",
    destinyId: "lucky.destinyId",
    generatedDestiny: "lucky.generatedDestiny",
    buildIntent: "lucky.buildIntent",
    buildIntentDepth: "lucky.buildIntent.depth",
    buildIntentPowerCurve: "lucky.buildIntent.powerCurve",
    recommendRelaxBanner: "lucky.recommendRelaxBanner",
  },
} as const;
