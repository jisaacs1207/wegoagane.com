import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { planningDestinyFixture, type DestinyFixture } from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import { fetchDestiny, submitDestinyFeedback } from "../../lib/recommendClient";

export function PlanResultStep() {
  const [destiny, setDestiny] = useState<DestinyFixture>(planningDestinyFixture);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const intent = sessionStorage.getItem("plan.intent") ?? undefined;
    const freeform = sessionStorage.getItem("plan.freeform") ?? undefined;
    const existingSession = sessionStorage.getItem("plan.sessionId") ?? undefined;

    void fetchDestiny({
      entryPath: "draft_a_run",
      sessionId: existingSession,
      signals: { intent, freeform },
    })
      .then((result) => {
        setDestiny(result.output);
        setSessionId(result.sessionId);
        setDestinyId(result.destinyId);
        sessionStorage.setItem("plan.sessionId", result.sessionId);
        sessionStorage.setItem("plan.destinyId", result.destinyId);
      })
      .catch(() => {
        setDestiny(planningDestinyFixture);
      });
  }, []);

  async function rateAndMaybeReroll(choice: "accept" | "almost_right" | "miss") {
    if (!sessionId || !destinyId || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      if (choice === "almost_right") {
        const intent = sessionStorage.getItem("plan.intent") ?? undefined;
        const freeform = sessionStorage.getItem("plan.freeform") ?? undefined;
        const reroll = await fetchDestiny({
          entryPath: "draft_a_run",
          sessionId,
          signals: {
            intent,
            freeform,
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
        sessionStorage.setItem("plan.destinyId", reroll.destinyId);
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
      <DestinyCard data={destiny} />
      <p style={{ marginTop: 14, fontSize: 13, color: "var(--ts)" }}>
        Planning mode skips memorial chrome — only the next Destiny card is shown here.
      </p>
      <div className="card" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ts)" }}>
          M10 rating gate (starter): tell us if this is right, almost right, or a miss.
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
      </div>
      <div className="flow-nav" style={{ marginTop: 8 }}>
        <Link to="/" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
          Home
        </Link>
      </div>
    </div>
  );
}
