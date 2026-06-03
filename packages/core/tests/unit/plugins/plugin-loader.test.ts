import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadPluginsV2 } from "../../../src/plugins/loader.ts";
import { HookRegistry } from "../../../src/hooks/registry.ts";
import type { ConvergePluginV2 } from "../../../src/plugins/types.ts";

describe("loadPluginsV2", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-plugin-test-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("returns empty state when no plugins are specified", async () => {
    const state = await loadPluginsV2([], workspace);

    expect(state.loaded).toEqual([]);
    expect(state.checks.size).toBe(0);
    expect(state.interceptors.size).toBe(0);
    expect(state.checkTypes.size).toBe(0);
    expect(state.skillSources).toEqual([]);
    expect(state.journalConsumers).toEqual([]);
    expect(state.commands.size).toBe(0);
  });

  it("initializes new state fields (interceptors, checkTypes, etc.)", async () => {
    const state = await loadPluginsV2([], workspace);

    expect(state.interceptors).toBeInstanceOf(Map);
    expect(state.checkTypes).toBeInstanceOf(Map);
    expect(Array.isArray(state.skillSources)).toBe(true);
    expect(Array.isArray(state.journalConsumers)).toBe(true);
    expect(state.commands).toBeInstanceOf(Map);
  });
});

describe("Plugin hooks → HookRegistry bridge", () => {
  it("importFromPluginState bridges plugin hooks into the registry", async () => {
    const fn = vi.fn();
    const pluginState = await loadPluginsV2([], "/tmp");

    // Simulate a plugin that registered a hook
    pluginState.hooks.set("task:start", [fn]);

    const registry = new HookRegistry();
    registry.importFromPluginState(pluginState.hooks);

    expect(registry.has("task:start")).toBe(true);

    await registry.fire("task:start", { ctx: {} } as any);
    expect(fn).toHaveBeenCalled();
  });

  it("plugin hooks run after user hooks when both are registered", async () => {
    const order: string[] = [];

    const pluginState = await loadPluginsV2([], "/tmp");
    pluginState.hooks.set("task:complete", [
      async () => {
        order.push("plugin");
      },
    ]);

    const registry = new HookRegistry();
    registry.register("task:complete", async () => {
      order.push("user");
    });
    registry.importFromPluginState(pluginState.hooks);

    await registry.fire("task:complete", { ctx: {}, result: {} } as any);

    expect(order).toEqual(["user", "plugin"]);
  });
});
