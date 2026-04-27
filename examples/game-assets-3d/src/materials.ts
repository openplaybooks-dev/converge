// Typed material factories. Resolves ColorInput to numeric hex; sets sane
// low-poly defaults (flatShading=true). Includes shader injections for
// weathered metal, bark, screen, fire, and fireflies materials.

import * as THREE from 'three';
import { resolveColor, type ColorInput } from './style.js';
import type { MaterialName, MaterialOpts } from './types.js';

// ── Texture loader & cache ──────────────────────────────────────────────────
//
// Materials reference textures by URL string. We keep a module-scope cache so
// duplicate URLs share a single THREE.Texture (memory + decode wins). The
// TextureProvider widget (added in a later phase) registers names → URLs; for
// Phase A, materials accept the URL directly via `MaterialOpts.map` etc.

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function loadTexture(url: string): THREE.Texture {
  const cached = textureCache.get(url);
  if (cached) return cached;
  const t = textureLoader.load(url);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  textureCache.set(url, t);
  return t;
}

function applyTextureSlots(
  m: THREE.Material & {
    map?: THREE.Texture | null;
    displacementMap?: THREE.Texture | null;
    displacementScale?: number;
    bumpMap?: THREE.Texture | null;
    bumpScale?: number;
  },
  opts: MaterialOpts,
): void {
  const repeat = opts.textureRepeat;
  const setRepeat = (t: THREE.Texture): void => {
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
  };
  if (opts.map) { const t = loadTexture(opts.map); setRepeat(t); m.map = t; }
  if (opts.displacementMap) {
    const t = loadTexture(opts.displacementMap); setRepeat(t);
    m.displacementMap = t;
    if (opts.displacementScale != null) m.displacementScale = opts.displacementScale;
  }
  if (opts.bumpMap) {
    const t = loadTexture(opts.bumpMap); setRepeat(t);
    m.bumpMap = t;
    if (opts.bumpScale != null) m.bumpScale = opts.bumpScale;
  }
}

// Compose multiple onBeforeCompile callbacks (three.js supports only one).
type OBCFn = NonNullable<THREE.MeshStandardMaterial['onBeforeCompile']>;

function chainOBC(prev: OBCFn | undefined, next: OBCFn): OBCFn {
  if (!prev) return next;
  return (shader, renderer) => {
    prev(shader, renderer);
    next(shader, renderer);
  };
}

function attachRim(material: THREE.MeshStandardMaterial, rim: number, intensity: number): void {
  material.onBeforeCompile = chainOBC(material.onBeforeCompile, (shader) => {
    shader.uniforms.uRimColor = { value: new THREE.Color(rim) };
    shader.uniforms.uRimIntensity = { value: intensity };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uRimColor;
        uniform float uRimIntensity;`)
      .replace('#include <output_fragment>', `{
          vec3 viewDir = normalize(-vViewPosition);
          float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.0);
          gl_FragColor.rgb += uRimColor * rim * uRimIntensity;
        }
        #include <output_fragment>`);
  });
}

function attachWeathering(
  material: THREE.MeshStandardMaterial,
  amount: number,
  scale: number,
): void {
  material.onBeforeCompile = chainOBC(material.onBeforeCompile, (shader) => {
    shader.uniforms.uWeatherAmount = { value: amount };
    shader.uniforms.uWeatherScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObjectPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vObjectPos = position;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObjectPos;
        uniform float uWeatherAmount;
        uniform float uWeatherScale;
        float wHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float wNoise(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n000 = wHash(i), n100 = wHash(i+vec3(1,0,0));
          float n010 = wHash(i+vec3(0,1,0)), n110 = wHash(i+vec3(1,1,0));
          float n001 = wHash(i+vec3(0,0,1)), n101 = wHash(i+vec3(1,0,1));
          float n011 = wHash(i+vec3(0,1,1)), n111 = wHash(i+vec3(1,1,1));
          float nx00 = mix(n000, n100, f.x), nx10 = mix(n010, n110, f.x);
          float nx01 = mix(n001, n101, f.x), nx11 = mix(n011, n111, f.x);
          return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
        }`)
      .replace('#include <output_fragment>', `{
        float n = wNoise(vObjectPos * uWeatherScale);
        float n2 = wNoise(vObjectPos * uWeatherScale * 2.3 + 7.0);
        float rust = smoothstep(0.55, 0.85, n) * uWeatherAmount;
        float dirt = smoothstep(0.6, 0.9, n2) * uWeatherAmount * 0.5;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.42, 0.18, 0.08), rust);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.18, 0.15, 0.10), dirt);
      }
      #include <output_fragment>`);
  });
}

function attachBark(material: THREE.MeshStandardMaterial, scale: number): void {
  material.onBeforeCompile = chainOBC(material.onBeforeCompile, (shader) => {
    shader.uniforms.uBarkScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObjectPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vObjectPos = position;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObjectPos;
        uniform float uBarkScale;`)
      .replace('#include <output_fragment>', `{
        float ridges = sin(atan(vObjectPos.x, vObjectPos.z) * uBarkScale * 3.0) * 0.5 + 0.5;
        ridges = pow(ridges, 4.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.7, gl_FragColor.rgb * 1.1, ridges);
      }
      #include <output_fragment>`);
  });
}

// ── Public material factory ────────────────────────────────────────────

/**
 * Build a three.js Material by typed name.
 *
 * `name` is the kind ('weathered', 'bark', etc). `opts` configures the
 * underlying parameters; color may be a palette name or numeric hex.
 *
 * Default flatShading = true for low-poly look. Override with `flatShading: false`.
 */
export function makeMaterial(name: MaterialName, opts: MaterialOpts = {}): THREE.Material {
  const colorHex = resolveColor(opts.color ?? 'primary');
  const flatShading = opts.flatShading ?? true;

  switch (name) {
    case 'toon': {
      const m = new THREE.MeshToonMaterial({ color: colorHex });
      // (MeshToonMaterial doesn't have flatShading; controlled via gradient map)
      return m;
    }
    case 'phong': {
      const m = new THREE.MeshPhongMaterial({
        color: colorHex,
        shininess: opts.shininess ?? 30,
        specular: new THREE.Color(resolveColor(opts.specular ?? 0x111111) as ColorInput),
        flatShading,
        vertexColors: !!opts.vertexColors,
        transparent: opts.opacity != null && opts.opacity < 1,
        opacity: opts.opacity ?? 1,
      });
      if (opts.emissive != null) {
        m.emissive = new THREE.Color(resolveColor(opts.emissive));
        m.emissiveIntensity = opts.emissiveIntensity ?? 1;
      }
      applyTextureSlots(m, opts);
      return m;
    }
    case 'weathered': {
      const m = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: opts.roughness ?? 0.55,
        metalness: opts.metalness ?? 0.6,
        flatShading,
      });
      attachWeathering(m, opts.weathering ?? 0.20, opts.noiseScale ?? 6);
      if (opts.rim != null) attachRim(m, resolveColor(opts.rim), opts.rimIntensity ?? 0.6);
      if (opts.vertexColors) m.vertexColors = true;
      return m;
    }
    case 'bark': {
      const m = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.95,
        metalness: 0.0,
        flatShading,
      });
      attachBark(m, opts.noiseScale ?? 8);
      if (opts.vertexColors) m.vertexColors = true;
      return m;
    }
    case 'screen': {
      const m = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: opts.emissiveIntensity ?? 1.4,
        roughness: 0.4,
        flatShading,
      });
      // Stash blink flag in userData so the runtime tick can pulse it.
      m.userData = m.userData || {};
      m.userData.blink = !!opts.blink;
      m.userData.baseEmit = opts.emissiveIntensity ?? 1.4;
      return m;
    }
    case 'ground': {
      const m = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 1.0,
        metalness: 0.0,
        flatShading,
      });
      if (opts.vertexColors) m.vertexColors = true;
      return m;
    }
    case 'glass': {
      // Upstream's window glass: Phong with high shininess and warm specular.
      const m = new THREE.MeshPhongMaterial({
        color: colorHex,
        shininess: opts.shininess ?? 100,
        specular: new THREE.Color(resolveColor(opts.specular ?? 0xf2efe8)),
        transparent: true,
        opacity: opts.opacity ?? 0.4,
        flatShading: false,
      });
      applyTextureSlots(m, opts);
      return m;
    }
    case 'water': {
      // Upstream's lake water: glossy Phong with optional displacement map.
      // Real animation lives in WaveSurface (lake catalog rebuilds onto a
      // segmented plane and uses WaveSurface for vertex displacement).
      const m = new THREE.MeshPhongMaterial({
        color: colorHex,
        shininess: opts.shininess ?? 500,
        specular: new THREE.Color(resolveColor(opts.specular ?? 0xf2efe8)),
        transparent: true,
        opacity: opts.opacity ?? 0.9,
        flatShading: false,
        depthWrite: false,
      });
      applyTextureSlots(m, opts);
      return m;
    }
    case 'fire': {
      // Inline alpha-flame fragment shader. Color uniforms drive the base/
      // mid/tip colors; alpha falls off along Y.
      // why this isn't `screen`: flames need additive blending + custom alpha.
      const baseRGB = new THREE.Color(colorHex);
      return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uBase: { value: baseRGB },
          uTip: { value: new THREE.Color(0xf3cb21) },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPos;
          void main() {
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uBase;
          uniform vec3 uTip;
          varying vec2 vUv;
          varying vec3 vPos;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main() {
            float h = vUv.y;
            float flicker = hash(vec2(vPos.x * 4.0 + uTime * 3.0, h * 8.0));
            float alpha = (1.0 - h) * (0.6 + flicker * 0.4);
            vec3 col = mix(uBase, uTip, h);
            gl_FragColor = vec4(col, alpha);
          }
        `,
      });
    }
    case 'fireflies': {
      // Points material with a UV-derived disc fragment.
      return new THREE.PointsMaterial({
        color: colorHex,
        size: 0.08,
        sizeAttenuation: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    }
  }
}
