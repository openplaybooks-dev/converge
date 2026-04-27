#!/usr/bin/env node
/**
 * 03 fan-out — generate one character reference image.
 *
 * Reads a character entry from characters.json, attaches the class style guide's
 * reference.png as a Gemini reference, calls image-generate, writes:
 *   assets/characters/<id>/reference.png
 *   assets/characters/<id>/SPEC.md
 *
 * Usage: node scripts/build_character_ref.js <id>
 */

import './_load_env.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

const id = process.argv[2];
if (!id) { console.error('build_character_ref: missing id arg'); process.exit(1); }

const characters = JSON.parse(readFileSync('assets/characters.json', 'utf-8'));
const ch = characters.find(c => c.id === id);
if (!ch) { console.error(`no character with id "${id}"`); process.exit(1); }

const classRefPath = `assets/shared/classes/${ch.class}/reference.png`;
if (!existsSync(classRefPath)) {
  console.error(`class reference missing at ${classRefPath} — run 02-class-guides first`);
  process.exit(1);
}

const prompt = `${ch.description}

Visual style: refer to the attached class reference image. Match its palette, material treatment, and silhouette family — this character must clearly belong to that style family.

Composition: full body, neutral standing pose, plain soft-gray studio background, no shadow, no environment, even diffuse lighting. Camera at chest height with a slight low angle. Character centered. 1024×1024.

Palette emphasis: ${ch.palette_hint}.`;

const skillDir = '.converge/skills/image-generate';
const active = readFileSync(`${skillDir}/backends/ACTIVE`, 'utf-8').trim();
const backend = await import(pathToFileURL(resolve(`${skillDir}/backends/${active}/generate.js`)).href);

console.log(`  id=${id} class=${ch.class} backend=${active}`);

const result = await backend.generate({
  prompt,
  references: [classRefPath],
  aspect_ratio: '1:1',
  seed: 'auto',
  quality: 'final',
});

const outDir = `assets/characters/${id}`;
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/reference.png`, result.image_bytes);

const spec = `# SPEC: ${id}

- **class**: ${ch.class} (humanoid: ${ch.humanoid})
- **animations**: ${ch.animations.join(', ')}
- **class anchor**: \`assets/shared/classes/${ch.class}/reference.png\`

## Description

${ch.description}

## Palette emphasis

${ch.palette_hint}

## Pipeline path

1. **02-class-guides**: \`shared/classes/${ch.class}/{reference.png, style-guide.md}\`
2. **03-references** *(this task)*: \`reference.png\` (1024×1024) — attached to nanobanana with the class anchor as reference
3. **04-meshy-preview**: \`preview.glb\` (image-to-3D)
4. **05-meshy-refine**: \`model.glb\` (PBR-textured)
5. **06-meshy-rig**: \`rigged.glb\` (humanoid auto-rig)
6. **07-meshy-animate**: \`anims/{${ch.animations.join(',')}}.glb\`

## Reproducibility

- ref backend: ${result.model}
- ref seed: ${result.seed}
`;
writeFileSync(`${outDir}/SPEC.md`, spec);

console.log(`✓ ${outDir}/reference.png (${result.image_bytes.length} bytes, model=${result.model}, seed=${result.seed})`);
console.log(`✓ ${outDir}/SPEC.md`);
