import { describe, it, expect } from 'vitest';
import { TypeScriptBuilder } from '../src/ts-builder.ts';

/** Strip trailing newline for cleaner assertions. */
const out = (b: TypeScriptBuilder) => b.toString().replace(/\n$/, '');

describe('TypeScriptBuilder', () => {
  describe('fn', () => {
    it('emits a basic function', () => {
      const b = new TypeScriptBuilder().fn('greet', 'name: string', b => {
        b.line("return 'hello ' + name;");
      });
      expect(out(b)).toBe("function greet(name: string) {\n  return 'hello ' + name;\n}");
    });

    it('emits an exported function', () => {
      const b = new TypeScriptBuilder().fn('greet', '', b => {
        b.line('return null;');
      }, { exported: true });
      expect(out(b)).toMatch(/^export function greet/);
    });

    it('emits an export default function', () => {
      const b = new TypeScriptBuilder().fn('Page', '', b => {
        b.line('return null;');
      }, { exported: true, default: true });
      expect(out(b)).toMatch(/^export default function Page/);
    });

    it('emits an async function', () => {
      const b = new TypeScriptBuilder().fn('fetch', '', b => {
        b.line('// ...');
      }, { async: true });
      expect(out(b)).toMatch(/^async function fetch/);
    });

    it('emits function with return type', () => {
      const b = new TypeScriptBuilder().fn('getId', '', b => {
        b.line('return 1;');
      }, { returnType: 'number' });
      expect(out(b)).toContain('getId(): number {');
    });

    it('combines all options', () => {
      const b = new TypeScriptBuilder().fn('handler', 'req: Request', b => {
        b.line('// ...');
      }, { exported: true, default: true, async: true, returnType: 'Promise<Response>' });
      expect(out(b)).toMatch(
        /^export default async function handler\(req: Request\): Promise<Response> \{/
      );
    });
  });

  describe('arrow', () => {
    it('emits a basic arrow function', () => {
      const b = new TypeScriptBuilder().arrow('greet', 'name: string', b => {
        b.line('return name;');
      });
      expect(out(b)).toBe('const greet = (name: string) => {\n  return name;\n};');
    });

    it('emits an exported async arrow with type', () => {
      const b = new TypeScriptBuilder().arrow('handler', 'req: Request', b => {
        b.line('return null;');
      }, { exported: true, async: true, type: ': Handler' });
      const text = out(b);
      expect(text).toMatch(/^export const handler/);
      expect(text).toContain('async');
      expect(text).toContain(': Handler');
    });
  });

  describe('iface', () => {
    it('emits an exported interface by default', () => {
      const b = new TypeScriptBuilder().iface('Props', b => {
        b.line('name: string;');
        b.line('age?: number;');
      });
      expect(out(b)).toBe('export interface Props {\n  name: string;\n  age?: number;\n}');
    });

    it('emits a non-exported interface', () => {
      const b = new TypeScriptBuilder().iface('Internal', b => {
        b.line('x: number;');
      }, false);
      expect(out(b)).toMatch(/^interface Internal/);
    });
  });

  describe('typeAlias', () => {
    it('emits an exported type alias', () => {
      const b = new TypeScriptBuilder().typeAlias('ID', 'string | number');
      expect(out(b)).toBe('export type ID = string | number;');
    });

    it('emits a non-exported type alias', () => {
      const b = new TypeScriptBuilder().typeAlias('Internal', 'string', false);
      expect(out(b)).toBe('type Internal = string;');
    });
  });

  describe('enumDecl', () => {
    it('emits an exported enum', () => {
      const b = new TypeScriptBuilder().enumDecl('Color', b => {
        b.line('Red,');
        b.line('Green,');
        b.line('Blue,');
      });
      expect(out(b)).toBe('export enum Color {\n  Red,\n  Green,\n  Blue,\n}');
    });

    it('emits a non-exported enum', () => {
      const b = new TypeScriptBuilder().enumDecl('Dir', b => {
        b.line('Up,');
      }, false);
      expect(out(b)).toMatch(/^enum Dir/);
    });
  });

  describe('constObject', () => {
    it('emits a const object', () => {
      const b = new TypeScriptBuilder().constObject('config', b => {
        b.line("host: 'localhost',");
        b.line('port: 3000,');
      });
      expect(out(b)).toBe("const config = {\n  host: 'localhost',\n  port: 3000,\n};");
    });

    it('emits with type annotation and export', () => {
      const b = new TypeScriptBuilder().constObject('meta', b => {
        b.line("title: 'App',");
      }, { type: 'Metadata', exported: true });
      expect(out(b)).toMatch(/^export const meta: Metadata = \{/);
    });
  });

  describe('constArray', () => {
    it('emits a const array', () => {
      const b = new TypeScriptBuilder().constArray('items', b => {
        b.line("'a',");
        b.line("'b',");
      });
      expect(out(b)).toBe("const items = [\n  'a',\n  'b',\n];");
    });

    it('emits with type annotation and export', () => {
      const b = new TypeScriptBuilder().constArray('routes', b => {
        b.line("'/home',");
      }, { type: 'string[]', exported: true });
      expect(out(b)).toMatch(/^export const routes: string\[\] = \[/);
    });
  });

  describe('constCall', () => {
    it('emits a const with function call', () => {
      const b = new TypeScriptBuilder().constCall('inter', 'Inter', b => {
        b.line("subsets: ['latin'],");
      });
      expect(out(b)).toBe("const inter = Inter({\n  subsets: ['latin'],\n});");
    });

    it('emits an exported constCall', () => {
      const b = new TypeScriptBuilder().constCall('font', 'createFont', b => {
        b.line("weight: '400',");
      }, { exported: true });
      expect(out(b)).toMatch(/^export const font = createFont\(\{/);
    });
  });

  describe('inherits ModuleBuilder', () => {
    it('supports imports + TS declarations together', () => {
      const b = new TypeScriptBuilder()
        .addImport('react', { named: ['useState'] })
        .fn('Counter', '', b => {
          b.line('const [count, setCount] = useState(0);');
        }, { exported: true });

      const text = out(b);
      expect(text).toContain("import { useState } from 'react';");
      expect(text).toContain('export function Counter');
    });
  });
});
