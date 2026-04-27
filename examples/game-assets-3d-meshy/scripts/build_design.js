#!/usr/bin/env node
/**
 * 01-design — parse idea.md → pitch.md + characters.json.
 *
 * Walks H3 sections under "## Required characters" — each H3 is a class
 * (warrior/mage/ranger/...). Each bullet under an H3 is one character.
 *
 * Animation list is derived from class:
 *   warrior  → [Idle, Walk, Attack]
 *   mage     → [Idle, Walk, CastSpell]
 *   ranger   → [Idle, Walk, BowDraw]
 *   default  → [Idle, Walk]
 *
 * Bullet shape:  - **id**: description
 * The id becomes the file-safe slug; description is the prompt fragment.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

function fail(msg) { console.error('build_design:', msg); process.exit(1); }

const idea = readFileSync('idea.md', 'utf-8');

const titleMatch = idea.match(/^#\s+(.+)$/m);
const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

function grab(label) {
  const re = new RegExp(`-\\s+\\*\\*${label}\\*\\*\\s*:\\s*(.+)$`, 'im');
  const m = idea.match(re);
  return m ? m[1].trim() : null;
}

const style   = grab('Style')   || '';
const palette = grab('Palette') || '';
const mood    = grab('Mood')    || '';

// Find the "Required characters" section; everything after it up to the next
// H2 (or EOF) is the body we walk.
const reqIdx = idea.search(/^##\s+Required characters/im);
if (reqIdx < 0) fail('idea.md is missing a "## Required characters" section');
const reqBlock = (() => {
  const tail = idea.slice(reqIdx);
  const next = tail.slice(2).search(/^##\s+/m);
  return next < 0 ? tail : tail.slice(0, next + 2);
})();

const ANIMS_BY_CLASS = {
  warrior: ['Idle', 'Walk', 'Attack'],
  mage:    ['Idle', 'Walk', 'CastSpell'],
  ranger:  ['Idle', 'Walk', 'BowDraw'],
};

const characters = [];
let currentClass = null;
for (const line of reqBlock.split('\n')) {
  const h3 = line.match(/^###\s+(.+)$/);
  if (h3) {
    currentClass = h3[1].trim().toLowerCase();
    continue;
  }
  const bullet = line.match(/^-\s+\*\*([\w-]+)\*\*\s*:\s*(.+)$/);
  if (bullet && currentClass) {
    const id = bullet[1];
    const description = bullet[2].trim();
    characters.push({
      id,
      class: currentClass,
      humanoid: true,                                 // every character is humanoid in this example
      description,
      palette_hint: extractPaletteHint(description),
      animations: ANIMS_BY_CLASS[currentClass] || ['Idle', 'Walk'],
    });
  }
}

if (!characters.length) fail('found no character bullets — expected "- **id**: description" under H3 class headings');

// Heuristic: second/third sentences often describe palette. Fall back to whole description.
function extractPaletteHint(desc) {
  const sentences = desc.split(/\.\s+/).map(s => s.trim()).filter(Boolean);
  // Prefer sentences mentioning color words.
  const colorish = sentences.filter(s => /\b(steel|silver|gold|red|blue|green|brown|amber|teal|bronze|leather|iron|crystal|moss|wood|stone|rust)\b/i.test(s));
  return (colorish[0] || sentences[0] || desc).slice(0, 200);
}

// ── Environment props ────────────────────────────────────────────────
// Parse "## Required environment props" — each bullet is a non-rigged prop.
const props = [];
const propsIdx = idea.search(/^##\s+Required environment props/im);
if (propsIdx >= 0) {
  const tail = idea.slice(propsIdx);
  const next = tail.slice(2).search(/^##\s+/m);
  const propsBlock = next < 0 ? tail : tail.slice(0, next + 2);
  for (const line of propsBlock.split('\n')) {
    const bullet = line.match(/^-\s+\*\*([\w-]+)\*\*\s*:\s*(.+)$/);
    if (bullet) {
      const id = bullet[1];
      const description = bullet[2].trim();
      props.push({
        id,
        kind: 'prop',
        humanoid: false,
        description,
        palette_hint: extractPaletteHint(description),
      });
    }
  }
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/characters.json', JSON.stringify(characters, null, 2) + '\n');
writeFileSync('assets/props.json', JSON.stringify(props, null, 2) + '\n');

const pitch = `# ${title}

> Studio one-pager generated from idea.md. Re-edit and re-run \`converge run\` to refresh.

## Logline

${idea.split(/\n\n+/).find(p => !p.startsWith('#') && !p.startsWith('-'))?.trim() || ''}

## Art direction

- **Style**: ${style}
- **Palette**: ${palette}
- **Mood**: ${mood}

## Cast (${characters.length} characters across ${new Set(characters.map(c=>c.class)).size} classes)

${characters.map(c => `- \`${c.id}\` — *${c.class}* — ${c.description}`).join('\n')}

## Environment props (${props.length})

${props.length ? props.map(p => `- \`${p.id}\` — ${p.description}`).join('\n') : '_(none defined — add a "## Required environment props" section to idea.md)_'}
`;
writeFileSync('assets/pitch.md', pitch);

console.log(`✓ assets/characters.json (${characters.length} characters, classes: ${[...new Set(characters.map(c => c.class))].join(', ')})`);
console.log(`✓ assets/props.json (${props.length} props)`);
console.log(`✓ assets/pitch.md`);
