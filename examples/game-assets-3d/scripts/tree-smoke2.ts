import oak from '../catalog/nature/tree-oak.js';
import oakBare from '../catalog/nature/tree-oak-bare.js';
import oakAutumn from '../catalog/nature/tree-oak-autumn.js';
import * as THREE from 'three';

for (const [name, mod] of Object.entries({ oak, oakBare, oakAutumn })) {
  const parent = new THREE.Group();
  const root = mod.default(parent, THREE, {});
  let meshes = 0;
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
  console.log(`  ${name}: meshes=${meshes}`);
}
