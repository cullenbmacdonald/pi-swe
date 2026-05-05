---
name: reproduce-bug
description: Reproduce a reported bug in isolation before attempting any fix. Walks through establishing a minimal failing case, confirming the failure mode, and writing a regression test that captures it. Use when the user reports a bug, pastes a stack trace, or asks you to investigate unexpected behavior.
---

# Reproduce Bug

**Rule zero: never fix what you can't reproduce.** A fix without a repro is a guess with a commit hash.

## Phase 1 — Clarify the report

Before touching code, make sure you understand:

1. **What the user did** — exact command, URL, input, click sequence.
2. **What happened** — exact error message, stack trace, unexpected output. Ask for the full trace, not a paraphrase.
3. **What they expected** — sometimes "the bug" is a misunderstanding of intended behavior.
4. **Environment** — OS, runtime version, branch/commit, relevant config. `git rev-parse HEAD` and versions of key deps.
5. **Frequency** — always, intermittent, first-run-only, only-after-X?

If any of these are missing and you can't derive them from context, **ask before proceeding**. A bad repro wastes more time than clarifying questions.

## Phase 2 — Establish the failing case

Goal: a command you can run that reliably fails the same way every time.

1. **Check for an existing test** that exercises the nearby code. Run it on the current branch to confirm green. This is your baseline.
2. **Write the smallest possible invocation** that triggers the bug:
   - A failing unit test is best.
   - A failing integration test is next best.
   - A reproducible CLI/curl/script invocation is acceptable when the above aren't practical.
3. **Run it 3+ times.** If it's flaky, note the flake rate. A flaky bug is a different investigation than a deterministic one — say so explicitly.
4. **Capture the full output** — stdout, stderr, exit code, relevant logs. Save it; you'll want to diff against it after the fix.

If you can't reproduce:

- Don't pretend you can. Report what you tried, what happened, and what additional info would help.
- Common culprits: different data, different env vars, different timezone, different node/python version, stale build cache, uncommitted local changes.

## Phase 3 — Narrow the cause

Only now, start investigating.

1. **Bisect if the bug is new.** `git log` the suspect files; if there's a known-good commit, `git bisect run <your repro command>`.
2. **Instrument, don't guess.** Add logging at the boundary where expected and actual behavior diverge. Remove it before committing.
3. **Read the code path top-to-bottom** before forming a hypothesis. The bug is rarely where the error message points.
4. **State the root cause in one sentence** before writing a fix. If you can't, you don't understand it yet.

## Phase 4 — Capture it as a test

Before fixing:

1. **Write a regression test that fails on current main.** This test is the contract: it proves the bug existed and will prove it doesn't return.
2. **Name the test after the bug**, not the code. `test_user_lookup_with_unicode_email_does_not_500`, not `test_user_service_3`.
3. **Confirm the test fails** on the unfixed branch. Capture its failure output.
4. Commit the test separately from the fix if the project's convention allows — makes the intent obvious in history.

## Phase 5 — Hand off to the fix

You now have:

- A one-sentence root cause.
- A reliably failing test.
- Captured failure output.

Present these to the user and ask whether to proceed with the fix, or stop here if the scope has grown (e.g. the root cause reveals a deeper design issue that deserves a plan).

## Anti-patterns to avoid

- **Fixing forward without a repro.** "I think this might be it" + push.
- **Writing the test after the fix.** The test then asserts whatever the code does, not what it should do.
- **Silent environment assumptions.** "Works on my machine" is a failure mode, not a defense.
- **Expanding scope mid-investigation.** If you find a second bug, note it and stay focused on the first.
