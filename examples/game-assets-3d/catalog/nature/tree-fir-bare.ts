import { BuildContext, Widget3D, widgetToAssetModule } from '@lego';
import { Fir } from './tree-fir.js';

export class BareFir extends Fir {
  protected override foliage(_ctx: BuildContext, _seed: number): Widget3D | null {
    return null;
  }
}

export default widgetToAssetModule(
  'tree-fir-bare',
  { kind: 'environment', archetype: 'tree', name: 'Bare Fir',
    description: 'Bare fir trunk — winter or dead conifer.' },
  new BareFir(),
);
