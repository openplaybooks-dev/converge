import * as mod from '../catalog/nature/tree-pine.js';

console.log('mod keys:', Object.keys(mod));
console.log('typeof mod.default:', typeof mod.default);
console.log('mod.default keys:', mod.default ? Object.keys(mod.default) : 'undefined');
console.log('typeof mod.default.default:', typeof (mod.default as any).default);
