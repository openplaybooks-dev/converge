/**
 * CoreBuilder — language-agnostic, indentation-aware text emitter.
 *
 * The foundation layer. Knows nothing about imports, types, or any
 * specific programming language. Subclass this for custom languages
 * or DSLs.
 *
 * @example
 * ```ts
 * const out = new CoreBuilder()
 *   .line('hello')
 *   .block('{', '}', b => b.line('world'))
 *   .toString();
 * ```
 */
export class CoreBuilder {
  protected _lines: string[] = [];
  private depth = 0;
  private indentStr: string;

  constructor(indent = '  ') {
    this.indentStr = indent;
  }

  // ── Core emission ─────────────────────────────────────────────

  /** Emit a line at the current indentation depth. Empty string → blank line. */
  line(text = ''): this {
    this._lines.push(text === '' ? '' : this.prefix() + text);
    return this;
  }

  /** Emit a blank line (no indentation). */
  blank(): this {
    this._lines.push('');
    return this;
  }

  /** Emit multiple lines at the current indentation depth. */
  lines(texts: string[]): this {
    for (const t of texts) this.line(t);
    return this;
  }

  /** Emit a single-line comment (`// text`). */
  comment(text: string): this {
    return this.line(`// ${text}`);
  }

  /** Emit a JSDoc-style block comment. */
  docComment(lines: string[]): this {
    this.line('/**');
    for (const l of lines) {
      this.line(` * ${l}`);
    }
    this.line(' */');
    return this;
  }

  /** Emit raw text without applying indentation. */
  raw(text: string): this {
    this._lines.push(text);
    return this;
  }

  /** Emit a multi-line raw block (splits on newlines). */
  rawBlock(text: string): this {
    for (const line of text.split('\n')) {
      this._lines.push(line);
    }
    return this;
  }

  /**
   * Embed a pre-formatted code snippet at the current indentation depth.
   *
   * Normalizes the snippet's own leading whitespace, then re-indents each
   * line to the builder's current depth. Blank lines are preserved as-is.
   */
  snippet(code: string): this {
    const rawLines = code.split('\n');

    while (rawLines.length > 0 && rawLines[0].trim() === '') rawLines.shift();
    while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();

    if (rawLines.length === 0) return this;

    const minIndent = rawLines
      .filter(l => l.trim().length > 0)
      .reduce((min, l) => Math.min(min, l.match(/^\s*/)?.[0].length ?? 0), Infinity);

    for (const line of rawLines) {
      if (line.trim().length === 0) {
        this.blank();
      } else {
        this.line(line.slice(minIndent));
      }
    }

    return this;
  }

  // ── Section markers ───────────────────────────────────────────

  /** Emit a named section separator comment. */
  section(name: string): this {
    const pad = Math.max(0, 55 - name.length);
    this.blank();
    this.comment(`── ${name} ${'─'.repeat(pad)}`);
    this.blank();
    return this;
  }

  // ── Indentation ───────────────────────────────────────────────

  /** Increase indentation depth by one level. */
  indent(): this {
    this.depth++;
    return this;
  }

  /** Decrease indentation depth by one level (floors at 0). */
  dedent(): this {
    this.depth = Math.max(0, this.depth - 1);
    return this;
  }

  /** Emit a block: opener line, indented body, closer line. */
  block(opener: string, closer: string, body: (b: this) => void): this {
    this.line(opener);
    this.indent();
    body(this);
    this.dedent();
    this.line(closer);
    return this;
  }

  // ── Control flow ──────────────────────────────────────────────

  /** Emit a section only when condition is truthy. */
  when(condition: unknown, fn: (b: this) => void): this {
    if (condition) fn(this);
    return this;
  }

  /** Iterate items and emit code for each. */
  each<T>(items: T[], fn: (b: this, item: T, index: number) => void): this {
    items.forEach((item, i) => fn(this, item, i));
    return this;
  }

  // ── Output ────────────────────────────────────────────────────

  /** Build the final source string. */
  toString(): string {
    const result = this._lines.join('\n');
    return result.endsWith('\n') ? result : result + '\n';
  }

  // ── Internals ─────────────────────────────────────────────────

  protected prefix(): string {
    return this.indentStr.repeat(this.depth);
  }
}
