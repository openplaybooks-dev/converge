#!/usr/bin/env node
// Verifies that every section listed in apps/landing/.content/sections.json
// has a matching component file at the expected path, and that
// src/pages/index.astro imports + renders every section.
//
// Used by 04-build-sections (parent epic check).
// Exits 0 if everything checks out; 1 with a list of mismatches.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SECTIONS_JSON = 'apps/landing/.content/sections.json';
const COMPONENTS_DIR = 'apps/landing/src/components/sections';
const HOME_PAGE = 'apps/landing/src/pages/index.astro';

if (!existsSync(SECTIONS_JSON)) {
  console.error(`check-sections: ${SECTIONS_JSON} does not exist`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(SECTIONS_JSON, 'utf-8'));
const sections = Array.isArray(raw) ? raw : raw.sections;
if (!Array.isArray(sections) || sections.length === 0) {
  console.error('check-sections: sections.json has no sections');
  process.exit(1);
}

const failures = [];

// 1. Every section has a matching component file
for (const s of sections) {
  if (!s.componentName) {
    failures.push(`section ${s.id ?? '?'}: missing componentName`);
    continue;
  }
  const path = join(COMPONENTS_DIR, `${s.componentName}.astro`);
  if (!existsSync(path)) {
    failures.push(`section ${s.id}: component file missing at ${path}`);
  }
}

// 2. index.astro imports and uses every section
if (!existsSync(HOME_PAGE)) {
  failures.push(`${HOME_PAGE} does not exist`);
} else {
  const home = readFileSync(HOME_PAGE, 'utf-8');
  for (const s of sections) {
    if (!s.componentName) continue;
    const importRegex = new RegExp(
      `import\\s+${s.componentName}\\s+from\\s+['"][^'"]+['"]`,
    );
    const usageRegex = new RegExp(`<${s.componentName}\\b`);
    if (!importRegex.test(home)) {
      failures.push(`section ${s.id}: ${s.componentName} not imported in index.astro`);
    } else if (!usageRegex.test(home)) {
      failures.push(`section ${s.id}: ${s.componentName} imported but not rendered in index.astro`);
    }
  }
}

if (failures.length > 0) {
  console.error(`check-sections: ${failures.length} issue(s) found:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log(
  `OK all ${sections.length} sections have components and are mounted in index.astro`,
);
process.exit(0);
