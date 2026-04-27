// DayNight — cascading-animation widget that drives Sun + Ambient +
// Hemisphere lights (and optional fog/background) through the four phases
// upstream uses: sunrise, midday, sunset, midnight.
//
// Lights are looked up from ctx.refs by tag (default 'sun', 'ambient',
// 'hemisphere'). Two modes:
//   - cyclePeriod set: smoothly interpolates between phases over N seconds
//     (full cycle: sunrise → midday → sunset → midnight → sunrise).
//   - cyclePeriod undefined: snap to staticPhase at build time. Useful for
//     screenshots and per-scene fixed lighting.
//
// nightLights: tag list of THREE.Light objects toggled `visible: true`
// during sunset+midnight (lampposts, campfire). nightEffects: tag list
// of any THREE.Object3D toggled (fireflies, flame).

import * as THREE from 'three';
import { LeafWidget3D, type BuildContext } from '../types.js';
import type { Behavior } from '../../entity/types.js';
import type { Tick } from '../../types.js';
import type { ColorInput } from '../../style.js';
import { resolveColor } from '../../style.js';

export type DayPhase = 'sunrise' | 'midday' | 'sunset' | 'midnight';

const PHASE_ORDER: ReadonlyArray<DayPhase> = ['sunrise', 'midday', 'sunset', 'midnight'];

export interface DayNightFrame {
  sunIntensity: number;
  sunColor: ColorInput;
  sunPosition: [number, number, number];
  ambientIntensity: number;
  hemisphereIntensity: number;
  background?: ColorInput;
  fogColor?: ColorInput;
}

/** Upstream's lightParams (js/main.js:237) — exact values. */
export const UPSTREAM_PHASES: Record<DayPhase, DayNightFrame> = {
  sunrise: {
    sunIntensity: 0.75,
    sunColor: 0xffba87,
    sunPosition: [63, 76, -11],   // upstream is 630/760/-110 — scaled 10× to match our units
    ambientIntensity: 0.3,
    hemisphereIntensity: 0.6,
    background: 0xfdb487,
    fogColor: 0xfdb487,
  },
  midday: {
    sunIntensity: 0.55,
    sunColor: 0xffe1a3,
    sunPosition: [-28, 70, 35],
    ambientIntensity: 0.3,
    hemisphereIntensity: 0.65,
    background: 0x9ed4f0,
    fogColor: 0xc0d8e8,
  },
  sunset: {
    sunIntensity: 0.75,
    sunColor: 0xffba87,
    sunPosition: [-29, 76, 90],
    ambientIntensity: 0.3,
    hemisphereIntensity: 0.6,
    background: 0xe88862,
    fogColor: 0xe88862,
  },
  midnight: {
    sunIntensity: 0.08,
    sunColor: 0xa0a8c8,
    sunPosition: [-42, 80, 37],
    ambientIntensity: 0.08,
    hemisphereIntensity: 0.08,
    background: 0x0e1428,
    fogColor: 0x0e1428,
  },
};

interface DayNightOpts {
  sunTag?: string;
  ambientTag?: string;
  hemisphereTag?: string;
  frames?: Partial<Record<DayPhase, DayNightFrame>>;
  cyclePeriod?: number;
  startPhase?: DayPhase;
  staticPhase?: DayPhase;
  nightLights?: ReadonlyArray<string>;
  nightEffects?: ReadonlyArray<string>;
  /** If a THREE.Scene is reachable via ctx.refs['scene'], also tint background/fog. */
  driveScene?: boolean;
  key?: string;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpColor(a: number, b: number, t: number, out: THREE.Color): THREE.Color {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  out.setRGB(lerp(ar, br, t) / 255, lerp(ag, bg, t) / 255, lerp(ab, bb, t) / 255);
  return out;
}
function lerpVec3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export class DayNight extends LeafWidget3D {
  readonly o: DayNightOpts;
  constructor(opts: DayNightOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }

  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    const sunTag = o.sunTag ?? 'sun';
    const ambientTag = o.ambientTag ?? 'ambient';
    const hemisphereTag = o.hemisphereTag ?? 'hemisphere';

    // Merge user overrides into upstream phase table.
    const phases: Record<DayPhase, DayNightFrame> = {
      sunrise: { ...UPSTREAM_PHASES.sunrise, ...o.frames?.sunrise },
      midday:  { ...UPSTREAM_PHASES.midday,  ...o.frames?.midday },
      sunset:  { ...UPSTREAM_PHASES.sunset,  ...o.frames?.sunset },
      midnight:{ ...UPSTREAM_PHASES.midnight,...o.frames?.midnight },
    };

    return [{
      kind: 'daynight',
      config: {
        cyclePeriod: o.cyclePeriod, startPhase: o.startPhase, staticPhase: o.staticPhase,
        nightLights: o.nightLights ?? [], nightEffects: o.nightEffects ?? [],
      },
      onBuild(ctx) {
        const sun = ctx.refs.get(sunTag) as THREE.DirectionalLight | undefined;
        const ambient = ctx.refs.get(ambientTag) as THREE.AmbientLight | undefined;
        const hemisphere = ctx.refs.get(hemisphereTag) as THREE.HemisphereLight | undefined;
        if (!sun) console.warn(`[DayNight] no Sun tagged '${sunTag}'`);

        const applyFrame = (f: DayNightFrame, t: number, fNext: DayNightFrame): void => {
          // Lerp between f and fNext by t.
          if (sun) {
            sun.intensity = lerp(f.sunIntensity, fNext.sunIntensity, t);
            const color = sun.color;
            lerpColor(resolveColor(f.sunColor), resolveColor(fNext.sunColor), t, color);
            const p = lerpVec3(f.sunPosition, fNext.sunPosition, t);
            sun.position.set(p[0], p[1], p[2]);
          }
          if (ambient) ambient.intensity = lerp(f.ambientIntensity, fNext.ambientIntensity, t);
          if (hemisphere) hemisphere.intensity = lerp(f.hemisphereIntensity, fNext.hemisphereIntensity, t);

          if (o.driveScene !== false) {
            // Find the scene by walking up from the entity root once, cache.
            let scene = ctx.refs.get('scene') as THREE.Scene | undefined;
            if (!scene) {
              let n: THREE.Object3D | null = ctx.root;
              while (n && !(n as THREE.Scene).isScene) n = n.parent;
              if (n) {
                scene = n as THREE.Scene;
                ctx.refs.set('scene', scene);
              }
            }
            if (scene) {
              const bgA = resolveColor(f.background ?? 0x000000);
              const bgB = resolveColor(fNext.background ?? 0x000000);
              const bg = (scene.background as THREE.Color) instanceof THREE.Color
                ? (scene.background as THREE.Color)
                : new THREE.Color();
              lerpColor(bgA, bgB, t, bg);
              scene.background = bg;
              if (scene.fog && (scene.fog as THREE.Fog).color) {
                const fA = resolveColor(f.fogColor ?? f.background ?? 0x000000);
                const fB = resolveColor(fNext.fogColor ?? fNext.background ?? 0x000000);
                lerpColor(fA, fB, t, (scene.fog as THREE.Fog).color);
              }
            }
          }
        };

        const toggleNight = (isNight: boolean): void => {
          for (const tag of o.nightLights ?? []) {
            const light = ctx.refs.get(tag) as THREE.Light | undefined;
            if (light) light.visible = isNight;
          }
          for (const tag of o.nightEffects ?? []) {
            const obj = ctx.refs.get(tag) as THREE.Object3D | undefined;
            if (obj) obj.visible = isNight;
          }
        };

        // Static mode — apply once on the first tick (after the entity root is
        // parented under a Scene so background/fog tinting works).
        if (o.cyclePeriod === undefined) {
          const phase = o.staticPhase ?? 'midday';
          let applied = false;
          const tick: Tick = () => {
            applyFrame(phases[phase], 0, phases[phase]);
            toggleNight(phase === 'sunset' || phase === 'midnight');
            // After the first tick the scene background may be re-derived from
            // a single Color object; stop redoing the work on subsequent frames
            // unless we want continuous tinting (we don't, in static mode).
            if (applied) return;
            applied = true;
          };
          return { ticks: [tick] };
        }

        // Cycle mode — register a tick that interpolates.
        const period = o.cyclePeriod;
        const startIdx = PHASE_ORDER.indexOf(o.startPhase ?? 'midday');
        const tick: Tick = (timeS) => {
          // Map t to position in cycle [0..4) where each integer step is a phase.
          const u = ((timeS / (period / 4)) + startIdx) % 4;
          const i = Math.floor(u);
          const frac = u - i;
          const a = PHASE_ORDER[i];
          const b = PHASE_ORDER[(i + 1) % PHASE_ORDER.length];
          applyFrame(phases[a], frac, phases[b]);
          // Night = approximately when we're between sunset (i=2) and after midnight (i=3 → 4≈0=sunrise).
          const isNight = i === 2 || i === 3;
          toggleNight(isNight);
        };
        return { ticks: [tick] };
      },
    }];
  }
}
