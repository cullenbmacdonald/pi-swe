import { describe, expect, it } from "vitest";
import { extractLastAssistantText, formatNotification } from "../extensions/notify";

describe("extractLastAssistantText", () => {
  it("finds text content from the last assistant message", () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "first" }] },
      { role: "user", content: "ignored" },
      {
        role: "assistant",
        content: [
          { type: "toolCall", toolCallId: "1" },
          { type: "text", text: "second" },
        ],
      },
    ];

    expect(extractLastAssistantText(messages)).toBe("second");
  });

  it("returns null if there is no assistant text", () => {
    const messages = [{ role: "user", content: "hello" }];
    expect(extractLastAssistantText(messages)).toBeNull();
  });
});

describe("formatNotification", () => {
  it("uses default title/body when text is empty", () => {
    expect(formatNotification(null)).toEqual({
      title: "Ready for input",
      body: "",
    });
  });

  it("normalizes whitespace and keeps pi title", () => {
    const result = formatNotification("Hello\n\n   world");
    expect(result.title).toBe("π");
    expect(result.body).toBe("Hello world");
  });

  it("truncates long text to 200 chars with ellipsis", () => {
    const long = "x".repeat(250);
    const result = formatNotification(long);
    expect(result.body.length).toBe(200);
    expect(result.body.endsWith("…")).toBe(true);
  });
});
