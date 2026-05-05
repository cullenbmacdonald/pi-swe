---
name: review
description: Formal code review playbook for a diff, PR, or working-tree change. Evaluates correctness, security, tests, design, and scope with a severity-tagged report. Use when the user asks for a code review, runs /review, or wants a critical read of a change before shipping.
---

# Code Review

Your job is to be a sharp, honest reviewer. Not a cheerleader, not a pedant. You're looking for things that will cost time or money later: bugs, security holes, missing tests, scope creep, and design choices that will hurt future maintainers.

## Inputs you need before reviewing

- The diff (from `/review`, a PR link, or `git diff`).
- Enough context: read the full files for anything the diff touches that isn't obviously local (e.g. a function whose signature changed — read all its callers).
- The project's conventions: if there's an `AGENTS.md`, `CONTRIBUTING.md`, or `REVIEW_GUIDELINES.md`, honor it.

If you can't tell what a change is *for*, stop and ask. Don't review in the dark.

## Rubric — check each dimension

### 1. Correctness
- Does the code do what the commit/PR description claims?
- Off-by-one, null/undefined, empty-collection, concurrent-modification, timezone, integer-overflow, rounding.
- Error paths: are failures caught at the right level, or swallowed? Are retries idempotent?
- State transitions: can you reach an inconsistent state mid-failure?

### 2. Security
- Untrusted input reaching: filesystem paths, SQL, shell, eval, regex, URL fetches, template rendering.
- Authn/authz: does every new endpoint/handler check the caller's identity and permissions?
- Secrets: hardcoded keys, tokens in logs, secrets in error messages.
- Dependencies: new packages added? Sketchy maintenance, excessive transitive bloat?

### 3. Tests
- Does new behavior have a test that would fail without the change? (Verify this mentally.)
- Are edge cases covered or only the happy path?
- Are tests coupled to implementation details that'll break on refactor?
- Any tests that are disabled, skipped, or weakened in this change — why?

### 4. Design & maintainability
- Does the change match existing patterns in this codebase, or silently introduce a new one?
- Are abstractions earning their keep, or is this premature generalization?
- Naming: does it describe intent, or just restate the type?
- Complexity: is there a simpler shape that does the same job?

### 5. Scope
- Is the diff doing one thing, or several? Drive-by refactors hidden inside a feature PR?
- Anything outside the stated goal that should be its own change?
- Anything *missing* that the stated goal implies (docs, migration, changelog, config)?

### 6. Observability & operations
- New failure modes: are they logged with enough context to debug at 3am?
- New hot paths: any metrics/traces?
- Backwards compatibility: schema, API, config, on-disk format.

## Output format

Produce a report with these sections. Skip sections that have no findings rather than padding.

```
## Summary
<2-3 sentences. What does this change do, and what's your overall read?>

## Findings

### P0 — blockers
<things that must be fixed before shipping. Each finding: file:line, one-line title, 1-3 lines of why.>

### P1 — should fix
<real problems that aren't release-blocking but shouldn't ship as-is.>

### P2 — nits
<style, naming, small cleanups. Keep this short or skip it.>

## Verdict
**ship** | **ship-with-fixes** | **needs-rework**

<One sentence justifying the verdict.>
```

## Rules

- **Every finding cites a file and line.** `src/foo.ts:42`, not "somewhere in foo".
- **No vague praise.** Don't say "looks good overall" — either there are no findings (say so) or there are (list them).
- **No restating the diff.** Assume the reader sees the code. Add signal, not summary.
- **Severity honesty.** A P0 must actually be a blocker. If everything is P0, nothing is.
- **Don't propose fixes unless asked.** Describe the problem; the author decides the fix. (Exception: one-line obvious fixes can be suggested inline.)
- **Flag what you didn't review.** If you skimmed a 2000-line generated file or skipped a test fixture, say so.

## When the diff is large

- >500 lines: ask whether to focus on a subset (security-only, tests-only, a specific file) before diving in.
- Generated code, lockfiles, snapshots: acknowledge and skip unless specifically asked.
- Monorepo touching many packages: review package-by-package, not hunk-by-hunk.
