// Widget tree authoring API — public barrel.

export {
  Widget3D,
  StatelessWidget3D,
  LeafWidget3D,
  InheritedWidget3D,
  makeRootContext,
} from './types.js';
export type { BuildContext } from './types.js';
export { Stack3D } from './stack.js';
export type { Stack3DOpts } from './stack.js';
export { widgetToEntity, widgetToAssetModule } from './runtime.js';
export * from './leaves/index.js';
export * from './inherited/index.js';
export * from './animation/index.js';
export * from './composites/index.js';
export { DayNight, UPSTREAM_PHASES } from './animation/daynight.js';
export type { DayPhase, DayNightFrame } from './animation/daynight.js';
