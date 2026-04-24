import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { DestinyCard } from "../../components/cards/DestinyCard";
import type { DestinyFixture } from "../../content/cardFixtures";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";
import { readStoredDestiny } from "../../lib/flowDestinyState";

export function LuckyResultStep() {
  const [destiny, setDestiny] = useState<DestinyFixture | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<"closer" | "off" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>("");

  useEffect(() => {
    const stored = readStoredDestiny("lucky");
    if (stored) {
      setDestiny(stored.output);
      setDestinyId(stored.destinyId);
    }
  }, []);

  useEffect(() => {
    if (!destinyId) return;
    trackEvent(AnalyticsEvent.IntentFeedbackPromptShown, { flow: "lucky_roll", destinyId });
  }, [destinyId]);

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
      <div className="flow-nav" style={{ marginTop: 16 }}>
        <Link to={`/build/${destinyId}`} className="btn-primary">
          Open HC build sheet
        </Link>
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

