import { describe, it, expect, vi, beforeEach } from "vitest";
import { HookRegistry } from "../../../src/hooks/registry.ts";
import type { HookFn } from "../../../src/hooks/types.ts";

describe("HookRegistry", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  describe("register + fire", () => {
    it("fires a registered hook with the correct payload", async () => {
      const fn = vi.fn();
      registry.register("task:start", fn);

      const payload = { ctx: { taskId: "t1" } } as any;
      await registry.fire("task:start", payload);

      expect(fn).toHaveBeenCalledWith(payload);
    });

    it("fires multiple hooks in priority order", async () => {
      const order: number[] = [];
      registry.register(
        "task:start",
        async () => {
          order.push(2);
        },
        { priority: 200 },
      );
      registry.register(
        "task:start",
        async () => {
          order.push(1);
        },
        { priority: 100 },
      );
      registry.register(
        "task:start",
        async () => {
          order.push(3);
        },
        { priority: 300 },
      );

      await registry.fire("task:start", { ctx: {} } as any);

      expect(order).toEqual([1, 2, 3]);
    });

    it("isolates hook errors — does not throw", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const good = vi.fn();
      registry.register(
        "task:fail",
        async () => {
          throw new Error("boom");
        },
        { priority: 1 },
      );
      registry.register("task:fail", good, { priority: 2 });

      await registry.fire("task:fail", {
        ctx: {},
        error: new Error("x"),
      } as any);

      expect(good).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("boom"));
      warnSpy.mockRestore();
    });

    it("does nothing when firing an event with no handlers", async () => {
      await expect(
        registry.fire("task:start", { ctx: {} } as any),
      ).resolves.toBeUndefined();
    });
  });

  describe("importFromPluginState", () => {
    it("imports legacy plugin hooks and fires them", async () => {
      const fn = vi.fn();
      const pluginHooks = new Map<string, Array<(...args: any[]) => void>>();
      pluginHooks.set("task:complete", [fn]);

      registry.importFromPluginState(pluginHooks);

      const payload = { ctx: { taskId: "t1" }, result: {} } as any;
      await registry.fire("task:complete", payload);

      expect(fn).toHaveBeenCalled();
    });

    it("plugin hooks run after user hooks (priority 200 vs 100)", async () => {
      const order: string[] = [];

      registry.register(
        "task:start",
        async () => {
          order.push("user");
        },
        { priority: 100 },
      );

      const pluginHooks = new Map<string, Array<(...args: any[]) => void>>();
      pluginHooks.set("task:start", [
        async () => {
          order.push("plugin");
        },
      ]);
      registry.importFromPluginState(pluginHooks);

      await registry.fire("task:start", { ctx: {} } as any);

      expect(order).toEqual(["user", "plugin"]);
    });

    it("handles empty plugin hooks map", () => {
      const pluginHooks = new Map<string, Array<(...args: any[]) => void>>();
      registry.importFromPluginState(pluginHooks);
      expect(registry.registeredEvents()).toEqual([]);
    });
  });

  describe("introspection", () => {
    it("reports registered events", () => {
      registry.register("task:start", vi.fn());
      registry.register("task:fail", vi.fn());

      const events = registry.registeredEvents();
      expect(events).toContain("task:start");
      expect(events).toContain("task:fail");
    });

    it("counts handlers per event", () => {
      registry.register("task:start", vi.fn());
      registry.register("task:start", vi.fn());

      expect(registry.count("task:start")).toBe(2);
      expect(registry.count("task:fail")).toBe(0);
    });

    it("has() returns true/false correctly", () => {
      registry.register("task:start", vi.fn());

      expect(registry.has("task:start")).toBe(true);
      expect(registry.has("task:fail")).toBe(false);
    });
  });

  describe("clear", () => {
    it("clears a specific event", () => {
      registry.register("task:start", vi.fn());
      registry.register("task:fail", vi.fn());

      registry.clear("task:start");

      expect(registry.has("task:start")).toBe(false);
      expect(registry.has("task:fail")).toBe(true);
    });

    it("clears all events when no argument given", () => {
      registry.register("task:start", vi.fn());
      registry.register("task:fail", vi.fn());

      registry.clear();

      expect(registry.registeredEvents()).toEqual([]);
    });
  });
});
