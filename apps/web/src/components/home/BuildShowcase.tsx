import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./build-showcase.css";
import { CLASS_ASSET_URLS } from "../../content/identityAssets";
import {
  fetchRecentBuilds,
  fetchTopBuilds,
  type BuildSummary,
} from "../../lib/recommendClient";
import type { ClassId } from "../../icons/types";
import { debugClientIgnored } from "../../lib/clientDebug";

export type BuildShowcaseProps = {
  /** Heading copy. */
  title: string;
  /** Optional subtitle below the title. */
  subtitle?: string;
  /** Which list to render. Determines the API endpoint we hit. */
  source: "recent" | "top";
  /** Limit on number of cards rendered. */
  limit?: number;
};

function asClassId(value: string | null | undefined): ClassId | null {
  if (!value) return null;
  return (value as ClassId) ?? null;
}

function ClassCrest({ classId }: { classId: ClassId | null }) {
  if (!classId) {
    return <span className="build-showcase-card__crest build-showcase-card__crest--empty" aria-hidden />;
  }
  const url = CLASS_ASSET_URLS[classId];
  if (!url) return <span className="build-showcase-card__crest build-showcase-card__crest--empty" aria-hidden />;
  return (
    <span
      className="build-showcase-card__crest"
      style={{
        background: `color-mix(in srgb, var(--${classId}, var(--gold)) 22%, rgba(0, 0, 0, 0.4))`,
        borderColor: `color-mix(in srgb, var(--${classId}, var(--gold)) 55%, transparent)`,
      }}
    >
      <img src={url} alt={`${classId} class crest`} loading="lazy" />
    </span>
  );
}

function BuildCard({ build }: { build: BuildSummary }) {
  const classId = asClassId(build.classId);
  const headline = build.commitName ?? build.headline ?? "Saved build";
  const subline = build.subline ?? "";
  return (
    <Link to={build.path} className="build-showcase-card" aria-label={`Open ${headline}`}>
      <ClassCrest classId={classId} />
      <div className="build-showcase-card__body">
        <span className="build-showcase-card__title">{headline}</span>
        {subline ? <span className="build-showcase-card__sub">{subline}</span> : null}
        <span className="build-showcase-card__meta">
          <span className="build-showcase-card__chip build-showcase-card__chip--up">
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path
                fill="currentColor"
                d="M2 11h4v10H2zM22 11.27c0-.93-.7-1.7-1.62-1.78l-5.16-.46.79-3.81c.06-.27.03-.55-.08-.8-.32-.7-1.08-1.05-1.78-.94l-1.49.24c-.62.1-1.13.55-1.34 1.15L9 11v10h10.04c.79 0 1.49-.55 1.66-1.32l1.27-7.08c.02-.11.03-.22.03-.33z"
              />
            </svg>
            {build.thumbsUp}
          </span>
          <span className="build-showcase-card__chip build-showcase-card__chip--down">
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22 13h-4V3h4zM2 12.73c0 .93.7 1.7 1.62 1.78l5.16.46-.79 3.81c-.06.27-.03.55.08.8.32.7 1.08 1.05 1.78.94l1.49-.24c.62-.1 1.13-.55 1.34-1.15L15 13V3H4.96c-.79 0-1.49.55-1.66 1.32l-1.27 7.08c-.02.11-.03.22-.03.33z"
              />
            </svg>
            {build.thumbsDown}
          </span>
          {build.archetypeKey ? (
            <span className="build-showcase-card__chip build-showcase-card__chip--archetype">
              {String(build.archetypeKey).replace(/_/g, " ")}
            </span>
          ) : null}
        </span>
      </div>
    </Link>
  );
}

function SkeletonRail({ count }: { count: number }) {
  return (
    <div className="build-showcase__rail" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="build-showcase-card build-showcase-card--skeleton" />
      ))}
    </div>
  );
}

export function BuildShowcase({ title, subtitle, source, limit = 5 }: BuildShowcaseProps) {
  const [builds, setBuilds] = useState<BuildSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const promise = source === "recent" ? fetchRecentBuilds(limit) : fetchTopBuilds({ limit, window: "30d" });
    void promise
      .then((res) => {
        if (cancelled) return;
        setBuilds(res.builds ?? []);
      })
      .catch((err) => {
        debugClientIgnored(`home.build_showcase.${source}`, err);
        if (cancelled) return;
        setBuilds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, limit]);

  if (loading) {
    return (
      <section className="build-showcase">
        <div className="build-showcase__head">
          <h2 className="build-showcase__title">{title}</h2>
          {subtitle ? <p className="build-showcase__sub">{subtitle}</p> : null}
        </div>
        <SkeletonRail count={Math.min(3, limit)} />
      </section>
    );
  }

  // Hidden empty state: if no builds qualify yet (e.g. fresh DB), don't render an empty rail.
  if (!builds || builds.length === 0) {
    return null;
  }

  return (
    <section className="build-showcase">
      <div className="build-showcase__head">
        <h2 className="build-showcase__title">{title}</h2>
        {subtitle ? <p className="build-showcase__sub">{subtitle}</p> : null}
      </div>
      <div className="build-showcase__rail">
        {builds.map((build) => (
          <BuildCard key={build.slug} build={build} />
        ))}
      </div>
    </section>
  );
}

export default BuildShowcase;
