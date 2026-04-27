// Material(name, opts) — entity-wide default material.
//
// Runs in pass 2 (after all geometry, before root transform). Traverses the
// root and applies the material to every Mesh that hasn't set
// userData.materialExplicit (which Mesh.*().material(...) sets via shape.build).
// Authors who want every mesh styled identically use this; per-mesh overrides
// take precedence by setting their own material.

import * as THREE from 'three';
import { makeMaterial } from '../../materials.js';
import type { MaterialName, MaterialOpts } from '../../types.js';
import type { Behavior } from '../types.js';

export function Material(
  name: MaterialName,
  opts: MaterialOpts = {},
): Behavior<{ name: MaterialName; opts: MaterialOpts }> {
  return {
    kind: 'material',
    config: { name, opts },
    onBuild() {
      return {
        applyMaterial(root) {
          const mat = makeMaterial(name, opts);
          root.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            if (mesh.userData.materialExplicit) return;
            mesh.material = mat;
          });
        },
      };
    },
  };
}
