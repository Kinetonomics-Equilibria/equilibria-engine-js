import { useSyncExternalStore } from 'react';

/**
 * Present: the whole page full screen, for a classroom projector.
 *
 * Whether the page is presenting is the browser's to say —
 * `document.fullscreenElement` — and nothing here keeps a copy. Esc is handled
 * by the browser and never reaches the page, so a flag of the app's own would
 * go on saying "presenting" after the teacher had pressed it; the browser's
 * `fullscreenchange` is the one notice both ways in and out send. The shell,
 * which puts the rail away, and the title line, which shows the button
 * pressed, read that one answer.
 */

function subscribe(onChange: () => void) {
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
}

const isPresenting = () => !!document.fullscreenElement;

export function usePresenting(): boolean {
    return useSyncExternalStore(subscribe, isPresenting, () => false);
}

/** Whether this browser can present at all. Safari on an iPhone cannot. */
export function canPresent(): boolean {
    return typeof document !== 'undefined' && !!document.fullscreenEnabled;
}

/**
 * Into full screen, or out of it.
 *
 * A refusal is the browser's — a permission policy, or a request it did not
 * see a press behind — and the screen stays as it was, which is the right
 * thing to show for it.
 */
export function togglePresenting() {
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
    } else {
        document.documentElement.requestFullscreen().catch(() => undefined);
    }
}
