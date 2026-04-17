import { describe, it, expect } from 'vitest';
import { SemanticBuilder } from '../src/semantic/semantic-builder.ts';
import { ExprHelper, ObjectBuilder, ArrayBuilder, FnBody } from '../src/semantic/sub-builders.ts';
import { formatFile, DEFAULT_FORMAT } from '../src/semantic/formatter.ts';
import type { ExprNode } from '../src/semantic/nodes.ts';
import type { FormatOptions } from '../src/semantic/formatter.ts';

// ── ExprHelper ───────────────────────────────────────────────────────

describe('ExprHelper', () => {
  const e = new ExprHelper();

  describe('literals', () => {
    it('creates string literal', () => {
      const node = e.str('hello');
      expect(node).toEqual({ kind: 'string', value: 'hello' });
    });

    it('creates number literal', () => {
      expect(e.num(42)).toEqual({ kind: 'number', value: 42 });
      expect(e.num(3.14)).toEqual({ kind: 'number', value: 3.14 });
      expect(e.num(-1)).toEqual({ kind: 'number', value: -1 });
    });

    it('creates boolean literal', () => {
      expect(e.bool(true)).toEqual({ kind: 'boolean', value: true });
      expect(e.bool(false)).toEqual({ kind: 'boolean', value: false });
    });

    it('creates null literal', () => {
      expect(e.null()).toEqual({ kind: 'null' });
    });

    it('creates undefined literal', () => {
      expect(e.undefined()).toEqual({ kind: 'undefined' });
    });
  });

  describe('identifier', () => {
    it('creates valid identifier', () => {
      expect(e.id('foo')).toEqual({ kind: 'identifier', name: 'foo' });
      expect(e.id('$bar')).toEqual({ kind: 'identifier', name: '$bar' });
      expect(e.id('_baz')).toEqual({ kind: 'identifier', name: '_baz' });
    });

    it('rejects invalid identifiers', () => {
      expect(() => e.id('123')).toThrow('Invalid identifier');
      expect(() => e.id('foo bar')).toThrow('Invalid identifier');
      expect(() => e.id('')).toThrow('Invalid identifier');
    });
  });

  describe('raw', () => {
    it('creates raw expression', () => {
      expect(e.raw('process.env.X')).toEqual({ kind: 'raw', code: 'process.env.X' });
    });
  });

  describe('call', () => {
    it('creates call expression', () => {
      const node = e.call('fn', e.str('arg1'), e.num(2));
      expect(node).toEqual({
        kind: 'call',
        callee: 'fn',
        args: [
          { kind: 'string', value: 'arg1' },
          { kind: 'number', value: 2 },
        ],
      });
    });

    it('creates call with no args', () => {
      expect(e.call('doSomething')).toEqual({
        kind: 'call',
        callee: 'doSomething',
        args: [],
      });
    });
  });

  describe('object', () => {
    it('creates object via builder', () => {
      const node = e.object(o => {
        o.prop('name', o.str('test'));
        o.prop('value', o.num(42));
      });
      expect(node.kind).toBe('object');
      if (node.kind === 'object') {
        expect(node.props).toHaveLength(2);
        expect(node.props[0].key).toBe('name');
        expect(node.props[1].key).toBe('value');
      }
    });

    it('creates empty object', () => {
      const node = e.object(() => {});
      expect(node).toEqual({ kind: 'object', props: [] });
    });
  });

  describe('array', () => {
    it('creates array via builder', () => {
      const node = e.array(a => {
        a.item(a.str('one'));
        a.item(a.num(2));
      });
      expect(node.kind).toBe('array');
      if (node.kind === 'array') {
        expect(node.items).toHaveLength(2);
      }
    });
  });
});

// ── ObjectBuilder ────────────────────────────────────────────────────

describe('ObjectBuilder', () => {
  it('builds props via prop()', () => {
    const ob = new ObjectBuilder();
    ob.prop('x', ob.num(1)).prop('y', ob.str('hello'));
    const node = ob._build();
    expect(node.props).toHaveLength(2);
    expect(node.props[0]).toEqual({ key: 'x', value: { kind: 'number', value: 1 } });
    expect(node.props[1]).toEqual({ key: 'y', value: { kind: 'string', value: 'hello' } });
  });

  it('builds nested object via propObj()', () => {
    const ob = new ObjectBuilder();
    ob.propObj('inner', inner => {
      inner.prop('a', inner.bool(true));
    });
    const node = ob._build();
    expect(node.props).toHaveLength(1);
    expect(node.props[0].value.kind).toBe('object');
  });

  it('builds array property via propArr()', () => {
    const ob = new ObjectBuilder();
    ob.propArr('items', arr => {
      arr.item(arr.num(1));
      arr.item(arr.num(2));
    });
    const node = ob._build();
    expect(node.props[0].value.kind).toBe('array');
  });

  it('supports computed keys', () => {
    const ob = new ObjectBuilder();
    ob.computed('Symbol.iterator', ob.raw('function*() {}'));
    const node = ob._build();
    expect(node.props[0].computed).toBe(true);
  });

  it('supports when() conditional', () => {
    const ob = new ObjectBuilder();
    ob.when(true, o => o.prop('visible', o.bool(true)));
    ob.when(false, o => o.prop('hidden', o.bool(true)));
    ob.when('', o => o.prop('empty', o.bool(true)));
    ob.when(null, o => o.prop('null', o.bool(true)));
    const node = ob._build();
    expect(node.props).toHaveLength(1);
    expect(node.props[0].key).toBe('visible');
  });
});

// ── ArrayBuilder ─────────────────────────────────────────────────────

describe('ArrayBuilder', () => {
  it('builds items', () => {
    const ab = new ArrayBuilder();
    ab.item(ab.str('a')).item(ab.num(1));
    const node = ab._build();
    expect(node.items).toHaveLength(2);
  });

  it('builds object items via itemObj()', () => {
    const ab = new ArrayBuilder();
    ab.itemObj(o => {
      o.prop('protocol', o.str('https'));
      o.prop('hostname', o.str('example.com'));
    });
    const node = ab._build();
    expect(node.items).toHaveLength(1);
    expect(node.items[0].kind).toBe('object');
  });

  it('supports when()', () => {
    const ab = new ArrayBuilder();
    ab.when(true, a => a.item(a.str('yes')));
    ab.when(false, a => a.item(a.str('no')));
    const node = ab._build();
    expect(node.items).toHaveLength(1);
  });

  it('supports each()', () => {
    const ab = new ArrayBuilder();
    ab.each(['a', 'b', 'c'], (a, val) => a.item(a.str(val)));
    const node = ab._build();
    expect(node.items).toHaveLength(3);
  });
});

// ── FnBody ───────────────────────────────────────────────────────────

describe('FnBody', () => {
  it('builds return statement', () => {
    const fb = new FnBody();
    fb.return(fb.str('hello'));
    const stmts = fb._build();
    expect(stmts).toHaveLength(1);
    expect(stmts[0].kind).toBe('return');
  });

  it('builds local const', () => {
    const fb = new FnBody();
    fb.declareConst('x', fb.num(42), { type: 'number' });
    const stmts = fb._build();
    expect(stmts).toHaveLength(1);
    expect(stmts[0].kind).toBe('localConst');
  });

  it('builds expression statement', () => {
    const fb = new FnBody();
    fb.statement(fb.call('console.log', fb.str('hi')));
    const stmts = fb._build();
    expect(stmts[0].kind).toBe('expression');
  });

  it('builds raw statement', () => {
    const fb = new FnBody();
    fb.rawStatement('// TODO: implement');
    const stmts = fb._build();
    expect(stmts[0]).toEqual({ kind: 'rawStmt', code: '// TODO: implement' });
  });

  it('supports when()', () => {
    const fb = new FnBody();
    fb.when(true, b => b.return(b.bool(true)));
    fb.when(false, b => b.return(b.bool(false)));
    expect(fb._build()).toHaveLength(1);
  });

  it('builds if/else', () => {
    const fb = new FnBody();
    fb.if('x > 0',
      b => b.return(b.str('positive')),
      b => b.return(b.str('non-positive')),
    );
    const stmts = fb._build();
    expect(stmts).toHaveLength(1);
    expect(stmts[0].kind).toBe('if');
    if (stmts[0].kind === 'if') {
      expect(stmts[0].body).toHaveLength(1);
      expect(stmts[0].elseBody).toHaveLength(1);
    }
  });

  it('builds nested calls', () => {
    const fb = new FnBody();
    fb.return(fb.call('twMerge', fb.call('clsx', fb.id('inputs'))));
    const stmts = fb._build();
    const ret = stmts[0];
    expect(ret.kind).toBe('return');
    if (ret.kind === 'return') {
      expect(ret.value.kind).toBe('call');
      if (ret.value.kind === 'call') {
        expect(ret.value.callee).toBe('twMerge');
        expect(ret.value.args[0].kind).toBe('call');
      }
    }
  });
});

// ── Formatter: Expression rendering ──────────────────────────────────

describe('Formatter: Expressions', () => {
  const opts = DEFAULT_FORMAT;

  function render(expr: ExprNode): string {
    return formatFile([{ kind: 'const', name: 'x', value: expr, exported: false }], opts)
      .replace('const x = ', '')
      .replace(/;\n$/, '');
  }

  describe('string escaping', () => {
    it('escapes single quotes with single-quote option', () => {
      const result = render({ kind: 'string', value: "it's" });
      expect(result).toBe("'it\\'s'");
    });

    it('escapes double quotes with double-quote option', () => {
      const dqOpts = { ...opts, quote: 'double' as const };
      const result = formatFile(
        [{ kind: 'const', name: 'x', value: { kind: 'string', value: 'say "hi"' }, exported: false }],
        dqOpts,
      ).replace('const x = ', '').replace(/;\n$/, '');
      expect(result).toBe('"say \\"hi\\""');
    });

    it('escapes newlines', () => {
      const result = render({ kind: 'string', value: 'line1\nline2' });
      expect(result).toBe("'line1\\nline2'");
    });

    it('escapes backslashes', () => {
      const result = render({ kind: 'string', value: 'path\\to' });
      expect(result).toBe("'path\\\\to'");
    });

    it('escapes tabs', () => {
      const result = render({ kind: 'string', value: 'a\tb' });
      expect(result).toBe("'a\\tb'");
    });

    it('escapes null bytes', () => {
      const result = render({ kind: 'string', value: 'a\0b' });
      expect(result).toBe("'a\\0b'");
    });
  });

  describe('number rendering', () => {
    it('renders integers', () => {
      expect(render({ kind: 'number', value: 42 })).toBe('42');
    });

    it('renders floats', () => {
      expect(render({ kind: 'number', value: 3.14 })).toBe('3.14');
    });

    it('renders negative numbers', () => {
      expect(render({ kind: 'number', value: -1 })).toBe('-1');
    });
  });

  describe('boolean rendering', () => {
    it('renders true', () => {
      expect(render({ kind: 'boolean', value: true })).toBe('true');
    });

    it('renders false', () => {
      expect(render({ kind: 'boolean', value: false })).toBe('false');
    });
  });

  describe('null/undefined', () => {
    it('renders null', () => {
      expect(render({ kind: 'null' })).toBe('null');
    });

    it('renders undefined', () => {
      expect(render({ kind: 'undefined' })).toBe('undefined');
    });
  });

  describe('identifier', () => {
    it('renders identifier name', () => {
      expect(render({ kind: 'identifier', name: 'myVar' })).toBe('myVar');
    });
  });

  describe('raw expression', () => {
    it('renders raw code as-is', () => {
      expect(render({ kind: 'raw', code: 'process.env.NODE_ENV' })).toBe('process.env.NODE_ENV');
    });
  });
});

// ── Formatter: Objects ───────────────────────────────────────────────

describe('Formatter: Objects', () => {
  const b = new SemanticBuilder();

  it('renders empty object', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.object(() => {}));
    expect(s.toString()).toBe('const x = {};\n');
  });

  it('renders single-prop object multi-line with trailing comma', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.object(o => {
      o.prop('a', o.num(1));
    }));
    expect(s.toString()).toBe(
      'const x = {\n' +
      '  a: 1,\n' +
      '};\n'
    );
  });

  it('renders multi-prop object', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.object(o => {
      o.prop('name', o.str('test'));
      o.prop('value', o.num(42));
      o.prop('active', o.bool(true));
    }));
    expect(s.toString()).toBe(
      'const x = {\n' +
      "  name: 'test',\n" +
      '  value: 42,\n' +
      '  active: true,\n' +
      '};\n'
    );
  });

  it('renders nested objects', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.object(o => {
      o.propObj('inner', inner => {
        inner.prop('deep', inner.bool(true));
      });
    }));
    expect(s.toString()).toBe(
      'const x = {\n' +
      '  inner: {\n' +
      '    deep: true,\n' +
      '  },\n' +
      '};\n'
    );
  });

  it('respects trailingComma: none', () => {
    const s = new SemanticBuilder({ trailingComma: 'none' });
    s.declareConst('x', s.object(o => {
      o.prop('a', o.num(1));
      o.prop('b', o.num(2));
    }));
    expect(s.toString()).toBe(
      'const x = {\n' +
      '  a: 1,\n' +
      '  b: 2\n' +
      '};\n'
    );
  });

  it('renders computed keys', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.object(o => {
      o.computed('key', o.str('value'));
    }));
    expect(s.toString()).toContain("[key]: 'value'");
  });
});

// ── Formatter: Arrays ────────────────────────────────────────────────

describe('Formatter: Arrays', () => {
  it('renders empty array', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.array(() => {}));
    expect(s.toString()).toBe('const x = [];\n');
  });

  it('renders array items with trailing commas', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.array(a => {
      a.item(a.str('one'));
      a.item(a.str('two'));
    }));
    expect(s.toString()).toBe(
      'const x = [\n' +
      "  'one',\n" +
      "  'two',\n" +
      '];\n'
    );
  });

  it('renders array of objects', () => {
    const s = new SemanticBuilder();
    s.declareConst('patterns', s.array(a => {
      a.itemObj(o => {
        o.prop('protocol', o.str('https'));
        o.prop('hostname', o.str('example.com'));
      });
    }));
    const output = s.toString();
    expect(output).toContain("protocol: 'https'");
    expect(output).toContain("hostname: 'example.com'");
  });
});

// ── Formatter: Calls ─────────────────────────────────────────────────

describe('Formatter: Calls', () => {
  it('renders simple call inline', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.call('fn', s.num(1), s.str('a')));
    expect(s.toString()).toBe("const x = fn(1, 'a');\n");
  });

  it('renders call with no args', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.call('getAll'));
    expect(s.toString()).toBe('const x = getAll();\n');
  });

  it('renders call with single object arg inline-start', () => {
    const s = new SemanticBuilder();
    s.declareConst('font', s.call('Inter', s.object(o => {
      o.prop('subsets', o.array(a => a.item(a.str('latin'))));
      o.prop('variable', o.str('--font-sans'));
    })));
    const output = s.toString();
    expect(output).toContain('Inter({');
    expect(output).toContain("variable: '--font-sans'");
    expect(output).toContain('})');
  });
});

// ── SemanticBuilder: Imports ─────────────────────────────────────────

describe('SemanticBuilder: Imports', () => {
  it('renders side-effect import', () => {
    const s = new SemanticBuilder();
    s.importFrom('./globals.css');
    expect(s.toString()).toBe("import './globals.css';\n");
  });

  it('renders named import', () => {
    const s = new SemanticBuilder();
    s.importFrom('react', i => i.named('useState', 'useEffect'));
    expect(s.toString()).toBe("import { useEffect, useState } from 'react';\n");
  });

  it('renders default import', () => {
    const s = new SemanticBuilder();
    s.importFrom('next/font/local', i => i.default('localFont'));
    expect(s.toString()).toBe("import localFont from 'next/font/local';\n");
  });

  it('renders type-only import (importType style)', () => {
    const s = new SemanticBuilder();
    s.importFrom('next', i => i.typeNamed('NextConfig'));
    expect(s.toString()).toBe("import type { NextConfig } from 'next';\n");
  });

  it('renders mixed named + type (separate lines with importType style)', () => {
    const s = new SemanticBuilder();
    s.importFrom('clsx', i => {
      i.typeNamed('ClassValue');
      i.named('clsx');
    });
    const output = s.toString();
    expect(output).toContain("import { clsx } from 'clsx';");
    expect(output).toContain("import type { ClassValue } from 'clsx';");
  });

  it('renders mixed named + type (inline style)', () => {
    const s = new SemanticBuilder({ importTypeStyle: 'inline' });
    s.importFrom('clsx', i => {
      i.typeNamed('ClassValue');
      i.named('clsx');
    });
    const output = s.toString();
    expect(output).toContain("import { clsx, type ClassValue } from 'clsx';");
  });

  it('merges duplicate imports from same module', () => {
    const s = new SemanticBuilder();
    s.importFrom('react', i => i.named('useState'));
    s.importFrom('react', i => i.named('useEffect'));
    const output = s.toString();
    // Should be a single import line
    const importLines = output.split('\n').filter(l => l.startsWith('import'));
    expect(importLines).toHaveLength(1);
    expect(importLines[0]).toContain('useEffect');
    expect(importLines[0]).toContain('useState');
  });

  it('sorts imports alphabetically', () => {
    const s = new SemanticBuilder();
    s.importFrom('react', i => i.named('useState'));
    s.importFrom('clsx', i => i.named('clsx'));
    s.importFrom('next', i => i.typeNamed('NextConfig'));
    const output = s.toString();
    const lines = output.split('\n').filter(l => l.startsWith('import'));
    // External value imports sorted: clsx before react
    expect(lines[0]).toContain('clsx');
    expect(lines[1]).toContain('react');
  });

  it('groups external before local imports', () => {
    const s = new SemanticBuilder();
    s.importFrom('./utils', i => i.named('cn'));
    s.importFrom('react', i => i.named('useState'));
    const output = s.toString();
    const reactLine = output.indexOf("'react'");
    const utilsLine = output.indexOf("'./utils'");
    expect(reactLine).toBeLessThan(utilsLine);
  });

  it('uses double quotes when configured', () => {
    const s = new SemanticBuilder({ quote: 'double' });
    s.importFrom('react', i => i.named('useState'));
    expect(s.toString()).toContain('"react"');
  });

  it('omits semicolons when configured', () => {
    const s = new SemanticBuilder({ semi: false });
    s.importFrom('react', i => i.named('useState'));
    const output = s.toString();
    expect(output).not.toContain(';');
  });
});

// ── SemanticBuilder: Const declarations ──────────────────────────────

describe('SemanticBuilder: Const', () => {
  it('declares simple const', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.num(42));
    expect(s.toString()).toBe('const x = 42;\n');
  });

  it('declares typed const', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.num(42), { type: 'number' });
    expect(s.toString()).toBe('const x: number = 42;\n');
  });

  it('declares exported const', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.num(42), { exported: true });
    expect(s.toString()).toBe('export const x = 42;\n');
  });

  it('fluent const with typed + value', () => {
    const s = new SemanticBuilder();
    s.const('config')
      .typed('Config')
      .value(v => v.object(o => {
        o.prop('key', o.str('value'));
      }));
    const output = s.toString();
    expect(output).toContain('const config: Config = {');
    expect(output).toContain("key: 'value'");
  });

  it('fluent const with exportDefault', () => {
    const s = new SemanticBuilder();
    s.const('config')
      .typed('Config')
      .value(v => v.object(o => {
        o.prop('key', o.str('value'));
      }))
      .exportDefault();
    const output = s.toString();
    expect(output).toContain('const config: Config');
    expect(output).toContain('export default config;');
  });

  it('fluent const with exported()', () => {
    const s = new SemanticBuilder();
    s.const('config')
      .exported()
      .assign(s.str('hello'));
    expect(s.toString()).toContain("export const config = 'hello';");
  });

  it('fluent const with assign()', () => {
    const s = new SemanticBuilder();
    s.const('x')
      .assign(s.call('getValue'));
    expect(s.toString()).toBe('const x = getValue();\n');
  });
});

// ── SemanticBuilder: Functions ────────────────────────────────────────

describe('SemanticBuilder: Functions', () => {
  it('declares simple function', () => {
    const s = new SemanticBuilder();
    s.fn('greet', 'name: string', b => {
      b.return(b.call('console.log', b.id('name')));
    });
    const output = s.toString();
    expect(output).toContain('function greet(name: string) {');
    expect(output).toContain('return console.log(name);');
    expect(output).toContain('}');
  });

  it('declares exported function', () => {
    const s = new SemanticBuilder();
    s.fn('greet', { exported: true }, b => {
      b.return(b.str('hi'));
    });
    expect(s.toString()).toContain('export function greet()');
  });

  it('declares exported default function', () => {
    const s = new SemanticBuilder();
    s.fn('Page', { exported: true, default: true }, b => {
      b.return(b.raw('<h1>Hello</h1>'));
    });
    expect(s.toString()).toContain('export default function Page()');
  });

  it('declares async function', () => {
    const s = new SemanticBuilder();
    s.fn('fetchData', { async: true, returnType: 'Promise<Data>' }, b => {
      b.return(b.call('fetch', b.str('/api')));
    });
    const output = s.toString();
    expect(output).toContain('async function fetchData(): Promise<Data>');
  });

  it('declares function with args option', () => {
    const s = new SemanticBuilder();
    s.fn('cn', { args: ['...inputs: ClassValue[]'], exported: true }, b => {
      b.return(b.call('twMerge', b.call('clsx', b.id('inputs'))));
    });
    const output = s.toString();
    expect(output).toContain('export function cn(...inputs: ClassValue[])');
    expect(output).toContain('return twMerge(clsx(inputs));');
  });

  it('renders function body with local const', () => {
    const s = new SemanticBuilder();
    s.fn('process', '', b => {
      b.declareConst('data', b.call('getData'), { type: 'Data' });
      b.return(b.id('data'));
    });
    const output = s.toString();
    expect(output).toContain('const data: Data = getData();');
    expect(output).toContain('return data;');
  });

  it('renders function body with if/else', () => {
    const s = new SemanticBuilder();
    s.fn('check', 'x: number', b => {
      b.if('x > 0',
        b => b.return(b.str('positive')),
        b => b.return(b.str('negative')),
      );
    });
    const output = s.toString();
    expect(output).toContain('if (x > 0) {');
    expect(output).toContain("return 'positive';");
    expect(output).toContain('} else {');
    expect(output).toContain("return 'negative';");
  });

  it('renders function body with raw statement', () => {
    const s = new SemanticBuilder();
    s.fn('handler', '', b => {
      b.rawStatement('// TODO: implement');
    });
    expect(s.toString()).toContain('  // TODO: implement');
  });
});

// ── SemanticBuilder: Export default ──────────────────────────────────

describe('SemanticBuilder: Export default', () => {
  it('exports default identifier', () => {
    const s = new SemanticBuilder();
    s.exportDefault('config');
    expect(s.toString()).toBe('export default config;\n');
  });

  it('exports default expression', () => {
    const s = new SemanticBuilder();
    s.exportDefault(s.call('createConfig'));
    expect(s.toString()).toBe('export default createConfig();\n');
  });
});

// ── SemanticBuilder: Comments and directives ─────────────────────────

describe('SemanticBuilder: Comments', () => {
  it('renders banner comment', () => {
    const s = new SemanticBuilder();
    s.banner('Generated by web2next.');
    s.declareConst('x', s.num(1));
    const output = s.toString();
    expect(output).toContain('// Generated by web2next.');
    // Banner should be before const
    expect(output.indexOf('//')).toBeLessThan(output.indexOf('const'));
  });

  it('renders multi-line banner', () => {
    const s = new SemanticBuilder();
    s.banner(['Line 1', 'Line 2']);
    const output = s.toString();
    expect(output).toContain('// Line 1');
    expect(output).toContain('// Line 2');
  });

  it('renders JSDoc comment', () => {
    const s = new SemanticBuilder();
    s.jsdoc('Patch the next config.');
    s.declareConst('x', s.num(1));
    expect(s.toString()).toContain('/** Patch the next config. */');
  });

  it('renders multi-line JSDoc', () => {
    const s = new SemanticBuilder();
    s.jsdoc(['First line.', 'Second line.']);
    const output = s.toString();
    expect(output).toContain('/**');
    expect(output).toContain(' * First line.');
    expect(output).toContain(' * Second line.');
    expect(output).toContain(' */');
  });

  it('renders directive', () => {
    const s = new SemanticBuilder();
    s.directive("'use client'");
    s.declareConst('x', s.num(1));
    const output = s.toString();
    expect(output).toContain("'use client';");
    // Directive should be before imports/body
    expect(output.indexOf("'use client'")).toBeLessThan(output.indexOf('const'));
  });
});

// ── SemanticBuilder: Blank line and raw line ─────────────────────────

describe('SemanticBuilder: Escape hatches', () => {
  it('emits raw line', () => {
    const s = new SemanticBuilder();
    s.rawLine("/** @type {import('postcss-load-config').Config} */");
    expect(s.toString()).toContain("/** @type {import('postcss-load-config').Config} */");
  });

  it('emits blank line', () => {
    const s = new SemanticBuilder();
    s.declareConst('a', s.num(1));
    s.blank();
    s.declareConst('b', s.num(2));
    const lines = s.toString().split('\n');
    // Should have a blank line between the two consts
    expect(lines).toContain('');
  });
});

// ── SemanticBuilder: Format options ──────────────────────────────────

describe('SemanticBuilder: Format options', () => {
  it('uses double quotes', () => {
    const s = new SemanticBuilder({ quote: 'double' });
    s.declareConst('x', s.str('hello'));
    expect(s.toString()).toBe('const x = "hello";\n');
  });

  it('omits semicolons', () => {
    const s = new SemanticBuilder({ semi: false });
    s.declareConst('x', s.num(42));
    expect(s.toString()).toBe('const x = 42\n');
  });

  it('omits trailing commas', () => {
    const s = new SemanticBuilder({ trailingComma: 'none' });
    s.declareConst('x', s.object(o => {
      o.prop('a', o.num(1));
    }));
    expect(s.toString()).toBe(
      'const x = {\n' +
      '  a: 1\n' +
      '};\n'
    );
  });

  it('uses tab indentation', () => {
    const s = new SemanticBuilder({ indent: '\t' });
    s.declareConst('x', s.object(o => {
      o.prop('a', o.num(1));
    }));
    expect(s.toString()).toBe(
      'const x = {\n' +
      '\ta: 1,\n' +
      '};\n'
    );
  });

  it('overrides via toString()', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.str('hello'));
    expect(s.toString({ quote: 'double' })).toBe('const x = "hello";\n');
    // Original options unchanged
    expect(s.toString()).toBe("const x = 'hello';\n");
  });

  it('overrides via format()', () => {
    const s = new SemanticBuilder();
    s.format({ quote: 'double' });
    s.declareConst('x', s.str('hello'));
    expect(s.toString()).toBe('const x = "hello";\n');
  });
});

// ── Determinism ──────────────────────────────────────────────────────

describe('Determinism', () => {
  it('same input produces byte-identical output', () => {
    function build(): string {
      const s = new SemanticBuilder();
      s.importFrom('next', i => i.typeNamed('NextConfig'));
      s.importFrom('react', i => i.named('useState', 'useEffect'));
      s.importFrom('./utils', i => i.named('cn'));
      s.const('config')
        .typed('NextConfig')
        .value(v => v.object(o => {
          o.prop('output', o.str('export'));
          o.propObj('images', img => {
            img.prop('unoptimized', img.bool(true));
            img.propArr('remotePatterns', arr => {
              arr.itemObj(rp => {
                rp.prop('protocol', rp.str('https'));
                rp.prop('hostname', rp.str('example.com'));
              });
            });
          });
        }))
        .exportDefault();
      return s.toString();
    }

    const output1 = build();
    const output2 = build();
    const output3 = build();
    expect(output1).toBe(output2);
    expect(output2).toBe(output3);
  });
});

// ── Conditionals produce valid output ────────────────────────────────

describe('Conditional combinations', () => {
  interface Patch {
    staticExport: boolean;
    imageHostname?: string;
  }

  function buildConfig(patch: Patch): string {
    const needsImageConfig = patch.staticExport || patch.imageHostname;
    const s = new SemanticBuilder();
    s.importFrom('next', i => i.typeNamed('NextConfig'));
    s.const('nextConfig')
      .typed('NextConfig')
      .value(v => v.object(o => {
        o.when(patch.staticExport, o => o.prop('output', o.str('export')));
        o.when(needsImageConfig, o => o.propObj('images', img => {
          img.when(patch.staticExport, img => img.prop('unoptimized', img.bool(true)));
          img.when(patch.imageHostname, img =>
            img.propArr('remotePatterns', arr => {
              arr.itemObj(rp => {
                rp.prop('protocol', rp.str('https'));
                rp.prop('hostname', rp.str(patch.imageHostname!));
              });
            })
          );
        }));
      }))
      .exportDefault();
    return s.toString();
  }

  it('no flags → empty config', () => {
    const output = buildConfig({ staticExport: false });
    expect(output).toContain('const nextConfig: NextConfig = {};');
  });

  it('staticExport only', () => {
    const output = buildConfig({ staticExport: true });
    expect(output).toContain("output: 'export'");
    expect(output).toContain('unoptimized: true');
    expect(output).not.toContain('remotePatterns');
  });

  it('imageHostname only', () => {
    const output = buildConfig({ staticExport: false, imageHostname: 'cdn.example.com' });
    expect(output).not.toContain('output');
    expect(output).not.toContain('unoptimized');
    expect(output).toContain("hostname: 'cdn.example.com'");
  });

  it('both flags', () => {
    const output = buildConfig({ staticExport: true, imageHostname: 'cdn.example.com' });
    expect(output).toContain("output: 'export'");
    expect(output).toContain('unoptimized: true');
    expect(output).toContain("hostname: 'cdn.example.com'");
  });

  it('hostname with special characters is properly escaped', () => {
    const output = buildConfig({ staticExport: false, imageHostname: "it's-a-host.com" });
    expect(output).toContain("hostname: 'it\\'s-a-host.com'");
  });
});

// ── Full integration: patchNextConfig equivalent ─────────────────────

describe('Integration: patchNextConfig', () => {
  it('produces correct next.config.ts output', () => {
    const s = new SemanticBuilder();
    s.importFrom('next', i => i.typeNamed('NextConfig'));

    s.const('nextConfig')
      .typed('NextConfig')
      .value(v => v.object(o => {
        o.prop('output', o.str('export'));
        o.propObj('images', img => {
          img.prop('unoptimized', img.bool(true));
          img.propArr('remotePatterns', arr => {
            arr.itemObj(rp => {
              rp.prop('protocol', rp.str('https'));
              rp.prop('hostname', rp.str('steep.app'));
            });
          });
        });
      }))
      .exportDefault();

    const output = s.toString();

    expect(output).toContain("import type { NextConfig } from 'next';");
    expect(output).toContain('const nextConfig: NextConfig = {');
    expect(output).toContain("  output: 'export',");
    expect(output).toContain('  images: {');
    expect(output).toContain('    unoptimized: true,');
    expect(output).toContain('    remotePatterns: [');
    expect(output).toContain("      protocol: 'https',");
    expect(output).toContain("      hostname: 'steep.app',");
    expect(output).toContain('export default nextConfig;');
  });
});

// ── Full integration: utils.ts equivalent ────────────────────────────

describe('Integration: utils.ts (cn helper)', () => {
  it('produces correct utils.ts output', () => {
    const s = new SemanticBuilder();
    s.importFrom('clsx', i => {
      i.typeNamed('ClassValue');
      i.named('clsx');
    });
    s.importFrom('tailwind-merge', i => i.named('twMerge'));

    s.fn('cn', { args: ['...inputs: ClassValue[]'], exported: true }, b => {
      b.return(b.call('twMerge', b.call('clsx', b.id('inputs'))));
    });

    const output = s.toString();
    expect(output).toContain("import { clsx } from 'clsx';");
    expect(output).toContain("import type { ClassValue } from 'clsx';");
    expect(output).toContain("import { twMerge } from 'tailwind-merge';");
    expect(output).toContain('export function cn(...inputs: ClassValue[]) {');
    expect(output).toContain('  return twMerge(clsx(inputs));');
    expect(output).toContain('}');
  });
});

// ── Full integration: postcss.config.mjs equivalent ──────────────────

describe('Integration: postcss.config.mjs', () => {
  it('produces correct postcss config', () => {
    const s = new SemanticBuilder();
    s.rawLine("/** @type {import('postcss-load-config').Config} */");
    s.declareConst('config', s.object(o => {
      o.propObj('plugins', p => {
        p.prop("'@tailwindcss/postcss'", p.object(() => {}));
      });
    }));
    s.blank();
    s.exportDefault('config');

    const output = s.toString();
    expect(output).toContain("/** @type {import('postcss-load-config').Config} */");
    expect(output).toContain('const config = {');
    expect(output).toContain("'@tailwindcss/postcss': {},");
    expect(output).toContain('export default config;');
  });
});

// ── File formatting behavior ─────────────────────────────────────────

describe('File formatting', () => {
  it('always ends with trailing newline', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.num(1));
    expect(s.toString().endsWith('\n')).toBe(true);
  });

  it('blank line between imports and body', () => {
    const s = new SemanticBuilder();
    s.importFrom('react', i => i.named('useState'));
    s.declareConst('x', s.num(1));
    const lines = s.toString().split('\n');
    const importLine = lines.findIndex(l => l.startsWith('import'));
    const constLine = lines.findIndex(l => l.startsWith('const'));
    // There should be a blank line between them
    expect(constLine - importLine).toBeGreaterThanOrEqual(2);
  });

  it('blank line between import groups', () => {
    const s = new SemanticBuilder();
    s.importFrom('react', i => i.named('useState'));
    s.importFrom('./utils', i => i.named('cn'));
    const output = s.toString();
    const lines = output.split('\n');
    const reactIdx = lines.findIndex(l => l.includes('react'));
    const utilsIdx = lines.findIndex(l => l.includes('./utils'));
    // There should be a blank line between external and local groups
    expect(utilsIdx - reactIdx).toBeGreaterThanOrEqual(2);
  });

  it('auto blank line between top-level declarations', () => {
    const s = new SemanticBuilder();
    s.declareConst('x', s.num(1));
    s.fn('f', '', b => b.return(b.num(2)));
    const lines = s.toString().split('\n');
    const constIdx = lines.findIndex(l => l.includes('const x'));
    const fnIdx = lines.findIndex(l => l.includes('function f'));
    expect(fnIdx - constIdx).toBeGreaterThanOrEqual(2);
  });

  it('directive before imports', () => {
    const s = new SemanticBuilder();
    s.importFrom('react', i => i.named('useState'));
    s.directive("'use client'");
    s.declareConst('x', s.num(1));
    const output = s.toString();
    expect(output.indexOf("'use client'")).toBeLessThan(output.indexOf('import'));
  });

  it('banner before directives', () => {
    const s = new SemanticBuilder();
    s.directive("'use client'");
    s.banner('Auto-generated');
    const output = s.toString();
    expect(output.indexOf('// Auto-generated')).toBeLessThan(output.indexOf("'use client'"));
  });
});
