/**
 * Test setup — polyfills for APIs not available in jsdom, plus React Testing
 * Library teardown.
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// ResizeObserver is not available in jsdom; provide a minimal mock.
// The engine observes its container, so anything that mounts a real
// KineticGraph needs this to exist.
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
        private callback: ResizeObserverCallback;
        constructor(callback: ResizeObserverCallback) {
            this.callback = callback;
        }
        observe() { /* noop in tests */ }
        unobserve() { /* noop in tests */ }
        disconnect() { /* noop in tests */ }
    };
}

// This project imports test helpers explicitly rather than enabling vitest
// globals, so RTL cannot register its own auto-cleanup hook. Do it here.
afterEach(() => {
    cleanup();
});
