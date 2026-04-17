/**
 * codegen — layered, extensible source code emitter.
 *
 * Inheritance chain (extend at any level):
 *
 *   CoreBuilder          → language-agnostic text emission
 *     └─ ModuleBuilder   → ES imports, directives, banner, deps
 *          └─ TypeScriptBuilder → fn, arrow, iface, const patterns
 *               └─ ReactBuilder → useClient, useServer, returnJsx
 *                    = CodeBuilder (backward-compat alias)
 *
 *   ProjectBuilder<B>    → virtual file tree + disk flush (pairs with any builder)
 */

// ── Builder layers ──────────────────────────────────────────────
export { CoreBuilder } from './core-builder.ts';
export { ModuleBuilder } from './module-builder.ts';
export { TypeScriptBuilder } from './ts-builder.ts';
export { ReactBuilder } from './react-builder.ts';

// ── Backward-compat alias ───────────────────────────────────────
export { CodeBuilder } from './builder.ts';

// ── Project management ──────────────────────────────────────────
export { ProjectBuilder } from './project-builder.ts';
export type { FlushOptions, FlushResult } from './project-builder.ts';

// ── Supporting classes ──────────────────────────────────────────
export { ImportRegistry } from './import-registry.ts';
export { MdBuilder } from './md-builder.ts';

// ── Semantic Emitter (v2) ──────────────────────────────────────
export { SemanticBuilder } from './semantic/index.ts';
export { ExprHelper, ObjectBuilder, ArrayBuilder, FnBody } from './semantic/index.ts';
export { formatFile, DEFAULT_FORMAT } from './semantic/index.ts';
export type { FormatOptions, ExprNode, StmtNode } from './semantic/index.ts';

// ── Types ───────────────────────────────────────────────────────
export type { ImportSpec, FnOptions } from './types.ts';
