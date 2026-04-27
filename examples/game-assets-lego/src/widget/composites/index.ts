// Composite widget barrel.
export { World } from './world.js';
export {
  Trunk,
  Branch,
  FoliageCluster,
  PineCanopy,
  PalmFronds,
  WeepingFronds,
  RootFlare,
  FallenDebris,
} from './tree-toolkit.js';
export type {
  TrunkOpts,
  BranchOpts,
  FoliageBuilder,
  FoliageClusterOpts,
  PineCanopyOpts,
  PalmFrondsOpts,
  WeepingFrondsOpts,
  RootFlareOpts,
  FallenDebrisOpts,
} from './tree-toolkit.js';
export {
  Torso, Neck, Head, Shoulders, Arm, Hand, Leg, Foot, DefaultBody,
} from './body-toolkit.js';
export type {
  TorsoOpts, NeckOpts, HeadOpts, ShouldersOpts,
  ArmOpts, HandOpts, LegOpts, FootOpts, DefaultBodyOpts,
} from './body-toolkit.js';
export {
  Shirt, Pants, Shoes, Hat, Hair, Belt, Cape, Backpack,
} from './clothing-toolkit.js';
export type {
  ShirtOpts, PantsOpts, ShoesOpts, HatOpts, HairOpts,
  BeltOpts, CapeOpts, BackpackOpts,
} from './clothing-toolkit.js';
export {
  Eyes, Mouth, Nose, Ears, Brows, DefaultFace,
} from './face-toolkit.js';
export type {
  EyesOpts, MouthOpts, NoseOpts, EarsOpts, BrowsOpts, DefaultFaceOpts,
} from './face-toolkit.js';
export { SkinnedBody } from './skinned-body.js';
export type { SkinnedBodyOpts } from './skinned-body.js';
export type { BodyProfileParams } from './skinned-body-generator.js';
export { RealisticBody } from './realistic-body.js';
export type { RealisticBodyOpts } from './realistic-body.js';
export { Faceted } from './faceted.js';
export type { FacetedOpts } from './faceted.js';
