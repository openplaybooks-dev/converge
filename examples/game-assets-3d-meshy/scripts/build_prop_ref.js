#!/usr/bin/env node
/**
 * 09 fan-out — generate one prop reference image.
 *
 * Like build_character_ref.js but props have no class — they use the global
 * art direction (style/palette/mood from pitch.md) directly as the cohesion
 * anchor. No reference image is attached; the global style sits in the prompt.
 *
 * Usage: node scripts/build_prop_ref.js <id>
 */

import './_load_env.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

const id = process.argv[2];
if (!id) { console.error('build_prop_ref: missing id arg'); process.exit(1); }

const props = JSON.parse(readFileSync('assets/props.json', 'utf-8'));
const p = props.find(x => x.id === id);
if (!p) { console.error(`no prop with id "${id}"`); process.exit(1); }

let style = '', palette = '', mood = '';
try {
  const pitch = readFileSync('assets/pitch.md', 'utf-8');
  style   = pitch.match(/\*\*Style\*\*:\s*(.+)/)?.[1]?.trim()   || '';
  palette = pitch.match(/\*\*Palette\*\*:\s*(.+)/)?.[1]?.trim() || '';
  mood    = pitch.match(/\*\*Mood\*\*:\s*(.+)/)?.[1]?.trim()    || '';
} catch {}

const prompt = `${p.description}

Visual style: ${style}.
Palette context: ${palette}.
Mood: ${mood}.

Composition: single prop centered, plain soft-gray studio background, no shadow, no environment, even diffuse lighting. Camera at slight 3/4 angle. 1024×1024.`;

const skillDir = '.converge/skills/image-generate';
const active = readFileSync(`${skillDir}/backends/ACTIVE`, 'utf-8').trim();
const backend = await import(pathToFileURL(resolve(`${skillDir}/backends/${active}/generate.js`)).href);

console.log(`  prop=${id} backend=${active}`);

const result = await backend.generate({
  prompt,
  references: [],                // props don't use class anchors
  aspect_ratio: '1:1',
  seed: 'auto',
  quality: 'final',
});

const outDir = `assets/props/${id}`;
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/reference.png`, result.image_bytes);

const spec = `# SPEC: ${id}

- **kind**: prop (non-rigged, non-animated)

## Description

${p.description}

## Pipeline path

1. **09-prop-references** *(this task)*: \`reference.png\`
2. **04-meshy-preview**: \`preview.glb\` (also fans out over props)
3. **05-meshy-refine**: \`model.glb\`
4. Skips rig + animate (humanoid: false)

## Reproducibility

- ref backend: ${result.model}
- ref seed: ${result.seed}
`;
writeFileSync(`${outDir}/SPEC.md`, spec);

console.log(`✓ ${outDir}/reference.png (${result.image_bytes.length} bytes, model=${result.model}, seed=${result.seed})`);
console.log(`✓ ${outDir}/SPEC.md`);
