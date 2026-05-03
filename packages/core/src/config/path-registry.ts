export class DuplicateIdError extends Error {
  constructor(id: string, pathA: string, pathB: string) {
    super(`Duplicate task id "${id}": "${pathA}" and "${pathB}"`);
    this.name = 'DuplicateIdError';
  }
}

export class PathRegistry {
  private _map = new Map<string, string>();

  register(id: string, path: string): void {
    const existing = this._map.get(id);
    if (existing !== undefined) {
      if (existing !== path) {
        throw new DuplicateIdError(id, existing, path);
      }
      return;
    }
    this._map.set(id, path);
  }

  resolve(id: string): string | null {
    return this._map.get(id) ?? null;
  }

  has(id: string): boolean {
    return this._map.has(id);
  }

  entries(): IterableIterator<[string, string]> {
    return this._map.entries();
  }
}
