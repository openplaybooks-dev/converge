/**
 * Filter SWE-bench instances by repo, instance IDs, or limit.
 */

import type { SWEBenchInstance } from "./types.ts";

export interface FilterOptions {
  /** Filter to specific repo(s), e.g. ["django/django"] */
  repos?: string[];
  /** Filter to specific instance IDs, e.g. ["django__django-16379"] */
  instanceIds?: string[];
  /** Maximum number of instances to return */
  limit?: number;
}

/**
 * Filter instances based on provided criteria.
 * Filters are applied in order: repos → instanceIds → limit.
 */
export function filterInstances(
  instances: SWEBenchInstance[],
  opts: FilterOptions,
): SWEBenchInstance[] {
  let result = instances;

  if (opts.repos?.length) {
    const repoSet = new Set(opts.repos);
    result = result.filter((i) => repoSet.has(i.repo));
  }

  if (opts.instanceIds?.length) {
    const idSet = new Set(opts.instanceIds);
    result = result.filter((i) => idSet.has(i.instance_id));
  }

  if (opts.limit !== undefined && opts.limit > 0) {
    result = result.slice(0, opts.limit);
  }

  return result;
}
