import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { DestinyCard } from "../components/cards/DestinyCard";
import { IdentityPortrait } from "../components/IdentityPortrait";
import {
  CLASS_ASSET_URLS,
  FACTION_ASSET_URLS,
  ITEM_SLOT_URL,
  RACE_ASSET_URLS,
  formatRaceLabel,
  inferFactionFromRace,
  inferRaceFromHeadline,
} from "../content/identityAssets";
import { debugClient, debugClientIgnored } from "../lib/clientDebug";
import {
  createShareRun,
  fetchBuildCommit,
  fetchBuildPlan,
  flowApiErrorHint,
  submitBuildCommitMemorial,
  type BuildCommitRecord,
} from "../lib/recommendClient";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";
import { SessionKeys } from "../lib/sessionKeys";
import { getProfessionIconUrl, getTalentIconUrl } from "../lib/talentIconMap";
import { buildSpecSummary } from "../lib/buildSpecSummary";

type EffectivePlan = {
  meta?: { publishTier?: string; classId?: string; archetypeKey?: string; rulesetPin?: string };
  talents?: { summary?: string; keyPicks?: Array<{ tier?: string; name?: string; rationale?: string }> };
  professions?: {
    primary?: string;
    secondary?: string;
    rationale?: string;
    secondarySkills?: { firstAid?: string; cooking?: string; fishing?: string };
  };
  stats?: { priority?: string[]; rationale?: string };
  race?: { suggestion?: string; rationale?: string; alternatives?: string[] };
  identity?: {
    raceSuggestion?: string;
    factionSuggestion?: "horde" | "alliance" | "neutral";
    genderLean?: "masculine" | "feminine" | "neutral";
    buildFantasy?: string;
    archetypeSummary?: string;
  };
  signature?: {
    tree?: { branch?: string; weight?: number };
    strengths?: string[];
    weaknesses?: string[];
    whyDistinct?: string;
    keyItems?: Array<{ name?: string; slot?: string; rationale?: string }>;
  };
  forks?: Array<{ title?: string; optionA?: string; optionB?: string; why?: string }>;
  warnings?: string[];
  aiRaw?: { generatorJson?: string; reviewerJson?: string };
};

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
  const [livePlan, setLivePlan] = useState<unknown | null>(null);
  const [copyState, setCopyState] = useState<"" | "url" | "md">("");
  const [shareBusy, setShareBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void fetchBuildCommit(slug)
      .then((res) => {
        setRecord(res);
        setError("");
      })
      .catch((e) => {
        debugClient("buildCommitFetch", e);
        setError(flowApiErrorHint(e));
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const destiny = useMemo(() => record?.payload?.destiny ?? null, [record?.payload]);
  const buildPlan = useMemo(
    () => (record?.payload?.plan ?? null) as EffectivePlan | null,
    [record?.payload],
  );
  const effectivePlan: EffectivePlan | null = buildPlan ?? (livePlan as EffectivePlan | null) ?? null;
  const planReady = Boolean(effectivePlan && (effectivePlan.talents || effectivePlan.professions || effectivePlan.signature));
  const raceFromPlan = effectivePlan?.identity?.raceSuggestion ?? effectivePlan?.race?.suggestion;
  const raceId = useMemo(() => {
    if (raceFromPlan) return inferRaceFromHeadline(raceFromPlan);
    return destiny ? inferRaceFromHeadline(destiny.headline) : "neutral";
  }, [destiny, raceFromPlan]);
  const factionId = useMemo(
    () => effectivePlan?.identity?.factionSuggestion ?? inferFactionFromRace(raceId),
    [effectivePlan?.identity?.factionSuggestion, raceId],
  );

  useEffect(() => {
    if (!record?.destinyId || planReady) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetchBuildPlan(record.destinyId);
        if (!cancelled && res.plan) setLivePlan(res.plan);
        if (!cancelled && res.status !== "ready") window.setTimeout(() => void poll(), 1800);
      } catch (err) {
        debugClientIgnored("build_commit.plan_poll", err);
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [record?.destinyId, planReady]);

  // Spec summary is derived from the plan + destiny class so the UI never goes empty,
  // even before the AI plan has finished generating.
  const spec = useMemo(() => {
    if (!destiny) return null;
    return buildSpecSummary({
      classId: destiny.classId,
      destinyHeadline: destiny.headline,
      talents: effectivePlan?.talents,
      signature: effectivePlan?.signature,
    });
  }, [destiny, effectivePlan?.talents, effectivePlan?.signature]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return record ? `/build/commit/${record.slug}` : "";
    return record ? `${window.location.origin}/build/commit/${record.slug}` : window.location.href;
  }, [record]);

  if (loading) {
    return <div className="card">Loading committed build…</div>;
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

  const headline = destiny.headline;
  const subline = effectivePlan?.identity?.buildFantasy?.trim() || destiny.subline;
  const raceLabel = raceFromPlan ?? formatRaceLabel(raceId);
  const tierLabel = effectivePlan?.meta?.publishTier ?? "draft";
  const rulesetPin = effectivePlan?.meta?.rulesetPin ?? "classic-era";

  const keyItems = effectivePlan?.signature?.keyItems ?? [];
  const keyPicks = (effectivePlan?.talents?.keyPicks ?? []).slice(0, 8);
  const statPriority = effectivePlan?.stats?.priority ?? [];

  async function copyText(value: string, kind: "url" | "md") {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(kind);
      window.setTimeout(() => setCopyState(""), 1600);
      trackEvent(AnalyticsEvent.BuildBookmarkCopied, { slug: record?.slug, kind });
    } catch (err) {
      debugClientIgnored("build_commit.clipboard", err);
    }
  }

  async function openShareImage() {
    if (!record || shareBusy) return;
    setShareBusy(true);
    try {
      const share = await createShareRun({ sessionId: record.sessionId, destinyId: record.destinyId });
      navigate(`/share/${share.runId}`);
    } catch (err) {
      debugClient("build_commit.share_create", err);
      setMessage(flowApiErrorHint(err));
    } finally {
      setShareBusy(false);
    }
  }

  async function onMemorialSubmit() {
    const activeRecord = record;
    if (!slug || !activeRecord || !zone.trim() || !cause.trim()) return;
    setBusy(true);
    setMessage("");
    trackEvent(AnalyticsEvent.MemorialCreateClicked, { slug });
    try {
      const parsedLevel = Number(level);
      await submitBuildCommitMemorial(slug, {
        sessionId: activeRecord.sessionId,
        level: level && Number.isFinite(parsedLevel) ? parsedLevel : undefined,
        zone: zone.trim(),
        cause: cause.trim(),
        killer: killer.trim() || undefined,
        note: note.trim() || undefined,
        rating: rating.trim() || undefined,
      });
      trackEvent(AnalyticsEvent.MemorialSubmitted, { slug });
      setMessage("Memorial captured. You can retool from this run.");
      sessionStorage.setItem(SessionKeys.plan.seedDestinyId, activeRecord.destinyId);
    } catch (e) {
      debugClient("memorialSubmit", e);
      setMessage(flowApiErrorHint(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="commit-page-shell">
      <div className="flow-crumbs" aria-label="Flow navigation">
        <span className="flow-crumb">
          <Link to="/">Home</Link>
        </span>
        <span className="flow-crumb">/</span>
        <span className="flow-crumb">Build artifact</span>
      </div>

      <div className="card commit-hero">
        <div className="commit-hero__title">
          <p className="step-label">Committed hardcore build</p>
          <h1 className="hero-question" style={{ marginBottom: 4 }}>
            {headline}
          </h1>
          <p className="hero-sub" style={{ marginTop: 0 }}>
            {subline}
          </p>
        </div>
        <div className="share-rail" role="group" aria-label="Share this build">
          <input
            className="share-rail__url"
            value={shareUrl}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            aria-label="Build URL"
          />
          <button
            type="button"
            className="btn-primary share-rail__btn"
            onClick={() => void copyText(shareUrl, "url")}
          >
            {copyState === "url" ? "Copied" : "Copy URL"}
          </button>
          <button
            type="button"
            className="btn-ghost share-rail__btn"
            onClick={() => void copyText(`[${headline}](${shareUrl})`, "md")}
          >
            {copyState === "md" ? "Copied" : "Copy as markdown"}
          </button>
          <button
            type="button"
            className="btn-ghost share-rail__btn"
            disabled={shareBusy}
            onClick={() => void openShareImage()}
          >
            {shareBusy ? "Opening…" : "Open share image"}
          </button>
        </div>
      </div>

      <div className="commit-page-grid">
        <div className="commit-page-grid__primary">
          <div style={{ marginTop: 0 }}>
            <DestinyCard data={destiny} compact />
          </div>

          <div className="card commit-action-bar-wrap" style={{ marginTop: 12 }}>
            <div className="commit-action-bar">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  sessionStorage.setItem(SessionKeys.plan.seedDestinyId, record.destinyId);
                  trackEvent(AnalyticsEvent.RetoolStarted, { slug: record.slug, destinyId: record.destinyId });
                  navigate("/draft-a-run/intent");
                }}
              >
                Retool from this
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void copyText(shareUrl, "url")}
              >
                {copyState === "url" ? "Copied" : "Copy URL"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={shareBusy}
                onClick={() => void openShareImage()}
              >
                Open share image
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ marginTop: 0, marginBottom: 6 }}>Mark character dead</p>
            <p className="ui-caption" style={{ marginTop: 0, marginBottom: 10, color: "var(--ts)" }}>
              Optional. Logs a memorial for this run; the build URL stays live either way.
            </p>
            <div className="chip-row">
              <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone" />
              <input value={cause} onChange={(e) => setCause(e.target.value)} placeholder="Cause of death" />
            </div>
            <details style={{ marginTop: 10 }}>
              <summary className="ui-caption" style={{ cursor: "pointer" }}>
                Add optional details
              </summary>
              <div className="chip-row" style={{ marginTop: 8 }}>
                <input
                  value={level}
                  onChange={(e) => setLevel(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                  placeholder="Level (optional)"
                />
                <input value={killer} onChange={(e) => setKiller(e.target.value)} placeholder="Killed by (optional)" />
                <input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="Run rating (optional)" />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Memorial note (optional)" />
              </div>
            </details>
            <div className="flow-nav" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !zone.trim() || !cause.trim()}
                onClick={() => void onMemorialSubmit()}
              >
                Submit memorial
              </button>
            </div>
            {message ? <p style={{ marginBottom: 0, marginTop: 10 }}>{message}</p> : null}
          </div>
        </div>

        <aside className="commit-page-grid__guidance">
          <div className="card identity-strip-card">
            <div className="identity-strip">
              <span
                className="identity-strip__class"
                style={{
                  background: `color-mix(in srgb, var(--${destiny.classId}, var(--gold)) 22%, rgba(0, 0, 0, 0.45))`,
                  borderColor: `color-mix(in srgb, var(--${destiny.classId}, var(--gold)) 50%, transparent)`,
                }}
              >
                <IdentityPortrait
                  src={CLASS_ASSET_URLS[destiny.classId]}
                  alt={`${destiny.classId} class`}
                  className="identity-strip__class-img"
                />
              </span>
              {raceFromPlan ? (
                <figure className="identity-strip__chip">
                  <IdentityPortrait
                    src={RACE_ASSET_URLS[raceId]}
                    alt={raceLabel}
                    className="identity-strip__chip-img"
                    title={raceLabel}
                  />
                  <figcaption>{raceLabel}</figcaption>
                </figure>
              ) : null}
              <figure className="identity-strip__chip">
                <IdentityPortrait
                  src={FACTION_ASSET_URLS[factionId]}
                  alt={`${factionId} banner`}
                  className="identity-strip__chip-img"
                  title={`Faction: ${factionId}`}
                />
                <figcaption style={{ textTransform: "capitalize" }}>{factionId}</figcaption>
              </figure>
            </div>
            <p className="ui-caption" style={{ marginTop: 10, marginBottom: 0, color: "var(--ts)" }}>
              ruleset: {rulesetPin} · publish tier: {tierLabel}
            </p>
          </div>

          {spec ? (
            <div className="card build-sheet">
              <p className="step-label">Why this build is distinct</p>
              <p className="hero-sub" style={{ marginTop: 4 }}>
                {spec.whyDistinct}
              </p>

              <div className="spec-tree-meter" aria-label="Talent tree distribution">
                <div className="spec-tree-meter__head">
                  <strong>{spec.treeBranch}</strong>
                  <span className="ui-caption" style={{ color: "var(--ts)" }}>
                    primary tree
                  </span>
                </div>
                <div className="spec-tree-meter__bars">
                  {spec.treeCounts.map((row) => {
                    const total = spec.treeCounts.reduce((a, b) => a + b.count, 0);
                    const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                    const isPrimary = row.branch === spec.treeBranch;
                    return (
                      <div
                        key={row.branch}
                        className={`spec-tree-meter__row${isPrimary ? " spec-tree-meter__row--primary" : ""}`}
                      >
                        <span className="spec-tree-meter__label">{row.branch}</span>
                        <div className="spec-tree-meter__track" aria-hidden>
                          <div className="spec-tree-meter__fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="spec-tree-meter__pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {keyPicks.length ? (
                <div className="build-sheet__section">
                  <p className="step-label">Key talents</p>
                  <ul className="build-sheet__talents">
                    {keyPicks.map((t, idx) => (
                      <li key={`${t.name ?? "pick"}-${idx}`} className="build-sheet__talent">
                        <img
                          src={getTalentIconUrl(t.name, destiny.classId)}
                          alt=""
                          aria-hidden
                          className="build-sheet__talent-icon"
                          loading="lazy"
                        />
                        <div className="build-sheet__talent-body">
                          <div className="build-sheet__talent-head">
                            <strong>{t.name ?? "Talent pick"}</strong>
                            {t.tier ? <span className="spec-pill">{t.tier}</span> : null}
                          </div>
                          {t.rationale ? <p className="ui-caption">{t.rationale}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {keyItems.length ? (
                <div className="build-sheet__section">
                  <p className="step-label">Key items / milestones</p>
                  <ul className="build-sheet__items">
                    {keyItems.slice(0, 6).map((item, idx) => (
                      <li key={`${item.name ?? "item"}-${idx}`} className="build-sheet__item">
                        <img
                          src={ITEM_SLOT_URL}
                          alt=""
                          aria-hidden
                          className="build-sheet__item-icon"
                          loading="lazy"
                        />
                        <div>
                          <div className="build-sheet__item-head">
                            <strong>{item.name ?? "Item"}</strong>
                            {item.slot ? <span className="spec-pill spec-pill--soft">{item.slot}</span> : null}
                          </div>
                          {item.rationale ? <p className="ui-caption">{item.rationale}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {statPriority.length ? (
                <div className="build-sheet__section">
                  <p className="step-label">Stat priority</p>
                  <div className="kv-list">
                    <div className="kv-list__row">
                      <span className="kv-list__key">Order</span>
                      <span className="kv-list__val">{statPriority.join(" → ")}</span>
                    </div>
                    {effectivePlan?.stats?.rationale ? (
                      <div className="kv-list__row">
                        <span className="kv-list__key">Why</span>
                        <span className="kv-list__val">{effectivePlan.stats.rationale}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {effectivePlan?.professions?.primary || effectivePlan?.professions?.secondary ? (
                <div className="build-sheet__section">
                  <p className="step-label">Professions</p>
                  <div className="build-sheet__profs">
                    {[effectivePlan?.professions?.primary, effectivePlan?.professions?.secondary]
                      .filter(Boolean)
                      .map((prof, idx) => {
                        const icon = getProfessionIconUrl(prof);
                        return (
                          <span className="build-sheet__prof" key={`${prof}-${idx}`}>
                            {icon ? (
                              <img src={icon} alt="" aria-hidden className="build-sheet__prof-icon" loading="lazy" />
                            ) : null}
                            <strong>{prof}</strong>
                          </span>
                        );
                      })}
                  </div>
                  {effectivePlan?.professions?.rationale ? (
                    <p className="ui-caption" style={{ marginTop: 6 }}>
                      {effectivePlan.professions.rationale}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="build-sheet__section">
                <p className="step-label">Strengths · Weaknesses</p>
                <div className="sw-grid">
                  <div>
                    <p className="ui-caption" style={{ color: "var(--ts)", margin: "0 0 4px" }}>
                      Strengths
                    </p>
                    <ul className="ui-body-sm" style={{ margin: 0, paddingLeft: 18 }}>
                      {spec.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="ui-caption" style={{ color: "var(--ts)", margin: "0 0 4px" }}>
                      Weaknesses
                    </p>
                    <ul className="ui-body-sm" style={{ margin: 0, paddingLeft: 18 }}>
                      {spec.weaknesses.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {(effectivePlan?.forks?.length ?? 0) > 0 ? (
                <details className="build-sheet__section" style={{ marginTop: 4 }}>
                  <summary style={{ cursor: "pointer" }} className="step-label">
                    Decision forks
                  </summary>
                  <ul className="ui-caption" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.5 }}>
                    {effectivePlan?.forks?.map((fork, idx) => (
                      <li key={`${fork.title ?? "fork"}-${idx}`} style={{ marginBottom: 6 }}>
                        <strong>{fork.title}</strong>
                        {fork.why ? <> — {fork.why}</> : null}
                        {fork.optionA || fork.optionB ? (
                          <div style={{ color: "var(--ts)" }}>
                            A) {fork.optionA} · B) {fork.optionB}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {effectivePlan?.aiRaw?.generatorJson ? (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: "pointer", color: "var(--gold-bright)" }}>
                    Raw AI output (full)
                  </summary>
                  <pre
                    className="ui-caption ui-caption--xs"
                    style={{ marginTop: 8, maxHeight: 260, overflow: "auto" }}
                  >
                    {effectivePlan.aiRaw.generatorJson}
                    {"\n\n-- reviewer --\n"}
                    {effectivePlan.aiRaw.reviewerJson ?? ""}
                  </pre>
                </details>
              ) : null}
            </div>
          ) : (
            <div className="card build-sheet build-sheet--loading">
              <p className="step-label">Building your build sheet…</p>
              <p className="hero-sub" style={{ marginTop: 4 }}>
                AI is forging key talents, items, and tradeoffs. This page updates automatically.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
