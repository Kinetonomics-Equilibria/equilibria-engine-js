import { axis, contextArea, counted, fixed, questionLines, readout } from '../kit/chart';
import { atStep, firstQuestion, fromStep, stepTitled, untilStep } from '../kit/lesson';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';
import { PPC_LESSON } from './steps';

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

/** Where A and B arrive, and where Z stands down for them. */
const CHOICES = stepTitled(PPC_LESSON, 'Twenty more toasties');
/** The one step after that which is about Z again. */
const IDLE = stepTitled(PPC_LESSON, 'Full employment');
/** Where the curve is about shifts, and its ends arrive to drag. */
const SHIFTS = stepTitled(PPC_LESSON, 'Fixed resources');
const QUESTIONS = firstQuestion(PPC_LESSON);
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
const SHOW_Z = `${untilStep(CHOICES)} or ${atStep(IDLE)} or ${fromStep(END)}`;
const SHOW_CHOICES = `(${fromStep(CHOICES)} and ${untilStep(QUESTIONS)}) or ${fromStep(END)}`;


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
 * outside while B is to the left, because then it runs inside. With A and B
 * at one place, B's goes outside and A's stays in, so the two are not one on
 * top of the other — which is where they were once a shrinking curve had
 * pushed both to its end.
 *
 * Never closer to an axis than a twentieth of the axis, so a point on an axis
 * keeps its letter on the plot. A twenty-fifth of the curve's reach was the
 * rule, and the curve can shrink to half its size: at 10 hours of work the
 * letters at the curve's end sat across the toasties axis.
 *
 * The coordinates themselves are in the readout at the top of the panel,
 * where they have room. Beside the points they ran into the step's labels, or
 * off the plot past an axis, at one step or another.
 */
const letter = (name: 'A' | 'B', side: 'inside' | 'outside') => {
    const scale = side === 'inside' ? 11 / 12 : 13 / 12;
    const rightwards = side === 'inside';
    // Which side a letter is on when A and B are one place: A's inside, B's out.
    const together = name === 'A' ? rightwards : !rightwards;
    const compared = rightwards ? (together ? '>=' : '>') : (together ? '<=' : '<');
    return {
        type: 'Label',
        def: {
            name: `${name}${side === 'inside' ? 'In' : 'Out'}`, title: '',
            x: `max(${scale} * calcs.t${name}, ${TOASTIES_AXIS / 20})`,
            y: `max(${scale} * calcs.c${name}, ${COFFEES_AXIS / 20})`,
            text: name, align: 'center', plainText: true,
            color: 'colors.choice',
            show: `(${SHOW_CHOICES}) and calcs.gain ${compared} 0`
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
const readoutLine = (name: string, line: number, text: string, show = 'true') => readout({
    name, line, text, corner: [158, COFFEES_AXIS], meaning: 'choice',
    show: `(${SHOW_CHOICES}) and ${show}`
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

/**
 * Just past A, along the leg away from it: above it going right, below it
 * going left. Past the arrows round A as well, which say it can be dragged
 * and reach 18px out; 10px in, the label sat on the arrow pointing its way.
 */
const PAST_A_RIGHTWARDS = { align: 'left', xPixelOffset: 20, yPixelOffset: 13 };
const PAST_A_LEFTWARDS = { align: 'right', xPixelOffset: -20, yPixelOffset: -15 };

/**
 * How far the axes run: past the most of each good any one param at the top
 * of its range can make, 150 toasties and 300 coffees.
 */
const TOASTIES_AXIS = 160;
const COFFEES_AXIS = 320;

export const CALCS = {
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
    rZ: '((params.pt / calcs.maxT)^params.k + (params.pc / calcs.maxC)^params.k)^(1 / params.k)'
};

export const PARAMS: ParamDefinition[] = [
    // From 10 to 30 hours, 5 to 15 coffees an hour and 2.5 to 7.5 toasties
    // an hour: any one of them at either end keeps the curve inside the
    // axes, which is every move a question or a step makes. Two at the top
    // together run off them, which the playground allows — the diagram is
    // clipped, and nothing is refused.
    { name: 'h', label: 'Work hours', value: 20, min: 10, max: 30, round: 1 },
    { name: 'C', label: 'Coffees an hour', value: 10, min: 5, max: 15, round: 0.5 },
    { name: 'T', label: 'Toasties an hour', value: 5, min: 2.5, max: 7.5, round: 0.5 },
    { name: 'k', label: 'Specialisation', value: 2, min: 1, max: 3, round: 0.5 },

    // In steps of 5 toasties, so every move is a sum a student can check.
    { name: 'a', label: 'Toasties at A', value: 60, min: 0, max: 150, round: 5 },
    { name: 'b', label: 'Toasties at B', value: 80, min: 0, max: 150, round: 5 },
    // Z's coffees stop 40 short of the top of the axis, where the word
    // above it still fits on the plot. At 320 it ran off the top: a
    // label is turned to fit sideways (`flipToFit`), never up and down.
    { name: 'pt', label: 'Toasties at Z', value: 40, min: 0, max: 160, round: 5 },
    { name: 'pc', label: 'Coffees at Z', value: 120, min: 0, max: 280, round: 5 }
];

/**
 * One panel, headlined by what the move from A to B costs a toastie.
 *
 * Short, because the number beside it is long: "Coffees per toastie 2.0".
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'cafe', name: 'Café', headline: 'oc',
        xAxis: axis('Toasties', 0, TOASTIES_AXIS),
        yAxis: axis('Coffees', 0, COFFEES_AXIS),
        objects: [
            // What the café can make: everything on or under the curve.
            contextArea({
                name: 'attainable', meaning: 'ppf',
                shape: { fn1: curveAt('(x)'), fn2: '0', min: 0, max: 'calcs.maxT', samplePoints: 80 },
                srTitle: 'What the café can make'
            }),
            // Where a question found the curve, and where its answer would put
            // it: one pair for all three askable params, because all three move
            // the same curve. The screen parks the two a question is not about
            // on their current values (`parkApparatus`), so the start line is
            // the curve as the question found it whichever is asked, and the
            // answer line differs from it only in the one param the answer
            // moves. The curve itself is the café's own, below: its label and
            // its drag change with the steps, which no other lesson's do.
            ...questionLines({
                meaning: 'ppf', symbol: '\\text{PPC}', moves: ['h', 'C', 'T'],
                shape: p => curveOf({ toasties: `${p.T} * ${p.h}`, coffees: `${p.C} * ${p.h}` }),
                labelAt: () => ({ t: 1.35, position: 'bl' })
            }),
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
                        show: `${untilStep(CHOICES)} or ${fromStep(SHIFTS)}`
                    },
                    srTitle: 'Production possibility curve',
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
                        draggable: `(${untilStep(CHOICES)} or ${fromStep(SHIFTS)}) ` +
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
            readoutLine('route', 0, `concat(${at('A')}, " → ", ${at('B')})`),
            // Going left the café gains coffees, so it is a coffee's
            // cost in toasties; a move along the flat top that
            // gains no coffee has no cost per coffee to say.
            readoutLine('perToastie', 1,
                `concat("1 more toastie costs ", ${fixed('calcs.oc', 1)}, " coffees")`,
                'calcs.gain > 0'),
            readoutLine('perCoffee', 1,
                `concat("1 more coffee costs ", ${fixed('calcs.gain / calcs.cost', 1)}, " toasties")`,
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
                    // Above it and to the right, or to the left where
                    // the right would run off the plot.
                    label: {
                        text: 'concat("Z · ", calcs.rZ < 0.97 ? "inefficient" : ' +
                            '(calcs.rZ > 1.03 ? "unattainable" : "efficient"))',
                        plainText: true, flipToFit: true
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
];
