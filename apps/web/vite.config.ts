/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        // Both workspace packages are symlinked and ship TypeScript source
        // rather than a built bundle. Pre-bundling them would defeat HMR on
        // engine edits, which is the whole point of consuming them as source.
        exclude: ['equilibria-react', 'equilibria-engine-js']
    },
    // The app had only Playwright, which is right for the claims P7 makes —
    // that three panels are regions of one SVG — and wrong for the ones P8
    // makes, which are about what a pure function says about two snapshots. A
    // browser is a slow and indirect way to ask whether "20.0 → 20.0" is
    // suppressed.
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        restoreMocks: true
    }
});
