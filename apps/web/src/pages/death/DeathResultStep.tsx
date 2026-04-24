import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  memorialFixture,
  type DestinyFixture,
  type MemorialFixture,
} from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import { MemorialCard } from "../../components/cards/MemorialCard";
import {
  createShareRun,
  fetchDestiny,
  fetchGrowthAssignment,
  fetchMemorial,
  type RerollReason,
  submitGrowthOutcome,
  submitDestinyFeedback,
} from "../../lib/recommendClient";
import { BuildIntentChips } from "../../components/BuildIntentChips";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { readBuildIntent } from "../../lib/readBuildIntent";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";
import { buildMemoryHints, rememberAccept, rememberReroll } from "../../lib/memoryProfile";

const rerollReasons: Array<{ value: RerollReason; label: string }> = [
  { value: "wrong_class", label: "Wrong class" },
  { value: "wrong_energy", label: "Wrong energy" },
  { value: "wrong_goals", label: "Wrong goals" },
  { value: "almost_right", label: "Almost right" },
  { value: "just_curious", label: "Just curious" },
];

export function DeathResultStep() {
  const navigate = useNavigate();
  const [destiny, setDestiny] = useState<DestinyFixture | null>(null);
  const [memorial, setMemorial] = useState<MemorialFixture>(memorialFixture);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [note, setNote] = useState("");
  const [showRerollGate, setShowRerollGate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDestiny, setIsLoadingDestiny] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [loadingPhase, setLoadingPhase] = useState("Reading your final combat log...");
  const [recommendVariantId, setRecommendVariantId] = useState<string | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<"closer" | "off" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>("");

  useEffect(() => {
    const mood = sessionStorage.getItem("death.mood") ?? undefined;
    const nextSignal = sessionStorage.getItem("death.nextSignal") ?? undefined;
    const existingSession = sessionStorage.getItem("death.sessionId");
    const seededSessionId = existingSession ?? crypto.randomUUID();
    if (!existingSession) {
      sessionStorage.setItem("death.sessionId", seededSessionId);
    }

    void fetchGrowthAssignment({
      sessionId: seededSessionId,
      surface: "recommendation",
      entryPath: "release_spirit",
    })
      .then((assignment) => {
        setRecommendVariantId(assignment.variantId);
      })
      .catch(() => null);

    setSessionId(seededSessionId);
    void fetchMemorial({
      sessionId: seededSessionId,
      zone: "Unknown Zone",
      cause: "Unknown Cause",
      mood,
      nextSignal,
      faction: "horde",
      characterName: memorialFixture.characterName,
      level: memorialFixture.level ?? undefined,
    })
      .then(setMemorial)
      .catch(() => setMemorial(memorialFixture));
    trackEvent(AnalyticsEvent.FlowStarted, { flow: "release_spirit" });
  }, []);

  useEffect(() => {
    if (!destinyId) return;
    trackEvent(AnalyticsEvent.IntentFeedbackPromptShown, { flow: "release_spirit", destinyId });
    setFeedbackChoice(null);
    setFeedbackReason("");
  }, [destinyId]);

  async function generateDestiny(signals: BuildIntentSignals) {
    if (!sessionId) return;
    const mood = sessionStorage.getItem("death.mood") ?? undefined;
    const nextSignal = sessionStorage.getItem("death.nextSignal") ?? undefined;
    setIsLoadingDestiny(true);
    setLoadError("");
    setLoadingPhase("Reading your final combat log...");
    const phaseTimer1 = setTimeout(() => setLoadingPhase("Consulting the spirit healers..."), 900);
    const phaseTimer2 = setTimeout(() => setLoadingPhase("Drafting a safer next path..."), 1800);
    const phaseTimer3 = setTimeout(() => setLoadingPhase("Binding your next oath to parchment..."), 3000);
    try {
      const result = await fetchDestiny({
        entryPath: "release_spirit",
        sessionId,
        signals: {
          mood,
          nextSignal,
          memoryHints: buildMemoryHints(),
          recommendVariantId: recommendVariantId ?? undefined,
          ...signals,
        },
      });
      setDestiny(result.output);
      setDestinyId(result.destinyId);
      sessionStorage.setItem("death.destinyId", result.destinyId);
      void fetchGrowthAssignment({
        sessionId,
        surface: "recommendation",
        entryPath: "release_spirit",
      })
        .then((assignment) => {
          void submitGrowthOutcome({
            assignmentId: assignment.assignmentId,
            converted: true,
            outcome: { event: "recommend_rendered", destinyId: result.destinyId },
          }).catch(() => {});
        })
        .catch(() => {});
    } catch {
      setLoadError("The spirit archives are delayed. We are still forging your next destiny.");
    } finally {
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(phaseTimer3);
      setIsLoadingDestiny(false);
    }
  }

  async function runRerollWithReason(reason: RerollReason) {
    if (!sessionId || !destinyId || !destiny || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage("");
    trackEvent(AnalyticsEvent.RerollReasonSelected, {
      flow: "release_spirit",
      reason,
      destinyId,
      sessionId,
      filterCount:
        (readBuildIntent("death.buildIntent").statPhilosophy?.length ?? 0) +
        (readBuildIntent("death.buildIntent").professionIntents?.length ?? 0) +
        (readBuildIntent("death.buildIntent").buildVectors?.length ?? 0) +
        (readBuildIntent("death.buildIntent").raceMode ? 1 : 0),
    });
    try {
      const mood = sessionStorage.getItem("death.mood") ?? undefined;
      const nextSignal = sessionStorage.getItem("death.nextSignal") ?? undefined;

      if (reason === "wrong_goals") {
        rememberReroll(reason, destiny.classId);
        trackEvent(AnalyticsEvent.MemoryProfileUpdated, {
          reason,
          action: "reroll",
          classId: destiny.classId,
          memoryConfidence: buildMemoryHints().confidence ?? 0,
        });
        await submitDestinyFeedback({
          sessionId,
          destinyId,
          choice: "miss",
          stage: "reroll_gate",
          rerollReason: reason,
          note: note.trim() || undefined,
        });
        navigate("/release-spirit/mood");
        return;
      }

      const reroll = await fetchDestiny({
        entryPath: "release_spirit",
        sessionId,
        signals: {
          mood,
          nextSignal,
          memoryHints: buildMemoryHints(),
          recommendVariantId: recommendVariantId ?? undefined,
          ...readBuildIntent("death.buildIntent"),
          excludedClasses:
            reason === "wrong_class" || reason === "just_curious" ? [destiny.classId] : undefined,
          preferredClass: reason === "wrong_energy" || reason === "almost_right" ? destiny.classId : undefined,
        },
      });
      rememberReroll(reason, destiny.classId);
      trackEvent(AnalyticsEvent.MemoryProfileUpdated, {
        reason,
        action: "reroll",
        classId: destiny.classId,
        memoryConfidence: buildMemoryHints().confidence ?? 0,
      });

      const choice = reason === "almost_right" ? "almost_right" : "miss";
      await submitDestinyFeedback({
        sessionId,
        destinyId,
        choice,
        stage: "reroll_gate",
        rerollReason: reason,
        note: note.trim() || undefined,
        rerollFromClassId: destiny.classId,
        rerollToClassId: reroll.output.classId,
      });
      if (reroll.output.classId === destiny.classId) {
        setActionMessage(`Logged ${reason.replace("_", " ")}. Refined within the same class.`);
      } else {
        setActionMessage(`Logged ${reason.replace("_", " ")}. Rerolled to a different class.`);
      }
      setDestiny(reroll.output);
      setDestinyId(reroll.destinyId);
      sessionStorage.setItem("death.destinyId", reroll.destinyId);
      setNote("");
      setShowRerollGate(false);
    } catch {
      setActionMessage("Could not save this rating yet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function acceptAndOpenPostRating() {
    if (!sessionId || !destinyId || !destiny || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage("");
    trackEvent(AnalyticsEvent.AcceptClicked, { flow: "release_spirit", destinyId, sessionId });
    try {
      await submitDestinyFeedback({
        sessionId,
        destinyId,
        choice: "accept",
        stage: "reroll_gate",
        note: note.trim() || undefined,
      });
      const share = await createShareRun({ sessionId, destinyId });
      rememberAccept(destiny.classId);
      trackEvent(AnalyticsEvent.MemoryProfileUpdated, {
        action: "accept",
        classId: destiny.classId,
        memoryConfidence: buildMemoryHints().confidence ?? 0,
      });
      sessionStorage.setItem("last.acceptedClassId", destiny.classId);
      setShowRerollGate(false);
      setActionMessage("Accepted. Opening share preview...");
      setNote("");
      navigate(`/share/${share.runId}`);
    } catch {
      setActionMessage("Could not save acceptance yet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <MemorialCard data={memorial} />
      <BuildIntentChips
        storageKey="death.buildIntent"
        hasGenerated={Boolean(destiny)}
        isGenerating={isLoadingDestiny}
        onGenerate={(signals) => void generateDestiny(signals)}
      />
      <div style={{ marginTop: 14 }}>
        {destiny ? (
          <>
            <DestinyCard data={destiny} />
            <div className="card" style={{ marginTop: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ts)" }}>Was this close to what you wanted?</p>
              <div className="flow-nav" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={`btn-ghost ${feedbackChoice === "closer" ? "chip-btn--on" : ""}`}
                  onClick={() => {
                    setFeedbackChoice("closer");
                    trackEvent(AnalyticsEvent.IntentFeedbackSubmitted, {
                      flow: "release_spirit",
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
                          flow: "release_spirit",
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
            {destinyId ? (
              <div className="flow-nav" style={{ marginTop: 12 }}>
                <Link to={`/build/${destinyId}`} className="btn-ghost">
                  Open HC build sheet
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className="card">
            <p className="step-label">Release spirit</p>
            <h1 className="hero-question">Forging your next destiny...</h1>
            <div className="forge-status-row">
              <span className="forge-spinner" aria-hidden="true" />
              <p className="hero-sub" style={{ margin: 0 }}>
                {isLoadingDestiny ? loadingPhase : loadError}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)", lineHeight: 1.45 }}>
          Memorial and next destiny can export as one image for sharing. See a{" "}
          <strong>narrow side-by-side layout</strong> on{" "}
          <Link to="/design/cards">card shells</Link> — polish, imagery, and real copy ship in later milestones.
        </p>
        <label style={{ marginTop: 10, display: "block", fontSize: 12, color: "var(--ts)" }}>
          Optional note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={240}
            placeholder="What made this right, almost right, or wrong?"
            style={{
              marginTop: 6,
              width: "100%",
              minHeight: 72,
              resize: "vertical",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--card)",
              color: "var(--text)",
              padding: 10,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
        </label>
        <div className="flow-nav" style={{ marginTop: 12 }}>
          <button type="button" className="btn-primary" disabled={isSubmitting || !destinyId} onClick={() => void acceptAndOpenPostRating()}>
            Accept this fate
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={isSubmitting || !destinyId}
            onClick={() => setShowRerollGate((prev) => !prev)}
          >
            Reroll (rating gate)
          </button>
        </div>
        {showRerollGate ? (
          <div className="flow-nav" style={{ marginTop: 10 }}>
            {rerollReasons.map((reason) => (
              <button
                key={reason.value}
                type="button"
                className="btn-ghost"
                disabled={isSubmitting || !destinyId}
                onClick={() => void runRerollWithReason(reason.value)}
              >
                {reason.label}
              </button>
            ))}
          </div>
        ) : null}
        {actionMessage ? (
          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "var(--ts)" }}>{actionMessage}</p>
        ) : null}
        <div className="flow-nav" style={{ marginTop: 18 }}>
          <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
