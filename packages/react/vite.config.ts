/// <reference types="vitest" />
import { defineConfig } from 'vite';

// Internal workspace library — see packages/engine/vite.config.ts. Only the
// test configuration remains.
export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        restoreMocks: true
    }
});
