import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PluginAPIImplV2 } from "../../../src/plugins/api.ts";
import { makeEmptyState } from "./_helpers.ts";
import type { PluginStateV2 } from "../../../src/plugins/types.ts";

describe("Plugin Capabilities Enforcement", () => {
  let state: PluginStateV2;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    state = makeEmptyState();
    consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("does not warn when capabilities include the used API", () => {
    const api = new PluginAPIImplV2("test", "/tmp", {}, state, ["check-types"]);
    api.registerCheckType("http", async () => ({ passed: true }));
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("warns when using registerCheckType without check-types capability", () => {
    const api = new PluginAPIImplV2("test", "/tmp", {}, state, ["hooks"]);
    api.registerCheckType("http", async () => ({ passed: true }));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("check-types"),
    );
  });

  it("warns when using addInterceptor without interceptors capability", () => {
    const api = new PluginAPIImplV2("test", "/tmp", {}, state, ["hooks"]);
    api.addInterceptor("intercept:task-execute", async (p, next) => next());
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("interceptors"),
    );
  });

  it("warns when using registerCommand without commands capability", () => {
    const api = new PluginAPIImplV2("test", "/tmp", {}, state, ["hooks"]);
    api.registerCommand({ name: "deploy", description: "Deploy", handler: async () => {} });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("commands"),
    );
  });

  it("warns when using registerJournalConsumer without journal-consumers capability", () => {
    const api = new PluginAPIImplV2("test", "/tmp", {}, state, ["hooks"]);
    api.registerJournalConsumer({ name: "dd", onEvent: async () => {} });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("journal-consumers"),
    );
  });

  it("warns when using registerSkillSource without skills capability", () => {
    const api = new PluginAPIImplV2("test", "/tmp", {}, state, ["hooks"]);
    api.registerSkillSource({ name: "remote", resolve: async () => [] });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("skills"),
    );
  });

  it("does not warn when no capabilities are declared (opt-in enforcement)", () => {
    const api = new PluginAPIImplV2("test", "/tmp", {}, state);
    api.registerCheckType("http", async () => ({ passed: true }));
    api.addInterceptor("intercept:task-execute", async (p, next) => next());
    api.registerCommand({ name: "x", description: "x", handler: async () => {} });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("warning message includes the plugin name and missing capability", () => {
    const api = new PluginAPIImplV2("my-plugin", "/tmp", {}, state, ["hooks"]);
    api.registerCheckType("http", async () => ({ passed: true }));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/my-plugin.*check-types/),
    );
  });
});
