/**
 * Interceptor Registry — Middleware Pattern for Framework Extension
 *
 * Unlike fire-and-forget hooks, interceptors can modify payloads,
 * transform results, or block execution entirely. Uses a Koa-style
 * next() chain where each interceptor wraps the next.
 *
 * Error isolation: interceptor failures are caught and logged —
 * the chain continues without the failing interceptor.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type InterceptorFn<T = unknown> = (
  payload: T,
  next: () => Promise<T>,
) => Promise<T>;

export type InterceptEvent =
  | "intercept:task-execute"
  | "intercept:check-evaluate"
  | "intercept:dag-compile"
  | "intercept:skill-resolve"
  | "intercept:error-classify"
  | "intercept:retry-decide";

interface InterceptorRegistration {
  fn: InterceptorFn<any>;
  priority: number;
}

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */

export class InterceptorRegistry {
  private registrations = new Map<InterceptEvent, InterceptorRegistration[]>();

  /**
   * Register an interceptor for an event.
   * Lower priority number = runs first (wraps the rest).
   */
  register<T>(
    event: InterceptEvent,
    fn: InterceptorFn<T>,
    priority: number = 100,
  ): void {
    if (!this.registrations.has(event)) {
      this.registrations.set(event, []);
    }
    const list = this.registrations.get(event)!;
    list.push({ fn, priority });
    list.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Run the middleware chain for `event`, wrapping `coreFn`.
   *
   * Interceptors execute in priority order (lowest first).
   * Each calls next() to proceed; not calling next() blocks downstream.
   * A failing interceptor is skipped — the chain continues without it.
   */
  async intercept<T>(
    event: InterceptEvent,
    payload: T,
    coreFn: (p: T) => Promise<T>,
  ): Promise<T> {
    const list = this.registrations.get(event);
    if (!list || list.length === 0) {
      return coreFn(payload);
    }

    // Filter out failing interceptors by building a safe chain.
    // We build the chain from inside-out: coreFn is innermost,
    // highest-priority interceptor is outermost.
    const safeInterceptors = list.map((reg) => reg.fn);

    // Build chain from right to left (last interceptor wraps coreFn,
    // first interceptor wraps everything)
    let chain: (p: T) => Promise<T> = coreFn;

    for (let i = safeInterceptors.length - 1; i >= 0; i--) {
      const interceptor = safeInterceptors[i];
      const downstream = chain;
      chain = async (p: T) => {
        try {
          return await interceptor(p, () => downstream(p));
        } catch (err: any) {
          const msg = err?.message ?? String(err);
          console.warn(
            `[InterceptorRegistry] Interceptor error in '${event}': ${msg}`,
          );
          // Skip this interceptor, continue with downstream
          return downstream(p);
        }
      };
    }

    return chain(payload);
  }

  /** Returns true if any interceptor is registered for the event */
  has(event: InterceptEvent): boolean {
    return (this.registrations.get(event)?.length ?? 0) > 0;
  }

  /** Returns interceptor count for a specific event */
  count(event: InterceptEvent): number {
    return this.registrations.get(event)?.length ?? 0;
  }

  /** Remove interceptors for a specific event, or all */
  clear(event?: InterceptEvent): void {
    if (event) {
      this.registrations.delete(event);
    } else {
      this.registrations.clear();
    }
  }
}
