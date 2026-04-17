/**
 * Harness Client SDK
 *
 * Entry point for the client SDK, used by external WBS scripts
 * to interact with the harness framework.
 *
 * Usage:
 * ```javascript
 * const { createClient } = require('harness/client');
 * const harness = createClient();
 *
 * harness.spawn({ id: 'my-task', title: 'My Task' });
 * ```
 */

import { HarnessClient } from './harness-client.ts';

export { HarnessClient } from './harness-client.ts';
export type { HarnessClientContext, SpawnedTask } from './types.ts';

/**
 * Create a new HarnessClient instance.
 * Convenience factory — equivalent to `new HarnessClient()`.
 */
export function createClient(): HarnessClient {
  return new HarnessClient();
}
