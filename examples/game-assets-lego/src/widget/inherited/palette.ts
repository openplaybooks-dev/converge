// Palette — provides per-role colors to descendants. Roles are loose strings
// (skin, shirt, pants, hair, bark, leaves, …) so widgets can opt into whatever
// vocabulary fits. Colors can be palette names or numeric hex.
//
// Reading: Palette.of(ctx) returns the nearest ancestor Palette. Widgets that
// want to honor a palette typically:
//   const skin = Palette.color(ctx, 'skin', /* fallback */ 'brick');
//
// Authors override at any subtree:
//   new Palette({ colors: { shirt: 'pineGreen' }, child: <hero> })

import type { ColorInput } from '../../style.js';
import { InheritedWidget3D, type BuildContext, type Widget3D } from '../types.js';

const PALETTE_TYPE_KEY = Symbol('Palette');

export class Palette extends InheritedWidget3D {
  readonly colors: Readonly<Record<string, ColorInput>>;

  constructor(opts: { colors: Record<string, ColorInput>; child: Widget3D; key?: string }) {
    super({ child: opts.child, key: opts.key });
    this.colors = { ...opts.colors };
  }

  override get typeKey(): symbol {
    return PALETTE_TYPE_KEY;
  }

  /** Find the nearest Palette ancestor. */
  static of(ctx: BuildContext): Palette | undefined {
    return ctx.dependOn<Palette>(PALETTE_TYPE_KEY);
  }

  /**
   * Resolve a color role with an explicit fallback. The widget passes its own
   * authored prop (if present) as the fallback so explicit props always win
   * over inherited values.
   */
  static color(ctx: BuildContext, role: string, fallback: ColorInput): ColorInput {
    const p = Palette.of(ctx);
    return p?.colors[role] ?? fallback;
  }
}
