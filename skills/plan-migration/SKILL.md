---
name: plan-migration
description: Plan a schema, library, framework, or data migration that's too structured for a plain /plan. Produces a migration plan with compatibility windows, rollback story, and phased rollout. Use when the change involves shared state (DB schemas, on-disk formats, wire protocols, public APIs) or swapping out a foundational dependency.
---

# Plan Migration

Migrations are plans with extra failure modes: you can corrupt shared state, break other people's work-in-progress, and leave the system wedged halfway. The extra structure here pays for itself the first time something goes sideways at 2am.

Output a migration plan file at `~/.pi/plans/migrate-<slug>.md` with the sections below. Do **not** write code during planning.

## Required sections

### 1. Context
- What's being migrated, from what to what, and why now.
- Who/what depends on the current state (services, clients, humans, cron jobs, external consumers).
- What breaks if we do nothing.

### 2. Compatibility matrix
A table of old-state × new-state combinations during the rollout. For each cell: does it work, degrade gracefully, or break?

```
               │ old reader │ new reader
───────────────┼────────────┼───────────
old writer     │   ✅       │   ?
new writer     │   ?        │   ✅
```

Fill the `?` cells with either "works because X" or "must be prevented by Y".

### 3. Phased rollout
Expand-contract pattern is the default. Name each phase and its exit criterion:

1. **Expand** — add the new shape alongside the old. Both readers and writers can handle both. No behavior change yet.
2. **Migrate writers** — flip writes to the new shape. Old readers still work via the compatibility layer.
3. **Backfill** — convert historical data to the new shape. Idempotent, resumable, chunked.
4. **Migrate readers** — flip reads to the new shape. Old shape becomes unused but still present.
5. **Contract** — remove the old shape, the compatibility layer, and any feature flags.

Each phase must be independently deployable and independently revertible. If phase N requires phase N-1 to be permanent, rethink.

### 4. Rollback plan
For each phase, explicitly:

- **How to revert** (code revert? feature flag flip? data restore?).
- **Point of no return** — which phase commits to the new state irreversibly? Call it out loudly.
- **Data safety** — if a rollback loses writes made during phase N, say so. Plan a backup or a write-log.

### 5. Risk register
List the top 3-5 things that could go wrong, ranked by blast radius × likelihood. For each: detection (how will we know?) and mitigation (what do we do?).

Examples worth considering:
- Partial backfill (subset of rows in new shape, rest in old).
- Dual-write skew (new and old stores disagree).
- Long-running transactions holding locks during schema change.
- Clients caching old schema/API response shapes.
- Serialized data in queues/logs that outlive the migration window.

### 6. Critical files & systems
Paths + one-line description. Separate code from data:

- **Code:** models, migrations, serializers, API handlers, clients.
- **Data:** tables, indexes, on-disk formats, message schemas.
- **Ops:** feature flags, deploy order, runbooks, monitoring dashboards.

### 7. Verification
For each phase, how do you prove it worked *before* moving to the next?

- Automated: tests that run against a mixed old/new environment.
- Manual: queries, dashboards, logs to check.
- Canary: which subset goes first, for how long, with what rollback trigger.

### 8. Timeline & ownership
- Who runs each phase.
- Minimum soak time between phases (especially before **Contract**).
- External communications: who do we need to tell, when.

## Rules while planning

- **Don't skip expand-contract** just because "no one else is using it." You're wrong often enough that the discipline is worth it.
- **Backfills must be idempotent and resumable.** Assume the script will die halfway.
- **Feature-flag the cutover** wherever possible. "Ship the code, flip the switch later" is the safest shape.
- **Write the rollback before writing the forward path.** If the rollback is vague, the plan isn't ready.
- **Name the point of no return** explicitly. The user should approve it with open eyes.

## When to push back

If during planning you discover:
- The old shape can't be kept readable during the transition.
- There's no safe rollback after phase 2.
- The blast radius is larger than the user described.

…stop and surface this to the user before continuing. A migration with no rollback is a different decision than one with a rollback, and the user should make it explicitly.
