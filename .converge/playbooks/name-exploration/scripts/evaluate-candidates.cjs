#!/usr/bin/env node
const fs = require('fs');
const input = fs.existsSync('artifacts/name-exploration/collision-checked-candidates.json')
  ? 'artifacts/name-exploration/collision-checked-candidates.json'
  : 'artifacts/name-exploration/validated-candidates.json';
const candidates = JSON.parse(fs.readFileSync(input, 'utf8'));
const criteria = JSON.parse(fs.readFileSync('artifacts/name-exploration/criteria.json', 'utf8'));
const weights = Object.fromEntries((criteria.dimensions || []).map(d => [d.id, d.weight]));
const defaultWeights = {
  distinctiveness: 0.20,
  memorability: 0.15,
  'product-truth': 0.15,
  'brand-energy': 0.10,
  ownability: 0.15,
  'developer-fit': 0.15,
  mouthfeel: 0.10,
};
const W = { ...defaultWeights, ...weights };
function clamp(x){ return Math.max(1, Math.min(5, Math.round(x * 10) / 10)); }
function score(c) {
  const n = String(c.name || '');
  const lower = n.toLowerCase();
  const text = `${n} ${c.rationale || ''} ${c.why_creative || ''} ${c.territory || ''} ${c.ownability_notes || ''}`.toLowerCase();
  const len = n.length;
  const generic = /(agent|auto|lang|chain|crew|task|dag|check|flow|bot|copilot)/i.test(n);
  const literal = /(workflow|runner|orchestr|pipeline|project|manage)/i.test(text);
  const hard = !/[aeiouy]/i.test(n) || /[bcdfghjklmnpqrstvwxyz]{4,}/i.test(n);
  const product = /(proof|verify|check|join|weav|graph|lattice|trace|green|run|plan|playbook|artifact|receipt|ledger|route|bearing|stitch|bind|conver|fork|cache|replay|determin)/i.test(text);
  const collision = c.collision_risk === 'high' ? -1.2 : c.collision_risk === 'medium' ? -0.5 : 0;
  const coinagePenalty = /^[a-z]{5,7}$/i.test(n) && !product && /(ra|ro|la|lo|ia|io)$/i.test(n) ? -0.5 : 0;
  return {
    distinctiveness: clamp(3.2 + (len <= 8 ? .5 : -.4) + (!generic ? .5 : -1.2) + collision + coinagePenalty),
    memorability: clamp(3 + (len >= 4 && len <= 8 ? .7 : -.4) + (!hard ? .5 : -1)),
    'product-truth': clamp(2.4 + (product ? 1.4 : -.4) + (literal ? -.6 : 0)),
    'brand-energy': clamp(3 + ((c.why_creative || '').length > 90 ? .4 : 0) + (!generic ? .4 : -1) + coinagePenalty),
    ownability: clamp(3.2 + (!generic ? .4 : -1) + (len <= 10 ? .4 : -.4) + collision),
    'developer-fit': clamp(3.1 + (len <= 10 ? .5 : -.4) + (!hard ? .4 : -.8) + (!literal ? .2 : -.3)),
    mouthfeel: clamp(3 + (!hard ? .7 : -1) + (len <= 8 ? .3 : -.3)),
  };
}
function total(scores){
  const raw = Object.entries(scores).reduce((sum,[k,v]) => sum + v * (W[k] ?? 0), 0);
  const denom = Object.keys(scores).reduce((sum,k)=>sum+(W[k]??0),0) || 1;
  return Math.round((raw / denom) * 100) / 100;
}
let out = candidates.map(c => {
  if (c.available !== true) return { ...c, scored: false, scores: null, weighted_total: null };
  const scores = score(c);
  return { ...c, scored: true, scores, weighted_total: total(scores), score_rationale: 'Scored with stricter agency rubric, collision penalties, mouthfeel, product truth, ownability, and developer fit.' };
}).sort((a,b) => (b.weighted_total ?? -1) - (a.weighted_total ?? -1));
// Force useful spread: only a small elite can remain above 4.5/4.0.
let rank = 0;
out = out.map(c => {
  if (c.available !== true || c.weighted_total == null) return c;
  rank++;
  let cap = rank <= Math.ceil(out.filter(x=>x.available===true).length * 0.05) ? 4.8 : rank <= Math.ceil(out.filter(x=>x.available===true).length * 0.15) ? 4.4 : 4.0;
  return { ...c, weighted_total: Math.min(c.weighted_total, cap) };
}).sort((a,b) => (b.weighted_total ?? -1) - (a.weighted_total ?? -1));
fs.writeFileSync('artifacts/name-exploration/evaluated-candidates.json', JSON.stringify(out, null, 2));
console.log(`evaluated ${out.length} from ${input}`);
