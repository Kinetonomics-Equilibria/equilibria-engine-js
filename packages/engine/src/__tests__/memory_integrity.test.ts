import { describe, it, expect, beforeEach } from 'vitest';
import { KineticGraph } from '../ts/kg';

describe('Memory Integrity Check', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'kg-container';
        document.body.appendChild(container);
    });

    it('cleans up completely on destroy', () => {
        const config = {
            aspectRatio: 2,
            objects: []
        };

        const kg = new KineticGraph(config);
        kg.mount(container);

        expect(container.innerHTML).not.toBe('');

        // Rapid update
        kg.update({ aspectRatio: 1.5 });
        kg.update({ aspectRatio: 1 });

        // Destroy
        kg.destroy();

        expect(container.innerHTML).toBe('');
        // Ensure event listeners are wiped
        expect(kg.listenerCount('kg:param_changed')).toBe(0);

        document.body.removeChild(container);
    });
});
