import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Skeleton, MeshCapsule, MeshCyl, MeshBox,
  Walk,
  widgetToEntity,
} from '../src/index.js';

class Hero extends StatelessWidget3D {
  build(_ctx: BuildContext): Widget3D {
    return new Stack3D({ children: [
      new Skeleton({ kind: 'humanoid' }),
      new MeshCapsule({ r: 0.18, l: 0.40, attach: 'chest' }),
      new MeshCyl({ rt: 0.06, rb: 0.06, h: 0.32, attach: 'arm_R' }),
      new Walk({ period: 0.8 }),
    ]});
  }
}
const ent = widgetToEntity('hero', {}, new Hero());
const r = ent.build();
console.log('tickRegistry:', r.object.userData.tickRegistry);
const rig = r.refs.get('rig') as any;
const armR = rig.bones['arm_R'];
console.log('initial arm_R.x:', armR.rotation.x);
r.tick!(0.0, 0.1);
console.log('after frame 1 (t=0.0):', armR.rotation.x);
r.tick!(0.2, 0.1);
console.log('after frame 2 (t=0.2):', armR.rotation.x);
r.tick!(0.4, 0.1);
console.log('after frame 3 (t=0.4):', armR.rotation.x);
