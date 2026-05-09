#!/usr/bin/env node
const fs = require('fs');
const h = fs.readFileSync('.converge/artifacts/due-diligence/report/index.html', 'utf-8');
const sections = ['Executive Summary', 'Company Profile', 'Financial Analysis', 'People', 'Market', 'Legal', 'Red Flags', 'Diagrams'];
for (const s of sections) {
  if (!h.includes(s)) throw new Error('Missing section: ' + s);
}
console.log('All sections present | Size:', (h.length / 1024).toFixed(0) + 'KB');
