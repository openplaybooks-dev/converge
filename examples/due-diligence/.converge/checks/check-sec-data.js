#!/usr/bin/env node
const fs = require('fs');
const path = '.converge/artifacts/due-diligence/sec-edgar/sec-data.json';
const d = JSON.parse(fs.readFileSync(path, 'utf-8'));
if (!d.company) throw new Error('Missing company');
if (d.publicCompany === false) { console.log('Private company - no SEC data'); process.exit(0); }
if (!d.latest10K) throw new Error('Missing latest10K');
console.log('10-K revenue:', d.latest10K.revenue, '| Risk factors:', (d.latest10K.riskFactors || []).length);
