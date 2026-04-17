/**
 * Sub-builders for the Semantic Emitter.
 *
 * These small builder classes construct typed node trees.
 * Each provides expression factory methods (str, num, bool, etc.)
 * and domain-specific helpers for objects, arrays, function bodies, etc.
 */

import type {
  ExprNode, PropEntry, StmtNode,
  ObjectExpr, ArrayExpr,
} from './nodes.ts';

// ── Identifier validation ────────────────────────────────────────────

const IDENT_RE = /^[$_a-zA-Z][$_a-zA-Z0-9]*$/;

function validateIdentifier(name: string): string {
  if (!IDENT_RE.test(name)) {
    throw new Error(`Invalid identifier: "${name}"`);
  }
  return name;
}

// ── ExprHelper ───────────────────────────────────────────────────────

/**
 * Base mixin providing expression factory methods.
 * All sub-builders extend this so they can create ExprNode values inline.
 */
export class ExprHelper {
  /** String literal with automatic escaping at render time. */
  str(value: string): ExprNode { return { kind: 'string', value }; }

  /** Numeric literal. */
  num(value: number): ExprNode { return { kind: 'number', value }; }

  /** Boolean literal. */
  bool(value: boolean): ExprNode { return { kind: 'boolean', value }; }

  /** null literal. */
  null(): ExprNode { return { kind: 'null' }; }

  /** undefined literal. */
  undefined(): ExprNode { return { kind: 'undefined' }; }

  /** Identifier reference (validated). */
  id(name: string): ExprNode { return { kind: 'identifier', name: validateIdentifier(name) }; }

  /** Raw expression (escape hatch — no validation). */
  raw(code: string): ExprNode { return { kind: 'raw', code }; }

  /** Function call expression. */
  call(callee: string, ...args: ExprNode[]): ExprNode {
    return { kind: 'call', callee, args };
  }

  /** Object literal via builder callback. */
  object(build: (o: ObjectBuilder) => void): ExprNode {
    const ob = new ObjectBuilder();
    build(ob);
    return ob._build();
  }

  /** Array literal via builder callback. */
  array(build: (a: ArrayBuilder) => void): ExprNode {
    const ab = new ArrayBuilder();
    build(ab);
    return ab._build();
  }
}

// ── ObjectBuilder ────────────────────────────────────────────────────

/**
 * Builds an ObjectExpr node.
 * Provides prop(), propObj(), propArr(), when(), spread().
 */
export class ObjectBuilder extends ExprHelper {
  private _props: PropEntry[] = [];

  /** Add a property with an expression value. */
  prop(key: string, value: ExprNode): this {
    this._props.push({ key, value });
    return this;
  }

  /** Add a property whose value is an object literal. */
  propObj(key: string, build: (o: ObjectBuilder) => void): this {
    return this.prop(key, this.object(build));
  }

  /** Add a property whose value is an array literal. */
  propArr(key: string, build: (a: ArrayBuilder) => void): this {
    return this.prop(key, this.array(build));
  }

  /** Add a computed property: [expr]: value */
  computed(key: string, value: ExprNode): this {
    this._props.push({ key, value, computed: true });
    return this;
  }

  /** Conditionally add properties. */
  when(condition: unknown, fn: (o: this) => void): this {
    if (condition) fn(this);
    return this;
  }

  /** @internal Build the ObjectExpr node. */
  _build(): ObjectExpr {
    return { kind: 'object', props: [...this._props] };
  }
}

// ── ArrayBuilder ─────────────────────────────────────────────────────

/**
 * Builds an ArrayExpr node.
 * Provides item(), itemObj(), when().
 */
export class ArrayBuilder extends ExprHelper {
  private _items: ExprNode[] = [];

  /** Add an expression item. */
  item(expr: ExprNode): this {
    this._items.push(expr);
    return this;
  }

  /** Add an object literal item. */
  itemObj(build: (o: ObjectBuilder) => void): this {
    return this.item(this.object(build));
  }

  /** Conditionally add items. */
  when(condition: unknown, fn: (a: this) => void): this {
    if (condition) fn(this);
    return this;
  }

  /** Iterate and add items. */
  each<T>(items: T[], fn: (a: this, item: T, index: number) => void): this {
    items.forEach((item, i) => fn(this, item, i));
    return this;
  }

  /** @internal Build the ArrayExpr node. */
  _build(): ArrayExpr {
    return { kind: 'array', items: [...this._items] };
  }
}

// ── ImportBuilder ────────────────────────────────────────────────────

/**
 * Collects named, type-only, and default import specifiers
 * for a single importFrom() call.
 */
export class ImportBuilder {
  _defaultName?: string;
  _named: string[] = [];
  _types: string[] = [];

  /** Import a named export: import { Name } from '...' */
  named(...names: string[]): this {
    this._named.push(...names);
    return this;
  }

  /** Import a type-only export: import type { Name } from '...' */
  typeNamed(...names: string[]): this {
    this._types.push(...names);
    return this;
  }

  /** Import the default export: import Name from '...' */
  default(name: string): this {
    this._defaultName = name;
    return this;
  }
}

// ── ConstBuilder ─────────────────────────────────────────────────────

/**
 * Fluent builder for const declarations.
 * Created by SemanticBuilder.const(), committed by .value() or .assign().
 */
export class ConstBuilder extends ExprHelper {
  private _name: string;
  private _type?: string;
  private _exported = false;
  /** Callback to commit the node to the parent. */
  private _commit: (node: StmtNode) => void;

  constructor(name: string, commit: (node: StmtNode) => void) {
    super();
    this._name = name;
    this._commit = commit;
  }

  /** Add a type annotation. */
  typed(type: string): this {
    this._type = type;
    return this;
  }

  /** Mark as exported: export const ... */
  exported(): this {
    this._exported = true;
    return this;
  }

  /**
   * Set the value via a builder callback and commit the const statement.
   * Returns a ConstResult for optional chaining (.exportDefault()).
   */
  value(build: (v: this) => ExprNode): ConstResult {
    const expr = build(this);
    return this._finalize(expr);
  }

  /**
   * Set the value directly and commit the const statement.
   * Returns a ConstResult for optional chaining (.exportDefault()).
   */
  assign(expr: ExprNode): ConstResult {
    return this._finalize(expr);
  }

  private _finalize(expr: ExprNode): ConstResult {
    this._commit({
      kind: 'const',
      name: this._name,
      type: this._type,
      value: expr,
      exported: this._exported,
    });
    return new ConstResult(this._name, this._commit);
  }
}

/**
 * Result of committing a const — allows chaining .exportDefault().
 */
export class ConstResult {
  private _name: string;
  private _commit: (node: StmtNode) => void;

  constructor(name: string, commit: (node: StmtNode) => void) {
    this._name = name;
    this._commit = commit;
  }

  /** Emit export default <name>; after the const. */
  exportDefault(): void {
    this._commit({
      kind: 'exportDefault',
      value: { kind: 'identifier', name: this._name },
    });
  }
}

// ── FnBody ───────────────────────────────────────────────────────────

/**
 * Builds the body of a function as a list of StmtNodes.
 * Provides return(), declareConst(), statement(), when(), if().
 */
export class FnBody extends ExprHelper {
  private _stmts: StmtNode[] = [];

  /** Return an expression. */
  return(expr: ExprNode): this {
    this._stmts.push({ kind: 'return', value: expr });
    return this;
  }

  /** Declare a local const. */
  declareConst(name: string, value: ExprNode, opts?: { type?: string }): this {
    this._stmts.push({
      kind: 'localConst',
      name,
      type: opts?.type,
      value,
    });
    return this;
  }

  /** Expression statement (e.g., function call). */
  statement(expr: ExprNode): this {
    this._stmts.push({ kind: 'expression', expr });
    return this;
  }

  /** Raw statement (escape hatch). */
  rawStatement(code: string): this {
    this._stmts.push({ kind: 'rawStmt', code });
    return this;
  }

  /** Conditional block. */
  when(condition: unknown, fn: (b: this) => void): this {
    if (condition) fn(this);
    return this;
  }

  /** If/else statement. */
  if(condition: string, body: (b: FnBody) => void, elseBody?: (b: FnBody) => void): this {
    const ifBody = new FnBody();
    body(ifBody);
    let elseBranch: StmtNode[] | undefined;
    if (elseBody) {
      const eb = new FnBody();
      elseBody(eb);
      elseBranch = eb._build();
    }
    this._stmts.push({
      kind: 'if',
      condition,
      body: ifBody._build(),
      elseBody: elseBranch,
    });
    return this;
  }

  /** @internal Build the statement list. */
  _build(): StmtNode[] {
    return [...this._stmts];
  }
}
