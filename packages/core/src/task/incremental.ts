export interface IncrementalContextParams {
  materialization?: string;
  priorRunResults?: Record<string, unknown> | null;
  fullRefresh?: boolean;
}

export interface IncrementalContext {
  is_incremental: boolean;
  this_state: Record<string, unknown> | null;
}

export function computeIncrementalContext(
  params: IncrementalContextParams,
): IncrementalContext {
  if (params.materialization !== "incremental") {
    return { is_incremental: false, this_state: null };
  }
  if (params.fullRefresh) {
    return { is_incremental: false, this_state: null };
  }
  if (!params.priorRunResults) {
    return { is_incremental: false, this_state: null };
  }
  return { is_incremental: true, this_state: params.priorRunResults };
}
