/// <reference types="vitest" />
import { defineConfig } from 'vite';

// The engine is an internal workspace library: the app imports its TypeScript
// source directly and compiles it as part of its own bundle, so there is no
// library build here — only the test configuration.
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts']
  }
});
