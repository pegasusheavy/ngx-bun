import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'index': 'src/index.ts',
      'server/index': 'src/server/index.ts',
      'prerender/index': 'src/prerender/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    external: [
      '@angular/core',
      '@angular/common',
      '@angular/platform-server',
      '@angular/ssr',
      'bun',
    ],
    treeshake: true,
    splitting: false,
  },
]);
