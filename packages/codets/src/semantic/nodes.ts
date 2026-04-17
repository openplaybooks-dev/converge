/**
 * Semantic node types for CodeBuilder v2.
 *
 * Instead of storing raw strings, the semantic builder stores a tree of
 * small node objects that a Formatter renders into deterministic output.
 * This eliminates manual commas, braces, quotes, and indentation.
 */

// ── Expression nodes ─────────────────────────────────────────────────

export interface StringLiteral { kind: 'string'; value: string; }
export interface NumberLiteral { kind: 'number'; value: number; }
export interface BooleanLiteral { kind: 'boolean'; value: boolean; }
export interface NullLiteral { kind: 'null'; }
export interface UndefinedLiteral { kind: 'undefined'; }
export interface Identifier { kind: 'identifier'; name: string; }
export interface RawExpr { kind: 'raw'; code: string; }

export interface CallExpr {
  kind: 'call';
  callee: string;
  args: ExprNode[];
}

export interface ObjectExpr {
  kind: 'object';
  props: PropEntry[];
}

export interface ArrayExpr {
  kind: 'array';
  items: ExprNode[];
}

export type ExprNode =
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | NullLiteral
  | UndefinedLiteral
  | Identifier
  | RawExpr
  | CallExpr
  | ObjectExpr
  | ArrayExpr;

/** A single property in an ObjectExpr. */
export interface PropEntry {
  key: string;
  value: ExprNode;
  computed?: boolean;
}

// ── Statement nodes ──────────────────────────────────────────────────

export interface ImportStmt {
  kind: 'import';
  from: string;
  defaultName?: string;
  named: string[];
  types: string[];
  sideEffect: boolean;
}

export interface ConstStmt {
  kind: 'const';
  name: string;
  type?: string;
  value: ExprNode;
  exported: boolean;
}

export interface FunctionStmt {
  kind: 'function';
  name: string;
  params: string;
  returnType?: string;
  body: StmtNode[];
  exported: boolean;
  isDefault: boolean;
  isAsync: boolean;
}

export interface ExportDefaultStmt {
  kind: 'exportDefault';
  value: ExprNode;
}

export interface ReturnStmt {
  kind: 'return';
  value: ExprNode;
}

export interface ExpressionStmt {
  kind: 'expression';
  expr: ExprNode;
}

export interface LocalConstStmt {
  kind: 'localConst';
  name: string;
  type?: string;
  value: ExprNode;
}

export interface IfStmt {
  kind: 'if';
  condition: string;
  body: StmtNode[];
  elseBody?: StmtNode[];
}

export interface RawStmt {
  kind: 'rawStmt';
  code: string;
}

export interface BlankLine {
  kind: 'blank';
}

export interface BannerComment {
  kind: 'banner';
  lines: string[];
}

export interface JsdocComment {
  kind: 'jsdoc';
  lines: string[];
}

export interface DirectiveStmt {
  kind: 'directive';
  value: string;
}

export type StmtNode =
  | ImportStmt
  | ConstStmt
  | FunctionStmt
  | ExportDefaultStmt
  | ReturnStmt
  | ExpressionStmt
  | LocalConstStmt
  | IfStmt
  | RawStmt
  | BlankLine
  | BannerComment
  | JsdocComment
  | DirectiveStmt;
