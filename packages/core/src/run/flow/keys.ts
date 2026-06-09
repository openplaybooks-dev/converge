/**
 * RFC 0050 — deterministic step-key derivation.
 *
 * A step key must be identical across replays of the same flow so a journaled
 * record maps back to the call that produced it. Default keys are
 * `<phase>/<label>#<ordinal>` where the ordinal counts prior calls with the
 * same `<phase>/<label>`. For dynamic items (loops / fan-out) pass an explicit
 * `key` — recommended, since it survives list reordering and inserting steps
 * earlier in the flow without shifting downstream ordinals.
 */

export class KeyCounter {
  private readonly counts = new Map<string, number>();

  next(base: string): number {
    const n = this.counts.get(base) ?? 0;
    this.counts.set(base, n + 1);
    return n;
  }
}

export function deriveKey(
  phase: string,
  label: string,
  explicitKey: string | undefined,
  counter: KeyCounter,
): string {
  const base = phase ? `${phase}/${label}` : label;
  if (explicitKey !== undefined) return `${base}#${explicitKey}`;
  return `${base}#${counter.next(base)}`;
}
