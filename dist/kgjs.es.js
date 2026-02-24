import * as k from "mathjs";
import * as x from "d3";
import * as N from "katex";
const z = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get Area() {
    return se;
  },
  get Axis() {
    return ie;
  },
  get Circle() {
    return ae;
  },
  get Contour() {
    return ne;
  },
  get ContourMap() {
    return re;
  },
  get Curve() {
    return te;
  },
  get Ellipse() {
    return _;
  },
  get GeoGebraObject() {
    return Q;
  },
  get Label() {
    return q;
  },
  get Marker() {
    return V;
  },
  get Point() {
    return J;
  },
  get Rectangle() {
    return Y;
  },
  get Segment() {
    return K;
  },
  get ViewObject() {
    return S;
  },
  get ViewObjectClasses() {
    return M;
  }
}, Symbol.toStringTag, { value: "Module" }));
function v(l, e) {
  l || (l = {});
  for (let t in e)
    l.hasOwnProperty(t) || (l[t] = e[t]);
  return l;
}
function m(l, e, t) {
  return l[e] || (l[e] = []), t.forEach(function(n) {
    l[e].push(n);
  }), l;
}
class I {
  constructor(e) {
    function t(n) {
      let r = ("" + n).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
      return r ? Math.max(
        0,
        // Number of digits right of decimal point.
        (r[1] ? r[1].length : 0) - (r[2] ? +r[2] : 0)
      ) : 0;
    }
    v(e, { min: 0, max: 10, round: 1, label: "" }), this.name = e.name, this.label = e.label, typeof e.value == "boolean" ? (this.value = +e.value, this.min = 0, this.max = 100, this.round = 1) : (this.value = parseFloat(e.value), this.min = parseFloat(e.min), this.max = parseFloat(e.max), this.round = parseFloat(e.round), this.precision = parseInt(e.precision) || t(this.round.toString()));
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
    return e = e || this.precision, x.format(`.${e}f`)(this.value);
  }
}
class $ {
  constructor(e) {
    this.expression = e.expression, this.type = e.type, this.min = e.min, this.max = e.max;
  }
  valid(e) {
    const t = this;
    return e.evaluate(t.expression), e.evaluate(t.min), e.evaluate(t.max), !0;
  }
}
class G {
  constructor(e) {
    let t = this;
    t.params = e.params.map(function(n) {
      return new I(n);
    }), t.initialParams = e.params, t.calcs = e.calcs, t.colors = e.colors, t.idioms = e.idioms, t.clearColor = e.clearColor, t.restrictions = (e.restrictions || []).map(function(n) {
      return new $(n);
    }), t.updateListeners = [], t.currentParamValues = t.evalParams(), t.evalCalcs(), t.currentColors = t.evalObject(t.colors), t.currentIdioms = t.evalObject(t.idioms);
  }
  addUpdateListener(e) {
    return this.updateListeners.push(e), this;
  }
  resetParams() {
    const e = this;
    e.initialParams.forEach(function(t) {
      e.updateParam(t.name, t.value);
    }), e.update(!0);
  }
  evalParams() {
    let e = {};
    return this.params.forEach(function(t) {
      e[t.name] = t.value;
    }), e;
  }
  // evaluates the calcs object; then re-evaluates to capture calcs that depend on other calcs
  evalCalcs() {
    const e = this;
    e.currentCalcValues = {}, e.currentCalcValues = e.evalObject(e.calcs, !0);
    for (let t = 0; t < 5; t++)
      for (const n in e.currentCalcValues)
        typeof e.calcs[n] == "object" ? e.currentCalcValues[n] = e.evalObject(e.calcs[n], !0) : isNaN(e.currentCalcValues[n]) && typeof e.calcs[n] == "string" && (e.currentCalcValues[n] = e.evaluate(e.calcs[n], !0));
    return e.currentCalcValues;
  }
  evalObject(e, t) {
    const n = this;
    let r = {};
    for (const a in e) {
      const i = e[a];
      typeof i == "number" ? r[a] = i : typeof i == "string" ? r[a] = n.evaluate(i, t) : r[a] = n.evalObject(i, t);
    }
    return r;
  }
  // the model serves as a model, and can evaluate expressions within the context of that model
  // if onlyJSMath is selected, it will only try to evaluate using JSMath; this is especially important for calculations.
  evaluate(e, t) {
    const n = this;
    if (!isNaN(parseFloat(e)))
      return parseFloat(e);
    const r = n.currentParamValues, a = n.currentCalcValues, i = n.currentColors, o = n.currentIdioms;
    try {
      return k.compile(e).evaluate({
        params: r,
        calcs: a,
        idioms: o,
        colors: i,
        d3: { schemeCategory10: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"] }
      });
    } catch {
      return e;
    }
  }
  // This is a utility for exporting currently used colors for use in LaTex documents.
  latexColors() {
    let e = `%% econ colors %%
`, t = this;
    for (const n in t.colors)
      e += `\\definecolor{${n}}{HTML}{${t.evaluate(t.colors[n]).replace("#", "")}}
`;
    return e;
  }
  getParam(e) {
    const t = this.params;
    for (let n = 0; n < t.length; n++)
      if (t[n].name == e)
        return t[n];
  }
  // method exposed to viewObjects to allow them to try to change a parameter
  updateParam(e, t) {
    let n = this, r = n.getParam(e);
    const a = r.value;
    if (r.update(t), a != r.value) {
      let i = !0;
      n.restrictions.forEach(function(o) {
        o.valid(n) || (i = !1);
      }), i ? n.update(!1) : r.update(a), n.update(!1);
    }
  }
  // method exposed to viewObjects to allow them to toggle a binary param
  toggleParam(e) {
    const t = this.getParam(e).value;
    this.updateParam(e, !t);
  }
  // method exposed to viewObjects to allow them to cycle a discrete param
  // increments by 1 if below max value, otherwise sets to zero
  cycleParam(e) {
    const t = this.getParam(e);
    this.updateParam(e, t.value < t.max ? t.value++ : 0);
  }
  update(e) {
    const t = this;
    t.currentParamValues = t.evalParams(), t.evalCalcs(), t.currentColors = t.evalObject(t.colors), t.updateListeners.forEach(function(n) {
      n.update(e);
    });
  }
}
function E(l) {
  let e = "KGID_";
  const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let n = 0; n < l; n++)
    e += t.charAt(Math.floor(Math.random() * t.length));
  return e;
}
class b {
  constructor(e) {
    e.constants = (e.constants || []).concat(["model", "updatables", "name"]);
    let t = this;
    t.def = e, e.constants.forEach(function(n) {
      t[n] = isNaN(parseFloat(e[n])) ? e[n] : +e[n];
    }), t.id = E(10), t.model.addUpdateListener(this);
  }
  updateArray(e) {
    let t = this;
    return e.map(function(n) {
      if (Array.isArray(n))
        return t.updateArray(n);
      {
        const r = n;
        let a = t.model.evaluate(n);
        return r != a && (t.hasChanged = !0), a;
      }
    });
  }
  updateDef(e) {
    let t = this;
    if (t.def.hasOwnProperty(e)) {
      const n = t.def[e], r = t[e];
      if (Array.isArray(n))
        t[e] = t.updateArray(n);
      else {
        let a = t.model.evaluate(n);
        r != a && (t.hasChanged = !0, t[e] = a);
      }
    }
    return t;
  }
  update(e) {
    let t = this;
    return t.hasChanged = !!e, t.hasOwnProperty("updatables") && t.updatables != null && t.updatables.forEach(function(n) {
      t.updateDef(n);
    }), t;
  }
}
class H extends b {
  constructor(e) {
    v(e, {
      log: !1
    }), e.constants = ["rangeMin", "rangeMax", "axis", "name"], e.updatables = ["domainMin", "domainMax", "intercept"], super(e), this.scale = e.log ? x.scaleLog() : x.scaleLinear(), this.update(!0);
  }
  update(e) {
    let t = super.update(e);
    if (t.extent != null) {
      const n = t.rangeMin * t.extent, r = t.rangeMax * t.extent;
      t.scale.domain([t.domainMin, t.domainMax]), t.scale.range([n, r]);
    }
    return t;
  }
  updateDimensions(e, t) {
    let n = this;
    return n.extent = n.axis == "x" ? e : t, n.update(!0);
  }
}
class U extends b {
  constructor(e) {
    e.dragListeners = e.dragListeners || [], e.clickListeners = e.clickListeners || [], e.constants = (e.constants || []).concat(["viewObject", "dragListeners", "clickListeners"]), super(e), this.dragListeners = e.dragListeners, this.clickListeners = e.clickListeners, this.viewObject = e.viewObject, this.update(!0), this.scope = { params: {}, calcs: {}, colors: {}, drag: {} };
  }
  update(e) {
    let t = super.update(e);
    if (t.hasChanged && t.hasOwnProperty("dragListeners") && t.element != null) {
      let n = !1, r = !1;
      t.dragListeners.forEach(function(a) {
        a.update(e), a.directions == "x" ? n = !0 : a.directions == "y" ? r = !0 : a.directions == "xy" && (n = !0, r = !0);
      }), t.element.style("pointer-events", n || r ? "all" : "none"), t.element.style("cursor", n && r ? "move" : n ? "ew-resize" : "ns-resize");
    }
    return t.hasOwnProperty("clickListeners") && t.element != null && t.clickListeners.length > 0 && (t.element.style("pointer-events", "all"), t.element.style("cursor", "pointer")), t;
  }
  addTrigger(e) {
    let t = this;
    t.element = e, t.clickListeners.length > 0 && e.on("click", function(n, r) {
      t.clickListeners.forEach(function(a) {
        a.click();
      });
    }), t.dragListeners.length > 0 && e.call(
      x.drag().on("start", function(n, r) {
        t.scope.params = t.model.currentParamValues, t.scope.calcs = t.model.currentCalcValues, t.scope.colors = t.model.currentColors, t.scope.drag.x0 = t.viewObject.xScale.scale.invert(n.x), t.scope.drag.y0 = t.viewObject.yScale.scale.invert(n.y);
      }).on("drag", function(n, r) {
        let a = t.scope.drag;
        a.x = t.viewObject.xScale.scale.invert(n.x), a.y = t.viewObject.yScale.scale.invert(n.y), a.dx = a.x - a.x0, a.dy = a.y - a.y0, t.dragListeners.forEach(function(i) {
          i.onChange(t.scope);
        });
      }).on("end", function(n, r) {
      })
    ), t.update(!0);
  }
}
class j extends b {
  constructor(e) {
    m(e, "updatables", ["expression"]), m(e, "constants", ["param"]), super(e);
  }
  onChange(e) {
    const t = this;
    let r = k.compile(t.expression).evaluate(e);
    t.model.updateParam(t.param, r);
  }
}
class W extends j {
  constructor(e) {
    v(e, { transitions: [1, 0] }), super(e), this.transitions = e.transitions;
  }
  click() {
    const e = this, t = e.model.currentParamValues[e.param], n = e.transitions[t];
    e.model.updateParam(e.param, n);
  }
}
class Z extends j {
  constructor(e) {
    e.hasOwnProperty("vertical") && (e.directions = "y", e.param = e.vertical, e.expression = `params.${e.vertical} + drag.dy`), e.hasOwnProperty("horizontal") && (e.directions = "x", e.param = e.horizontal, e.expression = `params.${e.horizontal} + drag.dx`), v(e, {
      directions: "xy"
    }), m(e, "updatables", ["draggable", "directions"]), super(e);
  }
  update(e) {
    let t = super.update(e);
    return t.def.hasOwnProperty("draggable") || (t.draggable = t.directions.length > 0), t;
  }
}
class S extends b {
  constructor(e) {
    v(e, {
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
    }), m(e, "updatables", ["xScaleMin", "xScaleMax", "yScaleMin", "yScaleMax", "fill", "stroke", "strokeWidth", "opacity", "strokeOpacity", "show", "lineStyle", "srTitle", "srDesc"]), m(e, "constants", ["xScale", "yScale", "clipPath", "clipPath2", "interactive", "alwaysUpdate", "inDef", "checkOnGraph", "tabbable"]), m(e, "colorAttributes", ["stroke", "fill", "color"]), e.inDef && (e.show = !0), super(e);
    let t = this;
    if (t.hasOwnProperty("xScale") && t.xScale && (e.xScaleMin = t.xScale.def.domainMin, e.xScaleMax = t.xScale.def.domainMax, e.yScaleMin = t.yScale.def.domainMin, e.yScaleMax = t.yScale.def.domainMax), e.colorAttributes.forEach(function(n) {
      let r = e[n];
      t.model.colors.hasOwnProperty(r) && (e[n] = t.model.colors[r]);
    }), e.interactive) {
      e.drag = e.drag || [];
      const n = e.drag.map(function(a) {
        return a.model = t.model, new Z(a);
      });
      e.click = e.click || [];
      const r = e.click.map(function(a) {
        return a.model = t.model, new W(a);
      });
      t.interactionHandler = new U({
        viewObject: t,
        model: t.model,
        dragListeners: n,
        clickListeners: r
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
      let t = function(n, r, a) {
        const i = Math.min(r, a), o = Math.max(r, a);
        return n < i || n > o;
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
class V extends S {
  constructor(e) {
    m(e, "constants", ["maskPath", "arrowPath"]), m(e, "updatables", ["color"]), super(e);
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
const D = {};
function B(l, e) {
  return l.forEach(function(t) {
    Object.prototype.hasOwnProperty.call(D, t.type) && (e = new D[t.type](t.def).parse(e));
  }), e;
}
function X(l, e, t) {
  return `(${l.split(e).join(t)})`;
}
class K extends S {
  constructor(e) {
    v(e, {
      xScale2: e.xScale,
      yScale2: e.yScale,
      strokeWidth: 2
    }), m(e, "constants", ["xScale2", "yScale2", "startArrow", "endArrow"]), m(e, "updatables", ["x1", "y1", "x2", "y2"]), super(e);
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.rootElement = e.selectAll("g.rootElement-" + t.id).data([1]).join("g").attr("class", "rootElement-" + t.id), t.dragLine = t.rootElement.selectAll("line.dragLine-" + t.id).data([1]).join("line").attr("class", "dragLine-" + t.id).attr("stroke-width", "20px").style("stroke-opacity", 0), t.line = t.rootElement.selectAll("line.line-" + t.id).data([1]).join("line").attr("class", "line-" + t.id), t.markedElement = t.line, t.addClipPathAndArrows().addInteraction();
  }
  // update properties
  redraw() {
    let e = this;
    const t = e.xScale.scale(e.x1), n = e.xScale.scale(e.x2), r = e.yScale2.scale(e.y1), a = e.yScale2.scale(e.y2);
    return e.dragLine.attr("x1", t).attr("y1", r).attr("x2", n).attr("y2", a), e.line.attr("x1", t).attr("y1", r).attr("x2", n).attr("y2", a), e.drawStroke(e.line), e;
  }
}
class Y extends S {
  constructor(e) {
    v(e, {
      opacity: 0.2,
      stroke: "none"
    }), m(e, "updatables", ["x1", "x2", "y1", "y2"]), super(e);
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.inDef ? t.rootElement = e : t.rootElement = e.selectAll("g.rootElement-" + t.id).data([1]).join("g").attr("class", "rootElement-" + t.id), t.rootElement2 = t.rootElement.selectAll("rect.rootElement2-" + t.id).data([1]).join("rect").attr("class", "rootElement2-" + t.id), t.addClipPathAndArrows().addInteraction();
  }
  // update properties
  redraw() {
    let e = this;
    const t = e.xScale.scale(e.x1), n = e.yScale.scale(e.y1), r = e.xScale.scale(e.x2), a = e.yScale.scale(e.y2);
    return e.rootElement2.attr("x", Math.min(t, r)).attr("y", Math.min(n, a)).attr("width", Math.abs(r - t)).attr("height", Math.abs(a - n)).style("fill", e.fill).style("fill-opacity", e.opacity).style("stroke", e.stroke).style("stroke-width", `${e.strokeWidth}px`).style("stroke-opacity", e.strokeOpacity), e;
  }
}
class J extends S {
  constructor(e) {
    e.hasOwnProperty("label") && !e.hasOwnProperty("srTitle") && (e.srTitle = `Point ${e.label.text}`), v(e, {
      fill: "colors.blue",
      opacity: 1,
      stroke: "white",
      strokeWidth: 1,
      strokeOpacity: 1,
      r: 6
    }), m(e, "updatables", ["x", "y", "r"]), super(e);
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
class q extends S {
  constructor(e) {
    const t = e.xScale.rangeMin > e.xScale.rangeMax, n = e.yScale.rangeMin < e.yScale.rangeMax;
    let r = t ? 1 : -1, a = n ? 12 : -12;
    e.x == "AXIS" && (e.x = e.yScale.intercept, e.align = t ? "left" : "right", e.xPixelOffset = r), e.x == "OPPAXIS" && (e.x = e.xScale.domainMax, e.align = t ? "right" : "left", e.xPixelOffset = -r), e.y == "AXIS" && (e.y = e.yScale.intercept, e.yPixelOffset = a), e.y == "OPPAXIS" && (e.y = e.yScale.domainMax, e.yPixelOffset = -a), v(e, {
      xPixelOffset: 0,
      yPixelOffset: 0,
      fontSize: 12,
      align: "center",
      valign: "middle",
      rotate: 0,
      color: "black"
    }), m(e, "constants", ["xPixelOffset", "yPixelOffset", "fontSize", "plainText"]), m(e, "updatables", ["x", "y", "text", "align", "valign", "rotate", "color", "bgcolor"]), super(e), this.bgcolor = e.model.clearColor;
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
    const t = e.xScale.scale(e.x) + +e.xPixelOffset, n = e.yScale.scale(e.y) - +e.yPixelOffset;
    if (e.text != null)
      if (e.plainText)
        e.rootElement.text(e.text);
      else
        try {
          N.render(e.text.toString(), e.rootElement.node());
        } catch {
          console.log("Error rendering KaTeX: ", e.text);
        }
    e.rootElement.style("left", t + "px"), e.rootElement.style("top", n + "px");
    const r = e.rootElement.node().clientWidth, a = e.rootElement.node().clientHeight;
    let i = r * 0.5;
    e.align == "left" ? i = 0 : e.align == "right" && (i = r), e.rootElement.style("left", t - i + "px");
    let o = a * 0.5;
    e.valign == "top" ? o = 0 : e.valign == "bottom" && (o = a), e.rootElement.style("top", n - o + "px");
    const s = `rotate(-${e.rotate}deg)`;
    return e.rootElement.style("-webkit-transform", s).style("transform", s), e;
  }
}
class Q extends S {
  constructor(e) {
    v(e, {
      color: "#999999",
      lineThickness: 1,
      lineStyle: 0
    }), m(e, "constants", ["command", "color", "lineThickness", "lineStyle"]), super(e);
  }
  establishGGB(e) {
    function t(i) {
      const o = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(i);
      return o ? {
        r: parseInt(o[1], 16),
        g: parseInt(o[2], 16),
        b: parseInt(o[3], 16)
      } : null;
    }
    const n = this, r = n.name + " = " + n.command;
    e.evalCommand(r), n.hasOwnProperty("opacity") && e.setFilling(n.opacity);
    const a = t(n.color);
    e.setColor(n.name, a.r, a.g, a.b), e.evalCommand("SetLineThickness[" + n.name + ", " + n.lineThickness + "]"), e.setLineStyle(n.name, n.lineStyle);
  }
}
class A extends b {
  constructor(e) {
    v(e, {
      samplePoints: 50
    }), m(e, "constants", ["samplePoints"]), m(e, "updatables", ["min", "max"]), super(e);
  }
  updateFunctionString(e, t) {
    function n(i, o) {
      o = o.replace(/\[(\w+)\]/g, ".$1"), o = o.replace(/^\./, "");
      let s = o.split(".");
      for (let c = 0, p = s.length; c < p; ++c) {
        let h = s[c];
        if (h in i)
          i = i[h];
        else
          return;
      }
      return i;
    }
    if (e = e.toString(), e.indexOf("null") > -1 || e.indexOf("Infinity") > -1)
      return null;
    const r = /((calcs|params).[.\w]*)+/g, a = e.match(r);
    return a && a.forEach(function(i) {
      e = X(e, i, n(t, i));
    }), e;
  }
}
class ee extends A {
  constructor(e) {
    v(e, {
      min: 0,
      max: 10
    }), super(e), this.xFunctionStringDef = e.xFunction, this.yFunctionStringDef = e.yFunction;
  }
  evaluate(e) {
    let t = this;
    return t.scope = t.scope || { params: t.model.currentParamValues }, t.scope.t = e, { x: t.xCompiledFunction.evaluate(t.scope), y: t.yCompiledFunction.evaluate(t.scope) };
  }
  generateData(e, t) {
    let n = this, r = [];
    n.min != null && (e = n.min), n.max != null && (t = n.max);
    for (let a = 0; a < n.samplePoints + 1; a++) {
      let i = a / n.samplePoints, o = i * e + (1 - i) * t, s = n.evaluate(o);
      !isNaN(s.x) && s.x != 1 / 0 && s.x != -1 / 0 && !isNaN(s.y) && s.y != 1 / 0 && s.y != -1 / 0 && r.push(s);
    }
    return this.data = r, r;
  }
  update(e) {
    let t = super.update(e);
    return t.scope = {
      params: t.model.currentParamValues,
      calcs: t.model.currentCalcValues,
      colors: t.model.currentColors
    }, t.xFunctionString != t.updateFunctionString(t.xFunctionStringDef, t.scope) && (t.hasChanged = !0, t.xFunctionString = t.updateFunctionString(t.xFunctionStringDef, t.scope), t.xCompiledFunction = k.compile(t.xFunctionString)), t.yFunctionString != t.updateFunctionString(t.yFunctionStringDef, t.scope) && (t.hasChanged = !0, t.yFunctionString = t.updateFunctionString(t.yFunctionStringDef, t.scope), t.yCompiledFunction = k.compile(t.yFunctionString)), t;
  }
}
class C extends A {
  constructor(e) {
    v(e, {
      ind: "x"
    }), m(e, "constants", ["fn", "yFn"]), m(e, "updatables", ["ind", "min", "max"]), super(e), this.fnStringDef = e.fn, this.fnZStringDef = e.fnZ, this.yFnStringDef = e.yFn, this.yFnZStringDef = e.yFnZ;
  }
  evaluate(e, t) {
    let n = this;
    if (t) {
      if (n.hasOwnProperty("yzCompiledFunction") && n.ind == "y")
        return n.yzCompiledFunction.evaluate({ y: e });
      if (n.hasOwnProperty("zCompiledFunction") && n.ind == "y")
        return n.zCompiledFunction.evaluate({ y: e });
      if (n.hasOwnProperty("zCompiledFunction"))
        return n.zCompiledFunction.evaluate({ x: e });
    } else {
      if (n.hasOwnProperty("yCompiledFunction") && n.ind == "y")
        return n.yCompiledFunction.evaluate({ y: e });
      if (n.hasOwnProperty("compiledFunction") && n.ind == "y")
        return n.compiledFunction.evaluate({ y: e });
      if (n.hasOwnProperty("compiledFunction"))
        return n.compiledFunction.evaluate({ x: e });
    }
  }
  generateData(e, t) {
    let n = this, r = [];
    n.min != null && (e = n.min), n.max != null && (t = n.max);
    for (let a = 0; a < n.samplePoints + 1; a++) {
      let i = a / n.samplePoints, o = i * e + (1 - i) * t, s = n.evaluate(o);
      !isNaN(s) && s != 1 / 0 && s != -1 / 0 && r.push(n.ind == "x" ? { x: o, y: s } : { x: s, y: o });
    }
    return this.data = r, r;
  }
  update(e) {
    let t = super.update(e);
    return t.scope = {
      params: t.model.currentParamValues,
      calcs: t.model.currentCalcValues,
      colors: t.model.currentColors
    }, t.fnString != t.updateFunctionString(t.fnStringDef, t.scope) && (t.hasChanged = !0, t.fnString = t.updateFunctionString(t.fnStringDef, t.scope), t.compiledFunction = k.compile(t.fnString)), t.def.hasOwnProperty("yFn") && t.yFnString != t.updateFunctionString(t.yFnStringDef, t.scope) && (t.hasChanged = !0, t.yFnString = t.updateFunctionString(t.yFnStringDef, t.scope), t.yCompiledFunction = k.compile(t.yFnString)), t.def.hasOwnProperty("fnZ") && t.fnZString != t.updateFunctionString(t.fnZStringDef, t.scope) && (t.hasChanged = !0, t.fnZString = t.updateFunctionString(t.fnZStringDef, t.scope), t.zCompiledFunction = k.compile(t.fnZString)), t.def.hasOwnProperty("yFnZ") && t.yFnZString != t.updateFunctionString(t.yFnZStringDef, t.scope) && (t.hasChanged = !0, t.yFnZString = t.updateFunctionString(t.yFnZStringDef, t.scope), t.yzCompiledFunction = k.compile(t.yFnZString)), t;
  }
}
class te extends S {
  constructor(e) {
    let t, n;
    v(e, {
      interpolation: "curveBasis",
      strokeWidth: 2
    }), m(e, "constants", ["interpolation"]), e.hasOwnProperty("univariateFunction") ? (e.univariateFunction.model = e.model, t = new C(e.univariateFunction), m(e, "updatables", [])) : e.hasOwnProperty("parametricFunction") && (e.parametricFunction.model = e.model, n = new ee(e.parametricFunction), m(e, "updatables", [])), super(e);
    let r = this;
    e.hasOwnProperty("univariateFunction") ? r.univariateFunction = t : e.hasOwnProperty("parametricFunction") && (e.parametricFunction.model = e.model, r.parametricFunction = n);
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.dataLine = x.line().curve(x[t.interpolation]).x(function(n) {
      return t.xScale.scale(n.x);
    }).y(function(n) {
      return t.yScale.scale(n.y);
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
      const t = e.univariateFunction, n = t.ind == "y" ? e.yScale : e.xScale;
      t.generateData(n.domainMin, n.domainMax), e.dragPath.data([t.data]).attr("d", e.dataLine), e.path.data([t.data]).attr("d", e.dataLine);
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
class L extends A {
  constructor(e) {
    e.samplePoints = 100, m(e, "constants", ["fn"]), super(e), this.fnStringDef = e.fn, this.domainConditionStringDef = e.domainCondition;
  }
  inDomain(e, t, n) {
    let r = this;
    return r.hasOwnProperty("compiledDomainCondition") ? r.compiledDomainCondition.evaluate({ x: e, y: t, z: n }) : !0;
  }
  evaluate(e, t) {
    let n = this;
    if (n.hasOwnProperty("compiledFunction")) {
      const r = n.compiledFunction.evaluate({ x: e, y: t });
      if (n.inDomain(e, t, r))
        return r;
    }
  }
  contour(e, t, n, r) {
    const a = this;
    r = v(r || {}, {
      xMin: t.domainMin,
      xMax: t.domainMax,
      yMin: n.domainMin,
      yMax: n.domainMax
    });
    let i = 100, o = 100, s = new Array(i * o);
    for (let f = 0.5, y = 0; f < o; ++f)
      for (let d = 0.5; d < i; ++d, ++y) {
        let w = r.xMin + d * (r.xMax - r.xMin) / i, u = r.yMin + f * (r.yMax - r.yMin) / o;
        s[y] = a.evaluate(w, u);
      }
    let c = ({ type: f, value: y, coordinates: d }) => ({
      type: f,
      value: y,
      coordinates: d.map((w) => w.map((u) => u.map(([P, F]) => [t.scale(r.xMin + P * (r.xMax - r.xMin) / 100), n.scale(r.yMin + F * (r.yMax - r.yMin) / 100)])))
    });
    const p = x.geoPath(), h = x.contours().size([i, o]).contour(s, e);
    return p(c(h));
  }
  update(e) {
    let t = super.update(e);
    t.scope = {
      params: t.model.currentParamValues,
      calcs: t.model.currentCalcValues,
      colors: t.model.currentColors
    };
    const n = t.fnString, r = t.domainConditionString;
    return n != t.updateFunctionString(t.fnStringDef, t.scope) && (t.hasChanged = !0, t.fnString = t.updateFunctionString(t.fnStringDef, t.scope), t.compiledFunction = k.compile(t.fnString)), t.domainConditionStringDef != null && r != t.updateFunctionString(t.domainConditionStringDef, t.scope) && (t.hasChanged = !0, t.domainConditionString = t.updateFunctionString(t.domainConditionStringDef, t.scope), t.compiledDomainCondition = k.compile(t.domainConditionString)), t;
  }
}
class ne extends S {
  constructor(e) {
    v(e, {
      opacity: 0.2,
      stroke: "grey",
      fillAbove: "none",
      fillBelow: "none",
      strokeOpacity: 1
    }), m(e, "colorAttributes", ["fillAbove", "fillBelow"]), m(e, "updatables", ["level", "fillBelow", "fillAbove", "xMin", "xMax", "yMin", "yMax"]), super(e), this.fn = new L({
      fn: e.fn,
      model: e.model
    }).update(!0), this.negativeFn = new L({
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
class re extends S {
  constructor(e) {
    super(e);
  }
}
class _ extends S {
  constructor(e) {
    v(e, {
      fill: "colors.blue",
      opacity: 1,
      stroke: "colors.blue",
      strokeWidth: 1,
      strokeOpacity: 1,
      rx: 1,
      ry: 1,
      checkOnGraph: !1
    }), m(e, "updatables", ["x", "y", "rx", "ry"]), super(e);
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
class ae extends _ {
  constructor(e) {
    super(e);
  }
}
class ie extends S {
  constructor(e) {
    v(e, {
      ticks: 5,
      intercept: 0
    }), m(e, "constants", ["orient"]), m(e, "updatables", ["ticks", "intercept", "label", "min", "max", "otherMin", "otherMax", "tickPrepend", "tickPrecision", "tickValues"]), super(e);
  }
  draw(e) {
    let t = this;
    return t.rootElement = e.selectAll("g.rootElement-" + t.id).data([1]).join("g").attr("class", "rootElement-" + t.id).attr("class", "axis"), t;
  }
  redraw() {
    let e = this;
    function t(n) {
      return e.tickPrecision && (n = n.toFixed(e.tickPrecision)), e.tickPrepend ? `${e.tickPrepend}${n}` : n;
    }
    switch (e.orient) {
      case "bottom":
        return e.rootElement.attr("transform", `translate(0, ${e.yScale.scale(e.intercept)})`), e.tickValues ? e.rootElement.call(x.axisBottom(e.xScale.scale).tickValues(e.tickValues).tickFormat(t)) : e.rootElement.call(x.axisBottom(e.xScale.scale).ticks(e.ticks).tickFormat(t)), e;
      case "left":
        return e.rootElement.attr("transform", `translate(${e.xScale.scale(e.intercept)},0)`), e.tickValues ? e.rootElement.call(x.axisLeft(e.yScale.scale).tickValues(e.tickValues).tickFormat(t)) : e.rootElement.call(x.axisLeft(e.yScale.scale).ticks(e.ticks).tickFormat(t)), e;
      case "top":
        return e.rootElement.attr("transform", `translate(0, ${e.yScale.scale(e.intercept)})`), e.tickValues ? e.rootElement.call(x.axisTop(e.xScale.scale).tickValues(e.tickValues).tickFormat(t)) : e.rootElement.call(x.axisTop(e.xScale.scale).ticks(e.ticks).tickFormat(t)), e;
      case "right":
        return e.rootElement.attr("transform", `translate(${e.xScale.scale(e.intercept)},0)`), e.tickValues ? e.rootElement.call(x.axisRight(e.yScale.scale).tickValues(e.tickValues).tickFormat(t)) : e.rootElement.call(x.axisRight(e.yScale.scale).ticks(e.ticks).tickFormat(t)), e;
    }
    return e;
  }
}
class se extends S {
  constructor(e) {
    const t = e.univariateFunction1.ind == "x" ? e.yScale.domainMin : e.xScale.domainMin, n = e.univariateFunction1.ind == "x" ? e.yScale.domainMax : e.xScale.domainMax;
    v(e, {
      interpolation: "curveBasis",
      ind: "x",
      fill: "lightsteelblue",
      opacity: 0.2,
      univariateFunction2: {
        fn: e.above && !e.useTopScale || !e.above && e.useTopScale ? n : t,
        ind: e.univariateFunction1.ind,
        min: e.univariateFunction1.min,
        max: e.univariateFunction1.max,
        samplePoints: e.univariateFunction1.samplePoints
      }
    }), m(e, "constants", ["interpolation"]), e.univariateFunction1.model = e.model, e.univariateFunction2.model = e.model;
    const r = new C(e.univariateFunction1), a = new C(e.univariateFunction2);
    super(e), this.univariateFunction1 = r, this.univariateFunction2 = a;
  }
  // create SVG elements
  draw(e) {
    let t = this;
    return t.rootElement = e.selectAll("path.rootElement-" + t.id).data([1]).join("path").attr("class", "rootElement-" + t.id), t.areaShape = x.area().x0(function(n) {
      return t.xScale.scale(n[0].x);
    }).y0(function(n) {
      return t.yScale.scale(n[0].y);
    }).x1(function(n) {
      return t.xScale.scale(n[1].x);
    }).y1(function(n) {
      return t.yScale.scale(n[1].y);
    }), t.areaPath = t.rootElement, t.addClipPathAndArrows();
  }
  // update properties
  redraw() {
    const e = this;
    if (e.univariateFunction1 != null && e.univariateFunction2 != null) {
      const t = e.univariateFunction1, n = e.univariateFunction2, r = t.ind == "y" ? e.yScale : e.xScale;
      t.generateData(r.domainMin, r.domainMax), n.generateData(r.domainMin, r.domainMax), e.areaPath.data([x.zip(t.data, n.data)]).attr("d", e.areaShape), e.drawFill(e.areaPath);
    }
    return e;
  }
  // update self and functions
  update(e) {
    let t = super.update(e);
    return t.hasChanged || (t.univariateFunction1.hasChanged || t.univariateFunction2.hasChanged) && t.redraw(), t;
  }
}
const M = z;
class oe {
  constructor(e, t, n) {
    this.viewOptions = n || {}, this.render(t, e);
  }
  parse(e, t) {
    if (e.hasOwnProperty("templateDefaults")) {
      const i = e.templateDefaults;
      let o = JSON.stringify(e);
      for (const s in i) {
        let c = new RegExp("template.\\b" + s + "\\b", "g"), p = i[s];
        o = o.replace(c, p);
      }
      e = JSON.parse(o);
    }
    e.schema = e.schema || "Schema";
    const n = !!this.viewOptions.legacyUrlOverrides;
    let r = null;
    if (n)
      try {
        r = new URLSearchParams(window.location.search);
      } catch {
      }
    e.params = (e.params || []).map(function(i) {
      if (n && (t && t.hasAttribute && t.hasAttribute(i.name) && (i.value = t.getAttribute(i.name)), r)) {
        const o = r.get(i.name);
        o && (i.value = o);
      }
      return i.value == "true" && (i.value = 1), i.value == "false" && (i.value = 0), i.value = isNaN(+i.value) ? i.value : +i.value, i;
    }), n && t && t.hasAttribute && t.hasAttribute("clearColor") && (e.clearColor = t.getAttribute("clearColor"));
    let a = {
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
        const i = Object.keys(e.layout)[0], o = e.layout[i];
        e.objects.push({ type: i, def: o });
      }
    return e.hasOwnProperty("explanation") && e.objects.push({ type: "Explanation", def: e.explanation }), e.hasOwnProperty("schema") && (n && r && r.get("custom") && (a.custom = r.get("custom")), e.objects.push({ type: e.schema, def: { custom: a.custom } })), B(e.objects, a);
  }
  render(e, t) {
    let n = this;
    const r = n.parse(e, t);
    t.innerHTML = "", n.aspectRatio = e.aspectRatio || r.aspectRatio || 1, n.model = new G(r), n.scales = r.scales.map(function(a) {
      return a.model = n.model, new H(a);
    }), n.div = x.select(t).style("position", "relative"), n.svgContainerDiv = n.div.append("div").style("position", "absolute").style("left", "0px").style("top", "0px"), r.nosvg || (n.svg = n.svgContainerDiv.append("svg").style("overflow", "visible").style("pointer-events", "none")), n.addViewObjects(r), n.parsedData = r;
  }
  // add view information (model, layer, scales) to an object
  addViewToDef(e, t) {
    const n = this;
    function r(a) {
      let i = null;
      return n.scales.forEach(function(o) {
        o.name == a && (i = o);
      }), i;
    }
    return e.model = n.model, e.layer = t, e.xScale = r(e.xScaleName), e.yScale = r(e.yScaleName), e.hasOwnProperty("xScale2Name") && (e.xScale2 = r(e.xScale2Name), e.yScale2 = r(e.yScale2Name)), e;
  }
  // create view objects
  addViewObjects(e) {
    const t = this;
    let n = {};
    if (t.svg) {
      const r = t.svg.append("defs");
      e.clipPaths.length > 0 && e.clipPaths.forEach(function(a) {
        const i = E(10), o = r.append("clipPath").attr("id", i);
        a.paths.forEach(function(s) {
          s.def.inDef = !0, new M[s.type](t.addViewToDef(s.def, o));
        }), n[a.name] = i;
      }), e.markers.length > 0 && e.markers.forEach(function(a) {
        const i = E(10);
        a.url = i, n[a.name] = i;
        const o = r.append("marker").attr("id", i).attr("refX", a.refX).attr("refY", 6).attr("markerWidth", 13).attr("markerHeight", 13).attr("orient", "auto").attr("markerUnits", "userSpaceOnUse");
        t.addViewToDef(a, o), new V(a);
      }), e.layers.forEach(function(a) {
        if (a.length > 0) {
          const i = t.svg.append("g");
          a.forEach(function(o) {
            let s = o.def;
            s.hasOwnProperty("clipPathName") && (s.clipPath = n[s.clipPathName]), s.hasOwnProperty("clipPathName2") && (s.clipPath2 = n[s.clipPathName2]), s.hasOwnProperty("startArrowName") && (s.startArrow = n[s.startArrowName]), s.hasOwnProperty("endArrowName") && (s.endArrow = n[s.endArrowName]), s = t.addViewToDef(s, i), new M[o.type](s);
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
    let n = 0, r = 0, a = 0;
    if (e)
      n = 600, r = n / t.aspectRatio, a = r + 20;
    else {
      n = t.div.node().clientWidth, r = n / t.aspectRatio;
      let o = 0, s = 0;
      if (t.sidebar)
        if (n > t.sidebar.triggerWidth) {
          r = r * 77 / 126;
          let c;
          t.explanation ? c = r + t.explanation.rootElement.node().clientHeight + 10 : c = r, t.sidebar.positionRight(n, c), n = n * 77 / 126;
        } else
          t.sidebar.positionBelow(n, r), o = t.sidebar.rootElement.node().clientHeight + 30;
      t.explanation && (t.explanation.position(n, r + o + 10), s = t.explanation.rootElement.node().clientHeight + 20), a = r + o + s + 10;
    }
    t.div.style("height", a + "px"), t.svgContainerDiv.style("width", n), t.svgContainerDiv.style("height", r), t.svg && (t.svg.style("width", n), t.svg.style("height", r), t.svg.attr("width", n), t.svg.attr("height", r)), t.scales.forEach(function(i) {
      i.updateDimensions(n, r);
    }), t.model.update(!0);
  }
}
const pe = {
  PARAM_CHANGED: "kg:param_changed",
  CURVE_DRAGGED: "kg:curve_dragged",
  NODE_HOVER: "kg:node_hover"
};
function le(l) {
  return l && l.__esModule && Object.prototype.hasOwnProperty.call(l, "default") ? l.default : l;
}
var T = { exports: {} };
(function(l) {
  var e = Object.prototype.hasOwnProperty, t = "~";
  function n() {
  }
  Object.create && (n.prototype = /* @__PURE__ */ Object.create(null), new n().__proto__ || (t = !1));
  function r(s, c, p) {
    this.fn = s, this.context = c, this.once = p || !1;
  }
  function a(s, c, p, h, f) {
    if (typeof p != "function")
      throw new TypeError("The listener must be a function");
    var y = new r(p, h || s, f), d = t ? t + c : c;
    return s._events[d] ? s._events[d].fn ? s._events[d] = [s._events[d], y] : s._events[d].push(y) : (s._events[d] = y, s._eventsCount++), s;
  }
  function i(s, c) {
    --s._eventsCount === 0 ? s._events = new n() : delete s._events[c];
  }
  function o() {
    this._events = new n(), this._eventsCount = 0;
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
    for (var f = 0, y = h.length, d = new Array(y); f < y; f++)
      d[f] = h[f].fn;
    return d;
  }, o.prototype.listenerCount = function(c) {
    var p = t ? t + c : c, h = this._events[p];
    return h ? h.fn ? 1 : h.length : 0;
  }, o.prototype.emit = function(c, p, h, f, y, d) {
    var w = t ? t + c : c;
    if (!this._events[w])
      return !1;
    var u = this._events[w], P = arguments.length, F, g;
    if (u.fn) {
      switch (u.once && this.removeListener(c, u.fn, void 0, !0), P) {
        case 1:
          return u.fn.call(u.context), !0;
        case 2:
          return u.fn.call(u.context, p), !0;
        case 3:
          return u.fn.call(u.context, p, h), !0;
        case 4:
          return u.fn.call(u.context, p, h, f), !0;
        case 5:
          return u.fn.call(u.context, p, h, f, y), !0;
        case 6:
          return u.fn.call(u.context, p, h, f, y, d), !0;
      }
      for (g = 1, F = new Array(P - 1); g < P; g++)
        F[g - 1] = arguments[g];
      u.fn.apply(u.context, F);
    } else {
      var R = u.length, O;
      for (g = 0; g < R; g++)
        switch (u[g].once && this.removeListener(c, u[g].fn, void 0, !0), P) {
          case 1:
            u[g].fn.call(u[g].context);
            break;
          case 2:
            u[g].fn.call(u[g].context, p);
            break;
          case 3:
            u[g].fn.call(u[g].context, p, h);
            break;
          case 4:
            u[g].fn.call(u[g].context, p, h, f);
            break;
          default:
            if (!F)
              for (O = 1, F = new Array(P - 1); O < P; O++)
                F[O - 1] = arguments[O];
            u[g].fn.apply(u[g].context, F);
        }
    }
    return !0;
  }, o.prototype.on = function(c, p, h) {
    return a(this, c, p, h, !1);
  }, o.prototype.once = function(c, p, h) {
    return a(this, c, p, h, !0);
  }, o.prototype.removeListener = function(c, p, h, f) {
    var y = t ? t + c : c;
    if (!this._events[y])
      return this;
    if (!p)
      return i(this, y), this;
    var d = this._events[y];
    if (d.fn)
      d.fn === p && (!f || d.once) && (!h || d.context === h) && i(this, y);
    else {
      for (var w = 0, u = [], P = d.length; w < P; w++)
        (d[w].fn !== p || f && !d[w].once || h && d[w].context !== h) && u.push(d[w]);
      u.length ? this._events[y] = u.length === 1 ? u[0] : u : i(this, y);
    }
    return this;
  }, o.prototype.removeAllListeners = function(c) {
    var p;
    return c ? (p = t ? t + c : c, this._events[p] && i(this, p)) : (this._events = new n(), this._eventsCount = 0), this;
  }, o.prototype.off = o.prototype.removeListener, o.prototype.addListener = o.prototype.on, o.prefixed = t, o.EventEmitter = o, l.exports = o;
})(T);
var ce = T.exports;
const ue = /* @__PURE__ */ le(ce);
class he extends ue {
  constructor(e, t) {
    super(), this.container = null, this.view = null, this.resizeObserver = null, this.config = e, this.options = t || {};
  }
  mount(e) {
    this.container = e, this.container.classList.add("kg-container");
    try {
      this.view = new oe(this.container, this.config, {
        legacyUrlOverrides: !!this.options.legacyUrlOverrides
      }), this.view.emitter = this, this.resizeObserver = new ResizeObserver(() => {
        this.view && this.view.updateDimensions();
      }), this.resizeObserver.observe(e);
    } catch (t) {
      this.emit("error", t);
    }
  }
  update(e) {
    this.config = { ...this.config, ...e }, this.view && (e.params ? e.params.forEach((t) => {
      this.view.model.updateParam(t.name, t.value);
    }) : this.view.model.update(!0));
  }
  destroy() {
    this.resizeObserver && (this.resizeObserver.disconnect(), this.resizeObserver = null), this.container && (this.container.classList.remove("kg-container"), this.container.innerHTML = ""), this.view = null, this.container = null, this.removeAllListeners();
  }
}
export {
  pe as KG_EVENTS,
  he as KineticGraph
};
