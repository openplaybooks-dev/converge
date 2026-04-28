/**
 * WBS: Character Generation
 *
 * For each character in sprites.json, spawn a complete pipeline:
 * 1. Spec validation
 * 2. Angle references
 * 3. Animation states (WBS) — spritesheet generation also lazily creates
 *    any per-pose variant ref it needs (see scripts/generate_spritesheet.py
 *    + scripts/lib/keyframes.STATE_VARIANT). The old standalone "poses"
 *    step was removed because it pre-generated variants nothing read.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PHASE = '03-characters/03-generation';
const WBS_ROOT = '.converge/playbooks/default/tasks/03-characters/03-generation/wbs/templates';
const ALLOWED_MODES = new Set(['characters', 'sprites', 'export', 'full']);

export async function run(ctx) {
  const { projectDir, vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  if (!ALLOWED_MODES.has(mode)) {
    console.log(`  Skipped (${PHASE}, stop_after=${mode})`);
    return;
  }

  const spritesPath = join(projectDir, 'assets', 'sprites.json');
  const sprites = JSON.parse(readFileSync(spritesPath, 'utf-8'));

  if (!sprites.length) {
    console.log('  No characters in sprites.json');
    return;
  }

  console.log(`  Spawning pipelines for ${sprites.length} character(s)\n`);

  for (const sprite of sprites) {
    const charId = sprite.id;

    console.log(`  📦 ${sprite.name} (${charId})`);

    // Common variables for all tasks
    const baseVars = {
      char_id: charId,
      char_name: sprite.name,
      char_description: sprite.description || `Character: ${sprite.name}`,
      palette: sprite.palette,
      animation_states: JSON.stringify(sprite.animation_states || ['idle', 'walk']),
    };

    // Task 1: Spec
    const specTaskId = `${charId}-01-spec`;
    const specTemplatePath = `${WBS_ROOT}/character/01-spec/TASK.md`;

    await ctx.spawn(
      { _type: 'template-ref', path: specTemplatePath, vars: baseVars },
      { id: specTaskId }
    );
    console.log(`    ✓ ${specTaskId}`);

    // Task 2: Angles
    const anglesTaskId = `${charId}-02-angles`;
    const anglesTemplatePath = `${WBS_ROOT}/character/02-angles/TASK.md`;

    await ctx.spawn(
      { _type: 'template-ref', path: anglesTemplatePath, vars: baseVars },
      { id: anglesTaskId }
    );
    console.log(`    ✓ ${anglesTaskId}`);

    // Tasks 3..N: one per-state spritesheet leaf, spawned inline.
    // (We used to spawn an intermediate WBS parent here that fanned out
    // per state via its own wbs/index.js, but template-ref expansion
    // strips the parent's `wbs:` frontmatter and the intermediate task
    // gets treated as a leaf with 0 outputs — silently auto-completing
    // without ever spawning the per-state children. Inlining avoids it.)
    // Pose variants are created lazily inside generate_spritesheet.py
    // only for action states (lib/keyframes.STATE_VARIANT).
    const stateTemplatePath = `${WBS_ROOT}/character/04-spritesheets/wbs/templates/state/TASK.md`;
    const states = sprite.animation_states || ['idle', 'walk'];
    for (const state of states) {
      const stateTaskId = `${charId}-spritesheet-${state}`;
      const stateVars = {
        ...baseVars,
        state_name: state,
        state_description: `${state.charAt(0).toUpperCase() + state.slice(1)} animation sprite sheet for ${sprite.name}`,
      };
      await ctx.spawn(
        { _type: 'template-ref', path: stateTemplatePath, vars: stateVars },
        { id: stateTaskId }
      );
      console.log(`    ✓ ${stateTaskId}`);
    }

    console.log('');
  }

  console.log(`  ✅ Spawned ${sprites.length} character pipeline(s)`);
}
