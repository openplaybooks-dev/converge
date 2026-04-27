import { defineConfig } from "tsup";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client/index.ts",
    "studio-api": "src/studio-api.ts",
  },
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: "node18",
  shims: true,
  // Bundle workspace dependencies
  noExternal: [/@converge\/.*/, "codets"],
  external: ["glob", "yaml", "tsx", /^tsx\/.*/],
  esbuildOptions(options) {
    // Add path aliases for workspace packages
    options.alias = {
      "@converge/agentfn": path.resolve(__dirname, "../agentfn/dist/index.js"),
      "@converge/agentfn/skills": path.resolve(
        __dirname,
        "../agentfn/dist/skills.js",
      ),
      "@converge/claudefn": path.resolve(
        __dirname,
        "../claudefn/dist/index.js",
      ),
      "@converge/kimifn": path.resolve(__dirname, "../kimifn/dist/index.js"),
      "@converge/qwenfn": path.resolve(__dirname, "../qwenfn/dist/index.js"),
      "@converge/geminifn": path.resolve(
        __dirname,
        "../geminifn/dist/index.js",
      ),
      codets: path.resolve(__dirname, "../codets/src/index.ts"),
    };
  },
});
