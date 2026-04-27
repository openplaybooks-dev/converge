import * as THREE from 'three';
import { Hero } from '../catalog/showcase/hero.js';
import { widgetToEntity } from '../src/widget/index.js';

const skinnedHero = new Hero({ bodyMode: 'skinned' });
const ent = widgetToEntity('test', { kind: 'character' }, skinnedHero);
const result = ent.build();

let foundMesh: THREE.SkinnedMesh | null = null;
result.object.traverse((o) => {
  if ((o as THREE.SkinnedMesh).isSkinnedMesh) foundMesh = o as THREE.SkinnedMesh;
});
const m: THREE.SkinnedMesh = foundMesh!;
console.log('vert count:', m.geometry.attributes.position.count);

const pos = m.geometry.attributes.position;
const bbox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
  bbox.minX = Math.min(bbox.minX, x); bbox.maxX = Math.max(bbox.maxX, x);
  bbox.minY = Math.min(bbox.minY, y); bbox.maxY = Math.max(bbox.maxY, y);
  bbox.minZ = Math.min(bbox.minZ, z); bbox.maxZ = Math.max(bbox.maxZ, z);
}
console.log('bbox:', JSON.stringify(bbox, null, 2));
console.log('width  X:', (bbox.maxX - bbox.minX).toFixed(3));
console.log('height Y:', (bbox.maxY - bbox.minY).toFixed(3));
console.log('depth  Z:', (bbox.maxZ - bbox.minZ).toFixed(3));

// Sample 5 random verts to see where they sit
console.log('\nsample verts:');
for (const i of [50, 200, 500, 800, 1200, 1500]) {
  if (i < pos.count) {
    console.log(`  [${i}] (${pos.getX(i).toFixed(3)}, ${pos.getY(i).toFixed(3)}, ${pos.getZ(i).toFixed(3)})`);
  }
}

// Check if vertices are spread or all clumped
const sampled: [number,number,number][] = [];
for (let i = 0; i < pos.count; i += 100) sampled.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
const ys = sampled.map(p => p[1]).sort((a,b) => a-b);
console.log('\nY distribution (every 100th vert):');
console.log('  min:', ys[0].toFixed(3));
console.log('  25%:', ys[Math.floor(ys.length*0.25)].toFixed(3));
console.log('  50%:', ys[Math.floor(ys.length*0.5)].toFixed(3));
console.log('  75%:', ys[Math.floor(ys.length*0.75)].toFixed(3));
console.log('  max:', ys[ys.length-1].toFixed(3));

// Check the bone positions vs expected
const rig = (result.refs as Map<string, unknown>).get('rig') as any;
console.log('\nbone world positions (expected near these Y values):');
for (const name of ['root','pelvis','chest','head','arm_R','hand_R','leg_R','foot_R']) {
  const b = rig.bones[name];
  if (b) {
    const wp = new THREE.Vector3();
    b.getWorldPosition(wp);
    console.log(`  ${name.padEnd(8)}: (${wp.x.toFixed(3)}, ${wp.y.toFixed(3)}, ${wp.z.toFixed(3)})`);
  }
}
