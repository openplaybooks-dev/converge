---
name: migrate-children
description: >
  Walks a playbook's task directory and declares children: in each parent
  TASK.md. Used by phase 04 of dbt-paradigm to migrate live playbooks
  from folder-scan to declarative children.
kind: nodejs
args:
  playbook_path:
    type: string
---
// Seed: migrate-children
// Reads the folder structure under a playbook's tasks/ directory and
// writes children: declarations into each parent TASK.md frontmatter.
//
// The path override lets the caller control where output TASK.md files land.

const { readdirSync, readFileSync, writeFileSync, existsSync } = require("node:fs");
const { join, basename, dirname } = require("node:path");

const playbookPath = ctx.args.playbook_path;
const tasksDir = join(playbookPath, "tasks");

if (!existsSync(tasksDir)) {
  ctx.log.warn(`No tasks/ directory at ${tasksDir}`);
  return;
}

function scanParents(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const parents: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = join(dir, entry.name);
    const taskMd = join(fullPath, "TASK.md");
    if (existsSync(taskMd)) {
      const content = readFileSync(taskMd, "utf-8");
      if (!content.match(/^children:/m) && !content.match(/^from_seed:/m)) {
        parents.push(fullPath);
      }
    }
    // Recurse
    parents.push(...scanParents(fullPath));
  }
  return parents;
}

const parents = scanParents(tasksDir);
ctx.log.info(`Found ${parents.length} parent(s) without children declarations`);

for (const parentPath of parents) {
  ctx.spawn({
    id: `migrate-${basename(parentPath)}`,
    label: `Migrate ${basename(parentPath)} to declarative children`,
  });
}
