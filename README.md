# pi-swe

A personal general-SWE coding agent for [Pi](https://pi.dev).

## What's in here

- **`extensions/`** — TypeScript extensions that hook into Pi's lifecycle and register custom tools.
  - `answer.ts` — `/answer` command to extract and respond to agent questions in a structured TUI.
  - `compaction.ts` — session compaction utilities.
  - `notify.ts` — native desktop notification on agent turn completion (OSC 777).
  - `subagents.ts` — `explore` (and later `critique`) tools that call Sonnet for cheap read-only work.
- **`skills/`** — on-demand playbooks loaded by the model when invoked.
  - `plan-migration/` — schema/library migration planning.
  - `reproduce-bug/` — bug reproduction before fixing.
  - `review/` — formal code review playbook.

- **`prompts/`** — slash-command templates (`/plan`, `/review`, …).
- **`packages/pi-litellm-provider/`** — standalone shareable LiteLLM provider extension package.
- **`~/dev/pi-work-journal`** — extracted standalone work-journal extension package (separate repo).
- **`AGENTS.md`** — the agent's operating instructions.

## Install

Local development:

```bash
# Add to ~/.pi/agent/settings.json:
# "packages": ["/Users/you/dev/pi-swe"]
```

Later, once pushed to git:

```bash
pi install git:github.com/cullenbmacdonald/pi-swe
```

## Testing

```bash
npm install
npm test
```

Use watch mode while developing:

```bash
npm run test:watch
```

## Philosophy

Opus for planning, Sonnet for grinding. Plans live as files. Context is sacred — subagents keep exploration cheap and parent-session clean.
