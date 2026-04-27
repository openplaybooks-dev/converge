import island from '../scenes/island.js';
import forest from '../scenes/forest.js';
import town from '../scenes/town.js';
import dungeon from '../scenes/dungeon.js';
import * as THREE from 'three';

for (const [name, mod] of Object.entries({ island, forest, town, dungeon })) {
  const parent = new THREE.Group();
  const root = mod.default(parent, THREE, {});
  let meshes = 0; let ticks = 0;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes++;
    if (typeof (o.userData as any).tick === 'function') ticks++;
  });
  console.log(`  ${name}: meshes=${meshes} ticks=${ticks}`);
}
console.log('All scenes built.');
