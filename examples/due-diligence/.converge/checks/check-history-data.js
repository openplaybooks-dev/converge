#!/usr/bin/env node
const fs = require('fs');
const path = '.converge/artifacts/due-diligence/wayback/history-data.json';
const d = JSON.parse(fs.readFileSync(path, 'utf-8'));
if (!d.archiveOverview) throw new Error('Missing archiveOverview');
if (!Array.isArray(d.historicalSnapshots)) throw new Error('historicalSnapshots must be an array');
console.log('First snapshot:', d.archiveOverview.firstSnapshot, '| Total:', d.archiveOverview.totalSnapshots, '| Milestones:', (d.milestones || []).length);
