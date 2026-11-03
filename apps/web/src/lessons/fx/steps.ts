import type { LessonStep } from '../../track/track';
import { GLOSSARY } from '../glossary';

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
 * Written for Year 10 to first-year students, in the voice `docs/language.md`
 * sets out, and chunked twice: three parts, and one idea per step. Each step has
 * a short title that says the idea, then short paragraphs that say what happens
 * and what it means. A word is defined in the step that first uses it, in a
 * key-term box, and not again. No sentence should need reading twice. Where the
 * slides make two points on one slide, this makes them on two steps: the shift,
 * and then what the shift did to each currency.
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
        part: 'The market for the AUD',
        picture: 'trade',
        title: 'Who wants Australian dollars?',
        say: 'People overseas need AUD to pay for what Australia sells, such as iron ore, beef, wine, a ' +
            'degree at an Australian university or a holiday on the Gold Coast.\n\n' +
            'Investors overseas also need AUD to buy Australian shares and property.'
    },
    {
        reveal: ['demand_market'],
        title: 'Demand for AUD slopes down',
        say: 'When the price of the AUD rises, Australian goods cost more for buyers overseas, so they ' +
            'want less AUD.\n\n' +
            'This is why the demand curve for AUD slopes down.',
        term: GLOSSARY.demandForAud
    },
    {
        reveal: ['supply_market'],
        title: 'Who sells Australian dollars?',
        say: 'Australians sell AUD whenever they pay for something from overseas, such as an imported ' +
            'phone, a holiday in Bali or shares in an American company. To pay, they swap AUD for ' +
            'foreign currency.\n\n' +
            'When each AUD buys more USD, the deal is better, so Australians are willing to sell more ' +
            'AUD. This is why the supply curve slopes up.',
        term: GLOSSARY.supplyOfAud
    },
    {
        reveal: ['equilibrium_market'],
        title: 'The exchange rate',
        say: 'At the point where the curves cross, the amount of AUD people want to buy equals the amount ' +
            'they want to sell. This sets the price of the AUD at AUD 1 = USD 0.65.\n\n' +
            'The AUD floats, which means the market sets its price, in the same way that a market sets ' +
            'the price of any other good.',
        term: GLOSSARY.exchangeRate
    },
    {
        reveal: ['mirror'],
        title: 'The same trades, from the US side',
        say: 'Anyone buying AUD with USD is also selling USD. This means that demand for AUD and the ' +
            'supply of USD are the same trades.\n\n' +
            'The second panel shows these trades from the American side. Read this way, the price is ' +
            'USD 1 = AUD 1.54.'
    },
    {
        part: 'When the AUD moves',
        set: { demand: 60 },
        title: 'Demand for AUD increases',
        say: 'Suppose iron ore prices rise sharply. The world spends more on Australian iron ore, so it ' +
            'wants more AUD at every exchange rate.\n\n' +
            'The whole demand curve shifts to the right. Notice where the curves now cross.',
        term: GLOSSARY.shift
    },
    {
        title: 'The AUD appreciates',
        say: 'AUD 1 now buys USD 0.70, so the AUD has appreciated. This means it is worth more than ' +
            'before.\n\n' +
            'From the US side, USD 1 now costs AUD 1.43. The USD has depreciated, which means it is worth ' +
            'less.',
        term: GLOSSARY.appreciationAndDepreciation
    },
    {
        set: { demand: 50 },
        title: 'Up is stronger, down is weaker',
        say: 'When the exchange rate moves up the price axis, the AUD appreciates. When it moves down, ' +
            'the AUD depreciates.\n\n' +
            'Suppose iron ore prices settle. Demand returns to where it was, and the exchange rate ' +
            'returns to AUD 1 = USD 0.65.'
    },
    {
        set: { supply: 60 },
        title: 'Supply of AUD increases',
        say: 'Now suppose Australians travel overseas in record numbers. Each trip means swapping AUD ' +
            'for foreign currency, so Australians sell more AUD at every exchange rate.\n\n' +
            'This time, the supply curve shifts to the right.'
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
            'Which curve moves, and which way? Move it on the diagram, then press Check.',
        ask: {
            param: 'demand', direction: 'up', among: ['demand', 'supply'], illustrate: 10,
            explain: 'To buy Australian bonds, investors first need AUD. Demand for AUD increases, the ' +
                'demand curve shifts to the right, and the AUD appreciates.'
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
            explain: 'To pay for imports, Australians sell AUD for foreign currency. The supply of AUD ' +
                'increases, the supply curve shifts to the right, and the AUD depreciates.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'China buys less iron ore',
        say: 'China\'s steel mills cut production and buy less Australian iron ore.\n\n' +
            'Which curve moves, and which way?',
        ask: {
            param: 'demand', direction: 'down', among: ['demand', 'supply'], illustrate: 10,
            explain: 'When China buys less iron ore, it needs less AUD to pay for it. Demand for AUD ' +
                'decreases, the demand curve shifts to the left, and the AUD depreciates.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Australians spend less overseas',
        say: 'In a downturn, Australians buy fewer imported cars and holiday at home instead.\n\n' +
            'Which curve moves, and which way?',
        ask: {
            param: 'supply', direction: 'down', among: ['demand', 'supply'], illustrate: 10,
            explain: 'Fewer imports and trips abroad mean less AUD is swapped for foreign currency. The ' +
                'supply of AUD decreases, the supply curve shifts to the left, and the AUD appreciates.'
        }
    },
    // The rule the four cases were instances of, said once, on the stage under
    // the cases themselves — and so not on the card as well.
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here is how you went on the four cases.\n\n' +
            'If you would like more practice, press Finish to open this market in the Playground. You ' +
            'can try more real-world cases in Scenarios, or drag the curves yourself.',
        recap: {
            takeaway: 'The exchange rate changes when the world wants to buy more or less AUD, or when ' +
                'Australians want to sell more or less AUD. More demand or less supply makes the AUD ' +
                'appreciate. Less demand or more supply makes it depreciate.'
        }
    }
];
