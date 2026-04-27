// Forest — showcase of Flutter-style builder-pattern customization.
//
// Demonstrates three customization axes Pine inherits via context:
//   - Seed   : per-instance random seed → silhouette variation
//   - Palette: per-region bark/leaves colors → fall vs. winter zones
// And one explicit prop axis:
//   - trunkH : tree-by-tree height variation
//
// Customizing the forest is just changing this build() — no new framework
// concepts. To make a denser forest, change `count`. To make a winter zone,
// wrap a Palette around the inner range.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  widgetToAssetModule,
} from '@lego';
import { Pine } from './tree-pine.js';

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

export class Forest extends StatelessWidget3D {
  readonly count: number;
  readonly extent: number;

  constructor(opts: { count?: number; extent?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.count = opts.count ?? 20;
    this.extent = opts.extent ?? 24;
  }

  override build(_ctx: BuildContext): Widget3D {
    // Deterministic XZ scatter using a simple hash so the forest is stable.
    const half = this.extent / 2;
    const hash = (i: number, salt: number): number => {
      const x = Math.sin(i * 12.9898 + salt) * 43758.5453;
      return x - Math.floor(x);
    };

    return new Stack3D({
      name: 'forest',
      children: range(this.count).map((i) => {
        const x = hash(i, 1) * this.extent - half;
        const z = hash(i, 2) * this.extent - half;
        const trunkH = 5 + hash(i, 3) * 3.5;          // 5..8.5
        const seedI = 1000 + i * 17;
        // Last 25% of trees get autumn palette to show context customization.
        const isFall = i / this.count > 0.75;
        const child = new Seed({
          value: seedI,
          child: new Stack3D({
            at: [x, 0, z],
            children: [new Pine({ trunkH })],
          }),
        });
        return isFall
          ? new Palette({ colors: { leaves: 0xc25025, bark: 'pineWood' }, child })
          : child;
      }),
    });
  }
}

export default widgetToAssetModule(
  'forest',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Forest',
    description: '20 procedurally-varied pines: builder-pattern composition with per-region Palette overrides.',
  },
  new Forest(),
);
