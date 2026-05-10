#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const [specPath, findingsPath] = process.argv.slice(2);
if (!specPath || !findingsPath) {
  console.error('usage: check-selected-finding.mjs <improvement-spec.json> <findings.json>');
  process.exit(2);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const findingsDoc = JSON.parse(readFileSync(findingsPath, 'utf8'));
const selected = spec.selected || {};
const findings = Array.isArray(findingsDoc.findings) ? findingsDoc.findings : [];
const selectedId = selected.id;
if (!selectedId) {
  console.error('selected.id is required');
  process.exit(1);
}

const finding = findings.find((item) => item && item.id === selectedId);
if (!finding) {
  console.error(`selected.id '${selectedId}' is not present in observe/findings.json`);
  process.exit(1);
}

if (selected.priority_class && finding.priority_class && selected.priority_class !== finding.priority_class) {
  console.error(`selected.priority_class '${selected.priority_class}' does not match finding priority_class '${finding.priority_class}'`);
  process.exit(1);
}

if (selected.dimension && finding.dimension && selected.dimension !== finding.dimension) {
  console.error(`selected.dimension '${selected.dimension}' does not match finding dimension '${finding.dimension}'`);
  process.exit(1);
}

const candidateFiles = new Set(Array.isArray(finding.candidate_files) ? finding.candidate_files : []);
const selectedFiles = Array.isArray(selected.files) ? selected.files : [];
const outside = selectedFiles.filter((file) => candidateFiles.size > 0 && !candidateFiles.has(file));
if (outside.length) {
  console.error(`selected.files not listed in finding.candidate_files: ${outside.join(', ')}`);
  process.exit(1);
}
