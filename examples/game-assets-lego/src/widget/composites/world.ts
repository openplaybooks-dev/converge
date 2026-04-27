// World — high-level scene wrapper composing Sun + Ambient + Hemisphere
// + Shadows + DayNight + optional Fog into one widget. Scenes typically
// look like:
//
//   new World({ daynight: { staticPhase: 'midday' }, child: <homestead> })
//
// To customize lighting, drop World and assemble lights manually.

import * as THREE from 'three';
import { StatelessWidget3D, type BuildContext, type Widget3D } from '../types.js';
import { Stack3D } from '../stack.js';
import {
  Sun,
  AmbientLightWidget,
  HemisphereLightWidget,
} from '../leaves/light-leaves.js';
import { Shadows } from '../inherited/shadows.js';
import { DayNight, type DayPhase, type DayNightFrame, UPSTREAM_PHASES } from '../animation/daynight.js';
import type { ColorInput } from '../../style.js';
import { resolveColor } from '../../style.js';
import { LeafWidget3D } from '../types.js';
import type { Behavior } from '../../entity/types.js';

/**
 * Fog: runs once on the first tick, when the entity root has been added to a
 * THREE.Scene. We walk up `Object3D.parent` until we find a Scene, then set
 * `scene.fog`. After installing once, the tick is a no-op.
 */
class FogInstaller extends LeafWidget3D {
  private readonly o: { color: ColorInput; near: number; far: number };
  constructor(opts: { color: ColorInput; near: number; far: number; key?: string }) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'fog',
      config: o,
      onBuild(ctx) {
        let installed = false;
        const tick = (): void => {
          if (installed) return;
          // Walk up from the entity root to find the Scene.
          let n: THREE.Object3D | null = ctx.root;
          while (n && !(n as THREE.Scene).isScene) n = n.parent;
          if (n) {
            (n as THREE.Scene).fog = new THREE.Fog(resolveColor(o.color), o.near, o.far);
            ctx.refs.set('scene', n);
            installed = true;
          }
        };
        return { ticks: [tick] };
      },
    }];
  }
}

interface WorldOpts {
  child: Widget3D;
  /** DayNight options — pass to control time-of-day. Defaults to staticPhase: 'midday'. */
  daynight?: {
    cyclePeriod?: number;
    startPhase?: DayPhase;
    staticPhase?: DayPhase;
    frames?: Partial<Record<DayPhase, DayNightFrame>>;
    nightLights?: ReadonlyArray<string>;
    nightEffects?: ReadonlyArray<string>;
  };
  /** Sun shadow camera bounds (orthographic). Default ±100. */
  sunShadow?: { left: number; right: number; top: number; bottom: number; near: number; far: number };
  /** Sun shadow map size (square). Default 2048. */
  sunShadowMapSize?: number;
  /** Fog near/far in scene units. Default 80/300. Pass null to disable fog. */
  fog?: { near: number; far: number; color?: ColorInput } | null;
  /** Disable shadow casting/receiving on descendants. Default both true. */
  shadowsCast?: boolean;
  shadowsReceive?: boolean;
  key?: string;
}

export class World extends StatelessWidget3D {
  readonly o: WorldOpts;
  constructor(opts: WorldOpts) {
    super({ key: opts.key });
    this.o = opts;
  }

  override build(_ctx: BuildContext): Widget3D {
    const o = this.o;
    const sunShadow = o.sunShadow ?? { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 400 };
    const sunShadowMapSize = o.sunShadowMapSize ?? 2048;

    // Pick initial sun position from the chosen phase so static mode looks correct
    // before the DayNight tick has run.
    const initialPhase: DayPhase =
      o.daynight?.staticPhase ?? o.daynight?.startPhase ?? 'midday';
    const initialFrame = UPSTREAM_PHASES[initialPhase];

    const lights: Widget3D[] = [
      new Sun({
        tag: 'sun',
        at: initialFrame.sunPosition,
        color: initialFrame.sunColor,
        intensity: initialFrame.sunIntensity,
        target: [0, 0, 0],
        castShadow: true,
        shadowMapSize: sunShadowMapSize,
        shadowBias: -0.0001,
        shadowCamera: sunShadow,
      }),
      new AmbientLightWidget({
        tag: 'ambient',
        color: 'white',
        intensity: initialFrame.ambientIntensity,
      }),
      new HemisphereLightWidget({
        tag: 'hemisphere',
        skyColor: 0xeae2d8,
        groundColor: 0x4a4a52,
        intensity: initialFrame.hemisphereIntensity,
      }),
      new DayNight(o.daynight ?? { staticPhase: 'midday' }),
    ];

    const fogChild =
      o.fog === null
        ? undefined
        : new FogInstaller({
            color: o.fog?.color ?? initialFrame.fogColor ?? 0xc0d8e8,
            near: o.fog?.near ?? 80,
            far: o.fog?.far ?? 300,
          });

    // Shadows wraps the user's child so descendant Mesh widgets pick up
    // cast/receive defaults.
    const wrapped = new Shadows({
      cast: o.shadowsCast ?? true,
      receive: o.shadowsReceive ?? true,
      child: o.child,
    });

    const children: Widget3D[] = [...lights];
    if (fogChild) children.push(fogChild);
    children.push(wrapped);

    return new Stack3D({
      name: 'world',
      children,
    });
  }
}
