/**
 * Semantic Emitter — CodeBuilder v2.
 *
 * Node-based code generation with automatic formatting.
 */

// Node types
export type {
  ExprNode,
  PropEntry,
  StmtNode,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  UndefinedLiteral,
  Identifier,
  RawExpr,
  CallExpr,
  ObjectExpr,
  ArrayExpr,
  ImportStmt,
  ConstStmt,
  FunctionStmt,
  ExportDefaultStmt,
  ReturnStmt,
  ExpressionStmt,
  LocalConstStmt,
  IfStmt,
  RawStmt,
  BlankLine,
  BannerComment,
  JsdocComment,
  DirectiveStmt,
} from './nodes.ts';

// Sub-builders
export {
  ExprHelper,
  ObjectBuilder,
  ArrayBuilder,
  ImportBuilder,
  ConstBuilder,
  ConstResult,
  FnBody,
} from './sub-builders.ts';

// Formatter
export { formatFile, DEFAULT_FORMAT } from './formatter.ts';
export type { FormatOptions } from './formatter.ts';

// Main builder
export { SemanticBuilder } from './semantic-builder.ts';
export type { SemanticFnOptions } from './semantic-builder.ts';
