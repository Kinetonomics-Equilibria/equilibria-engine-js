import type { LessonStep } from '../../track/track';

/**
 * Where the lesson starts, and where every question starts from.
 *
 * Every step that quotes a number about the curve sets it first. The curve
 * can be dragged from the step that draws it, and a student who pulled it out
 * at step 3 would otherwise read "60 toasties and 160 coffees" beside a point
 * that is neither.
 */
export const BASELINE = { C: 10, T: 5, h: 20, k: 2 };

/**
 * The lesson, in four parts: what the café can make, what a choice costs,
 * what the curve assumes, and four changes for the student to work out.
 *
 * Written for Year 10 to first-year students the way the A$ lesson is: one
 * idea per step, a short title that says it, a paragraph saying what happens
 * and, where it helps, one saying what it means. A word is defined where it
 * is first used, in a key-term box, and not again.
 *
 * Every number a step states is one the diagram solves to at that step, and
 * `productionPossibilities.test.tsx` holds them to it.
 */
export const PPC_LESSON: LessonStep[] = [
    // The resources as a picture before they are a curve: five people, two
    // machines and a clock are what the curve is a summary of.
    {
        part: 'What the café can make',
        picture: 'crew',
        title: 'Five staff, four hours',
        say: 'It\'s Saturday morning at a café. Five staff work from 7 to 11: two baristas, two ' +
            'kitchen hands and a manager. That\'s 20 hours of work, with one espresso machine and ' +
            'one sandwich press.\n\n' +
            'Customers want more coffees and toasties than that can make. Having less than people ' +
            'want is the problem every economy faces.',
        term: {
            word: 'Scarcity',
            meaning: 'Having fewer resources than it would take to make everything people want.'
        }
    },
    {
        reveal: ['ppc'],
        set: { ...BASELINE },
        title: 'The production possibility curve',
        say: 'If all 20 hours went on coffee, the café could make 200 coffees. If they all went ' +
            'on toasties, 100 toasties. Every way of splitting the hours is a point on this curve.\n\n' +
            'The curve shows the most the café can make of one, for each amount of the other.',
        term: {
            word: 'Production possibility curve (PPC)',
            meaning: 'Every combination of two goods an economy can make when it uses all its ' +
                'resources as well as it can.'
        }
    },
    {
        reveal: ['Z', 'attainable'],
        set: { ...BASELINE, pt: 40, pc: 120 },
        title: 'Inside the curve',
        say: 'Last Saturday started slowly: for an hour, two staff had nothing to do. The café ' +
            'made only 40 toasties and 120 coffees, point Z.\n\n' +
            'Points inside the curve can be made, but they waste resources. The café could have ' +
            'made more of both.',
        term: {
            word: 'Inefficient',
            meaning: 'Making less than you could with what you have, because resources sit idle ' +
                'or are poorly used.'
        }
    },
    {
        set: { ...BASELINE, pt: 60, pc: 160 },
        title: 'On the curve',
        say: 'With every hour put to good use, the café reaches the curve: say 60 toasties and ' +
            '160 coffees.\n\n' +
            'Every point on the curve is efficient. To make more of one thing, the café has to ' +
            'make less of the other.',
        term: {
            word: 'Efficient',
            meaning: 'Using every resource as well as you can, so you can\'t make more of one ' +
                'thing without making less of another.'
        }
    },
    // The try is safe to hand over: Z is not seen again until "Full
    // employment", which puts it where its words say.
    {
        set: { ...BASELINE, pt: 100, pc: 160 },
        title: 'Outside the curve',
        say: '100 toasties and 160 coffees is outside the curve. With the staff, time and ' +
            'machines it has, the café can\'t make that much, however hard it works.\n\n' +
            'Move Z around and watch its label: inside the curve, on it, or outside.',
        try: [{ param: 'pt', label: 'Toasties at Z' }, { param: 'pc', label: 'Coffees at Z' }],
        term: {
            word: 'Unattainable',
            meaning: 'More than the resources can make: any point outside the curve.'
        }
    },
    {
        part: 'What each choice costs',
        reveal: ['A', 'B'],
        set: { ...BASELINE, a: 60, b: 80 },
        title: 'Twenty more toasties',
        say: 'Start at A: 60 toasties and 160 coffees. Now move to B: 80 toasties and 120 coffees.\n\n' +
            'The café gains 20 toasties, but gives up 40 coffees to make them. Those 40 coffees ' +
            'are the opportunity cost of the extra toasties.',
        term: {
            word: 'Opportunity cost',
            meaning: 'The next best thing you give up when you make a choice.'
        }
    },
    // The step after this one sets both points, so wherever the student
    // leaves them, the next step's numbers are the ones it quotes.
    {
        title: 'The cost of one toastie',
        say: '40 coffees for 20 toasties is 2 coffees for each extra toastie: 40 ÷ 20 = 2. ' +
            'That\'s the opportunity cost per unit.\n\n' +
            'Drag A or B along the curve, and watch what each extra toastie costs.',
        try: [{ param: 'a', label: 'Toasties at A' }, { param: 'b', label: 'Toasties at B' }],
        term: {
            word: 'Opportunity cost per unit',
            meaning: 'What you give up for each extra unit you gain: what you give up ÷ what ' +
                'you gain.'
        }
    },
    {
        set: { a: 0, b: 20 },
        title: 'The first toasties are cheap',
        say: 'From no toasties to 20, the café gives up just 4 coffees: 0.2 coffees a toastie.\n\n' +
            'The first toasties are made by the kitchen hands, who are slow at coffee anyway, so ' +
            'the café loses very little coffee to make them.'
    },
    {
        set: { a: 80, b: 100 },
        title: 'The last toasties are dear',
        say: 'From 80 toasties to 100, the café gives up 120 coffees: 6 coffees a toastie.\n\n' +
            'The last toasties have to be made by the baristas. They make coffee fast and ' +
            'toasties slowly, so every hour they spend toasting costs a lot of coffee.',
        term: {
            word: 'Increasing opportunity cost',
            meaning: 'Each extra unit of one good costs more of the other than the one before. ' +
                'It\'s why the PPC bows outward.'
        }
    },
    // A and B are left where the step before put them, so the straight line
    // is read against the 6 coffees a toastie that step just said.
    {
        set: { k: 1 },
        title: 'If everyone were equally good',
        say: 'Now suppose every worker could make 10 coffees or 5 toasties an hour. The curve ' +
            'becomes a straight line.\n\n' +
            'Then every toastie costs 2 coffees, wherever the café is on the curve: even from ' +
            '80 toasties to 100.',
        try: [{ param: 'k', label: 'Specialisation' }],
        term: {
            word: 'Constant opportunity cost',
            meaning: 'Every extra unit costs the same amount of the other good, and the PPC is a ' +
                'straight line.'
        }
    },
    {
        part: 'What the curve assumes',
        set: { ...BASELINE, a: 60, b: 80 },
        title: 'Every model simplifies',
        say: 'Real cafés are messier than this curve. To draw it, economists make assumptions: ' +
            'things the curve takes as given.\n\n' +
            'The first: the café makes just two things. It sells muffins and juice too, but two ' +
            'goods fit on two axes, and the trade-off between them is the same.',
        term: {
            word: 'Assumption',
            meaning: 'Something a model takes as given, to keep it simple enough to draw and ' +
                'reason with.'
        }
    },
    // From here the curve's two ends can be dragged as well as the curve, and
    // the step after each try sets what the try moved.
    {
        reveal: ['coffeeEnd', 'toastieEnd'],
        set: { ...BASELINE, h: 25 },
        title: 'Fixed resources',
        say: 'The curve is for one Saturday morning: five staff for four hours, one espresso ' +
            'machine, one sandwich press. It assumes those resources stay fixed.\n\n' +
            'Say the café opens an hour earlier. That\'s 25 hours of work, and the whole curve ' +
            'shifts outward: up to 250 coffees or 125 toasties.',
        try: [{ param: 'h', label: 'Work hours' }],
        term: {
            word: 'Economic growth',
            meaning: 'An increase in what an economy can make, shown as the PPC shifting outward.'
        }
    },
    {
        set: { ...BASELINE, C: 15 },
        title: 'Fixed technology',
        say: 'The curve also assumes the café\'s machines and know-how stay the same. Say it buys ' +
            'a faster espresso machine: 15 coffees an hour instead of 10.\n\n' +
            'Now it can make up to 300 coffees, but still only 100 toasties, so the curve pivots ' +
            'up the coffee axis. A and B move up: same toasties, more coffees.',
        try: [{ param: 'C', label: 'Coffees an hour' }],
        term: {
            word: 'Technology',
            meaning: 'The machines and know-how used to make things. Better technology gets more ' +
                'out of the same resources.'
        }
    },
    // Z alone. The faster espresso machine stays from the step before, or
    // wherever the student left its slider: at 30 toasties and 80 coffees Z
    // is inside the curve for any coffees an hour from 5 to 15. Putting the
    // machine back here as well led "What changed" with coffee-making
    // getting slower, under words about Z.
    {
        set: { pt: 30, pc: 80 },
        title: 'Full employment',
        say: 'Every point on the curve assumes all the café\'s resources are working, and working ' +
            'well. Real cafés have slow patches, with staff standing around.\n\n' +
            'Then the café makes less than it could, like Z: inside the curve, with nothing ' +
            'gained in return.',
        term: {
            word: 'Full employment',
            meaning: 'When every resource that could be working is working.'
        }
    },
    {
        title: 'Resources suit different jobs',
        say: 'The last assumption gives the curve its shape. Resources aren\'t equally good at ' +
            'everything: the baristas make coffee fast and toasties slowly.\n\n' +
            'That\'s why each extra toastie costs more coffees than the last, and why the curve ' +
            'bows outward.'
    },
    // The questions. Each starts from the baseline, and none names what it
    // moves: which of the three changes is the first half of the answer (P14),
    // and the three are offered in the same order every time. The three are
    // the three things the curve is built from, so each scenario is written
    // to land on exactly one — the barista who leaves is replaced, so the
    // hours stay, and the newcomer toasts as well as anyone, so only coffee
    // is slower.
    //
    // The questions are about the curve, so A and B stand down until the
    // recap, and with them what the move between them costs (`SHOW_CHOICES`):
    // otherwise every shift would also be narrated as a change in what a
    // toastie costs — true, and not what the student is being asked.
    //
    // Direction only, as in the A$ lesson; `illustrate` is how far "Show me"
    // draws it, a number made up for the picture.
    {
        part: 'Your turn',
        set: { ...BASELINE },
        aside: 'noticeboard',
        title: 'A bigger sandwich press',
        say: 'Read the note next to the diagram.\n\n' +
            'What changes, and which way? Move it, then press Check.',
        ask: {
            param: 'T', direction: 'up', among: ['h', 'C', 'T'], illustrate: 2.5,
            explain: 'The new press gets more toasties out of each hour of work, and changes ' +
                'nothing for coffee. So the curve pivots out along the toastie axis: up to 150 ' +
                'toasties, still 200 coffees.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Two staff call in sick',
        say: 'Two of the five staff call in sick on Saturday morning.\n\n' +
            'What changes, and which way?',
        ask: {
            param: 'h', direction: 'down', among: ['h', 'C', 'T'], illustrate: 8,
            explain: 'Two staff for four hours is 8 hours of work gone: 12 instead of 20. With ' +
                'fewer resources the café can make less of both, so the whole curve shifts inward.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'The best barista leaves',
        say: 'The café\'s best barista leaves. The person who replaces them has never used an ' +
            'espresso machine, but makes toasties as well as anyone.\n\n' +
            'What changes, and which way?',
        ask: {
            param: 'C', direction: 'down', among: ['h', 'C', 'T'], illustrate: 2.5,
            explain: 'Still five staff for four hours, so the hours are the same. But each hour ' +
                'now makes fewer coffees and as many toasties, so the curve pivots in along the ' +
                'coffee axis.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'A sixth person is hired',
        say: 'The café hires a sixth person to work Saturday mornings, from 7 to 11.\n\n' +
            'What changes, and which way?',
        ask: {
            param: 'h', direction: 'up', among: ['h', 'C', 'T'], illustrate: 4,
            explain: 'One more person for four hours adds 4 hours of work: 24 instead of 20. ' +
                'More resources let the café make more of both, so the whole curve shifts outward.'
        }
    },
    // A and B come back for the playground, where the student has the whole
    // diagram to themselves, and Z is put down and to the left, clear of them.
    // Finish hands the playground this market.
    {
        set: { ...BASELINE, a: 60, b: 80, pt: 30, pc: 80 },
        title: 'Over to you',
        say: 'Here\'s how you went on the four cases.\n\n' +
            'Press Finish to take the café to the Playground, where you can try more cases in ' +
            'Scenarios or drag the points and the curve yourself.',
        recap: {
            takeaway: 'A change in resources moves the whole curve: outward for more, inward for ' +
                'less. A change in how fast the café makes one good pivots the curve along that ' +
                'good\'s axis, and leaves the other end where it was.'
        }
    }
];
