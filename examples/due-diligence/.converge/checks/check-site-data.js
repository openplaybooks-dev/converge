#!/usr/bin/env node
const fs = require('fs');
const path = '.converge/artifacts/due-diligence/company-site/site-data.json';
const d = JSON.parse(fs.readFileSync(path, 'utf-8'));
if (!d.company || !d.website) throw new Error('Missing required fields');
if (!Array.isArray(d.leadership)) throw new Error('leadership must be an array');
if (!Array.isArray(d.products)) throw new Error('products must be an array');
console.log('Company:', d.company, '| Leadership:', d.leadership.length, '| Products:', d.products.length);
