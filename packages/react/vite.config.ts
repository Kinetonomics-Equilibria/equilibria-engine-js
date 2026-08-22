/// <reference types="vitest" />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        restoreMocks: true
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'EquilibriaReact',
            // .cjs overrides the package's "type": "module"; a .js file would be
            // parsed as ESM and the CommonJS bundle would fail to load.
            fileName: (format) => format === 'cjs' ? 'equilibria-react.cjs' : 'equilibria-react.es.js',
            formats: ['es', 'cjs']
        },
        rollupOptions: {
            external: [
                'react',
                'react-dom',
                'react/jsx-runtime',
                'equilibria-engine-js',
                'equilibria-engine-js/dist/style.css',
                'katex/dist/katex.min.css'
            ],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    'equilibria-engine-js': 'EquilibriaEngine'
                }
            }
        },
        cssCodeSplit: false
    },
    plugins: [
        dts({
            insertTypesEntry: true,
            // The tests live under src/, so without this the plugin emits
            // declaration files for them into dist/__tests__ and they ship.
            exclude: ['src/__tests__/**']
        })
    ]
});
