/**
 * atlas-loader.js — Fetch the master atlas (or rebuild a synthetic one
 * from per-sheet *.atlas.json files when the master is missing).
 *
 * Returned shape always matches what scripts/build_master_atlas.py emits:
 *
 *   { meta: { categories, sources }, categories: { characters, objects,
 *     tile_maps, backgrounds }: [{ asset_id, state, sheet_path,
 *     atlas_path, meta, frames }] }
 *
 * Callers don't need to branch on whether the master atlas existed.
 *
 * The fallback walker derives expected per-sheet atlas paths from the
 * source manifests (sprites.json / objects.json / tile_maps.json /
 * backgrounds.json) — browsers can't glob, so we have to enumerate.
 */

const CATEGORIES = ['characters', 'objects', 'tile_maps', 'backgrounds', 'scenes'];

export async function loadAtlas(rootUrl = '..') {
  const masterUrl = `${rootUrl}/assets/atlas.json`;
  try {
    const res = await fetch(masterUrl, { cache: 'no-cache' });
    if (res.ok) {
      const atlas = await res.json();
      atlas._source = 'master';
      return atlas;
    }
  } catch (_) {
    /* fall through to per-sheet walker */
  }

  console.info(
    `[atlas-loader] ${masterUrl} not available — falling back to per-sheet *.atlas.json files. ` +
    `Run \`python3 scripts/build_master_atlas.py\` to create the master.`
  );
  return await walkPerSheetAtlases(rootUrl);
}

async function walkPerSheetAtlases(rootUrl) {
  const aggregate = {
    meta: { categories: CATEGORIES, sources: {}, _source: 'walker' },
    categories: Object.fromEntries(CATEGORIES.map(c => [c, []])),
    _source: 'walker',
  };

  const fetches = await Promise.all(
    CATEGORIES.map(cat => collectSlicesForCategory(rootUrl, cat))
  );
  CATEGORIES.forEach((cat, i) => {
    aggregate.categories[cat] = fetches[i];
    aggregate.meta.sources[cat] = fetches[i].length;
  });

  return aggregate;
}

async function collectSlicesForCategory(rootUrl, category) {
  switch (category) {
    case 'characters':
      return collectCharacterSlices(rootUrl);
    case 'objects':
      return collectObjectSlices(rootUrl);
    case 'tile_maps':
      return collectTileMapSlices(rootUrl);
    case 'backgrounds':
      return collectBackgroundSlices(rootUrl);
    case 'scenes':
      return collectSceneSlices(rootUrl);
    default:
      return [];
  }
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function collectCharacterSlices(rootUrl) {
  const sprites = await fetchJson(`${rootUrl}/assets/sprites.json`);
  if (!sprites) return [];
  const slices = [];
  for (const sprite of sprites) {
    const states = sprite.animation_states || ['idle', 'walk'];
    for (const state of states) {
      const atlasPath = `assets/characters/${sprite.id}/spritesheets/${state}/${state}.atlas.json`;
      const slice = await tryReadSlice(rootUrl, atlasPath, {
        asset_id: sprite.id,
        state,
        category: 'characters',
      });
      if (slice) slices.push(slice);
    }
  }
  return slices;
}

async function collectObjectSlices(rootUrl) {
  const objects = await fetchJson(`${rootUrl}/assets/objects.json`);
  if (!objects) return [];
  const slices = [];
  for (const obj of objects) {
    const states = obj.states || ['idle'];
    for (const state of states) {
      const atlasPath = `assets/objects/${obj.id}/spritesheets/${state}/${state}.atlas.json`;
      const slice = await tryReadSlice(rootUrl, atlasPath, {
        asset_id: obj.id,
        state,
        category: 'objects',
      });
      if (slice) slices.push(slice);
    }
  }
  return slices;
}

async function collectTileMapSlices(rootUrl) {
  const tileMaps = await fetchJson(`${rootUrl}/assets/tile_maps.json`);
  if (!tileMaps) return [];
  const slices = [];
  for (const tm of tileMaps) {
    const atlasPath = `assets/tile_maps/${tm.id}/tilesheet/tilesheet.atlas.json`;
    const slice = await tryReadSlice(rootUrl, atlasPath, {
      asset_id: tm.id,
      state: '',
      category: 'tile_maps',
    });
    if (slice) slices.push(slice);
  }
  return slices;
}

async function collectBackgroundSlices(rootUrl) {
  const backgrounds = await fetchJson(`${rootUrl}/assets/backgrounds.json`);
  if (!backgrounds) return [];
  const slices = [];
  for (const bg of backgrounds) {
    const atlasPath = `assets/backgrounds/${bg.id}/${bg.id}.atlas.json`;
    const slice = await tryReadSlice(rootUrl, atlasPath, {
      asset_id: bg.id,
      state: '',
      category: 'backgrounds',
    });
    if (slice) slices.push(slice);
  }
  return slices;
}

async function collectSceneSlices(rootUrl) {
  const scenes = await fetchJson(`${rootUrl}/assets/scenes.json`);
  if (!scenes) return [];
  const slices = [];
  for (const scene of scenes) {
    const sceneId = scene.id;

    // Background layers
    const layers = scene.background?.layers || [];
    for (const layer of layers) {
      const atlasPath = `assets/scenes/${sceneId}/bg-${layer}.atlas.json`;
      const slice = await tryReadSlice(rootUrl, atlasPath, {
        asset_id: `${sceneId}/bg-${layer}`,
        state: '',
        category: 'scenes',
      });
      if (slice) slices.push(slice);
    }

    // Tilesheet
    const tilesheetPath = `assets/scenes/${sceneId}/tilesheet/tilesheet.atlas.json`;
    const tsSlice = await tryReadSlice(rootUrl, tilesheetPath, {
      asset_id: `${sceneId}/tilesheet`,
      state: '',
      category: 'scenes',
    });
    if (tsSlice) slices.push(tsSlice);

    // Scene-only props
    const sceneProps = scene.scene_props || [];
    for (const prop of sceneProps) {
      const states = prop.states || ['idle'];
      for (const state of states) {
        const atlasPath = `assets/scenes/${sceneId}/props/${prop.id}/spritesheets/${state}/${state}.atlas.json`;
        const slice = await tryReadSlice(rootUrl, atlasPath, {
          asset_id: `${sceneId}/prop/${prop.id}`,
          state,
          category: 'scenes',
        });
        if (slice) slices.push(slice);
      }
    }
  }
  return slices;
}

async function tryReadSlice(rootUrl, atlasPath, header) {
  const data = await fetchJson(`${rootUrl}/${atlasPath}`);
  if (!data) return null;
  const meta = data.meta || {};
  const mode = meta.mode || 'sheet';
  const slice = {
    asset_id: header.asset_id,
    state: header.state,
    atlas_path: atlasPath,
    mode,
    meta,
    frames: data.frames || [],
  };
  if (mode === 'frames') {
    slice.frames_dir = meta.frames_dir
      || atlasPath.substring(0, atlasPath.lastIndexOf('/'));
  } else {
    slice.sheet_path = inferSheetPath(atlasPath, data);
  }
  return slice;
}

function inferSheetPath(atlasPath, atlasData) {
  // Per-sheet atlases store `image: "<basename>.png"` next to the JSON.
  // Backgrounds store `image: "<bg_id>.png"`. Either way it's a sibling of
  // the atlas JSON.
  const dir = atlasPath.substring(0, atlasPath.lastIndexOf('/'));
  const image = atlasData.image
    || atlasPath.substring(atlasPath.lastIndexOf('/') + 1).replace('.atlas.json', '.png');
  return `${dir}/${image}`;
}

// ----- Convenience accessors used by the gallery and play pages -----

export function slicesByCategory(atlas, category) {
  return atlas.categories?.[category] ?? [];
}

export function findSlice(atlas, category, assetId, state = '') {
  return slicesByCategory(atlas, category).find(
    s => s.asset_id === assetId && (state === '' || s.state === state)
  );
}

export function isAnimated(slice) {
  return (slice.meta?.frame_count ?? 1) > 1;
}

export function summarizeAtlas(atlas) {
  return CATEGORIES.map(cat => `${cat}=${(atlas.categories[cat] || []).length}`).join(', ');
}

export { CATEGORIES };
