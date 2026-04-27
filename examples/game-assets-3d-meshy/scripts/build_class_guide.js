#!/usr/bin/env node
/**
 * 02 fan-out — generate one class style guide + reference image.
 *
 * For a class (e.g. "warrior"), reads every character of that class from
 * characters.json, composes a class-level prompt, calls the image-generate
 * skill (active backend) ONCE, writes:
 *   assets/shared/classes/<class>/reference.png
 *   assets/shared/classes/<class>/style-guide.md
 *
 * Usage: node scripts/build_class_guide.js <class>
 */

import './_load_env.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

const cls = process.argv[2];
if (!cls) { console.error('build_class_guide: missing class arg'); process.exit(1); }

const characters = JSON.parse(readFileSync('assets/characters.json', 'utf-8'));
const classChars = characters.filter(c => c.class === cls);
if (!classChars.length) { console.error(`no characters of class "${cls}"`); process.exit(1); }

// Pull global art direction from pitch.md so the class guide nests under it.
let style = '', palette = '', mood = '';
try {
  const pitch = readFileSync('assets/pitch.md', 'utf-8');
  style   = pitch.match(/\*\*Style\*\*:\s*(.+)/)?.[1]?.trim()   || '';
  palette = pitch.match(/\*\*Palette\*\*:\s*(.+)/)?.[1]?.trim() || '';
  mood    = pitch.match(/\*\*Mood\*\*:\s*(.+)/)?.[1]?.trim()    || '';
} catch {}

// Compose a class anchor prompt: global style + a synthesis of all this class's characters.
const classDescriptions = classChars.map(c => `- ${c.id}: ${c.description}`).join('\n');
const prompt = `Single character reference image, full body standing pose, neutral idle stance, plain soft-gray studio background, even diffuse lighting, no shadow, no environment.

This image anchors the visual style of every "${cls}" character in the cast. It should clearly read as the canonical "${cls}" silhouette/material/palette for this game.

Global art direction:
- Style: ${style}
- Palette: ${palette}
- Mood: ${mood}

${cls.charAt(0).toUpperCase() + cls.slice(1)} characters in this game:
${classDescriptions}

Render a single representative ${cls} (composite traits if there are multiple) facing slightly to the camera-right, in a relaxed standing pose. 1024×1024.`;

// Load the active image-generate backend.
const skillDir = '.converge/skills/image-generate';
const active = readFileSync(`${skillDir}/backends/ACTIVE`, 'utf-8').trim();
const backend = await import(pathToFileURL(resolve(`${skillDir}/backends/${active}/generate.js`)).href);

console.log(`  class=${cls} backend=${active}`);

const result = await backend.generate({
  prompt,
  references: [],                  // class anchor has no upstream reference
  aspect_ratio: '1:1',
  seed: 'auto',
  quality: 'final',
});

const outDir = `assets/shared/classes/${cls}`;
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/reference.png`, result.image_bytes);

const md = `# ${cls.charAt(0).toUpperCase() + cls.slice(1)} class style guide

This document and \`reference.png\` anchor the visual style of every ${cls}-class character in the cast. Each character generation in task 03 attaches \`reference.png\` as a Gemini reference image — that's how cross-character cohesion is enforced in this pipeline.

## Global art direction

- **Style**: ${style}
- **Palette**: ${palette}
- **Mood**: ${mood}

## Characters in this class (${classChars.length})

${classChars.map(c => `- \`${c.id}\` — ${c.description}`).join('\n')}

## Class-level visual rules

The reference image generation prompt was:

> ${prompt.replace(/\n/g, '\n> ')}

## Reproducibility

- backend: ${result.model}
- seed: ${result.seed}
`;
writeFileSync(`${outDir}/style-guide.md`, md);

console.log(`✓ ${outDir}/reference.png (${result.image_bytes.length} bytes, model=${result.model}, seed=${result.seed})`);
console.log(`✓ ${outDir}/style-guide.md`);
