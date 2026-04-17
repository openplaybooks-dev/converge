import { describe, it, expect } from 'vitest';
import { CoreBuilder } from '../src/core-builder.ts';
import { ModuleBuilder } from '../src/module-builder.ts';
import { TypeScriptBuilder } from '../src/ts-builder.ts';
import { ReactBuilder } from '../src/react-builder.ts';

/** Strip trailing newline for cleaner assertions. */
const out = (b: CoreBuilder) => b.toString().replace(/\n$/, '');

describe('extensibility', () => {
  describe('inheritance chain', () => {
    it('ReactBuilder extends TypeScriptBuilder', () => {
      expect(new ReactBuilder()).toBeInstanceOf(TypeScriptBuilder);
    });

    it('TypeScriptBuilder extends ModuleBuilder', () => {
      expect(new TypeScriptBuilder()).toBeInstanceOf(ModuleBuilder);
    });

    it('ModuleBuilder extends CoreBuilder', () => {
      expect(new ModuleBuilder()).toBeInstanceOf(CoreBuilder);
    });
  });

  describe('custom CoreBuilder subclass', () => {
    class PythonBuilder extends CoreBuilder {
      defn(name: string, params: string, body: (b: this) => void): this {
        this.line(`def ${name}(${params}):`);
        this.indent();
        body(this);
        this.dedent();
        return this;
      }

      pythonComment(text: string): this {
        return this.line(`# ${text}`);
      }
    }

    it('can emit Python-style code', () => {
      const b = new PythonBuilder()
        .pythonComment('A greeting function')
        .defn('greet', 'name', b => {
          b.line('print(f"Hello, {name}")');
        });
      expect(out(b)).toBe(
        '# A greeting function\n' +
        'def greet(name):\n' +
        '  print(f"Hello, {name}")'
      );
    });

    it('inherits core methods', () => {
      const b = new PythonBuilder()
        .when(true, b => b.pythonComment('conditional'));
      expect(out(b)).toBe('# conditional');
    });
  });

  describe('custom ModuleBuilder subclass', () => {
    class GoBuilder extends ModuleBuilder {
      funcDecl(name: string, params: string, returnType: string, body: (b: this) => void): this {
        return this.block(`func ${name}(${params}) ${returnType} {`, '}', body);
      }

      structDecl(name: string, body: (b: this) => void): this {
        return this.block(`type ${name} struct {`, '}', body);
      }
    }

    it('can emit Go-style code with imports', () => {
      const b = new GoBuilder()
        .addImport('fmt')
        .blank()
        .funcDecl('main', '', '', b => {
          b.line('fmt.Println("hello")');
        });
      const text = out(b);
      expect(text).toContain("import 'fmt';");
      expect(text).toContain('func main()  {');
    });
  });

  describe('custom ReactBuilder subclass (Next.js)', () => {
    class NextBuilder extends ReactBuilder {
      googleFont(varName: string, importName: string, variable: string): this {
        return this.constCall(varName, importName, b => {
          b.line("subsets: ['latin'],");
          b.line(`variable: '${variable}',`);
        });
      }

      metadata(entries: Record<string, string>): this {
        this.addImport('next', { types: ['Metadata'] });
        return this.constObject('metadata', b => {
          for (const [key, value] of Object.entries(entries)) {
            b.line(`${key}: '${value}',`);
          }
        }, { type: 'Metadata', exported: true });
      }

      page(name: string, body: (b: this) => void): this {
        return this.fn(name, '', b => {
          b.returnJsx(body);
        }, { exported: true, default: true });
      }
    }

    it('can generate a Next.js page', () => {
      const b = new NextBuilder()
        .useClient()
        .addImport('react', { named: ['useState'] })
        .blank()
        .page('HomePage', b => {
          b.line('<h1>Welcome</h1>');
        });

      const text = out(b);
      expect(text).toContain("'use client';");
      expect(text).toContain("import { useState } from 'react';");
      expect(text).toContain('export default function HomePage() {');
      expect(text).toContain('return (');
      expect(text).toContain('<h1>Welcome</h1>');
    });

    it('can use custom metadata helper', () => {
      const b = new NextBuilder()
        .metadata({ title: 'My App', description: 'A cool app' })
        .blank()
        .page('Page', b => {
          b.line('<div>content</div>');
        });

      const text = out(b);
      expect(text).toContain("import type { Metadata } from 'next';");
      expect(text).toContain('export const metadata: Metadata = {');
      expect(text).toContain("title: 'My App',");
    });

    it('can use custom googleFont helper', () => {
      const b = new NextBuilder()
        .addImport('next/font/google', { named: ['Inter'] })
        .blank()
        .googleFont('inter', 'Inter', '--font-sans');

      const text = out(b);
      expect(text).toContain("import { Inter } from 'next/font/google';");
      expect(text).toContain('const inter = Inter({');
      expect(text).toContain("subsets: ['latin'],");
      expect(text).toContain("variable: '--font-sans',");
    });
  });

  describe('polymorphic this in callbacks', () => {
    class ExtendedBuilder extends ReactBuilder {
      customHelper(): this {
        return this.line('// custom helper was here');
      }
    }

    it('block callback receives the concrete subclass type', () => {
      const b = new ExtendedBuilder();
      // This should compile — b inside the callback is ExtendedBuilder
      b.block('{', '}', b => {
        b.customHelper();
      });
      expect(out(b)).toContain('// custom helper was here');
    });

    it('when callback receives the concrete subclass type', () => {
      const b = new ExtendedBuilder();
      b.when(true, b => {
        b.customHelper();
      });
      expect(out(b)).toContain('// custom helper was here');
    });

    it('each callback receives the concrete subclass type', () => {
      const b = new ExtendedBuilder();
      b.each(['a'], (b, _item) => {
        b.customHelper();
      });
      expect(out(b)).toContain('// custom helper was here');
    });

    it('fn callback receives the concrete subclass type', () => {
      const b = new ExtendedBuilder();
      b.fn('test', '', b => {
        b.customHelper();
      });
      expect(out(b)).toContain('// custom helper was here');
    });

    it('returnJsx callback receives the concrete subclass type', () => {
      const b = new ExtendedBuilder();
      b.returnJsx(b => {
        b.customHelper();
      });
      expect(out(b)).toContain('// custom helper was here');
    });
  });

  describe('multi-level extension', () => {
    class AnimBuilder extends ReactBuilder {
      gsapImport(): this {
        this.addImport('gsap', { named: ['gsap'] });
        this.addDependency('gsap', '^3.12.0');
        return this;
      }

      useGsapHook(name: string, body: (b: this) => void): this {
        this.addImport('react', { named: ['useEffect', 'useRef'] });
        return this.fn(name, 'ref: React.RefObject<HTMLElement>', b => {
          b.block('useEffect(() => {', '}, []);', body);
        }, { exported: true });
      }
    }

    it('composes custom helpers with base functionality', () => {
      const b = new AnimBuilder()
        .useClient()
        .gsapImport()
        .blank()
        .useGsapHook('useFadeIn', b => {
          b.line('if (!ref.current) return;');
          b.line("gsap.from(ref.current, { opacity: 0, duration: 1 });");
        });

      const text = out(b);
      expect(text).toContain("'use client';");
      expect(text).toContain("import { gsap } from 'gsap';");
      expect(text).toContain("import { useEffect, useRef } from 'react';");
      expect(text).toContain('export function useFadeIn');
      expect(text).toContain('useEffect(() => {');

      const deps = b.getDependencies();
      expect(deps.get('gsap')).toBe('^3.12.0');
    });
  });
});
