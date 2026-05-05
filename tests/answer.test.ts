import { describe, expect, it } from "vitest";
import { parseExtractionResult } from "../extensions/answer";

describe("parseExtractionResult", () => {
  it("parses plain JSON payload", () => {
    const input = JSON.stringify({
      questions: [{ question: "What database should we use?" }],
    });

    expect(parseExtractionResult(input)).toEqual({
      questions: [{ question: "What database should we use?" }],
    });
  });

  it("parses JSON wrapped in markdown fence", () => {
    const input = [
      "```json",
      '{"questions":[{"question":"Ship now?","context":"Release is blocked"}]}',
      "```",
    ].join("\n");

    expect(parseExtractionResult(input)).toEqual({
      questions: [{ question: "Ship now?", context: "Release is blocked" }],
    });
  });

  it("returns null for invalid JSON", () => {
    expect(parseExtractionResult("{questions: [oops]}")) .toBeNull();
  });

  it("returns null when questions is missing", () => {
    expect(parseExtractionResult('{"notQuestions":[]}')).toBeNull();
  });
});
