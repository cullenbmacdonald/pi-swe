---
description: Review the current branch's diff against origin
argument-hint: "[base-branch]"
---
Review the current branch against `${1:-origin/HEAD}`.

Load the `review` skill (`~/.agents/skills/review/SKILL.md` or wherever it lives) and follow its rubric. Then:

1. Establish the diff:
   ```bash
   git fetch --quiet origin
   BASE=$(git merge-base HEAD ${1:-origin/HEAD})
   git diff --stat $BASE...HEAD
   git diff $BASE...HEAD
   ```
2. Read any new or substantially-changed files in full — don't review from the diff alone if the diff is >200 lines or touches critical paths.
3. Produce the review per the skill's structure. Severities: **P0** (blocker), **P1** (should-fix), **P2** (nit). No vague praise, no restating what the code does.
4. End with an explicit verdict: **ship**, **ship-with-fixes**, or **needs-rework**.

Do not fix anything unless I ask. This is a read-only review.
