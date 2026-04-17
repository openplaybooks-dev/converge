/**
 * Enhanced Plugin Loader (V2)
 *
 * Loads plugins with support for the new function-driven architecture.
 * Supports both legacy (V1) and new (V2) plugin formats.
 */

import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import type { HarnessPluginV2, PluginEntry, PluginStateV2 } from './types.ts';
import { PluginAPIImplV2 } from './api.ts';
import { getBuiltinPlugin } from './builtins/index.ts';

/* ------------------------------------------------------------------ */
/*  Plugin Entry Parsing                                              */
/* ------------------------------------------------------------------ */

interface ParsedEntry {
  name: string;
  options: Record<string, unknown>;
}

function parseEntry(entry: PluginEntry): ParsedEntry {
  if (typeof entry === 'string') {
    return { name: entry, options: {} };
  }
  if (Array.isArray(entry)) {
    return { name: entry[0], options: entry[1] || {} };
  }
  return { name: entry.name, options: entry.options || {} };
}

/* ------------------------------------------------------------------ */
/*  Plugin Resolution                                                 */
/* ------------------------------------------------------------------ */

async function resolvePlugin(name: string, projectDir: string): Promise<HarnessPluginV2> {
  // 1. Project-local plugin in .harness/plugins/{name}/
  const crewPluginDir = join(projectDir, '.crew', 'plugins', name);
  const crewPluginIndex = join(crewPluginDir, 'index.ts');
  const crewPluginIndexJs = join(crewPluginDir, 'index.js');
  const localPath = existsSync(crewPluginIndex)
    ? crewPluginIndex
    : existsSync(crewPluginIndexJs)
    ? crewPluginIndexJs
    : null;

  if (localPath) {
    const mod = await import(pathToFileURL(localPath).href);
    const plugin = mod.default || mod;
    validatePlugin(plugin, name);
    return plugin;
  }

  // 2. Built-in plugin (legacy V1 format - will be wrapped)
  const builtin = getBuiltinPlugin(name);
  if (builtin) {
    // Wrap V1 plugin to V2 format
    return wrapV1Plugin(builtin);
  }

  // 3. Local file path (starts with ./ or ../ or /)
  if (name.startsWith('./') || name.startsWith('../') || name.startsWith('/')) {
    const absPath = resolve(projectDir, name);
    if (!existsSync(absPath)) {
      throw new Error(`Plugin file not found: ${absPath}`);
    }
    const mod = await import(pathToFileURL(absPath).href);
    const plugin = mod.default || mod;
    validatePlugin(plugin, name);
    return plugin;
  }

  // 4. npm package
  try {
    const mod = await import(name);
    const plugin = mod.default || mod;
    validatePlugin(plugin, name);
    return plugin;
  } catch (err) {
    throw new Error(
      `Plugin "${name}" not found. Checked:\n` +
        `  - .harness/plugins/${name}/\n` +
        `  - Built-in plugins\n` +
        `  - Local file "${name}"\n` +
        `  - npm package "${name}"\n\n` +
        `Install it with: npm install ${name}\n` +
        `Or create a local plugin in .harness/plugins/${name}/.`
    );
  }
}

function validatePlugin(plugin: unknown, source: string): asserts plugin is HarnessPluginV2 {
  if (!plugin || typeof plugin !== 'object') {
    throw new Error(`Plugin "${source}" does not export a valid plugin object.`);
  }
  const p = plugin as Record<string, unknown>;
  if (typeof p.name !== 'string' || !p.name) {
    throw new Error(`Plugin "${source}" is missing a "name" field.`);
  }
  if (typeof p.version !== 'string' || !p.version) {
    throw new Error(`Plugin "${source}" is missing a "version" field.`);
  }
  if (typeof p.setup !== 'function') {
    throw new Error(`Plugin "${source}" is missing a "setup" function.`);
  }
}

/**
 * Wrap a legacy V1 plugin to V2 format
 */
function wrapV1Plugin(v1Plugin: any): HarnessPluginV2 {
  return {
    name: v1Plugin.name,
    version: v1Plugin.version,
    description: v1Plugin.description,
    requires: v1Plugin.requires,
    setup: v1Plugin.setup, // V1 setup will use legacy API methods
  };
}

/* ------------------------------------------------------------------ */
/*  Dependency Resolution (Topological Sort)                          */
/* ------------------------------------------------------------------ */

interface ResolvedPlugin {
  plugin: HarnessPluginV2;
  options: Record<string, unknown>;
}

function topologicalSort(plugins: ResolvedPlugin[]): ResolvedPlugin[] {
  const nameToPlugin = new Map<string, ResolvedPlugin>();
  for (const rp of plugins) {
    nameToPlugin.set(rp.plugin.name, rp);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: ResolvedPlugin[] = [];

  function visit(name: string, chain: string[]): void {
    if (visited.has(name)) return;

    if (visiting.has(name)) {
      throw new Error(
        `Circular plugin dependency detected: ${[...chain, name].join(' → ')}`
      );
    }

    const rp = nameToPlugin.get(name);
    if (!rp) return; // dependency not in list — will be caught later

    visiting.add(name);

    for (const req of rp.plugin.requires || []) {
      if (!nameToPlugin.has(req)) {
        throw new Error(
          `Plugin "${name}" requires "${req}", but it is not in the plugins list.\n` +
            `Add "${req}" before "${name}" in project.yaml plugins array.`
        );
      }
      visit(req, [...chain, name]);
    }

    visiting.delete(name);
    visited.add(name);
    sorted.push(rp);
  }

  for (const rp of plugins) {
    visit(rp.plugin.name, []);
  }

  return sorted;
}

/* ------------------------------------------------------------------ */
/*  Plugin Loading (V2)                                               */
/* ------------------------------------------------------------------ */

/**
 * Load and initialize all plugins with V2 architecture support.
 *
 * Returns the accumulated PluginStateV2 with all merged contributions.
 */
export async function loadPluginsV2(
  entries: PluginEntry[],
  projectDir: string
): Promise<PluginStateV2> {
  const state: PluginStateV2 = {
    checks: new Map(),
    evals: new Map(),
    plans: new Map(),
    tasks: new Map(),
    vars: {},
    hooks: new Map(),
    tools: new Map(),
    loaded: [],
    manifests: [],
  };

  if (!entries || entries.length === 0) return state;

  // Parse entries
  const parsed = entries.map(parseEntry);

  // Resolve all plugins
  const resolved: ResolvedPlugin[] = [];
  for (const { name, options } of parsed) {
    const plugin = await resolvePlugin(name, projectDir);
    resolved.push({ plugin, options });
  }

  // Topological sort (respects `requires`)
  const sorted = topologicalSort(resolved);

  // Initialize plugins in order
  for (const { plugin, options } of sorted) {
    const api = new PluginAPIImplV2(plugin.name, projectDir, options, state);

    await plugin.setup(api);

    state.loaded.push(plugin.name);
    state.manifests.push(api.buildManifest(plugin));
  }

  return state;
}

/**
 * Format plugin state for CLI display (V2)
 */
export function formatPluginListV2(state: PluginStateV2): string {
  if (state.manifests.length === 0) {
    return 'No plugins loaded.';
  }

  const lines: string[] = [`Plugins (${state.manifests.length}):`];

  for (const m of state.manifests) {
    const req = m.requires?.length ? ` (requires: ${m.requires.join(', ')})` : '';
    lines.push(
      `  ${m.name}@${m.version}${m.description ? ` — ${m.description}` : ''}${req}`
    );

    const details: string[] = [];

    // New function contributions
    if (m.checkFns.length) details.push(`✓ checks: ${m.checkFns.join(', ')}`);
    if (m.evalFns.length) details.push(`✓ evals: ${m.evalFns.join(', ')}`);
    if (m.planFns.length) details.push(`✓ plans: ${m.planFns.join(', ')}`);
    if (m.taskFns.length) details.push(`✓ tasks: ${m.taskFns.join(', ')}`);

    // Legacy contributions (if any)
    if (m.checks.length) details.push(`  [legacy] checks: ${m.checks.join(', ')}`);
    if (m.taskTypes.length) details.push(`  [legacy] types: ${m.taskTypes.join(', ')}`);
    if (m.extendedTypes.length)
      details.push(`  [legacy] extends: ${m.extendedTypes.join(', ')}`);

    // Infrastructure
    if (m.hooks.length) details.push(`  hooks: ${m.hooks.join(', ')}`);
    if (m.tools.length) details.push(`  tools: ${m.tools.join(', ')}`);
    if (m.vars.length) details.push(`  vars: ${m.vars.join(', ')}`);

    for (const d of details) {
      lines.push(`    ${d}`);
    }

    lines.push('');
  }

  // Summary
  const totalChecks = state.checks.size;
  const totalEvals = state.evals.size;
  const totalPlans = state.plans.size;
  const totalTasks = state.tasks.size;

  lines.push(`Summary:`);
  lines.push(`  Check functions: ${totalChecks}`);
  lines.push(`  Eval functions: ${totalEvals}`);
  lines.push(`  Plan functions: ${totalPlans}`);
  lines.push(`  Task functions: ${totalTasks}`);

  return lines.join('\n');
}

/**
 * List all available built-in plugins
 */
export function listBuiltinPluginsV2(): string[] {
  return ['typescript', 'nextjs', 'git', 'docker', 'eslint', 'vitest', 'harnessconfig'];
}
