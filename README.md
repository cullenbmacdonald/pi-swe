# pi-swe

A personal general-SWE coding agent for [Pi](https://pi.dev).

## What's in here

- **`extensions/`** — TypeScript extensions that hook into Pi's lifecycle and register custom tools.
  - `subagents.ts` — `explore` (and later `critique`) tools that call Sonnet for cheap read-only work.
- **`skills/`** — on-demand playbooks loaded by the model when invoked.
- **`prompts/`** — slash-command templates (`/plan`, `/review`, …).
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
