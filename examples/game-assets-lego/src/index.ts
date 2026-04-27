// Public exports — the surface AI consumes.

// Widget tree (Flutter-style; recommended high-level authoring surface).
export * from './widget/index.js';

// Entity / behavior layer (lower level; widgets ultimately compile to this).
export {
  entity,
  Mesh,
  Group,
  Transform,
  Material,
  Proportions,
  Tell,
  Use,
  entityToAssetModule,
} from './entity/index.js';
export type {
  Entity,
  Behavior,
  BuildCtx,
  BuildResult,
  BehaviorContribution,
  MeshBehavior,
  GroupBehavior,
  TransformOpts,
} from './entity/index.js';

// Rig + Animation.
export { Rig, materializeRig } from './rig.js';
export type { BoneRef, BoneRole, BoneDecl, RigBlueprint, ResolvedRig } from './rig.js';
export { Clip } from './clip.js';
export type { ClipSpec, TrackSpec, TrackKind, Keyframe, AuthoredClip } from './clip.js';
export { Clips } from './clip-registry.js';
export { Animator } from './animator.js';

// Shape (low-level mesh-spec class). Authors normally use Mesh.* instead;
// this is the escape hatch for advanced cases (Mesh.fromShape).
export { Shape } from './shape.js';

// Style + palette
export {
  PRIMARY,
  SECONDARY,
  ACCENT,
  PALETTE,
  WEATHERING_AMOUNT,
  WEATHERING_SCALE,
  VERTEX_NOISE_AMOUNT,
  TREE_LEAVES_COLORS,
  AIRPLANE_COLORS,
  resolveColor,
  type ColorInput,
  type PaletteName,
} from './style.js';

// Types
export type {
  AssetMeta,
  AssetKind,
  ArchetypeName,
  AssetBuildOptions,
  AssetBuilder,
  AssetModule,
  Tell as TellRecord,
  TellKind,
  Tick,
  MaterialName,
  MaterialOpts,
} from './types.js';

// Materials (advanced API; usually accessed via Shape.material(name, opts))
export { makeMaterial } from './materials.js';
