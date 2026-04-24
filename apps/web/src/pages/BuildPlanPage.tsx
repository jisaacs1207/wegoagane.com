import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  createShareRun,
  fetchBuildPlan,
  fetchMemorial,
  fetchNameCandidates,
  type BuildPlanResponse,
  type NameCandidateRow,
} from "../lib/recommendClient";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";

type PlanV1 = {
  v: 1;
  meta?: { publishTier?: string; classId?: string; archetypeKey?: string };
  viabilityNotes?: string[];
  warnings?: string[];
  talents?: { summary?: string; keyPicks?: Array<{ tier: string; name: string; rationale: string }> };
  professions?: {
    primary: string;
    secondary: string;
    rationale: string;
    secondarySkills?: { firstAid?: string; cooking?: string; fishing?: string };
  };
  stats?: { priority: string[]; rationale: string };
  race?: { suggestion: string; rationale: string; alternatives?: string[] };
  namesByLane?: Record<string, string[]>;
  forks?: Array<{ title: string; optionA: string; optionB: string; why: string }>;
};

function isPlanV1(p: unknown): p is PlanV1 {
  return typeof p === "object" && p !== null && (p as PlanV1).v === 1;
}

export function BuildPlanPage() {
  const { destinyId } = useParams();
  const [status, setStatus] = useState<string>("loading");
  const [plan, setPlan] = useState<PlanV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishTier, setPublishTier] = useState<string>("");
  const [names, setNames] = useState<NameCandidateRow[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [bookmarkCopied, setBookmarkCopied] = useState(false);
  const [deathLevel, setDeathLevel] = useState<number | "">("");
  const [deathZone, setDeathZone] = useState("");
  const [deathCause, setDeathCause] = useState("");
  const [deathName, setDeathName] = useState("");
  const [memorialStatus, setMemorialStatus] = useState("");

  useEffect(() => {
    if (!destinyId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res: BuildPlanResponse = await fetchBuildPlan(destinyId);
        if (cancelled) return;
        setStatus(res.status);
        setPublishTier(res.publishTier);
        setError(res.error);
        setSessionId(res.sessionId);
        if (res.plan && isPlanV1(res.plan)) setPlan(res.plan);
        else setPlan(null);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setError("Could not load build sheet.");
        }
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [destinyId]);

  useEffect(() => {
    void fetchNameCandidates({ limit: 24 })
      .then((r) => setNames(r.names))
      .catch(() => setNames([]));
  }, []);

  if (!destinyId) {
    return (
      <div className="card">
        <p>Missing destiny id.</p>
        <Link to="/">Home</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <p className="step-label">Hardcore build sheet</p>
        <h1 className="hero-question">Your route details</h1>
        <p className="hero-sub" style={{ marginTop: 0 }}>
          Status: <strong>{status}</strong>
          {publishTier ? (
            <>
              {" "}
              · tier: <strong>{publishTier}</strong>
            </>
          ) : null}
        </p>
        {error ? (
          <p style={{ color: "var(--danger, #c44)", marginTop: 8 }}>{error}</p>
        ) : null}
        {status !== "ready" && !error ? (
          <p className="hero-sub" style={{ marginTop: 8 }}>
            Forging your build plan… this page updates automatically.
          </p>
        ) : null}
        <div className="flow-nav" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setBookmarkCopied(true);
                trackEvent(AnalyticsEvent.BuildBookmarkCopied, { destinyId });
                window.setTimeout(() => setBookmarkCopied(false), 1600);
              } catch {
                setBookmarkCopied(false);
              }
            }}
          >
            {bookmarkCopied ? "Bookmark copied" : "Copy bookmark URL"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              sessionStorage.setItem("plan.seedDestinyId", destinyId);
              trackEvent(AnalyticsEvent.BuildRetoolClicked, { destinyId, source: "build_sheet" });
              window.location.assign("/draft-a-run/journey");
            }}
          >
            Retool from this run
          </button>
          <Link to="/" className="btn-ghost">
            Home
          </Link>
        </div>
      </div>

      {plan ? (
        <div className="build-accordion card" style={{ marginTop: 14 }}>
          {plan.warnings?.length ? (
            <div style={{ marginBottom: 12, fontSize: 13, color: "var(--ts)" }}>
              <strong>Warnings</strong>
              <ul>
                {plan.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <details open>
            <summary>Talents</summary>
            {plan.talents?.summary ? <p style={{ fontSize: 13 }}>{plan.talents.summary}</p> : null}
            <ul style={{ fontSize: 13, lineHeight: 1.5 }}>
              {(plan.talents?.keyPicks ?? []).map((t) => (
                <li key={`${t.tier}-${t.name}`}>
                  <strong>{t.name}</strong> ({t.tier}): {t.rationale}
                </li>
              ))}
            </ul>
          </details>

          <details>
            <summary>Professions</summary>
            {plan.professions ? (
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <p>
                  <strong>{plan.professions.primary}</strong> + <strong>{plan.professions.secondary}</strong>
                </p>
                <p>{plan.professions.rationale}</p>
                {plan.professions.secondarySkills ? (
                  <ul>
                    <li>First Aid: {plan.professions.secondarySkills.firstAid}</li>
                    <li>Cooking: {plan.professions.secondarySkills.cooking}</li>
                    <li>Fishing: {plan.professions.secondarySkills.fishing}</li>
                  </ul>
                ) : null}
              </div>
            ) : null}
          </details>

          <details>
            <summary>Stats</summary>
            {plan.stats ? (
              <div style={{ fontSize: 13 }}>
                <p>Priority: {plan.stats.priority.join(" → ")}</p>
                <p>{plan.stats.rationale}</p>
              </div>
            ) : null}
          </details>

          <details>
            <summary>Race</summary>
            {plan.race ? (
              <div style={{ fontSize: 13 }}>
                <p>
                  <strong>{plan.race.suggestion}</strong>
                </p>
                <p>{plan.race.rationale}</p>
              </div>
            ) : null}
          </details>

          <details>
            <summary>Name ideas</summary>
            {plan.namesByLane ? (
              <div style={{ fontSize: 13 }}>
                {Object.entries(plan.namesByLane).map(([lane, arr]) =>
                  (arr ?? []).length ? (
                    <div key={lane} style={{ marginBottom: 10 }}>
                      <strong>{lane}</strong>
                      <div className="chip-row" style={{ marginTop: 6 }}>
                        {arr.map((n) => (
                          <span key={n} className="chip-btn" style={{ cursor: "default" }}>
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            ) : null}
            {names.length ? (
              <div style={{ marginTop: 12 }}>
                <p className="step-label" style={{ marginBottom: 6 }}>
                  Curated pool (examples)
                </p>
                <div className="chip-row">
                  {names.map((n) => (
                    <span key={`${n.lane}-${n.name}`} className="chip-btn" style={{ cursor: "default" }} title={n.lane}>
                      {n.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </details>

          <details>
            <summary>Choice forks</summary>
            <ul style={{ fontSize: 13, lineHeight: 1.55 }}>
              {(plan.forks ?? []).map((f) => (
                <li key={f.title}>
                  <strong>{f.title}</strong>: {f.why}
                  <div style={{ marginTop: 4, color: "var(--ts)" }}>
                    A) {f.optionA} · B) {f.optionB}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : status === "ready" ? (
        <p className="hero-sub">No plan payload yet.</p>
      ) : null}
      {status === "ready" ? (
        <div className="card" style={{ marginTop: 14 }}>
          <p className="step-label">If this run dies</p>
          <h2 style={{ margin: "6px 0 8px", fontSize: 20 }}>Log death + create memorial</h2>
          <p className="hero-sub" style={{ marginTop: 0 }}>
            Build details stay read-only here for trust. You can log death info and create a share memorial.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={deathName}
              onChange={(e) => setDeathName(e.target.value)}
              placeholder="Character name"
              className="chip-select"
            />
            <input
              value={deathLevel}
              onChange={(e) => setDeathLevel(e.target.value ? Number(e.target.value) : "")}
              placeholder="Level"
              className="chip-select"
              type="number"
              min={1}
              max={60}
            />
            <input
              value={deathZone}
              onChange={(e) => setDeathZone(e.target.value)}
              placeholder="Where did you die?"
              className="chip-select"
            />
            <input
              value={deathCause}
              onChange={(e) => setDeathCause(e.target.value)}
              placeholder="What killed you?"
              className="chip-select"
            />
          </div>
          <div className="flow-nav" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn-primary"
              disabled={!sessionId || !deathZone || !deathCause}
              onClick={async () => {
                try {
                  setMemorialStatus("Creating memorial...");
                  trackEvent(AnalyticsEvent.MemorialCreateClicked, { destinyId, sessionId, hasLevel: deathLevel !== "" });
                  await fetchMemorial({
                    sessionId,
                    zone: deathZone,
                    cause: deathCause,
                    characterName: deathName || undefined,
                    level: deathLevel === "" ? undefined : deathLevel,
                  });
                  await createShareRun({ sessionId, destinyId });
                  setMemorialStatus("Memorial created. You can open Share from result flow.");
                  trackEvent(AnalyticsEvent.MemorialCreateResult, { destinyId, status: "success" });
                } catch {
                  setMemorialStatus("Could not create memorial yet.");
                  trackEvent(AnalyticsEvent.MemorialCreateResult, { destinyId, status: "failed" });
                }
              }}
            >
              Create memorial
            </button>
          </div>
          {memorialStatus ? <p className="hero-sub" style={{ marginTop: 10 }}>{memorialStatus}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
