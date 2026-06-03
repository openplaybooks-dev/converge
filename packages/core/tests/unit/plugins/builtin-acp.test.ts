import { describe, it, expect } from "vitest";
import { getBuiltinPlugin } from "../../../src/plugins/builtins/index.ts";

describe("Built-in acp plugin", () => {
  it("is registered as a builtin", () => {
    const plugin = getBuiltinPlugin("acp");
    expect(plugin).toBeDefined();
    expect(plugin!.name).toBe("acp");
    expect(plugin!.version).toBe("1.0.0");
  });

  it("has a registerProviders hook", () => {
    const plugin = getBuiltinPlugin("acp");
    expect(typeof plugin!.registerProviders).toBe("function");
  });

  it("registerProviders registers an acp factory", () => {
    const plugin = getBuiltinPlugin("acp");
    const registered = new Map<string, any>();
    const registry = {
      register: (name: string, factory: any) => registered.set(name, factory),
      get: (name: string) => registered.get(name),
    };

    plugin!.registerProviders!(registry);

    expect(registered.has("acp")).toBe(true);
    expect(typeof registered.get("acp")).toBe("function");
  });

  it("setup does not mutate external state", () => {
    const plugin = getBuiltinPlugin("acp");
    const fakeApi = { called: false };
    plugin!.setup(fakeApi as any);
    expect(fakeApi.called).toBe(false);
  });

  it("returns undefined for non-existent builtin names", () => {
    expect(getBuiltinPlugin("nonexistent")).toBeUndefined();
    expect(getBuiltinPlugin("")).toBeUndefined();
  });

  it("all standard builtins are loadable", () => {
    for (const name of [
      "typescript",
      "nextjs",
      "git",
      "docker",
      "eslint",
      "vitest",
      "acp",
    ]) {
      const plugin = getBuiltinPlugin(name);
      expect(plugin, `builtin "${name}" should be registered`).toBeDefined();
      expect(plugin!.name).toBe(name);
      expect(typeof plugin!.setup).toBe("function");
    }
  });
});
