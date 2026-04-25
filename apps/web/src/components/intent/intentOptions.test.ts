import { describe, expect, it } from "vitest";
import { toggleList } from "./intentOptions";

describe("toggleList", () => {
  it("adds id when absent and under max", () => {
    expect(toggleList(undefined, "a", 3)).toEqual(["a"]);
    expect(toggleList(["a"], "b", 3)).toEqual(["a", "b"]);
  });

  it("removes id when present", () => {
    expect(toggleList(["a", "b"], "a", 3)).toEqual(["b"]);
  });

  it("at max length replaces oldest when adding new id", () => {
    expect(toggleList(["a", "b", "c"], "d", 3)).toEqual(["b", "c", "d"]);
  });
});
