/**
 * Mode inference — RFC 0045.
 *
 * `mode:` is no longer declared in frontmatter. All tasks default to "leaf".
 * Mode is derived at runtime from artifacts:
 *   - spawn.plan.jsonl exists → spawner
 *   - converge: config present → converger
 *   - body empty → gateway
 *   - otherwise → leaf
 *
 * This function is kept for internal classification only.
 */
import type { TaskMode } from "./schema.ts";

export function inferMode(): TaskMode {
  return "leaf";
}
