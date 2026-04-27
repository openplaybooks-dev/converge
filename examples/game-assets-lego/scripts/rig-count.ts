import * as THREE from 'three';
import { Rig, materializeRig } from '../src/rig.js';

const beh = Rig.detailedHumanoid();
// Trick: behavior config has the count.
console.log('bone count via config:', (beh.config as any).boneCount);
