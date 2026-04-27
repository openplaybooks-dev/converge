// Faceted — wraps a child subtree and flips every descendant material into
// flat-shaded mode (one normal per triangle), giving the Quaternius/Hextant
// flat-low-poly look. Works on both procedural meshes (immediate) and on
// async-loaded glTF models (re-traversed each tick until stable).
//
// The effect is purely material-level:
//   - mat.flatShading = true
//   - geometry.computeVertexNormals() (so per-face normals derive correctly)
//   - mat.needsUpdate = true
//
// Optional: flatten textured materials toward solid color (set map=null) so
// imported glTFs (KayKit, Cube Pets) lose their painted textures and show
// pure faceted color. Controlled by `stripTextures`.

import * as THREE from 'three';
import { LeafWidget3D, type BuildContext, type Widget3D } from '../types.js';
import { Group } from '../../entity/behaviors/group.js';
import type { Behavior } from '../../entity/types.js';
import type { Tick } from '../../types.js';

const FACETED_FLAG = '__faceted_done';

function applyFaceted(root: THREE.Object3D, stripTextures: boolean): number {
  let count = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const ud = mesh.userData as Record<string, unknown>;
    if (ud[FACETED_FLAG]) return;

    // Recompute normals so flat-shading reads the actual triangle planes,
    // not the source's smoothed normals.
    if (mesh.geometry instanceof THREE.BufferGeometry) {
      mesh.geometry.computeVertexNormals();
    }

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial & { flatShading?: boolean; needsUpdate?: boolean };
      if (std == null) continue;
      // flatShading exists on Standard/Phong/Lambert; assigning is safe and
      // ignored on materials that don't support it.
      std.flatShading = true;
      if (stripTextures) {
        if ((std as { map?: unknown }).map) (std as { map: null }).map = null;
        if ((std as { normalMap?: unknown }).normalMap) (std as { normalMap: null }).normalMap = null;
        if ((std as { roughnessMap?: unknown }).roughnessMap) (std as { roughnessMap: null }).roughnessMap = null;
      }
      std.needsUpdate = true;
    }
    ud[FACETED_FLAG] = true;
    count++;
  });
  return count;
}

export interface FacetedOpts {
  child: Widget3D;
  /**
   * If true, drop colorMap/normalMap from materials so glTF assets (KayKit,
   * Cube Pets) show their per-face base color cleanly. Default false (keep
   * texture, just flat-shade).
   */
  stripTextures?: boolean;
  /**
   * Optional name for the wrapping Group object.
   */
  name?: string;
  key?: string;
}

export class Faceted extends LeafWidget3D {
  private readonly o: FacetedOpts;
  constructor(opts: FacetedOpts) {
    super({ key: opts.key });
    this.o = opts;
  }

  override buildBehaviors(ctx: BuildContext): Behavior[] {
    const childCtx: BuildContext = { ...ctx, path: [...ctx.path, this] };
    const childBehaviors = this.o.child.lower(childCtx);
    const stripTextures = this.o.stripTextures ?? false;
    const name = this.o.name;

    return [{
      kind: 'faceted',
      config: { stripTextures },
      onBuild: (innerCtx) => {
        const group = Group(...childBehaviors);
        if (name) group.named(name);
        const contrib = group.onBuild!(innerCtx);
        if (!contrib?.object || Array.isArray(contrib.object)) return contrib ?? {};
        const root = contrib.object;

        // Synchronous pass — handles all procedural meshes that exist now.
        applyFaceted(root, stripTextures);

        // Async pass — re-apply on every tick. New meshes (from GltfModel
        // .loadAsync) will arrive later; the userData flag guards against
        // redundant work, so this is cheap (one traversal/frame).
        const tick: Tick = () => {
          applyFaceted(root, stripTextures);
        };
        const ticks = contrib.ticks ?? [];
        return { ...contrib, ticks: [...ticks, tick] };
      },
    }];
  }
}
