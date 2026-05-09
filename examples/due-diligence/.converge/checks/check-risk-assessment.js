#!/usr/bin/env node
const fs = require('fs');
const path = '.converge/artifacts/due-diligence/risk-assessment.json';
const d = JSON.parse(fs.readFileSync(path, 'utf-8'));
const dims = ['financialHealth', 'leadershipStability', 'employeeSatisfaction', 'legalRisk', 'marketPosition', 'growthTrajectory'];
for (const dim of dims) {
  if (typeof d[dim] !== 'number' || d[dim] < 1 || d[dim] > 10)
    throw new Error(dim + ' must be 1-10, got: ' + d[dim]);
}
if (!Array.isArray(d.redFlags)) throw new Error('redFlags must be an array');
console.log('Overall:', d.overallRiskScore, '| Red flags:', d.redFlags.length);
