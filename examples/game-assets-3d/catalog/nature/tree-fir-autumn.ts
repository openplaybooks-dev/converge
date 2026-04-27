import { BuildContext, Widget3D, Palette, PineCanopy, widgetToAssetModule } from '@lego';
import { Fir } from './tree-fir.js';

export class AutumnFir extends Fir {
  protected override foliage(ctx: BuildContext, seed: number): Widget3D | null {
    const leaves = Palette.color(ctx, 'leaves', 'leafGold');
    return new PineCanopy({
      layers: 6,
      baseRadius: 3.2,
      height: this.trunkH * 0.85,
      baseY: this.trunkH * 0.4,
      layerScales: [1.0, 0.85, 0.72, 0.6, 0.5, 0.4],
      color: leaves,
      seed,
      tag: 'foliage_autumn',
    });
  }
}

export default widgetToAssetModule(
  'tree-fir-autumn',
  { kind: 'environment', archetype: 'tree', name: 'Autumn Fir',
    description: 'Fir with golden-tinted needles — autumn alpine.' },
  new AutumnFir(),
);
