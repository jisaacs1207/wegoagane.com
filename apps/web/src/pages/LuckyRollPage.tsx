import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { DestinyCard } from "../components/cards/DestinyCard";
import { type DestinyFixture } from "../content/cardFixtures";
import { augmentNextSignalWithPower } from "../lib/journeySignalsExtras";
import { destinyRecommendErrorHint, fetchDestiny, fetchGrowthAssignment, submitGrowthOutcome } from "../lib/recommendClient";
import { SessionKeys } from "../lib/sessionKeys";
import { readBuildIntent } from "../lib/readBuildIntent";
import { buildMemoryHints } from "../lib/memoryProfile";
import { BuildIntentChips } from "../components/BuildIntentChips";
import type { BuildIntentSignals } from "../lib/buildIntentTypes";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";

export function LuckyRollPage() {
  const [destiny, setDestiny] = useState<DestinyFixture | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [feedbackChoice, setFeedbackChoice] = useState<"closer" | "off" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>("");

  useEffect(() => {
    const seededSessionId = sessionStorage.getItem(SessionKeys.lucky.sessionId) ?? crypto.randomUUID();
    sessionStorage.setItem(SessionKeys.lucky.sessionId, seededSessionId);
    setSessionId(seededSessionId);
    void fetchGrowthAssignment({ sessionId: seededSessionId, surface: "recommendation", entryPath: "lucky_roll" })
      .then((assignment) => {
        setAssignmentId(assignment.assignmentId);
        setVariantId(assignment.variantId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!destinyId) return;
    trackEvent(AnalyticsEvent.IntentFeedbackPromptShown, { flow: "lucky_roll", destinyId });
    setFeedbackChoice(null);
    setFeedbackReason("");
  }, [destinyId]);

  async function generate(signals: BuildIntentSignals) {
    if (!sessionId) return;
    setIsLoading(true);
    setLoadError("");
    try {
      const result = await fetchDestiny({
        entryPath: "lucky_roll",
        sessionId,
        signals: {
          nextSignal: augmentNextSignalWithPower("Surprise me", SessionKeys.lucky.buildIntent),
          memoryHints: buildMemoryHints(),
          recommendVariantId: variantId ?? undefined,
          ...signals,
        },
      });
      setDestiny(result.output);
      setDestinyId(result.destinyId);
      if (assignmentId) {
        void submitGrowthOutcome({
          assignmentId,
          converted: true,
          outcome: { event: "recommend_rendered", destinyId: result.destinyId },
        }).catch(() => {});
      }
    } catch (err) {
      setLoadError(destinyRecommendErrorHint(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="card">
      <p className="step-label">Lucky roll</p>
      <h1 className="hero-question">Your roll</h1>
      <p className="hero-sub">
        Weighted Destiny from the deterministic ranker + archetype fixtures. Falls back to local fixture when API is
        unavailable.
      </p>
      <BuildIntentChips
        storageKey={SessionKeys.lucky.buildIntent}
        isGenerating={isLoading}
        hasGenerated={Boolean(destiny)}
        onGenerate={(signals) => void generate(signals)}
      />
      {loadError ? (
        <p className="hero-sub" style={{ marginTop: 8 }}>
          {loadError}
        </p>
      ) : null}
      {destiny ? <DestinyCard data={destiny} intentSignals={readBuildIntent(SessionKeys.lucky.buildIntent)} /> : null}
      {destiny ? (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ts)" }}>Was this close to what you wanted?</p>
          <div className="flow-nav" style={{ marginTop: 10 }}>
            <button
              type="button"
              className={`btn-ghost ${feedbackChoice === "closer" ? "chip-btn--on" : ""}`}
              onClick={() => {
                setFeedbackChoice("closer");
                trackEvent(AnalyticsEvent.IntentFeedbackSubmitted, {
                  flow: "lucky_roll",
                  destinyId,
                  feedback: "closer",
                });
              }}
            >
              Closer than expected
            </button>
            <button
              type="button"
              className={`btn-ghost ${feedbackChoice === "off" ? "chip-btn--on" : ""}`}
              onClick={() => setFeedbackChoice("off")}
            >
              Still off target
            </button>
          </div>
          {feedbackChoice === "off" ? (
            <div className="chip-row" style={{ marginTop: 10 }}>
              {["Too risky", "Wrong fantasy", "Wrong pace", "Wrong role"].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={`chip-btn ${feedbackReason === reason ? "chip-btn--on" : ""}`}
                  onClick={() => {
                    setFeedbackReason(reason);
                    trackEvent(AnalyticsEvent.IntentFeedbackSubmitted, {
                      flow: "lucky_roll",
                      destinyId,
                      feedback: "off_target",
                      reason,
                    });
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flow-nav" style={{ marginTop: 20 }}>
        <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
          Home
        </Link>
        {destinyId ? (
          <Link to={`/build/${destinyId}`} className="btn-ghost" style={{ textDecoration: "none" }}>
            Open HC build sheet
          </Link>
        ) : null}
        <Link to="/share/demo-roll" className="btn-primary" style={{ textDecoration: "none" }}>
          Preview share route
        </Link>
      </div>
    </div>
  );
}
