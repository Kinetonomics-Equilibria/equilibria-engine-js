import { describe, it, expect } from 'vitest';
import { arrange, FURNITURE } from '../arrangement';
import type { PanelRect } from '../arrangement';
import { ease, frameOf, isMove, settle } from '../motion';

/**
 * The move between two arrangements, as arithmetic.
 *
 * The claims are about what a student sees on the way: that a move starts
 * where the panels are and ends where they are going, that the panel coming
 * forward is never faded, that the one stepping aside is gone before the two
 * cross, and that a panel gaining detail does not gain it while it is still a
 * glyph's size.
 */

const KEYS = ['market', 'firm', 'cost'];
const STAGE = { width: 1200, height: 714 };

const roomOf = (p: PanelRect) => FURNITURE[p.level];
const at = (focused: string, mode: 'focus' | 'grid' = 'focus', size = STAGE) =>
    settle(arrange({ ...size, panels: KEYS, focused, mode, furniture: FURNITURE }), roomOf);

const panel = (frame: any, key: string) => frame.panels.filter((p: any) => p.key === key)[0];

describe('the ease', () => {
    it('runs from 0 to 1 and never back', () => {
        expect(ease(0)).toBe(0);
        expect(ease(1)).toBe(1);
        let last = 0;
        for (let t = 0.05; t <= 1; t += 0.05) {
            expect(ease(t)).toBeGreaterThan(last);
            last = ease(t);
        }
    });

    it('has done most of the travel in the first third of the time', () => {
        expect(ease(1 / 3)).toBeGreaterThan(0.75);
    });
});

describe('what counts as a move', () => {
    it('is a change of focus or of mode', () => {
        expect(isMove(at('market'), at('firm'))).toBe(true);
        expect(isMove(at('market'), at('market', 'grid'))).toBe(true);
    });

    it('is not the same arrangement again', () => {
        expect(isMove(at('market'), at('market'))).toBe(false);
    });

    it('is not a stage of another shape', () => {
        expect(isMove(at('market'), at('firm', 'focus', { width: 1200, height: 500 }))).toBe(false);
    });

    it('is not a panel arriving', () => {
        const two = settle(arrange({ ...STAGE, panels: KEYS.slice(0, 2), focused: 'market', furniture: FURNITURE }), roomOf);
        expect(isMove(two, at('firm'))).toBe(false);
    });
});

describe('a promotion, frame by frame', () => {
    const from = at('market'), to = at('firm');

    it('starts where the panels are', () => {
        const first = frameOf({ from, to, t: 0 });
        ['x', 'y', 'width', 'height'].forEach(prop => {
            expect(panel(first, 'firm')[prop]).toBeCloseTo(panel(from, 'firm')[prop], 9);
            expect(panel(first, 'market')[prop]).toBeCloseTo(panel(from, 'market')[prop], 9);
        });
    });

    it('ends exactly where they are going', () => {
        expect(frameOf({ from, to, t: 1 })).toBe(to);
    });

    // The chrome is for the panel it is becoming, and a click mid-move
    // promotes from the destination's point of view.
    it('already says what each panel is becoming', () => {
        const mid = frameOf({ from, to, t: 0.4 });
        expect(mid.focused).toBe('firm');
        expect(panel(mid, 'firm').role).toBe('focal');
        expect(panel(mid, 'market').role).toBe('rail');
    });

    it('carries the room with the box, so a sheet grows rather than jumps', () => {
        const mid = frameOf({ from, to, t: 0.1 });
        const room = panel(mid, 'firm').room;
        expect(room.left).toBeGreaterThan(FURNITURE.indicator.left);
        expect(room.left).toBeLessThan(FURNITURE.full.left);
    });

    it('never fades the panel coming forward', () => {
        for (let t = 0; t <= 1; t += 0.05) {
            expect(panel(frameOf({ from, to, t }), 'firm').opacity).toBe(1);
        }
    });

    it('has the panel stepping aside gone before the two are level, and back when it lands', () => {
        // Level with each other where their rects are halfway: ease(t) = 0.5.
        const level = 1 - Math.pow(0.5, 1 / 4);
        expect(panel(frameOf({ from, to, t: level }), 'market').opacity).toBe(0);
        expect(panel(frameOf({ from, to, t: 0.99 }), 'market').opacity).toBeGreaterThan(0.95);
        expect(panel(frameOf({ from, to, t: 1 }), 'market').opacity).toBe(1);
    });

    it('leaves a panel that does not change size alone', () => {
        for (let t = 0; t <= 1; t += 0.1) {
            expect(panel(frameOf({ from, to, t }), 'cost').opacity).toBe(1);
        }
    });

    it('gives a growing panel its detail late, and takes a shrinking one\'s early', () => {
        expect(panel(frameOf({ from, to, t: 0.05 }), 'firm').level).toBe('indicator');
        expect(panel(frameOf({ from, to, t: 0.05 }), 'market').level).toBe('indicator');
        expect(panel(frameOf({ from, to, t: 0.5 }), 'firm').level).toBe('full');
    });

    // A second promotion mid-move starts from the frame on screen, faded panel
    // and all, and a panel that is now coming forward comes back in at once.
    it('turns from wherever a move was interrupted', () => {
        const midway = frameOf({ from, to, t: 0.08 });
        const turned = frameOf({ from: midway, to: at('market'), t: 0 });
        expect(panel(turned, 'market').x).toBeCloseTo(panel(midway, 'market').x, 9);
        expect(panel(turned, 'market').opacity).toBeCloseTo(panel(midway, 'market').opacity, 9);
        expect(panel(frameOf({ from: midway, to: at('market'), t: 0.2 }), 'market').opacity).toBe(1);
    });
});
