import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { planningDestinyFixture, type DestinyFixture } from "../../content/cardFixtures";
import { DestinyCard } from "../../components/cards/DestinyCard";
import {
  fetchDestiny,
  type PostAcceptRating,
  type RerollReason,
  submitDestinyFeedback,
} from "../../lib/recommendClient";

const postAcceptChoices: Array<{ value: PostAcceptRating; label: string }> = [
  { value: "not_this", label: "Not this" },
  { value: "itll_do", label: "It'll do" },
  { value: "good_pick", label: "Good pick" },
  { value: "this_is_it", label: "This is it" },
  { value: "perfect", label: "Perfect" },
];

const rerollReasons: Array<{ value: RerollReason; label: string }> = [
  { value: "wrong_class", label: "Wrong class" },
  { value: "wrong_energy", label: "Wrong energy" },
  { value: "wrong_goals", label: "Wrong goals" },
  { value: "almost_right", label: "Almost right" },
  { value: "just_curious", label: "Just curious" },
];

export function PlanResultStep() {
  const navigate = useNavigate();
  const [destiny, setDestiny] = useState<DestinyFixture>(planningDestinyFixture);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [destinyId, setDestinyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [note, setNote] = useState("");
  const [showRerollGate, setShowRerollGate] = useState(false);
  const [showPostAcceptRating, setShowPostAcceptRating] = useState(false);
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

  async function runRerollWithReason(reason: RerollReason) {
    if (!sessionId || !destinyId || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      const intent = sessionStorage.getItem("plan.intent") ?? undefined;
      const freeform = sessionStorage.getItem("plan.freeform") ?? undefined;

      if (reason === "wrong_goals") {
        await submitDestinyFeedback({
          sessionId,
          destinyId,
          choice: "miss",
          stage: "reroll_gate",
          rerollReason: reason,
          note: note.trim() || undefined,
        });
        navigate("/draft-a-run/intent");
        return;
      }

      const reroll = await fetchDestiny({
        entryPath: "draft_a_run",
        sessionId,
        signals: {
          intent,
          freeform,
          excludedClasses:
            reason === "wrong_class" || reason === "just_curious" ? [destiny.classId] : undefined,
          preferredClass: reason === "wrong_energy" || reason === "almost_right" ? destiny.classId : undefined,
        },
      });

      const choice = reason === "almost_right" ? "almost_right" : "miss";
      await submitDestinyFeedback({
        sessionId,
        destinyId,
        choice,
        stage: "reroll_gate",
        rerollReason: reason,
        note: note.trim() || undefined,
        rerollFromClassId: destiny.classId,
        rerollToClassId: reroll.output.classId,
      });

      if (reroll.output.classId === destiny.classId) {
        setActionMessage(`Logged ${reason.replace("_", " ")}. Refined within the same class.`);
      } else {
        setActionMessage(`Logged ${reason.replace("_", " ")}. Rerolled to a different class.`);
      }
      setDestiny(reroll.output);
      setDestinyId(reroll.destinyId);
      sessionStorage.setItem("plan.destinyId", reroll.destinyId);
      setNote("");
      setShowRerollGate(false);
    } catch {
      setActionMessage("Could not save this rating yet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function acceptAndOpenPostRating() {
    if (!sessionId || !destinyId || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      await submitDestinyFeedback({
        sessionId,
        destinyId,
        choice: "accept",
        stage: "reroll_gate",
        note: note.trim() || undefined,
      });
      setShowPostAcceptRating(true);
      setShowRerollGate(false);
      setActionMessage("Accepted. Optional final rating:");
      setNote("");
    } catch {
      setActionMessage("Could not save acceptance yet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPostAcceptRating(rating: PostAcceptRating) {
    if (!sessionId || !destinyId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitDestinyFeedback({
        sessionId,
        destinyId,
        choice: "accept",
        stage: "post_accept",
        postAcceptRating: rating,
      });
      setActionMessage("Final rating saved.");
      setShowPostAcceptRating(false);
    } catch {
      setActionMessage("Could not save final rating.");
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
          Before rerolling, tell us what felt off so the next result mutates in the right direction.
        </p>
        <label style={{ marginTop: 10, display: "block", fontSize: 12, color: "var(--ts)" }}>
          Optional note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={240}
            placeholder="What should change next time?"
            style={{
              marginTop: 6,
              width: "100%",
              minHeight: 72,
              resize: "vertical",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--card)",
              color: "var(--text)",
              padding: 10,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
        </label>
        <div className="flow-nav" style={{ marginTop: 12 }}>
          <button type="button" className="btn-primary" disabled={isSubmitting || !destinyId} onClick={() => void acceptAndOpenPostRating()}>
            Accept this fate
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={isSubmitting || !destinyId}
            onClick={() => setShowRerollGate((prev) => !prev)}
          >
            Reroll (rating gate)
          </button>
        </div>

        {showRerollGate ? (
          <div className="flow-nav" style={{ marginTop: 10 }}>
            {rerollReasons.map((reason) => (
              <button
                key={reason.value}
                type="button"
                className="btn-ghost"
                disabled={isSubmitting || !destinyId}
                onClick={() => void runRerollWithReason(reason.value)}
              >
                {reason.label}
              </button>
            ))}
          </div>
        ) : null}

        {showPostAcceptRating ? (
          <div style={{ marginTop: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ts)" }}>
              Post-accept rating (non-blocking):
            </p>
            <div className="flow-nav" style={{ marginTop: 8 }}>
              {postAcceptChoices.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  className="btn-ghost"
                  disabled={isSubmitting || !destinyId}
                  onClick={() => void submitPostAcceptRating(entry.value)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

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
