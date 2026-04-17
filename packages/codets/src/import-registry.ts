import type { ImportSpec } from './types.ts';

interface ImportEntry {
  default?: string;
  named: Set<string>;
  types: Set<string>;
  sideEffect: boolean;
}

/**
 * Collects, deduplicates, and groups ES import statements.
 *
 * Grouping order (separated by blank lines):
 *   1. External value imports (sorted)
 *   2. External type-only imports (sorted)
 *   3. Local value imports (`./`, `../`, `@/`, sorted)
 *   4. Local type-only imports (sorted)
 *   5. Side-effect imports (sorted)
 */
export class ImportRegistry {
  private _imports = new Map<string, ImportEntry>();
  private _deps = new Map<string, string>();

  /**
   * Register an import — collected and emitted at build time.
   *
   * Imports are auto-deduplicated: calling `add('react', { named: ['useState'] })`
   * twice merges rather than duplicates.
   *
   * Omitting `spec` registers a side-effect import (`import 'module';`).
   */
  add(from: string, spec?: ImportSpec): void {
    let entry = this._imports.get(from);
    if (!entry) {
      entry = { named: new Set(), types: new Set(), sideEffect: false };
      this._imports.set(from, entry);
    }

    if (!spec) {
      entry.sideEffect = true;
      return;
    }

    if (spec.default) entry.default = spec.default;
    if (spec.named) {
      for (const n of spec.named) entry.named.add(n);
    }
    if (spec.types) {
      for (const t of spec.types) entry.types.add(t);
    }
  }

  /** Register an npm dependency for downstream package.json generation. */
  addDependency(name: string, version = '*'): void {
    this._deps.set(name, version);
  }

  /** Get registered dependencies as a Map<packageName, version>. */
  getDependencies(): Map<string, string> {
    return new Map(this._deps);
  }

  get hasImports(): boolean {
    return this._imports.size > 0;
  }

  /** Build grouped, sorted import lines ready for file output. */
  buildLines(): string[] {
    if (this._imports.size === 0) return [];

    const valueExternal: string[] = [];
    const typeExternal: string[] = [];
    const valueLocal: string[] = [];
    const typeLocal: string[] = [];
    const sideEffects: string[] = [];

    for (const [mod, entry] of this._imports) {
      const isLocal = mod.startsWith('.') || mod.startsWith('@/');

      const valueParts: string[] = [];
      if (entry.default) valueParts.push(entry.default);
      if (entry.named.size > 0) {
        valueParts.push(`{ ${[...entry.named].sort().join(', ')} }`);
      }

      if (valueParts.length > 0) {
        const line = `import ${valueParts.join(', ')} from '${mod}';`;
        (isLocal ? valueLocal : valueExternal).push(line);
      }

      if (entry.types.size > 0) {
        const line = `import type { ${[...entry.types].sort().join(', ')} } from '${mod}';`;
        (isLocal ? typeLocal : typeExternal).push(line);
      }

      if (entry.sideEffect && valueParts.length === 0 && entry.types.size === 0) {
        sideEffects.push(`import '${mod}';`);
      }
    }

    const groups = [
      valueExternal.sort(),
      typeExternal.sort(),
      valueLocal.sort(),
      typeLocal.sort(),
      sideEffects.sort(),
    ].filter(g => g.length > 0);

    const result: string[] = [];
    for (let i = 0; i < groups.length; i++) {
      if (i > 0) result.push('');
      result.push(...groups[i]);
    }

    return result;
  }
}
