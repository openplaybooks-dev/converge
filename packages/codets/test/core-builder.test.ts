import { describe, it, expect } from 'vitest';
import { CoreBuilder } from '../src/core-builder.ts';

/** Strip trailing newline for cleaner assertions. */
const out = (b: CoreBuilder) => b.toString().replace(/\n$/, '');

describe('CoreBuilder', () => {
  describe('line emission', () => {
    it('emits a single line', () => {
      expect(out(new CoreBuilder().line('hello'))).toBe('hello');
    });

    it('emits an empty line when text is empty string', () => {
      expect(out(new CoreBuilder().line('a').line('').line('b'))).toBe('a\n\nb');
    });

    it('emits a blank line', () => {
      expect(out(new CoreBuilder().line('a').blank().line('b'))).toBe('a\n\nb');
    });

    it('emits multiple lines', () => {
      expect(out(new CoreBuilder().lines(['a', 'b', 'c']))).toBe('a\nb\nc');
    });
  });

  describe('comments', () => {
    it('emits a single-line comment', () => {
      expect(out(new CoreBuilder().comment('hello'))).toBe('// hello');
    });

    it('emits a JSDoc block comment', () => {
      const b = new CoreBuilder().docComment(['Line 1', 'Line 2']);
      expect(out(b)).toBe('/**\n * Line 1\n * Line 2\n */');
    });
  });

  describe('raw emission', () => {
    it('emits raw text without indentation', () => {
      const b = new CoreBuilder().indent().raw('no-indent').line('indented');
      expect(out(b)).toBe('no-indent\n  indented');
    });

    it('emits a raw multi-line block', () => {
      const b = new CoreBuilder().rawBlock('a\nb\nc');
      expect(out(b)).toBe('a\nb\nc');
    });
  });

  describe('snippet', () => {
    it('normalizes leading whitespace and re-indents', () => {
      const b = new CoreBuilder().indent().snippet(`
        <div>
          <span>hello</span>
        </div>
      `);
      expect(out(b)).toBe('  <div>\n    <span>hello</span>\n  </div>');
    });

    it('preserves blank lines within snippet', () => {
      const b = new CoreBuilder().snippet(`
        a

        b
      `);
      expect(out(b)).toBe('a\n\nb');
    });

    it('returns this for empty snippet', () => {
      const b = new CoreBuilder().snippet('   \n   \n   ');
      expect(out(b)).toBe('');
    });
  });

  describe('section markers', () => {
    it('emits a section separator', () => {
      const b = new CoreBuilder().line('before').section('Imports').line('after');
      const lines = out(b).split('\n');
      expect(lines[0]).toBe('before');
      expect(lines[1]).toBe('');
      expect(lines[2]).toMatch(/^\/\/ ── Imports ─+$/);
      expect(lines[3]).toBe('');
      expect(lines[4]).toBe('after');
    });

    it('adjusts padding for long names', () => {
      const b = new CoreBuilder().section('A very long section name that exceeds padding');
      expect(out(b)).toContain('// ── A very long section name that exceeds padding');
    });
  });

  describe('indentation', () => {
    it('indents lines after indent()', () => {
      const b = new CoreBuilder().line('a').indent().line('b').dedent().line('c');
      expect(out(b)).toBe('a\n  b\nc');
    });

    it('floors at zero depth on excessive dedent', () => {
      const b = new CoreBuilder().dedent().dedent().line('ok');
      expect(out(b)).toBe('ok');
    });

    it('supports custom indent string', () => {
      const b = new CoreBuilder('\t').indent().line('tabbed');
      expect(out(b)).toBe('\ttabbed');
    });

    it('nests multiple levels', () => {
      const b = new CoreBuilder()
        .line('level 0')
        .indent().line('level 1')
        .indent().line('level 2')
        .dedent().dedent().line('level 0 again');
      expect(out(b)).toBe('level 0\n  level 1\n    level 2\nlevel 0 again');
    });
  });

  describe('block', () => {
    it('emits opener, indented body, closer', () => {
      const b = new CoreBuilder().block('{', '}', b => {
        b.line('content');
      });
      expect(out(b)).toBe('{\n  content\n}');
    });

    it('nests blocks', () => {
      const b = new CoreBuilder().block('outer {', '}', b => {
        b.block('inner {', '}', b => {
          b.line('deep');
        });
      });
      expect(out(b)).toBe('outer {\n  inner {\n    deep\n  }\n}');
    });
  });

  describe('control flow', () => {
    it('when() emits body for truthy condition', () => {
      const b = new CoreBuilder().when(true, b => b.line('yes'));
      expect(out(b)).toBe('yes');
    });

    it('when() skips body for falsy condition', () => {
      const b = new CoreBuilder().when(false, b => b.line('no'));
      expect(out(b)).toBe('');
    });

    it('when() treats 0 as falsy', () => {
      const b = new CoreBuilder().when(0, b => b.line('no'));
      expect(out(b)).toBe('');
    });

    it('when() treats non-empty string as truthy', () => {
      const b = new CoreBuilder().when('yes', b => b.line('emitted'));
      expect(out(b)).toBe('emitted');
    });

    it('each() iterates items', () => {
      const b = new CoreBuilder().each(['a', 'b', 'c'], (b, item) => b.line(item));
      expect(out(b)).toBe('a\nb\nc');
    });

    it('each() provides index', () => {
      const b = new CoreBuilder().each(['x', 'y'], (b, item, i) => b.line(`${i}:${item}`));
      expect(out(b)).toBe('0:x\n1:y');
    });

    it('each() with empty array emits nothing', () => {
      const b = new CoreBuilder().each([], (b, item) => b.line(String(item)));
      expect(out(b)).toBe('');
    });
  });

  describe('toString', () => {
    it('always ends with a trailing newline', () => {
      expect(new CoreBuilder().line('hello').toString()).toBe('hello\n');
    });

    it('does not double trailing newline', () => {
      const b = new CoreBuilder().line('hello').blank();
      expect(b.toString()).toBe('hello\n');
    });

    it('returns just a newline for empty builder', () => {
      expect(new CoreBuilder().toString()).toBe('\n');
    });
  });

  describe('fluent chaining', () => {
    it('all methods return this for chaining', () => {
      const b = new CoreBuilder();
      const result = b
        .line('a')
        .blank()
        .lines(['b'])
        .comment('c')
        .docComment(['d'])
        .raw('e')
        .rawBlock('f')
        .section('g')
        .indent()
        .dedent()
        .block('{', '}', () => {})
        .when(true, () => {})
        .each([], () => {});
      expect(result).toBe(b);
    });
  });
});
