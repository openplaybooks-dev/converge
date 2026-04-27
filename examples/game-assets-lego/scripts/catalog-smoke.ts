import treePine from '../catalog/nature/tree-pine.js';
import lamppost from '../catalog/architecture/lamppost.js';
import fence from '../catalog/architecture/fence.js';
import internalFence from '../catalog/architecture/internal-fence.js';
import bench from '../catalog/architecture/bench.js';
import house from '../catalog/architecture/house.js';
import airplane from '../catalog/vehicles/airplane.js';
import carousel from '../catalog/effects/carousel.js';
import campfire from '../catalog/effects/campfire.js';
import fireflies from '../catalog/effects/fireflies.js';
import treeOak from '../catalog/nature/tree-oak.js';
import treeCactus from '../catalog/showcase/tree-cactus.js';
import stone from '../catalog/nature/stone.js';
import grassClump from '../catalog/nature/grass-clump.js';
import cloud from '../catalog/nature/cloud.js';
import lake from '../catalog/nature/lake.js';
import forest from '../catalog/nature/forest.js';
import hero from '../catalog/showcase/hero.js';
import heroSkinned from '../catalog/showcase/hero-skinned.js';
import heroRealistic from '../catalog/showcase/hero-realistic.js';
import heroSimple from '../catalog/showcase/hero-simple.js';
import heroWarrior from '../catalog/showcase/hero-warrior.js';
import heroCivilian from '../catalog/showcase/hero-civilian.js';
import heroChild from '../catalog/showcase/hero-child.js';
import heroMage from '../catalog/showcase/hero-mage.js';
import crowd from '../catalog/showcase/crowd.js';
import knight from '../catalog/kaykit/knight.js';
import barbarian from '../catalog/kaykit/barbarian.js';
import mage from '../catalog/kaykit/mage.js';
import rogue from '../catalog/kaykit/rogue.js';
import rogueHooded from '../catalog/kaykit/rogue-hooded.js';
import skeletonWarrior from '../catalog/kaykit/skeleton-warrior.js';
import skeletonMage from '../catalog/kaykit/skeleton-mage.js';
import skeletonRogue from '../catalog/kaykit/skeleton-rogue.js';
import skeletonMinion from '../catalog/kaykit/skeleton-minion.js';
import * as THREE from 'three';

const all = {
  treePine, treeOak, treeCactus, stone, grassClump, cloud, lake, forest,
  lamppost, fence, internalFence, bench, house,
  airplane, carousel, campfire, fireflies,
  hero, heroSkinned, heroRealistic, heroSimple, heroWarrior, heroCivilian, heroChild, heroMage, crowd,
  knight, barbarian, mage, rogue, rogueHooded,
  skeletonWarrior, skeletonMage, skeletonRogue, skeletonMinion,
};
for (const [name, mod] of Object.entries(all)) {
  const parent = new THREE.Group();
  const root = mod.default(parent, THREE, {});
  let meshes = 0;
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
  console.log(`  ${name}: meshes=${meshes} slug=${mod.meta?.slug}`);
}
console.log(`All ${Object.keys(all).length} catalog assets built successfully.`);
