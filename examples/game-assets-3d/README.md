# game-assets-lego

A TypeScript "Lego-block" library for low-poly indie game assets, with rigging + animation built in. AI-friendly authoring surface.

**This is the substrate. The catalog is the lego pieces. Custom assets compose them.**

```ts
// catalog/architecture/house.ts
import { defineAsset, PRIMARY } from '@lego';

export default defineAsset({
  meta: { slug: 'house', kind: 'prop', archetype: 'building' },
  proportions: { WALL_W: 4.0, WALL_H: 3.0, ROOF_H: 1.6 },
  build: (c, p) => {
    const walls = c.box(p.WALL_W, p.WALL_H, p.WALL_W)
      .at(0, p.WALL_H * 0.5, 0)
      .material('weathered', { color: 'brick' })
      .cut(c.box(0.8, 1.6, 0.3).at(0, 0.8, p.WALL_W * 0.5));   // door
    const roof = c.cone(p.WALL_W * 0.78, p.ROOF_H, 4)
      .at(0, p.WALL_H + p.ROOF_H * 0.5, 0)
      .rot(0, Math.PI / 4, 0)
      .material('weathered', { color: 'roof' });
    c.tell.mossPatch({ on: walls, side: 'north', area: 0.15 });
    return c.assemble({ walls, roof });
  },
});
```

A scene composes assets:

```ts
// scenes/city.ts
import House from '@catalog/architecture/house';
import Tree from '@catalog/nature/tree-pine';

runScene((c) => {
  c.layout.grid(House, { count: [3, 1, 3], spacing: [8, 0, 8] });
  c.layout.scatter(Tree, { count: 30, extent: [40, 0, 40], seed: 42 });
  c.world.daytime('midday');
});
```

## Layout

```
src/                 the library (Shape, primitives, materials, rig, animate, tell, layout, world, csg)
catalog/             ready-to-use objects (defineAsset modules — the Lego pieces)
  nature/            tree-pine, tree-oak, stone, grass-clump, cloud, lake
  architecture/      house, fence-segment, lamppost, carousel
  vehicles/          aeroplane
  effects/           campfire, fireflies
scenes/              composed scenes (showcases)
  island.ts          the original interactive-low-poly-environment, reproduced
  city.ts            new city composition
  playground.ts      empty template for AI/users to clone
viewer/              browser app — asset.html (per-asset inspector), scene.html (per-scene runner)
scripts/             verify-asset.ts (rubric runner), build-asset.ts (AI orchestrator)
.converge/skills/lego-author/  AI workflow manual
```

## Quickstart

```bash
pnpm install
pnpm -F @converge-example/game-assets-lego dev
# open http://127.0.0.1:5181/viewer/asset.html?slug=tree-pine
```

## Attribution

Ports content and algorithms from [interactive-low-poly-environment](https://github.com/1391819/interactive-low-poly-environment) (MIT, © 2022 Roberto Nacu). See [NOTICE](./NOTICE) for the full attribution.
