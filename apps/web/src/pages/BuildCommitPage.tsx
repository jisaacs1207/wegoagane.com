import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { DestinyCard } from "../components/cards/DestinyCard";
import { IdentityPortrait } from "../components/IdentityPortrait";
import {
  CLASS_ASSET_URLS,
  FACTION_ASSET_URLS,
  ITEM_SLOT_URL,
  PROF_SLOT_URL,
  RACE_ASSET_URLS,
  WOW_ICON_PACK_BASE,
  formatRaceLabel,
  inferFactionFromRace,
  inferRaceFromHeadline,
} from "../content/identityAssets";
import { fetchBuildCommit, submitBuildCommitMemorial, type BuildCommitRecord } from "../lib/recommendClient";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";

export function BuildCommitPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<BuildCommitRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("");
  const [zone, setZone] = useState("");
  const [cause, setCause] = useState("");
  const [killer, setKiller] = useState("");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void fetchBuildCommit(slug)
      .then((res) => {
        setRecord(res);
        setError("");
      })
      .catch(() => setError("Committed build not found."))
      .finally(() => setLoading(false));
  }, [slug]);

  const destiny = useMemo(() => record?.payload?.destiny ?? null, [record?.payload]);
  const buildPlan = useMemo(() => record?.payload?.plan, [record?.payload]);
  const raceId = useMemo(() => (destiny ? inferRaceFromHeadline(destiny.headline) : "neutral"), [destiny]);
  const factionId = useMemo(() => inferFactionFromRace(raceId), [raceId]);

  if (loading) {
    return <div className="card">Loading committed build...</div>;
  }
  if (!record || !destiny) {
    return (
      <div className="card">
        <h1 className="hero-question">Missing committed build</h1>
        <p className="hero-sub">{error || "This commit URL may be invalid."}</p>
        <Link to="/" className="btn-primary">
          Return home
        </Link>
      </div>
    );
  }

  async function onMemorialSubmit() {
    const activeRecord = record;
    if (!slug || !activeRecord || !zone.trim() || !cause.trim()) return;
    setBusy(true);
    setMessage("");
    trackEvent(AnalyticsEvent.MemorialCreateClicked, { slug });
    try {
      await submitBuildCommitMemorial(slug, {
        sessionId: activeRecord.sessionId,
        level: level ? Number(level) : undefined,
        zone: zone.trim(),
        cause: cause.trim(),
        killer: killer.trim() || undefined,
        note: note.trim() || undefined,
        rating: rating.trim() || undefined,
      });
      trackEvent(AnalyticsEvent.MemorialSubmitted, { slug });
      setMessage("Memorial captured. You can retool from this run.");
      sessionStorage.setItem("plan.seedDestinyId", activeRecord.destinyId);
    } catch {
      setMessage("Could not save memorial yet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="commit-page-shell">
      <div className="card">
        <p className="step-label">Committed build</p>
        <h1 className="hero-question">{record.commitName || "Hardcore build artifact"}</h1>
        <p className="hero-sub">
          Immutable URL: <code>/build/commit/{record.slug}</code>
        </p>
      </div>
      <div className="commit-page-grid">
        <div className="commit-page-grid__primary">
      <div style={{ marginTop: 12 }}>
        <DestinyCard data={destiny} compact />
      </div>
      <div className="card commit-identity-panel" style={{ marginTop: 12 }}>
        <p className="step-label">Classic identity packet</p>
        <p className="hero-sub" style={{ marginTop: 0, marginBottom: 12 }}>
          Frozen artifact — class / race / faction art from <code>{WOW_ICON_PACK_BASE}</code>.
        </p>
        <div className="commit-identity-grid">
          <figure className="commit-identity-tile">
            <span className="commit-identity-tile__class-ring">
              <IdentityPortrait
                src={CLASS_ASSET_URLS[destiny.classId]}
                alt={`${destiny.classId} class`}
                className="commit-identity-tile__class-img"
              />
            </span>
            <figcaption>Class</figcaption>
          </figure>
          <figure className="commit-identity-tile">
            <IdentityPortrait
              src={RACE_ASSET_URLS[raceId]}
              alt={formatRaceLabel(raceId)}
              className="commit-identity-tile__img"
              title={formatRaceLabel(raceId)}
            />
            <figcaption>Race</figcaption>
          </figure>
          <figure className="commit-identity-tile">
            <IdentityPortrait
              src={FACTION_ASSET_URLS[factionId]}
              alt={`${factionId} banner`}
              className="commit-identity-tile__img"
              title={`Faction: ${factionId}`}
            />
            <figcaption>Faction</figcaption>
          </figure>
          <figure className="commit-identity-tile">
            <IdentityPortrait src={PROF_SLOT_URL} alt="Professions slot" className="commit-identity-tile__img" title="Professions" />
            <figcaption>Professions</figcaption>
          </figure>
          <figure className="commit-identity-tile">
            <IdentityPortrait src={ITEM_SLOT_URL} alt="Item milestones slot" className="commit-identity-tile__img" title="Item milestones" />
            <figcaption>Milestones</figcaption>
          </figure>
        </div>
        <p style={{ marginBottom: 0, marginTop: 10, fontSize: 13, color: "var(--ts)" }}>
          {buildPlan
            ? "Build sheet payload is attached and frozen for this URL."
            : "Build sheet detail expansion lands progressively as commit enrichment matures."}
        </p>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <p style={{ marginTop: 0 }}>Actions</p>
        <div className="flow-nav">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href).catch(() => null);
              trackEvent(AnalyticsEvent.BuildBookmarkCopied, { slug: record.slug });
            }}
          >
            Copy link
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              sessionStorage.setItem("plan.seedDestinyId", record.destinyId);
              trackEvent(AnalyticsEvent.RetoolStarted, { slug: record.slug, destinyId: record.destinyId });
              navigate("/draft-a-run/intent");
            }}
          >
            Retool from this run
          </button>
          <Link to={`/build/${record.destinyId}`} className="btn-ghost">
            Open technical sheet
          </Link>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <p style={{ marginTop: 0 }}>Mark character dead</p>
        <div className="chip-row">
          <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Level" />
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone" />
          <input value={cause} onChange={(e) => setCause(e.target.value)} placeholder="Cause of death" />
          <input value={killer} onChange={(e) => setKiller(e.target.value)} placeholder="Killed by (optional)" />
        </div>
        <div className="chip-row" style={{ marginTop: 8 }}>
          <input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="Run rating (optional)" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Memorial note (optional)" />
        </div>
        <div className="flow-nav" style={{ marginTop: 10 }}>
          <button type="button" className="btn-primary" disabled={busy || !zone.trim() || !cause.trim()} onClick={() => void onMemorialSubmit()}>
            Submit memorial
          </button>
        </div>
        {message ? <p style={{ marginBottom: 0 }}>{message}</p> : null}
      </div>
        </div>
        <aside className="commit-page-grid__guidance">
          <div className="card">
            <p className="step-label">Build guidance (preview)</p>
            <p className="hero-sub" style={{ marginTop: 0 }}>
              On desktop this column stays visible while you scroll. AI-enriched sections (profession recipes, spike levels,
              warnings, and playstyle cadence) will attach here from the committed payload as the coach pipeline fills in.
            </p>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--tp)", lineHeight: 1.45 }}>
              <li>Playstyle: {destiny.bullets.join(" · ")}</li>
              <li>Professions: tie-break from your journey chips + plan JSON when present.</li>
              <li>Power budget: inferred from survival / tempo tags until explicit curve ships server-side.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

