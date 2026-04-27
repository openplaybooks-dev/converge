// Probe asset for the entity API — single cube, validates step 1's gate
// (an entity builds and renders in the viewer). Open ?slug=probe-cube.

import { entity, Mesh, entityToAssetModule } from '@lego';

const probe = entity('probe-cube', {
  kind: 'prop',
  archetype: 'prop',
  name: 'Probe Cube',
  description: 'Step-1 entity API smoke test — a single cube.',
})
  .add(
    Mesh.box(2, 2, 2)
      .at(0, 1, 0)
      .material('weathered', { color: 'brick' })
      .tag('cube'),
  );

export default entityToAssetModule(probe);
