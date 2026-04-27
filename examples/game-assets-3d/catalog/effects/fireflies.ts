// FireflyColony — fidelity port using upstream's GLSL FIREFLIES_VS/FS shader.
//
// Original: js/main.js:4157. We use the FireflySwarm leaf widget which builds
// a real THREE.Points cloud with per-vertex aScale + rFade attributes.

import {
  StatelessWidget3D, BuildContext, Widget3D,
  Stack3D,
  FireflySwarm,
  widgetToAssetModule,
} from '@lego';

export class FireflyColony extends StatelessWidget3D {
  readonly count: number;
  readonly extent: [number, number, number];
  readonly seed: number;
  constructor(opts: { count?: number; extent?: [number, number, number]; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.count = opts.count ?? 24;
    this.extent = opts.extent ?? [12, 4, 12];
    this.seed = opts.seed ?? 901;
  }
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'firefly-colony',
      children: [new FireflySwarm({
        count: this.count,
        extent: this.extent,
        seed: this.seed,
        size: 200,
      })],
    });
  }
}

export default widgetToAssetModule(
  'fireflies',
  {
    kind: 'effect',
    archetype: 'effect',
    name: 'Firefly Colony',
    description: 'Cloud of glowing fireflies using upstream\'s custom GLSL shader (additive blending, sin-driven flutter).',
  },
  new FireflyColony(),
);
