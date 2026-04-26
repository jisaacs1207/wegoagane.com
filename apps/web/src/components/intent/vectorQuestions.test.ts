import { describe, expect, it } from "vitest";
import { balancedQuestionFor } from "./vectorQuestions";

describe("balancedQuestionFor", () => {
  it("hides auction-house answer when solo self found", () => {
    const q = balancedQuestionFor("profession", { soloSelfFound: true });
    expect(q.answers).not.toContain("Auction-house focused");
    expect(q.answers.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps auction-house answer when not SSF", () => {
    const q = balancedQuestionFor("profession");
    expect(q.answers).toContain("Auction-house focused");
  });
});
