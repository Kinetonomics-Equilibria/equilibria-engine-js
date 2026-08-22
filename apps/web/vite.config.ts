import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        // Both workspace packages are symlinked and ship TypeScript source
        // rather than a built bundle. Pre-bundling them would defeat HMR on
        // engine edits, which is the whole point of consuming them as source.
        exclude: ['equilibria-react', 'equilibria-engine-js']
    }
});
