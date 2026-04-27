import { BuildContext, Palette, widgetToAssetModule } from '@lego';
import type { ColorInput } from '@lego';
import { Bush } from './tree-bush.js';

export class AutumnBush extends Bush {
  protected override leafColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'leaves', 'leafRust');
  }
}

export default widgetToAssetModule(
  'tree-bush-autumn',
  { kind: 'environment', archetype: 'plant', name: 'Autumn Bush',
    description: 'Bush with rust-orange foliage.' },
  new AutumnBush(),
);
