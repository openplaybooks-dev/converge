import type { ConvergePluginV2 } from "../../types.ts";

const acpPlugin: ConvergePluginV2 = {
  name: "acp",
  version: "1.0.0",
  description: "ACP (Anthropic Client Protocol) provider using @openplaybooks/acpfn",
  requires: [],

  setup() {
    // No-op: acpfn handles its own SDK dependency lazily.
    // The plugin's sole purpose is to register the provider factory.
  },

  registerProviders(registry) {
    registry.register("acp", async (opts: Record<string, unknown>) => {
      const { acpfn } = await import("@openplaybooks/acpfn");
      return (acpfn as any)(opts);
    });
  },
};

export default acpPlugin;
