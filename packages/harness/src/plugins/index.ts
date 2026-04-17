/**
 * Enhanced Plugin System (V2) - Exports
 *
 * Provides plugin infrastructure for the gap-driven architecture.
 */

// Types
export type {
  HarnessPluginV2,
  PluginAPIV2,
  HookEvent,
  HookFn,
  ToolFactory,
  PluginEntry,
  PluginStateV2,
  PluginManifestV2,
} from './types.ts';

// API Implementation
export { PluginAPIImplV2 } from './api.ts';

// Loader
export {
  loadPluginsV2,
  formatPluginListV2,
  listBuiltinPluginsV2,
} from './loader.ts';

// Legacy aliases for backward compatibility
export {
  loadPluginsV2 as loadPlugins,
  formatPluginListV2 as formatPluginList,
  listBuiltinPluginsV2 as listBuiltinPlugins,
} from './loader.ts';
