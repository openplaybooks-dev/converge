import { defineConfig } from 'tsup';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts',
    client: 'src/client/index.ts',
    'shims/grep': 'src/shims/grep.ts',
    'shims/wc': 'src/shims/wc.ts',
    'shims/jq': 'src/shims/jq.ts',
    'shims/find': 'src/shims/find.ts',
  },
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'node18',
  shims: true,
  // Bundle workspace dependencies
  noExternal: [/@converge\/.*/, 'codets'],
  external: ['glob', 'yaml', 'tsx', /^tsx\/.*/],
  // Add shebang only to cli entry
  onSuccess: async () => {
    const fs = await import('fs');
    const cliPath = path.resolve(__dirname, 'dist/cli.js');
    const content = fs.readFileSync(cliPath, 'utf-8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      fs.writeFileSync(cliPath, '#!/usr/bin/env node\n' + content);
      fs.chmodSync(cliPath, '755');
    }
  },
  esbuildOptions(options) {
    // Add path aliases for workspace packages
    options.alias = {
      '@converge/agentfn': path.resolve(__dirname, '../agentfn/dist/index.js'),
      '@converge/agentfn/skills': path.resolve(__dirname, '../agentfn/dist/skills.js'),
      '@converge/claudefn': path.resolve(__dirname, '../claudefn/dist/index.js'),
      '@converge/kimifn': path.resolve(__dirname, '../kimifn/dist/index.js'),
      '@converge/qwenfn': path.resolve(__dirname, '../qwenfn/dist/index.js'),
      '@converge/geminifn': path.resolve(__dirname, '../geminifn/dist/index.js'),
      'codets': path.resolve(__dirname, '../codets/src/index.ts'),
    };
  },
});
