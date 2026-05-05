/**
 * Native desktop notification when the agent finishes a turn.
 *
 * Uses OSC 777 — no external dependencies, no daemon, no permissions prompt.
 *
 * Supported terminals: Ghostty, iTerm2, WezTerm, rxvt-unicode.
 * Not supported:       Kitty (OSC 99), Terminal.app, Alacritty, Windows Terminal.
 *
 * Ported from mitsuhiko/agent-stuff (notify.ts). Credit: Armin Ronacher.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Markdown, type MarkdownTheme } from "@mariozechner/pi-tui";

/** OSC 777: ESC ] 777 ; notify ; title ; body BEL */
const notify = (title: string, body: string): void => {
  process.stdout.write(`\x1b]777;notify;${title};${body}\x07`);
};

const isTextPart = (part: unknown): part is { type: "text"; text: string } =>
  Boolean(
    part &&
      typeof part === "object" &&
      "type" in part &&
      (part as { type: unknown }).type === "text" &&
      "text" in part,
  );

export const extractLastAssistantText = (
  messages: Array<{ role?: string; content?: unknown }>,
): string | null => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;

    const content = message.content;
    if (typeof content === "string") {
      return content.trim() || null;
    }

    if (Array.isArray(content)) {
      const text = content
        .filter(isTextPart)
        .map((part) => part.text)
        .join("\n")
        .trim();
      return text || null;
    }

    return null;
  }

  return null;
};

// Strip all ANSI/markup so the notification shows plain text.
const plainMarkdownTheme: MarkdownTheme = {
  heading: (text) => text,
  link: (text) => text,
  linkUrl: () => "",
  code: (text) => text,
  codeBlock: (text) => text,
  codeBlockBorder: () => "",
  quote: (text) => text,
  quoteBorder: () => "",
  hr: () => "",
  listBullet: () => "",
  bold: (text) => text,
  italic: (text) => text,
  strikethrough: (text) => text,
  underline: (text) => text,
};

export const simpleMarkdown = (text: string, width = 80): string => {
  const markdown = new Markdown(text, 0, 0, plainMarkdownTheme);
  return markdown.render(width).join("\n");
};

export const formatNotification = (
  text: string | null,
): { title: string; body: string } => {
  const simplified = text ? simpleMarkdown(text) : "";
  const normalized = simplified.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return { title: "Ready for input", body: "" };
  }

  const maxBody = 200;
  const body =
    normalized.length > maxBody
      ? `${normalized.slice(0, maxBody - 1)}…`
      : normalized;
  return { title: "π", body };
};

const FOCUS_REPORTING_ENABLE = "\x1b[?1004h";
const FOCUS_REPORTING_DISABLE = "\x1b[?1004l";
const FOCUS_IN = "\x1b[I";
const FOCUS_OUT = "\x1b[O";

export default function (pi: ExtensionAPI) {
  // Terminal focus reporting fallback behavior:
  // - If focus events are supported, only notify when unfocused.
  // - If not supported, preserve old behavior (always notify on agent_end).
  let focusEventsSupported = false;
  let terminalFocused = true;
  let stopListening: (() => void) | undefined;

  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    focusEventsSupported = false;
    terminalFocused = true;

    process.stdout.write(FOCUS_REPORTING_ENABLE);

    stopListening?.();
    stopListening = ctx.ui.onTerminalInput((data) => {
      const sawFocusIn = data.includes(FOCUS_IN);
      const sawFocusOut = data.includes(FOCUS_OUT);
      if (!sawFocusIn && !sawFocusOut) return undefined;

      focusEventsSupported = true;
      if (sawFocusIn) terminalFocused = true;
      if (sawFocusOut) terminalFocused = false;
      return undefined;
    });
  });

  pi.on("session_shutdown", async () => {
    stopListening?.();
    stopListening = undefined;
    process.stdout.write(FOCUS_REPORTING_DISABLE);
  });

  pi.on("agent_end", async (event, ctx) => {
    if (!ctx.hasUI) return;

    const shouldNotify = !focusEventsSupported || !terminalFocused;
    if (!shouldNotify) return;

    const lastText = extractLastAssistantText(event.messages ?? []);
    const { title, body } = formatNotification(lastText);
    notify(title, body);
  });
}
