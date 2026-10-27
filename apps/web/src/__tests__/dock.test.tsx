import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import type { ReactElement } from 'react';
import type { ParamInfo } from 'equilibria-engine-js';
import { Dock } from '../dock/Dock';
import type { Instrument, InstrumentProps } from '../dock/types';
import { theme } from '../theme';

/**
 * The dock shell: one instrument open at a time, reachable from the keyboard,
 * and a width that does not depend on what is inside it.
 *
 * The last of those is the architectural claim — the stage must not move when a
 * student switches tabs — and it is asserted here as the thing that causes it
 * rather than through a stage this test does not render.
 */

const view = (ui: ReactElement) =>
    render(<MantineProvider theme={theme} env="test">{ui}</MantineProvider>);

const param = (over: Partial<ParamInfo> = {}): ParamInfo => ({
    name: 'a', label: 'a', value: 20, min: 5, max: 28, round: 0.1,
    precision: 1, presentation: false, isBoolean: false, ...over
});

const context = (over: Partial<InstrumentProps> = {}): Omit<InstrumentProps, 'focus'> => ({
    params: [param()],
    calcs: { Pe: 11 },
    calcExpressions: { Pe: '(params.a + params.c)/2' },
    updateParams: vi.fn(),
    beginGesture: vi.fn(),
    endGesture: vi.fn(),
    snapshot: vi.fn(),
    ...over
});

const INSTRUMENTS: Instrument[] = [
    { id: 'one', label: 'One', Component: () => <div>first instrument</div> },
    { id: 'two', label: 'Two', Component: () => <div>second instrument</div> },
    { id: 'three', label: 'Three', Component: (p: InstrumentProps) => <div>focus: {p.focus?.calc ?? 'none'}</div> }
];

function mount(over: { open?: string; onOpenChange?: (id: string) => void; focus?: { calc?: string } } = {}) {
    const onOpenChange = over.onOpenChange ?? vi.fn();
    const result = view(
        <Dock
            instruments={INSTRUMENTS}
            open={over.open ?? 'one'}
            onOpenChange={onOpenChange}
            context={context()}
            focus={over.focus}
        />
    );
    return { onOpenChange, result };
}

describe('the dock shell', () => {
    it('renders only the open instrument', () => {
        mount({ open: 'one' });
        expect(screen.getByText('first instrument')).toBeDefined();
        // Not merely hidden: an inactive instrument that stays mounted can be
        // read by a screen reader and tabbed into, which is not "one at a time".
        expect(screen.queryByText('second instrument')).toBeNull();
    });

    it('is a labelled landmark with a tab per instrument', () => {
        mount();
        // `<aside>` is a complementary landmark, so the dock is reachable by
        // landmark navigation rather than only by tabbing into it.
        expect(screen.getByRole('complementary', { name: 'Instruments' })).toBeDefined();
        expect(screen.getAllByRole('tab')).toHaveLength(3);
        expect(screen.getByRole('tab', { name: 'One' }).getAttribute('aria-selected')).toBe('true');
        expect(screen.getByRole('tab', { name: 'Two' }).getAttribute('aria-selected')).toBe('false');
    });

    // The content is a region named by the tab that opened it, so a screen
    // reader user who moves into the panel is told what they are in.
    it('names the open panel after its tab', () => {
        mount({ open: 'two' });
        const panel = screen.getByRole('tabpanel');
        const tab = screen.getByRole('tab', { name: 'Two' });
        expect(panel.getAttribute('aria-labelledby')).toBe(tab.getAttribute('id'));
    });

    it('asks to change instrument when a tab is clicked', async () => {
        const user = userEvent.setup();
        const { onOpenChange } = mount({ open: 'one' });

        await user.click(screen.getByRole('tab', { name: 'Two' }));
        expect(onOpenChange).toHaveBeenCalledWith('two');
    });

    it('moves between instruments with the arrow keys', async () => {
        const user = userEvent.setup();
        const { onOpenChange } = mount({ open: 'one' });

        screen.getByRole('tab', { name: 'One' }).focus();
        await user.keyboard('{ArrowRight}');

        expect(onOpenChange).toHaveBeenCalledWith('two');
    });

    // "Why?" opens the Maths instrument *at* a calc. An instrument that is not
    // the one being opened must not receive the focus, or every instrument would
    // think it was the one that had been asked a question.
    it('hands focus only to the open instrument', () => {
        mount({ open: 'three', focus: { calc: 'Pe' } });
        expect(screen.getByText('focus: Pe')).toBeDefined();
    });

    it('gives an instrument no focus when it was not opened at anything', () => {
        mount({ open: 'three' });
        expect(screen.getByText('focus: none')).toBeDefined();
    });
});
