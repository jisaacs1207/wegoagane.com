import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  destinyFixture,
  memorialFixture,
  type DestinyFixture,
  type MemorialFixture,
} from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import { MemorialCard } from "../../components/cards/MemorialCard";
import { fetchDestiny, fetchMemorial, submitDestinyFeedback } from "../../lib/recommendClient";

export function DeathResultStep() {
  const [destiny, setDestiny] = useState<DestinyFixture>(destinyFixture);
  const [memorial, setMemorial] = useState<MemorialFixture>(memorialFixture);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const mood = sessionStorage.getItem("death.mood") ?? undefined;
    const nextSignal = sessionStorage.getItem("death.nextSignal") ?? undefined;
    const existingSession = sessionStorage.getItem("death.sessionId");
    const sessionId = existingSession ?? crypto.randomUUID();
    if (!existingSession) {
      sessionStorage.setItem("death.sessionId", sessionId);
    }

    void fetchDestiny({
      entryPath: "release_spirit",
      sessionId,
      signals: { mood, nextSignal },
    })
      .then((result) => {
        setDestiny(result.output);
        setSessionId(result.sessionId);
        setDestinyId(result.destinyId);
        sessionStorage.setItem("death.sessionId", result.sessionId);
        sessionStorage.setItem("death.destinyId", result.destinyId);
      })
      .catch(() => setDestiny(destinyFixture));

    void fetchMemorial({
      sessionId,
      zone: "Unknown Zone",
      cause: "Unknown Cause",
      mood,
      nextSignal,
      faction: "horde",
      characterName: memorialFixture.characterName,
      level: memorialFixture.level ?? undefined,
    })
      .then(setMemorial)
      .catch(() => setMemorial(memorialFixture));
  }, []);

  async function rateAndMaybeReroll(choice: "accept" | "almost_right" | "miss") {
    if (!sessionId || !destinyId || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      if (choice === "almost_right") {
        const mood = sessionStorage.getItem("death.mood") ?? undefined;
        const nextSignal = sessionStorage.getItem("death.nextSignal") ?? undefined;
        const reroll = await fetchDestiny({
          entryPath: "release_spirit",
          sessionId,
          signals: {
            mood,
            nextSignal,
            excludedClasses: [destiny.classId],
          },
        });
        await submitDestinyFeedback({
          sessionId,
          destinyId,
          choice,
          rerollFromClassId: destiny.classId,
          rerollToClassId: reroll.output.classId,
        });
        setDestiny(reroll.output);
        setDestinyId(reroll.destinyId);
        sessionStorage.setItem("death.destinyId", reroll.destinyId);
        setActionMessage("Logged as almost right. Rerolled to a different class.");
        return;
      }

      await submitDestinyFeedback({ sessionId, destinyId, choice });
      setActionMessage(choice === "accept" ? "Saved: accepted." : "Saved: miss.");
    } catch {
      setActionMessage("Could not save this rating yet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <MemorialCard data={memorial} />
      <div style={{ marginTop: 14 }}>
        <DestinyCard data={destiny} />
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)", lineHeight: 1.45 }}>
          Memorial and next destiny can export as one image for sharing. See a{" "}
          <strong>narrow side-by-side layout</strong> on{" "}
          <Link to="/design/cards">card shells</Link> — polish, imagery, and real copy ship in later milestones.
        </p>
        <div className="flow-nav" style={{ marginTop: 12 }}>
          <button type="button" className="btn-primary" disabled={isSubmitting || !destinyId} onClick={() => void rateAndMaybeReroll("accept")}>
            Accept this fate
          </button>
          <button type="button" className="btn-ghost" disabled={isSubmitting || !destinyId} onClick={() => void rateAndMaybeReroll("almost_right")}>
            Almost right (reroll class)
          </button>
          <button type="button" className="btn-ghost" disabled={isSubmitting || !destinyId} onClick={() => void rateAndMaybeReroll("miss")}>
            Miss
          </button>
        </div>
        {actionMessage ? (
          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "var(--ts)" }}>{actionMessage}</p>
        ) : null}
        <div className="flow-nav" style={{ marginTop: 18 }}>
          <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
