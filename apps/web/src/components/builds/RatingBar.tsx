import { useEffect, useRef, useState } from "react";
import "./rating-bar.css";
import { fetchMyBuildVote, rateBuild, type BuildVote } from "../../lib/recommendClient";
import { debugClientIgnored } from "../../lib/clientDebug";
import { AnalyticsEvent, trackEvent } from "../../lib/analytics";

export type RatingBarProps = {
  slug: string;
  sessionId: string;
  initialThumbsUp: number;
  initialThumbsDown: number;
  /** Hide the explainer caption for compact placements (e.g. inside cards). */
  compact?: boolean;
};

/**
 * Above-the-fold thumbs up/down rating bar for build commit pages.
 *
 * Behaviour:
 * - Optimistic update on click; reconciles from server response.
 * - Re-clicking the same vote toggles it off (matches API).
 * - Switching from up to down (or vice versa) shifts the optimistic counts smoothly.
 * - First non-zero vote on a draft build server-side flips it to `published`, so the build appears
 *   on the home rails. The UI doesn't expose draft state because that detail is irrelevant to
 *   raters.
 */
export function RatingBar({ slug, sessionId, initialThumbsUp, initialThumbsDown, compact }: RatingBarProps) {
  const [thumbsUp, setThumbsUp] = useState(initialThumbsUp);
  const [thumbsDown, setThumbsDown] = useState(initialThumbsDown);
  const [yourVote, setYourVote] = useState<BuildVote>(null);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState<"up" | "down" | null>(null);
  /** After the user changes a vote locally, do not let a late `my-vote` response clobber the UI. */
  const userHasRated = useRef(false);

  useEffect(() => setThumbsUp(initialThumbsUp), [initialThumbsUp]);
  useEffect(() => setThumbsDown(initialThumbsDown), [initialThumbsDown]);

  useEffect(() => {
    userHasRated.current = false;
  }, [slug, sessionId]);

  useEffect(() => {
    let cancelled = false;
    if (!slug || !sessionId) return;
    void fetchMyBuildVote(slug, sessionId)
      .then((res) => {
        if (cancelled || userHasRated.current) return;
        setYourVote(res.yourVote);
        if (typeof res.thumbsUp === "number") setThumbsUp(res.thumbsUp);
        if (typeof res.thumbsDown === "number") setThumbsDown(res.thumbsDown);
      })
      .catch((err) => debugClientIgnored("rating_bar.fetch_vote", err));
    return () => {
      cancelled = true;
    };
  }, [slug, sessionId]);

  async function vote(direction: "up" | "down") {
    if (busy) return;
    setBusy(true);
    userHasRated.current = true;

    // Optimistic update so the UI feels instant.
    const prevVote = yourVote;
    let nextVote: BuildVote;
    if (prevVote === direction) {
      nextVote = null; // Toggle off.
    } else {
      nextVote = direction;
    }

    const optimisticUp = thumbsUp - (prevVote === "up" ? 1 : 0) + (nextVote === "up" ? 1 : 0);
    const optimisticDown = thumbsDown - (prevVote === "down" ? 1 : 0) + (nextVote === "down" ? 1 : 0);
    setThumbsUp(Math.max(0, optimisticUp));
    setThumbsDown(Math.max(0, optimisticDown));
    setYourVote(nextVote);
    setPulse(direction);
    window.setTimeout(() => setPulse(null), 320);

    try {
      const res = await rateBuild(slug, prevVote === direction ? "clear" : direction, sessionId);
      // Reconcile from authoritative server counts.
      setThumbsUp(res.thumbsUp);
      setThumbsDown(res.thumbsDown);
      setYourVote(res.yourVote);
      trackEvent(AnalyticsEvent.BuildRated, { slug, vote: res.yourVote, status: res.status });
    } catch (err) {
      debugClientIgnored("rating_bar.rate", err);
      // Roll back to last-known good state on failure.
      setThumbsUp(thumbsUp);
      setThumbsDown(thumbsDown);
      setYourVote(prevVote);
      userHasRated.current = false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rating-bar ${compact ? "rating-bar--compact" : ""}`} role="group" aria-label="Rate this build">
      <button
        type="button"
        className={`rating-bar__btn rating-bar__btn--up ${yourVote === "up" ? "rating-bar__btn--active" : ""} ${pulse === "up" ? "rating-bar__btn--pulse" : ""}`}
        onClick={() => void vote("up")}
        disabled={busy}
        aria-pressed={yourVote === "up"}
        aria-label="Thumbs up"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="rating-bar__icon">
          <path d="M2 11h4v10H2zM22 11.27c0-.93-.7-1.7-1.62-1.78l-5.16-.46.79-3.81c.06-.27.03-.55-.08-.8-.32-.7-1.08-1.05-1.78-.94l-1.49.24c-.62.1-1.13.55-1.34 1.15L9 11v10h10.04c.79 0 1.49-.55 1.66-1.32l1.27-7.08c.02-.11.03-.22.03-.33z" />
        </svg>
        <span className="rating-bar__count">{thumbsUp}</span>
      </button>
      <button
        type="button"
        className={`rating-bar__btn rating-bar__btn--down ${yourVote === "down" ? "rating-bar__btn--active" : ""} ${pulse === "down" ? "rating-bar__btn--pulse" : ""}`}
        onClick={() => void vote("down")}
        disabled={busy}
        aria-pressed={yourVote === "down"}
        aria-label="Thumbs down"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="rating-bar__icon">
          <path d="M22 13h-4V3h4zM2 12.73c0 .93.7 1.7 1.62 1.78l5.16.46-.79 3.81c-.06.27-.03.55.08.8.32.7 1.08 1.05 1.78.94l1.49-.24c.62-.1 1.13-.55 1.34-1.15L15 13V3H4.96c-.79 0-1.49.55-1.66 1.32l-1.27 7.08c-.02.11-.03.22-.03.33z" />
        </svg>
        <span className="rating-bar__count">{thumbsDown}</span>
      </button>
      {compact ? null : (
        <span className="rating-bar__caption">
          {yourVote ? "Thanks for rating" : "Rate this build"}
        </span>
      )}
    </div>
  );
}

export default RatingBar;
