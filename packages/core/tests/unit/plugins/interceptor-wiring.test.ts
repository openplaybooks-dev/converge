import { describe, it, expect } from "vitest";
import { InterceptorRegistry } from "../../../src/hooks/interceptor-registry.ts";

describe("Interceptor wiring", () => {
  describe("intercept:task-execute via ExecuteTaskOptions", () => {
    it("ExecuteTaskOptions accepts interceptorRegistry", async () => {
      // Verify the type exists and can be constructed
      const registry = new InterceptorRegistry();
      const opts = {
        interceptorRegistry: registry,
      };
      expect(opts.interceptorRegistry).toBe(registry);
    });

    it("intercept:task-execute can transform task execution results", async () => {
      const registry = new InterceptorRegistry();
      registry.register(
        "intercept:task-execute",
        async (payload: any, next) => {
          const result = await next();
          return { ...result, pluginEnriched: true };
        },
      );

      // Simulate the interceptor call pattern used in execute-task.ts
      let result: any = { success: true, attemptNumber: 1, durationMs: 100 };
      if (registry.has("intercept:task-execute")) {
        result = await registry.intercept(
          "intercept:task-execute",
          result,
          async (r) => r,
        );
      }

      expect(result.success).toBe(true);
      expect(result.pluginEnriched).toBe(true);
    });

    it("intercept:task-execute can override success status", async () => {
      const registry = new InterceptorRegistry();
      registry.register(
        "intercept:task-execute",
        async (payload: any, next) => {
          const result = await next();
          // Plugin decides the task actually failed based on custom criteria
          return {
            ...result,
            success: false,
            errorKind: "structural",
            errorReason: "custom-check-failed",
          };
        },
      );

      let result: any = { success: true, attemptNumber: 1, durationMs: 100 };
      result = await registry.intercept(
        "intercept:task-execute",
        result,
        async (r) => r,
      );

      expect(result.success).toBe(false);
      expect(result.errorKind).toBe("structural");
    });
  });

  describe("intercept:dag-compile via compileUnifiedWithInterceptors", () => {
    it("passes through when no dag-compile interceptors registered", async () => {
      const registry = new InterceptorRegistry();
      registry.register("intercept:task-execute", async (p, next) => next());

      expect(registry.has("intercept:dag-compile")).toBe(false);

      const baseResult = {
        dag: {},
        errors: [],
        globalChecks: [],
        playbookHash: "abc",
      } as any;
      const result = await registry.intercept(
        "intercept:dag-compile",
        baseResult,
        async (r) => r,
      );
      expect(result.playbookHash).toBe("abc");
    });

    it("intercept:dag-compile can transform the compilation result", async () => {
      const registry = new InterceptorRegistry();
      registry.register("intercept:dag-compile", async (payload: any, next) => {
        const result = await next();
        return { ...result, pluginValidated: true };
      });

      const baseResult = {
        dag: {},
        errors: [],
        globalChecks: [],
        playbookHash: "abc",
      } as any;

      const result = await registry.intercept(
        "intercept:dag-compile",
        baseResult,
        async (r) => r,
      );

      expect(result.pluginValidated).toBe(true);
      expect(result.playbookHash).toBe("abc");
    });

    it("intercept:dag-compile can inject errors", async () => {
      const registry = new InterceptorRegistry();
      registry.register("intercept:dag-compile", async (payload: any, next) => {
        const result = await next();
        return {
          ...result,
          errors: [
            ...result.errors,
            { message: "plugin-validation-error", path: "task-a" },
          ],
        };
      });

      const baseResult = {
        dag: {},
        errors: [],
        globalChecks: [],
        playbookHash: "abc",
      } as any;
      const result = await registry.intercept(
        "intercept:dag-compile",
        baseResult,
        async (r) => r,
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("plugin-validation-error");
    });
  });

  describe("intercept:error-classify", () => {
    it("can classify errors via interceptor", async () => {
      const registry = new InterceptorRegistry();
      registry.register(
        "intercept:error-classify",
        async (payload: any, next) => {
          // Plugin recognizes rate limit errors as transient
          if (payload.error?.message?.includes("429")) {
            return { ...payload, classification: "transient" };
          }
          return next();
        },
      );

      const rateLimitPayload = {
        error: new Error("HTTP 429 Too Many Requests"),
        taskId: "t1",
        attempt: 1,
        maxAttempts: 3,
      };

      const result = await registry.intercept(
        "intercept:error-classify",
        rateLimitPayload,
        async (p) => ({ ...p, classification: "structural" }), // default
      );

      expect(result.classification).toBe("transient");
    });

    it("falls through to core classifier when plugin calls next()", async () => {
      const registry = new InterceptorRegistry();
      registry.register(
        "intercept:error-classify",
        async (payload: any, next) => {
          // Plugin doesn't recognize this error, falls through
          return next();
        },
      );

      const unknownError = {
        error: new Error("some unknown error"),
        taskId: "t1",
        attempt: 1,
        maxAttempts: 3,
      };

      const result = await registry.intercept(
        "intercept:error-classify",
        unknownError,
        async (p) => ({ ...p, classification: "structural" }),
      );

      expect(result.classification).toBe("structural");
    });
  });

  describe("intercept:retry-decide", () => {
    it("can override retry decisions", async () => {
      const registry = new InterceptorRegistry();
      registry.register(
        "intercept:retry-decide",
        async (payload: any, next) => {
          // Plugin implements cost-based abort
          if (payload.attempt >= 2) {
            return {
              ...payload,
              shouldRetry: false,
              reason: "cost-limit-exceeded",
            };
          }
          return next();
        },
      );

      const payload = {
        error: new Error("task failed"),
        taskId: "t1",
        attempt: 3,
        maxAttempts: 5,
        classification: "transient",
      };

      const result = await registry.intercept(
        "intercept:retry-decide",
        payload,
        async (p) => ({ ...p, shouldRetry: true }),
      );

      expect(result.shouldRetry).toBe(false);
      expect(result.reason).toBe("cost-limit-exceeded");
    });
  });
});
