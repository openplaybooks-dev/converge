/**
 * Converge Client SDK
 *
 * Entry point for the client SDK, used by external WBS scripts
 * to interact with the converge framework.
 *
 * Usage:
 * ```javascript
 * const { createClient } = require('@converge/core/client');
 * const client = createClient();
 *
 * client.spawn({ id: 'my-task', title: 'My Task' });
 * ```
 */

import { ConvergeClient } from "./converge-client.ts";

export { ConvergeClient } from "./converge-client.ts";
export type { ConvergeClientContext, SpawnedTask } from "./types.ts";

/**
 * Create a new ConvergeClient instance.
 * Convenience factory — equivalent to `new ConvergeClient()`.
 */
export function createClient(): ConvergeClient {
  return new ConvergeClient();
}
