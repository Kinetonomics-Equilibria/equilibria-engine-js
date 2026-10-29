import type { Scenario } from '../../dock/Scenarios';
import { defineLesson } from '../kit/lesson';
import type { ModelSpec } from '../kit/lesson';
import type { StudyContent, StudyModel } from '../content';
import { BASELINE, PPC_LESSON } from './steps';
import { CALCS, PANELS, PARAMS } from './chart';
import coverPicture from '../pictures/ppc-cover.svg';
import crewPicture from '../pictures/ppc-crew.svg';
import crewStill from '../pictures/ppc-crew-still.svg';

export { PPC_LESSON } from './steps';

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
const MODEL: ModelSpec = {
    id: 'cafe',
    name: 'Toasties and coffees at a café',
    params: PARAMS,
    calcs: CALCS,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // The three a student can check by hand. A and B's own coordinates are
    // rounded points on a superellipse, which is a formula to trust rather
    // than one to read. The cost is explained as the division it is; the
    // rounding to a tenth is how it is printed, as every number here is.
    explainedCalcs: {
        oc: 'calcs.cost / calcs.gain',
        maxC: CALCS.maxC,
        maxT: CALCS.maxT
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
    scenarios: SCENARIOS
};

export const PRODUCTION_POSSIBILITIES: StudyContent = defineLesson({
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
    steps: PPC_LESSON,
    model: MODEL
});

export const CAFE: StudyModel = PRODUCTION_POSSIBILITIES.model;

