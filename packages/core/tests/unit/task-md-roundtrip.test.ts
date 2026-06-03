/**
 * Round-trip property test for TaskMdShape serialization.
 *
 *   parseTaskMdString(serializeTaskMd(shape)) ≈ shape   (for normalised
 *   field projections — see comments on each case for which fields the
 *   parser drops/aliases by design).
 *
 * This is the rewrite safety net described in the framework-stability plan:
 * every bug that produced the goal-driven-dev workspace's broken sprints
 * (work-06 YAML pollution, work-items.json id mismatch, depends_on
 * string-concat hazards) traces to a serialize→parse asymmetry. If this
 * test holds, those bug classes can't reappear without breaking the test
 * first.
 *
 * Style: table-driven property test. Each row is a corner case from the
 * audit. Adding a fast-check style fuzzer is a follow-up; the explicit
 * table is more readable and exercises the *named* hazards directly.
 */

import { describe, it, expect } from "vitest";
import {
  serializeTaskMd,
  parseTaskMdString,
  type TaskMdShape,
} from "../../src/config/task-md-definition.ts";

interface Case {
  name: string;
  /** The shape the framework should round-trip. */
  shape: TaskMdShape;
  /** Optional projector: some fields are intentionally dropped/renamed by
   *  the parser. The projector strips those before comparison. Defaults to
   *  identity. */
  project?: (s: TaskMdShape) => TaskMdShape;
}

/** Strip TaskMdShape fields that the parser is allowed to add/normalise. */
function stripParserAdditions(s: TaskMdShape): TaskMdShape {
  // `checks` is the legacy alias the parser sets from `tests` when only
  // `tests` is provided. Strip it for comparison.
  const { checks: _checks, ...rest } = s;
  return rest as TaskMdShape;
}

/** The parser trims trailing whitespace from the body. The serializer
 *  emits the body verbatim. To compare for round-trip equivalence, apply
 *  the same trim to the expected body. */
function normalizeBody(s: TaskMdShape): TaskMdShape {
  if (s.body !== undefined) {
    return { ...s, body: s.body.trim() || undefined };
  }
  return s;
}

const cases: Case[] = [
  {
    name: "minimal — id only",
    shape: { id: "min" },
  },
  {
    name: "title, description, body",
    shape: {
      id: "001-bootstrap",
      title: "Bootstrap",
      description: "Set up the project scaffold.",
      body: "## Steps\n\n1. Do the thing.\n",
    },
  },
  {
    name: "single string with embedded colon (must be quoted)",
    shape: {
      id: "colon-task",
      description: "exit: 0 if ok",
      title: "Run: pnpm test",
    },
  },
  {
    name: "list-typed `outputs` is a real YAML list, not a scalar",
    shape: {
      id: "list-out",
      outputs: ["src/a.ts", "src/b.ts"],
    },
  },
  {
    name: "outputs path with brackets (Next.js dynamic route segment)",
    shape: {
      id: "bracket-path",
      outputs: ["src/app/markets/[id]/page.tsx"],
    },
    // brackets in a path are legal YAML inside a quoted string; the
    // serializer must quote, the parser must accept.
  },
  {
    name: "checks with shell-pipe in cmd (the work-06 corruption case)",
    shape: {
      id: "shell-pipe",
      // tests is the canonical field; the parser stores it under both
      // `tests` and `checks` for back-compat, so we strip `checks` before
      // comparing.
      tests: [
        {
          id: "build-passes",
          type: "cmd",
          cmd: "pnpm build 2>&1 | grep -q ok",
          description: "build-passes",
        },
      ],
    },
    project: stripParserAdditions,
  },
  {
    name: "checks with backslash-escaped chars",
    shape: {
      id: "backslash-cmd",
      tests: [
        {
          id: "orderbook-check",
          type: "cmd",
          cmd: "grep -qE 'orderbook|order_book' 'src/app/markets/[id]/page.tsx'",
          description: "orderbook-check",
        },
      ],
    },
    project: stripParserAdditions,
  },
  {
    name: "skills + tags",
    shape: {
      id: "skilled",
      skills: ["stitch-prompt", "stitch-generate"],
      tags: ["screen", "priority:high"],
    },
  },
  {
    name: "vars with mixed types",
    shape: {
      id: "vars-task",
      vars: {
        epoch: 1,
        sprintName: "001-bootstrap",
        flag: true,
      },
    },
  },
  {
    name: "multi-line body with markdown",
    shape: {
      id: "multi-line",
      title: "Multi-line task",
      body: "# Heading\n\nFirst paragraph.\n\n```bash\necho hi\n```\n",
    },
  },
  {
    name: "blocking flag set",
    shape: {
      id: "blocked-task",
      blocking: true,
    },
  },
  {
    name: "agent + plan config",
    shape: {
      id: "planned",
      agent: "ui-designer",
      plan: { prompt: "Design the layout", output: ".converge/plan.md" },
    },
  },
  {
    name: "review config with html artifact",
    shape: {
      id: "review-html",
      handoff: {
        artifact: "docs/review.html",
        format: "html",
        skill: "html-review-artifact",
      },
    },
  },
];

describe("serializeTaskMd ↔ parseTaskMdString round-trip", () => {
  for (const c of cases) {
    it(c.name, () => {
      const serialized = serializeTaskMd(c.shape);

      // Serialized output is a valid TASK.md (has `---` delimiters).
      expect(serialized.startsWith("---\n")).toBe(true);
      expect(serialized).toMatch(/\n---\n/);

      // It re-parses without throwing.
      const reparsed = parseTaskMdString(serialized);

      // Project fields the parser is allowed to add/normalise.
      const projected = c.project ? c.project(c.shape) : c.shape;
      const expected = normalizeBody(projected);

      // Field-by-field: every field set in the input must round-trip.
      for (const key of Object.keys(expected) as Array<keyof TaskMdShape>) {
        expect(reparsed[key], `field "${String(key)}" mismatched`).toEqual(
          expected[key],
        );
      }
    });
  }

  it("rejects shape without id", () => {
    expect(() => serializeTaskMd({} as TaskMdShape)).toThrow(/id is required/);
  });

  it("hand-crafted broken frontmatter (the work-06 corruption) does NOT parse to the same shape it claims", () => {
    // This is the exact bytes the playbook used to produce. Asserting it
    // FAILS to round-trip is the inverse safety: we don't want serialize to
    // ever emit something parse can't read.
    const corrupted = [
      "---",
      'id: "003-bad"',
      "outputs:",
      "orderBook\\|order_book' src/...|  - src/app/markets/[id]/page.tsx",
      "---",
      "",
    ].join("\n");
    // It should either throw on parse, or parse with a degenerate shape —
    // either way, what comes out is NOT the well-formed shape a serializer
    // would have produced.
    let parsed: TaskMdShape | null = null;
    try {
      parsed = parseTaskMdString(corrupted);
    } catch {
      // Throwing is fine — the protected behavior is "don't silently
      // pretend the file is well-formed".
    }
    if (parsed) {
      // If it parsed at all, the outputs must NOT match a sane list.
      expect(parsed.outputs).not.toEqual(["src/app/markets/[id]/page.tsx"]);
    }
  });
});
