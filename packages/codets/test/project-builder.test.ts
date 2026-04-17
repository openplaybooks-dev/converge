import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ProjectBuilder } from '../src/project-builder.ts';
import { CoreBuilder } from '../src/core-builder.ts';
import { ReactBuilder } from '../src/react-builder.ts';
import { SemanticBuilder } from '../src/semantic/index.ts';

describe('ProjectBuilder', () => {
  describe('file()', () => {
    it('creates a file with builder content', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('src/hello.ts', b => {
        b.line('console.log("hello");');
      });
      expect(p.has('src/hello.ts')).toBe(true);
      expect(p.getContent('src/hello.ts')).toBe('console.log("hello");\n');
    });

    it('provides a fresh builder for each file', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('a.ts', b => b.line('a'));
      p.file('b.ts', b => b.line('b'));
      expect(p.getContent('a.ts')).toBe('a\n');
      expect(p.getContent('b.ts')).toBe('b\n');
    });

    it('overwrites existing file on same path', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('x.ts', b => b.line('first'));
      p.file('x.ts', b => b.line('second'));
      expect(p.getContent('x.ts')).toBe('second\n');
    });
  });

  describe('rawFile()', () => {
    it('stores raw string content', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('config.json', '{"key": "value"}');
      expect(p.has('config.json')).toBe(true);
      expect(p.getContent('config.json')).toBe('{"key": "value"}');
    });
  });

  describe('dir()', () => {
    it('registers an explicit directory', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.dir('src/components/ui');
      expect(p.dirPaths).toContain('src/components/ui');
    });
  });

  describe('auto parent dirs', () => {
    it('registers parent directories for files', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('src/app/page.tsx', b => b.line('// page'));
      expect(p.dirPaths).toContain('src');
      expect(p.dirPaths).toContain('src/app');
    });

    it('registers parent dirs for rawFile too', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('public/images/logo.png', 'binary');
      expect(p.dirPaths).toContain('public');
      expect(p.dirPaths).toContain('public/images');
    });
  });

  describe('has()', () => {
    it('returns false for unregistered paths', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      expect(p.has('nope.ts')).toBe(false);
    });

    it('finds both built and raw files', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('a.ts', b => b.line('a'));
      p.rawFile('b.json', '{}');
      expect(p.has('a.ts')).toBe(true);
      expect(p.has('b.json')).toBe(true);
    });
  });

  describe('getContent()', () => {
    it('returns undefined for missing files', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      expect(p.getContent('missing.ts')).toBeUndefined();
    });

    it('prefers built file over raw file on same path', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('x.ts', 'raw');
      p.file('x.ts', b => b.line('built'));
      expect(p.getContent('x.ts')).toBe('built\n');
    });
  });

  describe('filePaths', () => {
    it('returns all file paths without duplicates', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('a.ts', b => b.line('a'));
      p.rawFile('b.json', '{}');
      p.rawFile('a.ts', 'duplicate');
      const paths = p.filePaths;
      expect(paths).toHaveLength(2);
      expect(paths).toContain('a.ts');
      expect(paths).toContain('b.json');
    });
  });

  describe('files() iterator', () => {
    it('yields all files as [path, content] pairs', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('a.ts', b => b.line('a'));
      p.rawFile('b.json', '{}');
      const entries = [...p.files()];
      expect(entries).toHaveLength(2);
      expect(entries[0][0]).toBe('a.ts');
      expect(entries[1][0]).toBe('b.json');
    });

    it('does not yield duplicate raw file when built file exists', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('x.ts', 'raw');
      p.file('x.ts', b => b.line('built'));
      const entries = [...p.files()];
      expect(entries).toHaveLength(1);
      expect(entries[0][1]).toBe('built\n');
    });
  });

  describe('fileCount', () => {
    it('counts unique files', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('a.ts', b => b.line('a'));
      p.rawFile('b.json', '{}');
      expect(p.fileCount).toBe(2);
    });

    it('does not double-count overlapping paths', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('x.ts', b => b.line('a'));
      p.rawFile('x.ts', 'raw');
      expect(p.fileCount).toBe(1);
    });
  });

  describe('forEach()', () => {
    it('calls function for each file', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('a.ts', b => b.line('a'));
      p.rawFile('b.json', '{}');
      const collected: string[] = [];
      p.forEach((path) => collected.push(path));
      expect(collected).toEqual(['a.ts', 'b.json']);
    });
  });

  describe('createBuilder()', () => {
    it('returns a builder instance from the factory', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      const b = p.createBuilder();
      expect(b).toBeInstanceOf(CoreBuilder);
    });
  });

  describe('typed builder', () => {
    it('uses ReactBuilder when factory provides one', () => {
      const p = new ProjectBuilder(() => new ReactBuilder());
      p.file('page.tsx', b => {
        b.useClient()
          .addImport('react', { named: ['useState'] })
          .fn('Page', '', b => {
            b.returnJsx(b => b.line('<h1>Hi</h1>'));
          }, { exported: true, default: true });
      });
      const content = p.getContent('page.tsx')!;
      expect(content).toContain("'use client';");
      expect(content).toContain("import { useState } from 'react';");
      expect(content).toContain('export default function Page()');
      expect(content).toContain('<h1>Hi</h1>');
    });

    it('supports custom builder subclasses', () => {
      class GoBuilder extends CoreBuilder {
        funcDecl(name: string, body: (b: this) => void): this {
          return this.block(`func ${name}() {`, '}', body);
        }
      }

      const p = new ProjectBuilder(() => new GoBuilder());
      p.file('main.go', b => {
        b.line('package main').blank();
        b.funcDecl('main', b => {
          b.line('fmt.Println("hello")');
        });
      });
      const content = p.getContent('main.go')!;
      expect(content).toContain('package main');
      expect(content).toContain('func main() {');
      expect(content).toContain('fmt.Println("hello")');
    });
  });

  describe('fluent chaining', () => {
    it('all mutation methods return this', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      const result = p
        .dir('src')
        .file('a.ts', b => b.line('a'))
        .rawFile('b.json', '{}')
        .dir('public');
      expect(result).toBe(p);
    });
  });

  describe('empty project', () => {
    it('starts with no files', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      expect(p.fileCount).toBe(0);
      expect(p.filePaths).toEqual([]);
      expect([...p.files()]).toEqual([]);
    });
  });

  // ── Typed file helpers ────────────────────────────────────────

  describe('css()', () => {
    it('stores CSS content as a raw file', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.css('src/app/globals.css', 'body { margin: 0; }');
      expect(p.has('src/app/globals.css')).toBe(true);
      expect(p.getContent('src/app/globals.css')).toBe('body { margin: 0; }');
    });

    it('registers parent directories', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.css('src/components/ui/card.module.css', '.card {}');
      expect(p.dirPaths).toContain('src');
      expect(p.dirPaths).toContain('src/components');
      expect(p.dirPaths).toContain('src/components/ui');
    });

    it('returns this for chaining', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      expect(p.css('a.css', '')).toBe(p);
    });
  });

  describe('json()', () => {
    it('serializes an object to pretty JSON with trailing newline', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.json('package.json', { name: 'test', version: '1.0.0' });
      expect(p.has('package.json')).toBe(true);
      const content = p.getContent('package.json')!;
      expect(content).toBe('{\n  "name": "test",\n  "version": "1.0.0"\n}\n');
    });

    it('handles arrays', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.json('data.json', [1, 2, 3]);
      expect(p.getContent('data.json')).toBe('[\n  1,\n  2,\n  3\n]\n');
    });

    it('handles nested objects', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.json('config.json', { a: { b: 'c' } });
      expect(p.getContent('config.json')).toContain('"b": "c"');
    });

    it('registers parent directories', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.json('src/data/config.json', {});
      expect(p.dirPaths).toContain('src');
      expect(p.dirPaths).toContain('src/data');
    });

    it('returns this for chaining', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      expect(p.json('a.json', {})).toBe(p);
    });
  });

  describe('semantic()', () => {
    it('builds a TS file via SemanticBuilder', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.semantic('src/config.ts', b => {
        b.importFrom('next', i => i.typeNamed('NextConfig'));
        b.const('config')
          .typed('NextConfig')
          .value(v => v.object(o => {
            o.prop('output', o.str('export'));
          }))
          .exportDefault();
      });
      const content = p.getContent('src/config.ts')!;
      expect(content).toContain("import type { NextConfig } from 'next';");
      expect(content).toContain('const config: NextConfig');
      expect(content).toContain("output: 'export'");
      expect(content).toContain('export default config;');
    });

    it('registers parent directories', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.semantic('src/lib/config.ts', b => {
        b.declareConst('x', b.num(1));
      });
      expect(p.dirPaths).toContain('src');
      expect(p.dirPaths).toContain('src/lib');
    });

    it('returns this for chaining', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      expect(p.semantic('a.ts', () => {})).toBe(p);
    });
  });

  // ── New: remove() ────────────────────────────────────────────

  describe('remove()', () => {
    it('removes a built file', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('a.ts', b => b.line('a'));
      expect(p.has('a.ts')).toBe(true);
      p.remove('a.ts');
      expect(p.has('a.ts')).toBe(false);
      expect(p.fileCount).toBe(0);
    });

    it('removes a raw file', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('config.json', '{}');
      p.remove('config.json');
      expect(p.has('config.json')).toBe(false);
    });

    it('removes both built and raw at same path', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('x.ts', 'raw');
      p.file('x.ts', b => b.line('built'));
      p.remove('x.ts');
      expect(p.has('x.ts')).toBe(false);
    });

    it('is a no-op for missing paths', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.remove('nope.ts');
      expect(p.fileCount).toBe(0);
    });

    it('returns this for chaining', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      expect(p.remove('x')).toBe(p);
    });
  });

  // ── New: rename() ────────────────────────────────────────────

  describe('rename()', () => {
    it('renames a built file', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('old.ts', b => b.line('content'));
      p.rename('old.ts', 'new.ts');
      expect(p.has('old.ts')).toBe(false);
      expect(p.has('new.ts')).toBe(true);
      expect(p.getContent('new.ts')).toBe('content\n');
    });

    it('renames a raw file', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('old.json', '{}');
      p.rename('old.json', 'new.json');
      expect(p.has('old.json')).toBe(false);
      expect(p.has('new.json')).toBe(true);
      expect(p.getContent('new.json')).toBe('{}');
    });

    it('registers parent dirs for new path', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('a.ts', 'content');
      p.rename('a.ts', 'src/deep/b.ts');
      expect(p.dirPaths).toContain('src');
      expect(p.dirPaths).toContain('src/deep');
    });

    it('is a no-op for missing paths', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rename('nope.ts', 'also-nope.ts');
      expect(p.fileCount).toBe(0);
    });

    it('returns this for chaining', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      expect(p.rename('a', 'b')).toBe(p);
    });
  });

  // ── New: merge() ─────────────────────────────────────────────

  describe('merge()', () => {
    it('merges files from another builder', () => {
      const a = new ProjectBuilder(() => new CoreBuilder());
      a.file('a.ts', b => b.line('a'));

      const b = new ProjectBuilder(() => new CoreBuilder());
      b.rawFile('b.json', '{}');

      a.merge(b);
      expect(a.has('a.ts')).toBe(true);
      expect(a.has('b.json')).toBe(true);
      expect(a.fileCount).toBe(2);
    });

    it('overwrites files at same path', () => {
      const a = new ProjectBuilder(() => new CoreBuilder());
      a.rawFile('x.ts', 'old');

      const b = new ProjectBuilder(() => new CoreBuilder());
      b.rawFile('x.ts', 'new');

      a.merge(b);
      expect(a.getContent('x.ts')).toBe('new');
    });

    it('merges directories', () => {
      const a = new ProjectBuilder(() => new CoreBuilder());
      a.dir('src');

      const b = new ProjectBuilder(() => new CoreBuilder());
      b.dir('public');
      b.rawFile('public/logo.png', 'binary');

      a.merge(b);
      expect(a.dirPaths).toContain('src');
      expect(a.dirPaths).toContain('public');
    });

    it('returns this for chaining', () => {
      const a = new ProjectBuilder(() => new CoreBuilder());
      const b = new ProjectBuilder(() => new CoreBuilder());
      expect(a.merge(b)).toBe(a);
    });
  });

  // ── New: flush() ─────────────────────────────────────────────

  describe('flush()', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = join(tmpdir(), `codegen-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ok */ }
    });

    it('writes files to disk', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.file('src/hello.ts', b => b.line('console.log("hello");'));
      p.rawFile('config.json', '{"key": "value"}');

      const result = p.flush(tmpDir);

      expect(result.files).toContain('src/hello.ts');
      expect(result.files).toContain('config.json');
      expect(existsSync(join(tmpDir, 'src', 'hello.ts'))).toBe(true);
      expect(readFileSync(join(tmpDir, 'src', 'hello.ts'), 'utf-8')).toBe('console.log("hello");\n');
      expect(readFileSync(join(tmpDir, 'config.json'), 'utf-8')).toBe('{"key": "value"}');
    });

    it('creates registered directories', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.dir('src/components/ui');
      p.dir('public/images');

      const result = p.flush(tmpDir);

      expect(result.dirs).toContain('src/components/ui');
      expect(result.dirs).toContain('public/images');
      expect(existsSync(join(tmpDir, 'src', 'components', 'ui'))).toBe(true);
      expect(existsSync(join(tmpDir, 'public', 'images'))).toBe(true);
    });

    it('creates parent directories for files automatically', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('deep/nested/file.txt', 'content');

      p.flush(tmpDir);
      expect(existsSync(join(tmpDir, 'deep', 'nested', 'file.txt'))).toBe(true);
    });

    it('supports dryRun mode', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('file.txt', 'content');

      const result = p.flush(tmpDir, { dryRun: true });

      expect(result.files).toContain('file.txt');
      expect(existsSync(join(tmpDir, 'file.txt'))).toBe(false);
    });

    it('supports clean mode', () => {
      // Pre-create a file
      mkdirSync(join(tmpDir, 'old'), { recursive: true });
      writeFileSync(join(tmpDir, 'old', 'stale.txt'), 'stale');

      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('new.txt', 'fresh');

      p.flush(tmpDir, { clean: true });

      expect(existsSync(join(tmpDir, 'new.txt'))).toBe(true);
      expect(existsSync(join(tmpDir, 'old', 'stale.txt'))).toBe(false);
    });

    it('supports diffOnly mode', () => {
      // Pre-create a file with same content
      writeFileSync(join(tmpDir, 'same.txt'), 'unchanged');
      writeFileSync(join(tmpDir, 'diff.txt'), 'old-content');

      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('same.txt', 'unchanged');
      p.rawFile('diff.txt', 'new-content');

      const result = p.flush(tmpDir, { diffOnly: true });

      expect(result.unchanged).toContain('same.txt');
      expect(result.files).toContain('diff.txt');
      expect(result.files).not.toContain('same.txt');
      expect(readFileSync(join(tmpDir, 'diff.txt'), 'utf-8')).toBe('new-content');
    });

    it('calls onWrite callback for each file', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.rawFile('a.txt', 'aaa');
      p.rawFile('b.txt', 'bbb');

      const written: string[] = [];
      p.flush(tmpDir, { onWrite: (path) => written.push(path) });

      expect(written).toContain('a.txt');
      expect(written).toContain('b.txt');
    });

    it('calls onMkdir callback for each directory', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.dir('src');
      p.dir('public');

      const created: string[] = [];
      p.flush(tmpDir, { onMkdir: (dir) => created.push(dir) });

      expect(created).toContain('src');
      expect(created).toContain('public');
    });

    it('returns structured FlushResult', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      p.dir('src');
      p.rawFile('src/index.ts', 'export {};');

      const result = p.flush(tmpDir);

      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('dirs');
      expect(result).toHaveProperty('unchanged');
      expect(result.files).toContain('src/index.ts');
      expect(result.dirs).toContain('src');
      expect(result.unchanged).toEqual([]);
    });

    it('handles empty project', () => {
      const p = new ProjectBuilder(() => new CoreBuilder());
      const result = p.flush(tmpDir);
      expect(result.files).toEqual([]);
      expect(result.dirs).toEqual([]);
    });
  });
});
