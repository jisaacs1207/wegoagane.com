import type { ClassId } from "../icons/types";
import type { DestinyFixture } from "../content/cardFixtures";

type EntryPath = "release_spirit" | "draft_a_run" | "lucky_roll";

type RecommendRequest = {
  entryPath: EntryPath;
  signals: {
    mood?: string;
    nextSignal?: string;
    intent?: string;
    freeform?: string;
    excludedClasses?: ClassId[];
  };
};

type RecommendResponse = {
  output: {
    headline: string;
    subline: string;
    classId: ClassId;
    tierProse: string;
    bullets: string[];
  };
};

export async function fetchDestiny(input: RecommendRequest): Promise<DestinyFixture> {
  const response = await fetch("/api/v1/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`recommend_failed:${response.status}`);
  }

  const data = (await response.json()) as RecommendResponse;
  return {
    headline: data.output.headline,
    subline: data.output.subline,
    classId: data.output.classId,
    tierProse: data.output.tierProse,
    bullets: data.output.bullets,
  };
}
