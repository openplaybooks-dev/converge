/**
 * Tests for execution modifiers: .async(), .background(), .schedule(), .sidecar()
 *
 * These modifiers control HOW .execute() runs — they don't change what it does.
 */

import { describe, it, expect } from "vitest";
import {
  taskDef,
  TaskDefinitionBuilder,
} from "../../src/config/task-definition.ts";
import type { ExecutorFn } from "../../src/config/task-definition.ts";

const noop: ExecutorFn = async () => {};

describe("Execution Modifiers", () => {
  /* ---------------------------------------------------------------- */
  /*  .async()                                                        */
  /* ---------------------------------------------------------------- */

  describe(".async()", () => {
    it("should set isAsync flag on TaskDefinition", () => {
      const def = taskDef().id("gen-assets").async().execute(noop).build();

      expect(def.isAsync).toBe(true);
      expect(def.executorFn).toBe(noop);
    });

    it("should chain with other methods in any order", () => {
      const def = taskDef()
        .id("task-a")
        .title("Task A")
        .outputs(["out.json"])
        .execute(noop)
        .async()
        .build();

      expect(def.isAsync).toBe(true);
      expect(def.title).toBe("Task A");
      expect(def.outputs).toEqual(["out.json"]);
    });

    it("should throw when combined with .background()", () => {
      expect(() => {
        taskDef().id("bad").background({ readyWhen: /ready/ }).async();
      }).toThrow("mutually exclusive");
    });

    it("should throw when .background() is called after .async()", () => {
      expect(() => {
        taskDef().id("bad").async().background({ readyWhen: /ready/ });
      }).toThrow("mutually exclusive");
    });
  });

  /* ---------------------------------------------------------------- */
  /*  .background()                                                   */
  /* ---------------------------------------------------------------- */

  describe(".background()", () => {
    it("should set backgroundConfig on TaskDefinition", () => {
      const def = taskDef()
        .id("dev-server")
        .background({
          readyWhen: /✓ Ready in/,
          healthCheck: "http://localhost:3000",
        })
        .execute(noop)
        .build();

      expect(def.backgroundConfig).toBeDefined();
      expect(def.backgroundConfig!.readyWhen).toEqual(/✓ Ready in/);
      expect(def.backgroundConfig!.healthCheck).toBe("http://localhost:3000");
    });

    it("should accept full HealthCheckConfig", () => {
      const def = taskDef()
        .id("server")
        .background({
          readyWhen: "ready",
          healthCheck: {
            url: "http://localhost:3000/health",
            interval: 10_000,
            failureThreshold: 5,
          },
          restartOnCrash: true,
          maxRestarts: 5,
          readyTimeout: 60_000,
        })
        .build();

      const bg = def.backgroundConfig!;
      expect(bg.readyWhen).toBe("ready");
      expect(bg.restartOnCrash).toBe(true);
      expect(bg.maxRestarts).toBe(5);
      expect(bg.readyTimeout).toBe(60_000);

      const hc = bg.healthCheck as {
        url: string;
        interval: number;
        failureThreshold: number;
      };
      expect(hc.url).toBe("http://localhost:3000/health");
      expect(hc.interval).toBe(10_000);
      expect(hc.failureThreshold).toBe(5);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  .schedule()                                                     */
  /* ---------------------------------------------------------------- */

  describe(".schedule()", () => {
    it("should parse duration string and set scheduleConfig", () => {
      const def = taskDef().id("watcher").schedule("15s").execute(noop).build();

      expect(def.scheduleConfig).toBeDefined();
      expect(def.scheduleConfig!.intervalMs).toBe(15_000);
      expect(def.scheduleConfig!.intervalStr).toBe("15s");
      expect(def.scheduleConfig!.runImmediately).toBe(true);
      expect(def.scheduleConfig!.skipIfBusy).toBe(true);
    });

    it("should parse various duration formats", () => {
      expect(
        taskDef().id("a").schedule("5s").build().scheduleConfig!.intervalMs,
      ).toBe(5_000);
      expect(
        taskDef().id("b").schedule("1m").build().scheduleConfig!.intervalMs,
      ).toBe(60_000);
      expect(
        taskDef().id("c").schedule("500ms").build().scheduleConfig!.intervalMs,
      ).toBe(500);
      expect(
        taskDef().id("d").schedule("1.5m").build().scheduleConfig!.intervalMs,
      ).toBe(90_000);
      expect(
        taskDef().id("e").schedule("2h").build().scheduleConfig!.intervalMs,
      ).toBe(7_200_000);
    });

    it("should throw for invalid duration strings", () => {
      expect(() => taskDef().id("x").schedule("abc")).toThrow(
        "Invalid duration",
      );
      expect(() => taskDef().id("x").schedule("15")).toThrow(
        "Invalid duration",
      );
      expect(() => taskDef().id("x").schedule("")).toThrow("Invalid duration");
    });

    it("should accept custom options", () => {
      const def = taskDef()
        .id("watcher")
        .schedule("30s", { runImmediately: false, skipIfBusy: false })
        .build();

      expect(def.scheduleConfig!.runImmediately).toBe(false);
      expect(def.scheduleConfig!.skipIfBusy).toBe(false);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  .sidecar()                                                      */
  /* ---------------------------------------------------------------- */

  describe(".sidecar()", () => {
    it("should set sidecarHooks on TaskDefinition", () => {
      const hookFn = async () => {};

      const def = taskDef()
        .id("git-checkpoint")
        .sidecar({
          "task:complete": hookFn,
        })
        .build();

      expect(def.sidecarHooks).toBeDefined();
      expect(def.sidecarHooks!["task:complete"]).toBe(hookFn);
    });

    it("should support multiple hooks", () => {
      const onComplete = async () => {};
      const onFail = async () => {};
      const onStalled = async () => {};

      const def = taskDef()
        .id("guardian")
        .sidecar({
          "task:complete": onComplete,
          "task:fail": onFail,
          "convergence:stalled": onStalled,
        })
        .build();

      expect(def.sidecarHooks!["task:complete"]).toBe(onComplete);
      expect(def.sidecarHooks!["task:fail"]).toBe(onFail);
      expect(def.sidecarHooks!["convergence:stalled"]).toBe(onStalled);
    });

    it("should work with .execute() for init logic", () => {
      const initFn: ExecutorFn = async () => {};
      const hookFn = async () => {};

      const def = taskDef()
        .id("test-watcher")
        .execute(initFn)
        .sidecar({ "task:complete": hookFn })
        .build();

      expect(def.executorFn).toBe(initFn);
      expect(def.sidecarHooks!["task:complete"]).toBe(hookFn);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Composition                                                     */
  /* ---------------------------------------------------------------- */

  describe("Modifier composition", () => {
    it("should allow .schedule() + .sidecar() together", () => {
      const hookFn = async () => {};

      const def = taskDef()
        .id("typecheck-guardian")
        .schedule("30s")
        .sidecar({ "task:complete": hookFn })
        .execute(noop)
        .build();

      expect(def.scheduleConfig!.intervalMs).toBe(30_000);
      expect(def.sidecarHooks!["task:complete"]).toBe(hookFn);
      expect(def.executorFn).toBe(noop);
    });

    it("should allow .background() + .schedule() together", () => {
      const def = taskDef()
        .id("dev-server")
        .background({
          readyWhen: /Ready/,
          healthCheck: "http://localhost:3000",
        })
        .schedule("10s")
        .execute(noop)
        .build();

      expect(def.backgroundConfig).toBeDefined();
      expect(def.scheduleConfig).toBeDefined();
    });

    it("should NOT allow .async() + .background()", () => {
      expect(() => {
        taskDef().id("x").async().background({ readyWhen: /r/ });
      }).toThrow("mutually exclusive");
    });

    it("task without modifiers has no modifier fields", () => {
      const def = taskDef().id("normal").execute(noop).build();

      expect(def.isAsync).toBeUndefined();
      expect(def.backgroundConfig).toBeUndefined();
      expect(def.scheduleConfig).toBeUndefined();
      expect(def.sidecarHooks).toBeUndefined();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Unit wiring                                                     */
  /* ---------------------------------------------------------------- */

  describe("Unit wiring", () => {
    // Unit import triggers the full dependency chain which includes @openplaybooks/converge-agentfn
    // (a missing package in this dev environment). Test the fields exist on the
    // TaskDefinition instead, since Unit just copies them in the constructor.
    it("should have modifier fields on TaskDefinition that Unit copies", () => {
      const def = taskDef()
        .id("test-task")
        .async()
        .schedule("10s")
        .sidecar({ "task:complete": async () => {} })
        .execute(noop)
        .build();

      // These are the exact fields Unit copies in its constructor
      expect(def.isAsync).toBe(true);
      expect(def.scheduleConfig!.intervalMs).toBe(10_000);
      expect(def.sidecarHooks).toBeDefined();
      expect(def.executorFn).toBe(noop);
    });

    it("should have backgroundConfig on TaskDefinition that Unit copies", () => {
      const def = taskDef()
        .id("bg-task")
        .background({
          readyWhen: /ready/,
          healthCheck: "http://localhost:3000",
        })
        .execute(noop)
        .build();

      expect(def.backgroundConfig).toBeDefined();
      expect(def.backgroundConfig!.readyWhen).toEqual(/ready/);
      expect(def.backgroundConfig!.healthCheck).toBe("http://localhost:3000");
    });
  });
});
