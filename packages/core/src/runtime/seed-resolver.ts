/**
 * Seed Resolver
 *
 * Resolves seed definitions by name from the project's seed library.
 * Called by the runtime during compile and run to materialize seed
 * references from parent tasks' from_seed: declarations.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SeedMdDefinition } from "../config/seed-md-definition.ts";
import { parseSeedMd } from "../config/seed-md-definition.ts";

export interface SeedLibrary {
  /** Seeds indexed by name */
  byName: Map<string, SeedLibraryEntry>;
  /** Seeds indexed by file path */
  byPath: Map<string, SeedLibraryEntry>;
}

export interface SeedLibraryEntry {
  name: string;
  path: string;
  definition: SeedMdDefinition;
}

/**
 * Load all seed definitions from a seeds/ directory.
 * Scans for *.seed.md files and parses them.
 */
export function loadSeedLibrary(seedsDir: string): SeedLibrary {
  const byName = new Map<string, SeedLibraryEntry>();
  const byPath = new Map<string, SeedLibraryEntry>();

  if (!existsSync(seedsDir)) {
    return { byName, byPath };
  }

  try {
    const { readdirSync } = require("node:fs");
    const entries = readdirSync(seedsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".seed.md")) continue;
      const filePath = join(seedsDir, entry.name);
      try {
        const content = readFileSync(filePath, "utf-8");
        const def = parseSeedMd(content, filePath);
        const libEntry: SeedLibraryEntry = { name: def.name, path: filePath, definition: def };
        byName.set(def.name, libEntry);
        byPath.set(filePath, libEntry);
      } catch {
        // Skip unparseable seeds
      }
    }
  } catch {
    // Directory read failed — return empty
  }

  return { byName, byPath };
}

/**
 * Resolve a seed by name from a seed library.
 */
export function resolveSeed(
  name: string,
  library: SeedLibrary,
): SeedLibraryEntry | null {
  return library.byName.get(name) ?? null;
}
