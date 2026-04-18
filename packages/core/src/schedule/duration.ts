/**
 * Duration String Parser
 *
 * Parses simple duration strings like '5s', '15s', '1m', '5m' into milliseconds.
 */

const DURATION_RE = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/;

const MULTIPLIERS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
};

/**
 * Parse a duration string into milliseconds.
 *
 * @example
 * parseDuration('5s')   // 5000
 * parseDuration('15s')  // 15000
 * parseDuration('1m')   // 60000
 * parseDuration('500ms') // 500
 * parseDuration('1.5m')  // 90000
 *
 * @throws Error if the string doesn't match a valid duration format.
 */
export function parseDuration(input: string): number {
  const match = input.trim().match(DURATION_RE);
  if (!match) {
    throw new Error(
      `Invalid duration string: '${input}'. ` +
        `Expected format: <number><unit> where unit is ms, s, m, or h. ` +
        `Examples: '5s', '15s', '1m', '500ms'.`,
    );
  }

  const value = parseFloat(match[1]);
  const unit = match[2];
  return Math.round(value * MULTIPLIERS[unit]);
}
