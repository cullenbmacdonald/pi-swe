import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
  createAgentSession,
} from "@mariozechner/pi-coding-agent";
import { Type, complete, type Context } from "@mariozechner/pi-ai";

const SUBAGENT_PROVIDER = "anthropic";
const SUBAGENT_MODEL = "claude-sonnet-4-6";

const CONSULT_SYSTEM_PROMPT = `You are a reasoning helper spawned by another AI coding agent.

You have NO memory of any prior conversation and NO tools to read files or run commands. Answer only from the information in the user's question and your own knowledge.

If the question requires inspecting files you don't have, say so plainly — don't guess. Suggest what the caller should look at themselves.

Be terse. A few sentences or a short bulleted list.`;

const EXPLORE_SYSTEM_PROMPT = `You are a read-only codebase explorer spawned by another AI coding agent. Your job is to answer a single self-contained question about the codebase, then stop.

You have read, grep, find, and ls tools — use them freely. You do NOT have bash, edit, or write. You have NO memory of any prior conversation — treat the question as standalone.

Rules:
- Be terse. Answer the exact question asked, with citations (file_path:line_number).
- When you have enough to answer, stop calling tools and write the final answer.
- If the question is unanswerable from the codebase, say so plainly — don't speculate.
- No code changes, no suggestions for changes. Describe only what exists.

Your answer goes directly back to the calling agent — no greetings, no preamble.`;

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "consult",
    label: "Consult",
    description:
      "Ask a cheaper Sonnet model a self-contained reasoning question in a fresh context (no memory of this conversation, no tools). Good for strategy questions, architecture trade-offs, code reviews of a snippet you paste in, or 'what would be the right approach for X given Y'. NOT a codebase explorer — the subagent cannot read files on its own. Use `explore` for that.",
    promptSnippet:
      "consult(question) — ask cheap Sonnet a self-contained reasoning question; returns a string digest",
    promptGuidelines: [
      "Use consult() for strategy/trade-off/review questions where the answer comes from thinking, not file-reading.",
      "Include all relevant context in the question — paste snippets, describe constraints. The subagent has no memory of this conversation and no file-access tools.",
      "Good uses: 'given this function <paste>, is there a subtle race condition?', 'what's the idiomatic way to handle X in Rust?'. Bad uses: 'where is auth defined in this repo?' (use explore instead).",
    ],
    parameters: Type.Object({
      question: Type.String({
        description:
          "A self-contained reasoning question. Include all context the subagent needs; it has no memory of this conversation and cannot read files.",
      }),
      context: Type.Optional(
        Type.String({
          description:
            "Optional additional context (code snippets, error messages, prior decisions) to prepend to the question.",
        })
      ),
    }),

    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      const model = ctx.modelRegistry.find(SUBAGENT_PROVIDER, SUBAGENT_MODEL);
      if (!model) {
        return {
          content: [
            {
              type: "text",
              text: `consult: model ${SUBAGENT_PROVIDER}/${SUBAGENT_MODEL} is not registered.`,
            },
          ],
          details: {},
          isError: true,
        };
      }

      const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
      if (!auth.ok) {
        return {
          content: [
            {
              type: "text",
              text: `consult: could not resolve API key for ${SUBAGENT_PROVIDER}: ${auth.error}`,
            },
          ],
          details: {},
          isError: true,
        };
      }

      const statusKey = `subagent:consult:${toolCallId.slice(0, 6)}`;
      ctx.ui.setStatus(statusKey, `consult: running on ${SUBAGENT_MODEL}…`);

      const userText = params.context
        ? `Context:\n${params.context}\n\nQuestion: ${params.question}`
        : params.question;

      const context: Context = {
        systemPrompt: CONSULT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: userText,
            timestamp: Date.now(),
          },
        ],
      };

      try {
        const result = await complete(model, context, {
          signal,
          apiKey: auth.apiKey,
          headers: auth.headers,
          maxTokens: 4096,
        });

        const textParts = result.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("\n");

        const digest = textParts.trim() || "(subagent returned no text)";
        const { usage } = result;
        const totalTokens = usage.input + usage.output;
        const cost = usage.cost.total;
        ctx.ui.setStatus(
          statusKey,
          `consult: ${totalTokens} tok · ${formatCost(cost)}`
        );

        if (result.stopReason === "aborted") {
          return {
            content: [{ type: "text", text: "consult: aborted." }],
            details: { usage, stopReason: result.stopReason },
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: digest }],
          details: {
            model: SUBAGENT_MODEL,
            tokensIn: usage.input,
            tokensOut: usage.output,
            costUsd: cost,
            stopReason: result.stopReason,
          },
        };
      } catch (err) {
        ctx.ui.setStatus(statusKey, undefined);
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `consult failed: ${message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "explore",
    label: "Explore",
    description:
      "Ask a self-contained question about the codebase; a cheaper Sonnet subagent with read-only tools (read, grep, find, ls) answers it and returns a string digest. Use this instead of stacking many read/grep calls in this conversation — it keeps context clean and costs less.",
    promptSnippet:
      "explore(question) — read-only codebase exploration via Sonnet subagent with read/grep/find/ls; returns a string digest",
    promptGuidelines: [
      "Prefer explore() over many read/grep calls when surveying a codebase. It's cheaper and preserves this conversation's context budget.",
      "Phrase the question self-contained — the subagent has no memory of this conversation. Include the repo path if ambiguous.",
      "Good uses: 'where is authentication handled in ~/dev/foo?', 'list all API endpoints in src/api', 'what testing framework does this repo use?'.",
      "The subagent cannot run bash or modify files. If the caller needs command output, use bash here directly instead.",
    ],
    parameters: Type.Object({
      question: Type.String({
        description:
          "A self-contained codebase question. Include the repo path if the working directory is ambiguous. The subagent has no memory of this conversation.",
      }),
      cwd: Type.Optional(
        Type.String({
          description:
            "Working directory for the subagent. Defaults to the current working directory.",
        })
      ),
    }),

    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      const model = ctx.modelRegistry.find(SUBAGENT_PROVIDER, SUBAGENT_MODEL);
      if (!model) {
        return {
          content: [
            {
              type: "text",
              text: `explore: model ${SUBAGENT_PROVIDER}/${SUBAGENT_MODEL} is not registered.`,
            },
          ],
          details: {},
          isError: true,
        };
      }

      const statusKey = `subagent:explore:${toolCallId.slice(0, 6)}`;
      ctx.ui.setStatus(statusKey, `explore: starting on ${SUBAGENT_MODEL}…`);

      const subagentCwd = params.cwd ?? ctx.cwd;
      const agentDir = `${process.env.HOME}/.pi/agent`;

      try {
        const settingsManager = SettingsManager.inMemory({
          compaction: { enabled: false },
          retry: { enabled: true, maxRetries: 2 },
        });

        const loader = new DefaultResourceLoader({
          cwd: subagentCwd,
          agentDir,
          settingsManager,
          noExtensions: true,
          noSkills: true,
          noPromptTemplates: true,
          noThemes: true,
          noContextFiles: true,
          systemPrompt: EXPLORE_SYSTEM_PROMPT,
        });
        await loader.reload();

        const { session } = await createAgentSession({
          cwd: subagentCwd,
          agentDir,
          model,
          thinkingLevel: "off",
          authStorage: ctx.modelRegistry.authStorage,
          modelRegistry: ctx.modelRegistry,
          tools: ["read", "grep", "find", "ls"],
          resourceLoader: loader,
          sessionManager: SessionManager.inMemory(),
          settingsManager,
        });

        const abortHandler = () => {
          void session.abort();
        };
        signal?.addEventListener("abort", abortHandler);

        let lastAssistantText = "";
        let tokensIn = 0;
        let tokensOut = 0;
        let costUsd = 0;
        let toolCalls = 0;
        let errored: string | undefined;

        const unsubscribe = session.subscribe((event) => {
          if (event.type === "message_end" && event.message.role === "assistant") {
            const msg = event.message;
            const textParts = msg.content
              .filter(
                (c): c is { type: "text"; text: string } => c.type === "text"
              )
              .map((c) => c.text)
              .join("\n");
            if (textParts.trim()) lastAssistantText = textParts;
            toolCalls += msg.content.filter((c) => c.type === "toolCall").length;

            if (msg.usage) {
              tokensIn += msg.usage.input ?? 0;
              tokensOut += msg.usage.output ?? 0;
              costUsd += msg.usage.cost?.total ?? 0;
            }
            if (msg.stopReason === "error" && msg.errorMessage) {
              errored = msg.errorMessage;
            }

            const total = tokensIn + tokensOut;
            ctx.ui.setStatus(
              statusKey,
              `explore: ${total} tok · ${formatCost(costUsd)} · ${toolCalls} tool calls`
            );
          }
        });

        try {
          await session.prompt(params.question);
        } finally {
          unsubscribe();
          signal?.removeEventListener("abort", abortHandler);
        }

        if (signal?.aborted) {
          return {
            content: [{ type: "text", text: "explore: aborted." }],
            details: { tokensIn, tokensOut, costUsd, toolCalls, aborted: true },
            isError: true,
          };
        }

        if (errored) {
          return {
            content: [{ type: "text", text: `explore failed: ${errored}` }],
            details: { tokensIn, tokensOut, costUsd, toolCalls },
            isError: true,
          };
        }

        const digest = lastAssistantText.trim() || "(subagent returned no text)";
        return {
          content: [{ type: "text", text: digest }],
          details: {
            model: SUBAGENT_MODEL,
            tokensIn,
            tokensOut,
            costUsd,
            toolCalls,
          },
        };
      } catch (err) {
        ctx.ui.setStatus(statusKey, undefined);
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `explore failed: ${message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });
}
