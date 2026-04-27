// Style — provides a default material name + opts to descendants. Widgets
// that don't authorize a material of their own can fall back to the inherited
// Style for the role they care about.
//
// Roles are kept open-string so domains can pick their own (body, leaves,
// trim, …). Style of(ctx) returns the nearest ancestor.

import type { MaterialName, MaterialOpts } from '../../types.js';
import { InheritedWidget3D, type BuildContext, type Widget3D } from '../types.js';

const STYLE_TYPE_KEY = Symbol('Style');

export interface StyleEntry {
  name: MaterialName;
  opts?: MaterialOpts;
}

export class Style extends InheritedWidget3D {
  readonly entries: Readonly<Record<string, StyleEntry>>;

  constructor(opts: { entries: Record<string, StyleEntry>; child: Widget3D; key?: string }) {
    super({ child: opts.child, key: opts.key });
    this.entries = { ...opts.entries };
  }

  override get typeKey(): symbol {
    return STYLE_TYPE_KEY;
  }

  static of(ctx: BuildContext): Style | undefined {
    return ctx.dependOn<Style>(STYLE_TYPE_KEY);
  }

  /** Resolve a style entry by role with a fallback. */
  static entry(ctx: BuildContext, role: string, fallback: StyleEntry): StyleEntry {
    const s = Style.of(ctx);
    return s?.entries[role] ?? fallback;
  }
}
