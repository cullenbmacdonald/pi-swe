# Prompt Caching 101 + LiteLLM/Bedrock Implementation Notes

This document is for the broader team: how prompt caching works in principle, then how it behaves in our LiteLLM + Bedrock setup across Anthropic and OpenAI-style models.

---

## 1) Prompt caching in general (vendor-agnostic)

## What it is
Prompt caching lets the model provider reuse previously processed prompt prefixes (usually large, stable content like instructions, policies, tool schemas, and long context blocks).

Instead of re-billing and re-processing the same prefix every turn:
- first use: cache **write** (populate cache)
- subsequent uses: cache **read** (reuse cached prefix)

## Why it matters
For long-running agent sessions, prompt caching can dramatically reduce:
- latency (less prefix processing)
- cost (fewer full-price prompt tokens)

## The basic requirements
Caching only helps when all of the following are true:
1. **Stable prefix**: the expensive part of the prompt remains identical across turns.
2. **Correct cache markers/keys**: request includes provider-specific caching controls.
3. **Cache affinity/consistency**: requests route in a way that can find the prior cache entry.
4. **Retention window**: next request arrives before cache entry expires.

If any of those fail, you get little/no cache hit.

## Common anti-patterns that kill hits
- Rewriting system prompts every turn (timestamps, random IDs, dynamic ordering).
- Reordering tools/messages unpredictably.
- Changing whitespace/serialization in supposedly “same” blocks.
- Missing or unstable cache key.
- Provider/proxy path that drops cache fields.

---

## 2) Two major caching styles we deal with

## A) Anthropic-style caching
Typically uses per-block `cache_control` markers (e.g., on system blocks, message content blocks, and sometimes tools).

Properties:
- Cacheability is attached to specific content blocks.
- TTL/retention may be represented as marker fields (e.g., `ttl`).
- Ordering and block structure matter.

## B) OpenAI-style caching
Typically uses top-level fields such as:
- `prompt_cache_key`
- `prompt_cache_retention` (example: `"24h"`)

Properties:
- Cache identity relies heavily on key + stable prompt body.
- Proxy must forward these params and propagate usage metadata.

---

## 3) LiteLLM + Bedrock: architecture implications

LiteLLM can expose different API surfaces over underlying providers. In practice, that means behavior differs by route:

1. **Anthropic native route** (Messages-style)
2. **OpenAI-compatible route** (`/v1/chat/completions`)

Even when both eventually hit Bedrock, caching behavior can diverge due to translation layers.

### Key practical lesson
A proxy path that is functionally “equivalent” for generation may still be **non-equivalent for caching** if:
- it transforms/drops marker fields,
- it changes marker ordering,
- it omits cache usage fields in stream/final usage.

---

## 4) What we observed in our environment

## Anthropic models (Claude via LiteLLM)
When routed through LiteLLM’s Anthropic Messages endpoint (`/v1/messages`), we observed expected caching patterns:
- first turn: large `cacheWrite`
- next turns: large `cacheRead`, small incremental `cacheWrite`

This indicates healthy prompt prefix reuse.

## OpenAI/Codex models (via LiteLLM OpenAI chat-completions route)
For `gpt-5.3-codex` on our current route, we repeatedly observed:
- `cacheRead=0`
- `cacheWrite=0`

So prompt caching is currently either:
- not being activated upstream, or
- not being surfaced through this path’s usage reporting.

---

## 5) Why Anthropic path was more reliable for us

We hit an issue where an OpenAI-compat translation path into Bedrock/Anthropic did not preserve cache semantics in a way Bedrock accepted (especially around marker/TTL handling and order-sensitive processing).

Using the **native Anthropic Messages path** avoided those translation mismatches and restored predictable caching.

---

## 6) Implementation guidance for teams

## Route selection
- Prefer **native provider API paths** when caching correctness is critical.
- Use OpenAI-compat paths only after verifying cache behavior end-to-end.

## Prompt construction discipline
- Keep large system/context prefixes stable.
- Avoid dynamic data in cacheable sections.
- Keep tool definitions deterministic and ordered.

## Operational validation
Treat cache as “untrusted until measured.”

For each model/route pair, validate:
1. Turn 1 has cache write.
2. Turns 2–N show cache read.
3. Cost trend drops vs uncached baseline.
4. Streaming and non-streaming report usage consistently.

## Monitoring signals to track
- `cacheRead` / `cacheWrite` token counts
- effective billed prompt tokens vs logical prompt size
- cache hit rate over session length
- route/provider/model dimensions (to catch regressions after routing changes)

---

## 7) LiteLLM/Bedrock model-family recommendations (current)

- **Claude on Bedrock**: use LiteLLM + Anthropic Messages route (`/v1/messages`) for strongest cache reliability.
- **OpenAI-style models via LiteLLM**: verify route-specific cache support before assuming savings.
- Do not assume cache parity across routes that share the same underlying model vendor.

---

## 8) Troubleshooting checklist

If caching appears broken:
1. Confirm request route (native vs compatibility layer).
2. Confirm cache fields/markers are present in outbound payload.
3. Confirm deterministic prompt/tool ordering.
4. Confirm retention/TTL settings align with expected reuse interval.
5. Compare streaming vs non-streaming usage payloads.
6. Run A/B with a fixed long prefix and identical follow-up turn.

---

## 9) Bottom line for our team

- Prompt caching is a **routing + payload-contract problem**, not just a model capability checkbox.
- Native API paths are usually safer for correctness.
- LiteLLM is powerful, but translations between API dialects can affect cache behavior.
- We should verify caching per model family and route, then standardize on the combinations that prove reliable.
