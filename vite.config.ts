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
      fileName: (format) => `kgjs.${format}.js`,
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
