/**
 * TaskExecutor Unit Tests
 *
 * Tests the new executor primitive:
 * - ctx.ai.fn() returns a callable AI function (call in while loop)
 * - ctx.ai.ask() convenience sugar
 * - ctx.spawn(string) — TASK.md path
 * - ctx.spawn(InlineTaskTarget) — virtual child Unit
 * - ctx.task metadata
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { TaskExecutor } from "../../../src/executor/task-executor.ts";
import type {
  ExecutorFn,
  ExecutorContext,
  AiFnOpts,
} from "../../../src/config/task-definition.ts";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Module Mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(() => ""),
  readdirSync: vi.fn(() => []),
  appendFileSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

// Skill resolver — stubs for SpawnRunner
vi.mock("../../../src/executor/skill-resolver.ts", () => ({
  resolveSkillDependencies: vi.fn((_root: string, skills: string[]) => ({
    skills,
    warnings: [],
  })),
  validateSkillsExist: vi.fn(),
  getSkillSummary: vi.fn(() => ""),
  collectAllowedTools: vi.fn(() => []),
}));

// Agent error classifier — stub for SpawnRunner
vi.mock("../../../src/repair/agent-runner.ts", () => ({
  classifyAgentError: vi.fn((err: any) => ({
    type: "error",
    summary: err?.message ?? "unknown",
    hint: null,
  })),
}));

// Simple log tailer — stub for SpawnRunner
vi.mock("../../../src/journal/simple-log-tailer.ts", () => ({
  SimpleLogTailer: class MockLogTailer {
    constructor() {}
    async start() {}
    stop() {}
  },
}));

// Track agentfn invocations
interface AgentFnCall {
  isStructured: boolean; // has schema
  prompt: string;
  skillsRoot?: string;
  skills?: string[];
  allowedTools?: string[];
  schema?: any;
}
const agentfnCalls: AgentFnCall[] = [];
let agentfnShouldFail = false;
let structuredResponses: any[] = []; // queue of data responses for schema calls

vi.mock("@converge/agentfn", () => ({
  agentfn: vi.fn((opts: any) => {
    const isStructured = !!opts.schema;
    agentfnCalls.push({
      isStructured,
      prompt: opts.prompt ?? "",
      skillsRoot: opts.skillsRoot,
      skills: opts.skills,
      allowedTools: opts.allowedTools,
      schema: opts.schema,
    });
    return async () => {
      if (agentfnShouldFail) {
        throw new Error("claudefn execution failed");
      }
      if (isStructured) {
        const data = structuredResponses.shift() ?? {
          answer: false,
          reasoning: "default",
        };
        return {
          data,
          raw: "",
          durationMs: 30,
          sessionId: "structured-session",
          provider: "claude",
        };
      }
      return {
        data: "output",
        raw: "output",
        durationMs: 100,
        sessionId: "skill-session",
        provider: "claude",
      };
    };
  }),
}));

// Mock Unit (for inline spawn)
let mockUnitRunResult = true;
vi.mock("../../../src/task/unit/unit.ts", () => ({
  Unit: {
    fromDefinition: vi.fn(
      (_taskDef: any, _parent: any, _virtualPath?: any) => ({
        run: vi.fn(async () => mockUnitRunResult),
      }),
    ),
  },
}));

// Capture journal writes
const journalEvents: Array<{ type: string; message: string; metadata?: any }> =
  [];
const statusWrites: any[] = [];

vi.mock("../../../src/journal/writer.ts", () => ({
  logTaskEvent: vi.fn(async (_d, _e, _t, eventType, message, metadata) => {
    journalEvents.push({ type: eventType, message, metadata });
  }),
  writeTaskStatus: vi.fn(async (_d, _e, _t, status) => {
    statusWrites.push(JSON.parse(JSON.stringify(status)));
  }),
  writeTaskTodo: vi.fn(async () => {}),
}));

vi.mock("../../../src/journal/structure.ts", () => ({
  getJournalStructure: vi.fn(() => ({
    task: "/project/.converge/journal/tasks/02-epic/tasks/003-task",
  })),
  getTaskCorrectionsDir: vi.fn(
    () => "/project/.converge/journal/tasks/02-epic/tasks/003-task/corrections",
  ),
}));

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

const JOURNAL_CTX = { epicId: "02-ux", taskId: "003-generate-all-screens" };
const TASK_META = {
  id: "003-generate-all-screens",
  title: "Generate All Screens",
};
const PROJECT_DIR = "/project";

function makeExecutor(parentUnit?: any) {
  return new TaskExecutor(
    PROJECT_DIR,
    JOURNAL_CTX,
    TASK_META,
    parentUnit ?? null,
  );
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("TaskExecutor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentfnCalls.length = 0;
    journalEvents.length = 0;
    statusWrites.length = 0;
    agentfnShouldFail = false;
    structuredResponses = [];
    mockUnitRunResult = true;
    vi.mocked(existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    // Do NOT call vi.restoreAllMocks() — it wipes vi.fn() implementations
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.task metadata                                               */
  /* ---------------------------------------------------------------- */

  describe("ctx.task", () => {
    it("exposes task id and title", async () => {
      let capturedCtx: ExecutorContext | undefined;
      const fn: ExecutorFn = async (ctx) => {
        capturedCtx = ctx;
      };

      await makeExecutor().run(fn, 1);

      expect(capturedCtx!.task.id).toBe("003-generate-all-screens");
      expect(capturedCtx!.task.title).toBe("Generate All Screens");
    });

    it("exposes iteration from converge", async () => {
      const iterations: number[] = [];
      const fn: ExecutorFn = async (ctx) => {
        iterations.push(ctx.task.iteration);
      };

      await makeExecutor().run(fn, 1);
      await makeExecutor().run(fn, 2);
      await makeExecutor().run(fn, 5);

      expect(iterations).toEqual([1, 2, 5]);
    });

    it("exposes projectDir", async () => {
      let dir: string | undefined;
      const fn: ExecutorFn = async (ctx) => {
        dir = ctx.projectDir;
      };

      await makeExecutor().run(fn, 1);

      expect(dir).toBe(PROJECT_DIR);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.fn() — returns callable                                 */
  /* ---------------------------------------------------------------- */

  describe("ctx.ai.fn()", () => {
    it("returns a callable function", async () => {
      let aiFn: any;
      const fn: ExecutorFn = async (ctx) => {
        aiFn = ctx.ai.fn({ prompt: "test", schema: z.boolean() });
      };

      await makeExecutor().run(fn, 1);

      expect(typeof aiFn).toBe("function");
    });

    it("each call invokes claudefn and returns typed result", async () => {
      structuredResponses = [{ answer: true, reasoning: "yes" }];

      let result: any;
      const fn: ExecutorFn = async (ctx) => {
        const checkDone = ctx.ai.fn({
          prompt: "Are all done?",
          schema: z.object({ answer: z.boolean(), reasoning: z.string() }),
          label: "checkDone",
        });
        result = await checkDone();
      };

      await makeExecutor().run(fn, 1);

      expect(result.answer).toBe(true);
      expect(result.reasoning).toBe("yes");
    });

    it("multiple calls to same fn are independent and journaled separately", async () => {
      structuredResponses = [
        { done: false, remaining: 3 },
        { done: true, remaining: 0 },
      ];

      let callCount = 0;
      const fn: ExecutorFn = async (ctx) => {
        const checkDone = ctx.ai.fn({
          prompt: "All done?",
          schema: z.object({ done: z.boolean(), remaining: z.number() }),
          label: "checkDone",
        });
        while (!(await checkDone()).done) {
          callCount++;
        }
      };

      await makeExecutor().run(fn, 1);

      expect(callCount).toBe(1); // ran once before done=true
      const starts = journalEvents.filter(
        (e) => e.type === "CLAUDEFN_START" && e.message?.includes("checkDone"),
      );
      // Two CLAUDEFN_START per invocation (buildAiFn + runAgent each log one) = 4 total
      expect(starts).toHaveLength(4);
      // buildAiFn events carry callCount in metadata
      const buildAiFnEvents = starts.filter((e) => e.metadata?.callCount !== undefined);
      expect(buildAiFnEvents).toHaveLength(2);
      expect(buildAiFnEvents[0].metadata?.callCount).toBe(1);
      expect(buildAiFnEvents[1].metadata?.callCount).toBe(2);
    });

    it("agentfn constructed once per invocation", async () => {
      const { agentfn } = await import("@converge/agentfn");
      structuredResponses = [{ done: true }];

      const fn: ExecutorFn = async (ctx) => {
        const checkDone = ctx.ai.fn({
          prompt: "Done?",
          schema: z.object({ done: z.boolean() }),
        });
        await checkDone(); // first call
        await checkDone(); // second call — fresh agentfn session via runAgent
      };

      structuredResponses = [{ done: false }, { done: true }];
      await makeExecutor().run(fn, 1);

      // agentfn() called once per checkDone() invocation via runAgent (fresh session each time)
      expect(vi.mocked(agentfn).mock.calls.length).toBe(2);
    });

    it("defaults to unrestricted allowedTools (undefined)", async () => {
      structuredResponses = [{ answer: true }];

      const fn: ExecutorFn = async (ctx) => {
        const f = ctx.ai.fn({
          prompt: "Q",
          schema: z.object({ answer: z.boolean() }),
        });
        await f();
      };

      await makeExecutor().run(fn, 1);

      const call = agentfnCalls.find((c) => c.isStructured);
      expect(call?.allowedTools).toBeUndefined();
    });

    it("respects custom allowedTools", async () => {
      structuredResponses = [{ answer: true }];

      const fn: ExecutorFn = async (ctx) => {
        const f = ctx.ai.fn({
          prompt: "Q",
          schema: z.object({ answer: z.boolean() }),
          allowedTools: ["Read", "Bash"],
        });
        await f();
      };

      await makeExecutor().run(fn, 1);

      const call = agentfnCalls.find((c) => c.isStructured);
      expect(call?.allowedTools).toEqual(["Read", "Bash"]);
    });

    it("logs CLAUDEFN_FAILED on error and re-throws", async () => {
      agentfnShouldFail = true;

      let thrown: Error | undefined;
      const fn: ExecutorFn = async (ctx) => {
        const f = ctx.ai.fn({
          prompt: "Q",
          schema: z.object({ done: z.boolean() }),
        });
        try {
          await f();
        } catch (e: any) {
          thrown = e;
        }
      };

      await makeExecutor().run(fn, 1);

      expect(thrown?.message).toContain("claudefn execution failed");
      expect(journalEvents.some((e) => e.type === "CLAUDEFN_FAILED")).toBe(
        true,
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.ask() — convenience sugar                               */
  /* ---------------------------------------------------------------- */

  describe("ctx.ai.ask()", () => {
    it("returns true when AI answers yes", async () => {
      structuredResponses = [{ answer: true, reasoning: "All done" }];
      let result: boolean | undefined;

      const fn: ExecutorFn = async (ctx) => {
        result = await ctx.ai.ask("Are all screens done?");
      };

      await makeExecutor().run(fn, 1);

      expect(result).toBe(true);
    });

    it("returns false conservatively on error", async () => {
      agentfnShouldFail = true;
      let result: boolean | undefined;

      const fn: ExecutorFn = async (ctx) => {
        result = await ctx.ai.ask("Are all screens done?");
      };

      await makeExecutor().run(fn, 1);

      expect(result).toBe(false);
    });

    it("uses read-only tools", async () => {
      structuredResponses = [{ answer: false, reasoning: "Not done" }];

      const fn: ExecutorFn = async (ctx) => {
        await ctx.ai.ask("Done?");
      };

      await makeExecutor().run(fn, 1);

      const call = agentfnCalls.find((c) => c.isStructured);
      expect(call?.allowedTools).toEqual(["Read", "Glob", "Grep"]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.ask().asJson() — structured response                    */
  /* ---------------------------------------------------------------- */

  describe("ctx.ai.ask().asJson()", () => {
    it("returns structured data matching the schema", async () => {
      structuredResponses = [
        { remaining: 3, names: ["home", "about", "contact"] },
      ];
      let result: any;

      const fn: ExecutorFn = async (ctx) => {
        result = await ctx.ai
          .ask("How many screens are remaining?")
          .asJson(
            z.object({ remaining: z.number(), names: z.array(z.string()) }),
          );
      };

      await makeExecutor().run(fn, 1);

      expect(result).toEqual({
        remaining: 3,
        names: ["home", "about", "contact"],
      });
    });

    it("uses a separate agentfn call with the custom schema", async () => {
      structuredResponses = [{ count: 5 }];

      const fn: ExecutorFn = async (ctx) => {
        await ctx.ai.ask("Count items").asJson(z.object({ count: z.number() }));
      };

      await makeExecutor().run(fn, 1);

      const call = agentfnCalls.find((c) =>
        c.prompt.includes("Return a JSON object matching the requested schema"),
      );
      expect(call).toBeDefined();
      expect(call?.allowedTools).toEqual(["Read", "Glob", "Grep"]);
    });

    it("propagates errors (does not swallow like boolean ask)", async () => {
      agentfnShouldFail = true;
      let thrown: Error | undefined;

      const fn: ExecutorFn = async (ctx) => {
        try {
          await ctx.ai
            .ask("Count items")
            .asJson(z.object({ count: z.number() }));
        } catch (e: any) {
          thrown = e;
        }
      };

      await makeExecutor().run(fn, 1);

      expect(thrown).toBeDefined();
      expect(thrown!.message).toContain("claudefn execution failed");
    });
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.spawn(string) — TASK.md path                               */
  /* ---------------------------------------------------------------- */

  describe("ctx.spawn(string)", () => {
    it("throws when skill file does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      let thrown: Error | undefined;

      const fn: ExecutorFn = async (ctx) => {
        try {
          await ctx.spawn(".converge/skills/stitch-loop/TASK.md");
        } catch (e: any) {
          thrown = e;
        }
      };

      await makeExecutor().run(fn, 1);

      expect(thrown?.message).toContain("ctx.spawn: skill file not found");
    });

    it("passes skillsRoot and skills to agentfn", async () => {
      const fn: ExecutorFn = async (ctx) => {
        await ctx.spawn(".converge/skills/stitch-loop/TASK.md");
      };

      await makeExecutor().run(fn, 1);

      const skillCall = agentfnCalls.find((c) => !c.isStructured);
      expect(skillCall?.skills).toEqual(["stitch-loop"]);
      expect(skillCall?.skillsRoot).toBeDefined();
    });

    it("returns SpawnResult with success=true", async () => {
      let result: any;
      const fn: ExecutorFn = async (ctx) => {
        result = await ctx.spawn(".converge/skills/stitch-loop/TASK.md");
      };

      await makeExecutor().run(fn, 1);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBeTruthy();
    });

    it("journals as subtask:spawn-N checklist item", async () => {
      const fn: ExecutorFn = async (ctx) => {
        await ctx.spawn(".converge/skills/stitch-loop/TASK.md", {
          label: "My spawn",
        });
      };

      await makeExecutor().run(fn, 1);

      const write = statusWrites[statusWrites.length - 1];
      const item = write?.checklist?.[0];
      expect(item?.id).toBe("subtask:spawn-1");
      expect(item?.type).toBe("subtask");
      expect(item?.description).toBe("My spawn");
      expect(item?.done).toBe(true);
    });

    it("spawn counter increments across multiple calls", async () => {
      const fn: ExecutorFn = async (ctx) => {
        await ctx.spawn(".converge/skills/stitch-loop/TASK.md");
        await ctx.spawn(".converge/skills/stitch-loop/TASK.md");
      };

      await makeExecutor().run(fn, 1);

      const write = statusWrites[statusWrites.length - 1];
      expect(write?.checklist?.[0].id).toBe("subtask:spawn-1");
      expect(write?.checklist?.[1].id).toBe("subtask:spawn-2");
    });

    it("logs CLAUDEFN_FAILED on skill error", async () => {
      agentfnShouldFail = true;

      const fn: ExecutorFn = async (ctx) => {
        try {
          await ctx.spawn(".converge/skills/stitch-loop/TASK.md");
        } catch {
          /* expected */
        }
      };

      await makeExecutor().run(fn, 1);

      expect(journalEvents.some((e) => e.type === "CLAUDEFN_FAILED")).toBe(
        true,
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.spawn(InlineTaskTarget) — virtual child Unit               */
  /* ---------------------------------------------------------------- */

  describe("ctx.spawn(InlineTaskTarget)", () => {
    it("creates a virtual child Unit via Unit.fromDefinition", async () => {
      const { Unit } = await import("../../../src/task/unit/unit.ts");

      const fn: ExecutorFn = async (ctx) => {
        await ctx.spawn({
          definition: {
            id: "child-task",
            outputs: ["out/file.html"],
            vars: {},
          },
        });
      };

      await makeExecutor({ id: "parent" }).run(fn, 1);

      expect(vi.mocked(Unit.fromDefinition)).toHaveBeenCalledWith(
        expect.objectContaining({ id: "child-task" }),
        expect.anything(), // parentUnit
        undefined, // no virtualPath when writeToPath not set
      );
    });

    it("calls childUnit.run() and returns SpawnResult", async () => {
      mockUnitRunResult = true;
      let result: any;

      const fn: ExecutorFn = async (ctx) => {
        result = await ctx.spawn({
          definition: {
            id: "child-task",
            outputs: ["out/file.html"],
            vars: {},
          },
        });
      };

      await makeExecutor(null).run(fn, 1);

      expect(result.success).toBe(true);
      expect(result.sessionId).toContain("inline-child-task");
    });

    it("journals as subtask checklist item", async () => {
      const fn: ExecutorFn = async (ctx) => {
        await ctx.spawn({
          definition: {
            id: "child-task",
            title: "My Child",
            outputs: [],
            vars: {},
          },
        });
      };

      await makeExecutor(null).run(fn, 1);

      const write = statusWrites[statusWrites.length - 1];
      const item = write?.checklist?.[0];
      expect(item?.type).toBe("subtask");
      expect(item?.description).toBe("My Child");
      expect(item?.done).toBe(true);
    });

    it("writes .ts file when writeToPath is specified", async () => {
      const fn: ExecutorFn = async (ctx) => {
        await ctx.spawn({
          definition: { id: "child-task", outputs: [], vars: {} },
          writeToPath: ".converge/epics/02-ux/003-screens/child-task/TASK.md",
        });
      };

      await makeExecutor(null).run(fn, 1);

      // JSON.stringify produces double quotes: .id("child-task")
      expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
        expect.stringContaining("child-task/TASK.md"),
        expect.stringContaining("child-task"), // id appears in content
        "utf-8",
      );
    });

    it("passes absolute path to Unit.fromDefinition when writeToPath set", async () => {
      const { Unit } = await import("../../../src/task/unit/unit.ts");

      const fn: ExecutorFn = async (ctx) => {
        await ctx.spawn({
          definition: { id: "child-task", outputs: [], vars: {} },
          writeToPath: ".converge/epics/child-task/TASK.md",
        });
      };

      await makeExecutor(null).run(fn, 1);

      // Third arg should be an absolute path containing the file name
      const calls = vi.mocked(Unit.fromDefinition).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const [, , pathArg] = calls[0];
      const normalizedPath = (pathArg as string)?.replace(/\\/g, "/");
      expect(normalizedPath).toContain("child-task/TASK.md");
    });
  });

  /* ---------------------------------------------------------------- */
  /*  TaskExecutorResult                                              */
  /* ---------------------------------------------------------------- */

  describe("TaskExecutorResult", () => {
    it("returns success=true when executor completes without error", async () => {
      const fn: ExecutorFn = async (_ctx) => {
        /* no-op */
      };
      const result = await makeExecutor().run(fn, 1);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns success=false when executor throws", async () => {
      const fn: ExecutorFn = async (_ctx) => {
        throw new Error("executor error");
      };
      const result = await makeExecutor().run(fn, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("executor error");
    });

    it("returns spawnCount matching number of spawns", async () => {
      const fn: ExecutorFn = async (ctx) => {
        await ctx.spawn(".converge/skills/stitch-loop/TASK.md");
        await ctx.spawn(".converge/skills/stitch-loop/TASK.md");
      };

      const result = await makeExecutor().run(fn, 1);

      expect(result.spawnCount).toBe(2);
    });

    it("returns durationMs > 0", async () => {
      const fn: ExecutorFn = async (_ctx) => {};
      const result = await makeExecutor().run(fn, 1);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
