/**
 * ModuleBuilder — ES module-aware builder.
 *
 * Adds file-level concerns on top of CoreBuilder:
 * banner comments, directives, an auto-deduping import registry,
 * and npm dependency tracking.
 *
 * `toString()` emits: banner → directives → imports → body.
 */

import { CoreBuilder } from './core-builder.ts';
import { ImportRegistry } from './import-registry.ts';
import type { ImportSpec } from './types.ts';

export class ModuleBuilder extends CoreBuilder {
  private _banner?: string;
  private _directives: string[] = [];
  protected _registry = new ImportRegistry();

  // ── Banner ────────────────────────────────────────────────────

  /** Set a banner comment that appears at the very top of the file. */
  banner(text: string): this {
    this._banner = text;
    return this;
  }

  // ── Directives ────────────────────────────────────────────────

  /** Register a file-level directive (emitted before imports, deduplicated). */
  directive(value: string): this {
    if (!this._directives.includes(value)) {
      this._directives.push(value);
    }
    return this;
  }

  // ── Import registry ───────────────────────────────────────────

  /** Register an import — collected, deduped, and emitted at build time. */
  addImport(from: string, spec?: ImportSpec): this {
    this._registry.add(from, spec);
    return this;
  }

  /** Register an npm dependency for downstream package.json generation. */
  addDependency(name: string, version = '*'): this {
    this._registry.addDependency(name, version);
    return this;
  }

  /** Get registered dependencies as a Map<packageName, version>. */
  getDependencies(): Map<string, string> {
    return this._registry.getDependencies();
  }

  // ── Legacy import helpers (immediate emission) ────────────────

  /** `import { a, b } from 'module';` — emits immediately in body. */
  importNamed(names: string | string[], from: string): this {
    const n = Array.isArray(names) ? names.join(', ') : names;
    return this.line(`import { ${n} } from '${from}';`);
  }

  /** `import name from 'module';` — emits immediately in body. */
  importDefault(name: string, from: string): this {
    return this.line(`import ${name} from '${from}';`);
  }

  /** `import type { a, b } from 'module';` — emits immediately in body. */
  importType(names: string | string[], from: string): this {
    const n = Array.isArray(names) ? names.join(', ') : names;
    return this.line(`import type { ${n} } from '${from}';`);
  }

  /** `import 'module';` — emits immediately in body. */
  importSideEffect(from: string): this {
    return this.line(`import '${from}';`);
  }

  // ── Output ────────────────────────────────────────────────────

  override toString(): string {
    const header: string[] = [];

    if (this._banner) {
      header.push(`// ${this._banner}`);
      header.push('');
    }

    if (this._directives.length > 0) {
      header.push(...this._directives);
      header.push('');
    }

    const importLines = this._registry.buildLines();
    if (importLines.length > 0) {
      header.push(...importLines);
      header.push('');
    }

    if (header.length === 0) return super.toString();

    header.push(...this._lines);
    const result = header.join('\n');
    return result.endsWith('\n') ? result : result + '\n';
  }
}
