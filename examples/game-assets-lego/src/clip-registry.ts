// Clip registry — named clips reusable across entities. Built-ins (idle, walk,
// wave, bob, spin) register at module import; users add their own with Clips.register.

import { Clip, type AuthoredClip } from './clip.js';

const REGISTRY = new Map<string, AuthoredClip>();

export const Clips = {
  register(clip: AuthoredClip): void {
    REGISTRY.set(clip.spec.name, clip);
  },
  get(name: string): AuthoredClip {
    const c = REGISTRY.get(name);
    if (!c) {
      throw new Error(
        `[clip] Unknown clip '${name}'. Registered: ${[...REGISTRY.keys()].join(', ')}`,
      );
    }
    return c;
  },
  has(name: string): boolean {
    return REGISTRY.has(name);
  },
  list(tag?: string): string[] {
    if (!tag) return [...REGISTRY.keys()];
    return [...REGISTRY.entries()]
      .filter(([, c]) => (c.spec.tags ?? []).includes(tag))
      .map(([n]) => n);
  },
} as const;

// ── Built-in clips ────────────────────────────────────────────────────────

Clips.register(
  Clip.author({
    name: 'idle',
    duration: 4,
    loop: 'repeat',
    tags: ['idle'],
    tracks: [Clip.sine({ bone: 'spine', kind: 'rotation', axis: 'x', amplitude: 0.02, period: 4 })],
  }),
);

Clips.register(
  Clip.author({
    name: 'walk',
    duration: 0.8,
    loop: 'repeat',
    tags: ['locomotion'],
    tracks: [
      Clip.sine({ bone: 'arm_R', kind: 'rotation', axis: 'x', amplitude: 0.6, period: 0.8 }),
      Clip.sine({ bone: 'arm_L', kind: 'rotation', axis: 'x', amplitude: 0.6, period: 0.8, phase: Math.PI }),
      Clip.sine({ bone: 'leg_R', kind: 'rotation', axis: 'x', amplitude: 0.5, period: 0.8, phase: Math.PI }),
      Clip.sine({ bone: 'leg_L', kind: 'rotation', axis: 'x', amplitude: 0.5, period: 0.8 }),
    ],
  }),
);

Clips.register(
  Clip.author({
    name: 'wave',
    duration: 1.5,
    loop: 'once',
    tags: ['gesture'],
    tracks: [
      {
        bone: 'arm_R',
        kind: 'rotation',
        keys: [
          { t: 0.0, v: [0, 0,  0],   ease: 'smooth' },
          { t: 0.4, v: [0, 0, -2.4], ease: 'smooth' },
          { t: 1.5, v: [0, 0,  0],   ease: 'smooth' },
        ],
      },
      {
        bone: 'hand_R',
        kind: 'rotation',
        keys: [
          { t: 0.4, v: [0,  0.6, 0], ease: 'smooth' },
          { t: 0.7, v: [0, -0.6, 0], ease: 'smooth' },
          { t: 1.0, v: [0,  0.6, 0], ease: 'smooth' },
          { t: 1.3, v: [0,  0,   0], ease: 'smooth' },
        ],
      },
      {
        bone: 'head',
        kind: 'rotation',
        keys: [
          { t: 0.0, v: [0,  0,    0], ease: 'smooth' },
          { t: 0.5, v: [0, -0.25, 0], ease: 'smooth' },
          { t: 1.5, v: [0,  0,    0], ease: 'smooth' },
        ],
      },
    ],
  }),
);

Clips.register(
  Clip.author({
    name: 'bob',
    duration: 2,
    loop: 'repeat',
    tags: ['idle', 'ambient'],
    tracks: [Clip.sine({ bone: 'root', kind: 'position', axis: 'y', amplitude: 0.05, period: 2 })],
  }),
);

Clips.register(
  Clip.author({
    name: 'spin',
    duration: 4,
    loop: 'repeat',
    tags: ['ambient'],
    tracks: [
      {
        bone: 'root',
        kind: 'rotation',
        keys: [
          { t: 0, v: [0, 0, 0] },
          { t: 4, v: [0, Math.PI * 2, 0] },
        ],
      },
    ],
  }),
);

// ── Run — faster gait, larger amplitude, with root bounce ──
Clips.register(
  Clip.author({
    name: 'run',
    duration: 0.5,
    loop: 'repeat',
    tags: ['locomotion'],
    tracks: [
      Clip.sine({ bone: 'arm_R', kind: 'rotation', axis: 'x', amplitude: 1.0, period: 0.5 }),
      Clip.sine({ bone: 'arm_L', kind: 'rotation', axis: 'x', amplitude: 1.0, period: 0.5, phase: Math.PI }),
      Clip.sine({ bone: 'leg_R', kind: 'rotation', axis: 'x', amplitude: 0.85, period: 0.5, phase: Math.PI }),
      Clip.sine({ bone: 'leg_L', kind: 'rotation', axis: 'x', amplitude: 0.85, period: 0.5 }),
      Clip.sine({ bone: 'root',  kind: 'position', axis: 'y', amplitude: 0.06, period: 0.25 }),
    ],
  }),
);

// ── Jump — single-shot crouch + extension + land ──
Clips.register(
  Clip.author({
    name: 'jump',
    duration: 0.9,
    loop: 'once',
    tags: ['gesture', 'locomotion'],
    tracks: [
      { bone: 'leg_R', kind: 'rotation', keys: [
        { t: 0, v: [0, 0, 0] },
        { t: 0.2, v: [0.6, 0, 0] },
        { t: 0.4, v: [-0.3, 0, 0] },
        { t: 0.9, v: [0, 0, 0] },
      ]},
      { bone: 'leg_L', kind: 'rotation', keys: [
        { t: 0, v: [0, 0, 0] },
        { t: 0.2, v: [0.6, 0, 0] },
        { t: 0.4, v: [-0.3, 0, 0] },
        { t: 0.9, v: [0, 0, 0] },
      ]},
      { bone: 'root', kind: 'position', keys: [
        { t: 0, v: [0, 0, 0], ease: 'smooth' },
        { t: 0.2, v: [0, -0.15, 0], ease: 'smooth' },
        { t: 0.5, v: [0, 0.55, 0], ease: 'smooth' },
        { t: 0.9, v: [0, 0, 0], ease: 'smooth' },
      ]},
    ],
  }),
);

// ── Sit — crouched pose, brief ──
Clips.register(
  Clip.author({
    name: 'sit',
    duration: 1.0,
    loop: 'once',
    tags: ['gesture'],
    tracks: [
      { bone: 'leg_R', kind: 'rotation', keys: [
        { t: 0, v: [0, 0, 0] },
        { t: 0.5, v: [1.5, 0, 0] },
        { t: 1.0, v: [1.5, 0, 0] },
      ]},
      { bone: 'leg_L', kind: 'rotation', keys: [
        { t: 0, v: [0, 0, 0] },
        { t: 0.5, v: [1.5, 0, 0] },
        { t: 1.0, v: [1.5, 0, 0] },
      ]},
      { bone: 'root', kind: 'position', keys: [
        { t: 0, v: [0, 0, 0] },
        { t: 0.5, v: [0, -0.4, 0] },
        { t: 1.0, v: [0, -0.4, 0] },
      ]},
    ],
  }),
);

// ── Wave both arms ──
Clips.register(
  Clip.author({
    name: 'wave_both',
    duration: 1.5,
    loop: 'once',
    tags: ['gesture'],
    tracks: [
      { bone: 'arm_R', kind: 'rotation', keys: [
        { t: 0, v: [0, 0, 0] },
        { t: 0.4, v: [0, 0, -2.4] },
        { t: 1.5, v: [0, 0, 0] },
      ]},
      { bone: 'arm_L', kind: 'rotation', keys: [
        { t: 0, v: [0, 0, 0] },
        { t: 0.4, v: [0, 0, 2.4] },
        { t: 1.5, v: [0, 0, 0] },
      ]},
      { bone: 'hand_R', kind: 'rotation', keys: [
        { t: 0.4, v: [0, 0.6, 0] },
        { t: 0.7, v: [0, -0.6, 0] },
        { t: 1.0, v: [0, 0.6, 0] },
        { t: 1.3, v: [0, 0, 0] },
      ]},
      { bone: 'hand_L', kind: 'rotation', keys: [
        { t: 0.4, v: [0, -0.6, 0] },
        { t: 0.7, v: [0, 0.6, 0] },
        { t: 1.0, v: [0, -0.6, 0] },
        { t: 1.3, v: [0, 0, 0] },
      ]},
    ],
  }),
);

// ── Clap — repeating arm-meet at chest ──
Clips.register(
  Clip.author({
    name: 'clap',
    duration: 0.6,
    loop: 'repeat',
    tags: ['gesture'],
    tracks: [
      Clip.sine({ bone: 'arm_R', kind: 'rotation', axis: 'z', amplitude: -0.8, period: 0.6 }),
      Clip.sine({ bone: 'arm_L', kind: 'rotation', axis: 'z', amplitude: 0.8, period: 0.6 }),
      Clip.sine({ bone: 'arm_R', kind: 'rotation', axis: 'x', amplitude: -1.2, period: 0.6, phase: Math.PI / 2 }),
      Clip.sine({ bone: 'arm_L', kind: 'rotation', axis: 'x', amplitude: -1.2, period: 0.6, phase: Math.PI / 2 }),
    ],
  }),
);

// ── Nod (head only) ──
Clips.register(
  Clip.author({
    name: 'nod',
    duration: 0.8,
    loop: 'repeat',
    tags: ['gesture'],
    tracks: [Clip.sine({ bone: 'head', kind: 'rotation', axis: 'x', amplitude: 0.35, period: 0.8 })],
  }),
);

// ── Shake head (head only) ──
Clips.register(
  Clip.author({
    name: 'shake_head',
    duration: 0.7,
    loop: 'repeat',
    tags: ['gesture'],
    tracks: [Clip.sine({ bone: 'head', kind: 'rotation', axis: 'y', amplitude: 0.5, period: 0.7 })],
  }),
);
