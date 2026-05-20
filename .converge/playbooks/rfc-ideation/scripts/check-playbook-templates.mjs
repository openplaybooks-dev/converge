#!/usr/bin/env node
// Generic per-playbook structural validator.
// Recursively walks tasks/ and templates/ under this playbook's root,
// validates frontmatter YAML in every *.md, and parses playbook.yml.
//
// Default root: this script's grandparent directory (the playbook root).
// Usage:
//   check-playbook-templates.mjs                  # validates this playbook
//   check-playbook-templates.mjs <playbook-root>  # validates a specified root

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = dirname(here); // <playbook>/scripts/.. == <playbook>

const root = process.argv[2] ?? defaultRoot;

function walk(dir) {
  let files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) files = files.concat(walk(full));
    else if (entry === "TASK.md" || entry === "playbook.yml") files.push(full);
  }
  return files;
}

function frontMatter(markdown, file) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${file}: missing YAML front matter`);
  return match[1];
}

let failed = 0;
for (const file of walk(root)) {
  let yamlText;
  try {
    const text = readFileSync(file, "utf8");
    yamlText = file.endsWith(".yml") ? text : frontMatter(text, file);
  } catch (err) {
    console.error(`${file}: ${err.message}`);
    failed++;
    continue;
  }
  try {
    YAML.parse(yamlText);
  } catch (err) {
    console.error(`${file}: invalid YAML: ${err.message}`);
    failed++;
  }
}

if (failed > 0) process.exit(1);
