/**
 * Hook Registry
 *
 * Central registry for lifecycle hooks. Supports:
 * - Priority-ordered execution (lower priority number = runs first)
 * - Error isolation (hook failures never crash the workflow)
 * - Bridging of legacy plugin hooks into the new typed system
 * - Multiple handlers per event
 */

import type {
  HookEvent,
  HookFn,
  HookPayloads,
  HookRegistration,
  AnyHookFn,
  ConvergeHooks,
} from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Hook Registry                                                      */
/* ------------------------------------------------------------------ */

export class HookRegistry {
  private registrations = new Map<HookEvent, HookRegistration[]>();

  /* ──────────────────────────────────────────────────────────────── */
  /*  Registration                                                    */
  /* ──────────────────────────────────────────────────────────────── */

  /**
   * Register a typed hook handler for an event.
   *
   * @param event   - The lifecycle event to listen to
   * @param fn      - Typed callback for the event
   * @param options - Priority (lower = first) and source
   *
   * @example
   * registry.register('task:fail', async ({ ctx, error }) => {
   *   await sendAlert(ctx.taskId, error.message);
   * });
   */
  register<E extends HookEvent>(
    event: E,
    fn: HookFn<E>,
    options: { priority?: number; source?: "user" | "plugin" } = {},
  ): void {
    if (!this.registrations.has(event)) {
      this.registrations.set(event, []);
    }

    const registration: HookRegistration = {
      event,
      fn: fn as AnyHookFn,
      priority: options.priority ?? 100,
      source: options.source ?? "user",
    };

    const list = this.registrations.get(event)!;
    list.push(registration);
    // Keep sorted ascending by priority (lowest runs first)
    list.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Register all hooks from a `ConvergeHooks` map at once.
   * Used internally by the CLI when loading `converge.ts`.
   */
  registerAll(hooks: ConvergeHooks, source: "user" | "plugin" = "user"): void {
    for (const [event, fn] of Object.entries(hooks) as [HookEvent, HookFn][]) {
      if (fn) {
        this.register(event, fn, { source });
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  Firing                                                          */
  /* ──────────────────────────────────────────────────────────────── */

  /**
   * Fire all handlers for an event in priority order.
   *
   * Hook errors are caught and logged as warnings — they NEVER
   * crash the main workflow.
   *
   * @example
   * await registry.fire('task:complete', { ctx, result });
   */
  async fire<E extends HookEvent>(
    event: E,
    payload: HookPayloads[E],
  ): Promise<void> {
    const list = this.registrations.get(event);
    if (!list || list.length === 0) return;

    for (const reg of list) {
      try {
        await reg.fn(payload as HookPayloads[HookEvent]);
      } catch (err: any) {
        // Hook errors must not propagate — log and continue
        const msg = err?.message ?? String(err);
        console.warn(
          `[HookRegistry] Hook error in '${event}' (source: ${reg.source}): ${msg}`,
        );
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  Removal                                                         */
  /* ──────────────────────────────────────────────────────────────── */

  /**
   * Remove hooks for a specific event, or all hooks if no event given.
   */
  clear(event?: HookEvent): void {
    if (event) {
      this.registrations.delete(event);
    } else {
      this.registrations.clear();
    }
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  Legacy Bridge                                                   */
  /* ──────────────────────────────────────────────────────────────── */

  /**
   * Import hooks from the legacy `PluginStateV2.hooks` map.
   *
   * Legacy hooks use the signature `(ctx, ...args) => void`.
   * They are wrapped into the new single-payload form and registered
   * with priority 200 (after user hooks at priority 100).
   *
   * @param pluginHooks - The `hooks` map from `PluginStateV2`
   */
  importFromPluginState(
    // Accept any string-keyed Map with function arrays for broad compatibility
    pluginHooks: Map<string, Array<(...args: any[]) => void | Promise<void>>>,
  ): void {
    for (const [event, fns] of pluginHooks) {
      for (const fn of fns) {
        // Wrap: new payload → legacy (ctx, ...args) style
        const wrapped: AnyHookFn = (payload) => {
          // The legacy API passed ctx as first arg; pass full payload as ctx
          return fn(payload, payload);
        };

        const registration: HookRegistration = {
          event: event as HookEvent,
          fn: wrapped,
          priority: 200,
          source: "plugin",
        };

        if (!this.registrations.has(event as HookEvent)) {
          this.registrations.set(event as HookEvent, []);
        }
        const list = this.registrations.get(event as HookEvent)!;
        list.push(registration);
        list.sort((a, b) => a.priority - b.priority);
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  Introspection                                                   */
  /* ──────────────────────────────────────────────────────────────── */

  /** Returns all registered events */
  registeredEvents(): HookEvent[] {
    return Array.from(this.registrations.keys());
  }

  /** Returns handler count for a specific event */
  count(event: HookEvent): number {
    return this.registrations.get(event)?.length ?? 0;
  }

  /** Returns true if any handler is registered for the event */
  has(event: HookEvent): boolean {
    return this.count(event) > 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Global Registry (convenience)                                     */
/* ------------------------------------------------------------------ */

/**
 * Shared global hook registry.
 *
 * Use this when you don't need isolated instances (e.g., in scripts
 * that don't use `defineConverge()`). For full projects with
 * `converge.ts`, the CLI creates and injects a dedicated instance.
 */
export const globalHookRegistry = new HookRegistry();
