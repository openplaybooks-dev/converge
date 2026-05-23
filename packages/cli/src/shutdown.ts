/**
 * Shared CLI shutdown state.
 *
 * The main entrypoint aborts this controller on SIGINT/SIGTERM so long-lived
 * command loops can stop promptly without wiring their own competing signal
 * handlers.
 */

export const shutdownController = new AbortController();

export function setupGracefulShutdown(): void {
  let shutdownInitiated = false;

  const handler = async (signal: string) => {
    if (shutdownInitiated) return;
    shutdownInitiated = true;

    shutdownController.abort();

    // Re-arm for force exit on second signal.
    process.once(signal as NodeJS.Signals, () => {
      process.exit(1);
    });

    // Safety-net: give command handlers time to flush cleanup and exit.
    const SHUTDOWN_TIMEOUT_MS = 10_000;
    const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;

    const waitForCleanup = async () => {
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    };

    await waitForCleanup();
    process.exit(0);
  };

  process.on("SIGINT", () => handler("SIGINT"));
  process.on("SIGTERM", () => handler("SIGTERM"));
}
