/**
 * Shared utility functions for 06-wire-screens WBS scripts.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { toPascalCase, toSnakeCase, routeToScreenPath, routeToWidgetsDir } from '../../../03-build-screens/wbs/helpers.js';

export { toPascalCase, toSnakeCase, routeToScreenPath, routeToWidgetsDir };

/**
 * Discover Riverpod provider names from lib/providers/*.dart files.
 * Returns array like [{ file: 'novel_provider.dart', provider: 'novelsProvider' }, ...]
 */
export function discoverProviders(projectDir) {
  const providersDir = join(projectDir, 'lib/providers');
  if (!existsSync(providersDir)) return [];

  return readdirSync(providersDir)
    .filter(f => f.endsWith('.dart') && !f.endsWith('.g.dart'))
    .map(f => {
      const content = readFileSync(join(providersDir, f), 'utf-8');
      const match = content.match(/(\w+Provider)\b/);
      return match ? { file: f, provider: match[1] } : null;
    })
    .filter(Boolean);
}

/**
 * Load and filter screens from .stitch/screens.json.
 * Returns only screens with real routes (starting with /).
 */
export function loadScreens(projectDir) {
  const screensPath = join(projectDir, '.stitch/screens.json');
  if (!existsSync(screensPath)) {
    throw new Error('Missing .stitch/screens.json');
  }
  const raw = JSON.parse(readFileSync(screensPath, 'utf-8'));
  const screens = (Array.isArray(raw) ? raw : raw.screens)
    .filter(s => s.route.startsWith('/'));

  if (screens.length === 0) {
    throw new Error('screens.json has no routed screens');
  }
  return screens;
}

/**
 * Extract route params from a route string.
 * "/novel/:id/chapter/:chapterId" => ["id", "chapterId"]
 */
export function extractParams(route) {
  return (route.match(/:(\w+)/g) || []).map(p => p.slice(1));
}
