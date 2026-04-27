/**
 * animations.js — Phaser sheet/anim registration helpers.
 *
 * Atlas slices from atlas-loader.js carry sheet_path + frame coords; the
 * Phaser loader needs spritesheet keys + frame dimensions and the anim
 * system needs frame index ranges. These helpers translate between the
 * two so gallery + play pages don't repeat the wiring.
 */

import { isAnimated, slicesByCategory, CATEGORIES } from './atlas-loader.js';

/** Stable Phaser cache key for a slice. */
export function sheetKey(slice) {
  return slice.state
    ? `${slice.category || guessCategory(slice)}:${slice.asset_id}:${slice.state}`
    : `${slice.category || guessCategory(slice)}:${slice.asset_id}`;
}

function guessCategory(slice) {
  // Slices coming from the master atlas don't carry their own category
  // field — it's the parent dict key. The walker fallback DOES set it.
  // Callers pass enriched slices into here when they want a stable key.
  if (slice.meta?.char_id) return 'characters';
  if (slice.meta?.obj_id) return 'objects';
  if (slice.meta?.tilemap_id) return 'tile_maps';
  if (slice.meta?.bg_id) return 'backgrounds';
  return 'unknown';
}

/** Animation key for a (slice). Backgrounds have no anim. */
export function animKey(slice) {
  return `${sheetKey(slice)}:anim`;
}

/**
 * Preload-time hook: register every animated sheet in the atlas as a
 * Phaser spritesheet, and every static asset (backgrounds, single-frame
 * sheets) as an image.
 *
 * Call from your scene's preload(). After load completes, call
 * `registerAnimations(scene, atlas)` from create() — Phaser doesn't allow
 * anims.create() before textures finish loading.
 */
export function loadAtlasAssets(scene, atlas, rootUrl = '..') {
  for (const cat of CATEGORIES) {
    for (const slice of slicesByCategory(atlas, cat)) {
      const enriched = { ...slice, category: cat };
      const key = sheetKey(enriched);
      const url = `${rootUrl}/${slice.sheet_path}`;
      if (isAnimated(slice)) {
        const fw = slice.meta.frame_size?.w ?? 128;
        const fh = slice.meta.frame_size?.h ?? 128;
        scene.load.spritesheet(key, url, { frameWidth: fw, frameHeight: fh });
      } else {
        scene.load.image(key, url);
      }
    }
  }
}

/**
 * Post-load hook: create Phaser anim entries for every animated slice.
 * Idempotent — calling twice is fine.
 *
 * Each slice's atlas meta now carries `frameRate` and `yoyo` hints
 * baked in by the generator (lib/keyframes.STATE_PLAYBACK). Idle plays
 * at 6 fps with yoyo (relaxed breathing), walk at 10 fps no-yoyo
 * (real cyclic walk), one-shots like `collect` / `trigger` at 12 fps.
 *
 * The `frameRate` and `{ yoyo }` parameters here are GLOBAL fallbacks
 * for sheets whose atlas doesn't carry per-state hints (legacy sheets
 * generated before STATE_PLAYBACK existed). Per-slice meta wins.
 */
export function registerAnimations(scene, atlas, frameRate = 8, { yoyo = false } = {}) {
  // States that should never yoyo regardless of the global flag — they
  // depict a one-way action, not a cyclic motion. Used as a guard when
  // a sheet's meta doesn't include explicit `yoyo`.
  const oneShotStates = new Set(['collect', 'trigger']);

  for (const cat of CATEGORIES) {
    for (const slice of slicesByCategory(atlas, cat)) {
      if (!isAnimated(slice)) continue;
      const enriched = { ...slice, category: cat };
      const key = animKey(enriched);
      if (scene.anims.exists(key)) continue;
      const sheet = sheetKey(enriched);
      const end = (slice.meta.frame_count ?? 16) - 1;

      // Prefer per-slice meta hints; fall back to function args.
      const sliceFps = slice.meta.frameRate ?? frameRate;
      const sliceYoyo = slice.meta.yoyo ?? (yoyo && !oneShotStates.has(slice.state));

      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(sheet, { start: 0, end }),
        frameRate: sliceFps,
        repeat: -1,
        yoyo: sliceYoyo,
      });
    }
  }
}

/** Helper used by gallery: wipe & redraw the active sprite for a slice. */
export function showSlice(scene, slice, x, y) {
  const enriched = { ...slice, category: slice.category || guessCategory(slice) };
  const key = sheetKey(enriched);
  if (isAnimated(slice)) {
    const sprite = scene.add.sprite(x, y, key);
    sprite.play(animKey(enriched));
    return sprite;
  }
  return scene.add.image(x, y, key);
}
