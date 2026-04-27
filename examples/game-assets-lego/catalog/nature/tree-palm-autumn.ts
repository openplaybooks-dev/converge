import { BuildContext, Palette, widgetToAssetModule } from '@lego';
import type { ColorInput } from '@lego';
import { Palm } from './tree-palm.js';

export class AutumnPalm extends Palm {
  protected override frondColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'leaves', 'leafGold');
  }
}

export default widgetToAssetModule(
  'tree-palm-autumn',
  { kind: 'environment', archetype: 'tree', name: 'Autumn Palm',
    description: 'Palm with browned/golden fronds — late-season palm.' },
  new AutumnPalm(),
);
