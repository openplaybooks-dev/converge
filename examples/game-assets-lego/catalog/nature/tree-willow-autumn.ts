// Autumn Willow uses 'leafGold' for both clusters and fronds via Palette override.

import { BuildContext, Palette, widgetToAssetModule } from '@lego';
import type { ColorInput } from '@lego';
import { Willow } from './tree-willow.js';

export class AutumnWillow extends Willow {
  protected override leafColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'leaves', 'leafGold');
  }
}

export default widgetToAssetModule(
  'tree-willow-autumn',
  { kind: 'environment', archetype: 'tree', name: 'Autumn Willow',
    description: 'Willow with golden foliage and drooping golden fronds.' },
  new AutumnWillow(),
);
