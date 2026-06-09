/**
 * RFC 0050 Phase 2 — a counting semaphore for bounded fan-out.
 *
 * The flow runtime holds ONE semaphore per run, sized to `workers`. Every real
 * task/agent EXECUTION acquires a slot before running and releases after, so
 * the number of concurrent executions never exceeds `workers` — regardless of
 * how deeply `parallel`/`pipeline` are nested. Replays (journal cache hits)
 * never acquire, so resume stays instant.
 *
 * Without this, `parallel(assets.flatMap(a => screens.map(...)))` would fire
 * N×M agent processes at once and melt the machine.
 */
export class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly max: number) {
    if (!Number.isFinite(max) || max < 1) this.max = 1;
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.queue.push(resolve));
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      // Hand the slot directly to the next waiter (active stays the same).
      next();
    } else {
      this.active--;
    }
  }

  /** Run `fn` while holding a slot; always releases, even on throw. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
