import * as math from "mathjs";
import * as d3 from "d3";
import * as katex from "katex";
const AllClasses = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get Area() {
    return Area;
  },
  get Axis() {
    return Axis;
  },
  get Circle() {
    return Circle;
  },
  get Contour() {
    return Contour;
  },
  get ContourMap() {
    return ContourMap;
  },
  get Curve() {
    return Curve;
  },
  get Ellipse() {
    return Ellipse;
  },
  get GeoGebraObject() {
    return GeoGebraObject;
  },
  get Label() {
    return Label;
  },
  get Marker() {
    return Marker;
  },
  get Point() {
    return Point;
  },
  get Rectangle() {
    return Rectangle;
  },
  get Segment() {
    return Segment;
  },
  get ViewObject() {
    return ViewObject;
  },
  get ViewObjectClasses() {
    return ViewObjectClasses;
  }
}, Symbol.toStringTag, { value: "Module" }));
function setDefaults(i, e) {
  i || (i = {});
  for (let t in e)
    i.hasOwnProperty(t) || (i[t] = e[t]);
  return i;
}
function setProperties(i, e, t) {
  return i[e] || (i[e] = []), t.forEach(function(r) {
    i[e].push(r);
  }), i;
}
class Param {
  constructor(e) {
    function t(r) {
      let n = ("" + r).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
      return n ? Math.max(
        0,
        // Number of digits right of decimal point.
        (n[1] ? n[1].length : 0) - (n[2] ? +n[2] : 0)
      ) : 0;
    }
    setDefaults(e, { min: 0, max: 10, round: 1, label: "" }), this.name = e.name, this.label = e.label, typeof e.value == "boolean" ? (this.value = +e.value, this.min = 0, this.max = 100, this.round = 1) : (this.value = parseFloat(e.value), this.min = parseFloat(e.min), this.max = parseFloat(e.max), this.round = parseFloat(e.round), this.precision = parseInt(e.precision) || t(this.round.toString()));
  }
  // Receives an instruction to update the parameter to a new value
  // Updates to the closest rounded value to the desired newValue within accepted range
  update(e) {
    let t = this;
    return e < t.min ? t.value = t.min : e > t.max ? t.value = t.max : t.value = Math.round(e / t.round) * t.round, t.value;
  }
  // Displays current value of the parameter to desired precision
  // If no precision is given, uses the implied precision given by the rounding parameter
  formatted(e) {
    return e = e || this.precision, d3.format(`.${e}f`)(this.value);
  }
}
class Restriction {
  constructor(e) {
    this.expression = e.expression, this.type = e.type, this.min = e.min, this.max = e.max;
  }
  valid(e) {
    const t = this;
    return e.evaluate(t.expression), e.evaluate(t.min), e.evaluate(t.max), !0;
  }
}
class Model {
  constructor(i) {
    let e = this;
    e.params = i.params.map(function(t) {
      return new Param(t);
    }), e.initialParams = i.params, e.calcs = i.calcs, e.colors = i.colors, e.idioms = i.idioms, e.clearColor = i.clearColor, e.restrictions = (i.restrictions || []).map(function(t) {
      return new Restriction(t);
    }), e.updateListeners = [], e.currentParamValues = e.evalParams(), e.evalCalcs(), e.currentColors = e.evalObject(e.colors), e.currentIdioms = e.evalObject(e.idioms);
  }
  addUpdateListener(i) {
    return this.updateListeners.push(i), this;
  }
  resetParams() {
    console.log("resetting model parameters");
    const i = this;
    console.log("initial parameters are: ", i.initialParams), i.initialParams.forEach(function(e) {
      console.log("setting ", e.name, " to ", e.value), i.updateParam(e.name, e.value);
    }), i.update(!0);
  }
  evalParams() {
    let i = {};
    return this.params.forEach(function(e) {
      i[e.name] = e.value;
    }), i;
  }
  // evaluates the calcs object; then re-evaluates to capture calcs that depend on other calcs
  evalCalcs() {
    const i = this;
    i.currentCalcValues = {}, i.currentCalcValues = i.evalObject(i.calcs, !0);
    for (let e = 0; e < 5; e++)
      for (const t in i.currentCalcValues)
        typeof i.calcs[t] == "object" ? i.currentCalcValues[t] = i.evalObject(i.calcs[t], !0) : isNaN(i.currentCalcValues[t]) && typeof i.calcs[t] == "string" && (i.currentCalcValues[t] = i.evaluate(i.calcs[t], !0));
    return i.currentCalcValues;
  }
  evalObject(i, e) {
    const t = this;
    let r = {};
    for (const n in i) {
      const a = i[n];
      typeof a == "number" ? r[n] = a : typeof a == "string" ? r[n] = t.evaluate(a, e) : r[n] = t.evalObject(a, e);
    }
    return r;
  }
  // the model serves as a model, and can evaluate expressions within the context of that model
  // if onlyJSMath is selected, it will only try to evaluate using JSMath; this is especially important for calculations.
  evaluate(name, onlyJSMath) {
    const model = this;
    if (!isNaN(parseFloat(name)))
      return parseFloat(name);
    const params = model.currentParamValues, calcs = model.currentCalcValues, colors = model.currentColors, idioms = model.currentIdioms;
    try {
      return math.compile(name).evaluate({
        params,
        calcs,
        idioms,
        colors,
        d3: { schemeCategory10: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"] }
      });
    } catch (err) {
      if (onlyJSMath)
        return name;
      try {
        let result = eval(name);
        return result;
      } catch (i) {
        return name;
      }
    }
  }
  // This is a utility for exporting currently used colors for use in LaTex documents.
  latexColors() {
    let i = `%% econ colors %%
`, e = this;
    for (const t in e.colors)
      i += `\\definecolor{${t}}{HTML}{${e.evaluate(e.colors[t]).replace("#", "")}}
`;
    console.log(i);
  }
  getParam(i) {
    const e = this.params;
    for (let t = 0; t < e.length; t++)
      if (e[t].name == i)
        return e[t];
  }
  // method exposed to viewObjects to allow them to try to change a parameter
  updateParam(i, e) {
    let t = this, r = t.getParam(i);
    const n = r.value;
    if (r.update(e), n != r.value) {
      let a = !0;
      t.restrictions.forEach(function(l) {
        l.valid(t) || (a = !1);
      }), a ? t.update(!1) : r.update(n), t.update(!1);
    }
  }
  // method exposed to viewObjects to allow them to toggle a binary param
  toggleParam(i) {
    const e = this.getParam(i).value;
    this.updateParam(i, !e);
  }
  // method exposed to viewObjects to allow them to cycle a discrete param
  // increments by 1 if below max value, otherwise sets to zero
  cycleParam(i) {
    const e = this.getParam(i);
    this.updateParam(i, e.value < e.max ? e.value++ : 0);
  }
  update(i) {
    const e = this;
    e.currentParamValues = e.evalParams(), e.evalCalcs(), console.log("calcs", e.currentCalcValues), e.currentColors = e.evalObject(e.colors), e.updateListeners.forEach(function(t) {
      t.update(i);
    });
  }
}
function randomString(i) {
  let e = "KGID_";
  const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let r = 0; r < i; r++)
    e += t.charAt(Math.floor(Math.random() * t.length));
  return e;
}
class UpdateListener {
  constructor(e) {
    e.constants = (e.constants || []).concat(["model", "updatables", "name"]);
    let t = this;
    t.def = e, e.constants.forEach(function(r) {
      t[r] = isNaN(parseFloat(e[r])) ? e[r] : +e[r];
    }), t.id = randomString(10), t.model.addUpdateListener(this);
  }
  updateArray(e) {
    let t = this;
    return e.map(function(r) {
      if (Array.isArray(r))
        return t.updateArray(r);
      {
        const n = r;
        let a = t.model.evaluate(r);
        return n != a && (t.hasChanged = !0), a;
      }
    });
  }
  updateDef(e) {
    let t = this;
    if (t.def.hasOwnProperty(e)) {
      const r = t.def[e], n = t[e];
      if (Array.isArray(r))
        t[e] = t.updateArray(r);
      else {
        let a = t.model.evaluate(r);
        n != a && (t.hasChanged = !0, t[e] = a);
      }
    }
    return t;
  }
  update(e) {
    let t = this;
    return t.hasChanged = !!e, t.hasOwnProperty("updatables") && t.updatables != null && t.updatables.forEach(function(r) {
      t.updateDef(r);
    }), t;
  }
}
class Scale extends UpdateListener {
  constructor(e) {
    setDefaults(e, {
      log: !1
    }), e.constants = ["rangeMin", "rangeMax", "axis", "name"], e.updatables = ["domainMin", "domainMax", "intercept"], super(e), this.scale = e.log ? d3.scaleLog() : d3.scaleLinear(), this.update(!0);
  }
  update(e) {
    let t = super.update(e);
    if (t.extent != null) {
      const r = t.rangeMin * t.extent, n = t.rangeMax * t.extent;
      t.scale.domain([t.domainMin, t.domainMax]), t.scale.range([r, n]);
    }
    return t;
  }
  updateDimensions(e, t) {
    let r = this;
    return r.extent = r.axis == "x" ? e : t, r.update(!0);
  }
}
class InteractionHandler extends UpdateListener {
  constructor(e) {
    e.dragListeners = e.dragListeners || [], e.clickListeners = e.clickListeners || [], e.constants = (e.constants || []).concat(["viewObject", "dragListeners", "clickListeners"]), super(e), this.dragListeners = e.dragListeners, this.clickListeners = e.clickListeners, this.viewObject = e.viewObject, this.update(!0), this.scope = { params: {}, calcs: {}, colors: {}, drag: {} };
  }
  update(e) {
    let t = super.update(e);
    if (t.hasChanged && t.hasOwnProperty("dragListeners") && t.element != null) {
      let r = !1, n = !1;
      t.dragListeners.forEach(function(a) {
        a.update(e), a.directions == "x" ? r = !0 : a.directions == "y" ? n = !0 : a.directions == "xy" && (r = !0, n = !0);
      }), t.element.style("pointer-events", r || n ? "all" : "none"), t.element.style("cursor", r && n ? "move" : r ? "ew-resize" : "ns-resize");
    }
    return t.hasOwnProperty("clickListeners") && t.element != null && t.clickListeners.length > 0 && (t.element.style("pointer-events", "all"), t.element.style("cursor", "pointer")), t;
  }
  addTrigger(e) {
    let t = this;
    t.element = e, t.clickListeners.length > 0 && e.on("click", function(r, n) {
      t.clickListeners.forEach(function(a) {
        a.click();
      });
    }), t.dragListeners.length > 0 && e.call(
      d3.drag().on("start", function(r, n) {
        t.scope.params = t.model.currentParamValues, t.scope.calcs = t.model.currentCalcValues, t.scope.colors = t.model.currentColors, t.scope.drag.x0 = t.viewObject.xScale.scale.invert(r.x), t.scope.drag.y0 = t.viewObject.yScale.scale.invert(r.y);
      }).on("drag", function(r, n) {
        let a = t.scope.drag;
        a.x = t.viewObject.xScale.scale.invert(r.x), a.y = t.viewObject.yScale.scale.invert(r.y), a.dx = a.x - a.x0, a.dy = a.y - a.y0, t.dragListeners.forEach(function(l) {
          l.onChange(t.scope);
        });
      }).on("end", function(r, n) {
      })
    ), t.update(!0);
  }
}
class Listener extends UpdateListener {
  constructor(e) {
    setProperties(e, "updatables", ["expression"]), setProperties(e, "constants", ["param"]), super(e);
  }
  onChange(e) {
    const t = this;
    let n = math.compile(t.expression).evaluate(e);
    t.model.updateParam(t.param, n);
  }
}
class ClickListener extends Listener {
  constructor(e) {
    setDefaults(e, { transitions: [1, 0] }), super(e), this.transitions = e.transitions;
  }
  click() {
    const e = this;
    console.log("clicking", e);
    const t = e.model.currentParamValues[e.param], r = e.transitions[t];
    e.model.updateParam(e.param, r);
  }
}
class DragListener extends Listener {
  constructor(e) {
    e.hasOwnProperty("vertical") && (e.directions = "y", e.param = e.vertical, e.expression = `params.${e.vertical} + drag.dy`), e.hasOwnProperty("horizontal") && (e.directions = "x", e.param = e.horizontal, e.expression = `params.${e.horizontal} + drag.dx`), setDefaults(e, {
      directions: "xy"
    }), setProperties(e, "updatables", ["draggable", "directions"]), super(e);
  }
  update(e) {
    let t = super.update(e);
    return t.def.hasOwnProperty("draggable") || (t.draggable = t.directions.length > 0), t;
  }
}
class ViewObject extends UpdateListener {
  constructor(e) {
    setDefaults(e, {
      alwaysUpdate: !1,
      interactive: !0,
      fill: "colors.blue",
      fillOpacity: 0.2,
      stroke: "colors.blue",
      strokeWidth: 1,
      stokeOpacity: 1,
      show: !0,
      inDef: !1,
      lineStyle: "solid",
      checkOnGraph: !0
    }), setProperties(e, "updatables", ["xScaleMin", "xScaleMax", "yScaleMin", "yScaleMax", "fill", "stroke", "strokeWidth", "opacity", "strokeOpacity", "show", "lineStyle", "srTitle", "srDesc"]), setProperties(e, "constants", ["xScale", "yScale", "clipPath", "clipPath2", "interactive", "alwaysUpdate", "inDef", "checkOnGraph", "tabbable"]), setProperties(e, "colorAttributes", ["stroke", "fill", "color"]), e.inDef && (e.show = !0), super(e);
    let t = this;
    if (t.hasOwnProperty("xScale") && t.xScale && (e.xScaleMin = t.xScale.def.domainMin, e.xScaleMax = t.xScale.def.domainMax, e.yScaleMin = t.yScale.def.domainMin, e.yScaleMax = t.yScale.def.domainMax), e.colorAttributes.forEach(function(r) {
      let n = e[r];
      t.model.colors.hasOwnProperty(n) && (e[r] = t.model.colors[n]);
    }), e.interactive) {
      e.drag = e.drag || [];
      const r = e.drag.map(function(a) {
        return a.model = t.model, new DragListener(a);
      });
      e.click = e.click || [];
      const n = e.click.map(function(a) {
        return a.model = t.model, new ClickListener(a);
      });
      t.interactionHandler = new InteractionHandler({
        viewObject: t,
        model: t.model,
        dragListeners: r,
        clickListeners: n
      });
    }
    e.hasOwnProperty("layer") && t.draw(e.layer).update(!0).init();
  }
  init() {
    return this;
  }
  addScreenReaderDescriptions(e) {
    const t = this;
    return t.rootElement, t.def.hasOwnProperty("srTitle") && t.def.srTitle != null && (t.screenReaderTitle = e.selectAll("title.screenReaderTitle-" + t.id).data([1]).join("title").attr("class", "screenReaderTitle-" + t.id)), t.def.hasOwnProperty("srDesc") && t.def.srDesc != null && (t.screenReaderDescription = e.selectAll("desc.screenReaderDescription-" + t.id).data([1]).join("desc").attr("class", "screenReaderDescription-" + t.id)), t;
  }
  updateScreenReaderDescriptions() {
    const e = this;
    return e.hasOwnProperty("srTitle") && e.srTitle != null && e.screenReaderTitle.text(e.srTitle), e.hasOwnProperty("srDesc") && e.srDesc != null && e.screenReaderDescription.text(e.srDesc), e;
  }
  addClipPathAndArrows() {
    const e = this;
    return e.hasOwnProperty("clipPath") && e.clipPath != null && e.rootElement.attr("clip-path", `url(#${e.clipPath})`), e.hasOwnProperty("clipPath2") && e.clipPath2 != null && e.rootElement2.attr("clip-path", `url(#${e.clipPath2})`), e.hasOwnProperty("endArrow") && e.endArrow != null && e.markedElement.attr("marker-end", `url(#${e.endArrow})`), e.hasOwnProperty("startArrow") && e.endArrow != null && e.markedElement.attr("marker-start", `url(#${e.startArrow})`), e;
  }
  addInteraction() {
    const e = this;
    return e.interactionHandler.addTrigger(e.rootElement), e;
  }
  draw(e, t) {
    return this;
  }
  redraw() {
    return this;
  }
  drawStroke(e) {
    const t = this;
    e.attr("stroke", t.stroke), e.attr("stroke-width", t.strokeWidth), e.style("stroke-opacity", t.strokeOpacity), t.lineStyle == "dashed" ? e.style("stroke-dashArray", "10,10") : t.lineStyle == "dotted" ? e.style("stroke-dashArray", "1,2") : e.style("stroke-dashArray", "10,0");
  }
  drawFill(e) {
    const t = this;
    e.style("fill", t.fill), e.style("fill-opacity", t.opacity);
  }
  displayElement(e) {
    let t = this;
    t.hasOwnProperty("rootElement") && t.rootElement.style("display", e ? null : "none");
  }
  onGraph() {
    const e = this;
    if (e.checkOnGraph) {
      let t = function(r, n, a) {
        const l = Math.min(n, a), o = Math.max(n, a);
        return r < l || r > o;
      };
      if (e.hasOwnProperty("x") && t(e.x, e.xScale.domainMin, e.xScale.domainMax) || e.hasOwnProperty("y") && t(e.y, e.yScale.domainMin, e.yScale.domainMax))
        return !1;
    }
    return !0;
  }
  update(e) {
    let t = super.update(e);
    return t.show && t.onGraph() || t.inDef ? (t.displayElement(!0), t.hasChanged && t.redraw()) : t.displayElement(!1), t;
  }
}
class Marker extends ViewObject {
  constructor(e) {
    setProperties(e, "constants", ["maskPath", "arrowPath"]), setProperties(e, "updatables", ["color"]), super(e);
  }
  draw(e) {
    let t = this;
    return e.append("svg:path").attr("d", t.maskPath).attr("fill", "white"), t.arrowElement = e.selectAll("path.arrowElement-" + t.id).data([1]).join("svg:path").attr("class", "arrowElement-" + t.id).attr("d", t.arrowPath), t;
  }
  redraw() {
    let e = this;
    return e.arrowElement.attr("fill", e.color), e;
  }
}
const KGAuthorClasses = {};
function parse(i, e) {
  return i.forEach(function(t) {
    Object.prototype.hasOwnProperty.call(KGAuthorClasses, t.type) && (e = new KGAuthorClasses[t.type](t.def).parse(e));
  }), e;
}
function replaceVariable(i, e, t) {
  return `(${i.split(e).join(t)})`;
}
class Segment extends ViewObject {
  constructor(e) {
    setDefaults(e, {
      xScale2: e.xScale,
      yScale2: e.yScale,
      strokeWidth: 2
    }), setProperties(e, "constants", ["xScale2", "yScale2", "startArrow", "endArrow"]), setProperties(e, "updatables", ["x1", "y1", "x2", "y2"]), super(e);
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.rootElement = e.selectAll("g.rootElement-" + t.id).data([1]).join("g").attr("class", "rootElement-" + t.id), t.dragLine = t.rootElement.selectAll("line.dragLine-" + t.id).data([1]).join("line").attr("class", "dragLine-" + t.id).attr("stroke-width", "20px").style("stroke-opacity", 0), t.line = t.rootElement.selectAll("line.line-" + t.id).data([1]).join("line").attr("class", "line-" + t.id), t.markedElement = t.line, t.addClipPathAndArrows().addInteraction();
  }
  // update properties
  redraw() {
    let e = this;
    const t = e.xScale.scale(e.x1), r = e.xScale.scale(e.x2), n = e.yScale2.scale(e.y1), a = e.yScale2.scale(e.y2);
    return e.dragLine.attr("x1", t).attr("y1", n).attr("x2", r).attr("y2", a), e.line.attr("x1", t).attr("y1", n).attr("x2", r).attr("y2", a), e.drawStroke(e.line), e;
  }
}
class Rectangle extends ViewObject {
  constructor(e) {
    setDefaults(e, {
      opacity: 0.2,
      stroke: "none"
    }), setProperties(e, "updatables", ["x1", "x2", "y1", "y2"]), super(e);
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.inDef ? t.rootElement = e : t.rootElement = e.selectAll("g.rootElement-" + t.id).data([1]).join("g").attr("class", "rootElement-" + t.id), t.rootElement2 = t.rootElement.selectAll("rect.rootElement2-" + t.id).data([1]).join("rect").attr("class", "rootElement2-" + t.id), t.addClipPathAndArrows().addInteraction();
  }
  // update properties
  redraw() {
    let e = this;
    const t = e.xScale.scale(e.x1), r = e.yScale.scale(e.y1), n = e.xScale.scale(e.x2), a = e.yScale.scale(e.y2);
    return e.rootElement2.attr("x", Math.min(t, n)).attr("y", Math.min(r, a)).attr("width", Math.abs(n - t)).attr("height", Math.abs(a - r)).style("fill", e.fill).style("fill-opacity", e.opacity).style("stroke", e.stroke).style("stroke-width", `${e.strokeWidth}px`).style("stroke-opacity", e.strokeOpacity), e;
  }
}
class Point extends ViewObject {
  constructor(e) {
    e.hasOwnProperty("label") && !e.hasOwnProperty("srTitle") && (e.srTitle = `Point ${e.label.text}`), setDefaults(e, {
      fill: "colors.blue",
      opacity: 1,
      stroke: "white",
      strokeWidth: 1,
      strokeOpacity: 1,
      r: 6
    }), setProperties(e, "updatables", ["x", "y", "r"]), super(e);
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.rootElement = e.selectAll("g.rootElement-" + t.id).data([1]).join("g").attr("class", "rootElement-" + t.id), t.dragCircle = t.rootElement.selectAll("circle.dragCircle-" + t.id).data([1]).join("circle").attr("class", "dragCircle-" + t.id).style("fill", "yellow").style("fill-opacity", 0).attr("r", 20), t.circle = t.rootElement.selectAll("circle.circle-" + t.id).data([1]).join("circle").attr("class", "circle-" + t.id), t.addScreenReaderDescriptions(t.circle), t.addInteraction();
  }
  // update properties
  redraw() {
    let e = this;
    return e.updateScreenReaderDescriptions(), e.rootElement.attr("transform", `translate(${e.xScale.scale(e.x)} ${e.yScale.scale(e.y)})`), e.circle.attr("r", e.r), e.circle.style("fill", e.fill), e.circle.style("fill-opacity", e.opacity), e.circle.style("stroke", e.stroke), e.circle.style("stroke-width", `${e.strokeWidth}px`), e.circle.style("stroke-opacity", e.strokeOpacity), e;
  }
}
class Label extends ViewObject {
  constructor(e) {
    const t = e.xScale.rangeMin > e.xScale.rangeMax, r = e.yScale.rangeMin < e.yScale.rangeMax;
    let n = t ? 1 : -1, a = r ? 12 : -12;
    e.x == "AXIS" && (e.x = e.yScale.intercept, e.align = t ? "left" : "right", e.xPixelOffset = n), e.x == "OPPAXIS" && (e.x = e.xScale.domainMax, e.align = t ? "right" : "left", e.xPixelOffset = -n), e.y == "AXIS" && (e.y = e.yScale.intercept, e.yPixelOffset = a), e.y == "OPPAXIS" && (e.y = e.yScale.domainMax, e.yPixelOffset = -a), setDefaults(e, {
      xPixelOffset: 0,
      yPixelOffset: 0,
      fontSize: 12,
      align: "center",
      valign: "middle",
      rotate: 0,
      color: "black"
    }), setProperties(e, "constants", ["xPixelOffset", "yPixelOffset", "fontSize", "plainText"]), setProperties(e, "updatables", ["x", "y", "text", "align", "valign", "rotate", "color", "bgcolor"]), super(e), this.bgcolor = e.model.clearColor;
  }
  // create div for text
  draw(e) {
    let t = this;
    return t.rootElement = e.selectAll("div.rootElement-" + t.id).data([1]).join("div").attr("class", "rootElement-" + t.id).attr("class", "draggable").style("position", "absolute").style("font-size", t.fontSize + "pt").style("text-align", "center").style("padding-left", "3px").style("padding-right", "3px"), t.addInteraction();
  }
  // update properties
  redraw() {
    let e = this;
    e.rootElement.style("color", e.color).style("background-color", e.bgcolor);
    const t = e.xScale.scale(e.x) + +e.xPixelOffset, r = e.yScale.scale(e.y) - +e.yPixelOffset;
    if (e.text != null)
      if (e.plainText)
        e.rootElement.text(e.text);
      else
        try {
          katex.render(e.text.toString(), e.rootElement.node());
        } catch {
          console.log("Error rendering KaTeX: ", e.text);
        }
    e.rootElement.style("left", t + "px"), e.rootElement.style("top", r + "px");
    const n = e.rootElement.node().clientWidth, a = e.rootElement.node().clientHeight;
    let l = n * 0.5;
    e.align == "left" ? l = 0 : e.align == "right" && (l = n), e.rootElement.style("left", t - l + "px");
    let o = a * 0.5;
    e.valign == "top" ? o = 0 : e.valign == "bottom" && (o = a), e.rootElement.style("top", r - o + "px");
    const s = `rotate(-${e.rotate}deg)`;
    return e.rootElement.style("-webkit-transform", s).style("transform", s), e;
  }
}
class GeoGebraObject extends ViewObject {
  constructor(e) {
    setDefaults(e, {
      color: "#999999",
      lineThickness: 1,
      lineStyle: 0
    }), setProperties(e, "constants", ["command", "color", "lineThickness", "lineStyle"]), super(e);
  }
  establishGGB(e) {
    function t(l) {
      const o = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(l);
      return o ? {
        r: parseInt(o[1], 16),
        g: parseInt(o[2], 16),
        b: parseInt(o[3], 16)
      } : null;
    }
    const r = this, n = r.name + " = " + r.command;
    e.evalCommand(n), r.hasOwnProperty("opacity") && e.setFilling(r.opacity);
    const a = t(r.color);
    e.setColor(r.name, a.r, a.g, a.b), e.evalCommand("SetLineThickness[" + r.name + ", " + r.lineThickness + "]"), e.setLineStyle(r.name, r.lineStyle);
  }
}
class MathFunction extends UpdateListener {
  constructor(e) {
    setDefaults(e, {
      samplePoints: 50
    }), setProperties(e, "constants", ["samplePoints"]), setProperties(e, "updatables", ["min", "max"]), super(e);
  }
  updateFunctionString(e, t) {
    function r(l, o) {
      o = o.replace(/\[(\w+)\]/g, ".$1"), o = o.replace(/^\./, "");
      let s = o.split(".");
      for (let c = 0, p = s.length; c < p; ++c) {
        let h = s[c];
        if (h in l)
          l = l[h];
        else
          return;
      }
      return l;
    }
    if (e = e.toString(), e.indexOf("null") > -1 || e.indexOf("Infinity") > -1)
      return null;
    const n = /((calcs|params).[.\w]*)+/g, a = e.match(n);
    return a && a.forEach(function(l) {
      e = replaceVariable(e, l, r(t, l));
    }), e;
  }
}
class ParametricFunction extends MathFunction {
  constructor(e) {
    setDefaults(e, {
      min: 0,
      max: 10
    }), super(e), this.xFunctionStringDef = e.xFunction, this.yFunctionStringDef = e.yFunction;
  }
  evaluate(e) {
    let t = this;
    return t.scope = t.scope || { params: t.model.currentParamValues }, t.scope.t = e, { x: t.xCompiledFunction.evaluate(t.scope), y: t.yCompiledFunction.evaluate(t.scope) };
  }
  generateData(e, t) {
    let r = this, n = [];
    r.min != null && (e = r.min), r.max != null && (t = r.max);
    for (let a = 0; a < r.samplePoints + 1; a++) {
      let l = a / r.samplePoints, o = l * e + (1 - l) * t, s = r.evaluate(o);
      !isNaN(s.x) && s.x != 1 / 0 && s.x != -1 / 0 && !isNaN(s.y) && s.y != 1 / 0 && s.y != -1 / 0 && n.push(s);
    }
    return this.data = n, n;
  }
  update(e) {
    let t = super.update(e);
    return t.scope = {
      params: t.model.currentParamValues,
      calcs: t.model.currentCalcValues,
      colors: t.model.currentColors
    }, t.xFunctionString != t.updateFunctionString(t.xFunctionStringDef, t.scope) && (t.hasChanged = !0, t.xFunctionString = t.updateFunctionString(t.xFunctionStringDef, t.scope), t.xCompiledFunction = math.compile(t.xFunctionString)), t.yFunctionString != t.updateFunctionString(t.yFunctionStringDef, t.scope) && (t.hasChanged = !0, t.yFunctionString = t.updateFunctionString(t.yFunctionStringDef, t.scope), t.yCompiledFunction = math.compile(t.yFunctionString)), t;
  }
}
class UnivariateFunction extends MathFunction {
  constructor(e) {
    setDefaults(e, {
      ind: "x"
    }), setProperties(e, "constants", ["fn", "yFn"]), setProperties(e, "updatables", ["ind", "min", "max"]), super(e), this.fnStringDef = e.fn, this.fnZStringDef = e.fnZ, this.yFnStringDef = e.yFn, this.yFnZStringDef = e.yFnZ;
  }
  evaluate(e, t) {
    let r = this;
    if (t) {
      if (r.hasOwnProperty("yzCompiledFunction") && r.ind == "y")
        return r.yzCompiledFunction.evaluate({ y: e });
      if (r.hasOwnProperty("zCompiledFunction") && r.ind == "y")
        return r.zCompiledFunction.evaluate({ y: e });
      if (r.hasOwnProperty("zCompiledFunction"))
        return r.zCompiledFunction.evaluate({ x: e });
    } else {
      if (r.hasOwnProperty("yCompiledFunction") && r.ind == "y")
        return r.yCompiledFunction.evaluate({ y: e });
      if (r.hasOwnProperty("compiledFunction") && r.ind == "y")
        return r.compiledFunction.evaluate({ y: e });
      if (r.hasOwnProperty("compiledFunction"))
        return r.compiledFunction.evaluate({ x: e });
    }
  }
  generateData(e, t) {
    let r = this, n = [];
    r.min != null && (e = r.min), r.max != null && (t = r.max);
    for (let a = 0; a < r.samplePoints + 1; a++) {
      let l = a / r.samplePoints, o = l * e + (1 - l) * t, s = r.evaluate(o);
      !isNaN(s) && s != 1 / 0 && s != -1 / 0 && n.push(r.ind == "x" ? { x: o, y: s } : { x: s, y: o });
    }
    return this.data = n, n;
  }
  update(e) {
    let t = super.update(e);
    return t.scope = {
      params: t.model.currentParamValues,
      calcs: t.model.currentCalcValues,
      colors: t.model.currentColors
    }, t.fnString != t.updateFunctionString(t.fnStringDef, t.scope) && (t.hasChanged = !0, t.fnString = t.updateFunctionString(t.fnStringDef, t.scope), t.compiledFunction = math.compile(t.fnString)), t.def.hasOwnProperty("yFn") && t.yFnString != t.updateFunctionString(t.yFnStringDef, t.scope) && (t.hasChanged = !0, t.yFnString = t.updateFunctionString(t.yFnStringDef, t.scope), t.yCompiledFunction = math.compile(t.yFnString)), t.def.hasOwnProperty("fnZ") && t.fnZString != t.updateFunctionString(t.fnZStringDef, t.scope) && (t.hasChanged = !0, t.fnZString = t.updateFunctionString(t.fnZStringDef, t.scope), t.zCompiledFunction = math.compile(t.fnZString)), t.def.hasOwnProperty("yFnZ") && t.yFnZString != t.updateFunctionString(t.yFnZStringDef, t.scope) && (t.hasChanged = !0, t.yFnZString = t.updateFunctionString(t.yFnZStringDef, t.scope), t.yzCompiledFunction = math.compile(t.yFnZString)), t;
  }
}
class Curve extends ViewObject {
  constructor(e) {
    let t, r;
    setDefaults(e, {
      interpolation: "curveBasis",
      strokeWidth: 2
    }), setProperties(e, "constants", ["interpolation"]), e.hasOwnProperty("univariateFunction") ? (e.univariateFunction.model = e.model, t = new UnivariateFunction(e.univariateFunction), setProperties(e, "updatables", [])) : e.hasOwnProperty("parametricFunction") && (e.parametricFunction.model = e.model, r = new ParametricFunction(e.parametricFunction), setProperties(e, "updatables", [])), super(e);
    let n = this;
    e.hasOwnProperty("univariateFunction") ? n.univariateFunction = t : e.hasOwnProperty("parametricFunction") && (e.parametricFunction.model = e.model, n.parametricFunction = r);
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.dataLine = d3.line().curve(d3[t.interpolation]).x(function(r) {
      return t.xScale.scale(r.x);
    }).y(function(r) {
      return t.yScale.scale(r.y);
    }), t.rootElement = e.selectAll("g.rootElement-" + t.id).data([1]).join("g").attr("class", "rootElement-" + t.id), t.dragPath = t.rootElement.selectAll("path.dragPath-" + t.id).data([1]).join("path").attr("class", "dragPath-" + t.id).attr("stroke-width", "20px").style("stroke-opacity", 0).style("fill", "none"), t.path = t.rootElement.selectAll("path.path-" + t.id).data([1]).join("path").attr("class", "path-" + t.id).style("fill", "none"), t.addScreenReaderDescriptions(t.path), t.path.on("focus", function() {
      t.dragPath.style("fill", "yellow");
    }), t.path.on("blur", function() {
      t.dragPath.style("fill", "none");
    }), t.addClipPathAndArrows().addInteraction();
  }
  // update properties
  redraw() {
    let e = this;
    if (e.hasOwnProperty("univariateFunction")) {
      const t = e.univariateFunction, r = t.ind == "y" ? e.yScale : e.xScale;
      t.generateData(r.domainMin, r.domainMax), e.dragPath.data([t.data]).attr("d", e.dataLine), e.path.data([t.data]).attr("d", e.dataLine);
    }
    if (e.hasOwnProperty("parametricFunction")) {
      const t = e.parametricFunction;
      t.generateData(), e.dragPath.data([t.data]).attr("d", e.dataLine), e.path.data([t.data]).attr("d", e.dataLine);
    }
    return e.drawStroke(e.path), e;
  }
  // update self and functions
  update(e) {
    let t = super.update(e);
    return t.hasChanged || (t.hasOwnProperty("univariateFunction") && t.univariateFunction.hasChanged && t.redraw(), t.hasOwnProperty("parametricFunction") && t.parametricFunction.hasChanged && t.redraw()), t;
  }
}
class MultivariateFunction extends MathFunction {
  constructor(e) {
    e.samplePoints = 100, setProperties(e, "constants", ["fn"]), super(e), this.fnStringDef = e.fn, this.domainConditionStringDef = e.domainCondition;
  }
  inDomain(e, t, r) {
    let n = this;
    return n.hasOwnProperty("compiledDomainCondition") ? n.compiledDomainCondition.evaluate({ x: e, y: t, z: r }) : !0;
  }
  evaluate(e, t) {
    let r = this;
    if (r.hasOwnProperty("compiledFunction")) {
      const n = r.compiledFunction.evaluate({ x: e, y: t });
      if (r.inDomain(e, t, n))
        return n;
    }
  }
  contour(e, t, r, n) {
    const a = this;
    n = setDefaults(n || {}, {
      xMin: t.domainMin,
      xMax: t.domainMax,
      yMin: r.domainMin,
      yMax: r.domainMax
    });
    let l = 100, o = 100, s = new Array(l * o);
    for (let y = 0.5, d = 0; y < o; ++y)
      for (let m = 0.5; m < l; ++m, ++d) {
        let g = n.xMin + m * (n.xMax - n.xMin) / l, u = n.yMin + y * (n.yMax - n.yMin) / o;
        s[d] = a.evaluate(g, u);
      }
    let c = ({ type: y, value: d, coordinates: m }) => ({
      type: y,
      value: d,
      coordinates: m.map((g) => g.map((u) => u.map(([x, v]) => [t.scale(n.xMin + x * (n.xMax - n.xMin) / 100), r.scale(n.yMin + v * (n.yMax - n.yMin) / 100)])))
    });
    const p = d3.geoPath(), h = d3.contours().size([l, o]).contour(s, e);
    return p(c(h));
  }
  update(e) {
    let t = super.update(e);
    t.scope = {
      params: t.model.currentParamValues,
      calcs: t.model.currentCalcValues,
      colors: t.model.currentColors
    };
    const r = t.fnString, n = t.domainConditionString;
    return r != t.updateFunctionString(t.fnStringDef, t.scope) && (t.hasChanged = !0, t.fnString = t.updateFunctionString(t.fnStringDef, t.scope), t.compiledFunction = math.compile(t.fnString)), t.domainConditionStringDef != null && n != t.updateFunctionString(t.domainConditionStringDef, t.scope) && (t.hasChanged = !0, t.domainConditionString = t.updateFunctionString(t.domainConditionStringDef, t.scope), t.compiledDomainCondition = math.compile(t.domainConditionString)), t;
  }
}
class Contour extends ViewObject {
  constructor(e) {
    setDefaults(e, {
      opacity: 0.2,
      stroke: "grey",
      fillAbove: "none",
      fillBelow: "none",
      strokeOpacity: 1
    }), setProperties(e, "colorAttributes", ["fillAbove", "fillBelow"]), setProperties(e, "updatables", ["level", "fillBelow", "fillAbove", "xMin", "xMax", "yMin", "yMax"]), super(e), this.fn = new MultivariateFunction({
      fn: e.fn,
      model: e.model
    }).update(!0), this.negativeFn = new MultivariateFunction({
      fn: `-1*(${e.fn})`,
      model: e.model
    }).update(!0);
  }
  draw(e) {
    let t = this;
    return t.inDef ? (t.rootElement = e.selectAll("path.rootElement-" + t.id).data([1]).join("path").attr("class", "rootElement-" + t.id), t.path = t.rootElement) : (t.rootElement = e.selectAll("g.rootElement-" + t.id).data([1]).join("g").attr("class", "rootElement-" + t.id), t.negativePath = t.rootElement.selectAll("path.negativePath-" + t.id).data([1]).join("path").attr("class", "negativePath-" + t.id), t.path = t.rootElement.selectAll("path.path-" + t.id).data([1]).join("path").attr("class", "path-" + t.id)), t.addClipPathAndArrows();
  }
  redraw() {
    let e = this;
    return e.fn != null && (["xMin", "xMax", "yMin", "yMax"].forEach(function(t) {
      e.hasOwnProperty(t) && e[t] != null && e[t];
    }), e.path.attr("d", e.fn.contour(e.level, e.xScale, e.yScale, {
      xMin: e.xMin,
      xMax: e.xMax,
      yMin: e.yMin,
      yMax: e.yMax
    })), e.inDef || (e.path.style("fill", e.fillAbove), e.path.style("fill-opacity", e.opacity), e.path.style("stroke", e.stroke), e.path.style("stroke-width", e.strokeWidth), e.path.style("stroke-opacity", e.strokeOpacity), e.negativePath.attr("d", e.negativeFn.contour(-1 * e.level, e.xScale, e.yScale)), e.negativePath.style("fill", e.fillBelow), e.negativePath.style("fill-opacity", e.opacity))), e;
  }
  // update self and functions
  update(e) {
    let t = super.update(e);
    return t.hasChanged || t.fn.hasChanged && t.redraw(), t;
  }
}
class ContourMap extends ViewObject {
  constructor(e) {
    super(e);
  }
}
class Ellipse extends ViewObject {
  constructor(e) {
    setDefaults(e, {
      fill: "colors.blue",
      opacity: 1,
      stroke: "colors.blue",
      strokeWidth: 1,
      strokeOpacity: 1,
      rx: 1,
      ry: 1,
      checkOnGraph: !1
    }), setProperties(e, "updatables", ["x", "y", "rx", "ry"]), super(e);
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.rootElement = e.selectAll("ellipse.rootElement-" + t.id).data([1]).join("ellipse").attr("class", "rootElement-" + t.id), t.addClipPathAndArrows().addInteraction();
  }
  // update properties
  redraw() {
    let e = this;
    return e.rootElement.attr("cx", e.xScale.scale(e.x)), e.rootElement.attr("cy", e.yScale.scale(e.y)), e.rootElement.attr("rx", Math.abs(e.xScale.scale(e.rx) - e.xScale.scale(0))), e.rootElement.attr("ry", Math.abs(e.yScale.scale(e.ry) - e.yScale.scale(0))), e.drawFill(e.rootElement), e.drawStroke(e.rootElement), e;
  }
}
class Circle extends Ellipse {
  constructor(e) {
    super(e);
  }
}
class Axis extends ViewObject {
  constructor(e) {
    setDefaults(e, {
      ticks: 5,
      intercept: 0
    }), setProperties(e, "constants", ["orient"]), setProperties(e, "updatables", ["ticks", "intercept", "label", "min", "max", "otherMin", "otherMax", "tickPrepend", "tickPrecision", "tickValues"]), super(e);
  }
  draw(e) {
    let t = this;
    return t.rootElement = e.selectAll("g.rootElement-" + t.id).data([1]).join("g").attr("class", "rootElement-" + t.id).attr("class", "axis"), t;
  }
  redraw() {
    let e = this;
    function t(r) {
      return e.tickPrecision && (r = r.toFixed(e.tickPrecision)), e.tickPrepend ? `${e.tickPrepend}${r}` : r;
    }
    switch (e.orient) {
      case "bottom":
        return e.rootElement.attr("transform", `translate(0, ${e.yScale.scale(e.intercept)})`), e.tickValues ? e.rootElement.call(d3.axisBottom(e.xScale.scale).tickValues(e.tickValues).tickFormat(t)) : e.rootElement.call(d3.axisBottom(e.xScale.scale).ticks(e.ticks).tickFormat(t)), e;
      case "left":
        return e.rootElement.attr("transform", `translate(${e.xScale.scale(e.intercept)},0)`), e.tickValues ? e.rootElement.call(d3.axisLeft(e.yScale.scale).tickValues(e.tickValues).tickFormat(t)) : e.rootElement.call(d3.axisLeft(e.yScale.scale).ticks(e.ticks).tickFormat(t)), e;
      case "top":
        return e.rootElement.attr("transform", `translate(0, ${e.yScale.scale(e.intercept)})`), e.tickValues ? e.rootElement.call(d3.axisTop(e.xScale.scale).tickValues(e.tickValues).tickFormat(t)) : e.rootElement.call(d3.axisTop(e.xScale.scale).ticks(e.ticks).tickFormat(t)), e;
      case "right":
        return e.rootElement.attr("transform", `translate(${e.xScale.scale(e.intercept)},0)`), e.tickValues ? e.rootElement.call(d3.axisRight(e.yScale.scale).tickValues(e.tickValues).tickFormat(t)) : e.rootElement.call(d3.axisRight(e.yScale.scale).ticks(e.ticks).tickFormat(t)), e;
    }
    return e;
  }
}
class Area extends ViewObject {
  constructor(e) {
    const t = e.univariateFunction1.ind == "x" ? e.yScale.domainMin : e.xScale.domainMin, r = e.univariateFunction1.ind == "x" ? e.yScale.domainMax : e.xScale.domainMax;
    setDefaults(e, {
      interpolation: "curveBasis",
      ind: "x",
      fill: "lightsteelblue",
      opacity: 0.2,
      univariateFunction2: {
        fn: e.above && !e.useTopScale || !e.above && e.useTopScale ? r : t,
        ind: e.univariateFunction1.ind,
        min: e.univariateFunction1.min,
        max: e.univariateFunction1.max,
        samplePoints: e.univariateFunction1.samplePoints
      }
    }), setProperties(e, "constants", ["interpolation"]), e.univariateFunction1.model = e.model, e.univariateFunction2.model = e.model;
    const n = new UnivariateFunction(e.univariateFunction1), a = new UnivariateFunction(e.univariateFunction2);
    super(e), this.univariateFunction1 = n, this.univariateFunction2 = a;
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.rootElement = e.selectAll("path.rootElement-" + t.id).data([1]).join("path").attr("class", "rootElement-" + t.id), t.areaShape = d3.area().x0(function(r) {
      return t.xScale.scale(r[0].x);
    }).y0(function(r) {
      return t.yScale.scale(r[0].y);
    }).x1(function(r) {
      return t.xScale.scale(r[1].x);
    }).y1(function(r) {
      return t.yScale.scale(r[1].y);
    }), t.areaPath = t.rootElement, t.addClipPathAndArrows();
  }
  // update properties
  redraw() {
    const e = this;
    if (e.univariateFunction1 != null && e.univariateFunction2 != null) {
      const t = e.univariateFunction1, r = e.univariateFunction2, n = t.ind == "y" ? e.yScale : e.xScale;
      t.generateData(n.domainMin, n.domainMax), r.generateData(n.domainMin, n.domainMax), e.areaPath.data([d3.zip(t.data, r.data)]).attr("d", e.areaShape), e.drawFill(e.areaPath);
    }
    return e;
  }
  // update self and functions
  update(e) {
    let t = super.update(e);
    return t.hasChanged || (t.univariateFunction1.hasChanged || t.univariateFunction2.hasChanged) && t.redraw(), t;
  }
}
const ViewObjectClasses = AllClasses;
class View {
  constructor(e, t) {
    this.render(t, e);
  }
  parse(e, t) {
    if (e.hasOwnProperty("templateDefaults")) {
      const a = e.templateDefaults;
      let l = JSON.stringify(e);
      for (const o in a) {
        let s = new RegExp("template.\\b" + o + "\\b", "g"), c = a[o];
        l = l.replace(s, c);
      }
      e = JSON.parse(l);
    }
    e.schema = e.schema || "Schema";
    const r = new URLSearchParams(window.location.search);
    e.params = (e.params || []).map(function(a) {
      t.hasAttribute(a.name) && (a.value = t.getAttribute(a.name));
      const l = r.get(a.name);
      return l && (a.value = l), a.value == "true" && (a.value = 1), a.value == "false" && (a.value = 0), a.value = isNaN(+a.value) ? a.value : +a.value, a;
    }), t.hasAttribute("clearColor") && (e.clearColor = t.getAttribute("clearColor"));
    let n = {
      templateDefaults: e.templateDefaults || {},
      aspectRatio: e.aspectRatio || 1,
      clearColor: e.clearColor || "#FFFFFF",
      params: e.params || [],
      calcs: e.calcs || {},
      colors: e.colors || {},
      custom: e.custom || "",
      idioms: {},
      restrictions: e.restrictions,
      clipPaths: e.clipPaths || [],
      markers: e.markers || [],
      scales: e.scales || [
        {
          name: "x",
          axis: "x",
          rangeMin: 0,
          rangeMax: 1,
          domainMin: 0,
          domainMax: 1
        },
        {
          name: "y",
          axis: "y",
          rangeMin: 0,
          rangeMax: 1,
          domainMin: 0,
          domainMax: 1
        }
      ],
      layers: e.layers || [[], [], [], []],
      divs: e.divs || []
    };
    if (e.objects = e.objects || [], e.hasOwnProperty("layout"))
      if (e.layout.hasOwnProperty("type"))
        e.objects.push(e.layout);
      else {
        const a = Object.keys(e.layout)[0], l = e.layout[a];
        e.objects.push({ type: a, def: l });
      }
    return e.hasOwnProperty("explanation") && e.objects.push({ type: "Explanation", def: e.explanation }), e.hasOwnProperty("schema") && (r.get("custom") && (n.custom = r.get("custom")), e.objects.push({ type: e.schema, def: { custom: n.custom } })), console.log("parsed data: ", n), parse(e.objects, n);
  }
  render(e, t) {
    let r = this;
    const n = r.parse(e, t);
    console.log("parsedData: ", n), t.innerHTML = "", r.aspectRatio = e.aspectRatio || n.aspectRatio || 1, r.model = new Model(n), r.scales = n.scales.map(function(a) {
      return a.model = r.model, new Scale(a);
    }), r.div = d3.select(t).style("position", "relative"), r.svgContainerDiv = r.div.append("div").style("position", "absolute").style("left", "0px").style("top", "0px"), n.nosvg || (r.svg = r.svgContainerDiv.append("svg").style("overflow", "visible").style("pointer-events", "none")), r.addViewObjects(n), r.parsedData = n;
  }
  // add view information (model, layer, scales) to an object
  addViewToDef(e, t) {
    const r = this;
    function n(a) {
      let l = null;
      return r.scales.forEach(function(o) {
        o.name == a && (l = o);
      }), l;
    }
    return e.model = r.model, e.layer = t, e.xScale = n(e.xScaleName), e.yScale = n(e.yScaleName), e.hasOwnProperty("xScale2Name") && (e.xScale2 = n(e.xScale2Name), e.yScale2 = n(e.yScale2Name)), e;
  }
  // create view objects
  addViewObjects(e) {
    const t = this;
    let r = {};
    if (t.svg) {
      const n = t.svg.append("defs");
      e.clipPaths.length > 0 && e.clipPaths.forEach(function(a) {
        const l = randomString(10), o = n.append("clipPath").attr("id", l);
        a.paths.forEach(function(s) {
          s.def.inDef = !0, new ViewObjectClasses[s.type](t.addViewToDef(s.def, o));
        }), r[a.name] = l;
      }), e.markers.length > 0 && e.markers.forEach(function(a) {
        const l = randomString(10);
        a.url = l, r[a.name] = l;
        const o = n.append("marker").attr("id", l).attr("refX", a.refX).attr("refY", 6).attr("markerWidth", 13).attr("markerHeight", 13).attr("orient", "auto").attr("markerUnits", "userSpaceOnUse");
        t.addViewToDef(a, o), new Marker(a);
      }), e.layers.forEach(function(a) {
        if (a.length > 0) {
          const l = t.svg.append("g");
          a.forEach(function(o) {
            let s = o.def;
            s.hasOwnProperty("clipPathName") && (s.clipPath = r[s.clipPathName]), s.hasOwnProperty("clipPathName2") && (s.clipPath2 = r[s.clipPathName2]), s.hasOwnProperty("startArrowName") && (s.startArrow = r[s.startArrowName]), s.hasOwnProperty("endArrowName") && (s.endArrow = r[s.endArrowName]), s = t.addViewToDef(s, l), new ViewObjectClasses[o.type](s);
          });
        }
      });
    }
    t.updateDimensions();
  }
  // update dimensions, either when first rendering or when the window is resized
  updateDimensions(e) {
    let t = this;
    e = !!e;
    let r = 0, n = 0, a = 0;
    if (e)
      r = 600, n = r / t.aspectRatio, a = n + 20;
    else {
      r = t.div.node().clientWidth - 10, n = r / t.aspectRatio;
      let o = 0, s = 0;
      if (t.sidebar)
        if (r > t.sidebar.triggerWidth) {
          n = n * 77 / 126;
          let c;
          t.explanation ? c = n + t.explanation.rootElement.node().clientHeight + 10 : c = n, t.sidebar.positionRight(r, c), r = r * 77 / 126;
        } else
          t.sidebar.positionBelow(r, n), o = t.sidebar.rootElement.node().clientHeight + 30;
      t.explanation && (t.explanation.position(r, n + o + 10), s = t.explanation.rootElement.node().clientHeight + 20), a = n + o + s + 10;
    }
    t.div.style("height", a + "px"), t.svgContainerDiv.style("width", r), t.svgContainerDiv.style("height", n), t.svg && (t.svg.style("width", r), t.svg.style("height", n), t.svg.attr("width", r), t.svg.attr("height", n)), t.scales.forEach(function(l) {
      l.updateDimensions(r, n);
    }), t.model.update(!0);
  }
}
const KG_EVENTS = {
  PARAM_CHANGED: "kg:param_changed",
  CURVE_DRAGGED: "kg:curve_dragged",
  NODE_HOVER: "kg:node_hover"
};
function getDefaultExportFromCjs(i) {
  return i && i.__esModule && Object.prototype.hasOwnProperty.call(i, "default") ? i.default : i;
}
var eventemitter3 = { exports: {} };
(function(i) {
  var e = Object.prototype.hasOwnProperty, t = "~";
  function r() {
  }
  Object.create && (r.prototype = /* @__PURE__ */ Object.create(null), new r().__proto__ || (t = !1));
  function n(s, c, p) {
    this.fn = s, this.context = c, this.once = p || !1;
  }
  function a(s, c, p, h, y) {
    if (typeof p != "function")
      throw new TypeError("The listener must be a function");
    var d = new n(p, h || s, y), m = t ? t + c : c;
    return s._events[m] ? s._events[m].fn ? s._events[m] = [s._events[m], d] : s._events[m].push(d) : (s._events[m] = d, s._eventsCount++), s;
  }
  function l(s, c) {
    --s._eventsCount === 0 ? s._events = new r() : delete s._events[c];
  }
  function o() {
    this._events = new r(), this._eventsCount = 0;
  }
  o.prototype.eventNames = function() {
    var c = [], p, h;
    if (this._eventsCount === 0)
      return c;
    for (h in p = this._events)
      e.call(p, h) && c.push(t ? h.slice(1) : h);
    return Object.getOwnPropertySymbols ? c.concat(Object.getOwnPropertySymbols(p)) : c;
  }, o.prototype.listeners = function(c) {
    var p = t ? t + c : c, h = this._events[p];
    if (!h)
      return [];
    if (h.fn)
      return [h.fn];
    for (var y = 0, d = h.length, m = new Array(d); y < d; y++)
      m[y] = h[y].fn;
    return m;
  }, o.prototype.listenerCount = function(c) {
    var p = t ? t + c : c, h = this._events[p];
    return h ? h.fn ? 1 : h.length : 0;
  }, o.prototype.emit = function(c, p, h, y, d, m) {
    var g = t ? t + c : c;
    if (!this._events[g])
      return !1;
    var u = this._events[g], x = arguments.length, v, f;
    if (u.fn) {
      switch (u.once && this.removeListener(c, u.fn, void 0, !0), x) {
        case 1:
          return u.fn.call(u.context), !0;
        case 2:
          return u.fn.call(u.context, p), !0;
        case 3:
          return u.fn.call(u.context, p, h), !0;
        case 4:
          return u.fn.call(u.context, p, h, y), !0;
        case 5:
          return u.fn.call(u.context, p, h, y, d), !0;
        case 6:
          return u.fn.call(u.context, p, h, y, d, m), !0;
      }
      for (f = 1, v = new Array(x - 1); f < x; f++)
        v[f - 1] = arguments[f];
      u.fn.apply(u.context, v);
    } else {
      var S = u.length, w;
      for (f = 0; f < S; f++)
        switch (u[f].once && this.removeListener(c, u[f].fn, void 0, !0), x) {
          case 1:
            u[f].fn.call(u[f].context);
            break;
          case 2:
            u[f].fn.call(u[f].context, p);
            break;
          case 3:
            u[f].fn.call(u[f].context, p, h);
            break;
          case 4:
            u[f].fn.call(u[f].context, p, h, y);
            break;
          default:
            if (!v)
              for (w = 1, v = new Array(x - 1); w < x; w++)
                v[w - 1] = arguments[w];
            u[f].fn.apply(u[f].context, v);
        }
    }
    return !0;
  }, o.prototype.on = function(c, p, h) {
    return a(this, c, p, h, !1);
  }, o.prototype.once = function(c, p, h) {
    return a(this, c, p, h, !0);
  }, o.prototype.removeListener = function(c, p, h, y) {
    var d = t ? t + c : c;
    if (!this._events[d])
      return this;
    if (!p)
      return l(this, d), this;
    var m = this._events[d];
    if (m.fn)
      m.fn === p && (!y || m.once) && (!h || m.context === h) && l(this, d);
    else {
      for (var g = 0, u = [], x = m.length; g < x; g++)
        (m[g].fn !== p || y && !m[g].once || h && m[g].context !== h) && u.push(m[g]);
      u.length ? this._events[d] = u.length === 1 ? u[0] : u : l(this, d);
    }
    return this;
  }, o.prototype.removeAllListeners = function(c) {
    var p;
    return c ? (p = t ? t + c : c, this._events[p] && l(this, p)) : (this._events = new r(), this._eventsCount = 0), this;
  }, o.prototype.off = o.prototype.removeListener, o.prototype.addListener = o.prototype.on, o.prefixed = t, o.EventEmitter = o, i.exports = o;
})(eventemitter3);
var eventemitter3Exports = eventemitter3.exports;
const EventEmitter = /* @__PURE__ */ getDefaultExportFromCjs(eventemitter3Exports), kgjsTheme = "";
class KineticGraph extends EventEmitter {
  constructor(e) {
    super(), this.container = null, this.view = null, this.config = e;
  }
  mount(e) {
    this.container = e, this.view = new View(this.container, this.config), this.view.emitter = this;
  }
  update(e) {
    this.config = { ...this.config, ...e }, this.view && (e.params ? e.params.forEach((t) => {
      this.view.model.updateParam(t.name, t.value);
    }) : this.view.model.update(!0));
  }
  destroy() {
    this.container && (this.container.innerHTML = ""), this.view = null, this.container = null, this.removeAllListeners();
  }
}
export {
  KG_EVENTS,
  KineticGraph
};
