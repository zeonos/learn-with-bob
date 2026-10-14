// Laboratoriet: checks the simulations, every generated experiment and the Danish text.
// Run: node tools/test-laboratoriet.js  (needs hunspell + hunspell-da)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../laboratoriet/strings-da.js');
var Sim = require('../laboratoriet/sim.js'), L = require('../laboratoriet/content.js'), S = window.STR.lab;
var execFileSync = require('child_process').execFileSync;
var fails = 0, checks = 0;
function check(ok, msg) { checks++; if (!ok) { fails++; console.log('FAIL', msg); } }
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-6); }

/* ---------- 1. simulations against hand-calculated physics ---------- */
function loopBoard(extra) { // 3×2 loop: battery left, bulb right
  return { cols: 3, rows: 2, parts: [{ slot: 'v:0:0', type: 'battery' }, { slot: 'v:0:2', type: 'bulb' }, { slot: 'h:1:0', type: 'wire' }, { slot: 'h:1:1', type: 'wire' }].concat(extra) };
}
var one = Sim.solveCircuit(loopBoard([{ slot: 'h:0:0', type: 'wire' }, { slot: 'h:0:1', type: 'wire' }]));
check(one.parts[1].lit && near(one.parts[1].I, 4.5 / 9, 0.01), 'one bulb: I = U/R = 0,5 A');
var ser = Sim.solveCircuit(loopBoard([{ slot: 'h:0:0', type: 'bulb' }, { slot: 'h:0:1', type: 'wire' }]));
check(near(ser.parts[1].I, 4.5 / 18, 0.01) && near(ser.parts[1].glow, 0.25, 0.02), 'series: half the current, a quarter of the power');
var par = Sim.solveCircuit(loopBoard([{ slot: 'h:0:0', type: 'wire' }, { slot: 'h:0:1', type: 'wire' }, { slot: 'v:0:1', type: 'bulb' }]));
check(par.parts[1].glow > 0.9 && par.parts[6].glow > 0.9, 'parallel: both bulbs (almost) full brightness');
var sh = Sim.solveCircuit(loopBoard([{ slot: 'h:0:0', type: 'wire' }, { slot: 'h:0:1', type: 'wire' }, { slot: 'v:0:1', type: 'wire' }]));
check(sh.short && !sh.parts[1].lit, 'short circuit: detected, bulb dark');
var open = Sim.solveCircuit(loopBoard([{ slot: 'h:0:0', type: 'switch', on: false }, { slot: 'h:0:1', type: 'wire' }]));
check(!open.anyLit, 'open switch: no light');
var closed = Sim.solveCircuit(loopBoard([{ slot: 'h:0:0', type: 'switch', on: true }, { slot: 'h:0:1', type: 'wire' }]));
check(closed.anyLit, 'closed switch: light');
var ins = Sim.solveCircuit(loopBoard([{ slot: 'h:0:0', type: 'material', cond: false }, { slot: 'h:0:1', type: 'wire' }]));
check(!ins.anyLit, 'insulator: no light');
var graf = Sim.solveCircuit(loopBoard([{ slot: 'h:0:0', type: 'material', cond: true, R: 6 }, { slot: 'h:0:1', type: 'wire' }]));
check(graf.anyLit && graf.parts[1].glow < 0.6, 'graphite: dimmer light');
var gap = Sim.solveCircuit(loopBoard([{ slot: 'h:0:0', type: 'wire' }]));
check(!gap.anyLit, 'gap in the circuit: no light');
check(near(Sim.ohm({ U: 12, R: 6 }), 2) && near(Sim.ohm({ U: 4.5, I: 0.5 }), 9) && near(Sim.ohm({ R: 9, I: 0.5 }), 4.5), 'Ohms lov');
check(Sim.floatIn(0.5, 1).floats && near(Sim.floatIn(0.5, 1).under, 0.5) && !Sim.floatIn(2.6, 1).floats, 'float/sink');
check(Sim.floatIn(1.05, 1.2).floats && !Sim.floatIn(1.05, 1).floats, 'egg sinks in water, floats in salt water');
check(near(Sim.boatCapacity(500, 100, 1), 400) && near(Sim.boatCapacity(500, 100, 1.2), 500), 'boat capacity');
check(Sim.lever([{ pos: -2, kg: 3 }, { pos: 3, kg: 2 }]).tilt === 'balance' && Sim.lever([{ pos: -1, kg: 4 }, { pos: 5, kg: 1 }]).tilt === 'right', 'lever moments');
check(Sim.gears([40, 10])[1].turns === 4 && Sim.gears([10, 20, 30])[1].dir === -1 && Sim.gears([10, 20, 30])[2].dir === 1, 'gears');
check(near(Sim.titration(0.1, 10, 0.1, 0), 1) && Sim.titration(0.1, 10, 0.1, 10) === 7 && Sim.titration(0.1, 10, 0.1, 9) < 3 && Sim.titration(0.1, 10, 0.1, 11) > 11, 'titration');
check(Sim.waterState(-5) === 'fast' && Sim.waterState(20) === 'flydende' && Sim.waterState(100) === 'gas', 'water states (0 °C and 100 °C)');
check(Sim.acidity(2) === 'sur' && Sim.acidity(7) === 'neutral' && Sim.acidity(11) === 'basisk', 'acidity');
check(Sim.indicatorColor('btb', 4) !== Sim.indicatorColor('btb', 7) && Sim.indicatorColor('btb', 7) !== Sim.indicatorColor('btb', 10), 'BTB changes colour');
var noFox = Sim.populations({ hares: 60, foxes: 0 }, 40); check(noFox[40].H > 150 && noFox[40].H <= 200.5, 'no foxes: hares grow to the grass limit');
var noHare = Sim.populations({ hares: 0, foxes: 10 }, 40); check(noHare[40].F < 1, 'no hares: foxes disappear');
var both = Sim.populations({ hares: 40, foxes: 8 }, 40), hs = both.map(function (x) { return x.H; });
check(Math.max.apply(null, hs.slice(5)) - Math.min.apply(null, hs.slice(5)) > 30 && both[40].F > 1, 'hares and foxes go up and down and both survive');
check(near(Sim.energyAt(10000, 3), 100), '10 % rule');

/* ---------- 2. facts in the content ---------- */
Object.keys(L.objects).forEach(function (k) { var o = L.objects[k]; check(o.rho > 0 && /^(den|det)$/.test(o.pron) && o.def, 'object ' + k); });
['kork', 'trae', 'aeble', 'is', 'lys', 'and', 'flaske', 'appelsin'].forEach(function (k) { check(L.objects[k].rho < 1, k + ' floats in water'); });
['sten', 'moent', 'noegle', 'glaskugle', 'viskelaeder', 'soem', 'aeg', 'ler', 'appelsin2'].forEach(function (k) { check(L.objects[k].rho > 1, k + ' sinks in water'); });
check(L.objects.is.rho > 0.85 && L.objects.is.rho < 0.95, 'ice: about 9/10 under water');
check(L.liquids.olie.rho < L.liquids.vand.rho && L.liquids.vand.rho < L.liquids.saltvand.rho && L.liquids.saltvand.rho < L.liquids.sirup.rho, 'liquid densities in order');
['citron', 'eddike', 'cola', 'danskvand'].forEach(function (k) { check(L.substances[k].pH < 7, k + ' is acidic'); });
['natron', 'salmiak', 'afloeb'].forEach(function (k) { check(L.substances[k].pH > 7, k + ' is basic'); });
check(L.substances.vand.pH === 7, 'water is neutral');
L.chains.forEach(function (c) {
  check(L.organisms[c.ids[0]].role === 'producent', 'chain ' + c.where + ' starts with a producer');
  c.ids.slice(1).forEach(function (k) { check(L.organisms[k].role !== 'producent', 'chain ' + c.where + ': only the first link is a producer'); });
});
Object.keys(L.organisms).forEach(function (k) { check(L.organisms[k].def && L.roleName[L.organisms[k].role], 'organism ' + k); });
Object.keys(L.materials).forEach(function (k) { var m = L.materials[k]; check(m.a && (m.cond ? m.why : m.stof), 'material ' + k); });

/* ---------- 3. every generator, many times ---------- */
function rng(seed) { return function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }
var texts = [], gensSeen = {};
function addText(s) { if (typeof s === 'string') texts.push(s); }
function boardGoal(sc, parts) {
  var r = Sim.solveCircuit({ cols: sc.cols, rows: sc.rows, parts: parts });
  if (sc.goal === 'lit') return !r.short && r.anyLit;
  if (sc.goal === 'parallel') { var b = parts.map(function (p, i) { return p.type === 'bulb' ? r.parts[i] : null; }).filter(Boolean); return !r.short && b.length >= 2 && b.every(function (x) { return x.glow > 0.9; }); }
  if (sc.goal === 'switch') {
    var sw = parts.filter(function (p) { return p.type === 'switch'; }); if (!sw.length) return false;
    sw.forEach(function (p) { p.on = false; }); var off = Sim.solveCircuit({ cols: sc.cols, rows: sc.rows, parts: parts });
    sw.forEach(function (p) { p.on = true; }); var on = Sim.solveCircuit({ cols: sc.cols, rows: sc.rows, parts: parts });
    return !on.short && on.anyLit && !off.anyLit;
  }
}
L.routes.forEach(function (route) {
  for (var n = 0; n < 300; n++) {
    var round = L.buildRound(route, rng(n * 7919 + route.id.length));
    check(round.length === 6, route.id + ' has 6 tasks');
    round.forEach(function (c) {
      var w = route.id + '/' + c.gen; gensSeen[c.gen] = 1;
      check(L.facts[c.fact], w + ' fact');
      check(c.q && /[.?…]$/.test(c.q.trim()), w + ' question ends with . or ?: ' + c.q);
      addText(c.q); addText(c.result); addText(c.hint); addText(typeof c.solution === 'string' ? c.solution : ''); addText(c.after);
      if (c.type === 'poe' || c.type === 'mc') {
        check(c.options.indexOf(c.answer) >= 0, w + ' answer among options');
        check(new Set(c.options).size === c.options.length, w + ' options unique');
        c.options.forEach(addText);
      }
      if (c.type === 'poe') {
        check(c.result && c.explain && c.explain.options.indexOf(c.explain.answer) >= 0 && new Set(c.explain.options).size === c.explain.options.length, w + ' explain');
        addText(c.explain.q); c.explain.options.forEach(addText);
        if (c.gen === 'tank-float' || c.gen === 'tank-block') {
          var rho = c.scene.rho !== undefined ? c.scene.rho : L.objects[c.scene.obj].rho;
          check((rho < L.liquids[c.scene.liquid].rho) === (c.answer === 'Flyder'), w + ' float answer matches the physics');
        }
        if (c.gen === 'board-material') { var r = Sim.solveCircuit({ cols: 3, rows: 3, parts: c.scene.parts }); check(r.anyLit === (c.answer === 'Ja, pæren lyser'), w + ' material answer matches the circuit'); }
        if (c.gen === 'board-series-par') {
          var rr = Sim.solveCircuit({ cols: 3, rows: 3, parts: c.scene.parts }), gl = rr.parts.filter(function (p) { return p.glow !== undefined; }).map(function (p) { return p.glow; });
          check(gl.length === 2 && (c.answer === 'Svagere' ? gl.every(function (x) { return x < 0.5; }) : gl.every(function (x) { return x > 0.9; })), w + ' series/parallel answer matches the circuit');
        }
        if (c.gen === 'board-series-out') {
          var before = Sim.solveCircuit({ cols: 3, rows: 3, parts: c.scene.parts }), after = Sim.solveCircuit({ cols: 3, rows: 3, parts: c.scene.parts.filter(function (p) { return p.slot !== c.scene.remove; }) });
          check(before.anyLit && !after.anyLit, w + ' removing a bulb in series turns the other off');
        }
        if (c.gen === 'board-short') check(Sim.solveCircuit({ cols: 3, rows: 3, parts: c.scene.parts }).short, w + ' is a short circuit');
        if (c.gen === 'lever-tilt') { var lt = Sim.lever(c.scene.weights).tilt; check({ left: 'Mod venstre', right: 'Mod højre', balance: 'Den er i balance' }[lt] === c.answer, w + ' tilt answer'); }
        if (c.gen === 'lever-gear-dir') { var gd = Sim.gears(c.scene.teeth), last = gd[gd.length - 1].dir * c.scene.dir; check((last > 0 ? 'Med uret' : 'Mod uret') === c.answer, w + ' gear direction'); }
        if (c.gen === 'lever-fastest') { var gs = Sim.gears(c.scene.teeth), fi = gs.reduce(function (b, x, i) { return x.turns > gs[b].turns ? i : b; }, 0); check(c.scene.labels[fi] === c.answer, w + ' fastest gear'); }
        if (c.gen === 'kitchen-cabbage') { var sub = L.substances[c.scene.sub]; check({ sur: 'Sur', neutral: 'Neutral', basisk: 'Basisk' }[Sim.acidity(sub.pH)] === c.answer, w + ' acidity'); }
      }
      if (c.type === 'calc') {
        check(isFinite(c.answer) && c.unit && c.hint && c.solution, w + ' calc fields');
        check(c.solution.indexOf(L.num(c.answer).replace(/\B(?=(\d{3})+(?!\d))/g, '.')) >= 0 || c.solution.indexOf(L.num(c.answer)) >= 0, w + ' solution shows the answer ' + c.answer + ': ' + c.solution);
        if (c.gen === 'tank-rho') check(near(c.scene.m / c.scene.V, c.answer, 0.006), w + ' density = m/V');
        if (c.gen === 'board-ohm-i') check(near(Sim.ohm({ U: c.scene.U, R: c.scene.R }), c.answer), w + ' I = U/R');
        if (c.gen === 'board-ohm-r') check(near(Sim.ohm({ U: c.scene.U, I: c.scene.I }), c.answer), w + ' R = U/I');
        if (c.gen === 'lever-calc-pos') check(c.scene.weights[0].kg * -c.scene.weights[0].pos === c.scene.ask * c.answer, w + ' moment balance (position)');
        if (c.gen === 'lever-calc-kg') check(c.scene.weights[0].kg * -c.scene.weights[0].pos === c.scene.askAt * c.answer, w + ' moment balance (mass)');
        if (c.gen === 'lever-ratio') check(c.scene.teeth[0] / c.scene.teeth[1] === c.answer, w + ' gear ratio');
        if (c.gen === 'eco-pyramid') check(c.answer >= 1 && c.answer === Math.round(c.answer), w + ' whole kJ');
      }
      if (c.type === 'build') {
        var sc = c.scene;
        if (sc.kind === 'board') {
          check(!boardGoal(sc, sc.parts.map(function (p) { return Object.assign({}, p); })), w + ' not solved from the start');
          var ps = sc.parts.map(function (p) { return Object.assign({}, p); });
          c.solution.add.forEach(function (sl, i) { ps.push({ slot: sl, type: (c.solution.types && c.solution.types[i]) || c.solution.type || 'wire', on: true }); });
          check(boardGoal(sc, ps), w + ' the shown solution works');
          var need = {}; c.solution.add.forEach(function (sl, i) { var ty = (c.solution.types && c.solution.types[i]) || c.solution.type || 'wire'; need[ty] = (need[ty] || 0) + 1; });
          Object.keys(need).forEach(function (ty) { check((sc.tools[ty] || 0) >= need[ty], w + ' enough ' + ty + ' in the tray'); });
        }
        if (sc.kind === 'lever') {
          var sol = Array.isArray(c.answer) ? c.answer : [c.answer];
          var ws = sc.weights.concat(sc.tray.map(function (kg, i) { return { pos: sol[i], kg: kg }; }));
          check(Sim.lever(ws).tilt === 'balance' && sol.every(function (p) { return p >= 1 && p <= 5; }), w + ' the lever solution balances');
          check(Sim.lever(sc.weights).tilt === 'left', w + ' starts tilted');
        }
        if (sc.kind === 'boat') {
          var capG = Sim.boatCapacity(sc.V, sc.m, L.liquids[sc.liquid].rho);
          check(c.answer * sc.w <= capG + 1e-9 && (c.answer + 1) * sc.w > capG && c.answer >= 3, w + ' boat max load');
        }
        if (sc.kind === 'thermo') { check(c.check(sc.goal === 'koge' ? 100 : sc.goal === 'smelte' ? 20 : -10) && !c.check(sc.start), w + ' thermo goal'); }
        if (sc.kind === 'titration') { check(c.answer === Math.round(c.answer) && Sim.titration(sc.ca, sc.va, sc.cb, c.answer) === 7, w + ' titration end point'); }
      }
      if (c.type === 'order') { check(new Set(c.items.map(function (x) { return x.id; })).size === c.items.length && c.items.length >= 3, w + ' order items'); c.items.forEach(function (x) { addText(x.name); }); }
      if (c.type === 'sort') {
        c.items.forEach(function (x) { check(c.bins.some(function (b) { return b.id === x.bin; }), w + ' sort bin for ' + x.name); addText(x.name); });
        c.bins.forEach(function (b) { addText(b.name); });
        check(new Set(c.items.map(function (x) { return x.id; })).size === c.items.length, w + ' sort items unique');
      }
    });
  }
});
Object.keys(L.gen).forEach(function (g) { check(gensSeen[g], 'generator ' + g + ' is used in a route'); });

/* ---------- 4. Danish spelling ---------- */
Object.keys(L.facts).forEach(function (k) { addText(L.facts[k].t); addText(L.facts[k].x); });
L.routes.forEach(function (r) { addText(r.name); }); L.stations.forEach(function (s) { addText(s.name); addText(s.desc); });
(function walk(o) { if (typeof o === 'string') addText(o); else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { walk(o[k]); }); })(S);
var ALLOW = ['Laboratoriet', 'Bob', 'BTB', 'kJ', 'cm', 'ml', 'mol', 'L', 'V', 'A', 'U', 'R', 'I', 'pH', 'Ohms', 'ohm', 'Ω', 'ca', 'papirclips', 'Papirclips', 'Papirclipsen', 'bromthymolblåt', 'Bromthymolblåt'];
var words = {};
texts.forEach(function (s) { (s.replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉé]+/g) || []).forEach(function (w) { if (ALLOW.indexOf(w) < 0 && w.length > 1) words[w] = 1; }); });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: Object.keys(words).join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
bad = Array.from(new Set(bad));
check(!bad.length, 'unknown words: ' + bad.join(', '));

console.log(fails ? fails + ' FAILURES (' + checks + ' checks)' : 'Laboratoriet: all ' + checks + ' checks passed (' + Object.keys(words).length + ' distinct words spell-checked)');
process.exit(fails ? 1 : 0);
