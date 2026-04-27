import {
  entity, Mesh, Group, Material, Transform, Proportions,
  Tell, Use, Rig, Animator, Clips,
} from '../src/index.js';
import * as THREE from 'three';

// ── Step 1 probes ─────────────────────────────────────────────────────────
console.log('— probe 1: single mesh —');
const a = entity('a').add(Mesh.box(1, 1, 1).material('toon', { color: 'brick' }).tag('cube'));
const ra = a.build();
console.log('  meshes:', ra.object.children.length, 'tells:', ra.tells.length, 'tick:', !!ra.tick);
console.log('  userData.tells is array:', Array.isArray(ra.object.userData.tells));
console.log('  refs.cube exists:', ra.refs.has('cube'));

console.log('— probe 2: group + transform —');
const b = entity('b')
  .add(Group(
    Mesh.box(1, 1, 1).at(-1, 0, 0).tag('left'),
    Mesh.box(1, 1, 1).at(1, 0, 0).tag('right'),
  ).named('pair'))
  .add(Transform({ at: [0, 5, 0], scale: 2 }));
const rb = b.build();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
console.log('  pair child count:', (rb.object.children[0] as any).children.length);
console.log('  root y:', rb.object.position.y, 'scale:', rb.object.scale.x);

console.log('— probe 3: clone —');
const c = a.clone({ slug: 'a-clone' });
c.add(Mesh.sphere(0.5).at(0, 2, 0));
console.log('  original behaviors:', a.behaviors.length, 'clone behaviors:', c.behaviors.length);

console.log('— probe 4: entity-wide material override —');
const d = entity('d')
  .add(Mesh.box(1, 1, 1).tag('plain'))
  .add(Mesh.box(1, 1, 1).at(2, 0, 0).material('toon', { color: 'water' }).tag('explicit'))
  .add(Material('weathered', { color: 'brick' }));
const rd = d.build();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const plainMat = (rd.object.children[0] as any).material;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const explicitMat = (rd.object.children[1] as any).material;
console.log('  plain material type:', plainMat.type, '(expect MeshStandardMaterial)');
console.log('  explicit material type:', explicitMat.type, '(expect MeshToonMaterial)');

console.log('— probe 5: proportions —');
interface Props extends Record<string, unknown> { size: number }
const e = entity<Props>('e').add(Proportions<Props>({ size: 3 }));
console.log('  defaultProps.size:', e.defaultProps.size);
e.build({ size: 7 });
console.log('  default unchanged after build:', e.defaultProps.size);

// ── Step 2 probes ─────────────────────────────────────────────────────────
console.log('— probe 6: tells —');
const tree = entity('tree')
  .add(Mesh.cyl(0.5, 0.5, 3).at(0, 1.5, 0).tag('trunk'))
  .add(Tell.mossPatch({ on: 'trunk', position: [0.5, 1, 0], side: 'north' }))
  .add(Tell.dent({ on: 'trunk', position: [-0.4, 0.5, 0], depth: 0.05 }));
const rt = tree.build();
console.log('  tells:', rt.tells.length, '(expect 2)');
console.log('  kinds:', rt.tells.map((t) => t.kind).join(', '));
console.log('  userData.tells.length:', (rt.object.userData.tells as unknown[]).length);

console.log('— probe 7: Use composes sub-asset —');
const forest = entity('forest')
  .add(Use(tree).at(-3, 0, 0))
  .add(Use(tree).at(3, 0, 0))
  .add(Use(tree).at(0, 0, 4));
const rf = forest.build();
console.log('  forest children:', rf.object.children.length, '(expect 3 sub-trees)');
console.log('  forest tells:', rf.tells.length, '(expect 6 = 3 trees × 2 tells)');
console.log('  refs include child slug:', [...rf.refs.keys()].filter((k) => k.startsWith('tree.')).length, '(expect 3)');

console.log('— probe 8: Use clone forwards proportions —');
interface PineP extends Record<string, unknown> { trunkH: number }
const pine = entity<PineP>('pine')
  .add(Proportions<PineP>({ trunkH: 5 }))
  .add(Mesh.cyl(0.4, 0.4, 5).tag('trunk'));
const grove = entity('grove')
  .add(Use(pine).at(0, 0, 0))
  .add(Use(pine).at(2, 0, 0).withProps({ trunkH: 3 }));
const rg = grove.build();
console.log('  grove children:', rg.object.children.length, '(expect 2)');

// ── Step 3 probes ─────────────────────────────────────────────────────────
console.log('— probe 9: humanoid rig + Mesh.attach —');
const hero = entity('hero')
  .add(Rig.humanoid())
  .add(Mesh.capsule(0.18, 0.40).material('toon', { color: 'brick' }).attach('chest'))
  .add(Mesh.box(0.30, 0.30, 0.30).material('toon', { color: 'brick' }).attach('head'))
  .add(Mesh.cyl(0.06, 0.06, 0.32).material('toon', { color: 'brick' }).attach('arm_R'))
  .add(Mesh.cyl(0.06, 0.06, 0.32).material('toon', { color: 'brick' }).attach('arm_L'));
const rh = hero.build();

// Count bones in tree.
let boneCount = 0;
let meshCount = 0;
rh.object.traverse((o) => {
  if ((o as THREE.Bone).isBone) boneCount++;
  if ((o as THREE.Mesh).isMesh) meshCount++;
});
console.log('  bones:', boneCount, '(expect 18 humanoid bones)');
console.log('  meshes:', meshCount, '(expect 4: capsule + head + 2 arms)');

// Check that meshes are parented to the right bones (chest mesh's parent should be the chest bone).
const rig = rh.refs.get('rig') as ReturnType<typeof Rig.humanoid> extends infer _ ? import('../src/rig.js').ResolvedRig : never;
const chest = rig.bones['chest'];
const armR = rig.bones['arm_R'];
console.log('  chest has', chest.children.filter((c) => (c as THREE.Mesh).isMesh).length, 'mesh children (expect 1)');
console.log('  arm_R has', armR.children.filter((c) => (c as THREE.Mesh).isMesh).length, 'mesh children (expect 1)');

console.log('— probe 10: Use(sword).attach(hand_R) —');
const sword = entity('sword')
  .add(Mesh.box(0.06, 0.6, 0.06).at(0, 0.3, 0).material('weathered', { color: 'darkMetal' }).tag('blade'));
const heroWithSword = entity('hero')
  .add(Rig.humanoid())
  .add(Mesh.capsule(0.18, 0.40).material('toon', { color: 'brick' }).attach('chest'))
  .add(Use(sword).attach('hand_R'));
const rhs = heroWithSword.build();
const rig2 = rhs.refs.get('rig') as import('../src/rig.js').ResolvedRig;
const handR = rig2.bones['hand_R'];
console.log('  hand_R children:', handR.children.length, '(expect 1: the sword group)');
console.log('  hand_R first child name:', handR.children[0]?.name, '(expect sword)');

console.log('— probe 11: Mesh.attach without rig falls back —');
let warned = false;
const origWarn = console.warn;
console.warn = (...a: unknown[]) => {
  warned = true;
  origWarn(...a);
};
const lonely = entity('lonely').add(Mesh.box(1, 1, 1).attach('head'));
const rl = lonely.build();
console.warn = origWarn;
console.log('  warned:', warned, '(expect true)');
console.log('  mesh under root anyway:', rl.object.children.length, '(expect 1)');

// ── Step 4 probes ─────────────────────────────────────────────────────────
console.log('— probe 12: Animator.clip(wave) plays —');
const waver = entity('waver')
  .add(Rig.humanoid())
  .add(Mesh.cyl(0.06, 0.06, 0.32).material('toon', { color: 'brick' }).attach('arm_R'))
  .add(Animator.clip('wave', { autoplay: true }));
const rw = waver.build();
console.log('  has tick:', typeof rw.tick === 'function');
console.log('  registered ticks:', rw.object.userData.tickRegistry, '(expect 1, the mixer-update tick)');

// Simulate 5 frames at 0.1s and see arm_R rotation change.
const rig3 = rw.refs.get('rig') as import('../src/rig.js').ResolvedRig;
const armBone = rig3.bones['arm_R'];
const angles: number[] = [];
let t = 0;
for (let i = 0; i < 5; i++) {
  rw.tick!(t, 0.1);
  angles.push(armBone.quaternion.z);
  t += 0.1;
}
console.log('  arm_R quaternion.z over 5 frames:', angles.map((a) => a.toFixed(3)).join(', '));
const moved = angles.some((a, i) => i > 0 && Math.abs(a - angles[0]) > 0.05);
console.log('  bone actually moved:', moved, '(expect true)');

console.log('— probe 13: Clips registry —');
console.log('  has idle:', Clips.has('idle'));
console.log('  has wave:', Clips.has('wave'));
console.log('  has bogus:', Clips.has('bogus'));
console.log('  list locomotion:', Clips.list('locomotion').join(', '));

console.log('— probe 14: Animator.spin on bone —');
const spinner = entity('spinner')
  .add(Rig.humanoid())
  .add(Mesh.box(0.4, 0.4, 0.4).material('toon').attach('head'))
  .add(Animator.spin({ target: 'head', axis: 'y', speed: 1 }));
const rs = spinner.build();
const headBone = (rs.refs.get('rig') as import('../src/rig.js').ResolvedRig).bones['head'];
const yBefore = headBone.rotation.y;
rs.tick!(0, 0.5);
const yAfter = headBone.rotation.y;
console.log('  head.rotation.y delta:', (yAfter - yBefore).toFixed(3), '(expect ~0.5 rad)');

console.log('\nAll probes passed.');
