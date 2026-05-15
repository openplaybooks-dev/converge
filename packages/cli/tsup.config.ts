import { defineConfig } from "tsup";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: {
    index: "src/main.ts",
  },
  format: ["esm"],
  dts: false,
  sourcemap: false,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: "node18",
  shims: true,
  noExternal: [/@converge\/.*/, "@converge/claudefn"],
  external: [
    "glob",
    "yaml",
    "tsx",
    /^tsx\/.*/,
    // The Agent SDK resolves `./cli.js` relative to its own import.meta.url
    // at runtime. Bundling it into cli/dist/index.js breaks that lookup
    // (the cli.js sibling no longer exists). Keep it external so node
    // resolves the real installed package path at runtime.
    "@anthropic-ai/claude-agent-sdk",
  ],
  onSuccess: async () => {
    const fs = await import("fs");
    const cliPath = path.resolve(__dirname, "dist/index.js");
    const content = fs.readFileSync(cliPath, "utf-8");
    if (!content.startsWith("#!/usr/bin/env node")) {
      fs.writeFileSync(cliPath, "#!/usr/bin/env node\n" + content);
      fs.chmodSync(cliPath, "755");
    }

    // Bundle skills from monorepo root into the package for distribution
    const skillsSrc = path.resolve(__dirname, "../../skills");
    const skillsDest = path.resolve(__dirname, "skills");
    if (fs.existsSync(skillsSrc)) {
      fs.cpSync(skillsSrc, skillsDest, { recursive: true });
    }
  },
});
