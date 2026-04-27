#!/usr/bin/env node
/**
 * Emit assets/scene.json — deterministic placement of every character + prop
 * on the tilemap.
 *
 * Layout:
 *   - characters arranged in a row at z = -2, equally spaced
 *   - props scattered via Halton(2,3) sequence in the outer ring (radius > 6)
 *
 * The scene viewer reads this file at runtime to know where to put each model.
 */

import { readFileSync, writeFileSync } from 'fs';

const characters = JSON.parse(readFileSync('assets/characters.json', 'utf-8'));
const props = JSON.parse(readFileSync('assets/props.json', 'utf-8'));

function halton(index, base) {
  let f = 1, r = 0;
  while (index > 0) { f /= base; r += f * (index % base); index = Math.floor(index / base); }
  return r;
}

const placements = [];

// Characters in a row at the front, equally spaced, facing camera.
const charSpacing = 2.5;
const rowZ = -1.5;
const rowOriginX = -((characters.length - 1) * charSpacing) / 2;
characters.forEach((c, i) => {
  placements.push({
    id: `char-${c.id}`,
    asset_id: c.id,
    asset_kind: 'character',
    asset_class: c.class,
    glb: `assets/characters/${c.id}/model.glb`,
    idle_glb: `assets/characters/${c.id}/anims/Idle.glb`,
    position: [+(rowOriginX + i * charSpacing).toFixed(2), 0, rowZ],
    rotation: [0, 0, 0],
    scale: 1,
  });
});

// Props scattered with low-discrepancy Halton sequence in an outer ring,
// avoiding the row of characters at z ≈ -1.5.
const ARENA_HALF = 12;
let placed = 0, attempt = 0;
while (placed < props.length * 3 && attempt < 100) {
  attempt++;
  const u = halton(attempt, 2);
  const v = halton(attempt, 3);
  // Outer ring: r in [6, 11], any angle.
  const r = 6 + u * 5;
  const t = v * Math.PI * 2;
  const x = +(Math.cos(t) * r).toFixed(2);
  const z = +(Math.sin(t) * r).toFixed(2);
  // Skip if too close to the character row.
  if (Math.abs(z - rowZ) < 1.5 && Math.abs(x) < (characters.length * charSpacing) / 2 + 1) continue;
  const prop = props[placed % props.length];
  placements.push({
    id: `prop-${prop.id}-${placed}`,
    asset_id: prop.id,
    asset_kind: 'prop',
    glb: `assets/props/${prop.id}/model.glb`,
    position: [x, 0, z],
    rotation: [0, +(t + Math.PI / 4).toFixed(2), 0],
    scale: 0.8 + (placed % 3) * 0.2,
  });
  placed++;
}

const scene = {
  arena: { size: ARENA_HALF * 2, tilesPerSide: 8 },
  cameraSuggestion: { position: [0, 4, 10], lookAt: [0, 1, -1] },
  placements,
};

writeFileSync('assets/scene.json', JSON.stringify(scene, null, 2) + '\n');
console.log(`✓ assets/scene.json (${characters.length} characters + ${placed} prop placements = ${placements.length} total)`);
