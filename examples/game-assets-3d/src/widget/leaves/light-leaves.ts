// Light leaf widgets — wrap THREE.* light objects so scenes can declare
// lighting in the widget tree alongside meshes.
//
// Each widget emits one Behavior whose contribution.object is the light.
// Spot/Directional lights also add their `target` Object3D as a sibling so
// transforms cascade correctly.
//
// All lights default to `visible: true`. Pass `visible: false` for lights
// that should turn on at night (the DayNight widget toggles by tag).

import * as THREE from 'three';
import { LeafWidget3D, type BuildContext } from '../types.js';
import { resolveColor, type ColorInput } from '../../style.js';
import type { Behavior } from '../../entity/types.js';

interface LightCommonOpts {
  at?: [number, number, number];
  color?: ColorInput;
  intensity?: number;
  visible?: boolean;
  castShadow?: boolean;
  shadowMapSize?: number;
  shadowBias?: number;
  shadowNormalBias?: number;
  tag?: string;
  key?: string;
}

function applyShadow(
  light: THREE.Light & { castShadow?: boolean; shadow?: THREE.LightShadow },
  opts: LightCommonOpts,
): void {
  if (!opts.castShadow) return;
  light.castShadow = true;
  const size = opts.shadowMapSize ?? 1024;
  if (light.shadow) {
    light.shadow.mapSize.width = size;
    light.shadow.mapSize.height = size;
    if (opts.shadowBias != null) light.shadow.bias = opts.shadowBias;
    if (opts.shadowNormalBias != null) light.shadow.normalBias = opts.shadowNormalBias;
  }
}

// ── Sun: DirectionalLight with orthographic shadow camera ─────────────────

export class Sun extends LeafWidget3D {
  private readonly o: LightCommonOpts & {
    target?: [number, number, number];
    shadowCamera?: { left: number; right: number; top: number; bottom: number; near: number; far: number };
  };
  constructor(opts: LightCommonOpts & {
    target?: [number, number, number];
    shadowCamera?: { left: number; right: number; top: number; bottom: number; near: number; far: number };
  } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'sun',
      config: { at: o.at, color: o.color, intensity: o.intensity, tag: o.tag },
      onBuild(ctx) {
        const colorHex = resolveColor(o.color ?? 'white');
        const light = new THREE.DirectionalLight(colorHex, o.intensity ?? 1.4);
        if (o.at) light.position.set(...o.at);
        else light.position.set(40, 80, 40);
        light.visible = o.visible !== false;
        if (o.target) light.target.position.set(...o.target);
        applyShadow(light, o);
        if (light.castShadow && o.shadowCamera) {
          const c = light.shadow.camera as THREE.OrthographicCamera;
          c.left = o.shadowCamera.left;
          c.right = o.shadowCamera.right;
          c.top = o.shadowCamera.top;
          c.bottom = o.shadowCamera.bottom;
          c.near = o.shadowCamera.near;
          c.far = o.shadowCamera.far;
          c.updateProjectionMatrix();
        }
        if (o.tag) ctx.refs.set(o.tag, light);
        // Add the target as a sibling so its world transform tracks.
        return { object: [light, light.target] };
      },
    }];
  }
}

// ── Ambient ────────────────────────────────────────────────────────────────

export class AmbientLightWidget extends LeafWidget3D {
  private readonly o: { color?: ColorInput; intensity?: number; tag?: string; key?: string };
  constructor(opts: { color?: ColorInput; intensity?: number; tag?: string; key?: string } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'ambient',
      config: o,
      onBuild(ctx) {
        const colorHex = resolveColor(o.color ?? 'white');
        const light = new THREE.AmbientLight(colorHex, o.intensity ?? 0.7);
        if (o.tag) ctx.refs.set(o.tag, light);
        return { object: light };
      },
    }];
  }
}

// ── Hemisphere ─────────────────────────────────────────────────────────────

export class HemisphereLightWidget extends LeafWidget3D {
  private readonly o: { skyColor?: ColorInput; groundColor?: ColorInput; intensity?: number; tag?: string; key?: string };
  constructor(opts: { skyColor?: ColorInput; groundColor?: ColorInput; intensity?: number; tag?: string; key?: string } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'hemisphere',
      config: o,
      onBuild(ctx) {
        const sky = resolveColor(o.skyColor ?? 0xeae2d8);
        const ground = resolveColor(o.groundColor ?? 0x4a4a52);
        const light = new THREE.HemisphereLight(sky, ground, o.intensity ?? 0.6);
        if (o.tag) ctx.refs.set(o.tag, light);
        return { object: light };
      },
    }];
  }
}

// ── Spot ───────────────────────────────────────────────────────────────────

export class SpotLightWidget extends LeafWidget3D {
  private readonly o: LightCommonOpts & {
    target?: [number, number, number] | string;
    angle?: number;
    penumbra?: number;
    decay?: number;
    distance?: number;
  };
  constructor(opts: LightCommonOpts & {
    target?: [number, number, number] | string;
    angle?: number;
    penumbra?: number;
    decay?: number;
    distance?: number;
  } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'spotlight',
      config: o,
      onBuild(ctx) {
        const colorHex = resolveColor(o.color ?? 'white');
        const light = new THREE.SpotLight(colorHex, o.intensity ?? 2);
        if (o.at) light.position.set(...o.at);
        light.angle = o.angle ?? Math.PI / 3;
        light.penumbra = o.penumbra ?? 0;
        light.decay = o.decay ?? 2;
        light.distance = o.distance ?? 0;
        light.visible = o.visible !== false;
        applyShadow(light, o);
        // target — array sets local position; string resolves later via refs.
        if (Array.isArray(o.target)) {
          light.target.position.set(...o.target);
        } else if (typeof o.target === 'string') {
          // Defer resolution to a tick (refs may not be populated yet by sibling widgets).
          const ref = o.target;
          ctx.ticks.push(() => {
            const obj = ctx.refs.get(ref);
            if (obj && (obj as THREE.Object3D).isObject3D) {
              light.target = obj as THREE.Object3D;
            }
          });
        }
        if (o.tag) ctx.refs.set(o.tag, light);
        return { object: [light, light.target] };
      },
    }];
  }
}

// ── Point ──────────────────────────────────────────────────────────────────

export class PointLightWidget extends LeafWidget3D {
  private readonly o: LightCommonOpts & { distance?: number; decay?: number };
  constructor(opts: LightCommonOpts & { distance?: number; decay?: number } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'pointlight',
      config: o,
      onBuild(ctx) {
        const colorHex = resolveColor(o.color ?? 'white');
        const light = new THREE.PointLight(colorHex, o.intensity ?? 1, o.distance ?? 0, o.decay ?? 2);
        if (o.at) light.position.set(...o.at);
        light.visible = o.visible !== false;
        applyShadow(light, o);
        if (o.tag) ctx.refs.set(o.tag, light);
        return { object: light };
      },
    }];
  }
}
