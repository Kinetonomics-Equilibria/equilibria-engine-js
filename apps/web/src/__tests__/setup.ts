/**
 * Test setup — jsdom gaps the app's components hit, plus RTL teardown.
 *
 * Mirrors `packages/react/src/__tests__/setup.ts`. Kept as its own copy rather
 * than shared: it exists to describe what *this* package's tests need, and a
 * shared setup file is the kind of thing that quietly grows to serve everybody
 * and be understood by nobody.
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// The engine observes its container; Mantine's components observe theirs.
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
        observe() { /* noop in tests */ }
        unobserve() { /* noop in tests */ }
        disconnect() { /* noop in tests */ }
    } as unknown as typeof ResizeObserver;
}

// Mantine reads this in several components; jsdom does not implement it.
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false
    })) as unknown as typeof window.matchMedia;
}

// Test helpers are imported explicitly rather than through vitest globals, so
// RTL cannot register its own auto-cleanup hook. Do it here.
afterEach(() => {
    cleanup();
});
