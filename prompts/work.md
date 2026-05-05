---
description: Execute a plan file previously written by /plan
argument-hint: <slug>
---
Execute the plan at `~/.pi/plans/$1.md`.

Steps:

1. **Read the plan end-to-end first.** Do not skim. Note the Build order and Verification sections.
2. **Confirm the plan is still accurate.** Skim the critical files it names and check they match the plan's assumptions. If reality has drifted from the plan, stop and tell me what's off before editing anything.
3. **Work milestone by milestone.** After each milestone, run the milestone's exit criterion (tests, a command, a visual check). Don't start the next milestone until the current one passes.
4. **Keep the plan file honest.** As milestones complete, edit `~/.pi/plans/$1.md` to mark them done (e.g. append ` ✅` to the milestone line). If you discover the plan is wrong, amend it in place and tell me what you changed and why.
5. **Run the Verification section at the end.** Report actual output, not a summary.

Rules:

- Prefer `explore()` for surveying unfamiliar code before editing it. Don't stack a dozen reads in this conversation.
- Prefer `consult()` for tricky design calls that don't need file access.
- If you hit an ambiguity the plan didn't anticipate, ask me before picking. Don't silently invent scope.
- Match existing patterns in the repo. If the plan contradicts a clear house pattern, flag it.

When you're done, summarize: milestones completed, verification output, anything that deviated from the plan.
