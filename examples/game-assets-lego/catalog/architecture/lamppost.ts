// LampPost — ported from interactive-low-poly-environment's `LampPost`
// (Roberto Nacu, MIT). Vertical wood post + horizontal arm + angle brace
// + an emissive lamp head.
//
// Original: js/main.js:3895. The upstream version attaches THREE.SpotLight
// + PointLight that toggle on at night. We use the 'screen' (emissive)
// material so the bulb reads as "lit" without runtime light state. Adding
// real lights is a future step once a scene-time-of-day system exists.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshBox, MeshCyl,
  Palette,
  SpotLightWidget, PointLightWidget,
  widgetToAssetModule,
} from '@lego';

let LAMPPOST_INSTANCE_ID = 0;

const HEIGHT = 15;

export class LampPost extends StatelessWidget3D {
  private readonly instanceId: number;
  constructor(opts: { key?: string } = {}) {
    super(opts);
    this.instanceId = LAMPPOST_INSTANCE_ID++;
  }
  override build(ctx: BuildContext): Widget3D {
    const wood = Palette.color(ctx, 'wood', 'fenceWood');
    const metal = Palette.color(ctx, 'metal', 'darkMetal');
    const glow = Palette.color(ctx, 'lamp', 'fireDarkYellow');

    return new Stack3D({
      name: 'lamppost',
      children: [
        // Vertical post
        new MeshBox({
          w: 1.5, h: HEIGHT, d: 1.5,
          deformLog: { amount: 0.18, seed: 91 },
          at: [0, HEIGHT / 2, 0],
          material: { name: 'bark', opts: { color: wood } },
          tag: 'post',
        }),
        // Horizontal arm sticking out toward +Z
        new MeshBox({
          w: 1, h: HEIGHT / 2 + 1, d: 1,
          at: [0, HEIGHT - 1, 2.2],
          rot: [-Math.PI / 2, 0, 0],
          material: { name: 'bark', opts: { color: wood } },
          tag: 'arm',
        }),
        // Angle brace under the arm
        new MeshBox({
          w: 0.5, h: 3.5, d: 0.5,
          at: [0, HEIGHT / 2 - 2.2 + 4, 1.5],
          rot: [Math.PI / 4, 0, 0],
          material: { name: 'bark', opts: { color: wood } },
          tag: 'brace',
        }),
        // Lamp shade — short truncated cone (approximated with cylinder).
        new MeshCyl({
          rt: 0.4, rb: 1.0, h: 1, rs: 4,
          at: [0, HEIGHT - 2, HEIGHT / 2 - 1.5],
          rot: [0, Math.PI / 4, 0],
          material: { name: 'phong', opts: { color: metal, shininess: 200, specular: 0xf2efe8, flatShading: true } },
          tag: 'shade',
        }),
        // Bulb — emissive sphere reads as "lit". Stays on regardless of time
        // of day; the real PointLight below provides the night illumination.
        new MeshCyl({
          rt: 0.35, rb: 0.35, h: 0.4, rs: 6,
          at: [0, HEIGHT - 2.7, HEIGHT / 2 - 1.5],
          material: { name: 'screen', opts: { color: glow, emissiveIntensity: 1.4 } },
          tag: 'bulb',
        }),
        // SpotLight pointing down for "torch on the ground" effect at night.
        new SpotLightWidget({
          at: [0, HEIGHT - 2.5, HEIGHT / 2 - 1.5],
          color: glow,
          intensity: 2,
          distance: 20,
          angle: Math.PI / 4,
          penumbra: 0.5,
          decay: 2,
          target: [0, -1000, 0],
          visible: false, // toggled on at night by DayNight.nightLights
          tag: `lamp_spot_${this.instanceId}`,
        }),
        // PointLight gives the "lit bulb" glow on adjacent objects.
        new PointLightWidget({
          at: [0, HEIGHT - 2.7, HEIGHT / 2 - 1.5],
          color: glow,
          intensity: 1.4,
          distance: 4,
          decay: 2,
          visible: false,
          tag: `lamp_point_${this.instanceId}`,
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'lamppost',
  {
    kind: 'building',
    archetype: 'building',
    name: 'Lamp Post',
    description: 'Wooden post with horizontal arm and emissive lamp shade — homestead lighting.',
  },
  new LampPost(),
);
