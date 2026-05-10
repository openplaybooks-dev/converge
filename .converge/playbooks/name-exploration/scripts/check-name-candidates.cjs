#!/usr/bin/env node
const fs = require('fs');
const path = process.argv[2];
const source = process.argv[3];
if (!path || !source) {
  console.error('usage: check-name-candidates.cjs <file> <strategy_source>');
  process.exit(2);
}
const forbidden = new Set([
  'klex','tarn','prox','gant','cliv','drex','starn','flint','crux','thresh',
  'avelo','imara','eluno','orina','ameli','uvano','erilo','aleno',
  'prisma','deno','verceli','lucida','vorta','nexa','sona','vigo','strika',
  'strv','nxd','vlnt','crnx','drvn','prlx','sklp','thnk',
  'agentflow','autotask','taskforge','dagrun','checkflow','langchain','langgraph',
]);
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!Array.isArray(data)) fail('file must be a JSON array');
const seen = new Set();
for (const [i, c] of data.entries()) {
  for (const key of ['name','rationale','category','strategy_source','territory','pronunciation','why_creative','risk']) {
    if (!c || typeof c[key] !== 'string' || !c[key].trim()) fail(`candidate ${i} missing ${key}`);
  }
  if (c.strategy_source !== source) fail(`candidate ${i} has strategy_source=${c.strategy_source}, expected ${source}`);
  const n = c.name.toLowerCase().trim();
  if (seen.has(n)) fail(`duplicate name: ${c.name}`);
  seen.add(n);
  if (!/^[a-z][a-z0-9-]{1,28}$/i.test(c.name)) fail(`invalid npm-ish name: ${c.name}`);
  if (c.name.length > 15) fail(`too long: ${c.name}`);
  if (forbidden.has(n)) fail(`forbidden copied/generic example: ${c.name}`);
  if (/^(agent|auto|lang|ai|task|dag|check|flow)/i.test(c.name) && c.name.length > 8) {
    fail(`too literal/generic: ${c.name}`);
  }
  if (c.rationale.length < 80) fail(`thin rationale: ${c.name}`);
  if (c.why_creative.length < 40) fail(`thin why_creative: ${c.name}`);
}
function fail(msg) { console.error(msg); process.exit(1); }
