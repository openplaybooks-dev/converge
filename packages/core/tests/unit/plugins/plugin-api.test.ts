import { describe, it, expect, vi, beforeEach } from "vitest";
import { PluginAPIImplV2 } from "../../../src/plugins/api.ts";
import { makeEmptyState } from "./_helpers.ts";
import type { PluginStateV2 } from "../../../src/plugins/types.ts";

describe("PluginAPIImplV2", () => {
  let state: PluginStateV2;
  let api: PluginAPIImplV2;

  beforeEach(() => {
    state = makeEmptyState();
    api = new PluginAPIImplV2("test-plugin", "/tmp/project", {}, state);
  });

  describe("addInterceptor", () => {
    it("registers an interceptor into state.interceptors", () => {
      const fn = async (p: any, next: any) => next();
      api.addInterceptor("intercept:task-execute", fn);

      expect(state.interceptors.has("intercept:task-execute")).toBe(true);
      const list = state.interceptors.get("intercept:task-execute")!;
      expect(list).toHaveLength(1);
      expect(list[0].fn).toBe(fn);
      expect(list[0].priority).toBe(100);
    });

    it("respects custom priority", () => {
      const fn = async (p: any, next: any) => next();
      api.addInterceptor("intercept:task-execute", fn, 50);

      const list = state.interceptors.get("intercept:task-execute")!;
      expect(list[0].priority).toBe(50);
    });

    it("accumulates multiple interceptors for the same event", () => {
      api.addInterceptor("intercept:task-execute", async (p, next) => next());
      api.addInterceptor("intercept:task-execute", async (p, next) => next());

      const list = state.interceptors.get("intercept:task-execute")!;
      expect(list).toHaveLength(2);
    });

    it("tracks in manifest", () => {
      api.addInterceptor("intercept:task-execute", async (p, next) => next());
      api.addInterceptor("intercept:check-evaluate", async (p, next) => next());

      const manifest = api.buildManifest({ name: "test", version: "1.0.0" });
      expect(manifest.interceptors).toContain("intercept:task-execute");
      expect(manifest.interceptors).toContain("intercept:check-evaluate");
    });
  });

  describe("registerCheckType", () => {
    it("registers a custom check type evaluator", () => {
      const evaluator = async (check: any, ctx: any) => ({ passed: true });
      api.registerCheckType("http", evaluator);

      expect(state.checkTypes.has("http")).toBe(true);
      expect(state.checkTypes.get("http")).toBe(evaluator);
    });

    it("throws on duplicate check type", () => {
      api.registerCheckType("http", async () => ({ passed: true }));

      expect(() => {
        api.registerCheckType("http", async () => ({ passed: false }));
      }).toThrow(/already registered/);
    });

    it("tracks in manifest", () => {
      api.registerCheckType("http", async () => ({ passed: true }));
      const manifest = api.buildManifest({ name: "test", version: "1.0.0" });
      expect(manifest.checkTypes).toContain("http");
    });
  });

  describe("registerSkillSource", () => {
    it("registers a skill source", () => {
      const source = { name: "remote", resolve: async () => [] };
      api.registerSkillSource(source);

      expect(state.skillSources).toHaveLength(1);
      expect(state.skillSources[0]).toBe(source);
    });

    it("tracks in manifest", () => {
      api.registerSkillSource({ name: "remote", resolve: async () => [] });
      const manifest = api.buildManifest({ name: "test", version: "1.0.0" });
      expect(manifest.skillSources).toContain("remote");
    });
  });

  describe("registerJournalConsumer", () => {
    it("registers a journal consumer", () => {
      const consumer = { name: "datadog", onEvent: async () => {} };
      api.registerJournalConsumer(consumer);

      expect(state.journalConsumers).toHaveLength(1);
      expect(state.journalConsumers[0]).toBe(consumer);
    });

    it("tracks in manifest", () => {
      api.registerJournalConsumer({ name: "datadog", onEvent: async () => {} });
      const manifest = api.buildManifest({ name: "test", version: "1.0.0" });
      expect(manifest.journalConsumers).toContain("datadog");
    });
  });

  describe("registerCommand", () => {
    it("registers a CLI command", () => {
      const cmd = { name: "deploy", description: "Deploy", handler: async () => {} };
      api.registerCommand(cmd);

      expect(state.commands.has("deploy")).toBe(true);
      expect(state.commands.get("deploy")).toBe(cmd);
    });

    it("throws on duplicate command name", () => {
      api.registerCommand({ name: "deploy", description: "Deploy", handler: async () => {} });

      expect(() => {
        api.registerCommand({ name: "deploy", description: "Deploy2", handler: async () => {} });
      }).toThrow(/already registered/);
    });

    it("tracks in manifest", () => {
      api.registerCommand({ name: "deploy", description: "Deploy", handler: async () => {} });
      const manifest = api.buildManifest({ name: "test", version: "1.0.0" });
      expect(manifest.commands).toContain("deploy");
    });
  });

  describe("existing functionality still works", () => {
    it("registerCheck stores in state", () => {
      api.registerCheck({ name: "lint", fn: async () => ({ passed: true, output: "" }) });
      expect(state.checks.has("lint")).toBe(true);
    });

    it("addHook stores in state", () => {
      api.addHook("task:start", async () => {});
      expect(state.hooks.has("task:start")).toBe(true);
    });

    it("addTool stores in state", () => {
      api.addTool("mytool", () => ({}));
      expect(state.tools.has("mytool")).toBe(true);
    });

    it("addVars merges into state", () => {
      api.addVars({ key: "value" });
      expect(state.vars.key).toBe("value");
    });
  });

  describe("buildManifest", () => {
    it("includes providers field", () => {
      const manifest = api.buildManifest({ name: "test", version: "1.0.0" });
      expect(manifest).toHaveProperty("providers");
    });

    it("includes all new extension fields", () => {
      const manifest = api.buildManifest({ name: "test", version: "1.0.0" });
      expect(manifest).toHaveProperty("interceptors");
      expect(manifest).toHaveProperty("checkTypes");
      expect(manifest).toHaveProperty("skillSources");
      expect(manifest).toHaveProperty("journalConsumers");
      expect(manifest).toHaveProperty("commands");
    });
  });
});
