// Meshy AI Fox — RIGGED + ANIMATED variant. Same 271k-tri visual as the
// static catalog entry (slug=meshy-fox), but Meshy generated a 27-bone
// armature and a baked Walk cycle for it.
//
// Skeleton: Hips (root) → spine → chest → head → ears, plus 4 legs each
// with 4 joints (thigh/knee/ankle/foot), plus 4-segment tail.
//
// Single animation clip: 'Armature|Unreal Take|baselayer' (1.0s walk cycle,
// 31 keyframes, 81 T+R+S channels).
//
// Honest tradeoff vs. catalog/quaternius-animals/fox.glb:
//   - Detail: way higher (271k vs 2k tris) — looks photorealistic
//   - Animation count: 1 (Walk) vs. 12 (Idle, Walk, Gallop, Attack,
//     Eating, Death, Idle_HitReact_L/R, Idle_2, Jump_ToIdle, etc)
//   - Performance: ~135× heavier per draw call
//
// Use this when you want one hero fox visible up close. Use
// quat-animal-fox for crowds, distant background, or anything that
// needs a richer animation set.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'meshy-fox-rigged',
  {
    kind: 'character',
    archetype: 'biped',  // closest fit; we have no 'quadruped' value
    name: 'Meshy AI Fox (rigged + walking)',
    description: 'Meshy.ai text-to-3D fox with auto-generated 27-bone rig and baked walk cycle. 271k triangles. The "production" version of the static slug=meshy-fox.',
  },
  new GltfModel({
    asset: '/assets/meshy/fox-rigged-walk.glb',
    animation: 'baselayer',
    scale: 1.0,
  }),
);
