#!/usr/bin/env node
const fs = require('fs');
const files = [
  'semantic-field','metaphor-domains','latin-greek-roots','npm-pattern-study','competitive-ai',
  'phonetic-aesthetics','brand-blending','abstract-evocative','mythology-narrative','science-nature'
].map(s => [`artifacts/name-exploration/${s}-candidates.json`, s]);
const out = [];
const seen = new Set();
const summary = {};
for (const [file, source] of files) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
  const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
  summary[source] = 0;
  for (const c of arr) {
    if (!c || typeof c.name !== 'string') continue;
    const key = c.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    summary[source]++;
  }
}
fs.mkdirSync('artifacts/name-exploration', { recursive: true });
fs.writeFileSync('artifacts/name-exploration/strategy-summary.json', JSON.stringify(summary, null, 2));
fs.writeFileSync('artifacts/name-exploration/all-candidates.json', JSON.stringify(out, null, 2));
console.log(`merged ${out.length} candidates`);
