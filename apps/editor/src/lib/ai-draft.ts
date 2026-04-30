import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Output schema — the shape Claude must produce                      */
/* ------------------------------------------------------------------ */

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TASK_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

const CheckSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  cmd: z.string().min(1).max(500),
  description: z.string().min(1).max(200),
});

const TaskSchema = z.object({
  id: z.string().regex(TASK_ID),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  inputs: z.array(z.string().min(1).max(200)).max(8),
  outputs: z.array(z.string().min(1).max(200)).max(8),
  dependencies: z.array(z.string().min(1).max(80)).max(8),
  tags: z.array(z.string().min(1).max(40)).max(6),
  blocking: z.boolean(),
  checks: z.array(CheckSchema).max(6),
  body: z.string().min(20).max(4000),
});

export const PlaybookDraftSchema = z.object({
  name: z.string().regex(SLUG),
  description: z.string().min(10).max(400),
  mode: z.enum(["oneoff", "converge", "loop", "dispatch"]),
  tasks: z.array(TaskSchema).min(2).max(8),
});

export type PlaybookDraft = z.infer<typeof PlaybookDraftSchema>;

/* ------------------------------------------------------------------ */
/*  Cached system prompt — stable across requests                      */
/* ------------------------------------------------------------------ */

// Keeping this in one place, byte-stable, so cache_control works.
const SYSTEM_PROMPT = `You are a Converge playbook architect. Your job is to turn a one-line goal into a structured playbook draft that another developer can edit and run.

A Converge playbook is a directed acyclic graph of tasks. Each task has:
- id: short kebab-case identifier (e.g. "01-prepare-spec", "build-ui")
- title: human-readable single line
- description: one or two sentences for the task drawer
- inputs: file globs the task reads (relative paths)
- outputs: file globs the task writes
- dependencies: ids of tasks that must complete first
- tags: optional labels
- blocking: true if dependents must wait on success
- checks: shell-runnable assertions that prove the task is done; each has id, cmd, description
- body: a markdown brief the agent reads to do the work — concrete, actionable, and grounded in the inputs/outputs

Modes:
- "oneoff" — runs end-to-end once
- "converge" — converges on a goal across multiple iterations
- "loop" — runs tasks repeatedly on a schedule
- "dispatch" — keyed dispatch, each invocation is a separate run

Hard rules:
1. Produce 3 to 7 tasks. Fewer if the goal is small.
2. Task ids must be unique kebab-case.
3. Every dependency must reference an id that exists in the same playbook. No "tag:" deps.
4. The graph must be acyclic.
5. If task B's input matches task A's output, also list A in B's dependencies — make the data flow explicit.
6. Every task must have at least one output and at least one check. Checks must be shell-runnable (test, grep, ls, cmp, jq, etc.) and verify the outputs exist or have the expected shape.
7. The body should describe what to write, where, and why — not boilerplate. Be specific to the goal.
8. Don't invent tools or files outside the user's project. Stay in the working tree.

Style:
- Prefer small, focused tasks over one big one.
- Inputs/outputs are real paths or globs (e.g. "src/**/*.ts", ".converge/artifacts/spec.md") — never abstract names.
- Don't include the closing summary task unless it produces a real artifact.

Examples of good task shapes:

Example 1 — building a CLI scraper:
- 01-fetch-fixtures (outputs: .converge/artifacts/fixtures/*.html)
- 02-design-schema (inputs: .converge/artifacts/fixtures/*.html, outputs: src/schema.ts, depends_on: [01-fetch-fixtures])
- 03-implement-parser (inputs: src/schema.ts, outputs: src/parse.ts, src/parse.test.ts, depends_on: [02-design-schema])
- 04-cli (inputs: src/parse.ts, outputs: src/cli.ts, depends_on: [03-implement-parser])

Example 2 — refactoring a module:
- 01-baseline-tests (outputs: tests/regression/*.spec.ts)
- 02-extract-types (inputs: src/legacy.ts, outputs: src/types.ts, depends_on: [01-baseline-tests])
- 03-rewrite-impl (inputs: src/types.ts, outputs: src/legacy.ts, depends_on: [02-extract-types])

Return ONLY the structured object — no prose, no markdown fences. The schema is enforced.`;

/* ------------------------------------------------------------------ */
/*  Drafting                                                           */
/* ------------------------------------------------------------------ */

export class AiDraftError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "missing_api_key"
      | "rate_limited"
      | "invalid_output"
      | "cycle"
      | "duplicate_task_id"
      | "unknown_dependency"
      | "upstream_error",
  ) {
    super(message);
  }
}

export interface DraftOptions {
  prompt: string;
  /** Override slug; otherwise uses the slug returned by the model. */
  slug?: string;
}

export async function draftPlaybook(opts: DraftOptions): Promise<PlaybookDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiDraftError(
      "ANTHROPIC_API_KEY is not set; cannot draft a playbook.",
      "missing_api_key",
    );
  }

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      // No thinking — the schema constrains the output and we want low latency.
      thinking: { type: "disabled" },
      output_config: {
        format: zodOutputFormat(PlaybookDraftSchema),
        effort: "low",
      },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          // Cache the (large, stable) system prompt across requests.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: buildUserMessage(opts.prompt, opts.slug),
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new AiDraftError(
        "Anthropic rate-limited the request; try again shortly.",
        "rate_limited",
      );
    }
    if (err instanceof Anthropic.APIError) {
      throw new AiDraftError(
        `Anthropic API error (${err.status}): ${err.message}`,
        "upstream_error",
      );
    }
    throw err;
  }

  const draft = response.parsed_output;
  if (!draft) {
    throw new AiDraftError(
      `Model returned an unparseable draft (stop_reason=${response.stop_reason}).`,
      "invalid_output",
    );
  }

  if (opts.slug) {
    draft.name = opts.slug;
  }

  validateDraft(draft);
  return draft;
}

function buildUserMessage(prompt: string, slug?: string): string {
  const lines = [
    `Goal: ${prompt.trim()}`,
    "",
    "Produce a playbook that ships this end-to-end.",
  ];
  if (slug) {
    lines.push(`The playbook slug must be exactly: ${slug}`);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Post-validation                                                    */
/* ------------------------------------------------------------------ */

function validateDraft(draft: PlaybookDraft): void {
  const ids = new Set<string>();
  for (const t of draft.tasks) {
    if (ids.has(t.id)) {
      throw new AiDraftError(
        `Duplicate task id: ${t.id}`,
        "duplicate_task_id",
      );
    }
    ids.add(t.id);
  }

  for (const t of draft.tasks) {
    for (const dep of t.dependencies) {
      if (!ids.has(dep)) {
        throw new AiDraftError(
          `Task "${t.id}" depends on unknown task "${dep}"`,
          "unknown_dependency",
        );
      }
    }
  }

  // Topo sort — refuse on cycles.
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const t of draft.tasks) {
    indeg.set(t.id, 0);
    adj.set(t.id, []);
  }
  for (const t of draft.tasks) {
    for (const dep of t.dependencies) {
      adj.get(dep)!.push(t.id);
      indeg.set(t.id, (indeg.get(t.id) ?? 0) + 1);
    }
  }
  const queue = Array.from(indeg.entries())
    .filter(([, d]) => d === 0)
    .map(([id]) => id);
  let visited = 0;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    visited++;
    for (const next of adj.get(cur) ?? []) {
      const d = (indeg.get(next) ?? 0) - 1;
      indeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  if (visited !== draft.tasks.length) {
    throw new AiDraftError(
      "Drafted playbook contains a dependency cycle.",
      "cycle",
    );
  }
}
