import { describe, it, expect } from 'vitest';
import { ImportRegistry } from '../src/import-registry.ts';

describe('ImportRegistry', () => {
  describe('add', () => {
    it('registers a named import', () => {
      const r = new ImportRegistry();
      r.add('react', { named: ['useState'] });
      expect(r.buildLines()).toEqual(["import { useState } from 'react';"]);
    });

    it('registers a default import', () => {
      const r = new ImportRegistry();
      r.add('react', { default: 'React' });
      expect(r.buildLines()).toEqual(["import React from 'react';"]);
    });

    it('registers a type-only import', () => {
      const r = new ImportRegistry();
      r.add('react', { types: ['FC'] });
      expect(r.buildLines()).toEqual(["import type { FC } from 'react';"]);
    });

    it('registers a side-effect import when spec is omitted', () => {
      const r = new ImportRegistry();
      r.add('./globals.css');
      expect(r.buildLines()).toEqual(["import './globals.css';"]);
    });

    it('merges named imports from the same module', () => {
      const r = new ImportRegistry();
      r.add('react', { named: ['useState'] });
      r.add('react', { named: ['useEffect'] });
      expect(r.buildLines()).toEqual(["import { useEffect, useState } from 'react';"]);
    });

    it('merges type imports from the same module', () => {
      const r = new ImportRegistry();
      r.add('react', { types: ['FC'] });
      r.add('react', { types: ['ReactNode'] });
      expect(r.buildLines()).toEqual(["import type { FC, ReactNode } from 'react';"]);
    });

    it('deduplicates identical named imports', () => {
      const r = new ImportRegistry();
      r.add('react', { named: ['useState'] });
      r.add('react', { named: ['useState'] });
      expect(r.buildLines()).toEqual(["import { useState } from 'react';"]);
    });

    it('combines default, named, and type imports from the same module', () => {
      const r = new ImportRegistry();
      r.add('react', { default: 'React' });
      r.add('react', { named: ['useState'] });
      r.add('react', { types: ['FC'] });

      const lines = r.buildLines();
      expect(lines).toContain("import React, { useState } from 'react';");
      expect(lines).toContain("import type { FC } from 'react';");
    });
  });

  describe('grouping and sorting', () => {
    it('groups external before local imports', () => {
      const r = new ImportRegistry();
      r.add('./local', { named: ['foo'] });
      r.add('react', { named: ['useState'] });

      const lines = r.buildLines();
      const reactIdx = lines.indexOf("import { useState } from 'react';");
      const localIdx = lines.indexOf("import { foo } from './local';");
      expect(reactIdx).toBeLessThan(localIdx);
    });

    it('treats @/ paths as local imports', () => {
      const r = new ImportRegistry();
      r.add('@/utils', { named: ['helper'] });
      r.add('lodash', { named: ['map'] });

      const lines = r.buildLines();
      const lodashIdx = lines.indexOf("import { map } from 'lodash';");
      const localIdx = lines.indexOf("import { helper } from '@/utils';");
      expect(lodashIdx).toBeLessThan(localIdx);
    });

    it('separates groups with blank lines', () => {
      const r = new ImportRegistry();
      r.add('react', { named: ['useState'] });
      r.add('./local', { named: ['foo'] });

      const lines = r.buildLines();
      expect(lines).toEqual([
        "import { useState } from 'react';",
        '',
        "import { foo } from './local';",
      ]);
    });

    it('sorts imports within each group alphabetically', () => {
      const r = new ImportRegistry();
      r.add('zod', { named: ['z'] });
      r.add('axios', { default: 'axios' });

      const lines = r.buildLines();
      expect(lines[0]).toBe("import axios from 'axios';");
      expect(lines[1]).toBe("import { z } from 'zod';");
    });

    it('sorts named specifiers alphabetically', () => {
      const r = new ImportRegistry();
      r.add('react', { named: ['useRef', 'useEffect', 'useState'] });
      expect(r.buildLines()).toEqual([
        "import { useEffect, useRef, useState } from 'react';",
      ]);
    });

    it('places side-effect imports last', () => {
      const r = new ImportRegistry();
      r.add('./styles.css');
      r.add('react', { named: ['useState'] });

      const lines = r.buildLines();
      const lastLine = lines[lines.length - 1];
      expect(lastLine).toBe("import './styles.css';");
    });

    it('handles full grouping order: value ext → type ext → value local → type local → side-effect', () => {
      const r = new ImportRegistry();
      r.add('./globals.css');
      r.add('./utils', { types: ['Config'] });
      r.add('./utils', { named: ['parse'] });
      r.add('react', { types: ['FC'] });
      r.add('react', { named: ['useState'] });

      const lines = r.buildLines();
      expect(lines).toEqual([
        "import { useState } from 'react';",
        '',
        "import type { FC } from 'react';",
        '',
        "import { parse } from './utils';",
        '',
        "import type { Config } from './utils';",
        '',
        "import './globals.css';",
      ]);
    });
  });

  describe('side-effect suppression', () => {
    it('does not emit side-effect if value specifiers exist', () => {
      const r = new ImportRegistry();
      r.add('react');
      r.add('react', { named: ['useState'] });
      const lines = r.buildLines();
      expect(lines).toEqual(["import { useState } from 'react';"]);
    });
  });

  describe('dependencies', () => {
    it('tracks dependencies', () => {
      const r = new ImportRegistry();
      r.addDependency('gsap', '^3.12.0');
      r.addDependency('framer-motion');
      const deps = r.getDependencies();
      expect(deps.get('gsap')).toBe('^3.12.0');
      expect(deps.get('framer-motion')).toBe('*');
    });

    it('returns a copy from getDependencies', () => {
      const r = new ImportRegistry();
      r.addDependency('react', '^19.0.0');
      const deps = r.getDependencies();
      deps.set('vue', '^3.0.0');
      expect(r.getDependencies().has('vue')).toBe(false);
    });
  });

  describe('hasImports', () => {
    it('is false when empty', () => {
      expect(new ImportRegistry().hasImports).toBe(false);
    });

    it('is true after adding an import', () => {
      const r = new ImportRegistry();
      r.add('react', { named: ['useState'] });
      expect(r.hasImports).toBe(true);
    });
  });

  describe('buildLines edge cases', () => {
    it('returns empty array when no imports registered', () => {
      expect(new ImportRegistry().buildLines()).toEqual([]);
    });
  });
});
