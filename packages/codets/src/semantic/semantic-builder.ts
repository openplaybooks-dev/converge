/**
 * SemanticBuilder — the main entry point for CodeBuilder v2.
 *
 * Stores a list of typed statement nodes and renders them via the Formatter.
 * Provides a fluent API for building imports, const declarations, functions,
 * exports, and escape hatches — all without manual commas, braces, or quotes.
 *
 * @example
 * ```ts
 * const b = new SemanticBuilder();
 * b.importFrom('next', i => i.typeNamed('NextConfig'));
 * b.const('nextConfig')
 *   .typed('NextConfig')
 *   .value(v => v.object(o => {
 *     o.prop('output', o.str('export'));
 *   }))
 *   .exportDefault();
 * console.log(b.toString());
 * ```
 */

import type { StmtNode, ImportStmt, ExprNode } from './nodes.ts';
import {
  ExprHelper,
  ImportBuilder,
  ConstBuilder,
  FnBody,
} from './sub-builders.ts';
import { formatFile, DEFAULT_FORMAT } from './formatter.ts';
import type { FormatOptions } from './formatter.ts';

export interface SemanticFnOptions {
  exported?: boolean;
  default?: boolean;
  async?: boolean;
  returnType?: string;
  args?: string[];
}

export class SemanticBuilder extends ExprHelper {
  private _stmts: StmtNode[] = [];
  private _imports: ImportStmt[] = [];
  private _formatOptions: FormatOptions;

  constructor(opts?: Partial<FormatOptions>) {
    super();
    this._formatOptions = { ...DEFAULT_FORMAT, ...opts };
  }

  // ── Format options ───────────────────────────────────────────────

  /** Override format options. */
  format(opts: Partial<FormatOptions>): this {
    Object.assign(this._formatOptions, opts);
    return this;
  }

  // ── Imports ──────────────────────────────────────────────────────

  /**
   * Add an import statement.
   * Without a callback, creates a side-effect import: `import 'module';`
   * With a callback, collects named/type/default specifiers.
   * Multiple calls with the same module are merged.
   */
  importFrom(module: string, build?: (i: ImportBuilder) => void): this {
    if (!build) {
      // Side-effect import
      this._mergeImport(module, { sideEffect: true });
      return this;
    }

    const ib = new ImportBuilder();
    build(ib);
    this._mergeImport(module, {
      defaultName: ib._defaultName,
      named: ib._named,
      types: ib._types,
    });
    return this;
  }

  private _mergeImport(
    from: string,
    spec: {
      defaultName?: string;
      named?: string[];
      types?: string[];
      sideEffect?: boolean;
    },
  ): void {
    const existing = this._imports.find(i => i.from === from);

    if (existing) {
      if (spec.defaultName) existing.defaultName = spec.defaultName;
      if (spec.named) existing.named.push(...spec.named);
      if (spec.types) existing.types.push(...spec.types);
      // Side-effect is suppressed when value specifiers exist
      if (spec.sideEffect && !existing.defaultName && existing.named.length === 0 && existing.types.length === 0) {
        existing.sideEffect = true;
      } else {
        existing.sideEffect = false;
      }
    } else {
      const hasParts = !!spec.defaultName || (spec.named?.length ?? 0) > 0 || (spec.types?.length ?? 0) > 0;
      this._imports.push({
        kind: 'import',
        from,
        defaultName: spec.defaultName,
        named: [...(spec.named ?? [])],
        types: [...(spec.types ?? [])],
        sideEffect: !hasParts && !!spec.sideEffect,
      });
    }
  }

  // ── Const declarations ───────────────────────────────────────────

  /**
   * Start a fluent const declaration.
   * Chain with .typed(), .exported(), then .value() or .assign().
   */
  const(name: string): ConstBuilder {
    return new ConstBuilder(name, (node) => this._addStmt(node));
  }

  /**
   * Direct const declaration (non-fluent).
   */
  declareConst(
    name: string,
    value: ExprNode,
    opts?: { type?: string; exported?: boolean },
  ): this {
    this._addStmt({
      kind: 'const',
      name,
      type: opts?.type,
      value,
      exported: opts?.exported ?? false,
    });
    return this;
  }

  // ── Function declarations ────────────────────────────────────────

  /**
   * Declare a function with a semantic body builder.
   * Params can be a raw string or will be joined from opts.args.
   */
  fn(
    name: string,
    opts: SemanticFnOptions | string,
    body: (b: FnBody) => void,
  ): this {
    const fb = new FnBody();
    body(fb);

    let params: string;
    let fnOpts: SemanticFnOptions;

    if (typeof opts === 'string') {
      params = opts;
      fnOpts = {};
    } else {
      params = opts.args?.join(', ') ?? '';
      fnOpts = opts;
    }

    this._addStmt({
      kind: 'function',
      name,
      params,
      returnType: fnOpts.returnType,
      body: fb._build(),
      exported: fnOpts.exported ?? false,
      isDefault: fnOpts.default ?? false,
      isAsync: fnOpts.async ?? false,
    });
    return this;
  }

  // ── Exports ──────────────────────────────────────────────────────

  /** Export default an identifier or expression. */
  exportDefault(nameOrExpr: string | ExprNode): this {
    const value: ExprNode = typeof nameOrExpr === 'string'
      ? { kind: 'identifier', name: nameOrExpr }
      : nameOrExpr;
    this._addStmt({ kind: 'exportDefault', value });
    return this;
  }

  // ── Comments and directives ──────────────────────────────────────

  /** Banner comment at the top of the file. */
  banner(text: string | string[]): this {
    const lines = Array.isArray(text) ? text : [text];
    this._addStmt({ kind: 'banner', lines });
    return this;
  }

  /** JSDoc comment. */
  jsdoc(text: string | string[]): this {
    const lines = Array.isArray(text) ? text : [text];
    this._addStmt({ kind: 'jsdoc', lines });
    return this;
  }

  /** File-level directive (e.g., 'use strict'). */
  directive(value: string): this {
    this._addStmt({ kind: 'directive', value });
    return this;
  }

  // ── Escape hatches ───────────────────────────────────────────────

  /** Raw line of code (no semantic processing). */
  rawLine(code: string): this {
    this._addStmt({ kind: 'rawStmt', code });
    return this;
  }

  /** Blank line for spacing. */
  blank(): this {
    this._addStmt({ kind: 'blank' });
    return this;
  }

  // ── Output ───────────────────────────────────────────────────────

  /** Render all nodes to a formatted source string. */
  toString(opts?: Partial<FormatOptions>): string {
    const finalOpts = opts
      ? { ...this._formatOptions, ...opts }
      : this._formatOptions;

    // Combine imports + body statements for rendering
    const allStmts: StmtNode[] = [...this._imports, ...this._stmts];
    return formatFile(allStmts, finalOpts);
  }

  // ── Internals ────────────────────────────────────────────────────

  /** @internal Add a statement node. */
  _addStmt(node: StmtNode): void {
    this._stmts.push(node);
  }
}
