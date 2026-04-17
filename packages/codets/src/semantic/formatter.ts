/**
 * Formatter — renders semantic nodes into deterministic source text.
 *
 * Central formatting policy: quotes, semicolons, trailing commas,
 * indentation, import grouping, and blank-line spacing are all
 * controlled by FormatOptions.
 */

import type {
  ExprNode, PropEntry, StmtNode,
  ImportStmt, CallExpr,
} from './nodes.ts';

// ── Format options ───────────────────────────────────────────────────

export interface FormatOptions {
  /** Indentation string per level. */
  indent: string;
  /** Quote style for string literals. */
  quote: 'single' | 'double';
  /** Append semicolons to statements. */
  semi: boolean;
  /** Trailing comma policy in objects, arrays, function params. */
  trailingComma: 'all' | 'none';
  /** When true, type-only imports use `import type { ... }` syntax. */
  importTypeStyle: 'inline' | 'importType';
  /** Sort imports by module name within each group. */
  sortImports: boolean;
}

export const DEFAULT_FORMAT: FormatOptions = {
  indent: '  ',
  quote: 'single',
  semi: true,
  trailingComma: 'all',
  importTypeStyle: 'importType',
  sortImports: true,
};

// ── String escaping ──────────────────────────────────────────────────

function escapeString(value: string, quoteChar: string): string {
  let result = '';
  for (const ch of value) {
    if (ch === quoteChar) result += `\\${quoteChar}`;
    else if (ch === '\\') result += '\\\\';
    else if (ch === '\n') result += '\\n';
    else if (ch === '\r') result += '\\r';
    else if (ch === '\t') result += '\\t';
    else if (ch === '\0') result += '\\0';
    else result += ch;
  }
  return result;
}

function quoteStr(value: string, opts: FormatOptions): string {
  const q = opts.quote === 'single' ? "'" : '"';
  return `${q}${escapeString(value, q)}${q}`;
}

// ── Expression rendering ─────────────────────────────────────────────

/**
 * Render an expression node to a string.
 * Multi-line expressions (objects, arrays, calls) include embedded newlines
 * with proper indentation. The first line is NOT indented — the caller
 * controls placement.
 */
export function renderExpr(expr: ExprNode, opts: FormatOptions, depth: number): string {
  switch (expr.kind) {
    case 'string': return quoteStr(expr.value, opts);
    case 'number': return String(expr.value);
    case 'boolean': return String(expr.value);
    case 'null': return 'null';
    case 'undefined': return 'undefined';
    case 'identifier': return expr.name;
    case 'raw': return expr.code;
    case 'call': return renderCall(expr, opts, depth);
    case 'object': return renderObject(expr.props, opts, depth);
    case 'array': return renderArray(expr.items, opts, depth);
  }
}

/**
 * Render a list of items between open/close delimiters.
 * Each item string may be multi-line (with embedded newlines).
 * Handles trailing commas based on FormatOptions.
 */
function renderList(
  items: string[],
  open: string,
  close: string,
  opts: FormatOptions,
  depth: number,
): string {
  if (items.length === 0) return `${open}${close}`;

  const pre = (d: number) => opts.indent.repeat(d);
  const lines: string[] = [open];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const needsComma = i < items.length - 1 || opts.trailingComma === 'all';
    const comma = needsComma ? ',' : '';

    if (item.includes('\n')) {
      const itemLines = item.split('\n');
      lines.push(`${pre(depth + 1)}${itemLines[0]}`);
      for (let j = 1; j < itemLines.length; j++) {
        lines.push(itemLines[j]);
      }
      // Append comma to the last sub-line of this item
      lines[lines.length - 1] += comma;
    } else {
      lines.push(`${pre(depth + 1)}${item}${comma}`);
    }
  }

  lines.push(`${pre(depth)}${close}`);
  return lines.join('\n');
}

function renderObject(props: PropEntry[], opts: FormatOptions, depth: number): string {
  if (props.length === 0) return '{}';

  const items = props.map(p => {
    const key = p.computed ? `[${p.key}]` : p.key;
    const val = renderExpr(p.value, opts, depth + 1);
    return `${key}: ${val}`;
  });

  return renderList(items, '{', '}', opts, depth);
}

function renderArray(items: ExprNode[], opts: FormatOptions, depth: number): string {
  if (items.length === 0) return '[]';
  const rendered = items.map(item => renderExpr(item, opts, depth + 1));
  return renderList(rendered, '[', ']', opts, depth);
}

function renderCall(expr: CallExpr, opts: FormatOptions, depth: number): string {
  if (expr.args.length === 0) return `${expr.callee}()`;

  const args = expr.args.map(a => renderExpr(a, opts, depth));
  const hasMultiLine = args.some(a => a.includes('\n'));
  const inlineStr = `${expr.callee}(${args.join(', ')})`;

  // Try inline if short and no multi-line args
  if (!hasMultiLine && inlineStr.length < 80) {
    return inlineStr;
  }

  // Single complex arg (object/array): inline with callee
  if (args.length === 1 && hasMultiLine) {
    return `${expr.callee}(${args[0]})`;
  }

  // Multi-line args
  return renderList(args, `${expr.callee}(`, ')', opts, depth);
}

// ── Statement rendering ──────────────────────────────────────────────

/**
 * Render a single statement to an array of output lines.
 * Each line includes its indent prefix. Blank lines are empty strings.
 */
function renderStmt(stmt: StmtNode, opts: FormatOptions, depth: number): string[] {
  const pre = opts.indent.repeat(depth);
  const semi = opts.semi ? ';' : '';

  switch (stmt.kind) {
    case 'import':
      return renderImportStmt(stmt, opts);

    case 'const': {
      const prefix = stmt.exported ? 'export const' : 'const';
      const type = stmt.type ? `: ${stmt.type}` : '';
      const val = renderExpr(stmt.value, opts, depth);
      return splitRendered(`${pre}${prefix} ${stmt.name}${type} = ${val}${semi}`, pre);
    }

    case 'function': {
      const parts: string[] = [];
      if (stmt.exported) parts.push('export');
      if (stmt.isDefault) parts.push('default');
      if (stmt.isAsync) parts.push('async');
      parts.push('function');
      parts.push(stmt.name);
      const sig = `${parts.join(' ')}(${stmt.params})`;
      const retType = stmt.returnType ? `: ${stmt.returnType}` : '';

      const lines: string[] = [];
      lines.push(`${pre}${sig}${retType} {`);
      for (const s of stmt.body) {
        lines.push(...renderStmt(s, opts, depth + 1));
      }
      lines.push(`${pre}}`);
      return lines;
    }

    case 'exportDefault': {
      const val = renderExpr(stmt.value, opts, depth);
      return splitRendered(`${pre}export default ${val}${semi}`, pre);
    }

    case 'return': {
      const val = renderExpr(stmt.value, opts, depth);
      return splitRendered(`${pre}return ${val}${semi}`, pre);
    }

    case 'expression': {
      const val = renderExpr(stmt.expr, opts, depth);
      return splitRendered(`${pre}${val}${semi}`, pre);
    }

    case 'localConst': {
      const type = stmt.type ? `: ${stmt.type}` : '';
      const val = renderExpr(stmt.value, opts, depth);
      return splitRendered(`${pre}const ${stmt.name}${type} = ${val}${semi}`, pre);
    }

    case 'if': {
      const lines: string[] = [];
      lines.push(`${pre}if (${stmt.condition}) {`);
      for (const s of stmt.body) {
        lines.push(...renderStmt(s, opts, depth + 1));
      }
      if (stmt.elseBody && stmt.elseBody.length > 0) {
        lines.push(`${pre}} else {`);
        for (const s of stmt.elseBody) {
          lines.push(...renderStmt(s, opts, depth + 1));
        }
      }
      lines.push(`${pre}}`);
      return lines;
    }

    case 'rawStmt':
      return stmt.code.split('\n').map(line => `${pre}${line}`);

    case 'blank':
      return [''];

    case 'banner':
      return stmt.lines.map(line => `// ${line}`);

    case 'jsdoc': {
      if (stmt.lines.length === 1) {
        return [`${pre}/** ${stmt.lines[0]} */`];
      }
      const lines: string[] = [`${pre}/**`];
      for (const line of stmt.lines) {
        lines.push(`${pre} * ${line}`);
      }
      lines.push(`${pre} */`);
      return lines;
    }

    case 'directive':
      return [`${stmt.value}${semi}`];
  }
}

/**
 * When a rendered expression contains newlines, we need to split
 * the combined "prefix + expr + suffix" string into proper lines.
 * The first line keeps its original prefix; subsequent lines from
 * the expression are already indented by renderExpr.
 */
function splitRendered(combined: string, _prefix: string): string[] {
  if (!combined.includes('\n')) return [combined];
  return combined.split('\n');
}

// ── Import rendering ─────────────────────────────────────────────────

function renderImportStmt(stmt: ImportStmt, opts: FormatOptions): string[] {
  const q = opts.quote === 'single' ? "'" : '"';
  const semi = opts.semi ? ';' : '';
  const from = `${q}${stmt.from}${q}`;

  // Side-effect import
  if (stmt.sideEffect) {
    return [`import ${from}${semi}`];
  }

  // Type-only import (no value specifiers)
  const hasValues = !!stmt.defaultName || stmt.named.length > 0;
  if (!hasValues && stmt.types.length > 0) {
    const types = [...new Set(stmt.types)].sort();
    return [`import type { ${types.join(', ')} } from ${from}${semi}`];
  }

  const parts: string[] = [];

  if (stmt.defaultName) {
    parts.push(stmt.defaultName);
  }

  const namedSpecifiers: string[] = [];

  // Named value imports
  for (const n of [...new Set(stmt.named)].sort()) {
    namedSpecifiers.push(n);
  }

  // Inline type imports (import { type Foo, bar } style)
  if (opts.importTypeStyle === 'inline' && stmt.types.length > 0) {
    for (const t of [...new Set(stmt.types)].sort()) {
      namedSpecifiers.push(`type ${t}`);
    }
  }

  if (namedSpecifiers.length > 0) {
    parts.push(`{ ${namedSpecifiers.join(', ')} }`);
  }

  const result = [`import ${parts.join(', ')} from ${from}${semi}`];

  // Separate type-only import line when using importType style
  if (opts.importTypeStyle === 'importType' && stmt.types.length > 0 && hasValues) {
    const types = [...new Set(stmt.types)].sort();
    result.push(`import type { ${types.join(', ')} } from ${from}${semi}`);
  }

  return result;
}

// ── Import grouping ──────────────────────────────────────────────────

function isLocalImport(from: string): boolean {
  return from.startsWith('.') || from.startsWith('@/');
}

/**
 * Group and sort import statements.
 * Groups: external value → external type → local value → local type → side-effect.
 */
function groupImports(imports: ImportStmt[], opts: FormatOptions): ImportStmt[][] {
  const externalValue: ImportStmt[] = [];
  const externalType: ImportStmt[] = [];
  const localValue: ImportStmt[] = [];
  const localType: ImportStmt[] = [];
  const sideEffect: ImportStmt[] = [];

  for (const imp of imports) {
    const local = isLocalImport(imp.from);
    if (imp.sideEffect) {
      sideEffect.push(imp);
    } else if (!imp.defaultName && imp.named.length === 0) {
      // Type-only import
      if (local) localType.push(imp);
      else externalType.push(imp);
    } else {
      if (local) localValue.push(imp);
      else externalValue.push(imp);
    }
  }

  const sortFn = opts.sortImports
    ? (a: ImportStmt, b: ImportStmt) => a.from.localeCompare(b.from)
    : undefined;

  const groups = [externalValue, externalType, localValue, localType, sideEffect];
  if (sortFn) {
    for (const g of groups) g.sort(sortFn);
  }

  return groups.filter(g => g.length > 0);
}

// ── Top-level file rendering ─────────────────────────────────────────

/**
 * Render a complete file from a list of statement nodes.
 * Handles import grouping, automatic blank-line spacing between
 * top-level declarations, and trailing newline.
 */
export function formatFile(stmts: StmtNode[], opts: FormatOptions = DEFAULT_FORMAT): string {
  const lines: string[] = [];

  // Separate directives, banner, imports, and body statements
  const directives: StmtNode[] = [];
  const banners: StmtNode[] = [];
  const imports: ImportStmt[] = [];
  const body: StmtNode[] = [];

  for (const stmt of stmts) {
    switch (stmt.kind) {
      case 'directive': directives.push(stmt); break;
      case 'banner': banners.push(stmt); break;
      case 'import': imports.push(stmt); break;
      default: body.push(stmt); break;
    }
  }

  // 1. Banner comments
  for (const stmt of banners) {
    lines.push(...renderStmt(stmt, opts, 0));
  }
  if (banners.length > 0 && (directives.length > 0 || imports.length > 0 || body.length > 0)) {
    lines.push('');
  }

  // 2. Directives
  for (const stmt of directives) {
    lines.push(...renderStmt(stmt, opts, 0));
  }
  if (directives.length > 0 && (imports.length > 0 || body.length > 0)) {
    lines.push('');
  }

  // 3. Imports (grouped with blank lines between groups)
  const importGroups = groupImports(imports, opts);
  for (let gi = 0; gi < importGroups.length; gi++) {
    for (const imp of importGroups[gi]) {
      lines.push(...renderImportStmt(imp, opts));
    }
    if (gi < importGroups.length - 1) {
      lines.push('');
    }
  }
  if (importGroups.length > 0 && body.length > 0) {
    lines.push('');
  }

  // 4. Body statements (auto blank lines between top-level declarations)
  let prevKind: string | undefined;
  for (const stmt of body) {
    // Add blank line between different declaration types
    if (prevKind && stmt.kind !== 'blank') {
      const needsBlank =
        prevKind !== 'blank' && (
          stmt.kind === 'function' ||
          stmt.kind === 'const' ||
          stmt.kind === 'exportDefault' ||
          stmt.kind === 'jsdoc' ||
          prevKind === 'function'
        );
      if (needsBlank) {
        lines.push('');
      }
    }
    lines.push(...renderStmt(stmt, opts, 0));
    prevKind = stmt.kind;
  }

  // Ensure trailing newline
  const result = lines.join('\n');
  return result.endsWith('\n') ? result : result + '\n';
}
