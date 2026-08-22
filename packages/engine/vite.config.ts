/// <reference types="vitest" />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts']
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/ts/kg.ts'),
      name: 'KineticGraph',
      // .cjs overrides the package's "type": "module"; a .js file would be
      // parsed as ESM and the CommonJS bundle would fail to load.
      fileName: (format) => format === 'cjs' ? 'kgjs.cjs' : 'kgjs.es.js',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['d3', 'mathjs', 'katex'],
      output: {
        globals: {
          d3: 'd3',
          mathjs: 'math',
          katex: 'katex'
        }
      }
    }
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ]
});
