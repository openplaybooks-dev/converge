// Cascading animation widgets — high-level animations that decompose into
// multiple micro-animations. Each is a StatelessWidget3D subclass whose
// build() returns a Stack3D of micro-leaves.
//
// Authors compose them like any other widget:
//
//   class Hero extends StatelessWidget3D {
//     build(ctx) {
//       return new Stack3D({ children: [
//         new Skeleton({ kind: 'humanoid' }),
//         ...body parts,
//         new Walk(),       // ← cascades into 4 micro bone-rotations
//         new Breath(),     // ← cascades into chest scale + head bob
//       ]});
//     }
//   }
//
// To customize a cascade: subclass it and override build().

import { StatelessWidget3D, type BuildContext, type Widget3D } from '../types.js';
import { Stack3D } from '../stack.js';
import { BoneSineRot, ClipPlay, EyeTracker, Blink } from './micro.js';

// ── Walk: 4-limb gait via sine rotations on shoulders and hips ────────────

export class Walk extends StatelessWidget3D {
  readonly period: number;
  readonly armSwing: number;
  readonly legSwing: number;

  constructor(opts: { period?: number; armSwing?: number; legSwing?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.period = opts.period ?? 0.8;
    this.armSwing = opts.armSwing ?? 0.6;
    this.legSwing = opts.legSwing ?? 0.5;
  }

  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'walk',
      children: [
        // Arms swing forward/back, opposite phases.
        new BoneSineRot({ target: 'arm_R', axis: 'x', amplitude: this.armSwing, period: this.period }),
        new BoneSineRot({ target: 'arm_L', axis: 'x', amplitude: this.armSwing, period: this.period, phase: Math.PI }),
        // Legs swing opposite to corresponding arm.
        new BoneSineRot({ target: 'leg_R', axis: 'x', amplitude: this.legSwing, period: this.period, phase: Math.PI }),
        new BoneSineRot({ target: 'leg_L', axis: 'x', amplitude: this.legSwing, period: this.period }),
      ],
    });
  }
}

// ── Breath: subtle chest sway + head bob (idle layer) ────────────────────

export class Breath extends StatelessWidget3D {
  readonly period: number;
  readonly amplitude: number;

  constructor(opts: { period?: number; amplitude?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.period = opts.period ?? 4;
    this.amplitude = opts.amplitude ?? 0.02;
  }

  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'breath',
      children: [
        new BoneSineRot({ target: 'chest', axis: 'x', amplitude: this.amplitude, period: this.period }),
        new BoneSineRot({ target: 'head',  axis: 'x', amplitude: this.amplitude * 0.5, period: this.period, phase: 0.3 }),
      ],
    });
  }
}

// ── Wave: arm-up keyframe + hand sway + head turn (uses 'wave' clip) ─────
// The 'wave' built-in clip already encodes all three bones, so this widget
// just plays it. Authors can subclass to layer additional micro-animations.

export class Wave extends StatelessWidget3D {
  readonly autoplay: boolean;

  constructor(opts: { autoplay?: boolean; key?: string } = {}) {
    super({ key: opts.key });
    this.autoplay = opts.autoplay ?? true;
  }

  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'wave',
      children: [
        new ClipPlay('wave', { autoplay: this.autoplay }),
      ],
    });
  }
}

// ── Idle: built-in 'idle' clip + a Breath layer on top ────────────────────

export class Idle extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'idle',
      children: [
        new ClipPlay('idle', { autoplay: true }),
        new Breath(),
      ],
    });
  }
}

// ── Look: EyeTracker + Blink. Detailed-humanoid rig only. ────────────────

export class Look extends StatelessWidget3D {
  private readonly o: { targetTag?: string; smoothness?: number; key?: string };
  constructor(opts: { targetTag?: string; smoothness?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'look',
      children: [
        new EyeTracker({ targetTag: this.o.targetTag, smoothness: this.o.smoothness }),
        new Blink({}),
      ],
    });
  }
}

// ── Run: faster gait via 'run' clip ───────────────────────────────────────

export class Run extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'run',
      children: [new ClipPlay('run', { autoplay: true })],
    });
  }
}

// ── Sit: single-shot crouch via 'sit' clip ────────────────────────────────

export class Sit extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'sit',
      children: [new ClipPlay('sit', { autoplay: true })],
    });
  }
}

// ── Clap: repeating 'clap' clip ───────────────────────────────────────────

export class Clap extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'clap',
      children: [new ClipPlay('clap', { autoplay: true })],
    });
  }
}
