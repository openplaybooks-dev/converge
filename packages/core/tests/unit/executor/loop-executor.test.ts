/**
 * LoopFunctionExecutor Unit Tests
 *
 * Tests the programmatic loop execution primitive.
 * The loop handler is a TypeScript function that receives a LoopContext
 * with ctx.loop.spawn(), ctx.loop.done(), ctx.ai.ask(), etc.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { z } from "zod";
import { LoopFunctionExecutor } from "../../../src/executor/loop-executor.ts";
import {
  LOOP_DONE_SIGNAL,
  taskDef,
  type LoopFn,
  type LoopContext,
} from "../../../src/config/task-definition.ts";

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
  isEvaluator: boolean;
  prompt: string;
  skillsRoot?: string;
  skills?: string[];
  allowedTools?: string[];
}
const agentfnCalls: AgentFnCall[] = [];
let skillShouldFail = false;
let askAnswers: boolean[] = []; // queue of answers for ai.ask()
let jsonResponses: any[] = []; // queue of structured responses for ai.ask().asJson()

vi.mock("@converge/agentfn", () => ({
  agentfn: vi.fn((opts: any) => {
    const isEvaluator = !!opts.schema;
    agentfnCalls.push({
      isEvaluator,
      prompt: opts.prompt ?? "",
      skillsRoot: opts.skillsRoot,
      skills: opts.skills,
      allowedTools: opts.allowedTools,
    });

    return async () => {
      if (!isEvaluator && skillShouldFail) {
        throw new Error("skill execution failed");
      }
      if (isEvaluator) {
        // If jsonResponses has entries, use those (for asJson calls)
        if (jsonResponses.length > 0) {
          const data = jsonResponses.shift();
          return {
            data,
            raw: "",
            durationMs: 30,
            sessionId: "json-session",
            provider: "claude",
          };
        }
        const answer = askAnswers.shift() ?? false;
        return {
          data: { answer, reasoning: answer ? "Done" : "Not yet" },
          raw: "",
          durationMs: 30,
          sessionId: "eval-session",
          provider: "claude",
        };
      }
      return {
        data: "output text",
        raw: "output text",
        durationMs: 100,
        sessionId: "skill-session",
        provider: "claude",
      };
    };
  }),
}));

// Capture journal writes
const journalEvents: Array<{ type: string; message: string; metadata?: any }> =
  [];
const statusWrites: any[] = [];
const todoWrites: any[] = [];

vi.mock("../../../src/journal/writer.ts", () => ({
  logTaskEvent: vi.fn(async (_d, _e, _t, eventType, message, metadata) => {
    journalEvents.push({ type: eventType, message, metadata });
  }),
  writeTaskStatus: vi.fn(async (_d, _e, _t, status) => {
    statusWrites.push(JSON.parse(JSON.stringify(status)));
  }),
  writeTaskTodo: vi.fn(async (_d, _e, _t, status) => {
    todoWrites.push(JSON.parse(JSON.stringify(status)));
  }),
}));

vi.mock("../../../src/journal/structure.ts", () => ({
  getJournalStructure: vi.fn(() => ({
    root: "/project/.converge/journal",
    project: "/project/.converge/journal/project",
    epic: "/project/.converge/journal/tasks/02-epic",
    task: "/project/.converge/journal/tasks/02-epic/tasks/003-task",
  })),
  getTaskCorrectionsDir: vi.fn(
    () => "/project/.converge/journal/tasks/02-epic/tasks/003-task/corrections",
  ),
}));

// Unit mock — used by spawn factory and path-ref forms
let mockUnitRunResult = true;
vi.mock("../../../src/task/unit/unit.ts", () => ({
  Unit: {
    fromDefinition: vi.fn((_def: any, _parent: any, _path?: any) => ({
      run: vi.fn(async () => mockUnitRunResult),
    })),
    fromPath: vi.fn(async (_path: any, _parent?: any) => ({
      run: vi.fn(async () => mockUnitRunResult),
    })),
  },
}));

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

const JOURNAL_CTX = {
  epicId: "02-ux-ui-design",
  taskId: "003-generate-all-screens",
};

const PROJECT_DIR = "/project";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeExecutor() {
  return new LoopFunctionExecutor(PROJECT_DIR, JOURNAL_CTX);
}

/** Simple loop: spawns a skill, asks AI, done when askAnswers[0] is true */
function simpleLoopFn(
  skillPath = ".converge/skills/stitch-loop/TASK.md",
): LoopFn {
  return async (ctx) => {
    await ctx.loop.spawn(skillPath);
    const done = await ctx.ai.ask("Are all screens done?");
    if (done) return ctx.loop.done();
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("LoopFunctionExecutor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentfnCalls.length = 0;
    journalEvents.length = 0;
    statusWrites.length = 0;
    todoWrites.length = 0;
    skillShouldFail = false;
    askAnswers = [];
    jsonResponses = [];
    vi.mocked(existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    // Do NOT call vi.restoreAllMocks() here — it would wipe vi.fn() implementations
    // set in vi.mock() factories (claudefn, logTaskEvent, etc.), breaking subsequent tests.
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.loop.done() and ctx.loop.continue()                        */
  /* ---------------------------------------------------------------- */

  describe("LOOP_DONE_SIGNAL", () => {
    it("ctx.loop.done() returns LOOP_DONE_SIGNAL", async () => {
      let capturedCtx: LoopContext | undefined;
      const fn: LoopFn = async (ctx) => {
        capturedCtx = ctx;
        return ctx.loop.done();
      };

      const executor = makeExecutor();
      await executor.run(fn);

      expect(capturedCtx!.loop.done()).toBe(LOOP_DONE_SIGNAL);
    });

    it("loop exits when handler returns ctx.loop.done()", async () => {
      const fn: LoopFn = async (ctx) => ctx.loop.done();
      const result = await makeExecutor().run(fn);

      expect(result.done).toBe(true);
      expect(result.iterationsRun).toBe(1);
    });

    it("loop continues when handler returns void", async () => {
      let calls = 0;
      const fn: LoopFn = async (ctx) => {
        calls++;
        if (calls >= 2) return ctx.loop.done();
        // implicit continue (return undefined)
      };

      const result = await makeExecutor().run(fn, 10);

      expect(result.done).toBe(true);
      expect(result.iterationsRun).toBe(2);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.loop.isInitial and ctx.loop.iteration                      */
  /* ---------------------------------------------------------------- */

  describe("ctx.loop properties", () => {
    it("isInitial is true on first iteration only", async () => {
      const initialValues: boolean[] = [];
      let calls = 0;

      const fn: LoopFn = async (ctx) => {
        initialValues.push(ctx.loop.isInitial);
        if (++calls >= 3) return ctx.loop.done();
      };

      await makeExecutor().run(fn, 10);

      expect(initialValues).toEqual([true, false, false]);
    });

    it("iteration increments from 1", async () => {
      const iterations: number[] = [];
      let calls = 0;

      const fn: LoopFn = async (ctx) => {
        iterations.push(ctx.loop.iteration);
        if (++calls >= 3) return ctx.loop.done();
      };

      await makeExecutor().run(fn, 10);

      expect(iterations).toEqual([1, 2, 3]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.loop.spawn()                                               */
  /* ---------------------------------------------------------------- */

  describe("ctx.loop.spawn()", () => {
    it("returns not-done when skill file does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        return ctx.loop.done();
      };

      // run() catches the spawn error internally and returns { done: false }
      const result = await makeExecutor().run(fn);
      expect(result.done).toBe(false);
      expect(result.maxReached).toBe(false);
    });

    it("passes skillsRoot and skills for the skill path", async () => {
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const skillCall = agentfnCalls.find((c) => !c.isEvaluator);
      expect(skillCall?.skills).toEqual(["stitch-loop"]);
      expect(skillCall?.skillsRoot).toBeDefined();
    });

    it("uses custom prompt when provided in SpawnOptions", async () => {
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md", {
          prompt: "My custom prompt",
        });
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const skillCall = agentfnCalls.find((c) => !c.isEvaluator);
      expect(skillCall?.prompt).toBe("My custom prompt");
    });

    it("passes allowedTools from SpawnOptions", async () => {
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md", {
          allowedTools: ["Read", "Bash"],
        });
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const skillCall = agentfnCalls.find((c) => !c.isEvaluator);
      expect(skillCall?.allowedTools).toEqual(["Read", "Bash"]);
    });

    it("returns SpawnResult with success=true on success", async () => {
      let result: any;
      const fn: LoopFn = async (ctx) => {
        result = await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.sessionId).toBeTruthy();
    });

    it("multiple spawn calls per iteration get unique IDs", async () => {
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const subtasks = todoWrites[todoWrites.length - 1]?.checklist ?? [];
      expect(subtasks[0].id).toBe("subtask:spawn-1");
      expect(subtasks[1].id).toBe("subtask:spawn-2");
    });

    it("spawn IDs continue incrementing across iterations", async () => {
      let calls = 0;
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        if (++calls >= 2) return ctx.loop.done();
      };

      await makeExecutor().run(fn, 10);

      const subtasks = todoWrites[todoWrites.length - 1]?.checklist ?? [];
      expect(subtasks[0].id).toBe("subtask:spawn-1");
      expect(subtasks[1].id).toBe("subtask:spawn-2");
    });

    it("journals spawn as a subtask checklist entry", async () => {
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md", {
          label: "My screen generation",
        });
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const finalTodo = todoWrites[todoWrites.length - 1];
      expect(finalTodo.checklist[0].type).toBe("subtask");
      expect(finalTodo.checklist[0].description).toBe("My screen generation");
      expect(finalTodo.checklist[0].done).toBe(true);
    });

    it("marks spawn checklist item done after completion", async () => {
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const finalTodo = todoWrites[todoWrites.length - 1];
      expect(finalTodo.checklist[0].done).toBe(true);
      expect(finalTodo.checklist[0].doneAt).toBeTruthy();
    });

    it("propagates spawn error to the loop handler", async () => {
      skillShouldFail = true;

      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        return ctx.loop.done();
      };

      const result = await makeExecutor().run(fn);

      // Handler threw → loop returns not-done
      expect(result.done).toBe(false);
      expect(result.maxReached).toBe(false);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.ask()                                                   */
  /* ---------------------------------------------------------------- */

  describe("ctx.ai.ask()", () => {
    it("returns true when AI answers yes", async () => {
      askAnswers = [true];
      let answer: boolean | undefined;

      const fn: LoopFn = async (ctx) => {
        answer = await ctx.ai.ask("Are all screens done?");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      expect(answer).toBe(true);
    });

    it("returns false when AI answers no", async () => {
      askAnswers = [false];
      let answer: boolean | undefined;

      const fn: LoopFn = async (ctx) => {
        answer = await ctx.ai.ask("Are all screens done?");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      expect(answer).toBe(false);
    });

    it("restricts evaluator to Read, Glob, and Grep tools", async () => {
      askAnswers = [true];

      const fn: LoopFn = async (ctx) => {
        await ctx.ai.ask("Any question");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const evalCall = agentfnCalls.find((c) => c.isEvaluator);
      expect(evalCall?.allowedTools).toEqual(["Read", "Glob", "Grep"]);
    });

    it("passes the question into the evaluator prompt", async () => {
      askAnswers = [true];

      const fn: LoopFn = async (ctx) => {
        await ctx.ai.ask("Is the homepage complete?");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const evalCall = agentfnCalls.find((c) => c.isEvaluator);
      expect(evalCall?.prompt).toContain("Is the homepage complete?");
    });

    it("returns false (conservative) when evaluator throws", async () => {
      const { agentfn } = await import("@converge/agentfn");
      const originalImpl = vi.mocked(agentfn).getMockImplementation();
      let evalCalls = 0;

      vi.mocked(agentfn).mockImplementation((opts: any) => {
        const isEvaluator = !!opts.schema;
        return async () => {
          if (isEvaluator) {
            evalCalls++;
            if (evalCalls === 1) throw new Error("network error");
            return {
              data: { answer: true, reasoning: "done" },
              raw: "",
              durationMs: 10,
              sessionId: "e",
              provider: "claude",
            };
          }
          return {
            data: "",
            raw: "",
            durationMs: 10,
            sessionId: "s",
            provider: "claude",
          };
        };
      });

      let calls = 0;
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        const done = await ctx.ai.ask("Done?");
        if (done) return ctx.loop.done();
        if (++calls >= 2) return ctx.loop.done(); // safety exit
      };

      const result = await makeExecutor().run(fn, 5);

      // Restore the factory mock so subsequent tests are not affected
      if (originalImpl) vi.mocked(agentfn).mockImplementation(originalImpl);
      else vi.mocked(agentfn).mockReset();

      // First ask threw (returns false → continue), second ask returned true → done
      expect(result.done).toBe(true);
      expect(result.iterationsRun).toBe(2);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.ask().asJson()                                          */
  /* ---------------------------------------------------------------- */

  describe("ctx.ai.ask().asJson()", () => {
    it("returns structured data matching the schema", async () => {
      jsonResponses = [{ remaining: 2, screens: ["about", "contact"] }];
      let result: any;

      const fn: LoopFn = async (ctx) => {
        result = await ctx.ai
          .ask("How many screens are left?")
          .asJson(
            z.object({ remaining: z.number(), screens: z.array(z.string()) }),
          );
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      expect(result).toEqual({ remaining: 2, screens: ["about", "contact"] });
    });

    it("uses a separate agentfn call with the custom schema", async () => {
      jsonResponses = [{ count: 5 }];

      const fn: LoopFn = async (ctx) => {
        await ctx.ai.ask("Count items").asJson(z.object({ count: z.number() }));
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const call = agentfnCalls.find((c) =>
        c.prompt.includes("Return a JSON object matching the requested schema"),
      );
      expect(call).toBeDefined();
      expect(call?.allowedTools).toEqual(["Read", "Glob", "Grep"]);
    });

    it("logs CLAUDEFN_START and CLAUDEFN_COMPLETE events", async () => {
      jsonResponses = [{ done: true }];

      const fn: LoopFn = async (ctx) => {
        await ctx.ai.ask("Check").asJson(z.object({ done: z.boolean() }));
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const startEvent = journalEvents.find((e) =>
        e.message.includes("ai.ask.asJson"),
      );
      expect(startEvent).toBeDefined();
      expect(startEvent?.type).toBe("CLAUDEFN_START");
    });
  });

  /* ---------------------------------------------------------------- */
  /*  maxIterations                                                   */
  /* ---------------------------------------------------------------- */

  describe("maxIterations", () => {
    it("stops after maxIterations when never done", async () => {
      const fn: LoopFn = async (_ctx) => {
        /* never calls done() */
      };

      const result = await makeExecutor().run(fn, 3);

      expect(result.done).toBe(false);
      expect(result.maxReached).toBe(true);
      expect(result.iterationsRun).toBe(3);
    });

    it("defaults to 20 when not specified", async () => {
      const fn: LoopFn = async (_ctx) => {
        /* never calls done() */
      };

      const result = await makeExecutor().run(fn);

      expect(result.iterationsRun).toBe(20);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Journal logging                                                 */
  /* ---------------------------------------------------------------- */

  describe("journal logging", () => {
    it("logs TASK_START and TASK_COMPLETE for each iteration", async () => {
      let calls = 0;
      const fn: LoopFn = async (ctx) => {
        if (++calls >= 2) return ctx.loop.done();
      };

      await makeExecutor().run(fn, 10);

      const starts = journalEvents.filter(
        (e) => e.type === "TASK_START" && e.message?.includes("Loop iteration"),
      );
      const completes = journalEvents.filter(
        (e) =>
          e.type === "TASK_COMPLETE" && e.message?.includes("Loop iteration"),
      );

      expect(starts).toHaveLength(2);
      expect(completes).toHaveLength(2);
      expect(starts[0].metadata?.iteration).toBe(1);
      expect(starts[1].metadata?.iteration).toBe(2);
    });

    it("logs CLAUDEFN_START / CLAUDEFN_COMPLETE around each spawn", async () => {
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const starts = journalEvents.filter((e) => e.type === "CLAUDEFN_START");
      const completes = journalEvents.filter(
        (e) => e.type === "CLAUDEFN_COMPLETE",
      );

      expect(starts.length).toBeGreaterThanOrEqual(1);
      expect(completes.length).toBeGreaterThanOrEqual(1);
    });

    it("logs CLAUDEFN_FAILED when spawn throws", async () => {
      skillShouldFail = true;

      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const failed = journalEvents.filter((e) => e.type === "CLAUDEFN_FAILED");
      expect(failed.length).toBeGreaterThan(0);
    });

    it("logs TASK_FAILED when handler throws", async () => {
      skillShouldFail = true;

      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        // spawn threw, so this line never runs but fn.catch in executor handles it
        return ctx.loop.done();
      };

      await makeExecutor().run(fn);

      const taskFailed = journalEvents.filter((e) => e.type === "TASK_FAILED");
      expect(taskFailed.length).toBeGreaterThan(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Status / Todo writes                                            */
  /* ---------------------------------------------------------------- */

  describe("status and todo writes", () => {
    it("final status is complete when done=true", async () => {
      const fn: LoopFn = async (ctx) => ctx.loop.done();
      await makeExecutor().run(fn);

      const final = statusWrites[statusWrites.length - 1];
      expect(final.status).toBe("complete");
    });

    it("final status is failed when maxReached", async () => {
      const fn: LoopFn = async () => {
        /* never done */
      };
      await makeExecutor().run(fn, 2);

      const final = statusWrites[statusWrites.length - 1];
      expect(final.status).toBe("failed");
      expect(final.error).toContain("2 iterations");
    });

    it("todo checklist grows with completed spawn entries", async () => {
      let calls = 0;
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        if (++calls >= 2) return ctx.loop.done();
      };

      await makeExecutor().run(fn, 10);

      const final = todoWrites[todoWrites.length - 1];
      expect(final.checklist).toHaveLength(2);
      expect(final.checklist.every((i: any) => i.done)).toBe(true);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Extended spawn forms                                            */
  /* ---------------------------------------------------------------- */

  describe("ctx.loop.spawn() — extended forms", () => {
    beforeEach(() => {
      mockUnitRunResult = true;
      vi.mocked(existsSync).mockReturnValue(true);
    });

    it("factory form calls Unit.fromDefinition with the result of calling the factory", async () => {
      const { Unit } = await import("../../../src/task/unit/unit.ts");

      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(() => taskDef().id("child-task").build());
        return ctx.loop.done();
      };

      await makeExecutor().run(fn, 1);

      expect(vi.mocked(Unit.fromDefinition)).toHaveBeenCalledWith(
        expect.objectContaining({ id: "child-task" }),
        undefined,
        undefined,
      );
    });

    it("factory form succeeds and journals a checklist entry", async () => {
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(() => taskDef().id("child-task").build());
        return ctx.loop.done();
      };

      const result = await makeExecutor().run(fn, 1);

      expect(result.done).toBe(true);
      const final = statusWrites[statusWrites.length - 1];
      expect(final.checklist).toHaveLength(1);
      expect(final.checklist[0].done).toBe(true);
    });

    it("path-ref form calls Unit.fromPath with the resolved absolute path", async () => {
      const { Unit } = await import("../../../src/task/unit/unit.ts");

      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(
          taskDef().fromPath(".converge/tasks/my-task/TASK.md"),
        );
        return ctx.loop.done();
      };

      await makeExecutor().run(fn, 1);

      expect(vi.mocked(Unit.fromPath)).toHaveBeenCalledWith(
        expect.stringContaining("TASK.md"),
        undefined,
      );
    });

    it("path-ref form throws when file does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(taskDef().fromPath(".converge/tasks/missing.ts"));
        return ctx.loop.done();
      };

      const result = await makeExecutor().run(fn, 1);
      expect(result.done).toBe(false);
    });

    it("taskDef().fromPath() returns a PathRefTarget synchronously without I/O", () => {
      const ref = taskDef().fromPath(".converge/tasks/my-task/TASK.md");
      expect(ref).toEqual({
        _type: "path-ref",
        path: ".converge/tasks/my-task/TASK.md",
      });
    });

    it("string form routes to agentfn with native skill loading", async () => {
      const fn: LoopFn = async (ctx) => {
        await ctx.loop.spawn(".converge/skills/stitch-loop/TASK.md");
        return ctx.loop.done();
      };

      await makeExecutor().run(fn, 1);

      const skillCall = agentfnCalls.find((c) => c.skills !== undefined);
      expect(skillCall?.skills).toEqual(["stitch-loop"]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Queue-based API: enqueue / loop.await / loop.next               */
  /* ---------------------------------------------------------------- */

  describe("ctx.enqueue + ctx.loop.await + ctx.loop.next", () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(true);
    });

    it("enqueue returns a TaskHandle with a string id", async () => {
      let handle: any;
      const fn: LoopFn = async (ctx) => {
        handle = ctx.enqueue(
          taskDef().id("t").prompt("x").skills(["stitch-loop"]),
        );
        await ctx.loop.await(handle.id);
        return ctx.loop.done();
      };

      await makeExecutor().run(fn, 1);

      expect(typeof handle.id).toBe("string");
      expect(handle.id.length).toBeGreaterThan(0);
    });

    it("loop.await executes the enqueued task and resolves SpawnResult", async () => {
      let result: any;
      const fn: LoopFn = async (ctx) => {
        const task = ctx.enqueue(
          taskDef().id("t").prompt("x").skills(["stitch-loop"]),
        );
        result = await ctx.loop.await(task.id);
        return ctx.loop.done();
      };

      await makeExecutor().run(fn, 1);

      expect(result).toMatchObject({ success: true });
    });

    it("loop.await throws when id is not found in queue", async () => {
      let error: any;
      const fn: LoopFn = async (ctx) => {
        try {
          await ctx.loop.await("nonexistent-id");
        } catch (e) {
          error = e;
        }
        return ctx.loop.done();
      };

      await makeExecutor().run(fn, 1);

      expect(error?.message).toContain("nonexistent-id");
    });

    it("loop.await removes the task from queue (cannot await same id twice)", async () => {
      let secondError: any;
      const fn: LoopFn = async (ctx) => {
        const task = ctx.enqueue(
          taskDef().id("t").prompt("x").skills(["stitch-loop"]),
        );
        await ctx.loop.await(task.id);
        try {
          await ctx.loop.await(task.id); // second await should fail
        } catch (e) {
          secondError = e;
        }
        return ctx.loop.done();
      };

      await makeExecutor().run(fn, 1);

      expect(secondError?.message).toContain("no task found");
    });

    it("loop.next() returns void and allows iteration to continue", async () => {
      let iterations = 0;
      const fn: LoopFn = async (ctx) => {
        iterations++;
        if (iterations >= 2) return ctx.loop.done();
        return ctx.loop.next();
      };

      const result = await makeExecutor().run(fn, 5);

      expect(result.iterationsRun).toBe(2);
      expect(result.done).toBe(true);
    });

    it("enqueue ids are unique across iterations", async () => {
      const ids: string[] = [];
      let count = 0;
      const fn: LoopFn = async (ctx) => {
        const h = ctx.enqueue(
          taskDef().id("t").prompt("x").skills(["stitch-loop"]),
        );
        ids.push(h.id);
        await ctx.loop.await(h.id);
        if (++count >= 2) return ctx.loop.done();
      };

      await makeExecutor().run(fn, 5);

      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
