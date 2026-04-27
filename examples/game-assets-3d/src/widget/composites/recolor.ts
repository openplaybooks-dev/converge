// Recolor — wraps a child subtree and rewrites every descendant material's
// `color` based on the material's authored name. Quaternius models use
// material names like 'LightYellow', 'Green', 'Brown', 'Bottom', 'Top' but
// store the linear-space baseColorFactor as very dark values (the source
// engine applied ramp lighting on top). Three.js doesn't, so they look
// muddy. This widget swaps in vivid hex colors keyed off the names.

import * as THREE from 'three';
import { LeafWidget3D, type BuildContext, type Widget3D } from '../types.js';
import { Group } from '../../entity/behaviors/group.js';
import type { Behavior } from '../../entity/types.js';
import type { Tick } from '../../types.js';

const RECOLOR_FLAG = '__recolored';

/** Default Quaternius name → hex map. Covers the common material names. */
const DEFAULT_PALETTE: Record<string, number> = {
  // Generic colors
  white: 0xfdfdfd, black: 0x222222, gray: 0x707070,
  red: 0xd84a3a, orange: 0xf08a3a, yellow: 0xf2c83a,
  green: 0x6cbf4a, lightgreen: 0x9bd56e, darkgreen: 0x3a7a3a,
  blue: 0x3a7ad8, lightblue: 0x6ec2f0, darkblue: 0x2a4a8a,
  purple: 0x9a5ad8, pink: 0xf08aa6, brown: 0x8a5a3a,
  lightbrown: 0xc28a5a, darkbrown: 0x4a2f1a, tan: 0xd0a878,
  lightyellow: 0xf5d97a, darkyellow: 0xc9a23a, cream: 0xf5e7c8,
  // Material-name pairs found in Quaternius/fish_pack ('Top', 'Bottom')
  top: 0x4a8ad8, bottom: 0xeae0d4,
  // Common animal-ish names
  fur: 0xc28a5a, skin: 0xf2c8a8, eyes: 0x222222, eye: 0x222222,
  teeth: 0xfafaf0, tongue: 0xd86a7a, claw: 0x222222, claws: 0x222222,
  scales: 0x4a8a5a, fin: 0x6ec2f0, fins: 0x6ec2f0,
  feathers: 0xc8c8c8, beak: 0xf2c83a,
  spikes: 0xc28a5a, shell: 0xc28a5a,
};

/** Look up a name in the palette using suffix/contains match. */
function lookupColor(matName: string | undefined, palette: Record<string, number>): number | undefined {
  if (!matName) return undefined;
  const k = matName.toLowerCase().replace(/[^a-z]/g, '');
  if (palette[k] != null) return palette[k];
  // Substring match (longest first for specificity).
  const keys = Object.keys(palette).sort((a, b) => b.length - a.length);
  for (const key of keys) if (k.includes(key)) return palette[key];
  return undefined;
}

function applyRecolor(root: THREE.Object3D, palette: Record<string, number>): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const ud = mesh.userData as Record<string, unknown>;
    if (ud[RECOLOR_FLAG]) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    let touched = false;
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (!std?.color) continue;
      const hex = lookupColor(std.name, palette);
      if (hex != null) {
        std.color.setHex(hex);
        std.needsUpdate = true;
        touched = true;
      }
    }
    if (touched) ud[RECOLOR_FLAG] = true;
  });
}

export interface RecolorOpts {
  child: Widget3D;
  /** Override or extend the default palette. Keys are case-insensitive. */
  palette?: Record<string, number>;
  name?: string;
  key?: string;
}

export class Recolor extends LeafWidget3D {
  private readonly o: RecolorOpts;
  constructor(opts: RecolorOpts) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(ctx: BuildContext): Behavior[] {
    const childCtx: BuildContext = { ...ctx, path: [...ctx.path, this] };
    const childBehaviors = this.o.child.lower(childCtx);
    const palette = { ...DEFAULT_PALETTE, ...(this.o.palette ?? {}) };
    // Lowercase keys for the user-supplied palette.
    const finalPalette: Record<string, number> = {};
    for (const [k, v] of Object.entries(palette)) finalPalette[k.toLowerCase().replace(/[^a-z]/g, '')] = v;
    const name = this.o.name;
    return [{
      kind: 'recolor',
      config: { paletteKeys: Object.keys(finalPalette).length },
      onBuild: (innerCtx) => {
        const group = Group(...childBehaviors);
        if (name) group.named(name);
        const contrib = group.onBuild!(innerCtx);
        if (!contrib?.object || Array.isArray(contrib.object)) return contrib ?? {};
        const root = contrib.object;
        applyRecolor(root, finalPalette);
        const tick: Tick = () => { applyRecolor(root, finalPalette); };
        const ticks = contrib.ticks ?? [];
        return { ...contrib, ticks: [...ticks, tick] };
      },
    }];
  }
}
