import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

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

const appFiles = collectFiles("src").filter(
  (file) => file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".css"),
);
const source = appFiles.map((file) => readFileSync(file, "utf8")).join("\n");

for (const bad of ["TODO", "FIXME", "Lorem ipsum", "Coming soon", "placeholder"]) {
  if (source.includes(bad)) {
    console.error(`placeholder content detected: ${bad}`);
    process.exit(1);
  }
}

if (source.includes("onClick={() => {}}") || source.includes("onClick={() => null}")) {
  console.error("empty click handler detected");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(".stitch/assets/manifest.json", "utf8"));
const interactions = JSON.parse(readFileSync(".stitch/interactions.json", "utf8"));

const assets = Array.isArray(manifest) ? manifest : (manifest.assets ?? []);
if (assets.length === 0) {
  console.error("asset manifest is empty");
  process.exit(1);
}

const outputPaths = assets.map((asset) => asset.output).filter(Boolean);
if (!outputPaths.some((p) => source.includes(p))) {
  console.error("no generated asset path is referenced by app source");
  process.exit(1);
}

const interactionEntries = Array.isArray(interactions)
  ? interactions
  : (interactions.interactions ?? interactions.screens ?? []);
if (interactionEntries.length === 0) {
  console.error("interaction manifest is empty");
  process.exit(1);
}

const interactionText = JSON.stringify(interactions).toLowerCase();
const playfulTokens = ["drag", "quiz", "shuffle", "builder", "play", "game"];
if (!playfulTokens.some((token) => interactionText.includes(token))) {
  console.error("no playful interaction declared in interaction manifest");
  process.exit(1);
}

if (!source.toLowerCase().includes("localstorage")) {
  console.error("no persisted preference path detected");
  process.exit(1);
}

console.log("assets and interactions look wired");

