import type { LessonStep } from '../track/track';
import type { Scenario } from '../dock/Scenarios';
import type { StudyContent, StudyModel } from './content';
import coverPicture from './pictures/ppc-cover.svg';
import crewPicture from './pictures/ppc-crew.svg';
import crewStill from './pictures/ppc-crew-still.svg';

/**
 * The production possibility curve, at a café on a Saturday morning.
 *
 * The classroom version this replaces put "Economics Mark" against "Fortnite
 * Wins": a student's week as the economy, and a better controller as the new
 * technology. The idea was right — a trade-off a student has lived — and the
 * example dated. A café keeps the idea and fixes the economics. It makes two
 * goods a student buys and may well serve (coffees and toasties), out of
 * resources a student can count: five staff from 7 to 11, which is 20 hours of
 * work, one espresso machine and one sandwich press. Every change the lesson
 * asks about is one a café really has — a faster press, staff off sick, a
 * barista leaving — and each lands on exactly one of the three things the
 * curve is built from.
 *
 * The staff are what make it bow. Two baristas, two kitchen hands and a
 * manager who does a bit of both are not equally good at both jobs, so the
 * first toasties come from the kitchen hands and cost little coffee, and the
 * last come from the baristas and cost a lot. That is the assumption the
 * shape stands on, said in people, and the same people set up comparative
 * advantage for a lesson after this one.
 *
 * The model. With `h` hours of work, `C` coffees an hour if all of it goes on
 * coffee and `T` toasties an hour if all of it goes on toasties, the café can
 * make at most C·h coffees or T·h toasties, and the curve between them is the
 * superellipse
 *
 *     (toasties / T·h)^k + (coffees / C·h)^k = 1
 *
 * — a quarter ellipse at k = 2, where the lesson lives, and the straight line
 * of equally suited staff at k = 1. The baseline is 200 coffees and 100
 * toasties, so A at 60 toasties and B at 80 sit at 160 and 120 coffees
 * exactly, and the first worked opportunity cost is 40 ÷ 20 = 2.
 */

/**
 * The curve as a parametric path, so it is sampled evenly along its length.
 *
 * Sampled along x, a quarter ellipse is a few long chords where it falls
 * steeply to the toastie axis. With toasties = most·cos(t)^(2/k) and coffees =
 * most·sin(t)^(2/k), every sample lands on the curve for any `k`, and t runs
 * over a quarter turn. `(t)` in parentheses, because that is the spelling a
 * label is placed by — and why the toastie rate is `T` and not `t`, which the
 * engine would read in these strings as a param.
 */
const QUARTER_TURN = 1.5707963267948966;

const curveOf = (most: { toasties: string; coffees: string }) => ({
    xFn: `${most.toasties} * max(0, cos((t)))^(2 / params.k)`,
    yFn: `${most.coffees} * max(0, sin((t)))^(2 / params.k)`,
    min: 0, max: QUARTER_TURN, samplePoints: 80
});

/** The coffees on the curve at a number of toasties. */
const curveAt = (toasties: string) =>
    `calcs.maxC * max(0, 1 - (${toasties} / calcs.maxT)^params.k)^(1 / params.k)`;

/**
 * The same, rounded to a whole coffee, for a point on the curve.
 *
 * A and B are drawn at whole coffees, a hair off the curve at most, so that
 * the coffees given up between them is a whole number and the cost per
 * toastie is the sum a student does by hand from the numbers on the diagram.
 */
const coffeesAt = (toasties: string) => `round(${curveAt(toasties)})`;

/**
 * Where a point on the curve goes when the student drags it: along the curve,
 * following the pointer, however steep the curve is where they are.
 *
 * The pointer is projected onto the curve along a ray from the origin, in the
 * space where the curve is the line u + v = 1 (u and v each good's share of
 * its most, to the power k). A pointer on the curve is returned exactly; one
 * off it lands where its ray crosses. A horizontal drag would leave the point
 * stuck where the curve falls steeply to the axis, where a whole coffee is a
 * sliver of a toastie. The millionth stops 0/0 at the origin, which would hand
 * the param a NaN.
 */
const ALONG_CURVE = 'calcs.maxT * (max(drag.x, 0)^params.k / (max(drag.x, 0)^params.k + ' +
    '(max(drag.y, 0) * calcs.maxT / calcs.maxC)^params.k + 0.000001))^(1 / params.k)';

/**
 * Where the lesson starts, and where every question starts from.
 *
 * Every step that quotes a number about the curve sets it first. The curve
 * can be dragged from the step that draws it, and a student who pulled it out
 * at step 3 would otherwise read "60 toasties and 160 coffees" beside a point
 * that is neither.
 */
const BASELINE = { C: 10, T: 5, h: 20, k: 2 };

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
    {
        set: { ...BASELINE, pt: 30, pc: 80 },
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

/** The position of the step titled `title`: 1 for the first step. */
const stepTitled = (title: string) => PPC_LESSON.findIndex(step => step.title === title) + 1;

/** Where A and B arrive, and where Z stands down for them. */
const CHOICES = stepTitled('Twenty more toasties');
/** The one step after that which is about Z again. */
const IDLE = stepTitled('Full employment');
/** Where the curve is about shifts, and its ends arrive to drag. */
const SHIFTS = stepTitled('Fixed resources');
const QUESTIONS = PPC_LESSON.findIndex(step => !!step.ask) + 1;
/** The last step. The playground is past it, so it draws what the last step draws. */
const END = PPC_LESSON.length;

/**
 * When each point is on the stage.
 *
 * Three points on one curve is two too many for most steps. Z is about
 * efficiency, and stands aside while A and B are about cost; A and B stand
 * aside for the questions, which are about the curve. The playground is past
 * the last step, so everything is back for it.
 *
 * A and B are revealed by their step as well, which is what marks it on the
 * track as a step that draws something. The step between them and its labels
 * are not, and arrive with them by this alone.
 */
const SHOW_Z = `params.step < ${CHOICES} or params.step == ${IDLE} or params.step >= ${END}`;
const SHOW_CHOICES = `(params.step >= ${CHOICES} and params.step < ${QUESTIONS}) or params.step >= ${END}`;

/**
 * Where a question found the curve, and where its answer would put it.
 *
 * One pair of curves for all three askable params, because all three move the
 * same curve. The screen parks the two a question is not about on their
 * current values (`parkApparatus`), so the start line is the curve as the
 * question found it whichever is asked, and the answer line differs from it
 * only in the one param the answer moves — which is also what it is gated on.
 */
const START = { toasties: 'params.startT * params.startH', coffees: 'params.startC * params.startH' };
const ANSWER = { toasties: 'params.answerT * params.answerH', coffees: 'params.answerC * params.answerH' };
const ANSWERED = 'params.revealed and (params.answerH != params.startH or ' +
    'params.answerC != params.startC or params.answerT != params.startT)';

/** A point on the curve, which the student drags along it. */
const choice = (name: 'A' | 'B', param: 'a' | 'b') => ({
    type: 'Point',
    def: {
        name, title: name,
        x: `min(params.${param}, calcs.maxT)`, y: `calcs.c${name}`,
        color: 'colors.choice',
        show: SHOW_CHOICES,
        drag: [{ directions: 'xy', param, expression: ALONG_CURVE }],
        srTitle: 'Point ' + name
    }
});

/**
 * A point's letter, just inside the curve, or just outside it.
 *
 * Moved radially from the point, a twelfth of the way towards the origin or
 * away from it, which is across the curve wherever on it the point is: under
 * the flat top, beside the steep end, and halfway between in between. Inside
 * while B is to the right of A, because the step between them runs outside;
 * outside while B is to the left, because then it runs inside. Never closer
 * to an axis than a twenty-fifth of the curve's reach, so a point on an axis
 * keeps its letter on the plot.
 *
 * The coordinates themselves are in the readout at the top of the panel,
 * where they have room. Beside the points they ran into the step's labels, or
 * off the plot past an axis, at one step or another.
 */
const letter = (name: 'A' | 'B', side: 'inside' | 'outside') => {
    const scale = side === 'inside' ? 11 / 12 : 13 / 12;
    const rightwards = side === 'inside';
    return {
        type: 'Label',
        def: {
            name: `${name}${side === 'inside' ? 'In' : 'Out'}`, title: '',
            x: `max(${scale} * calcs.t${name}, calcs.maxT / 25)`,
            y: `max(${scale} * calcs.c${name}, calcs.maxC / 25)`,
            text: name, align: 'center', plainText: true,
            color: 'colors.choice',
            show: `(${SHOW_CHOICES}) and calcs.gain ${rightwards ? '>=' : '<'} 0`
        }
    };
};

/**
 * A line of the readout at the top of the panel: where A and B are, and what
 * the move between them costs a unit.
 *
 * Where nothing else is: outside the curve, at the far corner of the axes,
 * which no curve this diagram can draw reaches. The caption says the cost as
 * "Coffees per toastie"; this says what it means, either way round. Lines are
 * hung from the top of the plot a fixed number of pixels apart, because the
 * text is a fixed size and the plot is not: spaced in coffees, two lines
 * that sat apart on a laptop ran into each other on a phone.
 */
const readout = (name: string, line: number, text: string, show = 'true') => ({
    type: 'Label',
    def: {
        name, title: '', x: 158, y: 320, text, plainText: true,
        align: 'right', xPixelOffset: -5, yPixelOffset: -(12 + 24 * line),
        color: 'colors.choice',
        show: `(${SHOW_CHOICES}) and ${show}`
    }
});

/** Where a point is: "A (60, 160)". */
const at = (name: 'A' | 'B') =>
    `"${name} (", string(calcs.t${name}), ", ", string(calcs.c${name}), ")"`;

/**
 * A label on the move from A to B: how many toasties it gains, or coffees it
 * gives up, beside the leg of the step that shows it.
 *
 * In pairs, one for each way the move can go, because where a label can sit
 * clear of the curve depends on it. Going right, the steps run above and to
 * the right of the curve between A and B, and the labels go outside them;
 * going left, the corner is under the curve, and they go inside it.
 *
 * `place` is the engine's label placement. The toasties' label starts just
 * past A and runs along its leg away from it, rather than being centred on
 * the leg: it is wider than a short step, and centred it reached back over A,
 * the point a student is dragging.
 */
const legLabel = (
    name: string, x: string, y: string, text: string, rightwards: boolean, place: object
) => ({
    type: 'Label',
    def: {
        name, title: '', x, y, text, plainText: true, ...place,
        // To the other side of its anchor when this side runs off the plot:
        // the coffees label to the right of its leg when B is at the coffees
        // axis, or a label at the far end of the toasties axis to its left.
        flipToFit: true,
        color: 'colors.choice',
        show: `(${SHOW_CHOICES}) and calcs.gain ${rightwards ? '>' : '<'} 0`
    }
});

/** Just past A, along the leg away from it: above it going right, below it going left. */
const PAST_A_RIGHTWARDS = { align: 'left', xPixelOffset: 10, yPixelOffset: 13 };
const PAST_A_LEFTWARDS = { align: 'right', xPixelOffset: -10, yPixelOffset: -15 };

/** "1 coffee", "2 coffees". */
const counted = (n: string, word: string) => `concat(string(${n}), ${n} == 1 ? " ${word}" : " ${word}s")`;

/** Up to one decimal place, as the caption prints it. */
const fixed = (n: string) => `format(${n}, {notation: "fixed", precision: 1})`;

/** Each param of the question apparatus is bounded like the param it draws. */
const apparatus = (name: string, like: { value: number; min: number; max: number; round: number }) =>
    ({ name, ...like, presentation: true });

const HOURS = { value: 20, min: 10, max: 30, round: 1 };
const COFFEE_RATE = { value: 10, min: 5, max: 15, round: 0.5 };
const TOASTIE_RATE = { value: 5, min: 2.5, max: 7.5, round: 0.5 };

const calcs = {
    // The most of each good, from all the hours spent on it.
    maxC: 'params.C * params.h',
    maxT: 'params.T * params.h',
    // A and B, on the curve. A point whose toasties the curve no longer
    // reaches — the curve shrank under it — sits at the end of the curve.
    tA: 'min(params.a, calcs.maxT)',
    tB: 'min(params.b, calcs.maxT)',
    cA: coffeesAt('calcs.tA'),
    cB: coffeesAt('calcs.tB'),
    // The move from A to B, and what each extra toastie costs on it — while
    // A and B are on the stage, and NaN while they are not, which the caption
    // and the strip both leave unsaid rather than print. A cost read out
    // before there was anything to cost, or while a question shifted the curve
    // under two points nobody can see, would be a number about nothing. With
    // A and B together there is no move, and `oc` is 0/0: NaN again.
    //
    // Rounded here, to the tenth everything prints it to, because two things
    // print it: the caption, through the app's formatter, and the readout on
    // the diagram, through mathjs's. They round a tie differently — 29 ÷ 20 is
    // 1.45, which toFixed reads as the double just under it and prints 1.4,
    // and mathjs prints 1.5 — so the diagram said one cost and the caption
    // above it another. mathjs's round is the one a student would do by hand,
    // and a number already on the tenth has no tie left for either to break.
    gain: `(${SHOW_CHOICES}) ? calcs.tB - calcs.tA : NaN`,
    cost: `(${SHOW_CHOICES}) ? calcs.cA - calcs.cB : NaN`,
    oc: 'round(calcs.cost / calcs.gain, 1)',
    // Where Z is against the curve, as a fraction of the way out to it along
    // its own ray: under 1 inside, over 1 outside. Three hundredths either way
    // counts as on it, which is a coffee or so's width at this scale.
    rZ: '((params.pt / calcs.maxT)^params.k + (params.pc / calcs.maxC)^params.k)^(1 / params.k)',
    dOc: 'calcs.oc - prev.calcs.oc'
};

export const ppcDiagram = {
    schema: 'EconSchema',

    params: [
        // From 10 to 30 hours, 5 to 15 coffees an hour and 2.5 to 7.5 toasties
        // an hour: any one of them at either end keeps the curve inside the
        // axes, which is every move a question or a step makes. Two at the top
        // together run off them, which the playground allows — the diagram is
        // clipped, and nothing is refused.
        { name: 'h', label: 'Work hours', ...HOURS },
        { name: 'C', label: 'Coffees an hour', ...COFFEE_RATE },
        { name: 'T', label: 'Toasties an hour', ...TOASTIE_RATE },
        { name: 'k', label: 'Specialisation', value: 2, min: 1, max: 3, round: 0.5 },

        // In steps of 5 toasties, so every move is a sum a student can check.
        { name: 'a', label: 'Toasties at A', value: 60, min: 0, max: 150, round: 5 },
        { name: 'b', label: 'Toasties at B', value: 80, min: 0, max: 150, round: 5 },
        { name: 'pt', label: 'Toasties at Z', value: 40, min: 0, max: 160, round: 5 },
        { name: 'pc', label: 'Coffees at Z', value: 120, min: 0, max: 320, round: 5 },

        // The question apparatus, presentation like every lesson's.
        { name: 'asking', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'submitted', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'revealed', value: 0, min: 0, max: 1, round: 1, presentation: true },
        apparatus('startH', HOURS),
        apparatus('answerH', HOURS),
        apparatus('startC', COFFEE_RATE),
        apparatus('answerC', COFFEE_RATE),
        apparatus('startT', TOASTIE_RATE),
        apparatus('answerT', TOASTIE_RATE)
    ],

    calcs,

    layout: {
        CustomLayout: {
            panels: [
                {
                    key: 'cafe',
                    xAxis: { title: 'Toasties', min: 0, max: 160 },
                    yAxis: { title: 'Coffees', min: 0, max: 320 },
                    objects: [
                        // What the café can make: everything on or under the curve.
                        {
                            type: 'Area',
                            def: {
                                name: 'attainable', title: '',
                                fn1: curveAt('(x)'), fn2: '0',
                                min: 0, max: 'calcs.maxT', samplePoints: 80,
                                color: 'colors.ppf', opacity: 0.08,
                                srTitle: 'What the café can make'
                            }
                        },
                        {
                            type: 'Curve',
                            def: {
                                name: 'questionStart', ...curveOf(START),
                                color: 'colors.ppf', lineStyle: 'dashed', strokeOpacity: 0.35,
                                show: 'params.asking'
                            }
                        },
                        {
                            type: 'Curve',
                            def: {
                                name: 'questionAnswer', ...curveOf(ANSWER),
                                color: 'colors.ppf', lineStyle: 'dotted',
                                label: { text: '\\text{PPC}_1', t: 1.35, position: 'bl' },
                                show: ANSWERED
                            }
                        },
                        // Untitled, on purpose. The engine says how a curve
                        // moved from its chord, and a PPC that grows keeps its
                        // chord's slope, so "gets flatter" is what it would say
                        // of an outward shift. The strip says what changed in
                        // the lesson's words instead, and the points on the
                        // curve say which way they went.
                        {
                            type: 'Curve',
                            def: {
                                name: 'ppc', title: '', ...curveOf({ toasties: 'calcs.maxT', coffees: 'calcs.maxC' }),
                                color: 'colors.ppf',
                                // Its name, up on the flat top, outside. Not
                                // while the lesson is about A and B, which
                                // the lesson puts there as well; the name was
                                // taught the step before. The ghost's PPC₀ is
                                // built from this and goes where it goes, and
                                // only shows when a step moves the curve —
                                // never with A or B up here.
                                label: {
                                    text: '\\text{PPC}', t: 1.35, position: 'bl',
                                    show: `params.step < ${CHOICES} or params.step >= ${SHIFTS}`
                                },
                                // Grabbed anywhere and pulled out or in, the
                                // curve passes through the pointer: the hours it
                                // would take for it to. Held still while the
                                // lesson is about A and B, which sit on it: a
                                // grab that missed a point by a pixel would
                                // move the whole curve instead.
                                drag: [{
                                    directions: 'xy', param: 'h',
                                    expression: '((max(drag.x, 0) / params.T)^params.k + ' +
                                        '(max(drag.y, 0) / params.C)^params.k)^(1 / params.k)',
                                    draggable: `(params.step < ${CHOICES} or params.step >= ${SHIFTS}) ` +
                                        'and not(params.submitted)'
                                }],
                                ghost: { show: 'not(params.asking)', label: '_0' }
                            }
                        },
                        // The curve's two ends, each moved by how fast the café
                        // makes that good.
                        {
                            type: 'Point',
                            def: {
                                name: 'coffeeEnd', title: '', x: 0, y: 'calcs.maxC',
                                color: 'colors.ppf', r: 6,
                                drag: [{
                                    directions: 'y', param: 'C', expression: 'max(drag.y, 0) / params.h',
                                    draggable: 'not(params.submitted)'
                                }],
                                srTitle: 'Most coffees'
                            }
                        },
                        {
                            type: 'Point',
                            def: {
                                name: 'toastieEnd', title: '', x: 'calcs.maxT', y: 0,
                                color: 'colors.ppf', r: 6,
                                drag: [{
                                    directions: 'x', param: 'T', expression: 'max(drag.x, 0) / params.h',
                                    draggable: 'not(params.submitted)'
                                }],
                                srTitle: 'Most toasties'
                            }
                        },
                        // The move from A to B, as the two legs of a step.
                        // Untitled, as everything drawn here but the points
                        // is: a name doubles as a word in "What changed", and
                        // a leg growing is not something the student moved.
                        //
                        // Dotted, as a dropline is: each is a distance to read
                        // off. Dashed is what a curve's ghost is, where the
                        // curve used to be (docs/chart-design.md).
                        {
                            type: 'Segment',
                            def: {
                                name: 'gainLeg', title: '', a: ['calcs.tA', 'calcs.cA'], b: ['calcs.tB', 'calcs.cA'],
                                color: 'colors.choice', lineStyle: 'dotted',
                                show: `(${SHOW_CHOICES}) and calcs.gain != 0`
                            }
                        },
                        {
                            type: 'Segment',
                            def: {
                                name: 'costLeg', title: '', a: ['calcs.tB', 'calcs.cA'], b: ['calcs.tB', 'calcs.cB'],
                                color: 'colors.choice', lineStyle: 'dotted',
                                show: `(${SHOW_CHOICES}) and calcs.cost != 0`
                            }
                        },
                        legLabel('gainRight', 'calcs.tA', 'calcs.cA',
                            'concat("+", string(calcs.gain), " toasties")', true, PAST_A_RIGHTWARDS),
                        legLabel('costRight', 'calcs.tB', '(calcs.cA + calcs.cB) / 2',
                            `concat("−", ${counted('calcs.cost', 'coffee')})`, true, { position: 'l' }),
                        legLabel('gainLeft', 'calcs.tA', 'calcs.cA',
                            'concat("−", string(-calcs.gain), " toasties")', false, PAST_A_LEFTWARDS),
                        legLabel('costLeft', 'calcs.tB', '(calcs.cA + calcs.cB) / 2',
                            `concat("+", ${counted('-calcs.cost', 'coffee')})`, false, { position: 'r' }),
                        readout('route', 0, `concat(${at('A')}, " → ", ${at('B')})`),
                        // Going left the café gains coffees, so it is a coffee's
                        // cost in toasties; a move along the flat top that
                        // gains no coffee has no cost per coffee to say.
                        readout('perToastie', 1,
                            `concat("1 more toastie costs ", ${fixed('calcs.oc')}, " coffees")`,
                            'calcs.gain > 0'),
                        readout('perCoffee', 1,
                            `concat("1 more coffee costs ", ${fixed('calcs.gain / calcs.cost')}, " toasties")`,
                            'calcs.gain < 0 and calcs.cost < 0'),
                        choice('A', 'a'),
                        choice('B', 'b'),
                        letter('A', 'inside'), letter('A', 'outside'),
                        letter('B', 'inside'), letter('B', 'outside'),
                        // Anywhere at all, and says where it is against the curve.
                        {
                            type: 'Point',
                            def: {
                                name: 'Z', title: 'Z',
                                x: 'params.pt', y: 'params.pc',
                                color: 'colors.combination',
                                show: SHOW_Z,
                                label: {
                                    text: 'concat("Z · ", calcs.rZ < 0.97 ? "inefficient" : ' +
                                        '(calcs.rZ > 1.03 ? "unattainable" : "efficient"))',
                                    plainText: true
                                },
                                drag: [
                                    { directions: 'xy', param: 'pt', expression: 'params.pt + drag.dx' },
                                    { directions: 'xy', param: 'pc', expression: 'params.pc + drag.dy' }
                                ],
                                srTitle: 'Point Z'
                            }
                        }
                    ]
                }
            ]
        }
    }
};

/**
 * One panel, headlined by what the move from A to B costs a toastie.
 *
 * Short, because the number beside it is long: "Coffees per toastie 2.0".
 */
const PANELS = [
    { key: 'cafe', name: 'Café', headline: 'oc', delta: 'dOc' }
] as const;

/**
 * The numbers the strip reports, and what they are called everywhere.
 *
 * Opportunity cost first: it is the caption's number and what "why?" opens the
 * maths on. Then the two halves it is a ratio of, in the words a student
 * would use for them, so the formula the Maths instrument writes is the one
 * the lesson says — coffees given up over toasties gained. Then the two ends
 * of the curve, which are what a shift or a pivot changes.
 */
const NARRATED_CALCS = [
    {
        name: 'oc', label: 'Coffees per toastie', precision: 1, tex: '\\text{Opportunity cost}',
        meaning: 'The opportunity cost of one more toastie, going from A to B',
        rise: 'Each toastie costs more coffees', fall: 'Each toastie costs fewer coffees'
    },
    {
        name: 'gain', label: 'Toasties gained', precision: 0,
        meaning: 'The extra toasties, going from A to B'
    },
    {
        name: 'cost', label: 'Coffees given up', precision: 0,
        meaning: 'The coffees given up for them'
    },
    {
        name: 'maxC', label: 'Most coffees', precision: 0,
        meaning: 'The most coffees the café can make, with every hour on coffee',
        rise: 'The café can make more coffees', fall: 'The café can make fewer coffees'
    },
    {
        name: 'maxT', label: 'Most toasties', precision: 0,
        meaning: 'The most toasties the café can make, with every hour on toasties',
        rise: 'The café can make more toasties', fall: 'The café can make fewer toasties'
    }
];

/**
 * The changes a café really has, as one-click shifts and pivots.
 *
 * Each says which of the three things it moves, and so whether the curve
 * shifts or pivots; the strip says what that did to the numbers. The ordering
 * app is the one that moves two at once: better technology for both goods,
 * which is an outward shift by another road.
 */
const SCENARIOS: Scenario[] = [
    {
        id: 'open-early',
        label: 'Open an hour earlier',
        description: 'Five staff for five hours is 25 hours of work. More resources shift the whole curve outward.',
        params: { h: 25 }
    },
    {
        id: 'sick',
        label: 'Two staff call in sick',
        description: '8 hours of work gone, 12 left. Fewer resources shift the whole curve inward.',
        params: { h: 12 }
    },
    {
        id: 'espresso',
        label: 'A faster espresso machine',
        description: '15 coffees an hour instead of 10. The curve pivots up the coffee axis.',
        params: { C: 15 }
    },
    {
        id: 'press',
        label: 'A bigger sandwich press',
        description: '7.5 toasties an hour instead of 5. The curve pivots out along the toastie axis.',
        params: { T: 7.5 }
    },
    {
        id: 'ordering-app',
        label: 'Customers order on an app',
        description: 'Nobody has to take orders at the counter, so every hour makes more of both. The whole curve shifts outward.',
        params: { C: 12, T: 6 }
    },
    {
        id: 'equally-good',
        label: 'Everyone equally good at both',
        description: 'A straight-line PPC: every toastie costs 2 coffees, wherever the café is on it.',
        params: { k: 1 }
    },
    {
        id: 'baseline',
        label: 'Back to a normal Saturday',
        params: { ...BASELINE }
    }
];

/** A café's Saturday morning, toasties against coffees: what the PPC lesson is drawn on. */
export const CAFE: StudyModel = {
    id: 'cafe',
    name: 'Toasties and coffees at a café',
    diagram: ppcDiagram,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // The three a student can check by hand. A and B's own coordinates are
    // rounded points on a superellipse, which is a formula to trust rather
    // than one to read. The cost is explained as the division it is; the
    // rounding to a tenth is how it is printed, as every number here is.
    explainedCalcs: {
        oc: 'calcs.cost / calcs.gain',
        maxC: calcs.maxC,
        maxT: calcs.maxT
    },
    paramMeanings: {
        h: 'hours of work on the shift',
        C: 'coffees an hour of work makes, when it all goes on coffee',
        T: 'toasties an hour of work makes, when it all goes on toasties'
    },
    // Each answerable with the controls Explore offers: A and B near the top
    // of the curve; B left of A, where the cost is a coffee's, in toasties;
    // and specialisation at 1.
    explorePrompts: [
        'Put A and B where each extra toastie costs less than 1 coffee. Which end of the curve are they at?',
        'Drag B to the left of A. What does each extra coffee cost, in toasties?',
        'Make every toastie cost the same number of coffees, wherever A and B are.'
    ],
    // The three things the curve is built from are blue, as the curve is; A
    // and B are orange, as their points and the step between them are; Z is
    // purple. Specialisation bends the curve but is drawn into every point on
    // it as well, so it claims no colour.
    paramWords: {
        h: {
            about: 'Five staff from 7 to 11 is 20 hours. More staff or longer hours mean more ' +
                'resources.',
            rise: 'Resources increase',
            fall: 'Resources decrease',
            curve: 'ppf'
        },
        C: {
            about: 'How many coffees an hour of work makes, if all of it goes on coffee. Better ' +
                'machines and skills raise it.',
            rise: 'Coffee-making gets faster',
            fall: 'Coffee-making gets slower',
            curve: 'ppf'
        },
        T: {
            about: 'How many toasties an hour of work makes, if all of it goes on toasties. A ' +
                'better sandwich press raises it.',
            rise: 'Toastie-making gets faster',
            fall: 'Toastie-making gets slower',
            curve: 'ppf'
        },
        k: {
            about: 'How differently suited the staff are to the two jobs. At 1 everyone is as ' +
                'good at one as the other, and the curve is a straight line.',
            rise: 'The staff are more specialised',
            fall: 'The staff are less specialised'
        },
        a: { about: 'Point A, on the curve. Drag it along the curve, or move it here.', curve: 'choice' },
        b: { about: 'Point B, on the curve. Drag it along the curve, or move it here.', curve: 'choice' },
        pt: { about: 'Point Z can go anywhere: inside the curve, on it or outside.', curve: 'combination' },
        pc: { about: 'Point Z can go anywhere: inside the curve, on it or outside.', curve: 'combination' }
    },
    questionApparatus: {
        h: { start: 'startH', answer: 'answerH' },
        C: { start: 'startC', answer: 'answerC' },
        T: { start: 'startT', answer: 'answerT' }
    },
    scenarios: SCENARIOS
};

export const PRODUCTION_POSSIBILITIES: StudyContent = {
    id: 'ppc',
    label: 'Production possibilities',
    title: 'What a café can make, and what each choice costs',
    goals: [
        'What a café can make with the staff and time it has',
        'What one more toastie really costs',
        'What the curve assumes, and what moves it'
    ],
    cover: {
        question: 'Why does more of one thing mean less of another?',
        hook: 'A café has five staff, four hours and one espresso machine for the Saturday rush. ' +
            'Every hour spent toasting is an hour not spent making coffee. Follow that trade-off ' +
            'and you can work out what every choice really costs.',
        picture: 'cover'
    },
    pictures: {
        cover: {
            name: 'A café counter',
            src: coverPicture,
            alt: 'A café counter on a Saturday morning, with an espresso machine, a sandwich ' +
                'press, cups of coffee and toasties waiting to go out.'
        },
        crew: {
            name: 'The café\'s resources',
            src: crewPicture,
            still: crewStill,
            alt: 'Five staff behind a café counter, with one espresso machine, one sandwich press ' +
                'and a clock reading 7 to 11: everything the café has to make coffees and toasties with.'
        }
    },
    asides: {
        noticeboard: {
            name: 'Staff noticeboard',
            headline: 'New sandwich press arrives Friday',
            body: 'It toasts six at a time instead of four, so the same staff can turn out half as ' +
                'many toasties again in a morning.',
            note: 'A made-up note, for this question'
        }
    },
    lesson: PPC_LESSON,
    model: CAFE
};
