import type { LessonStep } from '../../track/track';
import { GLOSSARY } from '../glossary';

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
 * Written for Year 10 to first-year students, in the voice `docs/language.md`
 * sets out: one idea per step, a short title that says it, and short paragraphs
 * that say what happens and then what it means. A word is defined where it is
 * first used, in a key-term box, and not again.
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
        say: 'Let\'s look at a café on a Saturday morning. Five staff work from 7 to 11, which gives ' +
            'the café 20 hours of work. The staff are two baristas, two kitchen hands and a manager.\n\n' +
            'The café also has one espresso machine and one sandwich press.\n\n' +
            'Customers want more coffees and toasties than the café can make with these resources. This ' +
            'problem is called scarcity, and every economy faces it.',
        term: GLOSSARY.scarcity
    },
    {
        reveal: ['ppc'],
        set: { ...BASELINE },
        title: 'The production possibility curve',
        say: 'If all 20 hours went on coffee, the café could make 200 coffees. If all 20 hours went on ' +
            'toasties, it could make 100 toasties.\n\n' +
            'Every way of splitting the hours is a point on this curve. The curve shows the most the ' +
            'café can make of one good for each amount of the other.',
        term: GLOSSARY.productionPossibilityCurve
    },
    {
        reveal: ['Z', 'attainable'],
        set: { ...BASELINE, pt: 40, pc: 120 },
        title: 'Inside the curve',
        say: 'Suppose last Saturday started slowly, and two staff had nothing to do for an hour. The ' +
            'café made only 40 toasties and 120 coffees, which is point Z.\n\n' +
            'Points inside the curve can be produced, but they waste resources. The café could have ' +
            'made more of both goods.',
        term: GLOSSARY.inefficiency
    },
    {
        set: { ...BASELINE, pt: 60, pc: 160 },
        title: 'On the curve',
        say: 'When every hour is put to good use, the café reaches the curve. One example is 60 toasties ' +
            'and 160 coffees.\n\n' +
            'Every point on the curve is efficient. To make more of one good, the café has to make less ' +
            'of the other.',
        term: GLOSSARY.productiveEfficiency
    },
    {
        set: { ...BASELINE, pt: 100, pc: 160 },
        title: 'Outside the curve',
        say: 'A combination of 100 toasties and 160 coffees is outside the curve. With its staff, time ' +
            'and machines, the café cannot make this much.\n\n' +
            'To reach this point, the café would need more resources or better machines.',
        term: GLOSSARY.unattainableCombination
    },
    // The try is safe to hand over: Z is not seen again until "Full
    // employment", which puts it where its words say.
    {
        title: 'Moving point Z',
        say: 'You can move point Z yourself with the sliders below.\n\n' +
            'The label next to Z says whether it is inside the curve, on the curve or outside the curve.',
        try: [{ param: 'pt', label: 'Toasties at Z' }, { param: 'pc', label: 'Coffees at Z' }]
    },
    {
        part: 'What each choice costs',
        reveal: ['A', 'B'],
        set: { ...BASELINE, a: 60, b: 80 },
        title: 'Twenty more toasties',
        say: 'Let\'s start at point A, which is 60 toasties and 160 coffees. Now let\'s move to point B, ' +
            'which is 80 toasties and 120 coffees.\n\n' +
            'The café gains 20 toasties, but it gives up 40 coffees to make them. These 40 coffees are ' +
            'the opportunity cost of the extra toasties.',
        term: GLOSSARY.opportunityCost
    },
    {
        title: 'The cost of one toastie',
        say: 'If 20 toasties cost 40 coffees, then each extra toastie costs 40 ÷ 20 = 2 coffees. This ' +
            'number is the opportunity cost per unit.',
        term: GLOSSARY.opportunityCostPerUnit
    },
    // The step after this one sets both points, so wherever the student
    // leaves them, the next step's numbers are the ones it quotes.
    {
        title: 'Moving A and B',
        say: 'You can move A and B along the curve yourself with the sliders below.\n\n' +
            'Notice how the cost of each extra toastie changes as the two points move.',
        try: [{ param: 'a', label: 'Toasties at A' }, { param: 'b', label: 'Toasties at B' }]
    },
    {
        set: { a: 0, b: 20 },
        title: 'The first toasties are cheap',
        say: 'Going from no toasties to 20, the café gives up 4 coffees. That is 0.2 coffees for each ' +
            'toastie.\n\n' +
            'The first toasties are made by the kitchen hands, who are slow at making coffee, so the ' +
            'café loses very little coffee to make them.'
    },
    {
        set: { a: 80, b: 100 },
        title: 'The last toasties are expensive',
        say: 'Going from 80 toasties to 100, the café gives up 120 coffees. That is 6 coffees for each ' +
            'toastie.\n\n' +
            'The last toasties have to be made by the baristas. Baristas make coffee quickly and ' +
            'toasties slowly, so every hour they spend on toasties costs a lot of coffee.',
        term: GLOSSARY.increasingOpportunityCost
    },
    // A and B are left where the step before put them, so the straight line
    // is read against the 6 coffees a toastie that step just said.
    {
        set: { k: 1 },
        title: 'If everyone were equally good',
        say: 'Now suppose every worker could make 10 coffees or 5 toasties an hour. The curve becomes a ' +
            'straight line.\n\n' +
            'Every toastie now costs 2 coffees, wherever the café is on the curve. This is true even ' +
            'from 80 toasties to 100.',
        try: [{ param: 'k', label: 'Specialisation' }],
        term: GLOSSARY.constantOpportunityCost
    },
    {
        part: 'What the curve assumes',
        set: { ...BASELINE, a: 60, b: 80 },
        title: 'Every model simplifies',
        say: 'A real café is more complicated than this curve. To draw the curve, economists make ' +
            'assumptions, which are conditions the model takes as given.\n\n' +
            'The first assumption is that the café makes two goods. It also sells muffins and juice, but ' +
            'two goods fit on two axes, and the trade-off between them is the same.',
        term: GLOSSARY.assumption
    },
    // From here the curve's two ends can be dragged as well as the curve, and
    // the step after each try sets what the try moved.
    {
        reveal: ['coffeeEnd', 'toastieEnd'],
        set: { ...BASELINE, h: 25 },
        title: 'Fixed resources',
        say: 'The curve shows one Saturday morning, and it assumes that the café\'s staff, hours and ' +
            'machines are fixed.\n\n' +
            'Suppose the café opens an hour earlier. This gives it 25 hours of work, so the whole curve ' +
            'shifts outward, up to 250 coffees or 125 toasties.',
        try: [{ param: 'h', label: 'Work hours' }],
        term: GLOSSARY.economicGrowth
    },
    {
        set: { ...BASELINE, C: 15 },
        title: 'Fixed technology',
        say: 'The curve also assumes that the café\'s machines and know-how stay the same. Suppose it ' +
            'buys a faster espresso machine that makes 15 coffees an hour instead of 10.\n\n' +
            'The café can now make up to 300 coffees, but still only 100 toasties, so the curve pivots ' +
            'up the coffee axis.',
        try: [{ param: 'C', label: 'Coffees an hour' }],
        term: GLOSSARY.technology
    },
    // Z alone. The faster espresso machine stays from the step before, or
    // wherever the student left its slider: at 30 toasties and 80 coffees Z
    // is inside the curve for any coffees an hour from 5 to 15. Putting the
    // machine back here as well led "What changed" with coffee-making
    // getting slower, under words about Z.
    {
        set: { pt: 30, pc: 80 },
        title: 'Full employment',
        say: 'Every point on the curve assumes that all of the café\'s resources are working well. A real ' +
            'café has slow patches when staff have little to do.\n\n' +
            'At these times the café makes less than it could. This is shown by point Z, which is inside ' +
            'the curve.',
        term: GLOSSARY.fullEmployment
    },
    {
        title: 'Resources suit different jobs',
        say: 'The last assumption gives the curve its shape. Resources are not equally good at ' +
            'everything. For example, the baristas make coffee quickly and toasties slowly.\n\n' +
            'This is why each extra toastie costs more coffees than the last, and why the curve bows ' +
            'outward.'
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
            'What changes, and which way? Move it on the diagram, then press Check.',
        ask: {
            param: 'T', direction: 'up', among: ['h', 'C', 'T'], illustrate: 2.5,
            explain: 'The new press gets more toasties out of each hour of work, and coffee is not ' +
                'affected. The curve pivots out along the toastie axis, up to 150 toasties and still ' +
                '200 coffees.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Two staff call in sick',
        say: 'Two of the five staff call in sick on Saturday morning.\n\n' +
            'What changes, and which way?',
        ask: {
            param: 'h', direction: 'down', among: ['h', 'C', 'T'], illustrate: 8,
            explain: 'Two staff for four hours is 8 hours of work lost, which leaves 12 hours instead of ' +
                '20. With fewer resources, the café can make less of both goods, so the whole curve ' +
                'shifts inward.'
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
            explain: 'There are still five staff for four hours, so the hours are the same. Each hour ' +
                'now makes fewer coffees and the same number of toasties, so the curve pivots in along ' +
                'the coffee axis.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'A sixth person is hired',
        say: 'The café hires a sixth person to work Saturday mornings, from 7 to 11.\n\n' +
            'What changes, and which way?',
        ask: {
            param: 'h', direction: 'up', among: ['h', 'C', 'T'], illustrate: 4,
            explain: 'One more person for four hours adds 4 hours of work, which makes 24 hours instead ' +
                'of 20. With more resources, the café can make more of both goods, so the whole curve ' +
                'shifts outward.'
        }
    },
    // A and B come back for the playground, where the student has the whole
    // diagram to themselves, and Z is put down and to the left, clear of them.
    // Finish hands the playground this market.
    {
        set: { ...BASELINE, a: 60, b: 80, pt: 30, pc: 80 },
        title: 'Over to you',
        say: 'Here is how you went on the four cases.\n\n' +
            'If you would like more practice, press Finish to open the café in the Playground. You can ' +
            'try more cases in Scenarios, or drag the points and the curve yourself.',
        recap: {
            takeaway: 'A change in resources moves the whole curve, outward for more resources and inward ' +
                'for fewer. A change in how quickly the café makes one good pivots the curve along that ' +
                'good\'s axis, and the other end does not move.'
        }
    }
];
