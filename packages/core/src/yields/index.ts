/**
 * Yields Module
 *
 * Enhanced yields API for dynamic task spawning with:
 * - Context-driven spawning (ctx.spawn())
 * - Declarative configs
 * - Conditional execution
 * - Max task limits
 * - Cross-epic spawning
 */

export * from './processor.ts';
export * from './spawner.ts';
export * from './types.ts';

export {
  createYieldsProcessor,
  YieldsProcessor,
} from './processor.ts';

export {
  createYieldsSpawner,
  YieldsSpawner,
} from './spawner.ts';

export type {
  YieldsContext,
  YieldsSpawnTarget,
  YieldsSpawnOptions,
  YieldsFn,
  YieldsConfig,
  YieldsDeclarative,
  YieldsStatic,
} from './types.ts';
