/**
 * ReactBuilder — React/JSX helpers.
 *
 * Adds React-specific conveniences on top of TypeScriptBuilder:
 * `'use client'`/`'use server'` directives and JSX return blocks.
 *
 * This is the default builder exported as `CodeBuilder` for
 * backward compatibility.
 */

import { TypeScriptBuilder } from './ts-builder.ts';

export class ReactBuilder extends TypeScriptBuilder {

  /** Register a `'use client'` directive (emitted before imports). */
  useClient(): this {
    return this.directive("'use client';");
  }

  /** Register a `'use server'` directive (emitted before imports). */
  useServer(): this {
    return this.directive("'use server';");
  }

  /** Emit a `return ( ... );` block — the standard React JSX return pattern. */
  returnJsx(body: (b: this) => void): this {
    this.line('return (');
    this.indent();
    body(this);
    this.dedent();
    this.line(');');
    return this;
  }
}
