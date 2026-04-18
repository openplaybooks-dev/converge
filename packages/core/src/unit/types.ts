/**
 * Unit module types.
 */

import type { Gap } from "../gap/types.ts";

export interface UnitConfig {
  /** Maximum iterations before stopping */
  maxIterations: number;
  /** Output files/artifacts */
  outputs?: string[];
  /** Whether this unit blocks downstream units */
  blocking?: boolean;
}

export interface CheckResult {
  passed: boolean;
  gaps: Gap[];
}
