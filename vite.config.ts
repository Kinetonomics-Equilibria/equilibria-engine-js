import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'EquilibriaReact',
            fileName: (format) => `equilibria-react.${format}.js`,
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
            insertTypesEntry: true
        })
    ]
});
