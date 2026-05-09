#!/usr/bin/env node
const fs = require('fs');
const dir = '.converge/artifacts/due-diligence/diagrams';
const expected = [
  '01-company-overview', '02-leadership-orgchart', '03-financial-health',
  '04-employee-sentiment', '05-news-sentiment', '06-legal-risk-matrix',
  '07-key-events-timeline', '08-red-flags', '09-master-aggregation'
];
for (const id of expected) {
  const f = dir + '/' + id + '.excalidraw';
  if (!fs.existsSync(f)) throw new Error('Missing: ' + f);
  const raw = JSON.parse(fs.readFileSync(f, 'utf-8'));
  if (!raw.elements || raw.elements.length < 3) throw new Error(id + ' has too few elements: ' + raw.elements.length);
}
console.log('All 9 diagrams present with elements');
