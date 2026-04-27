// Clothing toolkit — layered geometry over body parts.
//
// Each clothing widget renders ~5% inflated meshes attached to the SAME bones
// as the body parts they cover. Render-order layering puts them visually on
// top. Authors swap any item by passing a different widget into the Hero
// builder slots.

import {
  StatelessWidget3D, type BuildContext, type Widget3D,
} from '../types.js';
import { Stack3D } from '../stack.js';
import { Palette } from '../inherited/palette.js';
import { MeshBox, MeshCyl, MeshSphere, MeshCapsule, MeshCone } from '../leaves/mesh-leaves.js';
import type { ColorInput } from '../../style.js';

// ── Shirt ────────────────────────────────────────────────────────────────

export interface ShirtOpts {
  sleeveLength?: 'sleeveless' | 'short' | 'long';
  collarStyle?: 'none' | 'crew' | 'vneck';
  /** Long robe variant — extends shirt down over the legs. */
  style?: 'normal' | 'robe';
  color?: ColorInput;
  cuffColor?: ColorInput;
  key?: string;
}

export class Shirt extends StatelessWidget3D {
  private readonly o: ShirtOpts;
  constructor(opts: ShirtOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'shirt', 'pineGreen');
    const cuffColor = o.cuffColor ?? color;
    const sleeve = o.sleeveLength ?? 'long';
    const isRobe = o.style === 'robe';

    const children: Widget3D[] = [
      // Torso layer.
      new MeshCapsule({
        r: 0.20, l: isRobe ? 0.46 : 0.42,
        material: { name: 'toon', opts: { color } },
        attach: 'chest',
        tag: 'shirt_torso',
      }),
    ];

    // Optional collar.
    if (o.collarStyle && o.collarStyle !== 'none') {
      children.push(new MeshCyl({
        rt: 0.10, rb: 0.10, h: 0.04,
        at: [0, 0.20, 0],
        material: { name: 'toon', opts: { color: cuffColor } },
        attach: 'chest',
        tag: 'collar',
      }));
    }

    // Sleeves.
    if (sleeve !== 'sleeveless') {
      for (const side of ['L', 'R'] as const) {
        const sign = side === 'R' ? 1 : -1;
        const len = sleeve === 'short' ? 0.18 : 0.32;
        children.push(new MeshCyl({
          rt: 0.075, rb: 0.075, h: len, rs: 8,
          at: [sign * len * 0.5, 0, 0],
          rot: [0, 0, side === 'R' ? -Math.PI / 2 : Math.PI / 2],
          material: { name: 'toon', opts: { color } },
          attach: `arm_${side}`,
          tag: `sleeve_${side}`,
        }));
        if (sleeve === 'long') {
          // Cuff at wrist.
          children.push(new MeshCyl({
            rt: 0.078, rb: 0.078, h: 0.04, rs: 8,
            at: [sign * 0.30, 0, 0],
            rot: [0, 0, side === 'R' ? -Math.PI / 2 : Math.PI / 2],
            material: { name: 'toon', opts: { color: cuffColor } },
            attach: `forearm_${side}`,
            tag: `cuff_${side}`,
          }));
        }
      }
    }

    // Robe extension — covers thighs.
    if (isRobe) {
      for (const side of ['L', 'R'] as const) {
        children.push(new MeshCyl({
          rt: 0.16, rb: 0.20, h: 0.42, rs: 8,
          at: [0, -0.21, 0],
          material: { name: 'toon', opts: { color } },
          attach: `leg_${side}`,
          tag: `robe_${side}`,
        }));
      }
    }

    return new Stack3D({ name: 'shirt', children });
  }
}

// ── Pants ────────────────────────────────────────────────────────────────

export interface PantsOpts {
  length?: 'shorts' | 'knee' | 'long';
  color?: ColorInput;
  beltColor?: ColorInput;
  key?: string;
}

export class Pants extends StatelessWidget3D {
  private readonly o: PantsOpts;
  constructor(opts: PantsOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'pants', 'rockGrey');
    const beltColor = o.beltColor ?? color;
    const length = o.length ?? 'long';

    const children: Widget3D[] = [];
    // Waistband.
    children.push(new MeshCyl({
      rt: 0.15, rb: 0.15, h: 0.07, rs: 12,
      material: { name: 'toon', opts: { color: beltColor } },
      attach: 'pelvis',
      tag: 'waistband',
    }));

    // Thighs (always covered).
    for (const side of ['L', 'R'] as const) {
      children.push(new MeshCyl({
        rt: 0.075, rb: 0.085, h: 0.42, rs: 8,
        at: [0, -0.21, 0],
        material: { name: 'toon', opts: { color } },
        attach: `leg_${side}`,
        tag: `pants_thigh_${side}`,
      }));
      if (length !== 'shorts') {
        // Knee section / shin (long pants).
        const shinLen = length === 'knee' ? 0.06 : 0.40;
        children.push(new MeshCyl({
          rt: 0.060, rb: 0.072, h: shinLen, rs: 8,
          at: [0, -shinLen * 0.5, 0],
          material: { name: 'toon', opts: { color } },
          attach: `lowerLeg_${side}`,
          tag: `pants_shin_${side}`,
        }));
      }
    }

    return new Stack3D({ name: 'pants', children });
  }
}

// ── Shoes ────────────────────────────────────────────────────────────────

export interface ShoesOpts {
  style?: 'sneaker' | 'boot' | 'slipper';
  color?: ColorInput;
  laceColor?: ColorInput;
  key?: string;
}

export class Shoes extends StatelessWidget3D {
  private readonly o: ShoesOpts;
  constructor(opts: ShoesOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'shoes', 'darkMetal');
    const style = o.style ?? 'sneaker';
    const isBoot = style === 'boot';

    const children: Widget3D[] = [];
    for (const side of ['L', 'R'] as const) {
      children.push(new MeshBox({
        w: 0.12, h: isBoot ? 0.10 : 0.06, d: 0.24,
        at: [0, isBoot ? -0.05 : -0.025, 0.06],
        material: { name: 'toon', opts: { color } },
        attach: `foot_${side}`,
        tag: `shoe_${side}`,
      }));
      if (isBoot) {
        // Boot shaft up the lower leg.
        children.push(new MeshCyl({
          rt: 0.075, rb: 0.082, h: 0.18, rs: 8,
          at: [0, -0.09, 0],
          material: { name: 'toon', opts: { color } },
          attach: `lowerLeg_${side}`,
          tag: `boot_shaft_${side}`,
        }));
      }
    }
    return new Stack3D({ name: 'shoes', children });
  }
}

// ── Hat ──────────────────────────────────────────────────────────────────

export interface HatOpts {
  style?: 'cap' | 'fedora' | 'helmet' | 'hood' | 'wizard';
  color?: ColorInput;
  bandColor?: ColorInput;
  key?: string;
}

export class Hat extends StatelessWidget3D {
  private readonly o: HatOpts;
  constructor(opts: HatOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'hat', 'darkMetal');
    const band = o.bandColor ?? color;
    const style = o.style ?? 'cap';

    const children: Widget3D[] = [];
    if (style === 'cap') {
      children.push(new MeshSphere({
        r: 0.18, ws: 12, hs: 6,
        at: [0, 0.16, 0],
        scale: [1, 0.55, 1],
        material: { name: 'toon', opts: { color } },
        attach: 'head',
        tag: 'cap_dome',
      }));
      children.push(new MeshBox({
        w: 0.22, h: 0.025, d: 0.18,
        at: [0, 0.13, 0.14],
        material: { name: 'toon', opts: { color } },
        attach: 'head',
        tag: 'cap_brim',
      }));
    } else if (style === 'fedora') {
      children.push(new MeshCyl({
        rt: 0.13, rb: 0.15, h: 0.13, rs: 12,
        at: [0, 0.21, 0],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'fedora_dome',
      }));
      children.push(new MeshCyl({
        rt: 0.24, rb: 0.24, h: 0.02, rs: 16,
        at: [0, 0.15, 0],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'fedora_brim',
      }));
      children.push(new MeshCyl({
        rt: 0.151, rb: 0.151, h: 0.025, rs: 12,
        at: [0, 0.16, 0],
        material: { name: 'toon', opts: { color: band } },
        attach: 'head', tag: 'fedora_band',
      }));
    } else if (style === 'helmet') {
      children.push(new MeshSphere({
        r: 0.18, ws: 10, hs: 6,
        at: [0, 0.05, 0],
        scale: [1, 1.0, 1],
        material: { name: 'phong', opts: { color, shininess: 80, specular: 0x222222 } },
        attach: 'head', tag: 'helmet_dome',
      }));
      // Cheek guards.
      children.push(new MeshBox({
        w: 0.32, h: 0.02, d: 0.20,
        at: [0, 0.12, 0],
        material: { name: 'phong', opts: { color, shininess: 60 } },
        attach: 'head', tag: 'helmet_band',
      }));
    } else if (style === 'hood') {
      children.push(new MeshSphere({
        r: 0.22, ws: 10, hs: 8,
        at: [0, 0.10, -0.02],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'hood',
      }));
    } else if (style === 'wizard') {
      // Tall conical hat.
      children.push(new MeshCone({
        r: 0.18, h: 0.55, rs: 8,
        at: [0, 0.42, 0],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'wizard_cone',
      }));
      children.push(new MeshCyl({
        rt: 0.22, rb: 0.22, h: 0.025, rs: 16,
        at: [0, 0.16, 0],
        material: { name: 'toon', opts: { color: band } },
        attach: 'head', tag: 'wizard_brim',
      }));
    }
    return new Stack3D({ name: 'hat', children });
  }
}

// ── Hair ─────────────────────────────────────────────────────────────────

export interface HairOpts {
  style?: 'bald' | 'short' | 'long' | 'spiky' | 'ponytail' | 'mohawk';
  color?: ColorInput;
  key?: string;
}

export class Hair extends StatelessWidget3D {
  private readonly o: HairOpts;
  constructor(opts: HairOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'hair', 0x3a2818);
    const style = o.style ?? 'short';

    if (style === 'bald') {
      return new Stack3D({ name: 'hair_bald', children: [] });
    }

    const children: Widget3D[] = [];
    if (style === 'short') {
      children.push(new MeshSphere({
        r: 0.17, ws: 10, hs: 6,
        at: [0, 0.10, 0],
        scale: [1.05, 0.55, 1.05],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'hair_dome',
      }));
    } else if (style === 'long') {
      children.push(new MeshSphere({
        r: 0.18, ws: 10, hs: 6,
        at: [0, 0.10, 0],
        scale: [1.05, 0.7, 1.05],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'hair_dome',
      }));
      // Hair flowing down past shoulders.
      children.push(new MeshBox({
        w: 0.30, h: 0.30, d: 0.10,
        at: [0, -0.10, -0.02],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'hair_back',
      }));
    } else if (style === 'spiky') {
      // Five small spikes on top of head.
      const positions: Array<[number, number, number]> = [
        [0, 0.20, 0], [-0.08, 0.18, 0], [0.08, 0.18, 0],
        [0, 0.18, -0.08], [0, 0.18, 0.08],
      ];
      for (let i = 0; i < positions.length; i++) {
        children.push(new MeshCone({
          r: 0.05, h: 0.10, rs: 4,
          at: positions[i],
          material: { name: 'toon', opts: { color } },
          attach: 'head', tag: `spike_${i}`, key: `spike_${i}`,
        }));
      }
    } else if (style === 'ponytail') {
      children.push(new MeshSphere({
        r: 0.17, ws: 10, hs: 6,
        at: [0, 0.10, 0],
        scale: [1.05, 0.55, 1.05],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'hair_dome',
      }));
      children.push(new MeshCyl({
        rt: 0.04, rb: 0.05, h: 0.20, rs: 6,
        at: [0, 0.05, -0.18],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'ponytail',
      }));
    } else if (style === 'mohawk') {
      children.push(new MeshBox({
        w: 0.06, h: 0.18, d: 0.22,
        at: [0, 0.21, 0],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'mohawk',
      }));
    }
    return new Stack3D({ name: 'hair', children });
  }
}

// ── Belt ─────────────────────────────────────────────────────────────────

export interface BeltOpts {
  width?: number;
  color?: ColorInput;
  buckleColor?: ColorInput;
  key?: string;
}

export class Belt extends StatelessWidget3D {
  private readonly o: BeltOpts;
  constructor(opts: BeltOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'belt', 'darkMetal');
    const buckle = o.buckleColor ?? Palette.color(ctx, 'buckle', 'lightMetal');
    const width = o.width ?? 0.05;

    return new Stack3D({
      name: 'belt',
      children: [
        new MeshCyl({
          rt: 0.155, rb: 0.155, h: width, rs: 16,
          material: { name: 'toon', opts: { color } },
          attach: 'pelvis', tag: 'belt_strap',
        }),
        new MeshBox({
          w: 0.06, h: width * 1.2, d: 0.02,
          at: [0, 0, 0.155],
          material: { name: 'phong', opts: { color: buckle, shininess: 80 } },
          attach: 'pelvis', tag: 'buckle',
        }),
      ],
    });
  }
}

// ── Cape ─────────────────────────────────────────────────────────────────

export interface CapeOpts {
  length?: number;
  color?: ColorInput;
  key?: string;
}

export class Cape extends StatelessWidget3D {
  private readonly o: CapeOpts;
  constructor(opts: CapeOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'cape', 'fireRed');
    const length = o.length ?? 0.7;
    return new MeshBox({
      w: 0.45, h: length, d: 0.04,
      at: [0, -length * 0.4, -0.02],
      material: { name: 'toon', opts: { color } },
      attach: 'back_slot', tag: 'cape',
    });
  }
}

// ── Backpack ─────────────────────────────────────────────────────────────

export interface BackpackOpts {
  size?: 'small' | 'medium' | 'large';
  color?: ColorInput;
  key?: string;
}

export class Backpack extends StatelessWidget3D {
  private readonly o: BackpackOpts;
  constructor(opts: BackpackOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'pack', 'fenceWood');
    const size = o.size ?? 'medium';
    const dim: [number, number, number] =
      size === 'small'  ? [0.22, 0.25, 0.10] :
      size === 'large'  ? [0.36, 0.40, 0.16] :
                          [0.30, 0.32, 0.13];
    return new MeshBox({
      w: dim[0], h: dim[1], d: dim[2],
      at: [0, 0, -dim[2] * 0.5 - 0.05],
      material: { name: 'toon', opts: { color } },
      attach: 'back_slot', tag: 'backpack',
    });
  }
}
