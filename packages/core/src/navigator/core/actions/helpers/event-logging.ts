/**
 * Event Logging Helpers
 * 
 * Provides access to global event writer and session logger instances.
 */

import type { TaskEventWriter } from "../../../../journal/event-writer.ts";

export function getEventWriter(): TaskEventWriter | null {
  return (global as any).__CONVERGE_EVENT_WRITER__ || null;
}

export function getSessionLogger(): any | null {
  return (global as any).__CONVERGE_SESSION_LOGGER__ || null;
}
