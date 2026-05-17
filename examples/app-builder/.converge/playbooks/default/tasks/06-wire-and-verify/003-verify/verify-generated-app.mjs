import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const requiredFiles = [
  "package.json",
  "src/main.tsx",
  "src/app/router.tsx",
  "src/theme/theme.css",
  ".stitch/assets/manifest.json",
  ".stitch/interactions.json",
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error(`missing required file: ${file}`);
    process.exit(1);
  }
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const deps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

for (const pkg of [
  "react",
  "react-dom",
  "react-router-dom",
  "framer-motion",
  "tailwindcss",
  "vitest",
]) {
  if (!deps[pkg]) {
    console.error(`missing dependency: ${pkg}`);
    process.exit(1);
  }
}

const router = readFileSync("src/app/router.tsx", "utf8");
if (!router.includes("createBrowserRouter") && !router.includes("<Routes")) {
  console.error("router.tsx does not look like a router entrypoint");
  process.exit(1);
}

const theme = readFileSync("src/theme/theme.css", "utf8");
if (!theme.includes(":root") || !theme.includes("--")) {
  console.error("theme.css does not define css variables");
  process.exit(1);
}

function collectFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

const screenFiles = collectFiles("src/screens").filter((file) => file.endsWith(".tsx"));
if (screenFiles.length === 0) {
  console.error("no generated screen files found");
  process.exit(1);
}

const tests = collectFiles("src").filter((file) => file.endsWith(".test.tsx"));
if (tests.length === 0) {
  console.error("no generated test files found");
  process.exit(1);
}

console.log("generated app structure looks valid");

