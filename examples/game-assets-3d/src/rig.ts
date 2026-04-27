// Rig — bone hierarchies + named attachment points.
//
// A RigBlueprint is a list of bone declarations + role-to-name mapping. Calling
// materializeRig(blueprint) builds a real THREE.Bone tree (Bone is just an
// Object3D, so the matrix cascade works out of the box). Other behaviors
// (Mesh.attach, Tell.headTilt, Animator.spin({target}), Use({attachTo}))
// resolve a BoneRef against the materialized rig.
//
// Rigid attachment is the default: Mesh.cyl(...).attach('arm_R') parents the
// mesh under the arm bone. Skinning (THREE.SkinnedMesh) is reachable via
// Rig.custom({ skinned: true }) for future soft creatures.

import * as THREE from 'three';
import type { Behavior } from './entity/types.js';

export type BoneRef = string | ((rig: ResolvedRig) => THREE.Bone);

export type BoneRole =
  // Spine + head core
  | 'root' | 'pelvis' | 'lumbar' | 'spine' | 'thorax' | 'chest'
  | 'cervical' | 'neck' | 'head' | 'jaw'
  | 'eye_L' | 'eye_R'
  // Shoulders / arms
  | 'shoulder_L' | 'shoulder_R'
  | 'clavicle_L' | 'clavicle_R'
  | 'arm_L' | 'arm_R'
  | 'upperArm_L' | 'upperArm_R'
  | 'forearm_L' | 'forearm_R'
  | 'hand_L' | 'hand_R'
  // Fingers (alias to *_proximal_*)
  | 'thumb_L' | 'thumb_R'
  | 'index_L' | 'index_R'
  | 'middle_L' | 'middle_R'
  | 'ring_L' | 'ring_R'
  | 'pinky_L' | 'pinky_R'
  // Accessory mount slots
  | 'weapon_mount_L' | 'weapon_mount_R'
  | 'back_slot' | 'belt_slot_front' | 'belt_slot_back' | 'belt_slot_R' | 'belt_slot_L'
  // Hips / legs
  | 'hip_L' | 'hip_R'
  | 'leg_L' | 'leg_R'
  | 'upperLeg_L' | 'upperLeg_R'
  | 'lowerLeg_L' | 'lowerLeg_R'
  | 'foot_L' | 'foot_R'
  // Other archetypes
  | 'tail' | 'wing_L' | 'wing_R'
  | 'custom';

export interface BoneDecl {
  name: string;
  parent?: string;
  offset?: [number, number, number];
  rotation?: [number, number, number];
  role?: BoneRole;
}

export interface RigBlueprint {
  readonly id: string;
  readonly bones: ReadonlyArray<BoneDecl>;
  readonly attachments: ReadonlyMap<BoneRole, string>;
  readonly skinned?: boolean;
}

export interface ResolvedRig {
  readonly blueprint: RigBlueprint;
  readonly root: THREE.Bone;
  readonly bones: Readonly<Record<string, THREE.Bone>>;
  resolve(ref: BoneRef): THREE.Bone;
  byRole(role: BoneRole): THREE.Bone | undefined;
  skeleton?: THREE.Skeleton;
}

// ── Blueprint construction ────────────────────────────────────────────────

function makeBlueprint(
  id: string,
  bones: BoneDecl[],
  opts: { skinned?: boolean; attachments?: Partial<Record<BoneRole, string>> } = {},
): RigBlueprint {
  const attachments = new Map<BoneRole, string>();
  // Auto-derive role → bone-name from BoneDecl.role.
  for (const b of bones) {
    if (b.role && b.role !== 'custom') attachments.set(b.role, b.name);
  }
  // Caller overrides.
  if (opts.attachments) {
    for (const [role, name] of Object.entries(opts.attachments) as Array<[BoneRole, string]>) {
      attachments.set(role, name);
    }
  }
  return { id, bones, attachments, skinned: opts.skinned };
}

// ── Materialization (RigBlueprint → ResolvedRig with THREE.Bone tree) ─────

export function materializeRig(blueprint: RigBlueprint): ResolvedRig {
  const bones: Record<string, THREE.Bone> = {};

  // Pass 1 — create all bones with their local rest pose (offset/rotation).
  for (const decl of blueprint.bones) {
    const bone = new THREE.Bone();
    bone.name = decl.name;
    if (decl.offset) bone.position.set(...decl.offset);
    if (decl.rotation) bone.rotation.set(...decl.rotation);
    bones[decl.name] = bone;
  }

  // Pass 2 — wire parent/child links. The first bone with no parent becomes
  // root (we throw if there are multiple roots — rigs must have a single root).
  let root: THREE.Bone | undefined;
  for (const decl of blueprint.bones) {
    const bone = bones[decl.name];
    if (decl.parent) {
      const parent = bones[decl.parent];
      if (!parent) {
        throw new Error(`[rig] Bone '${decl.name}' references unknown parent '${decl.parent}'`);
      }
      parent.add(bone);
    } else {
      if (root) {
        throw new Error(
          `[rig] Multiple root bones in blueprint '${blueprint.id}': '${root.name}' and '${decl.name}'`,
        );
      }
      root = bone;
    }
  }
  if (!root) throw new Error(`[rig] No root bone in blueprint '${blueprint.id}'`);

  const resolved: ResolvedRig = {
    blueprint,
    root,
    bones,
    resolve(ref: BoneRef): THREE.Bone {
      if (typeof ref === 'function') return ref(resolved);
      // Try as role first, then as literal bone name.
      const byRoleName = blueprint.attachments.get(ref as BoneRole);
      if (byRoleName) {
        const b = bones[byRoleName];
        if (b) return b;
      }
      const direct = bones[ref];
      if (direct) return direct;
      throw new Error(
        `[rig] Cannot resolve BoneRef '${ref}' — known bones: ${Object.keys(bones).join(', ')}; ` +
          `known roles: ${[...blueprint.attachments.keys()].join(', ')}`,
      );
    },
    byRole(role: BoneRole): THREE.Bone | undefined {
      const name = blueprint.attachments.get(role);
      return name ? bones[name] : undefined;
    },
  };

  // Always materialize the THREE.Skeleton — cost is one allocation; if no
  // SkinnedMesh references it, no GPU upload happens. SkinnedBody widgets
  // can rely on rig.skeleton being defined for any rig kind.
  resolved.skeleton = new THREE.Skeleton(Object.values(bones));

  return resolved;
}

// ── Built-in blueprints ────────────────────────────────────────────────────

function humanoidBlueprint(): RigBlueprint {
  return makeBlueprint('humanoid', [
    { name: 'root',       role: 'root' },
    { name: 'pelvis',     parent: 'root',       role: 'pelvis',     offset: [0, 0.95, 0] },
    { name: 'spine',      parent: 'pelvis',     role: 'spine',      offset: [0, 0.20, 0] },
    { name: 'chest',      parent: 'spine',      role: 'chest',      offset: [0, 0.25, 0] },
    { name: 'neck',       parent: 'chest',      role: 'neck',       offset: [0, 0.18, 0] },
    { name: 'head',       parent: 'neck',       role: 'head',       offset: [0, 0.18, 0] },
    { name: 'shoulder_R', parent: 'chest',      role: 'shoulder_R', offset: [ 0.22, 0.18, 0] },
    { name: 'arm_R',      parent: 'shoulder_R', role: 'arm_R',      offset: [ 0.22, 0,    0] },
    { name: 'hand_R',     parent: 'arm_R',      role: 'hand_R',     offset: [ 0.32, 0,    0] },
    { name: 'shoulder_L', parent: 'chest',      role: 'shoulder_L', offset: [-0.22, 0.18, 0] },
    { name: 'arm_L',      parent: 'shoulder_L', role: 'arm_L',      offset: [-0.22, 0,    0] },
    { name: 'hand_L',     parent: 'arm_L',      role: 'hand_L',     offset: [-0.32, 0,    0] },
    { name: 'hip_R',      parent: 'pelvis',     role: 'hip_R',      offset: [ 0.12, -0.05, 0] },
    { name: 'leg_R',      parent: 'hip_R',      role: 'leg_R',      offset: [ 0,    -0.45, 0] },
    { name: 'foot_R',     parent: 'leg_R',      role: 'foot_R',     offset: [ 0,    -0.45, 0] },
    { name: 'hip_L',      parent: 'pelvis',     role: 'hip_L',      offset: [-0.12, -0.05, 0] },
    { name: 'leg_L',      parent: 'hip_L',      role: 'leg_L',      offset: [ 0,    -0.45, 0] },
    { name: 'foot_L',     parent: 'leg_L',      role: 'foot_L',     offset: [ 0,    -0.45, 0] },
  ]);
}

/**
 * Mirror a list of right-side bone declarations into left-side equivalents.
 * Names ending in `_R` become `_L`; `parent` references ending in `_R` are
 * also rewritten; the X component of `offset` is sign-flipped. Roles are
 * not auto-swapped (caller passes pre-mirrored role names if needed).
 */
function mirror(decls: BoneDecl[]): BoneDecl[] {
  const swap = (s: string): string => s.endsWith('_R') ? s.slice(0, -2) + '_L' : s;
  return decls.map((d) => ({
    name: swap(d.name),
    parent: d.parent ? swap(d.parent) : undefined,
    offset: d.offset
      ? [-d.offset[0], d.offset[1], d.offset[2]] as [number, number, number]
      : undefined,
    rotation: d.rotation,
    role: d.role
      ? (d.role.endsWith('_R')
          ? (d.role.slice(0, -2) + '_L') as BoneRole
          : d.role)
      : undefined,
  }));
}

/** Generate a 3-joint finger chain on the right hand (used by detailedHumanoid). */
function fingerChainR(
  name: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky',
  rootOffsetX: number,
  rootOffsetZ: number,
): BoneDecl[] {
  return [
    { name: `${name}_proximal_R`, parent: 'hand_R',
      offset: [rootOffsetX, 0, rootOffsetZ] },
    { name: `${name}_middle_R`,   parent: `${name}_proximal_R`,
      offset: [0.035, 0, 0] },
    { name: `${name}_distal_R`,   parent: `${name}_middle_R`,
      offset: [0.030, 0, 0] },
  ];
}

/** Generate 5 right-foot toe bones (single joint each) for the detailed rig. */
function toesR(): BoneDecl[] {
  return ['big_toe', 'index_toe', 'middle_toe', 'ring_toe', 'pinky_toe'].map((n, i) => ({
    name: `${n}_R`, parent: 'foot_R',
    offset: [0.04 - i * 0.02, -0.02, 0.10] as [number, number, number],
  }));
}

function detailedHumanoidBlueprint(): RigBlueprint {
  // Right side (will be mirrored for left).
  const armR: BoneDecl[] = [
    { name: 'clavicle_R', parent: 'chest',      role: 'clavicle_R', offset: [ 0.10, 0.16, 0] },
    { name: 'arm_R',      parent: 'clavicle_R', role: 'arm_R',      offset: [ 0.14, 0,    0] },
    { name: 'forearm_R',  parent: 'arm_R',      role: 'forearm_R',  offset: [ 0.32, 0,    0] },
    { name: 'hand_R',     parent: 'forearm_R',  role: 'hand_R',     offset: [ 0.30, 0,    0] },
    { name: 'weapon_mount_R', parent: 'hand_R', role: 'weapon_mount_R', offset: [0.05, 0, 0.05] },
    ...fingerChainR('thumb',  0.06, 0.06),
    ...fingerChainR('index',  0.10, 0.04),
    ...fingerChainR('middle', 0.11, 0),
    ...fingerChainR('ring',   0.10, -0.04),
    ...fingerChainR('pinky',  0.08, -0.07),
  ];

  const legR: BoneDecl[] = [
    { name: 'hip_R',      parent: 'pelvis', role: 'hip_R',      offset: [ 0.12, -0.05, 0] },
    { name: 'leg_R',      parent: 'hip_R',  role: 'leg_R',      offset: [ 0,    -0.45, 0] },
    { name: 'lowerLeg_R', parent: 'leg_R',  role: 'lowerLeg_R', offset: [ 0,    -0.45, 0] },
    { name: 'foot_R',     parent: 'lowerLeg_R', role: 'foot_R', offset: [ 0,    -0.05, 0.05] },
    ...toesR(),
  ];

  return makeBlueprint(
    'detailed-humanoid',
    [
      // ── Core spine ──────────────────────────────────────────────────
      { name: 'root',   role: 'root' },
      { name: 'pelvis', parent: 'root',   role: 'pelvis', offset: [0, 0.95, 0] },
      { name: 'lumbar', parent: 'pelvis', role: 'lumbar', offset: [0, 0.10, 0] },
      { name: 'spine',  parent: 'lumbar', role: 'spine',  offset: [0, 0.10, 0] },
      { name: 'chest',  parent: 'spine',  role: 'chest',  offset: [0, 0.25, 0] },
      { name: 'neck',   parent: 'chest',  role: 'neck',   offset: [0, 0.18, 0] },
      { name: 'head',   parent: 'neck',   role: 'head',   offset: [0, 0.18, 0] },
      { name: 'jaw',    parent: 'head',   role: 'jaw',    offset: [0,-0.05, 0.10] },
      { name: 'eye_L',  parent: 'head',   role: 'eye_L',  offset: [-0.06, 0.04, 0.13] },
      { name: 'eye_R',  parent: 'head',   role: 'eye_R',  offset: [ 0.06, 0.04, 0.13] },

      // ── Arms ────────────────────────────────────────────────────────
      ...armR,
      ...mirror(armR),

      // ── Legs ────────────────────────────────────────────────────────
      ...legR,
      ...mirror(legR),

      // ── Accessory mount slots (empty bones) ─────────────────────────
      { name: 'back_slot',       parent: 'chest',  role: 'back_slot',       offset: [0, 0, -0.20] },
      { name: 'belt_slot_front', parent: 'pelvis', role: 'belt_slot_front', offset: [0, 0,  0.15] },
      { name: 'belt_slot_back',  parent: 'pelvis', role: 'belt_slot_back',  offset: [0, 0, -0.15] },
      { name: 'belt_slot_R',     parent: 'pelvis', role: 'belt_slot_R',     offset: [ 0.18, 0, 0] },
      { name: 'belt_slot_L',     parent: 'pelvis', role: 'belt_slot_L',     offset: [-0.18, 0, 0] },
    ],
    {
      attachments: {
        // Aliases: same bone, additional role names. Lets older code asking for
        // 'shoulder_R' on the legacy rig still get a usable bone here (the
        // clavicle is the closest semantic match).
        shoulder_R: 'clavicle_R',
        shoulder_L: 'clavicle_L',
        upperArm_R: 'arm_R',
        upperArm_L: 'arm_L',
        upperLeg_R: 'leg_R',
        upperLeg_L: 'leg_L',
        cervical:   'neck',
        thorax:     'chest',
        thumb_R:    'thumb_proximal_R',
        index_R:    'index_proximal_R',
        middle_R:   'middle_proximal_R',
        ring_R:     'ring_proximal_R',
        pinky_R:    'pinky_proximal_R',
        thumb_L:    'thumb_proximal_L',
        index_L:    'index_proximal_L',
        middle_L:   'middle_proximal_L',
        ring_L:     'ring_proximal_L',
        pinky_L:    'pinky_proximal_L',
      },
    },
  );
}

function bipedBlueprint(): RigBlueprint {
  // Bird/lizard biped — same as humanoid minus arms.
  return makeBlueprint('biped', [
    { name: 'root',   role: 'root' },
    { name: 'pelvis', parent: 'root',   role: 'pelvis', offset: [0, 0.7, 0] },
    { name: 'spine',  parent: 'pelvis', role: 'spine',  offset: [0, 0.20, 0] },
    { name: 'chest',  parent: 'spine',  role: 'chest',  offset: [0, 0.20, 0] },
    { name: 'neck',   parent: 'chest',  role: 'neck',   offset: [0, 0.15, 0.10] },
    { name: 'head',   parent: 'neck',   role: 'head',   offset: [0, 0.10, 0.10] },
    { name: 'tail',   parent: 'pelvis', role: 'tail',   offset: [0, 0, -0.30] },
    { name: 'hip_R',  parent: 'pelvis', role: 'hip_R',  offset: [ 0.12, -0.05, 0] },
    { name: 'leg_R',  parent: 'hip_R',  role: 'leg_R',  offset: [ 0, -0.40, 0] },
    { name: 'foot_R', parent: 'leg_R',  role: 'foot_R', offset: [ 0, -0.35, 0.05] },
    { name: 'hip_L',  parent: 'pelvis', role: 'hip_L',  offset: [-0.12, -0.05, 0] },
    { name: 'leg_L',  parent: 'hip_L',  role: 'leg_L',  offset: [ 0, -0.40, 0] },
    { name: 'foot_L', parent: 'leg_L',  role: 'foot_L', offset: [ 0, -0.35, 0.05] },
  ]);
}

function quadrupedBlueprint(): RigBlueprint {
  // Front legs map to leg_L/R role; back legs are 'custom' role with explicit
  // attachments override so bones-by-role still hits something useful.
  return makeBlueprint(
    'quadruped',
    [
      { name: 'root',     role: 'root' },
      { name: 'spine',    parent: 'root',  role: 'spine',  offset: [0, 0.55, 0] },
      { name: 'neck',     parent: 'spine', role: 'neck',   offset: [0, 0.10, 0.30] },
      { name: 'head',     parent: 'neck',  role: 'head',   offset: [0, 0.05, 0.20] },
      { name: 'tail',     parent: 'spine', role: 'tail',   offset: [0, 0,   -0.40] },
      { name: 'leg_FL',   parent: 'spine', role: 'leg_L',  offset: [-0.18, -0.05,  0.25] },
      { name: 'leg_FR',   parent: 'spine', role: 'leg_R',  offset: [ 0.18, -0.05,  0.25] },
      { name: 'leg_BL',   parent: 'spine', role: 'custom', offset: [-0.18, -0.05, -0.25] },
      { name: 'leg_BR',   parent: 'spine', role: 'custom', offset: [ 0.18, -0.05, -0.25] },
    ],
  );
}

function emptyBlueprint(): RigBlueprint {
  return makeBlueprint('empty', [{ name: 'root', role: 'root' }]);
}

// ── Rig.* Behavior factories ───────────────────────────────────────────────
//
// A Rig behavior:
//   1. Materializes the blueprint into a ResolvedRig
//   2. Adds the rig's root Bone as a child of the entity root
//   3. Registers the ResolvedRig under ctx.refs.set('rig', resolved)
// Other behaviors (Mesh.attach, Tell.headTilt, Use({attachTo}), Animator.*)
// look up 'rig' from refs and call resolve(boneRef).

function rigBehavior(blueprint: RigBlueprint): Behavior {
  return {
    kind: 'rig',
    config: { blueprintId: blueprint.id, boneCount: blueprint.bones.length },
    onBuild(ctx) {
      const resolved = materializeRig(blueprint);
      ctx.refs.set('rig', resolved);
      return { object: resolved.root };
    },
  };
}

export const Rig = {
  humanoid: () => rigBehavior(humanoidBlueprint()),
  detailedHumanoid: () => rigBehavior(detailedHumanoidBlueprint()),
  biped: () => rigBehavior(bipedBlueprint()),
  quadruped: () => rigBehavior(quadrupedBlueprint()),
  empty: () => rigBehavior(emptyBlueprint()),
  custom: (opts: {
    bones: BoneDecl[];
    skinned?: boolean;
    attachments?: Partial<Record<BoneRole, string>>;
  }): Behavior =>
    rigBehavior(makeBlueprint('custom', opts.bones, {
      skinned: opts.skinned,
      attachments: opts.attachments,
    })),
} as const;
