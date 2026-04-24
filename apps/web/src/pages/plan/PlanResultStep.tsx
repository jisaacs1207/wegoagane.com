import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { type DestinyFixture } from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import {
  createShareRun,
  fetchDestiny,
  fetchGrowthAssignment,
  type RerollReason,
  submitDestinyFeedback,
} from "../../lib/recommendClient";
import { readBuildIntent } from "../../lib/readBuildIntent";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";
import { buildMemoryHints, rememberAccept, rememberReroll } from "../../lib/memoryProfile";
import { readStoredDestiny } from "../../lib/flowDestinyState";

const rerollReasons: Array<{ value: RerollReason; label: string }> = [
  { value: "wrong_class", label: "Wrong class" },
  { value: "wrong_energy", label: "Wrong energy" },
  { value: "wrong_goals", label: "Wrong goals" },
  { value: "almost_right", label: "Almost right" },
  { value: "just_curious", label: "Just curious" },
];

export function PlanResultStep() {
  const navigate = useNavigate();
  const [destiny, setDestiny] = useState<DestinyFixture | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [note, setNote] = useState("");
  const [showRerollGate, setShowRerollGate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [recommendVariantId, setRecommendVariantId] = useState<string | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<"closer" | "off" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>("");

  useEffect(() => {
    const stored = readStoredDestiny("plan");
    if (!stored) {
      setLoadError("No generated destiny found yet. Complete the journey first.");
      return;
    }
    setDestiny(stored.output);
    setDestinyId(stored.destinyId);
    setSessionId(stored.sessionId);

    void fetchGrowthAssignment({
      sessionId: stored.sessionId,
      surface: "recommendation",
      entryPath: "draft_a_run",
    })
      .then((assignment) => {
        setRecommendVariantId(assignment.variantId);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!destinyId) return;
    trackEvent(AnalyticsEvent.IntentFeedbackPromptShown, { flow: "draft_a_run", destinyId });
    setFeedbackChoice(null);
    setFeedbackReason("");
  }, [destinyId]);

  async function runRerollWithReason(reason: RerollReason) {
    if (!sessionId || !destinyId || !destiny || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage("");
    trackEvent(AnalyticsEvent.RerollReasonSelected, {
      flow: "draft_a_run",
      reason,
      destinyId,
      sessionId,
      filterCount:
        (readBuildIntent("plan.buildIntent").statPhilosophy?.length ?? 0) +
        (readBuildIntent("plan.buildIntent").professionIntents?.length ?? 0) +
        (readBuildIntent("plan.buildIntent").buildVectors?.length ?? 0) +
        (readBuildIntent("plan.buildIntent").raceMode ? 1 : 0),
    });
    try {
      const intent = sessionStorage.getItem("plan.intent") ?? undefined;
      const freeform = sessionStorage.getItem("plan.freeform") ?? undefined;

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
        navigate("/draft-a-run/intent");
        return;
      }

      const reroll = await fetchDestiny({
        entryPath: "draft_a_run",
        sessionId,
        signals: {
          intent,
          freeform,
          memoryHints: buildMemoryHints(),
          recommendVariantId: recommendVariantId ?? undefined,
          ...readBuildIntent("plan.buildIntent"),
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
      sessionStorage.setItem("plan.destinyId", reroll.destinyId);
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
    trackEvent(AnalyticsEvent.AcceptClicked, { flow: "draft_a_run", destinyId, sessionId });
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
      {!destiny || !sessionId || !destinyId ? (
        <div className="card" style={{ marginTop: 14 }}>
          <p className="step-label">Draft a run</p>
          <h1 className="hero-question">Journey required</h1>
          <p className="hero-sub">{loadError || "Complete your build journey first."}</p>
          <div className="flow-nav" style={{ marginTop: 12 }}>
            <Link to="/draft-a-run/journey" className="btn-primary">
              Go to journey
            </Link>
            <Link to="/" className="btn-ghost">
              Home
            </Link>
          </div>
        </div>
      ) : (
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
                    flow: "draft_a_run",
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
                        flow: "draft_a_run",
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
              <Link to="/draft-a-run/journey" className="btn-ghost">
                Retool journey
              </Link>
            </div>
          ) : null}
          <p style={{ marginTop: 14, fontSize: 13, color: "var(--ts)" }}>
        Planning mode skips memorial chrome — only the next Destiny card is shown here.
      </p>
      <div className="card" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)" }}>
          Before rerolling, tell us what felt off so the next result mutates in the right direction.
        </p>
        <label style={{ marginTop: 10, display: "block", fontSize: 12, color: "var(--ts)" }}>
          Optional note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={240}
            placeholder="What should change next time?"
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
      </div>
        </>
      )}
      <div className="flow-nav" style={{ marginTop: 8 }}>
        <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
          Home
        </Link>
      </div>
    </div>
  );
}
