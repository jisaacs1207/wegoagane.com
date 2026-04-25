import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { DestinyCard } from "../../components/cards/DestinyCard";
import type { DestinyFixture } from "../../content/cardFixtures";
import { wowPackUrl } from "../../content/identityAssets";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";
import { commitJourneyBuild, fetchNameCandidates, flowApiErrorHint, generateNameCandidates } from "../../lib/recommendClient";
import { readStoredDestiny } from "../../lib/flowDestinyState";
import { readBuildIntent } from "../../lib/readBuildIntent";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { debugClientIgnored } from "../../lib/clientDebug";
import { SessionKeys } from "../../lib/sessionKeys";

export function LuckyResultStep() {
  const navigate = useNavigate();
  const [destiny, setDestiny] = useState<DestinyFixture | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [commitName, setCommitName] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [nameLane, setNameLane] = useState<"neutral" | "light_humor" | "lore_world">("neutral");
  const [nameMode, setNameMode] = useState<"reflective" | "high_variance" | "humor">("reflective");
  const [nameVariance, setNameVariance] = useState(0.65);
  const [cardIntentSignals, setCardIntentSignals] = useState<BuildIntentSignals | null>(null);
  const [showRelaxBanner, setShowRelaxBanner] = useState(false);
  const [showExperimentalBanner, setShowExperimentalBanner] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SessionKeys.lucky.recommendRelaxBanner) === "1") {
        setShowRelaxBanner(true);
        sessionStorage.removeItem(SessionKeys.lucky.recommendRelaxBanner);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const stored = readStoredDestiny("lucky");
    if (stored) {
      setDestiny(stored.output);
      setDestinyId(stored.destinyId);
      setSessionId(stored.sessionId);
      setCardIntentSignals(stored.intentSnapshot ?? null);
      setShowExperimentalBanner(Boolean(stored.experimentalLane || stored.experimentalCandidate));
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
      .catch((err) => {
        debugClientIgnored("lucky_result.name_candidates", err);
        setNameSuggestions([]);
      })
      .finally(() => setIsLoadingNames(false));
  }, [nameLane]);

  async function loadGeneratedNames(reroll: boolean) {
    if (!sessionId || !destinyId || isLoadingNames) return;
    setIsLoadingNames(true);
    try {
      const intent = cardIntentSignals ?? readBuildIntent(SessionKeys.lucky.buildIntent);
      const nameContext = [
        `class=${destiny?.classId ?? "unknown"}`,
        "path=lucky_roll",
        `stats=${(intent.statPhilosophy ?? []).join(",") || "none"}`,
        `professions=${(intent.professionIntents ?? []).join(",") || "none"}`,
        `vectors=${(intent.buildVectors ?? []).join(",") || "none"}`,
      ].join(" | ");
      const res = await generateNameCandidates({
        sessionId,
        destinyId,
        style: nameMode === "humor" ? "light_humor" : nameLane,
        count: 8,
        rerollSeed: reroll ? `${Date.now()}` : undefined,
        currentName: commitName || undefined,
        mode: nameMode,
        variance: nameVariance,
        context: nameContext,
      });
      setNameSuggestions(res.names.map((row) => row.name));
    } catch (e) {
      setCommitMessage(flowApiErrorHint(e));
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
      navigate(committed.path);
    } catch (e) {
      setCommitMessage(flowApiErrorHint(e));
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
        {showExperimentalBanner ? (
          <p className="ui-body-sm" style={{ marginTop: 0, marginBottom: 10 }} role="status">
            <strong>Experimental lane</strong> — generated from an AI candidate in normal rotation. Use with care, and rate/reroll so it can be promoted or retired automatically.
          </p>
        ) : null}
        {showRelaxBanner ? (
          <p className="ui-body-sm" style={{ marginTop: 0, marginBottom: 10 }} role="status">
            No template matched every filter together — we picked a compatible class for this era and used AI to shape
            the card toward your picks.
          </p>
        ) : null}
        <DestinyCard
          data={destiny}
          intentSignals={cardIntentSignals ?? readBuildIntent(SessionKeys.lucky.buildIntent)}
        />
      </div>
      <aside className="result-page-grid__side">
        <div className="card">
        <p className="ui-caption">Need a different result?</p>
        <div className="flow-nav" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/reroll/lucky")}
          >
            Reroll and tell us why
          </button>
        </div>
        </div>
        <div
          className="card icon-motif-card"
          style={{ marginTop: 12, ["--motif-url" as string]: `url(${wowPackUrl("Abilities", "Blink.png")})` }}
        >
        <p className="ui-caption">Name this build before commit</p>
        <input
          value={commitName}
          onChange={(event) => setCommitName(event.target.value)}
          maxLength={80}
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
        <div className="flow-nav flow-nav--wrap" style={{ marginTop: 8 }}>
          <button type="button" className={`btn-ghost ${nameMode === "reflective" ? "chip-btn--on" : ""}`} onClick={() => setNameMode("reflective")}>
            Reflect choices
          </button>
          <button type="button" className={`btn-ghost ${nameMode === "high_variance" ? "chip-btn--on" : ""}`} onClick={() => setNameMode("high_variance")}>
            More unique
          </button>
          <button type="button" className={`btn-ghost ${nameMode === "humor" ? "chip-btn--on" : ""}`} onClick={() => setNameMode("humor")}>
            Humor
          </button>
        </div>
        <label className="ui-caption" style={{ display: "block", marginTop: 8 }}>
          Name variance: {Math.round(nameVariance * 100)}%
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(nameVariance * 100)}
            onChange={(e) => setNameVariance(Number(e.target.value) / 100)}
            style={{ width: "100%" }}
          />
        </label>
        <div className="flow-nav" style={{ marginTop: 10 }}>
          <button type="button" className="btn-ghost" disabled={isLoadingNames || !sessionId} onClick={() => void loadGeneratedNames(false)}>
            {isLoadingNames ? "Loading..." : "Generate more names"}
          </button>
          <button type="button" className="btn-ghost" disabled={isLoadingNames || !sessionId} onClick={() => void loadGeneratedNames(true)}>
            Reroll names
          </button>
          <button type="button" className="btn-primary" onClick={() => void commitBuild()}>
            Create build link
          </button>
        </div>
        {commitMessage ? (
          <p style={{ marginBottom: 0 }} role="status" aria-live="polite">
            {commitMessage}
          </p>
        ) : null}
        </div>
        <div className="flow-nav flow-nav--wrap" style={{ marginTop: 16 }}>
          <Link to="/lucky-roll/journey" className="btn-ghost">
            Adjust journey
          </Link>
          <Link to="/" className="btn-ghost">
            Home
          </Link>
        </div>
      </aside>
    </div>
  );
}

