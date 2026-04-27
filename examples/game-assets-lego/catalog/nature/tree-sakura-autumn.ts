// Autumn Sakura — deeper pink, fewer petals (past peak bloom).

import { BuildContext, Palette, widgetToAssetModule } from '@lego';
import type { ColorInput } from '@lego';
import { Sakura } from './tree-sakura.js';

export class AutumnSakura extends Sakura {
  protected override blossomColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'leaves', 'sakuraDeepPink');
  }
}

export default widgetToAssetModule(
  'tree-sakura-autumn',
  { kind: 'environment', archetype: 'tree', name: 'Autumn Sakura',
    description: 'Cherry tree with deeper pink late-bloom blossoms.' },
  new AutumnSakura(),
);
