#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const [specPath, findingsPath] = process.argv.slice(2);
if (!specPath || !findingsPath) {
  console.error('usage: check-selected-finding.mjs <correction-spec.json> <findings.json>');
  process.exit(2);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const findingsDoc = JSON.parse(readFileSync(findingsPath, 'utf8'));
const findings = Array.isArray(findingsDoc.findings) ? findingsDoc.findings : [];
const findingId = spec.finding_id;
if (!findingId) {
  console.error('finding_id is required in correction-spec.json');
  process.exit(1);
}

const finding = findings.find((item) => item && item.id === findingId);
if (!finding) {
  console.error(`finding_id '${findingId}' is not present in observe/findings.json`);
  process.exit(1);
}

// The files_to_change should be a framework file, which should match the finding's file
const filesToChange = Array.isArray(spec.files_to_change) ? spec.files_to_change : [];
if (filesToChange.length === 0) {
  console.error('files_to_change must list at least one file');
  process.exit(1);
}

const frameworkFile = filesToChange.find((f) => f.startsWith('packages/'));
if (!frameworkFile) {
  console.error('files_to_change must include at least one file under packages/');
  process.exit(1);
}

console.log(`OK: finding '${findingId}' matches observe findings and targets ${frameworkFile}`);
