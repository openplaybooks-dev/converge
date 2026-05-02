import { defineConfig } from "tsup";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: {
    index: "src/main.ts",
  },
  format: ["esm"],
  target: "node18",
  clean: true,
  splitting: false,
  dts: false,
  outDir: "dist",
  tsconfig: "tsconfig.json",
});
