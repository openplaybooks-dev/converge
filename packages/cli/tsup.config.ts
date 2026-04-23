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
  external: ["glob", "yaml", "tsx", /^tsx\/.*/],
  onSuccess: async () => {
    const fs = await import("fs");
    const cliPath = path.resolve(__dirname, "dist/index.js");
    const content = fs.readFileSync(cliPath, "utf-8");
    if (!content.startsWith("#!/usr/bin/env node")) {
      fs.writeFileSync(cliPath, "#!/usr/bin/env node\n" + content);
      fs.chmodSync(cliPath, "755");
    }
  },
});
