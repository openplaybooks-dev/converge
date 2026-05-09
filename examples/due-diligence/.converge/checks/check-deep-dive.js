#!/usr/bin/env node
const fs = require('fs');
const root = '.converge/artifacts/due-diligence/deep-dive';
const exec = root + '/executives';
const prod = root + '/products';
const risk = root + '/risks';
const legal = root + '/legal';
const spawned =
  (fs.existsSync(exec) ? fs.readdirSync(exec).filter(f => f.endsWith('.json')).length : 0) +
  (fs.existsSync(prod) ? fs.readdirSync(prod).filter(f => f.endsWith('.json')).length : 0) +
  (fs.existsSync(risk) ? fs.readdirSync(risk).filter(f => f.endsWith('.json')).length : 0) +
  (fs.existsSync(legal) ? fs.readdirSync(legal).filter(f => f.endsWith('.json')).length : 0);
console.log('Spawned', spawned, 'deep-dive tasks');
if (spawned === 0) throw new Error('No deep-dive tasks spawned');
