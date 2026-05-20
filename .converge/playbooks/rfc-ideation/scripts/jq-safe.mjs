#!/usr/bin/env node
/**
 * jq-safe.mjs — BOM-safe wrapper for jq.
 * Strips UTF-8 BOM before passing JSON to jq.
 * Usage: jq-safe.mjs <jq args> <file>
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: jq-safe.mjs <jq args> <file>");
  process.exit(2);
}

const file = args[args.length - 1];
const jqArgs = args.slice(0, -1);

try {
  let content = readFileSync(file);
  if (content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
    content = content.slice(3);
  }
  const tmpPath = file + ".no-bom.tmp";
  writeFileSync(tmpPath, content);
  const result = execSync(`jq ${jqArgs.join(" ")} "${tmpPath}"`, {
    encoding: "utf8", stdio: "pipe",
  });
  unlinkSync(tmpPath);
  process.stdout.write(result);
  process.exit(0);
} catch (e) {
  try { unlinkSync(file + ".no-bom.tmp"); } catch {}
  process.exit(e.status || 1);
}