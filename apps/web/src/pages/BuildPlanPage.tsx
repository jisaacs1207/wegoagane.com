import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchBuildCommit } from "../lib/recommendClient";
import { debugClientIgnored } from "../lib/clientDebug";

/**
 * Legacy `/build/:destinyId` route — the build sheet now lives inline on the
 * commit artifact at `/build/commit/:slug`. This thin wrapper resolves the
 * slug for an existing commit and redirects, polling briefly while the
 * commit row is being created so old bookmarks still land correctly.
 */
export function BuildPlanPage() {
  const { destinyId } = useParams();
  const [slug, setSlug] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!destinyId) return;
    let cancelled = false;
    let attempts = 0;
    /** DOM `setInterval` id — use `number` so we do not pick up Node's `Timeout` type from tooling. */
    let intervalId: number | undefined;

    const stopPolling = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const poll = async () => {
      try {
        const record = await fetchBuildCommit(destinyId);
        if (cancelled) return;
        setSlug(record.slug);
        stopPolling();
      } catch (err) {
        debugClientIgnored("build_plan_page.redirect_lookup", err);
        attempts += 1;
        if (attempts >= 6 && !cancelled) setMissing(true);
      }
    };

    void poll();
    intervalId = window.setInterval(() => void poll(), 2000);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [destinyId]);

  if (!destinyId) {
    return (
      <div className="card">
        <p>Missing destiny id.</p>
        <Link to="/">Home</Link>
      </div>
    );
  }

  if (slug) {
    return <Navigate to={`/build/commit/${slug}`} replace />;
  }

  return (
    <div className="card">
      <p className="step-label">Hardcore build sheet</p>
      <h1 className="hero-question">Opening your build artifact…</h1>
      <p className="hero-sub" style={{ marginTop: 0 }}>
        {missing
          ? "We can’t find a committed build for this destiny yet. Generate one from the result step, then come back."
          : "Resolving the canonical commit URL — this redirects automatically."}
      </p>
      <div className="flow-nav" style={{ marginTop: 14 }}>
        <Link to="/" className="btn-ghost">
          Home
        </Link>
      </div>
    </div>
  );
}
