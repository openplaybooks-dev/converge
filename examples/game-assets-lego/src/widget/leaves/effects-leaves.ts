// FireflySwarm and FireParticles — high-fidelity leaf widgets using upstream's
// custom GLSL shaders (FIREFLIES_VS/FS, FIRE_VS/FS).
//
// FireflySwarm builds a THREE.Points cloud with per-vertex `aScale` + `rFade`
// attributes and a ShaderMaterial driving uTime / uPixelRatio / uSize uniforms.
//
// FireParticles uses upstream's FIRE shader with a flame texture sampler;
// per-vertex `aScale` + per-vertex `colour` attributes drive the flicker.
// If no `flame.png` texture is registered (TextureProvider arrives in a future
// step), it falls back to a procedural radial-gradient texture so the asset
// viewer still works standalone.

import * as THREE from 'three';
import { LeafWidget3D, type BuildContext } from '../types.js';
import type { Behavior } from '../../entity/types.js';
import type { Tick } from '../../types.js';
import {
  FIREFLIES_VS, FIREFLIES_FS,
  FIRE_VS, FIRE_FS,
} from '../../shaders/upstream-glsl.js';

// ── FireflySwarm ───────────────────────────────────────────────────────────

export interface FireflySwarmOpts {
  count?: number;
  extent?: [number, number, number];
  size?: number;
  seed?: number;
  key?: string;
}

export class FireflySwarm extends LeafWidget3D {
  private readonly o: FireflySwarmOpts;
  constructor(opts: FireflySwarmOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }

  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'firefly-swarm',
      config: o,
      onBuild() {
        const N = o.count ?? 24;
        const [W, H, D] = o.extent ?? [12, 4, 12];
        const size = o.size ?? 200;

        let s = (o.seed ?? 901) >>> 0;
        const rand = (): number => {
          s = (s + 0x6d2b79f5) | 0;
          let t = Math.imul(s ^ (s >>> 15), 1 | s);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };

        const positions = new Float32Array(N * 3);
        const aScale = new Float32Array(N);
        const rFade = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          positions[i * 3 + 0] = (rand() - 0.5) * W;
          positions[i * 3 + 1] = rand() * H;
          positions[i * 3 + 2] = (rand() - 0.5) * D;
          aScale[i] = 0.1 + rand() * 0.6;        // upstream: 0.1..0.7
          rFade[i] = 0.03 + rand() * 0.07;       // upstream: 0.03..0.1
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('aScale', new THREE.BufferAttribute(aScale, 1));
        geom.setAttribute('rFade', new THREE.BufferAttribute(rFade, 1));

        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uPixelRatio: { value: typeof window !== 'undefined' ? window.devicePixelRatio : 1 },
            uSize: { value: size },
            uTime: { value: 0 },
          },
          vertexShader: FIREFLIES_VS,
          fragmentShader: FIREFLIES_FS,
        });

        const points = new THREE.Points(geom, material);
        const tick: Tick = (t) => { material.uniforms.uTime.value = t; };
        return { object: points, ticks: [tick] };
      },
    }];
  }
}

// ── FireParticles ──────────────────────────────────────────────────────────

export interface FireParticlesOpts {
  count?: number;
  size?: number;
  spread?: [number, number, number];
  seed?: number;
  /** URL of a flame texture. If undefined, a procedural radial gradient is generated. */
  textureUrl?: string;
  key?: string;
}

function makeRadialGradientTexture(): THREE.Texture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const t = 1 - Math.min(1, d / maxD);
      const a = Math.round(255 * Math.pow(t, 1.5));
      const i = (y * size + x) * 4;
      data[i + 0] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = a;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export class FireParticles extends LeafWidget3D {
  private readonly o: FireParticlesOpts;
  constructor(opts: FireParticlesOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }

  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'fire-particles',
      config: o,
      onBuild() {
        const N = o.count ?? 50;
        const size = o.size ?? 80;
        const [SX, SY, SZ] = o.spread ?? [3, 8, 3];

        let s = (o.seed ?? 1337) >>> 0;
        const rand = (): number => {
          s = (s + 0x6d2b79f5) | 0;
          let t = Math.imul(s ^ (s >>> 15), 1 | s);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const range = (lo: number, hi: number): number => lo + rand() * (hi - lo);

        const positions = new Float32Array(N * 3);
        const aScale = new Float32Array(N);
        const colour = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
          // Distribute by height layers to mimic upstream's flame shape:
          // base = wide red, middle = orange, top = small yellow.
          const y = range(0, SY);
          positions[i * 3 + 1] = y;
          if (y <= SY * 0.25) {
            positions[i * 3 + 0] = range(-SX, SX);
            positions[i * 3 + 2] = range(-SZ, SZ);
            aScale[i] = range(1, 1.2);
            colour[i * 3 + 0] = 1; colour[i * 3 + 1] = range(0, 0.25); colour[i * 3 + 2] = 0;
          } else if (y <= SY * 0.5) {
            positions[i * 3 + 0] = range(-SX * 0.7, SX * 0.7);
            positions[i * 3 + 2] = range(-SZ * 0.7, SZ * 0.7);
            aScale[i] = range(0.6, 1);
            colour[i * 3 + 0] = 1; colour[i * 3 + 1] = range(0.25, 0.5); colour[i * 3 + 2] = 0;
          } else if (y <= SY * 0.75) {
            positions[i * 3 + 0] = range(-SX * 0.4, SX * 0.4);
            positions[i * 3 + 2] = range(-SZ * 0.4, SZ * 0.4);
            aScale[i] = range(0.4, 0.6);
            colour[i * 3 + 0] = 1; colour[i * 3 + 1] = range(0.5, 0.75); colour[i * 3 + 2] = 0;
          } else {
            positions[i * 3 + 0] = range(-SX * 0.2, SX * 0.2);
            positions[i * 3 + 2] = range(-SZ * 0.2, SZ * 0.2);
            aScale[i] = range(0.1, 0.4);
            colour[i * 3 + 0] = 1; colour[i * 3 + 1] = range(0.75, 1); colour[i * 3 + 2] = 0;
          }
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('aScale', new THREE.BufferAttribute(aScale, 1));
        geom.setAttribute('colour', new THREE.BufferAttribute(colour, 3));

        let texture: THREE.Texture;
        if (o.textureUrl) {
          texture = new THREE.TextureLoader().load(o.textureUrl);
        } else {
          texture = makeRadialGradientTexture();
        }

        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uPixelRatio: { value: typeof window !== 'undefined' ? window.devicePixelRatio : 1 },
            uSize: { value: size },
            uTime: { value: 0 },
            pointTexture: { value: texture },
          },
          vertexShader: FIRE_VS,
          fragmentShader: FIRE_FS,
        });

        const points = new THREE.Points(geom, material);
        const tick: Tick = (t) => { material.uniforms.uTime.value = t; };
        return { object: points, ticks: [tick] };
      },
    }];
  }
}
