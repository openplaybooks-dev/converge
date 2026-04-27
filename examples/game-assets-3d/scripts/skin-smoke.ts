import * as THREE from 'three';
import { Hero } from '../catalog/showcase/hero.js';
import { widgetToEntity } from '../src/widget/index.js';

const partsHero = new Hero({});
const skinnedHero = new Hero({ bodyMode: 'skinned' });
const broadSkinned = new Hero({ bodyMode: 'skinned', build: 'broad', muscleDefinition: 1.0, shoulderWidth: 1.2 });
const thinSkinned = new Hero({ bodyMode: 'skinned', build: 'thin', muscleDefinition: 0.0, waistWidth: 0.7 });

for (const [name, w] of Object.entries({ partsHero, skinnedHero, broadSkinned, thinSkinned })) {
  const ent = widgetToEntity(name, { kind: 'character' }, w);
  const result = ent.build();
  let meshes = 0; let skinned = 0; let totalVerts = 0;
  result.object.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
      skinned++;
      const g = (o as THREE.SkinnedMesh).geometry;
      totalVerts += (g.attributes.position?.count ?? 0);
    } else if ((o as THREE.Mesh).isMesh) meshes++;
  });
  console.log(`  ${name.padEnd(15)} meshes=${meshes} skinned=${skinned} skinnedVerts=${totalVerts}`);
}
