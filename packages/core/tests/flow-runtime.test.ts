/**
 * RFC 0050 — durable code-first runtime (Increment A).
 *
 * These tests define the durable-replay mechanism hermetically: tasks are
 * supplied via an in-memory registry whose `run()` bumps a shared execution
 * counter, so we can assert exactly which steps executed vs. replayed. The
 * real `executeTask` integration (skills/agents/outputs) is layered in
 * Increment B and is NOT exercised here.
 *
 * The headline guarantee under test: a flow is resumable at any point in the
 * middle. Kill it halfway, re-run, and the completed prefix replays from the
 * journal without re-executing; only the un-journaled (or edited) tail runs.
 */

import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runFlow, loadFlowModule } from "../src/run/flow/index.js";
import type { FlowTaskRegistry } from "../src/run/flow/index.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "converge-flow-test-"));
});
afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

/** Build a registry whose tasks bump `counter[id]` each real execution. */
function makeRegistry(
  defs: Record<
    string,
    {
      version?: string;
      run: (params: any) => any;
    }
  >,
  counter: Record<string, number>,
): FlowTaskRegistry {
  const reg: FlowTaskRegistry = new Map();
  for (const [id, def] of Object.entries(defs)) {
    reg.set(id, {
      version: def.version,
      run: async (params: any) => {
        counter[id] = (counter[id] ?? 0) + 1;
        return def.run(params);
      },
    });
  }
  return reg;
}

describe("RFC 0050 flow runtime — Task execution + chaining", () => {
  it("Task returns its output JSON and chains JSON into the next step's params", async () => {
    const counter: Record<string, number> = {};
    const tasks = makeRegistry(
      {
        "01-plan": { run: () => ({ screens: ["home", "feed"] }) },
        "02-build": { run: (p: any) => ({ built: p.screens.length }) },
      },
      counter,
    );

    const result = await runFlow(
      {
        name: "chain",
        flow: async (ctx) => {
          const plan = await ctx.Task("01-plan");
          const out = await ctx.Task("02-build", { screens: plan.screens });
          return out;
        },
      },
      { projectDir: tmpDir, tasks },
    );

    expect(result).toEqual({ built: 2 });
    expect(counter).toEqual({ "01-plan": 1, "02-build": 1 });
  });
});

describe("RFC 0050 flow runtime — resume in the middle (headline)", () => {
  it("partial/crash: re-run replays the completed prefix and continues at the failure point", async () => {
    const counter: Record<string, number> = {};
    const defs = {
      a: { run: () => ({ v: "a" }) },
      b: { run: () => ({ v: "b" }) },
      c: { run: () => ({ v: "c" }) },
    };

    // First run: step `b` throws AFTER `a` has been journaled.
    const boom = makeRegistry(defs, counter);
    boom.set("b", {
      run: async () => {
        counter.b = (counter.b ?? 0) + 1;
        throw new Error("kaboom");
      },
    });

    await expect(
      runFlow(
        {
          name: "crash",
          flow: async (ctx) => {
            await ctx.Task("a");
            await ctx.Task("b");
            await ctx.Task("c");
            return "done";
          },
        },
        { projectDir: tmpDir, tasks: boom },
      ),
    ).rejects.toThrow(/kaboom/);

    expect(counter).toEqual({ a: 1, b: 1 }); // a ran, b attempted, c never reached

    // Second run (resume): `a` replays from journal (no re-exec); `b`+`c` run.
    const counter2: Record<string, number> = {};
    const ok = makeRegistry(defs, counter2);
    const result = await runFlow(
      {
        name: "crash",
        flow: async (ctx) => {
          await ctx.Task("a");
          await ctx.Task("b");
          await ctx.Task("c");
          return "done";
        },
      },
      { projectDir: tmpDir, tasks: ok, resume: true },
    );

    expect(result).toBe("done");
    expect(counter2.a).toBeUndefined(); // replayed, NOT re-executed
    expect(counter2.b).toBe(1);
    expect(counter2.c).toBe(1);
  });

  it("no-op re-run: every step replays from the journal, nothing executes", async () => {
    const defs = { a: { run: () => 1 }, b: { run: () => 2 } };
    const c1: Record<string, number> = {};
    const flow = {
      name: "noop",
      flow: async (ctx: any) => {
        await ctx.Task("a");
        await ctx.Task("b");
        return "ok";
      },
    };

    await runFlow(flow, { projectDir: tmpDir, tasks: makeRegistry(defs, c1) });
    expect(c1).toEqual({ a: 1, b: 1 });

    const c2: Record<string, number> = {};
    const result = await runFlow(flow, {
      projectDir: tmpDir,
      tasks: makeRegistry(defs, c2),
      resume: true,
    });
    expect(result).toBe("ok");
    expect(c2).toEqual({}); // all replayed
  });

  it("edit a step: that step + downstream re-run; earlier steps replay", async () => {
    const flow = {
      name: "edit",
      flow: async (ctx: any) => {
        const a = await ctx.Task("a");
        const b = await ctx.Task("b", { from: a });
        const c = await ctx.Task("c", { from: b });
        return c;
      },
    };

    const c1: Record<string, number> = {};
    await runFlow(flow, {
      projectDir: tmpDir,
      tasks: makeRegistry(
        {
          a: { run: () => ({ n: 1 }) },
          b: { version: "v1", run: (p: any) => ({ n: p.from.n + 1 }) },
          c: { run: (p: any) => ({ n: p.from.n + 1 }) },
        },
        c1,
      ),
    });
    expect(c1).toEqual({ a: 1, b: 1, c: 1 });

    // Edit `b` (bump version → fingerprint changes). `a` replays; `b` re-runs;
    // `c` re-runs because its input (b's output) changed.
    const c2: Record<string, number> = {};
    await runFlow(flow, {
      projectDir: tmpDir,
      resume: true,
      tasks: makeRegistry(
        {
          a: { run: () => ({ n: 1 }) },
          b: { version: "v2", run: (p: any) => ({ n: p.from.n + 10 }) },
          c: { run: (p: any) => ({ n: p.from.n + 1 }) },
        },
        c2,
      ),
    });
    expect(c2.a).toBeUndefined(); // unchanged → replayed
    expect(c2.b).toBe(1); // edited → re-ran
    expect(c2.c).toBe(1); // input changed → re-ran
  });
});

describe("RFC 0050 flow runtime — determinism", () => {
  it("ctx.now() is journaled and replays identically", async () => {
    const flow = {
      name: "clock",
      flow: async (ctx: any) => {
        const t = ctx.now();
        await ctx.Task("a");
        return t;
      },
    };
    const defs = { a: { run: () => 1 } };

    let ticks = 1000;
    const c1: Record<string, number> = {};
    const first = await runFlow(flow, {
      projectDir: tmpDir,
      tasks: makeRegistry(defs, c1),
      clock: () => ++ticks, // advancing clock
    });

    const c2: Record<string, number> = {};
    const second = await runFlow(flow, {
      projectDir: tmpDir,
      resume: true,
      tasks: makeRegistry(defs, c2),
      clock: () => ++ticks, // would differ if not journaled
    });

    expect(second).toBe(first); // replayed the journaled now()
    expect(c2).toEqual({}); // task a replayed too
  });
});

describe("RFC 0050 flow runtime — solve-waves.js compatibility", () => {
  it("runs a bare-global script (meta + top-level await agent/Task + return) and resumes", async () => {
    // The exact shape of .claude/workflows/solve-waves.js: `export const meta`,
    // ambient globals, top-level await, a loop, and a top-level `return`.
    const src = `
export const meta = {
  name: 'waves',
  description: 'recon then fan one task per hypothesis',
  phases: [{ title: 'Recon' }, { title: 'Waves' }],
};

const topic = (args && args.topic) || 'default';
phase('Recon');
const recon = await agent('map ' + topic, { schema: {}, phase: 'Recon', agentType: 'Explore' });
const hyps = recon.hypotheses;

phase('Waves');
const results = [];
for (const h of hyps) {
  results.push(await Task({ id: 'wave', outputs: [], run: (p) => ({ tried: p.dir }) }, { dir: h }, { key: h }));
}
return { topic, waves: results.length, tried: results.map((r) => r.tried) };
`;
    const file = join(tmpDir, "waves.mjs");
    await writeFile(file, src);
    const def = await loadFlowModule(file);
    expect(def.name).toBe("waves");
    expect((def.meta as any).phases).toHaveLength(2);

    let agentCalls = 0;
    const agentBackend = async () => {
      agentCalls++;
      return { hypotheses: ["a", "b", "c"] };
    };

    const first = await runFlow(def, {
      projectDir: tmpDir,
      args: { topic: "crypto" },
      agentBackend,
    });
    expect(first).toEqual({ topic: "crypto", waves: 3, tried: ["a", "b", "c"] });
    expect(agentCalls).toBe(1);

    // Resume: agent + every wave replay from the journal.
    const second = await runFlow(def, {
      projectDir: tmpDir,
      resume: true,
      args: { topic: "crypto" },
      agentBackend, // would bump agentCalls if re-invoked
    });
    expect(second).toEqual(first);
    expect(agentCalls).toBe(1); // agent replayed, not re-called
  });
});

describe("RFC 0050 flow runtime — Task loads a real TASK.md", () => {
  it("resolves an on-disk TASK.md (outputs from frontmatter) and replays on resume", async () => {
    // Point at the real hello-world static task contract.
    const helloTasks = resolve(
      __dirname,
      "../../../examples/hello-world/.converge/playbooks/default/tasks",
    );

    let execs = 0;
    const def = {
      name: "load-taskmd",
      flow: async (ctx: any) => {
        const r = await ctx.task("01-create-greeting");
        return r;
      },
    };
    // Inject a fake executor so we don't spawn an LLM; assert the runtime
    // resolved the TASK.md (outputs come from its frontmatter) and journals it.
    const executeStep = async (taskObj: any) => {
      execs++;
      expect(taskObj.taskMdPath).toMatch(/01-create-greeting\/TASK\.md$/);
      expect(taskObj.outputs).toEqual(["output/greeting.json"]);
      // A real run writes the declared outputs; replay requires them on disk.
      await mkdir(join(tmpDir, "output"), { recursive: true });
      await writeFile(
        join(tmpDir, "output", "greeting.json"),
        JSON.stringify({ ok: true }),
      );
      return { ok: true };
    };

    const first = await runFlow(def, {
      projectDir: tmpDir,
      tasksDir: helloTasks,
      executeStep,
    });
    expect(first).toEqual({ ok: true });
    expect(execs).toBe(1);

    // Resume: the TASK.md content is unchanged → fingerprint matches → replay.
    const second = await runFlow(def, {
      projectDir: tmpDir,
      tasksDir: helloTasks,
      executeStep,
      resume: true,
    });
    expect(second).toEqual({ ok: true });
    expect(execs).toBe(1); // replayed, not re-executed
  });
});

import { readFileSync } from "node:fs";

describe("RFC 0050 flow runtime — real executor + runstate projection (Phase 1)", () => {
  it("runs a stub TASK.md via executeSingleNode, returns outputs, projects to runstate, and replays on resume", async () => {
    process.env.FLOW_TEST_OUT = join(tmpDir, "output");
    const taskDir = join(tmpDir, "tasks", "01-make-greeting");
    await mkdir(taskDir, { recursive: true });
    await writeFile(
      join(taskDir, "TASK.md"),
      [
        "---",
        "id: 01-make-greeting",
        "title: Make greeting",
        "outputs:",
        "  - output/greeting.json",
        "stub:",
        "  cmd: |",
        '    mkdir -p "$FLOW_TEST_OUT" && printf \'{"hi":"there"}\' > "$FLOW_TEST_OUT/greeting.json"',
        "---",
        "Write the greeting.",
        "",
      ].join("\n"),
    );

    const flow = {
      name: "real",
      flow: async (ctx: any) => ctx.task("01-make-greeting"),
    };
    const optsBase = {
      projectDir: tmpDir,
      tasksDir: join(tmpDir, "tasks"),
      stubMode: true,
    };

    const result = await runFlow(flow, optsBase);
    expect(result).toEqual({ hi: "there" }); // outputs read back

    // Projection: runstate.json has the step node, marked passing.
    const rs = JSON.parse(
      readFileSync(join(tmpDir, ".converge/journal/real/runstate.json"), "utf-8"),
    );
    expect(rs.dag.nodes["01-make-greeting#0"]?.status).toBe("pass");

    // Resume replays from the flow journal — the task does NOT re-execute
    // (delete the output; if it re-ran it would be recreated; replay returns
    // the journaled value regardless).
    const result2 = await runFlow(flow, { ...optsBase, resume: true });
    expect(result2).toEqual({ hi: "there" });
  });
});

describe("RFC 0050 flow runtime — flowDir-relative task() paths", () => {
  it("resolves a relative task path against flowDir before projectDir", async () => {
    const flowDir = join(tmpDir, ".converge", "playbooks", "mig");
    await mkdir(join(flowDir, "tasks", "convert"), { recursive: true });
    await writeFile(
      join(flowDir, "tasks", "convert", "TASK.md"),
      ["---", "id: convert", "title: Convert", "---", "body", ""].join("\n"),
    );

    let seenPath = "";
    const result = await runFlow(
      {
        name: "mig",
        flow: async (ctx: any) =>
          ctx.task("tasks/convert/TASK.md", { x: 1 }, { key: "a" }),
      },
      {
        projectDir: tmpDir,
        flowDir,
        executeStep: async (t: any) => {
          seenPath = t.taskMdPath;
          return { ok: true };
        },
      },
    );

    expect(result).toEqual({ ok: true });
    expect(seenPath).toBe(join(flowDir, "tasks", "convert", "TASK.md"));
  });
});

describe("RFC 0050 flow runtime — task() strict vars contract (templates)", () => {
  async function writeTemplate(id: string, varsBlock: string) {
    const dir = join(tmpDir, "tasks", id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "TASK.md"),
      ["---", `id: ${id}`, `title: ${id}`, varsBlock, "outputs: []", "---", "body", ""].join("\n"),
    );
  }

  it("filters candidate vars to the template's declared contract (drops undeclared)", async () => {
    await writeTemplate("child-beta", "vars:\n  sprint_id:");
    let seen: any;
    await runFlow(
      {
        name: "spawn-filter",
        flow: async (ctx: any) =>
          ctx.task("child-beta", { sprint_id: "sprint-042", owner: "alice" }),
      },
      {
        projectDir: tmpDir,
        tasksDir: join(tmpDir, "tasks"),
        executeStep: async (_t: any, params: any) => {
          seen = params;
          return { ok: true };
        },
      },
    );
    expect(seen).toEqual({ sprint_id: "sprint-042" }); // owner dropped
  });

  it("throws on a missing required var", async () => {
    await writeTemplate("child-alpha", "vars:\n  sprint_id:\n  owner:\n  wave: 0");
    await expect(
      runFlow(
        {
          name: "spawn-missing",
          flow: async (ctx: any) => ctx.task("child-alpha", { sprint_id: "s" }),
        },
        {
          projectDir: tmpDir,
          tasksDir: join(tmpDir, "tasks"),
          executeStep: async () => ({ ok: true }),
        },
      ),
    ).rejects.toThrow(/missing required var.*owner/);
  });

  it("multi-level: spawn → parallel(spawn×3) builds a 1→3 tree with stable keys", async () => {
    await writeTemplate("child", "vars:\n  sprint_id:");
    await writeTemplate("sub", "vars:\n  sprint_id:\n  index: 0");
    const ran: string[] = [];
    await runFlow(
      {
        name: "spawn-tree",
        flow: async (ctx: any) => {
          await ctx.task("child", { sprint_id: "s" });
          await ctx.parallel(
            [1, 2, 3].map((i) => () =>
              ctx.task("sub", { sprint_id: "s", index: i }, { key: `sub-${i}` }),
            ),
          );
        },
      },
      {
        projectDir: tmpDir,
        tasksDir: join(tmpDir, "tasks"),
        executeStep: async (t: any, params: any) => {
          ran.push(`${t.id}:${params.index ?? ""}`);
          return { ok: true };
        },
      },
    );
    expect(ran).toContain("child:");
    expect(ran).toContain("sub:1");
    expect(ran).toContain("sub:2");
    expect(ran).toContain("sub:3");
    expect(ran.filter((r) => r.startsWith("sub:"))).toHaveLength(3);
  });
});

describe("RFC 0050 flow runtime — bounded fan-out (Phase 2)", () => {
  it("never runs more than `workers` real executions concurrently, across nested parallel", async () => {
    let active = 0;
    let peak = 0;
    const slow = async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 15));
      active--;
      return { ok: true };
    };
    const tasks: FlowTaskRegistry = new Map([["unit", { run: slow }]]);

    await runFlow(
      {
        name: "fanout",
        flow: async (ctx) => {
          // 4 groups × 5 items = 20 executions, nested parallel.
          await ctx.parallel(
            [0, 1, 2, 3].map((g) => () =>
              ctx.parallel(
                [0, 1, 2, 3, 4].map((i) => () =>
                  ctx.Task("unit", { g, i }, { key: `${g}-${i}` }),
                ),
              ),
            ),
          );
        },
      },
      { projectDir: tmpDir, tasks, workers: 3 },
    );

    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(3); // global cap honored despite nesting
  });
});

describe("RFC 0050 flow runtime — determinism guard (Phase 3)", () => {
  it("warns on resume when a prior-run step is no longer requested", async () => {
    const defs = { a: { run: () => 1 }, b: { run: () => 2 }, c: { run: () => 3 } };
    const c1: Record<string, number> = {};
    await runFlow(
      {
        name: "diverge",
        flow: async (ctx: any) => {
          await ctx.task("a");
          await ctx.task("b");
          await ctx.task("c");
        },
      },
      { projectDir: tmpDir, tasks: makeRegistry(defs, c1) },
    );

    const logs: string[] = [];
    await runFlow(
      {
        name: "diverge",
        flow: async (ctx: any) => {
          await ctx.task("a");
          await ctx.task("b"); // `c` removed → orphan
        },
      },
      {
        projectDir: tmpDir,
        resume: true,
        tasks: makeRegistry(defs, {}),
        onLog: (m) => logs.push(m),
      },
    );

    expect(logs.some((m) => m.includes("determinism") && m.includes("c#0"))).toBe(
      true,
    );
  });
});

describe("RFC 0050 flow runtime — key stability under parallel fan-out", () => {
  it("explicit per-item keys resume each branch correctly even if list order changes", async () => {
    const defs = {
      render: { run: (p: any) => ({ screen: p.screen }) },
    };

    const c1: Record<string, number> = {};
    await runFlow(
      {
        name: "fan",
        flow: async (ctx: any) => {
          const items = ["home", "feed", "profile"];
          return ctx.parallel(
            items.map(
              (s) => () => ctx.Task("render", { screen: s }, { key: s }),
            ),
          );
        },
      },
      { projectDir: tmpDir, tasks: makeRegistry(defs, c1) },
    );
    expect(c1.render).toBe(3);

    // Re-run with the list REORDERED — each branch must map to its journaled
    // record by its explicit key, so nothing re-executes.
    const c2: Record<string, number> = {};
    const result = await runFlow(
      {
        name: "fan",
        flow: async (ctx: any) => {
          const items = ["profile", "home", "feed"]; // reordered
          return ctx.parallel(
            items.map(
              (s) => () => ctx.Task("render", { screen: s }, { key: s }),
            ),
          );
        },
      },
      { projectDir: tmpDir, resume: true, tasks: makeRegistry(defs, c2) },
    );
    expect(c2.render).toBeUndefined(); // all replayed by key
    expect(result).toEqual([
      { screen: "profile" },
      { screen: "home" },
      { screen: "feed" },
    ]);
  });
});
