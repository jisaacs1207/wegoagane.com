import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { type DestinyFixture } from "../../content/cardFixtures";
import { wowPackUrl } from "../../content/identityAssets";
import { DestinyCard } from "../../components/cards/DestinyCard";
import {
  commitJourneyBuild,
  createShareRun,
  fetchDestiny,
  fetchNameCandidates,
  generateNameCandidates,
  fetchGrowthAssignment,
  flowApiErrorHint,
  type RerollReason,
  submitDestinyFeedback,
} from "../../lib/recommendClient";
import { augmentFreeformWithPower } from "../../lib/journeySignalsExtras";
import { readBuildIntent } from "../../lib/readBuildIntent";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";
import { buildMemoryHints, rememberAccept, rememberReroll } from "../../lib/memoryProfile";
import { readStoredDestiny, writeStoredDestiny } from "../../lib/flowDestinyState";
import type { BuildIntentSignals } from "../../lib/buildIntentTypes";
import { debugClientIgnored } from "../../lib/clientDebug";
import { SessionKeys } from "../../lib/sessionKeys";

const rerollReasons: Array<{ value: RerollReason; label: string }> = [
  { value: "wrong_class", label: "Wrong class" },
  { value: "wrong_energy", label: "Wrong energy" },
  { value: "wrong_goals", label: "Wrong goals" },
  { value: "almost_right", label: "Almost right" },
  { value: "just_curious", label: "Just curious" },
];
void rerollReasons;

export function PlanResultStep() {
  const navigate = useNavigate();
  const [destiny, setDestiny] = useState<DestinyFixture | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [recommendVariantId, setRecommendVariantId] = useState<string | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<"closer" | "off" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>("");
  const [commitName, setCommitName] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [nameLane, setNameLane] = useState<"hc_practical" | "lore_world" | "neutral">("hc_practical");
  const [nameMode, setNameMode] = useState<"reflective" | "high_variance" | "humor">("reflective");
  const [nameVariance, setNameVariance] = useState(0.6);
  const [cardIntentSignals, setCardIntentSignals] = useState<BuildIntentSignals | null>(null);
  const [showRelaxBanner, setShowRelaxBanner] = useState(false);
  const [showExperimentalBanner, setShowExperimentalBanner] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SessionKeys.plan.recommendRelaxBanner) === "1") {
        setShowRelaxBanner(true);
        sessionStorage.removeItem(SessionKeys.plan.recommendRelaxBanner);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const stored = readStoredDestiny("plan");
    if (!stored) {
      setLoadError("No generated destiny found yet. Complete the journey first.");
      return;
    }
    setDestiny(stored.output);
    setDestinyId(stored.destinyId);
    setSessionId(stored.sessionId);
    setCardIntentSignals(stored.intentSnapshot ?? null);
    setShowExperimentalBanner(Boolean(stored.experimentalLane || stored.experimentalCandidate));

    void fetchGrowthAssignment({
      sessionId: stored.sessionId,
      surface: "recommendation",
      entryPath: "draft_a_run",
    })
      .then((assignment) => {
        setRecommendVariantId(assignment.variantId);
      })
      .catch((err) => {
        debugClientIgnored("plan_result.growth_assignment", err);
        return null;
      });
  }, []);

  useEffect(() => {
    if (!destinyId) return;
    trackEvent(AnalyticsEvent.IntentFeedbackPromptShown, { flow: "draft_a_run", destinyId });
    setFeedbackChoice(null);
    setFeedbackReason("");
  }, [destinyId]);

  useEffect(() => {
    setIsLoadingNames(true);
    void fetchNameCandidates({ lane: nameLane, limit: 6 })
      .then((res) => setNameSuggestions(res.names.map((row) => row.name)))
      .catch((err) => {
        debugClientIgnored("plan_result.name_candidates", err);
        setNameSuggestions([]);
      })
      .finally(() => setIsLoadingNames(false));
  }, [nameLane]);

  async function loadGeneratedNames(reroll: boolean) {
    if (!sessionId || !destinyId || isLoadingNames) return;
    setIsLoadingNames(true);
    try {
      const intent = cardIntentSignals ?? readBuildIntent(SessionKeys.plan.buildIntent);
      const nameContext = [
        `class=${destiny?.classId ?? "unknown"}`,
        `intent=${sessionStorage.getItem(SessionKeys.plan.intent) ?? "none"}`,
        `note=${sessionStorage.getItem(SessionKeys.plan.freeform) ?? "none"}`,
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
      setActionMessage(flowApiErrorHint(e));
    } finally {
      setIsLoadingNames(false);
    }
  }

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
        (readBuildIntent(SessionKeys.plan.buildIntent).statPhilosophy?.length ?? 0) +
        (readBuildIntent(SessionKeys.plan.buildIntent).professionIntents?.length ?? 0) +
        (readBuildIntent(SessionKeys.plan.buildIntent).buildVectors?.length ?? 0) +
        (readBuildIntent(SessionKeys.plan.buildIntent).raceMode ? 1 : 0),
    });
    try {
      const intent = sessionStorage.getItem(SessionKeys.plan.intent) ?? undefined;
      const freeform = sessionStorage.getItem(SessionKeys.plan.freeform) ?? undefined;

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
          freeform: augmentFreeformWithPower(freeform, SessionKeys.plan.buildIntent),
          memoryHints: buildMemoryHints(),
          recommendVariantId: recommendVariantId ?? undefined,
          ...readBuildIntent(SessionKeys.plan.buildIntent),
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
      sessionStorage.setItem(SessionKeys.plan.destinyId, reroll.destinyId);
      const snapshot = readBuildIntent(SessionKeys.plan.buildIntent);
      writeStoredDestiny("plan", {
        sessionId: reroll.sessionId,
        destinyId: reroll.destinyId,
        output: reroll.output,
        intentSnapshot: snapshot,
        experimentalLane: reroll.experimentalLane,
        experimentalCandidate: reroll.experimentalCandidate,
      });
      setCardIntentSignals(snapshot);
      if (reroll.filterRelaxedForAi) setShowRelaxBanner(true);
      setShowExperimentalBanner(Boolean(reroll.experimentalLane || reroll.experimentalCandidate));
      setNote("");
    } catch (e) {
      setActionMessage(flowApiErrorHint(e));
    } finally {
      setIsSubmitting(false);
    }
  }
  void runRerollWithReason;

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
      sessionStorage.setItem(SessionKeys.home.lastAcceptedClassId, destiny.classId);
      setActionMessage("Accepted. Opening share preview...");
      setNote("");
      navigate(`/share/${share.runId}`);
    } catch (e) {
      setActionMessage(flowApiErrorHint(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function commitBuild() {
    if (!sessionId || !destinyId || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage("");
    trackEvent(AnalyticsEvent.CommitClicked, { flow: "draft_a_run", destinyId });
    try {
      const committed = await commitJourneyBuild({
        sessionId,
        destinyId,
        commitName: commitName.trim() || undefined,
      });
      trackEvent(AnalyticsEvent.CommitCompleted, {
        flow: "draft_a_run",
        destinyId,
        slug: committed.slug,
      });
      navigate(committed.path);
    } catch (e) {
      setActionMessage(flowApiErrorHint(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {!destiny || !sessionId || !destinyId ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="flow-crumbs" aria-label="Flow navigation">
            <span className="flow-crumb">
              <Link to="/">Home</Link>
            </span>
            <span className="flow-crumb">/</span>
            <span className="flow-crumb">
              <Link to="/draft-a-run/intent">Detailed setup</Link>
            </span>
            <span className="flow-crumb">/</span>
            <span className="flow-crumb">
              <Link to="/draft-a-run/journey">Tune filters</Link>
            </span>
            <span className="flow-crumb">/</span>
            <span className="flow-crumb">Your build</span>
          </div>
          <p className="step-label">Draft a run · step 3 of 3</p>
          <h1 className="hero-question">Journey required</h1>
          <p className="hero-sub" role="status" aria-live="polite">
            {loadError || "Complete your build journey first."}
          </p>
          <div className="flow-nav" style={{ marginTop: 12 }}>
            <Link to="/draft-a-run/intent" className="btn-primary">
              Open setup
            </Link>
            <Link to="/" className="btn-ghost">
              Home
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flow-crumbs" aria-label="Flow navigation">
            <span className="flow-crumb">
              <Link to="/">Home</Link>
            </span>
            <span className="flow-crumb">/</span>
            <span className="flow-crumb">
              <Link to="/draft-a-run/intent">Detailed setup</Link>
            </span>
            <span className="flow-crumb">/</span>
            <span className="flow-crumb">
              <Link to="/draft-a-run/journey">Tune filters</Link>
            </span>
            <span className="flow-crumb">/</span>
            <span className="flow-crumb">Your build</span>
          </div>
          <p className="step-label" style={{ marginTop: 0, marginBottom: 10 }}>
            Draft a run · step 3 of 3
          </p>
          {showExperimentalBanner ? (
            <p className="ui-body-sm" style={{ marginTop: 0, marginBottom: 10 }} role="status">
              <strong>Experimental lane</strong> — generated from an AI candidate in normal rotation. Use with care, and rate/reroll so it can be promoted or retired automatically.
            </p>
          ) : null}
          {showRelaxBanner ? (
            <p className="ui-body-sm" style={{ marginTop: 0, marginBottom: 10 }} role="status">
              No template matched every filter together — we picked a compatible class for this era and used AI to
              shape the card toward your picks. Your journey chips are still what you asked for.
            </p>
          ) : null}
          <DestinyCard
            data={destiny}
            intentSignals={cardIntentSignals ?? readBuildIntent(SessionKeys.plan.buildIntent)}
          />
          <div
            className="card icon-motif-card"
            style={{ marginTop: 12, ["--motif-url" as string]: `url(${wowPackUrl("Trade", "engineering.png")})` }}
          >
            <p className="ui-caption">How close is this to what you wanted?</p>
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
                Pretty close
              </button>
              <button
                type="button"
                className={`btn-ghost ${feedbackChoice === "off" ? "chip-btn--on" : ""}`}
                onClick={() => setFeedbackChoice("off")}
              >
                Off target
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
              <Link to="/draft-a-run/intent" className="btn-ghost">
                Edit setup
              </Link>
            </div>
          ) : null}
          <div className="card" style={{ marginTop: 12 }}>
            <p className="ui-caption">Character name (optional, used on memorial only)</p>
            <input
              value={commitName}
              onChange={(event) => setCommitName(event.target.value)}
              maxLength={80}
              placeholder="e.g. Stonkee"
              aria-label="Character name (optional, used on memorial only)"
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
              <button
                type="button"
                className={`btn-ghost ${nameLane === "hc_practical" ? "chip-btn--on" : ""}`}
                onClick={() => setNameLane("hc_practical")}
              >
                Practical
              </button>
              <button
                type="button"
                className={`btn-ghost ${nameLane === "lore_world" ? "chip-btn--on" : ""}`}
                onClick={() => setNameLane("lore_world")}
              >
                Lore
              </button>
              <button
                type="button"
                className={`btn-ghost ${nameLane === "neutral" ? "chip-btn--on" : ""}`}
                onClick={() => setNameLane("neutral")}
              >
                Neutral
              </button>
            </div>
            <div className="flow-nav flow-nav--wrap" style={{ marginTop: 8 }}>
              <button type="button" className={`btn-ghost ${nameMode === "reflective" ? "chip-btn--on" : ""}`} onClick={() => setNameMode("reflective")}>
                Match this build
              </button>
              <button type="button" className={`btn-ghost ${nameMode === "high_variance" ? "chip-btn--on" : ""}`} onClick={() => setNameMode("high_variance")}>
                Higher variance
              </button>
              <button type="button" className={`btn-ghost ${nameMode === "humor" ? "chip-btn--on" : ""}`} onClick={() => setNameMode("humor")}>
                Light humor
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
              <button
                type="button"
                className="btn-ghost"
                disabled={isLoadingNames || !sessionId}
                onClick={() => void loadGeneratedNames(false)}
              >
                {isLoadingNames ? "Loading..." : "New name set"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={isLoadingNames || !sessionId}
                onClick={() => void loadGeneratedNames(true)}
              >
                Shuffle names
              </button>
              <button type="button" className="btn-primary" disabled={isSubmitting} onClick={() => void commitBuild()}>
                Save build URL
              </button>
            </div>
          </div>
          <p className="ui-body-sm" style={{ marginTop: 14 }}>
        Planning mode skips memorial chrome — only the next Destiny card is shown here.
      </p>
      <div className="card" style={{ marginTop: 12 }}>
        <p className="ui-body-sm">
          Before rerolling, tell us what felt off so the next result mutates in the right direction.
        </p>
        <label className="ui-caption" style={{ marginTop: 10, display: "block" }}>
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
              fontSize: "var(--type-body-sm)",
              fontFamily: "inherit",
            }}
          />
        </label>
        <div className="flow-nav" style={{ marginTop: 12 }}>
          <button type="button" className="btn-primary" disabled={isSubmitting || !destinyId} onClick={() => void acceptAndOpenPostRating()}>
            Accept result
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={isSubmitting || !destinyId}
            onClick={() => navigate("/reroll/plan")}
          >
            Reroll with feedback
          </button>
        </div>

        {actionMessage ? (
          <p className="ui-caption" style={{ marginTop: 10, marginBottom: 0 }} role="status" aria-live="polite">
            {actionMessage}
          </p>
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
