---
description: Plan a feature or change; writes a plan file before any code
argument-hint: <feature description>
---
I want to plan work on: $@

Before writing any code, write a plan to `~/.pi/plans/<kebab-slug>.md` where `<kebab-slug>` is a short, descriptive slug based on the feature description above.

The plan file must contain these sections in order:

1. **Context** — Why this change? What problem does it solve? What's the intended outcome? (1-2 paragraphs.)
2. **Target shape** — What does the end state look like? Directory tree, new files, modified files. Be concrete.
3. **Build order** — Ordered, milestone-based. Highest-leverage first. Each milestone should have an exit criterion.
4. **Critical files** — Paths of files to be created or modified, with a one-line note about what goes in each.
5. **Verification** — How do I test end-to-end that this works? Commands to run, outputs to check.

Keep the plan concise enough to scan in 60 seconds but detailed enough that a fresh agent could execute it. Do **not** write code yet. Do **not** modify anything outside `~/.pi/plans/`.

Before writing, if the feature description is ambiguous or has multiple valid interpretations, ask me 1-3 clarifying questions first. Otherwise, write the plan, then tell me the slug you used and ask whether to proceed.
