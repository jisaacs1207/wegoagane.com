import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { destinyFixture, memorialFixture } from "../content/cardFixtures";
import { ShareComboLayout } from "../components/cards/ShareComboLayout";
import {
  fetchGrowthAssignment,
  fetchShareRun,
  flowApiErrorHint,
  submitGrowthOutcome,
  submitDestinyFeedback,
  type PostAcceptRating,
  type ShareRunResponse,
} from "../lib/recommendClient";
import { SessionKeys } from "../lib/sessionKeys";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";
import { rememberPostAcceptRating } from "../lib/memoryProfile";

const postAcceptChoices: Array<{ value: PostAcceptRating; label: string }> = [
  { value: "not_this", label: "Not this" },
  { value: "itll_do", label: "It'll do" },
  { value: "good_pick", label: "Good pick" },
  { value: "this_is_it", label: "This is it" },
  { value: "perfect", label: "Perfect" },
];

export function SharePlaceholderPage() {
  const { runId } = useParams();
  const [share, setShare] = useState<ShareRunResponse | null>(null);
  const [ratingMessage, setRatingMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharePrefix, setSharePrefix] = useState<string>("Run share");
  const [pollError, setPollError] = useState<string>("");
  const lastStatusRef = useRef<string | null>(null);
  const pollFailCountRef = useRef(0);

  useEffect(() => {
    if (!runId) return;
    trackEvent(AnalyticsEvent.ShareViewed, { runId });
    const sessionId = sessionStorage.getItem(SessionKeys.home.sessionId) ?? crypto.randomUUID();
    sessionStorage.setItem(SessionKeys.home.sessionId, sessionId);
    let assignmentId: string | null = null;
    void fetchGrowthAssignment({ sessionId, surface: "share" })
      .then((assignment) => {
        assignmentId = assignment.assignmentId;
        if (assignment.payload?.sharePromptPrefix) setSharePrefix(assignment.payload.sharePromptPrefix);
      })
      .catch(() => {});
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const result = await fetchShareRun(runId);
        if (cancelled) return;
        pollFailCountRef.current = 0;
        setPollError("");
        setShare(result);
        if (result.status !== lastStatusRef.current) {
          lastStatusRef.current = result.status;
          trackEvent(AnalyticsEvent.ShareStatusChanged, {
            runId,
            status: result.status,
            destinyId: result.destinyId,
            sessionId: result.sessionId,
          });
        }
        if (result.status === "queued" || result.status === "rendering") {
          timer = setTimeout(() => {
            void tick();
          }, 1500);
        }
        if (assignmentId && result.status === "ready") {
          void submitGrowthOutcome({ assignmentId, converted: true, outcome: { event: "share_ready", runId } }).catch(() => {});
        }
      } catch {
        if (!cancelled) {
          timer = setTimeout(() => {
            void tick();
          }, 2500);
        }
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId]);

  async function submitPostAcceptRating(rating: PostAcceptRating) {
    if (!share?.sessionId || !share?.destinyId || isSubmitting) return;
    setIsSubmitting(true);
    setRatingMessage("");
    try {
      await submitDestinyFeedback({
        sessionId: share.sessionId,
        destinyId: share.destinyId,
        choice: "accept",
        stage: "post_accept",
        postAcceptRating: rating,
      });
      trackEvent(AnalyticsEvent.PostAcceptRatingSubmitted, {
        runId,
        sessionId: share.sessionId,
        destinyId: share.destinyId,
        rating,
      });
      const classId = sessionStorage.getItem("last.acceptedClassId");
      if (
        classId === "mage" ||
        classId === "hunter" ||
        classId === "warrior" ||
        classId === "warlock" ||
        classId === "priest" ||
        classId === "rogue" ||
        classId === "druid" ||
        classId === "paladin" ||
        classId === "shaman"
      ) {
        rememberPostAcceptRating(classId, rating);
        trackEvent(AnalyticsEvent.MemoryProfileUpdated, {
          action: "post_accept_rating",
          classId,
          rating,
        });
      }
      setRatingMessage("Final rating saved.");
    } catch (err) {
      setRatingMessage(flowApiErrorHint(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="card">
        <p className="step-label">Share</p>
        <h1 className="hero-question">{sharePrefix}</h1>
        <p className="hero-sub">
          Run id <strong>{runId}</strong> — status: <strong>{share?.status ?? "loading"}</strong>.
        </p>
        {pollError ? (
          <p className="hero-sub" style={{ marginTop: 8, color: "#ef4444" }} role="status" aria-live="polite">
            {pollError}
          </p>
        ) : null}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        {share?.status === "ready" && share.imageUrl ? (
          <img
            src={share.imageUrl}
            alt="Run share image"
            style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)" }}
          />
        ) : (
          <ShareComboLayout memorial={memorialFixture} destiny={destinyFixture} />
        )}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ts)" }}>Post-accept rating (non-blocking)</p>
        <div className="flow-nav" style={{ marginTop: 8 }}>
          {postAcceptChoices.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className="btn-ghost"
              disabled={isSubmitting || !share?.destinyId}
              onClick={() => void submitPostAcceptRating(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        {ratingMessage ? (
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "var(--ts)" }}>{ratingMessage}</p>
        ) : null}
      </div>
      <Link to="/" className="btn-ghost" style={{ display: "inline-flex", marginTop: 16 }}>
        ← Home
      </Link>
    </div>
  );
}
