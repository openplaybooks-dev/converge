// Hero — full character builder with pluggable body / face / clothing /
// accessory slots and a ~70-bone detailed humanoid rig.
//
// Slot resolution: `null` = intentionally omit; `undefined` = use the
// `defaultXxx(ctx)` virtual (which subclasses override for variants).
//
// Layering order: Skeleton → body → head → hair → shirt → pants → shoes →
// belt → hat → accessories (weaponR/L/back) → animation. All wrapped in a
// single Stack3D scaled by `height`.
//
// Existing Crowd's Palette role names (skin/shirt/pants) are preserved by
// the body and clothing toolkit defaults, so Crowd works unchanged.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Skeleton,
  Idle,
  DefaultBody, Head, DefaultFace, SkinnedBody,
  Shirt, Pants, Shoes, Hat, Hair, Belt,
  widgetToAssetModule,
} from '@lego';

export type BodyWidget   = Widget3D;
export type HeadWidget   = Widget3D;
export type FaceWidget   = Widget3D;
export type HairWidget   = Widget3D;
export type ShirtWidget  = Widget3D;
export type PantsWidget  = Widget3D;
export type ShoesWidget  = Widget3D;
export type HatWidget    = Widget3D;
export type BeltWidget   = Widget3D;

export interface HeroOpts {
  /** Body widget that renders torso/arms/legs/hands/feet. Default: DefaultBody. */
  body?: BodyWidget;
  /** Head widget. Default: Head with a DefaultFace nested. */
  head?: HeadWidget;
  /** Face composed inside the default Head. `null` to omit. */
  face?: FaceWidget | null;
  /** Hair on top of the head. `null` to omit. */
  hair?: HairWidget | null;
  /** Shirt layer over torso + arms. `null` to omit. */
  shirt?: ShirtWidget | null;
  /** Pants layer over hips + legs. `null` to omit. */
  pants?: PantsWidget | null;
  /** Shoes over feet. `null` to omit. */
  shoes?: ShoesWidget | null;
  /** Hat over head/hair. `null` (default) to omit. */
  hat?: HatWidget | null;
  /** Belt around pelvis. `null` (default) to omit. */
  belt?: BeltWidget | null;
  /** Right-hand accessory; widget should attach to `weapon_mount_R`. */
  weaponR?: Widget3D | null;
  /** Left-hand accessory. */
  weaponL?: Widget3D | null;
  /** Back accessory (cape, backpack). Widget attaches to `back_slot`. */
  back?: Widget3D | null;
  /** Top-level animation widget. Default: Idle. `null` to omit. */
  animation?: Widget3D | null;
  /** Vertical scale (1.0 = adult, 0.85 = teen, 0.65 = child). */
  height?: number;
  /** Body build affecting limb thickness and torso width. */
  build?: 'thin' | 'average' | 'broad';
  seed?: number;
  /** Skeleton kind: detailed (~70 bones) or legacy (18 bones). */
  rig?: 'humanoid' | 'detailed-humanoid';

  /**
   * Body rendering mode:
   * - 'parts'   (default) — separate primitive meshes per limb segment, rigid-attached
   * - 'skinned' — one continuous SkinnedMesh that bends smoothly at joints
   * - 'realistic' — async-load Quaternius glTF (requires `realisticAsset`)
   */
  bodyMode?: 'parts' | 'skinned' | 'realistic';

  // ── Skinned-body-only parameters (forwarded to SkinnedBody) ──
  shoulderWidth?: number;
  waistWidth?: number;
  hipWidth?: number;
  chestDepth?: number;
  muscleDefinition?: number;
  legLength?: number;
  armLength?: number;
  headSize?: number;
  neckThickness?: number;

  /** Path to glTF for bodyMode === 'realistic'. */
  realisticAsset?: string;

  key?: string;
}

export class Hero extends StatelessWidget3D {
  protected readonly o: HeroOpts;
  constructor(opts: HeroOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }

  // ── Variant override hooks ──────────────────────────────────────────────

  protected defaultBody(_ctx: BuildContext): BodyWidget {
    const o = this.o;
    const mode = o.bodyMode ?? 'parts';
    if (mode === 'skinned') {
      return new SkinnedBody({
        build: o.build,
        height: o.height,
        shoulderWidth: o.shoulderWidth,
        waistWidth: o.waistWidth,
        hipWidth: o.hipWidth,
        chestDepth: o.chestDepth,
        muscleDefinition: o.muscleDefinition,
        legLength: o.legLength,
        armLength: o.armLength,
        headSize: o.headSize,
        neckThickness: o.neckThickness,
      });
    }
    // 'realistic' branch lands when Phase 5 ships RealisticBody.
    return new DefaultBody({ build: o.build, withFingers: true });
  }
  protected defaultHead(ctx: BuildContext): HeadWidget {
    const face = this.o.face === null ? null : this.defaultFace(ctx);
    // In skinned/realistic modes the head is part of the merged body mesh —
    // only the face widget overlays.
    if (this.o.bodyMode === 'skinned' || this.o.bodyMode === 'realistic') {
      return face ?? new Stack3D({ name: 'head_omit', children: [] });
    }
    return new Head({ shape: 'round', face });
  }
  protected defaultFace(_ctx: BuildContext): FaceWidget | null {
    return new DefaultFace({});
  }
  protected defaultHair(_ctx: BuildContext): HairWidget | null {
    return new Hair({ style: 'short' });
  }
  protected defaultShirt(_ctx: BuildContext): ShirtWidget | null {
    return new Shirt({ sleeveLength: 'long' });
  }
  protected defaultPants(_ctx: BuildContext): PantsWidget | null {
    return new Pants({ length: 'long' });
  }
  protected defaultShoes(_ctx: BuildContext): ShoesWidget | null {
    return new Shoes({ style: 'sneaker' });
  }
  protected defaultHat(_ctx: BuildContext): HatWidget | null {
    return null;
  }
  protected defaultBelt(_ctx: BuildContext): BeltWidget | null {
    return null;
  }
  protected defaultAnimation(_ctx: BuildContext): Widget3D | null {
    return new Idle();
  }

  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const rigKind = o.rig ?? 'detailed-humanoid';

    const body  = o.body  ?? this.defaultBody(ctx);
    const head  = o.head  ?? this.defaultHead(ctx);
    const hair  = o.hair  === null ? null : (o.hair  ?? this.defaultHair(ctx));
    const shirt = o.shirt === null ? null : (o.shirt ?? this.defaultShirt(ctx));
    const pants = o.pants === null ? null : (o.pants ?? this.defaultPants(ctx));
    const shoes = o.shoes === null ? null : (o.shoes ?? this.defaultShoes(ctx));
    const hat   = o.hat   === null ? null : (o.hat   ?? this.defaultHat(ctx));
    const belt  = o.belt  === null ? null : (o.belt  ?? this.defaultBelt(ctx));
    const animation = o.animation === null ? null : (o.animation ?? this.defaultAnimation(ctx));

    const children: Widget3D[] = [
      new Skeleton({ kind: rigKind }),
      body,
      head,
    ];
    if (hair)  children.push(hair);
    if (shirt) children.push(shirt);
    if (pants) children.push(pants);
    if (shoes) children.push(shoes);
    if (belt)  children.push(belt);
    if (hat)   children.push(hat);
    if (o.weaponR) children.push(o.weaponR);
    if (o.weaponL) children.push(o.weaponL);
    if (o.back)    children.push(o.back);
    if (animation) children.push(animation);

    return new Stack3D({
      name: 'hero',
      scale: o.height ?? 1.0,
      children,
    });
  }
}

export default widgetToAssetModule(
  'hero',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Hero',
    description: 'Detailed humanoid with body / head / face / hair / clothing / accessory slots and a ~70-bone rig.',
  },
  new Hero(),
);
