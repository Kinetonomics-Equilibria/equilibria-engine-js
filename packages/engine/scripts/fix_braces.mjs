import * as fs from 'fs';

const log = `Found 91 errors in 90 files.

Errors  Files
     1  src/ts/controller/listeners/clickListener.ts:34
     1  src/ts/controller/listeners/dragListener.ts:58
     1  src/ts/controller/listeners/listener.ts:43
     1  src/ts/KGAuthor/defObjects/arrowDef.ts:39
     1  src/ts/KGAuthor/defObjects/clipPath.ts:14
     1  src/ts/KGAuthor/defObjects/defObject.ts:19
     1  src/ts/KGAuthor/defObjects/graphObjectGenerator.ts:44
     1  src/ts/KGAuthor/defObjects/marker.ts:22
     1  src/ts/KGAuthor/econ/functional_forms/multivariate/ces.ts:119
     1  src/ts/KGAuthor/econ/functional_forms/multivariate/cobbDouglas.ts:80
     1  src/ts/KGAuthor/econ/functional_forms/multivariate/complements.ts:71
     1  src/ts/KGAuthor/econ/functional_forms/multivariate/concave.ts:43
     1  src/ts/KGAuthor/econ/functional_forms/multivariate/multivariate.ts:315
     1  src/ts/KGAuthor/econ/functional_forms/multivariate/quasilinear.ts:40
     1  src/ts/KGAuthor/econ/functional_forms/multivariate/substitutes.ts:39
     1  src/ts/KGAuthor/econ/layouts/edgeworth.ts:265
     1  src/ts/KGAuthor/econ/layouts/gameTree.ts:16
     1  src/ts/KGAuthor/econ/micro/consumer_theory/constraints/budgetLine.ts:247
     1  src/ts/KGAuthor/econ/micro/consumer_theory/optimization/demandCurve.ts:141
     1  src/ts/KGAuthor/econ/micro/consumer_theory/optimization/optimalBundle.ts:199
     1  src/ts/KGAuthor/econ/micro/consumer_theory/two_good_utility/bundle.ts:85
     1  src/ts/KGAuthor/econ/micro/consumer_theory/two_good_utility/indifferenceCurve.ts:120
     1  src/ts/KGAuthor/econ/micro/consumer_theory/two_good_utility/utilitySelector.ts:23
     1  src/ts/KGAuthor/econ/micro/equilibrium/constantElasticityCurve.ts:223
     1  src/ts/KGAuthor/econ/micro/equilibrium/constantElasticityEquilibrium.ts:67
     2  src/ts/KGAuthor/econ/micro/equilibrium/linearDemand.ts:171
     1  src/ts/KGAuthor/econ/micro/equilibrium/linearEquilibrium.ts:83
     1  src/ts/KGAuthor/econ/micro/equilibrium/linearSupply.ts:123
     1  src/ts/KGAuthor/econ/micro/equilibrium/ppf.ts:210
     1  src/ts/KGAuthor/econ/micro/exchange/edgeworth/contract_curve.ts:49
     1  src/ts/KGAuthor/econ/micro/exchange/edgeworth/exchange_equilibrium.ts:50
     1  src/ts/KGAuthor/econ/micro/exchange/edgeworth/pareto_lens.ts:33
     1  src/ts/KGAuthor/econ/micro/monopoly/linearMC.ts:21
     1  src/ts/KGAuthor/econ/micro/monopoly/linearMonopoly.ts:96
     1  src/ts/KGAuthor/econ/micro/producer_theory/oneInputProductionFunction.ts:129
     1  src/ts/KGAuthor/econ/schemas/bowlesHallidaySchema.ts:28
     1  src/ts/KGAuthor/econ/schemas/econSchema.ts:108
     1  src/ts/KGAuthor/econ/schemas/lowdownSchema.ts:25
     1  src/ts/KGAuthor/graphObjects/angle.ts:150
     1  src/ts/KGAuthor/graphObjects/area.ts:35
     1  src/ts/KGAuthor/graphObjects/arrow.ts:32
     1  src/ts/KGAuthor/graphObjects/axis.ts:61
     1  src/ts/KGAuthor/graphObjects/circle.ts:98
     1  src/ts/KGAuthor/graphObjects/contour.ts:75
     1  src/ts/KGAuthor/graphObjects/curve.ts:130
     1  src/ts/KGAuthor/graphObjects/dropline.ts:48
     1  src/ts/KGAuthor/graphObjects/graphObject.ts:64
     1  src/ts/KGAuthor/graphObjects/grid.ts:45
     1  src/ts/KGAuthor/graphObjects/line.ts:210
     1  src/ts/KGAuthor/graphObjects/point.ts:242
     1  src/ts/KGAuthor/graphObjects/rectangle.ts:70
     1  src/ts/KGAuthor/graphObjects/segment.ts:123
     1  src/ts/KGAuthor/layouts/fourGraphs.ts:71
     1  src/ts/KGAuthor/layouts/gameMatrix.ts:19
     1  src/ts/KGAuthor/layouts/html.ts:34
     1  src/ts/KGAuthor/layouts/layout.ts:53
     1  src/ts/KGAuthor/layouts/oneGraph.ts:188
     1  src/ts/KGAuthor/layouts/rectanglePlusTwoSquares.ts:87
     1  src/ts/KGAuthor/layouts/squarePlusTwoVerticalGraphs.ts:87
     1  src/ts/KGAuthor/layouts/threeHorizontalGraphs.ts:129
     1  src/ts/KGAuthor/layouts/twoHorizontalGraphs.ts:387
     1  src/ts/KGAuthor/layouts/twoVerticalGraphs.ts:119
     1  src/ts/KGAuthor/parsers/authoringObject.ts:68
     1  src/ts/KGAuthor/positionedObjects/divContainer.ts:21
     1  src/ts/KGAuthor/positionedObjects/ggbContainer.ts:17
     1  src/ts/KGAuthor/positionedObjects/graph.ts:97
     1  src/ts/KGAuthor/positionedObjects/positionedObject.ts:106
     1  src/ts/KGAuthor/positionedObjects/tree.ts:43
     1  src/ts/KGAuthor/schemas/schema.ts:56
     1  src/ts/math/mathFunction.ts:66
     1  src/ts/math/multivariateFunction.ts:126
     1  src/ts/math/parametricFunction.ts:88
     1  src/ts/math/univariateFunction.ts:160
     1  src/ts/model/model.ts:253
     1  src/ts/model/param.ts:92
     1  src/ts/model/restriction.ts:44
     1  src/ts/model/updateListener.ts:99
     1  src/ts/view/scale.ts:62
     1  src/ts/view/viewObjects/area.ts:120
     1  src/ts/view/viewObjects/axis.ts:105
     1  src/ts/view/viewObjects/circle.ts:74
     1  src/ts/view/viewObjects/contour.ts:127
     1  src/ts/view/viewObjects/curve.ts:113
     1  src/ts/view/viewObjects/ggbObject.ts:63
     1  src/ts/view/viewObjects/label.ts:156
     1  src/ts/view/viewObjects/marker.ts:43
     1  src/ts/view/viewObjects/point.ts:69
     1  src/ts/view/viewObjects/rectangle.ts:65
     1  src/ts/view/viewObjects/segment.ts:71
     1  src/ts/view/viewObjects/viewObject.ts:308`;

const lines = log.split('\\n');
for (const line of lines) {
    const match = line.includes('src/ts/') ? line.trim().split(' ').pop().split(':')[0] : null;
    if (match) {
        const file = match;
        try {
            fs.appendFileSync(file, '\\n}\\n');
            console.log("Appended to " + file);
        } catch (e) {
            console.error(e);
        }
    }
}
