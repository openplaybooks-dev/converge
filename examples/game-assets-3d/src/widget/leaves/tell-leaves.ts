// Tell leaf widgets — wrap the Tell.* behavior factories so authors put
// hand-made details in the widget tree.

import { Tell } from '../../entity/behaviors/tell.js';
import type { Behavior } from '../../entity/types.js';
import type { BoneRef } from '../../rig.js';
import { LeafWidget3D, type BuildContext } from '../types.js';

interface TellCommon { on?: string; key?: string }

export class MossPatch extends LeafWidget3D {
  private readonly o: TellCommon & {
    position?: [number, number, number];
    side?: 'north' | 'south' | 'east' | 'west';
    area?: number;
  };
  constructor(opts: TellCommon & {
    position?: [number, number, number];
    side?: 'north' | 'south' | 'east' | 'west';
    area?: number;
  } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Tell.mossPatch(this.o)];
  }
}

export class Dent extends LeafWidget3D {
  private readonly o: TellCommon & { position?: [number, number, number]; depth?: number };
  constructor(opts: TellCommon & { position?: [number, number, number]; depth?: number } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Tell.dent(this.o)];
  }
}

export class MissingRivet extends LeafWidget3D {
  private readonly o: TellCommon & { position?: [number, number, number] };
  constructor(opts: TellCommon & { position?: [number, number, number] } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Tell.missingRivet(this.o)];
  }
}

export class HeadTilt extends LeafWidget3D {
  private readonly o: { boneRef?: BoneRef; deg?: number; axis?: 'x' | 'y' | 'z'; key?: string };
  constructor(opts: { boneRef?: BoneRef; deg?: number; axis?: 'x' | 'y' | 'z'; key?: string } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Tell.headTilt(this.o)];
  }
}
