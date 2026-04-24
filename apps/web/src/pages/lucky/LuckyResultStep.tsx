import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { DestinyCard } from "../../components/cards/DestinyCard";
import type { DestinyFixture } from "../../content/cardFixtures";
import { wowPackUrl } from "../../content/identityAssets";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";
import { commitJourneyBuild, fetchNameCandidates, generateNameCandidates } from "../../lib/recommendClient";
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
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [nameLane, setNameLane] = useState<"neutral" | "light_humor" | "lore_world">("neutral");

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
    setIsLoadingNames(true);
    void fetchNameCandidates({ lane: nameLane, limit: 6 })
      .then((res) => setNameSuggestions(res.names.map((row) => row.name)))
      .catch(() => setNameSuggestions([]))
      .finally(() => setIsLoadingNames(false));
  }, [nameLane]);

  async function loadGeneratedNames(reroll: boolean) {
    if (!sessionId || !destinyId || isLoadingNames) return;
    setIsLoadingNames(true);
    try {
      const res = await generateNameCandidates({
        sessionId,
        destinyId,
        style: nameLane,
        count: 8,
        rerollSeed: reroll ? `${Date.now()}` : undefined,
        currentName: commitName || undefined,
      });
      setNameSuggestions(res.names.map((row) => row.name));
    } catch {
      setCommitMessage("Could not generate more names yet.");
    } finally {
      setIsLoadingNames(false);
    }
  }

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
    <div className="result-page-grid">
      <div className="result-page-grid__main">
        <DestinyCard data={destiny} intentSignals={readBuildIntent("lucky.buildIntent")} />
      </div>
      <aside className="result-page-grid__side">
        <div className="card">
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
        <div
          className="card icon-motif-card"
          style={{ marginTop: 12, ["--motif-url" as string]: `url(${wowPackUrl("Abilities", "Blink.png")})` }}
        >
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
        <div className="flow-nav flow-nav--wrap" style={{ marginTop: 8 }}>
          <button type="button" className={`btn-ghost ${nameLane === "neutral" ? "chip-btn--on" : ""}`} onClick={() => setNameLane("neutral")}>
            Neutral
          </button>
          <button
            type="button"
            className={`btn-ghost ${nameLane === "light_humor" ? "chip-btn--on" : ""}`}
            onClick={() => setNameLane("light_humor")}
          >
            Fun
          </button>
          <button
            type="button"
            className={`btn-ghost ${nameLane === "lore_world" ? "chip-btn--on" : ""}`}
            onClick={() => setNameLane("lore_world")}
          >
            Lore
          </button>
        </div>
        <div className="flow-nav" style={{ marginTop: 10 }}>
          <button type="button" className="btn-ghost" disabled={isLoadingNames || !sessionId} onClick={() => void loadGeneratedNames(false)}>
            {isLoadingNames ? "Loading..." : "Generate more names"}
          </button>
          <button type="button" className="btn-ghost" disabled={isLoadingNames || !sessionId} onClick={() => void loadGeneratedNames(true)}>
            Reroll names
          </button>
          <button type="button" className="btn-primary" onClick={() => void commitBuild()}>
            Commit build URL
          </button>
        </div>
        {commitMessage ? <p style={{ marginBottom: 0 }}>{commitMessage}</p> : null}
        </div>
        <div className="flow-nav flow-nav--wrap" style={{ marginTop: 16 }}>
          <Link to="/lucky-roll/journey" className="btn-ghost">
            Retool path
          </Link>
          <Link to="/" className="btn-ghost">
            Home
          </Link>
        </div>
      </aside>
    </div>
  );
}

