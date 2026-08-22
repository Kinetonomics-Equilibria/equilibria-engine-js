/**
 * Test setup — polyfills for APIs not available in jsdom
 */

// ResizeObserver is not available in jsdom; provide a minimal mock
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
