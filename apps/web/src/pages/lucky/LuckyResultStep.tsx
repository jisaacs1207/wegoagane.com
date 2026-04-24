import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { DestinyCard } from "../../components/cards/DestinyCard";
import type { DestinyFixture } from "../../content/cardFixtures";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";
import { commitJourneyBuild, fetchNameCandidates } from "../../lib/recommendClient";
import { readStoredDestiny } from "../../lib/flowDestinyState";
import { readBuildIntent } from "../../lib/readBuildIntent";

export function LuckyResultStep() {
  const [destiny, setDestiny] = useState<DestinyFixture | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<"closer" | "off" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [commitName, setCommitName] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState("");

  useEffect(() => {
    const stored = readStoredDestiny("lucky");
    if (stored) {
      setDestiny(stored.output);
      setDestinyId(stored.destinyId);
      setSessionId(stored.sessionId);
    }
  }, []);

  useEffect(() => {
    if (!destinyId) return;
    trackEvent(AnalyticsEvent.IntentFeedbackPromptShown, { flow: "lucky_roll", destinyId });
  }, [destinyId]);

  useEffect(() => {
    void fetchNameCandidates({ limit: 6 })
      .then((res) => setNameSuggestions(res.names.map((row) => row.name)))
      .catch(() => setNameSuggestions([]));
  }, []);

  async function commitBuild() {
    if (!sessionId || !destinyId) return;
    try {
      const committed = await commitJourneyBuild({
        sessionId,
        destinyId,
        commitName: commitName.trim() || undefined,
      });
      trackEvent(AnalyticsEvent.CommitCompleted, {
        flow: "lucky_roll",
        destinyId,
        slug: committed.slug,
      });
      window.location.assign(committed.path);
    } catch {
      setCommitMessage("Could not commit this build yet.");
    }
  }

  if (!destiny) {
    return (
      <div className="card">
        <p className="step-label">Lucky roll</p>
        <h1 className="hero-question">No generated roll yet</h1>
        <p className="hero-sub">Complete your setup journey first.</p>
        <div className="flow-nav" style={{ marginTop: 12 }}>
          <Link to="/lucky-roll/journey" className="btn-primary">
            Go to journey
          </Link>
          <Link to="/" className="btn-ghost">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DestinyCard data={destiny} intentSignals={readBuildIntent("lucky.buildIntent")} />
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
          <button type="button" className="btn-primary" onClick={() => void commitBuild()}>
            Commit build URL
          </button>
        </div>
        {commitMessage ? <p style={{ marginBottom: 0 }}>{commitMessage}</p> : null}
      </div>
      <div className="flow-nav" style={{ marginTop: 16 }}>
        <Link to="/lucky-roll/journey" className="btn-ghost">
          Retool path
        </Link>
        <Link to="/" className="btn-ghost">
          Home
        </Link>
      </div>
    </div>
  );
}

