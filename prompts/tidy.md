---
description: Clean up uncommitted WIP into a coherent state
---
Tidy up the working tree. The goal is to leave things in a state where I could either commit cleanly or hand off to another session without confusion.

Steps:

1. **Survey.** Run `git status` and `git diff --stat`. Read the actual diff for anything non-obvious.
2. **Classify each hunk** into one of:
   - **Keep & ship** — intentional change, belongs in the next commit.
   - **Keep & stash** — useful but out of scope for the current task.
   - **Debug cruft** — `console.log`, commented-out code, temporary prints, leftover TODOs I wrote for myself.
   - **Mystery** — you can't tell what it's doing or why. Ask me.
3. **Propose a plan before changing anything.** List the hunks by file with a one-line classification each. Wait for my OK.
4. After approval:
   - Remove debug cruft directly.
   - Group kept-and-ship changes so they'd form 1-3 coherent commits. Suggest commit messages (conventional-commits style, subject only).
   - For stash candidates, suggest a `git stash push -m "<msg>" -- <paths>` command but don't run it without confirmation.
5. Do **not** run `git commit`, `git reset`, `git checkout --`, or `git clean` without explicit confirmation on each destructive command. Stashing is fine to propose but wait for approval.

If the tree is already clean, say so and stop.
