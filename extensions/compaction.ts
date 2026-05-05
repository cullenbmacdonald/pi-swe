import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { generateSummary } from "@mariozechner/pi-coding-agent";
import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PLANS_DIR = join(homedir(), ".pi", "plans");

function findMostRecentPlanFile(): string | undefined {
  try {
    const files = readdirSync(PLANS_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const full = join(PLANS_DIR, f);
        return { full, mtime: statSync(full).mtime.getTime() };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return files[0]?.full;
  } catch {
    return undefined;
  }
}

const EXTRA_INSTRUCTIONS = `STRUCTURE THE OUTPUT LIKE THIS, in order:

## Active plan
The absolute path of the plan file the user is currently executing (if any was mentioned or written to during this session), or "none". Only list one. Prefer the most recently referenced plan file.

## Open TODOs
A short bulleted list of unresolved tasks, next-step actions the assistant committed to, or questions the user asked that were never fully answered. Each bullet should be one line. If there are no open TODOs, write "- none".

## Summary
Then your normal concise summary of the conversation, written for an agent resuming work cold.

Do not add any preamble before "## Active plan".`;

export default function (pi: ExtensionAPI) {
  pi.on("session_before_compact", async (event, ctx) => {
    try {
      const model = ctx.model;
      if (!model) return; // fall back to default compaction

      const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
      if (!auth.ok || !auth.apiKey) return;

      const { preparation, customInstructions, signal } = event;

      const planHint = findMostRecentPlanFile();
      const planContext = planHint
        ? `\n\nHINT: the most recently modified plan file on disk is: ${planHint}. This may or may not be the "active" one — judge from the conversation.`
        : "";

      const augmented =
        (customInstructions ? customInstructions + "\n\n" : "") +
        EXTRA_INSTRUCTIONS +
        planContext;

      const summary = await generateSummary(
        preparation.messagesToSummarize,
        model,
        preparation.settings.reserveTokens,
        auth.apiKey,
        auth.headers,
        signal,
        augmented,
        preparation.previousSummary
      );

      return {
        compaction: {
          summary,
          firstKeptEntryId: preparation.firstKeptEntryId,
          tokensBefore: preparation.tokensBefore,
        },
      };
    } catch (err) {
      // Any failure → fall back to default compaction so we never break a real session.
      ctx.ui.notify(
        `pi-swe compaction hook failed, using default: ${
          err instanceof Error ? err.message : String(err)
        }`,
        "warning"
      );
      return;
    }
  });
}
