import { describe, it, expect } from 'vitest';
import { ModuleBuilder } from '../src/module-builder.ts';

/** Strip trailing newline for cleaner assertions. */
const out = (b: ModuleBuilder) => b.toString().replace(/\n$/, '');

describe('ModuleBuilder', () => {
  describe('banner', () => {
    it('emits a banner comment at the top', () => {
      const b = new ModuleBuilder().banner('Generated').line('body');
      expect(out(b)).toBe('// Generated\n\nbody');
    });

    it('last banner wins', () => {
      const b = new ModuleBuilder().banner('first').banner('second').line('body');
      expect(out(b)).toBe('// second\n\nbody');
    });
  });

  describe('directive', () => {
    it('emits a directive before imports and body', () => {
      const b = new ModuleBuilder()
        .directive("'use strict';")
        .line('body');
      expect(out(b)).toBe("'use strict';\n\nbody");
    });

    it('deduplicates identical directives', () => {
      const b = new ModuleBuilder()
        .directive("'use strict';")
        .directive("'use strict';")
        .line('body');
      expect(out(b).split("'use strict';").length - 1).toBe(1);
    });

    it('preserves order of different directives', () => {
      const b = new ModuleBuilder()
        .directive("'use client';")
        .directive("'use server';")
        .line('body');
      const text = out(b);
      expect(text.indexOf("'use client';")).toBeLessThan(text.indexOf("'use server';"));
    });
  });

  describe('addImport', () => {
    it('emits registered imports before body', () => {
      const b = new ModuleBuilder()
        .addImport('react', { named: ['useState'] })
        .line('const x = useState(0);');
      expect(out(b)).toBe(
        "import { useState } from 'react';\n\nconst x = useState(0);"
      );
    });

    it('merges imports from the same module', () => {
      const b = new ModuleBuilder()
        .addImport('react', { named: ['useState'] })
        .addImport('react', { named: ['useEffect'] })
        .line('body');
      expect(out(b)).toContain("import { useEffect, useState } from 'react';");
    });
  });

  describe('dependencies', () => {
    it('tracks dependencies via addDependency', () => {
      const b = new ModuleBuilder();
      b.addDependency('gsap', '^3.12.0');
      const deps = b.getDependencies();
      expect(deps.get('gsap')).toBe('^3.12.0');
    });
  });

  describe('legacy import helpers', () => {
    it('importNamed emits immediately in body', () => {
      const b = new ModuleBuilder().importNamed(['a', 'b'], 'mod');
      expect(out(b)).toBe("import { a, b } from 'mod';");
    });

    it('importNamed accepts a single string', () => {
      const b = new ModuleBuilder().importNamed('a', 'mod');
      expect(out(b)).toBe("import { a } from 'mod';");
    });

    it('importDefault emits immediately in body', () => {
      const b = new ModuleBuilder().importDefault('React', 'react');
      expect(out(b)).toBe("import React from 'react';");
    });

    it('importType emits immediately in body', () => {
      const b = new ModuleBuilder().importType(['FC', 'ReactNode'], 'react');
      expect(out(b)).toBe("import type { FC, ReactNode } from 'react';");
    });

    it('importSideEffect emits immediately in body', () => {
      const b = new ModuleBuilder().importSideEffect('./globals.css');
      expect(out(b)).toBe("import './globals.css';");
    });
  });

  describe('toString output order', () => {
    it('emits banner → directives → imports → body', () => {
      const b = new ModuleBuilder()
        .banner('Auto-generated')
        .directive("'use client';")
        .addImport('react', { named: ['useState'] })
        .line('const x = 1;');

      const text = out(b);
      const lines = text.split('\n');

      expect(lines[0]).toBe('// Auto-generated');
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe("'use client';");
      expect(lines[3]).toBe('');
      expect(lines[4]).toBe("import { useState } from 'react';");
      expect(lines[5]).toBe('');
      expect(lines[6]).toBe('const x = 1;');
    });

    it('falls back to super.toString() when no header content', () => {
      const b = new ModuleBuilder().line('just body');
      expect(out(b)).toBe('just body');
    });

    it('omits empty sections', () => {
      const b = new ModuleBuilder()
        .addImport('react', { named: ['useState'] })
        .line('body');
      const text = out(b);
      // No banner or directive, so should start with import
      expect(text.startsWith('import')).toBe(true);
    });
  });

  describe('inherits CoreBuilder', () => {
    it('supports block() from CoreBuilder', () => {
      const b = new ModuleBuilder().block('if (x) {', '}', b => {
        b.line('doStuff();');
      });
      expect(out(b)).toBe('if (x) {\n  doStuff();\n}');
    });

    it('supports when/each from CoreBuilder', () => {
      const b = new ModuleBuilder()
        .when(true, b => b.line('yes'))
        .each([1, 2], (b, n) => b.line(`item ${n}`));
      expect(out(b)).toBe('yes\nitem 1\nitem 2');
    });
  });
});
