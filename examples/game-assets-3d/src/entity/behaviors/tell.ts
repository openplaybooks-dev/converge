// Tell.* — first-class hand-made details (mossPatch, dent, stencil, missingRivet,
// headTilt, custom). Each Tell behavior pushes one entry to ctx.tells (which
// surfaces as root.userData.tells) and may add Object3D(s) to the entity root.
//
// `on` references a Mesh tag string. The Mesh.*().tag('foo') call registers
// 'foo' → mesh in ctx.refs; we don't mutate the referenced mesh here, but the
// metadata records the tag so verifiers and tools can correlate.

import * as P from '../../primitives.js';
import { resolveColor, type ColorInput } from '../../style.js';
import type { Tell as TellRecord } from '../../types.js';
import type { Behavior } from '../types.js';
import type { BoneRef } from '../../rig.js';

interface BaseOpts {
  on?: string;
  position?: [number, number, number];
}

function mossPatch(opts: BaseOpts & { side?: 'north' | 'south' | 'east' | 'west'; area?: number } = {}): Behavior {
  return {
    kind: 'tell-mossPatch',
    config: opts,
    onBuild() {
      const pos = opts.position ?? [0, 0.3, 0];
      const area = opts.area ?? 0.15;
      const radius = Math.sqrt(area / Math.PI);
      const moss = P.sphere(radius, 8, 6)
        .at(...pos)
        .scale([1, 0.3, 1])
        .material('ground', { color: 0x6a7a52 })
        .setTag('tell_moss')
        .build();
      const tell: TellRecord = {
        kind: 'mossPatch',
        on: opts.on,
        meta: { position: pos, side: opts.side, area },
      };
      return { object: moss, tells: [tell] };
    },
  };
}

function dent(opts: BaseOpts & { depth?: number } = {}): Behavior {
  return {
    kind: 'tell-dent',
    config: opts,
    onBuild() {
      const pos = opts.position ?? [0, 0.5, 0];
      const depth = opts.depth ?? 0.04;
      const obj = P.sphere(depth, 8, 6)
        .at(...pos)
        .material('toon', { color: 0x1a1a1c })
        .setTag('tell_dent')
        .build();
      const tell: TellRecord = {
        kind: 'dent',
        on: opts.on,
        meta: { position: pos, depth },
      };
      return { object: obj, tells: [tell] };
    },
  };
}

function missingRivet(opts: BaseOpts = {}): Behavior {
  return {
    kind: 'tell-missingRivet',
    config: opts,
    onBuild() {
      const pos = opts.position ?? [0, 0.5, 0];
      const hole = P.sphere(0.013, 6, 4)
        .at(...pos)
        .material('toon', { color: 0x0a0a0c })
        .setTag('tell_missingRivet')
        .build();
      const tell: TellRecord = {
        kind: 'missingRivet',
        on: opts.on,
        meta: { position: pos },
      };
      return { object: hole, tells: [tell] };
    },
  };
}

function stencil(
  text: string,
  opts: BaseOpts & { color?: ColorInput; side?: 'right' | 'left' | 'front' | 'back' } = {},
): Behavior {
  return {
    kind: 'tell-stencil',
    config: { text, ...opts },
    onBuild() {
      const color = resolveColor(opts.color ?? 'accent');
      const pos = opts.position ?? [0, 0.5, 0];
      const numChars = Math.min(3, Math.max(1, text.length));
      const objs = [];
      for (let i = 0; i < numChars; i++) {
        const dx = (i - (numChars - 1) / 2) * 0.05;
        const plate = P.box(0.03, 0.05, 0.005)
          .at(pos[0] + dx, pos[1], pos[2])
          .material('screen', { color, emissiveIntensity: 0.3 })
          .setTag(`tell_stencil_${text}_${i}`)
          .build();
        objs.push(plate);
      }
      const tell: TellRecord = {
        kind: 'stencil',
        on: opts.on,
        meta: { text, position: pos, color, side: opts.side },
      };
      return { object: objs, tells: [tell] };
    },
  };
}

function headTilt(opts: { boneRef?: BoneRef; deg?: number; axis?: 'x' | 'y' | 'z' } = {}): Behavior {
  return {
    kind: 'tell-headTilt',
    config: opts,
    onBuild(ctx) {
      const deg = opts.deg ?? 4;
      const axis = opts.axis ?? 'z';
      const boneRef = opts.boneRef ?? 'head';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rig = ctx.refs.get('rig') as any;
      if (rig) {
        const rad = (deg * Math.PI) / 180;
        const bone = rig.resolve(boneRef);
        bone.rotation[axis] = rad;
      }
      const tell: TellRecord = {
        kind: 'headTilt',
        meta: { deg, axis, boneRef: typeof boneRef === 'string' ? boneRef : '<fn>' },
      };
      return { tells: [tell] };
    },
  };
}

function custom(
  name: string,
  makeMesh: () => import('three').Object3D,
  meta: Record<string, unknown> = {},
): Behavior {
  return {
    kind: 'tell-custom',
    config: { name, meta },
    onBuild() {
      const obj = makeMesh();
      const tell: TellRecord = {
        kind: 'custom',
        on: undefined,
        meta: { name, ...meta },
      };
      return { object: obj, tells: [tell] };
    },
  };
}

export const Tell = {
  mossPatch,
  dent,
  missingRivet,
  stencil,
  headTilt,
  custom,
} as const;
