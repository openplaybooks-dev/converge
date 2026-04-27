import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as fs from 'node:fs';

const buf = fs.readFileSync('/Users/minh/Documents/converge/examples/game-assets-lego/assets/characters/quaternius/soldier.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
loader.parse(ab as ArrayBuffer, '', (gltf) => {
  let mesh: THREE.SkinnedMesh | null = null;
  gltf.scene.traverse((o) => {
    if (!mesh && (o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh;
  });
  const m: THREE.SkinnedMesh = mesh!;
  console.log('SkinnedMesh found:', m.name);
  console.log('vertex count:', m.geometry.attributes.position.count);
  console.log('skeleton bones:', m.skeleton.bones.length);
  console.log('first 30 bone names:');
  for (let i = 0; i < Math.min(30, m.skeleton.bones.length); i++) {
    console.log(`  [${i}] ${m.skeleton.bones[i].name}`);
  }
  console.log('animations:', gltf.animations.map((a) => a.name).join(', '));
}, (err) => { console.error('parse error', err); });
