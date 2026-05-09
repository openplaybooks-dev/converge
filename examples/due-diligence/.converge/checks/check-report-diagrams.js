#!/usr/bin/env node
const fs = require('fs');
const h = fs.readFileSync('.converge/artifacts/due-diligence/report/index.html', 'utf-8');
const refs = [
  '01-company-overview', '02-leadership-orgchart', '03-financial-health',
  '04-employee-sentiment', '05-news-sentiment', '06-legal-risk-matrix',
  '07-key-events-timeline', '08-red-flags', '09-master-aggregation'
];
let missing = 0;
for (const r of refs) {
  if (!h.includes(r + '.excalidraw')) { console.log('Missing ref:', r); missing++; }
}
if (missing > 3) throw new Error(missing + ' diagram refs missing from report');
console.log('Diagram refs found:', 9 - missing, '/ 9');
