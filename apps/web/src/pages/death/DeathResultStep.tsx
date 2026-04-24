import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { type DestinyFixture } from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import {
  commitJourneyBuild,
  createShareRun,
  fetchDestiny,
  fetchGrowthAssignment,
  fetchNameCandidates,
  type RerollReason,
  submitDestinyFeedback,
} from "../../lib/recommendClient";
import { readBuildIntent } from "../../lib/readBuildIntent";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";
import { buildMemoryHints, rememberAccept, rememberReroll } from "../../lib/memoryProfile";
import { readStoredDestiny } from "../../lib/flowDestinyState";
import { augmentMoodWithPower } from "../../lib/journeySignalsExtras";

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
  const [commitName, setCommitName] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const stored = readStoredDestiny("death");
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
      entryPath: "release_spirit",
    })
      .then((assignment) => setRecommendVariantId(assignment.variantId))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!destinyId) return;
    trackEvent(AnalyticsEvent.IntentFeedbackPromptShown, { flow: "release_spirit", destinyId });
    setFeedbackChoice(null);
    setFeedbackReason("");
  }, [destinyId]);

  useEffect(() => {
    void fetchNameCandidates({ limit: 6 })
      .then((res) => setNameSuggestions(res.names.map((row) => row.name)))
      .catch(() => setNameSuggestions([]));
  }, []);

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
          mood: augmentMoodWithPower(mood, "death.buildIntent"),
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

  async function commitBuild() {
    if (!sessionId || !destinyId || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage("");
    trackEvent(AnalyticsEvent.CommitClicked, { flow: "release_spirit", destinyId });
    try {
      const committed = await commitJourneyBuild({
        sessionId,
        destinyId,
        commitName: commitName.trim() || undefined,
      });
      trackEvent(AnalyticsEvent.CommitCompleted, {
        flow: "release_spirit",
        destinyId,
        slug: committed.slug,
      });
      navigate(committed.path);
    } catch {
      setActionMessage("Could not commit this build yet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {!destiny || !sessionId || !destinyId ? (
        <div className="card" style={{ marginTop: 14 }}>
          <p className="step-label">Release spirit</p>
          <h1 className="hero-question">Journey required</h1>
          <p className="hero-sub">{loadError || "Complete your build journey first."}</p>
          <div className="flow-nav" style={{ marginTop: 12 }}>
            <Link to="/release-spirit/journey" className="btn-primary">
              Go to journey
            </Link>
            <Link to="/" className="btn-ghost">
              Home
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="result-page-grid">
            <div className="result-page-grid__main">
              <DestinyCard data={destiny} intentSignals={readBuildIntent("death.buildIntent")} />
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
                <Link to="/release-spirit/journey" className="btn-ghost">
                  Retool journey
                </Link>
              </div>
            ) : null}
            <div className="card" style={{ marginTop: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ts)" }}>Name this build before commit</p>
              <input
                value={commitName}
                onChange={(event) => setCommitName(event.target.value)}
                placeholder="Custom build name"
                style={{ marginTop: 8, width: "100%" }}
              />
              {nameSuggestions.length > 0 ? (
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {nameSuggestions.map((name) => (
                    <button key={name} type="button" className="chip-btn" onClick={() => setCommitName(name)}>
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flow-nav" style={{ marginTop: 10 }}>
                <button type="button" className="btn-primary" disabled={isSubmitting} onClick={() => void commitBuild()}>
                  Commit build URL
                </button>
              </div>
            </div>
            </div>
            <aside className="result-page-grid__side">
          <div className="card">
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)", lineHeight: 1.45 }}>
          Memorials now live on the committed build URL after you mark a death. Share exports still use the{" "}
          <Link to="/design/cards">card shells</Link> reference layout.
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
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
