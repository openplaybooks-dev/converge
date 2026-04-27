import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@lego': resolve(__dirname, 'src/index.ts'),
      '@lego/': resolve(__dirname, 'src/'),
      '@catalog/': resolve(__dirname, 'catalog/'),
      '@scenes/': resolve(__dirname, 'scenes/'),
    },
  },
  server: {
    port: 5181,
    host: '127.0.0.1',
    open: false,
    fs: {
      allow: [resolve(__dirname, '.')],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'viewer/index.html'),
        asset: resolve(__dirname, 'viewer/asset.html'),
        scene: resolve(__dirname, 'viewer/scene.html'),
      },
    },
  },
});
