// Seed — provides a deterministic random seed to descendants. Useful for
// crowd / forest authoring where each child should produce a reproducible
// variant: the parent does
//   range(20).map(i => new Seed({ value: 1000 + i, child: new Pine(...) }))
// and Pine's build reads Seed.of(ctx) to drive its deformations.

import { InheritedWidget3D, type BuildContext, type Widget3D } from '../types.js';

const SEED_TYPE_KEY = Symbol('Seed');

export class Seed extends InheritedWidget3D {
  readonly value: number;

  constructor(opts: { value: number; child: Widget3D; key?: string }) {
    super({ child: opts.child, key: opts.key });
    this.value = opts.value;
  }

  override get typeKey(): symbol {
    return SEED_TYPE_KEY;
  }

  static of(ctx: BuildContext): Seed | undefined {
    return ctx.dependOn<Seed>(SEED_TYPE_KEY);
  }

  /** Read the seed with a fallback. */
  static value(ctx: BuildContext, fallback: number): number {
    return Seed.of(ctx)?.value ?? fallback;
  }
}
