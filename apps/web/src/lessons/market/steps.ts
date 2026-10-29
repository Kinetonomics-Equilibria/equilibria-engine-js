import type { LessonStep } from '../../track/track';

/**
 * The lesson, in order (P10).
 *
 * `reveal` and `set` are the engine's — `compileSteps` turns a reveal into
 * `show: 'params.step >= n'` on the objects or the panel it names, and hands
 * `set` back rather than applying it. `title`, `say`, `term`, `part` and `ask`
 * are the app's and ride on the same objects. One list, one order: the engine
 * sees the whole thing and returns the whole thing from `kg.steps()`, so
 * nothing app-side can disagree with the diagram about how many steps there
 * are.
 *
 * The market panel's frame is not revealed by any step, so it is there from the
 * start: the lesson draws *into* a pair of labelled axes rather than beginning
 * with a blank rectangle. Before the first step those axes are under the
 * lesson's cover, so the first thing a student sees of the diagram is the frame
 * the first step draws into. The other two panels are revealed by their key,
 * which takes their axes and axis titles with them — the whole point being that
 * the second panel arrives as an event with a sentence attached, rather than
 * sitting there from the first frame waiting to be explained.
 */
export const MARKET_LESSON: LessonStep[] = [
    {
        part: 'Meet the market',
        reveal: ['demand_market'],
        title: 'Demand: what buyers want',
        say: 'The demand curve, D, shows how much of something buyers want at each price.\n\n' +
            'It slopes down. When the price goes up, people buy less, and when it comes down, ' +
            'they buy more.',
        term: {
            word: 'Demand',
            meaning: 'How much buyers are willing and able to buy at each price.'
        }
    },
    {
        reveal: ['supply_market'],
        title: 'Supply: what sellers offer',
        say: 'The supply curve, S, shows how much sellers want to sell at each price.\n\n' +
            'It slopes up. A higher price makes it worth producing more.',
        term: {
            word: 'Supply',
            meaning: 'How much sellers are willing and able to sell at each price.'
        }
    },
    {
        reveal: ['equilibrium_market'],
        title: 'Where they meet',
        say: 'Where the curves cross, the amount buyers want is exactly the amount sellers ' +
            'offer. Nothing is left over, and nobody who will pay that price misses out.\n\n' +
            'That point gives one price, P*, and one quantity, Q*.',
        term: {
            word: 'Equilibrium',
            meaning: 'The price and quantity where demand equals supply.'
        }
    },
    {
        part: 'When demand changes',
        reveal: ['surplus'],
        title: 'What buyers gain',
        say: 'Lots of buyers would have paid more than the market price. The shaded area adds ' +
            'up that extra value, for every buyer.\n\n' +
            'It\'s the same market, shown a second way.',
        term: {
            word: 'Consumer surplus',
            meaning: 'The difference between what buyers would be willing to pay and what they ' +
                'actually pay.'
        }
    },
    {
        set: { a: 26 },
        title: 'Incomes rise',
        say: 'Say people\'s incomes rise. Buyers can afford more, so they want more at every ' +
            'price, and the whole demand curve shifts to the right.\n\n' +
            'Watch the price, the quantity and the shaded area all change together.',
        term: {
            word: 'Increase in demand',
            meaning: 'Buyers want more at every price, so the demand curve shifts right.'
        }
    },
    {
        reveal: ['revenue'],
        title: 'What sellers earn',
        say: 'The new panel shows the money that changes hands: the price times the quantity ' +
            'sold.\n\n' +
            'When demand rises, sellers sell more, at a higher price, so their revenue goes up. ' +
            'Move demand yourself and watch revenue follow it.',
        // The one "see what happens" step: a slider on the card, since the
        // lesson has no instruments beside it. Safe to hand over here because
        // the step after it sets both params, so wherever the student leaves
        // demand, "back to the start" is where the market goes.
        try: [{ param: 'a', label: 'Demand' }],
        term: {
            word: 'Total revenue',
            meaning: 'Price × quantity: everything buyers spend, and sellers receive.'
        }
    },
    // "Where we started" is both params, not just the one the lesson moved.
    // Setting `a` alone made this step false for any student who had moved
    // supply on the way — "Input costs rise" and then this step left P* at
    // 13.00, not 11.00, under words saying the market was back where it
    // started — and so did the two steps after it. The lesson's own steps only
    // ever move `a`, which is how the gap hid: the author's walk through it
    // never left `c`.
    //
    // Two params in one update is order-dependent in general, because the
    // engine applies and validates them one at a time (plans README, finding
    // 4). It is not here, and the reason is worth stating rather than relying
    // on: the diagram declares no restrictions, and `a` (12–28) and `c` (0–8)
    // are each bounded only by their own range, so every interim state between
    // two legal markets is itself legal and either order lands in the same
    // place. A restriction tying the two together could end that, and these
    // three steps would then need the batched update the finding asks for.
    {
        set: { a: 20, c: 2 },
        title: 'Back to the start',
        say: 'Incomes settle back, and the market returns to where it began.\n\n' +
            'All three panels are on screen now: the market, what buyers gain, and what ' +
            'sellers earn.'
    },
    // The question the build-up was for (P11). It sets its own starting value
    // rather than inheriting whatever the student last left — the answer is
    // marked from where the question began, so where it begins should not
    // depend on what they did while exploring. That includes supply: the
    // target of 26 is "incomes rise again" from the baseline the step before
    // announced, so the market the question starts in is that baseline.
    //
    // Resetting `c` here touches neither the arming nor the grade. The step's
    // `set` is applied before the question is armed, while the screen is not
    // yet listening for the asked param, so it is not read as an attempt; the
    // snapshot is taken after it; and the grade reads `a` and only `a`.
    //
    // Direction is the question. The target makes the magnitude half real as
    // well, and gives the reveal something to draw — a direction-only question
    // has no "correct position", only a correct way.
    {
        part: 'Your turn',
        set: { a: 20, c: 2 },
        title: 'Incomes rise again',
        say: 'Incomes rise again, by the same amount as before.\n\n' +
            'Move the demand curve to where it goes, then press Check.',
        ask: {
            param: 'a', direction: 'up', target: 26, tolerance: 1,
            explain: 'Higher incomes mean buyers want more at every price, so demand ' +
                'increases and the curve shifts right — as far as it went last time, which ' +
                'takes the price to $14.00.'
        }
    },
    // The lesson hands the market back where it found it, so Finish hands the
    // playground the model as it declares it, with everything drawn and
    // nothing left mid-demonstration.
    {
        set: { a: 20, c: 2 },
        title: 'Over to you',
        say: 'One shift in demand moved the price, the quantity, consumer surplus and revenue, ' +
            'all at once.\n\n' +
            'Press Finish and the market is yours in the Playground: drag the demand curve, ' +
            'try a scenario, or see the maths behind each number.'
    }
];
