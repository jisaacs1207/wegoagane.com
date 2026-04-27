import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DestinyCard } from "../components/cards/DestinyCard";
import { IdentityPortrait } from "../components/IdentityPortrait";
import { TalentLevelPathView } from "../components/talents/TalentLevelPathView";
import { deriveLevelTalentSteps } from "../lib/deriveLevelTalentSteps";
import { RatingBar } from "../components/builds/RatingBar";
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
  commitJourneyBuild,
  createShareRun,
  fetchBuildCommit,
  fetchBuildPlan,
  flowApiErrorHint,
  type BuildCommitRecord,
} from "../lib/recommendClient";
import { AnalyticsEvent, trackEvent } from "../lib/analytics";
import { SessionKeys } from "../lib/sessionKeys";
import { getProfessionIconUrl } from "../lib/talentIconMap";
import { buildSpecSummary } from "../lib/buildSpecSummary";
import { isBuildPlanInProgressStatus, isBuildPlanTerminalStatus } from "../lib/buildPlanStatus";
import type { DestinyFixture } from "../content/cardFixtures";
import type { ClassId } from "../icons/types";
import type { BuildIntentSignals } from "../lib/buildIntentTypes";

type EffectivePlan = {
  meta?: { publishTier?: string; classId?: string; archetypeKey?: string; rulesetPin?: string };
  talents?: {
    summary?: string;
    keyPicks?: Array<{ tier?: string; name?: string; rationale?: string }>;
    treeAllocations?: Array<{ branch?: string; points?: number }>;
    path?: Array<{ level?: number; branch?: string; talent?: string; rank?: number; rationale?: string }>;
    buildIntentSummary?: string;
    levelByLevel?: Array<{
      level: number;
      branch: string;
      talent: string;
      rankAfter?: number;
      rationale?: string;
      alternatives?: Array<{ talent: string; branch?: string; tradeoff: string }>;
    }>;
  };
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

/** True when the stored plan has real fields (avoids `signature: {}` counting as "ready" and stalling the talent poll). */
function hasMeaningfulPlanPayload(p: EffectivePlan | null | undefined): boolean {
  if (!p) return false;
  const t = p.talents;
  if (t) {
    if (Array.isArray(t.levelByLevel) && t.levelByLevel.length > 0) return true;
    if (Array.isArray(t.path) && t.path.length > 0) return true;
    if (Array.isArray(t.keyPicks) && t.keyPicks.length > 0) return true;
    if (Array.isArray(t.treeAllocations) && t.treeAllocations.length > 0) return true;
    if (t.summary && t.summary.trim().length > 0) return true;
  }
  if (p.professions?.primary || p.professions?.secondary) return true;
  const s = p.signature;
  if (s) {
    if (s.whyDistinct && s.whyDistinct.trim().length > 0) return true;
    if (s.strengths && s.strengths.some((x) => (x ?? "").trim().length > 0)) return true;
    if (s.keyItems && s.keyItems.length > 0) return true;
  }
  if (p.stats?.priority && p.stats.priority.length > 0) return true;
  return false;
}

const BOOKMARK_STORAGE_KEY = "wega.bookmarks.v1";

function readBookmarkSet(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((s) => typeof s === "string"));
  } catch {
    // localStorage may be disabled or value corrupted; treat as empty.
  }
  return new Set();
}

function writeBookmarkSet(set: Set<string>): void {
  try {
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Best effort; silently ignore quota errors.
  }
}

export function BuildCommitPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isFresh = params.get("fresh") === "1";
  const flow = useMemo(() => {
    const p = params.get("flow");
    if (p === "death" || p === "lucky" || p === "plan") return p;
    try {
      const last = sessionStorage.getItem(SessionKeys.lastBuildFlow);
      if (last === "death" || last === "lucky" || last === "plan") return last;
    } catch {
      /* ignore */
    }
    return "plan";
  }, [params]);

  const [record, setRecord] = useState<BuildCommitRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [livePlan, setLivePlan] = useState<unknown | null>(null);
  const [buildPlanStatus, setBuildPlanStatus] = useState<string | null>(null);
  const [planPollError, setPlanPollError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"" | "url">("");
  const [shareBusy, setShareBusy] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Editable build name with debounced rename via journey/commit (idempotent server-side).
  const [nameInput, setNameInput] = useState("");
  const lastSavedName = useRef<string>("");
  const renameTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (renameTimer.current) {
        window.clearTimeout(renameTimer.current);
        renameTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void fetchBuildCommit(slug)
      .then((res) => {
        setRecord(res);
        const initialName = res.commitName ?? "";
        setNameInput(initialName);
        lastSavedName.current = initialName;
        setError("");
      })
      .catch((e) => {
        debugClient("buildCommitFetch", e);
        setError(flowApiErrorHint(e));
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setBookmarked(readBookmarkSet().has(slug));
  }, [slug]);

  // New commit page (slug from URL): clear stale plan poll state so a prior "ready" does not
  // leak into a different build before its fetch returns.
  useEffect(() => {
    if (!slug) return;
    setLivePlan(null);
    setBuildPlanStatus(null);
    setPlanPollError(null);
  }, [slug]);

  const destiny = useMemo(() => record?.payload?.destiny ?? null, [record?.payload]);
  const buildPlan = useMemo(
    () => (record?.payload?.plan ?? null) as EffectivePlan | null,
    [record?.payload],
  );
  const persistedPlanReady = useMemo(() => hasMeaningfulPlanPayload(buildPlan), [buildPlan]);
  const effectivePlan: EffectivePlan | null = useMemo(() => {
    if (hasMeaningfulPlanPayload(buildPlan)) return buildPlan;
    const live = livePlan as EffectivePlan | null;
    if (hasMeaningfulPlanPayload(live)) return live;
    return live ?? buildPlan;
  }, [buildPlan, livePlan]);
  /** AI build plan job finished (or we already have a saved sheet from the DB). */
  const buildPlanSettled = persistedPlanReady || isBuildPlanTerminalStatus(buildPlanStatus);
  const talentViewLoading = !persistedPlanReady && !buildPlanSettled;
  const levelSteps = useMemo(
    () => deriveLevelTalentSteps(effectivePlan?.talents?.levelByLevel, effectivePlan?.talents?.path),
    [effectivePlan?.talents?.levelByLevel, effectivePlan?.talents?.path],
  );
  const raceFromPlan = effectivePlan?.identity?.raceSuggestion ?? effectivePlan?.race?.suggestion;
  const raceId = useMemo(() => {
    if (raceFromPlan) return inferRaceFromHeadline(raceFromPlan);
    return destiny ? inferRaceFromHeadline(destiny.headline) : "neutral";
  }, [destiny, raceFromPlan]);
  const factionId = useMemo(
    () => effectivePlan?.identity?.factionSuggestion ?? inferFactionFromRace(raceId),
    [effectivePlan?.identity?.factionSuggestion, raceId],
  );

  // Poll the build plan endpoint until the AI run completes. Retries on network errors and
  // stops when the API reports `ready` or `failed` (no more infinite "finalising" spinners).
  useEffect(() => {
    if (!record?.destinyId || !slug) return;
    if (persistedPlanReady) {
      setBuildPlanStatus("ready");
      return;
    }
    let cancelled = false;
    let timeoutId: number | null = null;
    const schedule = (ms: number, fn: () => void) => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(fn, ms);
    };
    const run = async () => {
      try {
        const res = await fetchBuildPlan(record.destinyId!);
        if (cancelled) return;
        setPlanPollError(null);
        setBuildPlanStatus(res.status);
        if (res.plan) setLivePlan(res.plan);
        if (res.status === "ready") {
          void fetchBuildCommit(slug)
            .then((r) => {
              if (!cancelled) setRecord(r);
            })
            .catch((e) => debugClientIgnored("build_commit.plan_refetch", e));
          return;
        }
        if (res.status === "failed") {
          if (res.error) setPlanPollError(res.error);
          return;
        }
        if (!isBuildPlanInProgressStatus(res.status)) {
          setBuildPlanStatus("failed");
          setPlanPollError(`unexpected_build_status:${res.status}`);
          return;
        }
        schedule(1500, run);
      } catch (err) {
        if (cancelled) return;
        setPlanPollError(flowApiErrorHint(err as Error));
        schedule(2000, run);
      }
    };
    void run();
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [record?.destinyId, slug, persistedPlanReady]);

  const intentFromSession = useMemo((): BuildIntentSignals | null => {
    try {
      const key =
        flow === "death" ? SessionKeys.death.buildIntent : flow === "lucky" ? SessionKeys.lucky.buildIntent : SessionKeys.plan.buildIntent;
      const raw = sessionStorage.getItem(key);
      if (!raw?.trim()) return null;
      return JSON.parse(raw) as BuildIntentSignals;
    } catch {
      return null;
    }
  }, [flow]);

  const spec = useMemo(() => {
    if (!destiny) return null;
    return buildSpecSummary({
      classId: destiny.classId,
      destinyHeadline: destiny.headline,
      destinySubline: destiny.subline,
      destinyTierProse: destiny.tierProse,
      talents: effectivePlan?.talents,
      signature: effectivePlan?.signature,
    });
  }, [destiny, effectivePlan?.talents, effectivePlan?.signature]);

  const commitCardData = useMemo<DestinyFixture | null>(() => {
    if (!destiny) return null;
    const strengthBullets = (effectivePlan?.signature?.strengths ?? [])
      .map((s) => s?.trim())
      .filter(Boolean)
      .slice(0, 3) as string[];
    return {
      ...(destiny as DestinyFixture),
      subline: effectivePlan?.identity?.buildFantasy?.trim() || destiny.subline || "",
      raceSuggestion:
        effectivePlan?.identity?.raceSuggestion ?? effectivePlan?.race?.suggestion ?? destiny.raceSuggestion,
      factionSuggestion: effectivePlan?.identity?.factionSuggestion ?? destiny.factionSuggestion,
      tierProse:
        effectivePlan?.talents?.summary?.trim() ||
        effectivePlan?.signature?.whyDistinct?.trim() ||
        destiny.tierProse ||
        "",
      bullets: strengthBullets.length ? strengthBullets : destiny.bullets ?? [],
    };
  }, [destiny, effectivePlan]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return record ? `/build/commit/${record.slug}` : "";
    return record ? `${window.location.origin}/build/commit/${record.slug}` : window.location.href;
  }, [record]);

  const sessionId = record?.sessionId ?? "";

  // Rename / publish: writes happen on blur and after a typing debounce so taps stay snappy.
  // commitJourneyBuild is idempotent server-side; sending the same name twice is a no-op.
  const persistName = useCallback(
    async (name: string) => {
      if (!record?.destinyId || !record.sessionId) return;
      const trimmed = name.trim();
      if (trimmed === (lastSavedName.current ?? "")) return;
      try {
        await commitJourneyBuild({
          sessionId: record.sessionId,
          destinyId: record.destinyId,
          commitName: trimmed,
        });
        lastSavedName.current = trimmed;
        trackEvent(AnalyticsEvent.BuildRenamed, { slug: record.slug, length: trimmed.length });
      } catch (err) {
        debugClientIgnored("build_commit.rename", err);
      }
    },
    [record?.destinyId, record?.sessionId, record?.slug],
  );

  function onNameChange(value: string) {
    setNameInput(value);
    if (renameTimer.current) window.clearTimeout(renameTimer.current);
    renameTimer.current = window.setTimeout(() => {
      void persistName(value);
    }, 800);
  }

  async function copyText(value: string, kind: "url") {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(kind);
      window.setTimeout(() => setCopyState(""), 1600);
      trackEvent(AnalyticsEvent.BuildBookmarkCopied, { slug: record?.slug, kind });
    } catch (err) {
      debugClientIgnored("build_commit.clipboard", err);
    }
  }

  async function nativeShare() {
    if (!record) return;
    const title = nameInput.trim() || destiny?.headline || "Build";
    const text = destiny?.subline ?? "";
    trackEvent(AnalyticsEvent.BuildShareOpened, { slug: record.slug });
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator).share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        // User cancelled or share rejected; fall through to clipboard fallback.
        debugClientIgnored("build_commit.native_share", err);
      }
    }
    await copyText(shareUrl, "url");
  }

  function toggleBookmark() {
    if (!record) return;
    const set = readBookmarkSet();
    if (set.has(record.slug)) {
      set.delete(record.slug);
      setBookmarked(false);
    } else {
      set.add(record.slug);
      setBookmarked(true);
      trackEvent(AnalyticsEvent.BuildBookmarked, { slug: record.slug });
    }
    writeBookmarkSet(set);
  }

  async function openShareImage() {
    if (!record || shareBusy) return;
    setShareBusy(true);
    try {
      const share = await createShareRun({ sessionId: record.sessionId, destinyId: record.destinyId });
      navigate(`/share/${share.runId}`);
    } catch (err) {
      debugClient("build_commit.share_create", err);
    } finally {
      setShareBusy(false);
    }
  }

  function handleReroll() {
    if (!record) return;
    sessionStorage.setItem(SessionKeys.plan.seedDestinyId, record.destinyId);
    trackEvent(AnalyticsEvent.BuildRerolled, { slug: record.slug, fromFlow: flow });
    navigate("/draft-a-run/intent");
  }

  function handleRetool() {
    if (!record) return;
    sessionStorage.setItem(SessionKeys.plan.seedDestinyId, record.destinyId);
    trackEvent(AnalyticsEvent.RetoolStarted, { slug: record.slug, destinyId: record.destinyId });
    navigate("/draft-a-run/intent");
  }

  if (loading) {
    return (
      <div className="card commit-page-shell" style={{ padding: 22 }}>
        <p className="step-label">Build artifact</p>
        <h1 className="hero-question" style={{ marginBottom: 8 }}>
          Loading your build...
        </h1>
        <p className="hero-sub" style={{ marginBottom: 0 }}>
          Pulling the saved sheet and talents. Almost there.
        </p>
        <div className="forge-status-row" style={{ marginTop: 16 }} aria-hidden>
          <div className="forge-spinner" />
          <span className="ui-caption">Syncing</span>
        </div>
      </div>
    );
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
  const statPriority = effectivePlan?.stats?.priority ?? [];

  return (
    <div className="commit-page-shell">
      <div className="flow-crumbs" aria-label="Flow navigation">
        <span className="flow-crumb">
          <Link to="/">Home</Link>
        </span>
        <span className="flow-crumb">/</span>
        <span className="flow-crumb">Build artifact</span>
      </div>

      {isFresh && talentViewLoading ? (
        <p className="ui-caption" role="status" aria-live="polite" style={{ marginTop: 6 }}>
          AI is finalising your talents. This page updates as soon as the plan returns; the URL is
          already shareable.
        </p>
      ) : null}

      <div className="card commit-hero">
        <p className="step-label">Your saved build</p>
        <input
          className="commit-hero__name-input"
          value={nameInput}
          placeholder={headline}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={() => void persistName(nameInput)}
          aria-label="Build name"
          maxLength={80}
        />
        <p className="hero-sub" style={{ marginTop: 4 }}>
          {subline}
        </p>
        <div className="commit-hero__rating-row">
          {sessionId ? (
            <RatingBar
              slug={record.slug}
              sessionId={sessionId}
              initialThumbsUp={record.thumbsUp ?? 0}
              initialThumbsDown={record.thumbsDown ?? 0}
            />
          ) : (
            <p className="ui-caption" style={{ color: "var(--ts)", margin: 0 }}>
              Ratings need the browser session from generation; this link has no session id.
            </p>
          )}
        </div>
      </div>

      <div className="commit-page-grid">
        <div className="commit-page-grid__primary">
          {commitCardData ? (
            <div style={{ marginTop: 0 }}>
              <DestinyCard data={commitCardData} compact intentSignals={intentFromSession} />
            </div>
          ) : null}

          <div className="card" style={{ marginTop: 12, padding: "16px 18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              <p className="step-label" style={{ margin: 0 }}>
                Talent path
              </p>
              {effectivePlan?.talents?.summary ? (
                <span className="ui-caption" style={{ color: "var(--ts)", maxWidth: 460 }}>
                  {effectivePlan.talents.summary}
                </span>
              ) : null}
            </div>
            {buildPlanStatus === "failed" && planPollError ? (
              <p className="ui-caption" role="alert" style={{ color: "var(--gold-bright)", margin: "0 0 8px" }}>
                Build plan: {planPollError}
              </p>
            ) : null}
            {buildPlanStatus !== "failed" && !buildPlanSettled && planPollError ? (
              <p className="ui-caption" style={{ color: "var(--ts)", margin: "0 0 8px" }}>
                Reconnecting — {planPollError}
              </p>
            ) : null}
            <TalentLevelPathView
              classId={destiny.classId as ClassId}
              steps={levelSteps}
              buildIntentSummary={effectivePlan?.talents?.buildIntentSummary}
              summary={effectivePlan?.talents?.summary}
              loading={talentViewLoading}
            />
          </div>

          <div className="card commit-action-bar-wrap" style={{ marginTop: 12 }}>
            <div className="commit-action-bar">
              <button type="button" className="btn-primary" onClick={handleRetool}>
                Retool from this build
              </button>
              <details className="commit-reroll" style={{ marginLeft: "auto" }}>
                <summary className="btn-ghost share-rail__btn share-rail__summary" style={{ minHeight: 38 }}>
                  Reroll with note
                </summary>
                <div className="share-rail__details-body" style={{ minWidth: 260 }}>
                  <p className="ui-caption" style={{ marginTop: 0 }}>
                    Carry this class + faction as a soft hint into a fresh detailed setup.
                  </p>
                  <button type="button" className="btn-primary share-rail__btn" onClick={handleReroll}>
                    Open detailed setup
                  </button>
                </div>
              </details>
              <div className="commit-action-bar__tools">
                <button
                  type="button"
                  className="commit-icon-btn"
                  onClick={() => void copyText(shareUrl, "url")}
                  title="Copy build URL"
                  aria-label="Copy build URL"
                >
                  <span aria-hidden>⎘</span>
                </button>
                <button
                  type="button"
                  className="commit-icon-btn"
                  disabled={shareBusy}
                  onClick={() => void openShareImage()}
                  title="Open share image"
                  aria-label="Open share image"
                >
                  <span aria-hidden>↗</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="commit-page-grid__guidance">
          <div className="card commit-side-utility">
            <p className="step-label" style={{ margin: "0 0 6px" }}>
              Link &amp; share
            </p>
            <div className="share-rail share-rail--compact" role="group" aria-label="Share this build">
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
                className="commit-icon-btn"
                title={copyState === "url" ? "Copied!" : "Copy build URL"}
                aria-label="Copy build URL"
                onClick={() => void copyText(shareUrl, "url")}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className={`commit-icon-btn ${bookmarked ? "commit-icon-btn--on" : ""}`}
                title={bookmarked ? "Bookmarked" : "Bookmark this build"}
                aria-label="Bookmark this build"
                aria-pressed={bookmarked}
                onClick={toggleBookmark}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill={bookmarked ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="commit-icon-btn"
                title="Share"
                aria-label="Share this build"
                onClick={() => void nativeShare()}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92S21 20.61 21 19s-1.34-2.92-3-2.92z"
                  />
                </svg>
              </button>
            </div>
            <p className="ui-caption" style={{ margin: "10px 0 0", color: "var(--ts)" }}>
              <span>
                {rulesetPin}
                <span className="commit-side-meta__sep" aria-hidden>
                  {" "}
                  ·{" "}
                </span>
                {tierLabel} tier
              </span>
            </p>
            <details className="commit-rating-help commit-rating-help--side" style={{ marginTop: 8 }}>
              <summary className="ui-caption commit-rating-help__summary" title="Help">
                What is this?
              </summary>
              <p className="ui-caption" style={{ margin: "6px 0 0", color: "var(--ts)", lineHeight: 1.45 }}>
                Thumbs help other players find solid builds. One vote per browser session; you can
                change your mind. The first vote can publish a draft to the public home rails.
              </p>
            </details>
          </div>

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
          </div>

          {buildPlanSettled && spec ? (
            <div className="card build-sheet">
              <p className="step-label">Talent focus</p>
              <p className="ui-caption" style={{ margin: "2px 0 8px", color: "var(--ts)" }}>
                Primary: <strong style={{ color: "var(--tp)" }}>{spec.treeBranch}</strong>
                {spec.treeWeight > 0
                  ? ` — ${(spec.treeWeight * 100) | 0}% of stated weight on this tree${
                      spec.treeCounts.some((c) => c.count > 0) ? " (from allocations below)" : ""
                    }`
                  : null}
              </p>
              {spec.treeCounts.some((c) => c.count > 0) ? (
                <div className="build-spec-bars" aria-label="Point distribution by tree">
                  {spec.treeCounts.map((row) => {
                    const maxC = Math.max(1, ...spec.treeCounts.map((t) => t.count));
                    const w = (row.count / maxC) * 100;
                    return (
                      <div key={row.branch} className="build-spec-bars__row">
                        <span className="build-spec-bars__name">{row.branch}</span>
                        <div className="build-spec-bars__track">
                          <div
                            className={`build-spec-bars__fill${
                              row.branch === spec.treeBranch ? " build-spec-bars__fill--primary" : ""
                            }`}
                            style={{ width: `${w}%` }}
                          />
                        </div>
                        <span className="build-spec-bars__n">{row.count > 0 ? row.count : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <p className="step-label" style={{ marginTop: 12 }}>
                Why this build is distinct
              </p>
              <p className="hero-sub" style={{ marginTop: 4 }}>
                {spec.whyDistinct}
              </p>

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
                      <span className="kv-list__val">{statPriority.join(" -> ")}</span>
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
                              <img
                                src={icon}
                                alt=""
                                aria-hidden
                                className="build-sheet__prof-icon"
                                loading="lazy"
                              />
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
                        {fork.why ? <> - {fork.why}</> : null}
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
            </div>
          ) : (
            <div className="card build-sheet build-sheet--loading" aria-live="polite">
              <p className="step-label">Build sheet</p>
              <p className="hero-sub" style={{ marginTop: 4, marginBottom: 0 }}>
                Loading talents, profs, and tradeoffs; this block updates as the plan returns.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
