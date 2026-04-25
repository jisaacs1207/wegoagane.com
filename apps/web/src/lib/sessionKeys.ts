/** Canonical sessionStorage keys — single source for flows and docs alignment. */
export const SessionKeys = {
  home: {
    sessionId: "session.id",
  },
  plan: {
    sessionId: "plan.sessionId",
    intent: "plan.intent",
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
