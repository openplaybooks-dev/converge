import * as THREE from 'three';
import { Hero } from '../catalog/showcase/hero.js';
import { widgetToEntity } from '../src/widget/index.js';

const skinnedHero = new Hero({ bodyMode: 'skinned' });
const ent = widgetToEntity('test', { kind: 'character' }, skinnedHero);
const result = ent.build();

// Find the skinned mesh
let foundMesh: THREE.SkinnedMesh | null = null;
result.object.traverse((o) => {
  if ((o as THREE.SkinnedMesh).isSkinnedMesh) foundMesh = o as THREE.SkinnedMesh;
});
if (foundMesh === null) throw new Error('no SkinnedMesh found');
const skinnedMesh: THREE.SkinnedMesh = foundMesh;

// Vertex 100 (somewhere on the body) — get its rest position
const pos = skinnedMesh.geometry.attributes.position;
const restX = pos.getX(100), restY = pos.getY(100), restZ = pos.getZ(100);
console.log(`vertex 100 rest position: (${restX.toFixed(3)}, ${restY.toFixed(3)}, ${restZ.toFixed(3)})`);

// Find the rig and rotate arm_R to confirm vertices in upper-arm region move
const rig = (result.refs as any).get('rig');
const armR = rig.bones['arm_R'];
console.log(`arm_R initial rotation: (${armR.rotation.x.toFixed(2)}, ${armR.rotation.y.toFixed(2)}, ${armR.rotation.z.toFixed(2)})`);
console.log(`arm_R world position: ${(new THREE.Vector3()).copy(armR.getWorldPosition(new THREE.Vector3())).toArray()}`);

// Check skin weight attribute
const sw = skinnedMesh.geometry.attributes.skinWeight;
const si = skinnedMesh.geometry.attributes.skinIndex;
let validVerts = 0; let zeroSum = 0;
for (let i = 0; i < sw.count; i++) {
  const sum = sw.getX(i) + sw.getY(i) + sw.getZ(i) + sw.getW(i);
  if (sum > 0.99 && sum < 1.01) validVerts++;
  else if (sum < 0.01) zeroSum++;
}
console.log(`skin weights: ${validVerts}/${sw.count} valid (sum ~1.0), ${zeroSum} zero-sum`);
console.log(`bones in skeleton: ${skinnedMesh.skeleton.bones.length}`);
