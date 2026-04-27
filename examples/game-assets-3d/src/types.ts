import type * as THREE from 'three';
import type { PaletteName } from './style.js';

// ── Asset metadata + builder contract ──────────────────────────────────

export type AssetKind = 'character' | 'prop' | 'environment' | 'effect' | 'building';
export type ArchetypeName =
  | 'quadruped'
  | 'biped'
  | 'drone'
  | 'vehicle'
  | 'building'
  | 'tree'
  | 'rock'
  | 'plant'
  | 'cloud'
  | 'water'
  | 'effect'
  | 'prop';

export interface AssetMeta {
  slug: string;
  name?: string;
  kind: AssetKind;
  archetype?: ArchetypeName;
  description?: string;
}

export interface AssetBuildOptions {
  position?: [number, number, number];
  scale?: number;
}

/**
 * The default-export shape of every catalog module.
 * Compatible with the existing AssetModule contract from game-assets-3d so
 * the viewer can load both worlds if needed.
 */
export type AssetBuilder = (
  parent: THREE.Object3D,
  three: typeof THREE,
  options?: AssetBuildOptions,
) => THREE.Object3D;

export interface AssetModule {
  default: AssetBuilder;
  meta?: AssetMeta;
}

// ── Tells (first-class hand-made details) ──────────────────────────────

export type TellKind =
  | 'stencil'
  | 'missingRivet'
  | 'headTilt'
  | 'dent'
  | 'mossPatch'
  | 'custom';

export interface Tell {
  kind: TellKind;
  /** A reference to the Shape this tell applies to, by tag if any. */
  on?: string;
  meta: Record<string, unknown>;
}

// ── Per-frame tick (registered via Animator.* and composed by entity build) ──

export type Tick = (t: number, dt: number) => void;

// ── Shape options for primitives (default values come from primitives.ts) ──

export interface MaterialOpts {
  color?: PaletteName | number;
  roughness?: number;
  metalness?: number;
  emissive?: PaletteName | number;
  emissiveIntensity?: number;
  /** For `screen` material: emit pulsates each frame */
  blink?: boolean;
  /** For `weathered` material: rust/dirt amount (0..1) */
  weathering?: number;
  noiseScale?: number;
  /** Rim-light color (Fresnel highlight) */
  rim?: PaletteName | number;
  rimIntensity?: number;
  /** Force flat shading (default true for low-poly look) */
  flatShading?: boolean;
  /** Allow vertex colors */
  vertexColors?: boolean;
  /** Phong shininess (specular exponent). Used by `phong`, `glass`, `water`. */
  shininess?: number;
  /** Phong specular tint. Used by `phong`, `glass`, `water`. */
  specular?: PaletteName | number;
  /** Texture name resolved via TextureProvider — `map` slot (Phong/Standard). */
  map?: string;
  /** Displacement map name. Combined with `displacementScale`. */
  displacementMap?: string;
  displacementScale?: number;
  /** Bump map name. Combined with `bumpScale`. */
  bumpMap?: string;
  bumpScale?: number;
  /** Texture repeat factor; applied to all texture slots above. */
  textureRepeat?: [number, number];
  /** Material opacity (combined with `transparent: true` automatically when < 1). */
  opacity?: number;
}

export type MaterialName =
  | 'toon'
  | 'phong'
  | 'weathered'
  | 'bark'
  | 'screen'
  | 'ground'
  | 'glass'
  | 'water'
  | 'fire'
  | 'fireflies';
