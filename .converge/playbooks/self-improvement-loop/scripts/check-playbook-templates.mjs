#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const [root = '.converge/playbooks/self-improvement-loop'] = process.argv.slice(2);
const files = [
  'playbook.yml',
  'tasks/improve/TASK.md',
  'templates/epoch/TASK.md',
  'templates/epoch/tasks/observe/TASK.md',
  'templates/epoch/tasks/select/TASK.md',
  'templates/epoch/tasks/implement/TASK.md',
  'templates/epoch/tasks/verify/TASK.md',
  'templates/epoch/tasks/summarize/TASK.md',
];

function frontMatter(markdown, file) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${file}: missing YAML front matter`);
  return match[1];
}

for (const rel of files) {
  const file = join(root, rel);
  const text = readFileSync(file, 'utf8');
  const yamlText = rel.endsWith('.yml') ? text : frontMatter(text, rel);
  try {
    YAML.parse(yamlText);
  } catch (error) {
    console.error(`${rel}: invalid YAML: ${error.message}`);
    process.exit(1);
  }
}

const verify = readFileSync(join(root, 'templates/epoch/tasks/verify/TASK.md'), 'utf8');
if (verify.includes('cmd: "jq -e --arg cmd "$(jq')) {
  console.error('verify task contains invalid nested double-quoted shell substitution');
  process.exit(1);
}

const seed = readFileSync(join(root, 'templates/epoch/seeds/epoch-seed.seed.js'), 'utf8');
for (const phase of ['observe', 'select', 'implement', 'verify', 'summarize']) {
  if (!seed.includes(`'${phase}'`)) {
    console.error(`epoch seed does not spawn ${phase} stage`);
    process.exit(1);
  }
}

const requiredScripts = [
  'scripts/checkpoint-dirty-tree.mjs',
  'scripts/check-clean-start.mjs',
  'scripts/check-selected-finding.mjs',
  'scripts/check-final-diff.mjs',
  'scripts/check-patch-manifest.mjs',
  'scripts/generate-patch-manifest.mjs',
  'scripts/check-selection-quality.mjs',
  'scripts/check-verification-strength.mjs',
  'scripts/check-epoch-complete.mjs',
];
for (const rel of requiredScripts) {
  try {
    readFileSync(join(root, rel), 'utf8');
  } catch {
    console.error(`missing required script: ${rel}`);
    process.exit(1);
  }
}
