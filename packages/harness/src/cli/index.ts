#!/usr/bin/env node
// CLI entry point — delegates to main.ts
export { main } from './main.ts';
import { main } from './main.ts';

import { pathToFileURL } from 'node:url';
const _isMain = process.argv[1] && (
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
);
if (_isMain) main();
