import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";
import { fetchFeedbackSummary, flowApiErrorHint, type FeedbackSummary } from "../lib/recommendClient";

const emptySummary: FeedbackSummary = {
  total: 0,
  rerollsFromAlmostRight: 0,
  counts: { accept: 0, almostRight: 0, miss: 0 },
  postAcceptRatings: {
    not_this: 0,
    itll_do: 0,
    good_pick: 0,
    this_is_it: 0,
    perfect: 0,
  },
};

export function FeedbackSummaryPage() {
  const [summary, setSummary] = useState<FeedbackSummary>(emptySummary);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchFeedbackSummary()
      .then((result) => {
        setSummary(result);
        setError(null);
      })
      .catch((err) => {
        setError(flowApiErrorHint(err));
        trackEvent(AnalyticsEvent.OpsFeedbackSummaryFailed, { path: "/ops/feedback" });
      });
  }, []);

  const safeTotal = Math.max(summary.total, 1);
  const acceptPct = Math.round((summary.counts.accept / safeTotal) * 100);
  const almostPct = Math.round((summary.counts.almostRight / safeTotal) * 100);
  const missPct = Math.round((summary.counts.miss / safeTotal) * 100);

  return (
    <div className="card">
      <p className="step-label">Ops</p>
      <h1 className="hero-question">M10 feedback snapshot</h1>
      <p className="hero-sub">Quick sanity view from `/api/v1/feedback/summary` while rating logic is evolving.</p>

      <div className="flow-nav" style={{ marginTop: 14 }}>
        <div className="card" style={{ minWidth: 150 }}>
          <p className="ui-caption">Total ratings</p>
          <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 700 }}>{summary.total}</p>
        </div>
        <div className="card" style={{ minWidth: 150 }}>
          <p className="ui-caption">Rerolls</p>
          <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 700 }}>{summary.rerollsFromAlmostRight}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)" }}>Breakdown</p>
        <p style={{ margin: "8px 0 0", fontSize: 14 }}>
          Accept: <strong>{summary.counts.accept}</strong> ({acceptPct}%)
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>
          Almost right: <strong>{summary.counts.almostRight}</strong> ({almostPct}%)
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>
          Miss: <strong>{summary.counts.miss}</strong> ({missPct}%)
        </p>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)" }}>Post-accept ratings</p>
        <p style={{ margin: "8px 0 0", fontSize: 14 }}>
          Not this: <strong>{summary.postAcceptRatings.not_this}</strong>
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>
          It'll do: <strong>{summary.postAcceptRatings.itll_do}</strong>
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>
          Good pick: <strong>{summary.postAcceptRatings.good_pick}</strong>
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>
          This is it: <strong>{summary.postAcceptRatings.this_is_it}</strong>
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>
          Perfect: <strong>{summary.postAcceptRatings.perfect}</strong>
        </p>
      </div>

      {error ? (
        <p className="ui-caption" style={{ marginTop: 10, marginBottom: 0, color: "#ef4444" }}>
          {error}
        </p>
      ) : null}

      <div className="flow-nav" style={{ marginTop: 14 }}>
        <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
          Home
        </Link>
        <Link to="/release-spirit/result" className="btn-primary" style={{ textDecoration: "none" }}>
          Test death flow
        </Link>
      </div>
    </div>
  );
}
