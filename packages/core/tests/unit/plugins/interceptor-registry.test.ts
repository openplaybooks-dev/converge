import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  InterceptorRegistry,
  type InterceptorFn,
  type InterceptEvent,
} from "../../../src/hooks/interceptor-registry.ts";

describe("InterceptorRegistry", () => {
  let registry: InterceptorRegistry;

  beforeEach(() => {
    registry = new InterceptorRegistry();
  });

  describe("intercept — no interceptors", () => {
    it("calls coreFn directly when no interceptors are registered", async () => {
      const coreFn = vi.fn(async (p: { value: number }) => ({
        value: p.value + 1,
      }));
      const result = await registry.intercept(
        "intercept:task-execute",
        { value: 10 },
        coreFn,
      );
      expect(result).toEqual({ value: 11 });
      expect(coreFn).toHaveBeenCalledWith({ value: 10 });
    });
  });

  describe("intercept — single interceptor", () => {
    it("wraps coreFn and can transform the result", async () => {
      registry.register(
        "intercept:task-execute",
        async (payload: any, next) => {
          const result = await next();
          return { ...result, extra: true };
        },
      );

      const coreFn = async (p: any) => ({ value: p.value * 2 });
      const result = await registry.intercept(
        "intercept:task-execute",
        { value: 5 },
        coreFn,
      );

      expect(result).toEqual({ value: 10, extra: true });
    });

    it("can modify payload before calling next", async () => {
      registry.register(
        "intercept:task-execute",
        async (payload: any, next) => {
          payload.value = payload.value + 100;
          return next();
        },
      );

      const coreFn = vi.fn(async (p: any) => ({ result: p.value }));
      await registry.intercept("intercept:task-execute", { value: 1 }, coreFn);

      expect(coreFn).toHaveBeenCalledWith({ value: 101 });
    });

    it("can block execution by not calling next", async () => {
      registry.register(
        "intercept:task-execute",
        async (_payload: any, _next) => {
          return { blocked: true };
        },
      );

      const coreFn = vi.fn(async (p: any) => ({ value: p.value }));
      const result = await registry.intercept(
        "intercept:task-execute",
        { value: 1 },
        coreFn,
      );

      expect(result).toEqual({ blocked: true });
      expect(coreFn).not.toHaveBeenCalled();
    });
  });

  describe("intercept — multiple interceptors (middleware chain)", () => {
    it("executes in priority order", async () => {
      const order: number[] = [];

      registry.register(
        "intercept:task-execute",
        async (p: any, next) => {
          order.push(1);
          return next();
        },
        50,
      );
      registry.register(
        "intercept:task-execute",
        async (p: any, next) => {
          order.push(3);
          return next();
        },
        300,
      );
      registry.register(
        "intercept:task-execute",
        async (p: any, next) => {
          order.push(2);
          return next();
        },
        150,
      );

      await registry.intercept("intercept:task-execute", {}, async () => ({}));

      expect(order).toEqual([1, 2, 3]);
    });

    it("chains transformations — each interceptor sees the previous result", async () => {
      registry.register(
        "intercept:task-execute",
        async (p: any, next) => {
          const result = await next();
          return { ...result, step1: true };
        },
        100,
      );
      registry.register(
        "intercept:task-execute",
        async (p: any, next) => {
          const result = await next();
          return { ...result, step2: true };
        },
        200,
      );

      const result = await registry.intercept(
        "intercept:task-execute",
        {},
        async () => ({ core: true }),
      );

      // step1 wraps step2 wraps coreFn
      // coreFn returns {core} → step2 adds step2 → step1 adds step1
      expect(result).toEqual({ core: true, step2: true, step1: true });
    });
  });

  describe("error isolation", () => {
    it("skips a failing interceptor and continues the chain", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      registry.register(
        "intercept:task-execute",
        async (_p: any, _next) => {
          throw new Error("interceptor boom");
        },
        100,
      );

      const coreFn = vi.fn(async () => ({ ok: true }));
      const result = await registry.intercept(
        "intercept:task-execute",
        {},
        coreFn,
      );

      expect(result).toEqual({ ok: true });
      expect(coreFn).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("interceptor boom"),
      );
      warnSpy.mockRestore();
    });

    it("skips a failing interceptor in a chain and runs the rest", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const order: string[] = [];

      registry.register(
        "intercept:task-execute",
        async (p: any, next) => {
          order.push("a");
          return next();
        },
        100,
      );
      registry.register(
        "intercept:task-execute",
        async (_p: any, _next) => {
          order.push("b-fail");
          throw new Error("boom");
        },
        200,
      );
      registry.register(
        "intercept:task-execute",
        async (p: any, next) => {
          order.push("c");
          return next();
        },
        300,
      );

      const result = await registry.intercept(
        "intercept:task-execute",
        {},
        async () => ({ done: true }),
      );

      expect(result).toEqual({ done: true });
      expect(order).toContain("a");
      expect(order).toContain("c");
      warnSpy.mockRestore();
    });
  });

  describe("event isolation", () => {
    it("interceptors for one event do not affect another", async () => {
      const fn = vi.fn(async (_p: any, next: any) => next());
      registry.register("intercept:task-execute", fn);

      const coreFn = async () => ({ ok: true });
      await registry.intercept("intercept:check-evaluate", {}, coreFn);

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("integration with PluginAPIV2", () => {
    it("interceptors registered via plugin API can be loaded into InterceptorRegistry", async () => {
      // Simulate what loadPluginsV2 does
      const { PluginAPIImplV2 } = await import("../../../src/plugins/api.ts");
      const { loadPluginsV2 } = await import("../../../src/plugins/loader.ts");

      const state = await loadPluginsV2([], "/tmp");
      const api = new PluginAPIImplV2("test-plugin", "/tmp", {}, state);

      // Register interceptor via API
      const interceptor = async (p: any, next: any) => {
        const result = await next();
        return { ...result, pluginAdded: true };
      };
      api.addInterceptor("intercept:task-execute", interceptor, 50);

      // Now simulate what CLI does: load from state into registry
      const liveRegistry = new InterceptorRegistry();
      for (const [event, entries] of state.interceptors) {
        for (const { fn, priority } of entries) {
          liveRegistry.register(event, fn, priority);
        }
      }

      // Verify the interceptor is live
      expect(liveRegistry.has("intercept:task-execute")).toBe(true);
      const result = await liveRegistry.intercept(
        "intercept:task-execute",
        {},
        async () => ({ core: true }),
      );
      expect(result).toEqual({ core: true, pluginAdded: true });
    });
  });

  describe("introspection", () => {
    it("has() returns true when interceptors are registered", () => {
      registry.register("intercept:task-execute", async (p, next) => next());
      expect(registry.has("intercept:task-execute")).toBe(true);
      expect(registry.has("intercept:check-evaluate")).toBe(false);
    });

    it("count() returns the number of interceptors for an event", () => {
      registry.register("intercept:task-execute", async (p, next) => next());
      registry.register("intercept:task-execute", async (p, next) => next());
      expect(registry.count("intercept:task-execute")).toBe(2);
    });
  });
});
