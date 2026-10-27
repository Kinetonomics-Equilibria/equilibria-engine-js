import { MARKET } from '../lessons/supplyAndDemand';
import { AUD_MARKET } from '../lessons/foreignExchange';
import type { Story } from './story';

/**
 * The stories, in any order: `STORIES` (index.ts) sorts them newest first.
 *
 * Each was checked against its source on the day it was written — the event,
 * its date and its numbers — and a story that could not be checked was left
 * out rather than told. Australian first. The words are the app's: the source
 * is where a student goes for the article's own.
 *
 * A move is where the story leaves each param it names, from the model's own
 * market, the way a scenario names one: which way is the point, and how far
 * is the model's, so each moves its curve as far as the model's scenarios do.
 */
export const WRITTEN: Story[] = [
    {
        id: '2026-10-iron-ore-price',
        date: '2026-10-15',
        headline: 'Iron ore falls to its lowest price in two years',
        body: 'Iron ore traded at US$89.85 a tonne in Singapore, its lowest price since September 2024, ' +
            'as demand for steel in China weakened.',
        source: {
            outlet: 'Reuters, on Kitco',
            href: 'https://www.kitco.com/news/off-the-wire/2026-10-15/' +
                'iron-ore-slips-two-year-low-concerns-over-weak-demand-rising-supply'
        },
        model: AUD_MARKET,
        move: { demand: 40 },
        reasoning: 'China\'s steel mills pay less for Australian iron ore, so fewer AUD are bought to pay ' +
            'for it: demand for AUD falls.'
    },
    {
        id: '2026-09-rba-cash-rate',
        date: '2026-09-29',
        headline: 'The RBA raises the cash rate to 4.60%',
        body: 'The Reserve Bank lifted the cash rate by 0.25 percentage points to 4.60%, its fourth rise ' +
            'this year, because inflation is still too high.',
        source: {
            outlet: 'Reserve Bank of Australia',
            href: 'https://www.rba.gov.au/media-releases/2026/mr-26-27.html'
        },
        model: AUD_MARKET,
        move: { demand: 60 },
        reasoning: 'Higher interest rates here draw investors overseas into Australian bonds, which they ' +
            'buy with AUD: demand for AUD rises.'
    },
    {
        id: '2026-09-us-fed-rate',
        date: '2026-09-16',
        headline: 'The US Federal Reserve raises its interest rate',
        body: 'The Fed lifted its rate by 0.25 percentage points to between 3.75% and 4.00%, to bring US ' +
            'inflation back to 2%.',
        source: {
            outlet: 'US Federal Reserve',
            href: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm'
        },
        model: AUD_MARKET,
        move: { supply: 60 },
        reasoning: 'Higher US rates draw Australian savers into US bonds, and they sell AUD to buy them: ' +
            'supply of AUD rises.'
    },
    {
        id: '2026-09-petrol-price',
        date: '2026-09-12',
        headline: 'Petrol passes $2 a litre again',
        body: 'Regular unleaded averaged $2.11 a litre across Australia, up from $1.55 in July, as war in ' +
            'the Middle East pushed oil above US$100 a barrel.',
        source: {
            outlet: 'The Nightly',
            href: 'https://thenightly.com.au/politics/australian-fuel-prices-surge-above-2-a-litre-as-us-' +
                'iran-war-sends-global-oil-prices-above-us100-c-22859546'
        },
        model: MARKET,
        move: { c: 6 },
        reasoning: 'Petrol is made from oil, so every litre costs sellers more to supply: the supply curve ' +
            'shifts up.'
    },
    {
        id: '2026-03-fuel-excise',
        date: '2026-03-30',
        headline: 'Fuel excise is halved for three months',
        body: 'The government halved fuel excise, the tax on every litre of petrol and diesel, to 26 cents ' +
            'a litre for three months from 1 April.',
        source: {
            outlet: 'The Nightly',
            href: 'https://thenightly.com.au/politics/albanese-government-cuts-petrol-excise-by-26c-to-drop-' +
                'fuel-prices-for-three-months-c-22066296'
        },
        model: MARKET,
        // As far as costs can fall here: the market's own is 2, and 0 is the
        // bottom of its range.
        move: { c: 0 },
        reasoning: 'Excise is a tax sellers pay on every litre, so halving it means each litre costs them ' +
            'less to supply: the supply curve shifts down.'
    }
];
