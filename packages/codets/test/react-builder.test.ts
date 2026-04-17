import { describe, it, expect } from 'vitest';
import { ReactBuilder } from '../src/react-builder.ts';
import { CodeBuilder } from '../src/builder.ts';

/** Strip trailing newline for cleaner assertions. */
const out = (b: ReactBuilder) => b.toString().replace(/\n$/, '');

describe('ReactBuilder', () => {
  describe('useClient', () => {
    it('emits use client directive', () => {
      const b = new ReactBuilder().useClient().line('body');
      expect(out(b)).toBe("'use client';\n\nbody");
    });

    it('deduplicates multiple useClient calls', () => {
      const b = new ReactBuilder().useClient().useClient().line('body');
      expect(out(b).split("'use client';").length - 1).toBe(1);
    });
  });

  describe('useServer', () => {
    it('emits use server directive', () => {
      const b = new ReactBuilder().useServer().line('body');
      expect(out(b)).toBe("'use server';\n\nbody");
    });
  });

  describe('returnJsx', () => {
    it('emits a return ( ... ); block', () => {
      const b = new ReactBuilder().returnJsx(b => {
        b.line('<div>hello</div>');
      });
      expect(out(b)).toBe('return (\n  <div>hello</div>\n);');
    });

    it('works nested inside fn()', () => {
      const b = new ReactBuilder().fn('Page', '', b => {
        b.returnJsx(b => {
          b.line('<main>content</main>');
        });
      }, { exported: true, default: true });

      expect(out(b)).toBe(
        'export default function Page() {\n' +
        '  return (\n' +
        '    <main>content</main>\n' +
        '  );\n' +
        '}'
      );
    });
  });

  describe('full component generation', () => {
    it('produces a complete React component', () => {
      const b = new ReactBuilder()
        .banner('Auto-generated')
        .useClient()
        .addImport('react', { named: ['useState'] })
        .blank()
        .fn('Counter', '', b => {
          b.line('const [count, setCount] = useState(0);')
            .blank()
            .returnJsx(b => {
              b.line('<button onClick={() => setCount(c => c + 1)}>');
              b.indent().line('{count}').dedent();
              b.line('</button>');
            });
        }, { exported: true, default: true });

      const text = out(b);
      expect(text).toContain('// Auto-generated');
      expect(text).toContain("'use client';");
      expect(text).toContain("import { useState } from 'react';");
      expect(text).toContain('export default function Counter()');
      expect(text).toContain('const [count, setCount] = useState(0);');
      expect(text).toContain('return (');
      expect(text).toContain(');');
    });

    it('generates a Next.js layout pattern', () => {
      const b = new ReactBuilder()
        .addImport('next', { types: ['Metadata'] })
        .addImport('./globals.css')
        .blank()
        .constObject('metadata', b => {
          b.line("title: 'My App',");
          b.line("description: 'A Next.js app',");
        }, { type: 'Metadata', exported: true })
        .blank()
        .fn('RootLayout', '{ children }: { children: React.ReactNode }', b => {
          b.returnJsx(b => {
            b.line('<html lang="en">');
            b.indent().line('<body>{children}</body>').dedent();
            b.line('</html>');
          });
        }, { exported: true, default: true });

      const text = out(b);
      expect(text).toContain("import type { Metadata } from 'next';");
      expect(text).toContain("import './globals.css';");
      expect(text).toContain('export const metadata: Metadata = {');
      expect(text).toContain('export default function RootLayout');
      expect(text).toContain('return (');
    });
  });
});

describe('CodeBuilder backward compat', () => {
  it('CodeBuilder is the same as ReactBuilder', () => {
    const b = new CodeBuilder();
    expect(b).toBeInstanceOf(ReactBuilder);
  });

  it('exposes all methods from the full chain', () => {
    const b = new CodeBuilder();
    // CoreBuilder
    expect(typeof b.line).toBe('function');
    expect(typeof b.block).toBe('function');
    expect(typeof b.when).toBe('function');
    // ModuleBuilder
    expect(typeof b.addImport).toBe('function');
    expect(typeof b.banner).toBe('function');
    expect(typeof b.directive).toBe('function');
    // TypeScriptBuilder
    expect(typeof b.fn).toBe('function');
    expect(typeof b.arrow).toBe('function');
    expect(typeof b.iface).toBe('function');
    // ReactBuilder
    expect(typeof b.useClient).toBe('function');
    expect(typeof b.returnJsx).toBe('function');
  });
});
