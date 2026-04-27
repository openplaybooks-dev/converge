// Build-time generator: scans assets/{dungeon,hexagon,furniture}, writes
// catalog manifest files (one per group, multi-export). Re-run any time
// new packs are vendored.

import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

type Group = {
  /** Dir under examples/game-assets-lego/assets/ */
  dir: string;
  /** Glob extension to pick up. */
  ext: '.glb' | '.gltf';
  /** Asset kind tag for metadata. */
  kind: 'prop' | 'building' | 'character';
  /** Slug prefix to namespace this group's slugs (e.g. 'dungeon-'). */
  slugPrefix: string;
  /** Output catalog file (single .ts that exports an array of AssetModules). */
  outFile: string;
  /** Pretty-name prefix in metadata.name (e.g. 'Dungeon: '). */
  namePrefix: string;
};

const GROUPS: Group[] = [
  {
    dir: 'assets/dungeon',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'dungeon-',
    outFile: 'catalog/dungeon/_pack.ts',
    namePrefix: 'Dungeon: ',
  },
  {
    dir: 'assets/hexagon',
    ext: '.gltf',
    kind: 'building',
    slugPrefix: 'hex-',
    outFile: 'catalog/hexagon/_pack.ts',
    namePrefix: 'Hex: ',
  },
  {
    dir: 'assets/furniture',
    ext: '.gltf',
    kind: 'prop',
    slugPrefix: 'furn-',
    outFile: 'catalog/furniture/_pack.ts',
    namePrefix: 'Furniture: ',
  },
  // Kenney Mini packs — simpler/blockier CC0 alternative to KayKit.
  {
    dir: 'assets/kenney/mini-dungeon',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'mini-dungeon-',
    outFile: 'catalog/kenney-mini-dungeon/_pack.ts',
    namePrefix: 'Mini Dungeon: ',
  },
  {
    dir: 'assets/kenney/mini-characters',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'mini-char-',
    outFile: 'catalog/kenney-mini-characters/_pack.ts',
    namePrefix: 'Mini Char: ',
  },
  {
    dir: 'assets/kenney/mini-arena',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'mini-arena-',
    outFile: 'catalog/kenney-mini-arena/_pack.ts',
    namePrefix: 'Mini Arena: ',
  },
  {
    dir: 'assets/kenney/mini-market',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'mini-market-',
    outFile: 'catalog/kenney-mini-market/_pack.ts',
    namePrefix: 'Mini Market: ',
  },
  {
    dir: 'assets/kenney/mini-arcade',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'mini-arcade-',
    outFile: 'catalog/kenney-mini-arcade/_pack.ts',
    namePrefix: 'Mini Arcade: ',
  },
  {
    dir: 'assets/kenney/mini-skate',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'mini-skate-',
    outFile: 'catalog/kenney-mini-skate/_pack.ts',
    namePrefix: 'Mini Skate: ',
  },
  {
    dir: 'assets/kenney/cube-pets',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'cube-pet-',
    outFile: 'catalog/kenney-cube-pets/_pack.ts',
    namePrefix: 'Cube Pet: ',
  },
  // Quaternius — true faceted polygon style with rigged animations.
  {
    dir: 'assets/quaternius/animals_pack',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'quat-animal-',
    outFile: 'catalog/quaternius-animals/_pack.ts',
    namePrefix: 'Quat Animal: ',
  },
  {
    dir: 'assets/quaternius/cute_fish_pack',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'quat-fish-cute-',
    outFile: 'catalog/quaternius-cute-fish/_pack.ts',
    namePrefix: 'Quat Cute Fish: ',
  },
  {
    dir: 'assets/quaternius/fish_pack',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'quat-fish-',
    outFile: 'catalog/quaternius-fish/_pack.ts',
    namePrefix: 'Quat Fish: ',
  },
  {
    dir: 'assets/quaternius/dinosaurs_pack',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'quat-dino-',
    outFile: 'catalog/quaternius-dinosaurs/_pack.ts',
    namePrefix: 'Quat Dino: ',
  },
  {
    dir: 'assets/quaternius/easy_enemies_pack',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'quat-enemy-',
    outFile: 'catalog/quaternius-enemies/_pack.ts',
    namePrefix: 'Quat Enemy: ',
  },

  // ── Quaternius library expansion (16 packs, ~917 GLBs) ────────────
  // Same flat-shaded faceted low-poly aesthetic as the existing animal/
  // dinosaur/enemy packs. Vendored from trebeljahr/quaternius-showcase.
  {
    dir: 'assets/quaternius/nature_pack',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'quat-nature-',
    outFile: 'catalog/quaternius-nature/_pack.ts',
    namePrefix: 'Quat Nature: ',
  },
  {
    dir: 'assets/quaternius/simple_nature_pack',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'quat-nature-simple-',
    outFile: 'catalog/quaternius-nature-simple/_pack.ts',
    namePrefix: 'Quat Simple Nature: ',
  },
  {
    dir: 'assets/quaternius/medieval_village_pack',
    ext: '.glb',
    kind: 'building',
    slugPrefix: 'quat-village-',
    outFile: 'catalog/quaternius-village/_pack.ts',
    namePrefix: 'Quat Village: ',
  },
  {
    dir: 'assets/quaternius/modular_medieval_buildings_pack',
    ext: '.glb',
    kind: 'building',
    slugPrefix: 'quat-medieval-',
    outFile: 'catalog/quaternius-medieval-buildings/_pack.ts',
    namePrefix: 'Quat Medieval: ',
  },
  {
    dir: 'assets/quaternius/modular_dungeon_pack',
    ext: '.glb',
    kind: 'building',
    slugPrefix: 'quat-dungeon-mod-',
    outFile: 'catalog/quaternius-dungeon-mod/_pack.ts',
    namePrefix: 'Quat Dungeon Mod: ',
  },
  {
    dir: 'assets/quaternius/modular_dungeon_1',
    ext: '.glb',
    kind: 'building',
    slugPrefix: 'quat-dungeon1-',
    outFile: 'catalog/quaternius-dungeon1/_pack.ts',
    namePrefix: 'Quat Dungeon: ',
  },
  {
    dir: 'assets/quaternius/modular_men',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'quat-man-',
    outFile: 'catalog/quaternius-men/_pack.ts',
    namePrefix: 'Quat Man: ',
  },
  {
    dir: 'assets/quaternius/modular_women',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'quat-woman-',
    outFile: 'catalog/quaternius-women/_pack.ts',
    namePrefix: 'Quat Woman: ',
  },
  {
    dir: 'assets/quaternius/single_knight_pack',
    ext: '.glb',
    kind: 'character',
    slugPrefix: 'quat-knight-',
    outFile: 'catalog/quaternius-knight/_pack.ts',
    namePrefix: 'Quat Knight: ',
  },
  {
    dir: 'assets/quaternius/medieval_weapons_pack',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'quat-weapon-',
    outFile: 'catalog/quaternius-weapons/_pack.ts',
    namePrefix: 'Quat Weapon: ',
  },
  {
    dir: 'assets/quaternius/crops_pack',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'quat-crop-',
    outFile: 'catalog/quaternius-crops/_pack.ts',
    namePrefix: 'Quat Crop: ',
  },
  {
    dir: 'assets/quaternius/rpg_items_pack',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'quat-rpg-',
    outFile: 'catalog/quaternius-rpg-items/_pack.ts',
    namePrefix: 'Quat RPG: ',
  },
  {
    dir: 'assets/quaternius/house_interior_pack',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'quat-furniture-',
    outFile: 'catalog/quaternius-furniture/_pack.ts',
    namePrefix: 'Quat Furniture: ',
  },
  {
    dir: 'assets/quaternius/survival_pack',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'quat-survival-',
    outFile: 'catalog/quaternius-survival/_pack.ts',
    namePrefix: 'Quat Survival: ',
  },
  {
    dir: 'assets/quaternius/platformer_pack',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'quat-platformer-',
    outFile: 'catalog/quaternius-platformer/_pack.ts',
    namePrefix: 'Quat Platformer: ',
  },
  {
    dir: 'assets/quaternius/platformer_game_pack',
    ext: '.glb',
    kind: 'prop',
    slugPrefix: 'quat-platformer-game-',
    outFile: 'catalog/quaternius-platformer-game/_pack.ts',
    namePrefix: 'Quat Platformer Game: ',
  },
];

function walk(root: string, ext: string): string[] {
  const out: string[] = [];
  function recurse(p: string): void {
    for (const entry of readdirSync(p)) {
      const full = join(p, entry);
      const s = statSync(full);
      if (s.isDirectory()) recurse(full);
      else if (entry.endsWith(ext)) out.push(full);
    }
  }
  recurse(root);
  return out;
}

function prettyName(slug: string): string {
  return slug
    .replace(/^.*?-/, '') // drop pack prefix
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

for (const group of GROUPS) {
  const absDir = join(ROOT, group.dir);
  const files = walk(absDir, group.ext).sort();
  const entries: { slug: string; assetPath: string; name: string }[] = [];
  for (const f of files) {
    // assetPath = path served by Vite (relative to project root, prefixed '/')
    const relProj = relative(ROOT, f).replace(/\\/g, '/');
    const assetPath = '/' + relProj;
    // slug = pack prefix + relative path under group dir (without ext, lowercase, slashes → '-')
    const relGroup = relative(absDir, f).replace(/\\/g, '/');
    const stem = relGroup.replace(new RegExp(group.ext + '$'), '');
    const slugSuffix = stem.toLowerCase().replace(/\//g, '-').replace(/[^a-z0-9_-]/g, '-');
    const slug = group.slugPrefix + slugSuffix;
    const name = group.namePrefix + prettyName(slugSuffix);
    entries.push({ slug, assetPath, name });
  }

  // Generate the manifest file
  const lines: string[] = [];
  lines.push(`// AUTO-GENERATED by scripts/gen-kaykit-manifests.ts — do not edit by hand.`);
  lines.push(`// ${entries.length} ${group.kind} entries from ${group.dir}.`);
  lines.push(``);
  lines.push(`import { GltfModel, widgetToAssetModule } from '@lego';`);
  lines.push(`import type { AssetModule } from '../../src/types.js';`);
  lines.push(``);
  lines.push(`interface PackEntry { slug: string; asset: string; name: string; }`);
  lines.push(``);
  lines.push(`const ENTRIES: PackEntry[] = [`);
  for (const e of entries) {
    lines.push(`  { slug: ${JSON.stringify(e.slug)}, asset: ${JSON.stringify(e.assetPath)}, name: ${JSON.stringify(e.name)} },`);
  }
  lines.push(`];`);
  lines.push(``);
  lines.push(`const modules: AssetModule[] = ENTRIES.map((e) => widgetToAssetModule(`);
  lines.push(`  e.slug,`);
  lines.push(`  { kind: ${JSON.stringify(group.kind)}, name: e.name },`);
  lines.push(`  new GltfModel({ asset: e.asset }),`);
  lines.push(`));`);
  lines.push(``);
  lines.push(`export default modules;`);
  lines.push(``);

  const outPath = join(ROOT, group.outFile);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join('\n'));
  console.log(`wrote ${group.outFile}: ${entries.length} entries`);
}
