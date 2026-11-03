/**
 * Every key term in the app, and the one definition each has.
 *
 * A step takes its term from here (`term: GLOSSARY.marginalUtility`) and never
 * writes its own, so a word means the same thing in every lesson. A student may
 * write one of these in an assessment, so each is a complete sentence that
 * starts with the term, and each is about economics rather than a lesson's
 * example. `docs/language.md` has the rules, and `language.test.ts` holds them.
 *
 * The step's own words explain the idea plainly, and this says it exactly.
 */

/** A word, and what it means: the box a step shows under its words. */
export interface KeyTerm {
    word: string;
    meaning: string;
}

export const GLOSSARY = {
    // The economic problem.
    scarcity: {
        word: 'Scarcity',
        meaning: 'Scarcity is the basic economic problem that arises because resources are limited ' +
            'while people\'s wants are unlimited.'
    },
    opportunityCost: {
        word: 'Opportunity cost',
        meaning: 'Opportunity cost is the value of the next best alternative that is given up when a ' +
            'choice is made.'
    },
    opportunityCostPerUnit: {
        word: 'Opportunity cost per unit',
        meaning: 'Opportunity cost per unit is the amount of one good given up for each extra unit ' +
            'gained of another good. It equals the quantity given up divided by the quantity gained.'
    },
    increasingOpportunityCost: {
        word: 'Increasing opportunity cost',
        meaning: 'Increasing opportunity cost occurs when each extra unit of a good requires giving up ' +
            'more of the other good than the unit before. It makes the PPC bow outward.'
    },
    constantOpportunityCost: {
        word: 'Constant opportunity cost',
        meaning: 'Constant opportunity cost occurs when each extra unit of a good requires giving up ' +
            'the same amount of the other good. It makes the PPC a straight line.'
    },
    productionPossibilityCurve: {
        word: 'Production possibility curve (PPC)',
        meaning: 'A production possibility curve (PPC) is a graph showing the maximum combinations of ' +
            'two goods an economy can produce when it uses all of its resources efficiently, given its ' +
            'existing technology.'
    },
    inefficiency: {
        word: 'Inefficiency',
        meaning: 'Inefficiency occurs when resources are unused or poorly used, so output is lower than ' +
            'the maximum possible. It is shown by a point inside the PPC.'
    },
    productiveEfficiency: {
        word: 'Productive efficiency',
        meaning: 'Productive efficiency occurs when resources are used so well that producing more of ' +
            'one good requires producing less of another. It is shown by any point on the PPC.'
    },
    unattainableCombination: {
        word: 'Unattainable combination',
        meaning: 'An unattainable combination is a combination of goods that cannot be produced with the ' +
            'available resources and technology. It is shown by a point outside the PPC.'
    },
    assumption: {
        word: 'Assumption',
        meaning: 'An assumption is a condition a model takes as given, so that the model is simple enough ' +
            'to draw and analyse.'
    },
    economicGrowth: {
        word: 'Economic growth',
        meaning: 'Economic growth is an increase in an economy\'s output over time. Growth in its ' +
            'productive capacity is shown by the PPC shifting outward.'
    },
    fullEmployment: {
        word: 'Full employment',
        meaning: 'Full employment, in the PPC model, means that all of an economy\'s available resources ' +
            'are in use.'
    },
    technology: {
        word: 'Technology',
        meaning: 'Technology is the knowledge, machinery and methods used to produce goods and services.'
    },

    // Demand.
    demand: {
        word: 'Demand',
        meaning: 'Demand is the quantity of a good or service that consumers are willing and able to buy ' +
            'at each price over a given period.'
    },
    marketDemand: {
        word: 'Market demand',
        meaning: 'Market demand is the total quantity of a good or service that all consumers in a market ' +
            'are willing and able to buy at each price over a given period.'
    },
    quantityDemanded: {
        word: 'Quantity demanded',
        meaning: 'Quantity demanded is the amount of a good or service that consumers are willing and ' +
            'able to buy at one particular price over a given period.'
    },
    lawOfDemand: {
        word: 'Law of demand',
        meaning: 'The law of demand states that, all else being equal, quantity demanded falls when the ' +
            'price of a good rises, and rises when the price falls.'
    },
    changeInQuantityDemanded: {
        word: 'Change in quantity demanded',
        meaning: 'A change in quantity demanded is a movement along the demand curve, caused by a change ' +
            'in the good\'s own price.'
    },
    changeInDemand: {
        word: 'Change in demand',
        meaning: 'A change in demand is a shift of the whole demand curve, caused by a change in a factor ' +
            'other than the good\'s own price.'
    },
    increaseInDemand: {
        word: 'Increase in demand',
        meaning: 'An increase in demand is a rise in the quantity demanded at every price, shown by the ' +
            'demand curve shifting to the right.'
    },
    utility: {
        word: 'Utility',
        meaning: 'Utility is the satisfaction a consumer gains from consuming a good or service.'
    },
    marginalUtility: {
        word: 'Marginal utility',
        meaning: 'Marginal utility is the additional satisfaction a consumer gains from consuming one more ' +
            'unit of a good or service.'
    },
    diminishingMarginalUtility: {
        word: 'Diminishing marginal utility',
        meaning: 'Diminishing marginal utility is the tendency for marginal utility to fall as a consumer ' +
            'consumes more units of a good or service.'
    },
    substitute: {
        word: 'Substitute',
        meaning: 'A substitute is a good that can be used in place of another good. When the price of one ' +
            'falls, demand for the other decreases.'
    },
    complement: {
        word: 'Complement',
        meaning: 'A complement is a good that is used together with another good. When the price of one ' +
            'falls, demand for the other increases.'
    },
    consumerExpectations: {
        word: 'Expectations',
        meaning: 'Expectations are what consumers believe will happen in the future, such as a change in ' +
            'prices or incomes, which affects how much they buy today.'
    },
    tastesAndPreferences: {
        word: 'Tastes and preferences',
        meaning: 'Tastes and preferences are the goods and services consumers prefer to buy, which can ' +
            'change with fashion, advertising and other influences.'
    },
    normalGood: {
        word: 'Normal good',
        meaning: 'A normal good is a good for which demand increases when consumers\' incomes rise, and ' +
            'decreases when incomes fall.'
    },

    // Supply.
    supply: {
        word: 'Supply',
        meaning: 'Supply is the quantity of a good or service that producers are willing and able to sell ' +
            'at each price over a given period.'
    },
    marketSupply: {
        word: 'Market supply',
        meaning: 'Market supply is the total quantity of a good or service that all producers in a market ' +
            'are willing and able to sell at each price over a given period.'
    },
    quantitySupplied: {
        word: 'Quantity supplied',
        meaning: 'Quantity supplied is the amount of a good or service that producers are willing and able ' +
            'to sell at one particular price over a given period.'
    },
    lawOfSupply: {
        word: 'Law of supply',
        meaning: 'The law of supply states that, all else being equal, quantity supplied rises when the ' +
            'price of a good rises, and falls when the price falls.'
    },
    changeInQuantitySupplied: {
        word: 'Change in quantity supplied',
        meaning: 'A change in quantity supplied is a movement along the supply curve, caused by a change in ' +
            'the good\'s own price.'
    },
    changeInSupply: {
        word: 'Change in supply',
        meaning: 'A change in supply is a shift of the whole supply curve, caused by a change in a factor ' +
            'other than the good\'s own price.'
    },
    costOfProduction: {
        word: 'Cost of production',
        meaning: 'Cost of production is the total amount a firm pays for the inputs it uses to produce a ' +
            'good or service.'
    },
    marginalCost: {
        word: 'Marginal cost',
        meaning: 'Marginal cost is the additional cost of producing one more unit of a good or service.'
    },
    increasingMarginalCost: {
        word: 'Increasing marginal cost',
        meaning: 'Increasing marginal cost is the tendency for marginal cost to rise as a firm produces more ' +
            'units of a good or service.'
    },
    inputs: {
        word: 'Inputs',
        meaning: 'Inputs are the resources a firm uses to produce a good or service, such as labour, raw ' +
            'materials and equipment.'
    },
    producerExpectations: {
        word: 'Expectations',
        meaning: 'Expectations are what firms believe will happen in the future, such as a change in prices ' +
            'or sales, which affects how much they offer for sale today.'
    },
    substituteInProduction: {
        word: 'Substitute in production',
        meaning: 'A substitute in production is a different good that a firm could produce with the same ' +
            'resources.'
    },
    complementInProduction: {
        word: 'Complement in production',
        meaning: 'A complement in production is a good that is produced jointly with another good, so ' +
            'producing more of one also produces more of the other.'
    },
    subsidy: {
        word: 'Subsidy',
        meaning: 'A subsidy is a payment from the government to a producer, often for each unit sold, which ' +
            'lowers the producer\'s costs.'
    },

    // Markets.
    equilibrium: {
        word: 'Equilibrium',
        meaning: 'Equilibrium is the point at which quantity demanded equals quantity supplied, so there is ' +
            'no pressure for the price to change.'
    },
    consumerSurplus: {
        word: 'Consumer surplus',
        meaning: 'Consumer surplus is the difference between the highest price consumers are willing to pay ' +
            'and the price they pay. It is shown by the area below the demand curve and above the price.'
    },
    totalRevenue: {
        word: 'Total revenue',
        meaning: 'Total revenue is the total amount a seller receives from selling a good or service. It ' +
            'equals the price multiplied by the quantity sold.'
    },

    // Elasticity.
    priceElasticityOfDemand: {
        word: 'Price elasticity of demand',
        meaning: 'Price elasticity of demand is a measure of how much quantity demanded responds to a change ' +
            'in price. It equals the percentage change in quantity demanded divided by the percentage ' +
            'change in price.'
    },
    midpointMethod: {
        word: 'Midpoint method',
        meaning: 'The midpoint method calculates a percentage change by dividing the change by the average ' +
            'of the starting and final values, so a rise and the equal fall give the same percentage.'
    },
    inelasticDemand: {
        word: 'Inelastic demand',
        meaning: 'Inelastic demand occurs when the percentage change in quantity demanded is smaller than ' +
            'the percentage change in price, which gives an elasticity below 1.'
    },
    elasticDemand: {
        word: 'Elastic demand',
        meaning: 'Elastic demand occurs when the percentage change in quantity demanded is larger than the ' +
            'percentage change in price, which gives an elasticity above 1.'
    },
    totalRevenueTest: {
        word: 'Total revenue test',
        meaning: 'The total revenue test uses a price change to identify elasticity. If a price rise ' +
            'increases total revenue, demand is inelastic. If a price rise decreases total revenue, demand ' +
            'is elastic.'
    },

    // International economics.
    exchangeRate: {
        word: 'Exchange rate',
        meaning: 'An exchange rate is the price of one currency expressed in terms of another currency.'
    },
    demandForAud: {
        word: 'Demand for AUD',
        meaning: 'Demand for AUD is the quantity of Australian dollars that people are willing and able to ' +
            'buy at each exchange rate over a given period.'
    },
    supplyOfAud: {
        word: 'Supply of AUD',
        meaning: 'Supply of AUD is the quantity of Australian dollars that people are willing and able to ' +
            'sell at each exchange rate over a given period.'
    },
    shift: {
        word: 'Shift',
        meaning: 'A shift is a movement of a whole curve to a new position, caused by a change in a factor ' +
            'other than the price on the vertical axis.'
    },
    appreciationAndDepreciation: {
        word: 'Appreciation and depreciation',
        meaning: 'Appreciation is a rise in the value of a currency against another currency. Depreciation ' +
            'is a fall in its value.'
    },
    commodity: {
        word: 'Commodity',
        meaning: 'A commodity is a raw material or primary product that is traded in bulk, where one ' +
            'producer\'s output is much the same as another\'s.'
    },
    index: {
        word: 'Index',
        meaning: 'An index is a number that shows how a value has changed since a base period, which is set ' +
            'at 100. An index of 120 means the value is 20% higher than in the base period.'
    },
    basket: {
        word: 'Basket',
        meaning: 'A basket is a fixed set of goods and services whose total cost is tracked over time, so ' +
            'that a price index always compares the same things.'
    },
    termsOfTrade: {
        word: 'Terms of trade',
        meaning: 'The terms of trade are the ratio of a country\'s export prices to its import prices. They ' +
            'equal the export price index divided by the import price index, multiplied by 100.'
    },
    favourableMovement: {
        word: 'Favourable movement',
        meaning: 'A favourable movement in the terms of trade is a rise, because the same exports buy more ' +
            'imports. An unfavourable movement is a fall.'
    },
    exportRevenue: {
        word: 'Export revenue',
        meaning: 'Export revenue is the total amount a country earns from selling its exports. It equals ' +
            'the export price multiplied by the export volume.'
    },
    shortRun: {
        word: 'Short run',
        meaning: 'The short run is a period in which at least one input, such as a mine, is fixed, so firms ' +
            'can change their output only a little.'
    },
    longRun: {
        word: 'Long run',
        meaning: 'The long run is a period long enough for all inputs to change, so firms can build new ' +
            'capacity and change their output by much more.'
    }
};
