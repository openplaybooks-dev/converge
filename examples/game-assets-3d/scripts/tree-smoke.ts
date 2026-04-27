import birch from '../catalog/nature/tree-birch.js';
import birchBare from '../catalog/nature/tree-birch-bare.js';
import birchAutumn from '../catalog/nature/tree-birch-autumn.js';
import pine from '../catalog/nature/tree-pine.js';
import pineBare from '../catalog/nature/tree-pine-bare.js';
import pineAutumn from '../catalog/nature/tree-pine-autumn.js';
import oak from '../catalog/nature/tree-oak.js';
import oakBare from '../catalog/nature/tree-oak-bare.js';
import oakAutumn from '../catalog/nature/tree-oak-autumn.js';
import fir from '../catalog/nature/tree-fir.js';
import firBare from '../catalog/nature/tree-fir-bare.js';
import firAutumn from '../catalog/nature/tree-fir-autumn.js';
import willow from '../catalog/nature/tree-willow.js';
import willowBare from '../catalog/nature/tree-willow-bare.js';
import willowAutumn from '../catalog/nature/tree-willow-autumn.js';
import sakura from '../catalog/nature/tree-sakura.js';
import sakuraBare from '../catalog/nature/tree-sakura-bare.js';
import sakuraAutumn from '../catalog/nature/tree-sakura-autumn.js';
import palm from '../catalog/nature/tree-palm.js';
import palmBare from '../catalog/nature/tree-palm-bare.js';
import palmAutumn from '../catalog/nature/tree-palm-autumn.js';
import bush from '../catalog/nature/tree-bush.js';
import bushBare from '../catalog/nature/tree-bush-bare.js';
import bushAutumn from '../catalog/nature/tree-bush-autumn.js';
import sapling from '../catalog/nature/tree-sapling.js';
import saplingBare from '../catalog/nature/tree-sapling-bare.js';
import dead from '../catalog/nature/tree-dead.js';
import * as THREE from 'three';

const species = {
  birch, birchBare, birchAutumn,
  pine, pineBare, pineAutumn,
  oak, oakBare, oakAutumn,
  fir, firBare, firAutumn,
  willow, willowBare, willowAutumn,
  sakura, sakuraBare, sakuraAutumn,
  palm, palmBare, palmAutumn,
  bush, bushBare, bushAutumn,
  sapling, saplingBare,
  dead,
};

let total = 0;
for (const [name, mod] of Object.entries(species)) {
  const parent = new THREE.Group();
  const root = mod.default(parent, THREE, {});
  let meshes = 0;
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
  total += meshes;
  console.log(`  ${name.padEnd(16)} meshes=${meshes}`);
}
console.log(`---\n  ${Object.keys(species).length} entries, ${total} total meshes`);
