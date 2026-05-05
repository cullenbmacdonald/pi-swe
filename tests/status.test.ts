import { describe, expect, it } from "vitest";
import { ACTIVE_WINDOW_MS, pickActivePlan } from "../extensions/status";

describe("pickActivePlan", () => {
  const now = 1_700_000_000_000;

  it("picks the most recently touched plan within active window", () => {
    const files = [
      { full: "/tmp/plans/older.md", mtime: now - 2_000 },
      { full: "/tmp/plans/newer.md", mtime: now - 500 },
    ];

    expect(pickActivePlan(files, now)).toEqual({
      slug: "newer",
      mtime: now - 500,
    });
  });

  it("ignores stale plans outside active window", () => {
    const files = [{ full: "/tmp/plans/stale.md", mtime: now - ACTIVE_WINDOW_MS - 1 }];

    expect(pickActivePlan(files, now)).toBeUndefined();
  });

  it("returns undefined when no files provided", () => {
    expect(pickActivePlan([], now)).toBeUndefined();
  });
});
