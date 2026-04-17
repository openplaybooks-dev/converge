/**
 * TypeScriptBuilder — TypeScript declaration helpers.
 *
 * Adds semantic blocks for TypeScript constructs on top of ModuleBuilder:
 * function declarations, arrow functions, interfaces, const objects,
 * and config-call patterns — all with export/async/type-annotation support.
 */

import { ModuleBuilder } from './module-builder.ts';
import type { FnOptions } from './types.ts';

export class TypeScriptBuilder extends ModuleBuilder {

  // ── Declarations ──────────────────────────────────────────────

  /** Emit a function declaration. */
  fn(
    name: string,
    params: string,
    body: (b: this) => void,
    opts?: FnOptions,
  ): this {
    const parts: string[] = [];
    if (opts?.exported) parts.push('export');
    if (opts?.default) parts.push('default');
    if (opts?.async) parts.push('async');
    parts.push('function');
    parts.push(name);

    const returnType = opts?.returnType ? `: ${opts.returnType} ` : ' ';
    const opener = `${parts.join(' ')}(${params})${returnType}{`;
    return this.block(opener, '}', body);
  }

  /** Emit a const arrow function. */
  arrow(
    name: string,
    params: string,
    body: (b: this) => void,
    opts?: { exported?: boolean; async?: boolean; type?: string },
  ): this {
    const prefix = opts?.exported ? 'export ' : '';
    const asyncMod = opts?.async ? 'async ' : '';
    const typeAnn = opts?.type ? `: ${opts.type}` : '';
    const opener = `${prefix}const ${name}${typeAnn} = ${asyncMod}(${params}) => {`;
    return this.block(opener, '};', body);
  }

  /** Emit an interface declaration. */
  iface(name: string, body: (b: this) => void, exported = true): this {
    const prefix = exported ? 'export ' : '';
    return this.block(`${prefix}interface ${name} {`, '}', body);
  }

  /** Emit a type alias declaration. */
  typeAlias(name: string, value: string, exported = true): this {
    const prefix = exported ? 'export ' : '';
    return this.line(`${prefix}type ${name} = ${value};`);
  }

  /** Emit an enum declaration. */
  enumDecl(name: string, body: (b: this) => void, exported = true): this {
    const prefix = exported ? 'export ' : '';
    return this.block(`${prefix}enum ${name} {`, '}', body);
  }

  // ── Const patterns ────────────────────────────────────────────

  /** Emit a const object literal. */
  constObject(
    name: string,
    body: (b: this) => void,
    opts?: { type?: string; exported?: boolean },
  ): this {
    const prefix = opts?.exported ? 'export ' : '';
    const typeAnn = opts?.type ? `: ${opts.type}` : '';
    return this.block(`${prefix}const ${name}${typeAnn} = {`, '};', body);
  }

  /** Emit a const array literal. */
  constArray(
    name: string,
    body: (b: this) => void,
    opts?: { type?: string; exported?: boolean },
  ): this {
    const prefix = opts?.exported ? 'export ' : '';
    const typeAnn = opts?.type ? `: ${opts.type}` : '';
    return this.block(`${prefix}const ${name}${typeAnn} = [`, '];', body);
  }

  /** Emit a const with a function call containing an object argument. */
  constCall(
    name: string,
    fn: string,
    body: (b: this) => void,
    opts?: { exported?: boolean },
  ): this {
    const prefix = opts?.exported ? 'export ' : '';
    return this.block(`${prefix}const ${name} = ${fn}({`, '});', body);
  }
}
