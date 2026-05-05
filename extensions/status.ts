import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const PLANS_DIR = join(homedir(), ".pi", "plans");
const STATUS_KEY = "pi-swe:plan";

// Consider a plan "active" if it was touched within this window. Keeps stale plans
// from old sessions out of the footer, without being so tight that a lunch break
// kills the hint.
export const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export function pickActivePlan(
  files: Array<{ full: string; mtime: number }>,
  now = Date.now(),
  activeWindowMs = ACTIVE_WINDOW_MS
): { slug: string; mtime: number } | undefined {
  const top = files
    .filter((x) => now - x.mtime < activeWindowMs)
    .sort((a, b) => b.mtime - a.mtime)[0];

  if (!top) return undefined;
  return { slug: basename(top.full, ".md"), mtime: top.mtime };
}

function findActivePlan(): { slug: string; mtime: number } | undefined {
  try {
    const files = readdirSync(PLANS_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const full = join(PLANS_DIR, f);
        return { full, mtime: statSync(full).mtime.getTime() };
      });

    return pickActivePlan(files);
  } catch {
    return undefined;
  }
}

function refresh(ctx: { ui: { setStatus: (k: string, v: string | undefined) => void } }) {
  const plan = findActivePlan();
  ctx.ui.setStatus(STATUS_KEY, plan ? `plan: ${plan.slug}` : undefined);
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    refresh(ctx);
  });

  // Re-check after each assistant turn — a /plan may have just written a new file,
  // or the user may have switched context to a different plan.
  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    refresh(ctx);
  });
}
