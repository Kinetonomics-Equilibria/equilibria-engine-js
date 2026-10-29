import type { LessonStep } from '../../track/track';

/** Where the market starts, and where every question starts from. */
export const BASELINE = { demand: 50, supply: 50 };

/**
 * The lesson, in the order the slides take it.
 *
 * What a currency's price is and that it reads both ways, then the market that
 * sets it, then appreciation and depreciation as movements of that price, then
 * the student moving the curves themselves. The determinants arrive as the
 * reasons the curves move — the slides' four, tastes, incomes, relative prices
 * and interest rates, plus the one Australia cannot be taught without, the
 * price of what it digs up — with Australian examples where the slides had
 * American ones.
 *
 * Written for Year 10 to first-year students, and chunked twice: three parts,
 * and one idea per step. Each step has a short title that says the idea, then a
 * paragraph saying what happens and, where it helps, a second saying what it
 * means. A word is defined in the step that first uses it, in a key-term box,
 * and not again. Plain words first and the economics word second ("worth more
 * — it has appreciated"), contractions, and no sentence a student has to read
 * twice. Where the slides make two points on one slide, this makes them on two
 * steps: the shift, and then what the shift did to each currency.
 *
 * Every number a step states is one the diagram solves to at that step, and
 * `foreignExchange.test.tsx` holds each one to it — which is why a step never
 * quotes the rate it moved away from: the caption beside it shows only the
 * rate now.
 */
export const FX_LESSON: LessonStep[] = [
    // Who the buyers are, as a picture before they are a curve: the trades are
    // the idea, and a line on a pair of axes is a summary of trades nobody has
    // been shown yet. The diagram waits under the picture, and the next step
    // draws the demand curve on it.
    {
        part: 'Meet the market',
        picture: 'trade',
        title: 'Who wants Australian dollars?',
        say: 'People overseas need AUD to pay for what Australia sells: iron ore, beef, wine, a ' +
            'degree at an Australian university, a holiday on the Gold Coast. Investors need AUD ' +
            'to buy Australian shares and property.'
    },
    {
        reveal: ['demand_market'],
        title: 'Demand for AUD slopes down',
        say: 'The dearer the AUD, the more all of that costs them, so the less AUD they want. ' +
            'That\'s why the demand curve slopes down.',
        term: {
            word: 'Demand for AUD',
            meaning: 'How much AUD people want to buy at each exchange rate.'
        }
    },
    {
        reveal: ['supply_market'],
        title: 'Who sells Australian dollars?',
        say: 'Australians do, whenever they pay for something from overseas: imported phones ' +
            'and cars, a holiday in Bali, shares in an American company. To pay, they swap AUD ' +
            'for foreign currency.\n\n' +
            'The more USD each AUD buys, the better the deal, so the more AUD they\'re willing ' +
            'to sell. That\'s why the supply curve slopes up.',
        term: {
            word: 'Supply of AUD',
            meaning: 'How much AUD people want to sell for other currencies at each exchange rate.'
        }
    },
    {
        reveal: ['equilibrium_market'],
        title: 'The exchange rate',
        say: 'Where the curves cross, the amount of AUD people want to buy matches the amount ' +
            'they want to sell. That sets the price of the AUD: AUD 1 = USD 0.65.\n\n' +
            'Nobody chooses this number. The AUD floats, so the market sets its price, the same ' +
            'way it sets the price of anything else.',
        term: {
            word: 'Exchange rate',
            meaning: 'The price of one currency in another. Here, how many USD one AUD buys.'
        }
    },
    {
        reveal: ['mirror'],
        title: 'The same trades, from the US side',
        say: 'Anyone buying AUD with USD is also selling USD. So demand for AUD and the supply ' +
            'of USD are the same trades, and the second panel shows them from the American ' +
            'side.\n\n' +
            'Read that way round, the price is USD 1 = AUD 1.54.'
    },
    {
        part: 'When the AUD moves',
        set: { demand: 60 },
        title: 'Demand for AUD increases',
        say: 'Say iron ore prices soar. The world spends more on Australian ore, so it wants ' +
            'more AUD at every exchange rate.\n\n' +
            'The whole demand curve shifts to the right. Watch where the curves cross now.',
        term: {
            word: 'Shift',
            meaning: 'When something other than the exchange rate changes how much AUD people ' +
                'want, and the whole curve moves.'
        }
    },
    {
        title: 'The AUD appreciates',
        say: 'AUD 1 now buys USD 0.70, so the AUD has appreciated: it\'s worth more than before.\n\n' +
            'From the US side, USD 1 now costs AUD 1.43. The USD has depreciated: it\'s worth less.',
        term: {
            word: 'Appreciate and depreciate',
            meaning: 'A currency appreciates when it\'s worth more of another currency, and ' +
                'depreciates when it\'s worth less.'
        }
    },
    {
        set: { demand: 50 },
        title: 'Up is stronger, down is weaker',
        say: 'Up the price axis, the AUD appreciates. Down it, the AUD depreciates.\n\n' +
            'Iron ore prices settle, demand goes back to where it was, and so does the rate: ' +
            'AUD 1 = USD 0.65.'
    },
    {
        set: { supply: 60 },
        title: 'Supply of AUD increases',
        say: 'Now say Australians travel overseas in record numbers. Every trip means ' +
            'swapping AUD for foreign currency, so Australians sell more AUD at every exchange ' +
            'rate.\n\n' +
            'This time it\'s the supply curve that shifts to the right.'
    },
    {
        title: 'The AUD depreciates',
        say: 'AUD 1 now buys only USD 0.60, so the AUD has depreciated.\n\n' +
            'From the US side, USD 1 now costs AUD 1.67. The USD has appreciated.'
    },
    // The questions. Each starts from the baseline, both curves included: the
    // answer is marked from where the question began, so where it begins should
    // not depend on what the student did on the way — and a supply curve left
    // shifted from the step before would make a demand question about a
    // different market. Both are bounded only by their own ranges, so the
    // two-param update cannot pass through a state the diagram refuses.
    //
    // Direction only, deliberately. The slides' practice asks which way a curve
    // moves and what that does to the currency, never by how much; a target
    // would have the verdict tell a student that the RBA's decision "goes to
    // 60", which is a number this lesson made up. `illustrate` is the same
    // number put where it belongs instead — on the picture "Show me" draws, and
    // nowhere the grade looks.
    //
    // No prompt names its curve, because which curve moves is the first thing
    // the slides ask (P14). Each question offers both, in the same order every
    // time, so the order says nothing about the answer; the student is marked
    // on the choice and then on the direction, and told in words if they moved
    // the wrong one. That makes each scenario carry the reasoning, and each is
    // written to pin one curve: the RBA's "investors overseas buy Australian
    // bonds" is a demand for AUD, and the relative-prices question says
    // "Australians switch to imports" because the export side of the same
    // change would be a fair answer otherwise — and moves the other curve.
    //
    // `explain` is the reasoning, for after the question is finished: who needs
    // AUD or sells them, so which curve, which way, and what the rate does.
    {
        part: 'Your turn',
        set: { ...BASELINE },
        title: 'Interest rates rise',
        // The event is the report's, beside the diagram, so the card asks the
        // question and nothing else: one home for the news.
        aside: 'rbaReport',
        say: 'Read the news report next to the diagram.\n\n' +
            'Which curve moves, and which way? Move it, then press Check.',
        ask: {
            param: 'demand', direction: 'up', among: ['demand', 'supply'], illustrate: 10,
            explain: 'To buy Australian bonds, investors first need AUD. So demand for AUD ' +
                'increases, the demand curve shifts right, and the AUD appreciates.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Prices rise faster in Australia',
        say: 'Prices in Australia rise faster than in the US. Imports now look cheap next to ' +
            'Australian-made goods, so Australians switch to imports.\n\n' +
            'Which curve moves, and which way?',
        ask: {
            param: 'supply', direction: 'up', among: ['demand', 'supply'], illustrate: 10,
            explain: 'To pay for imports, Australians sell AUD for foreign currency. So the ' +
                'supply of AUD increases, the supply curve shifts right, and the AUD depreciates.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'China buys less iron ore',
        say: 'China\'s steel mills cut production and buy less Australian iron ore.\n\n' +
            'Which curve moves, and which way?',
        ask: {
            param: 'demand', direction: 'down', among: ['demand', 'supply'], illustrate: 10,
            explain: 'Less ore bought means less AUD needed to pay for it. So demand for AUD ' +
                'decreases, the demand curve shifts left, and the AUD depreciates.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Australians spend less overseas',
        say: 'In a downturn, Australians buy fewer imported cars and holiday at home instead.\n\n' +
            'Which curve moves, and which way?',
        ask: {
            param: 'supply', direction: 'down', among: ['demand', 'supply'], illustrate: 10,
            explain: 'Fewer imports and trips abroad mean less AUD swapped for foreign ' +
                'currency. So the supply of AUD decreases, the supply curve shifts left, and ' +
                'the AUD appreciates.'
        }
    },
    // The rule the four cases were instances of, said once, on the stage under
    // the cases themselves — and so not on the card as well.
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here\'s how you went on the four cases.\n\n' +
            'Press Finish to take this market to the Playground, where you can try more ' +
            'real-world cases in Scenarios or drag the curves yourself.',
        recap: {
            takeaway: 'Anything that changes how much AUD the world wants to buy, or how much AUD ' +
                'Australians want to sell, moves the exchange rate: more demand or less supply ' +
                'and the AUD appreciates, the reverse and it depreciates.'
        }
    }
];
