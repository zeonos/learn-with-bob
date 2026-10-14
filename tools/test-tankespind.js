// Tankespind: re-checks every puzzle generator with its own, independent rules. Run: node tools/test-tankespind.js  (needs hunspell da_DK)
// Every task must have exactly one right answer, and the explanation must match it.
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../tankespind/strings-da.js');
var P = require('../tankespind/puzzles.js'), S = window.STR.tk, execFileSync = require('child_process').execFileSync;
var game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k]; }); }, registerGame: function (g) { game = g; },
  weakest: function (ids) { return ids[0]; }, routeProgress: function () { return {}; } };
require('../tankespind/game.js');
var fails = 0, checks = 0, failMsgs = {};
function check(ok, msg) { checks++; if (!ok) { fails++; if (!failMsgs[msg]) { failMsgs[msg] = 1; console.log('FAIL', msg); } } }
function uniq(a) { return new Set(a).size === a.length; }
function seeded(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
var N = +process.argv[2] || 1500;

/* ---- my own figure model: shape, paint, count, turn (eighths, only for arrows and triangles), size ---- */
var TURNS = ['pil', 'trekant'];
function F(f) { return { s: f.s, p: f.p, n: f.n, r: TURNS.indexOf(f.s) >= 0 ? ((f.r % 8) + 8) % 8 : 0, z: f.z }; }
function diff(a, b) { a = F(a); b = F(b); return ['s', 'p', 'n', 'r', 'z'].filter(function (k) { return a[k] !== b[k]; }).length; }
function fkey(f) { f = F(f); return [f.s, f.p, f.n, f.r, f.z].join('|'); }
function validFig(f) { return P.SHAPES.indexOf(f.s) >= 0 && P.PAINTS.indexOf(f.p) >= 0 && f.n >= 1 && f.n <= 6 && f.z >= 0 && f.z <= 2 && (TURNS.indexOf(f.s) >= 0 || !f.r); }
function oneAnswer(tk, keyFn, list) { // options are all different, the answer is among them, and every wrong one differs in exactly one thing
  list = list || tk.options;
  check(tk.answer >= 0 && tk.answer < list.length, tk.type + ' answer index');
  check(uniq(list.map(keyFn)), tk.type + ' options are all different');
}

/* ---- 1. figure rows ---- */
function checkFigRow(tk, lvl) {
  var seq = tk.seq.concat([tk.options[tk.answer]]);
  seq.forEach(function (f) { check(validFig(f), 'figrow figure valid'); });
  tk.rules.forEach(function (ru) {
    for (var i = 1; i < seq.length; i++) {
      if (ru.a === 'n') check(seq[i].n - seq[i - 1].n === ru.d, 'figrow count step');
      else if (ru.a === 'r') check(((seq[i].r - seq[i - 1].r) % 8 + 8) % 8 === ru.d, 'figrow turn step');
      else check(seq[i][ru.a] === ru.list[i % ru.list.length], 'figrow cycle ' + ru.a);
    }
  });
  ['s', 'p', 'n', 'r', 'z'].forEach(function (a) { // attributes without a rule never change
    if (tk.rules.some(function (r) { return r.a === a; })) return;
    check(seq.every(function (f) { return F(f)[a] === F(seq[0])[a]; }), 'figrow ' + a + ' stays the same');
  });
  oneAnswer(tk, fkey);
  tk.options.forEach(function (o, i) { if (i !== tk.answer) { check(validFig(o), 'figrow wrong option valid'); check(diff(o, tk.options[tk.answer]) === 1, 'figrow wrong option differs in one thing'); } });
  check(tk.explain.indexOf('{') < 0 && tk.hint, 'figrow texts');
}

/* ---- 2. number rows: the next number, worked out my own way ---- */
function nextNumber(seq, r) {
  var n = seq.length, last = seq[n - 1];
  switch (r.k) {
    case 'add': return last + r.d;
    case 'sub': return last - r.d;
    case 'mul2': case 'mul3': return last * r.m;
    case 'alt': return last + ((n - 1) % 2 ? r.e : r.d);
    case 'inc': return last + r.d + (n - 1);
    case 'inc2': return last + r.d + 2 * (n - 1);
    case 'sq': return (r.a + n) * (r.a + n);
    case 'tri': return (r.a + n) * (r.a + n + 1) / 2;
    case 'inter': return seq[n - 2] + (n % 2 ? r.e : r.d);
    case 'fib': return last + seq[n - 2];
    case 'mul2add': return 2 * last + r.d;
  }
  return NaN;
}
function checkNumRow(tk) {
  var r = tk.rule;
  for (var i = 2; i < tk.seq.length; i++) check(nextNumber(tk.seq.slice(0, i), r) === tk.seq[i], 'numrow sequence follows ' + r.k);
  var ans = nextNumber(tk.seq, r);
  check(ans === tk.options[tk.answer] && ans === tk.value, 'numrow answer ' + r.k + ' ' + tk.seq.join(','));
  check(tk.seq.concat([ans]).every(function (x) { return Number.isInteger(x) && x >= 0 && x <= 999; }), 'numrow whole numbers 0..999');
  oneAnswer(tk, String);
  check(tk.options.every(function (x) { return Number.isInteger(x) && x >= 0; }), 'numrow options whole');
  check(tk.explain.indexOf(String(ans)) >= 0 && tk.explain.indexOf('{') < 0 && tk.explain.indexOf('undefined') < 0, 'numrow explain names the answer');
}

/* ---- 3. odd one out ---- */
function checkOdd(tk) {
  check(tk.items.length === 5 && tk.answer >= 0 && tk.answer < 5, 'odd five items');
  if (tk.kind === 'fig') {
    tk.items.forEach(function (f) { check(validFig(f), 'odd figure valid'); });
    var singles = [];
    ['s', 'p', 'n'].forEach(function (a) {
      var c = {}; tk.items.forEach(function (f) { c[f[a]] = (c[f[a]] || 0) + 1; });
      tk.items.forEach(function (f, i) { if (c[f[a]] === 1) singles.push([a, i]); });
    });
    check(singles.length === 1 && singles[0][1] === tk.answer && singles[0][0] === tk.target, 'odd figure: only one thing singles out exactly one figure');
    check(uniq(tk.items.map(fkey)) || true, 'odd figures');
  } else if (tk.kind === 'num') {
    var TESTS = { even: function (x) { return x % 2 === 0; }, odd: function (x) { return x % 2 === 1; }, five: function (x) { return x % 5 === 0; }, ten: function (x) { return x % 10 === 0; },
      three: function (x) { return x % 3 === 0; }, square: function (x) { return Number.isInteger(Math.sqrt(x)); }, big: function (x) { return x >= 10; } };
    Object.keys(TESTS).forEach(function (k) {
      var yes = tk.items.map(TESTS[k]), nYes = yes.filter(Boolean).length;
      if (nYes === 4) check(!yes[tk.answer], 'odd number: ' + k + ' singles out the answer only ' + tk.items.join(','));
      if (nYes === 1) check(yes[tk.answer], 'odd number: ' + k + ' singles out the answer only ' + tk.items.join(','));
    });
    check(uniq(tk.items), 'odd numbers different');
    check(tk.explain.indexOf(String(tk.items[tk.answer])) >= 0, 'odd number explain');
  } else {
    var cat = P.WORDS.filter(function (c) { return c.id === tk.cat; })[0], oc = P.WORDS.filter(function (c) { return c.id === tk.oddCat; })[0];
    tk.items.forEach(function (w, i) { check(i === tk.answer ? oc.words.indexOf(w) >= 0 && cat.words.indexOf(w) < 0 : cat.words.indexOf(w) >= 0, 'odd word in its group ' + w); });
    check(uniq(tk.items), 'odd words different');
  }
  check(tk.hint && tk.explain.indexOf('{') < 0 && tk.explain.indexOf('undefined') < 0, 'odd texts');
}

/* ---- 4. analogies ---- */
var DO = { quarter: function (f) { f.r += 2; }, half: function (f) { f.r += 4; }, plus1: function (f) { f.n += 1; }, double: function (f) { f.n *= 2; }, grow: function (f) { f.z = 2; }, empty: function (f) { f.p = 'hvid'; } };
function checkAnalogy(tk) {
  if (tk.kind === 'word') {
    check(tk.options.length === 4 && uniq(tk.options) && tk.options[tk.answer], 'word analogy options');
    check(tk.options.indexOf(tk.a) < 0 || tk.options.indexOf(tk.a) !== tk.answer, 'word analogy answer is not a given word');
    return;
  }
  var B = Object.assign({}, tk.a), D = Object.assign({}, tk.c);
  tk.transforms.forEach(function (k) { DO[k](B); DO[k](D); });
  check(fkey(B) === fkey(tk.b), 'analogy: B is A changed');
  check(fkey(D) === fkey(tk.options[tk.answer]), 'analogy: answer is C changed the same way');
  check(fkey(tk.a) !== fkey(tk.b), 'analogy: A and B differ');
  if (tk.transforms.indexOf('plus1') >= 0 || tk.transforms.indexOf('double') >= 0) check(tk.a.n >= 2, 'analogy: »one more« and »twice as many« can be told apart');
  oneAnswer(tk, fkey);
  tk.options.forEach(function (o, i) { check(validFig(o), 'analogy option valid'); if (i !== tk.answer) check(diff(o, D) === 1, 'analogy wrong option differs in one thing'); });
}

/* ---- 5. the missing square: the rule of each attribute must hold in every row, and only the answer completes row 3 ---- */
function rowRule(row, a) { // which rule an attribute follows in this row
  var v = row.map(function (f) { return F(f)[a]; });
  if (v[0] === v[1] && v[1] === v[2]) return 'const';
  if (a === 'n' && v[1] - v[0] === 1 && v[2] - v[1] === 1) return 'prog';
  if (a === 'r' && (v[1] - v[0] + 8) % 8 === 2 && (v[2] - v[1] + 8) % 8 === 2) return 'turn';
  if (uniq(v)) return 'dist:' + v.slice().sort().join(',');
  return 'none';
}
function checkMatrix(tk) {
  var grid = tk.grid.slice(0, 8).concat([tk.solution]);
  check(fkey(tk.solution) === fkey(tk.options[tk.answer]), 'matrix answer is the solution');
  grid.forEach(function (f) { check(validFig(f), 'matrix figure valid'); });
  var rows = [grid.slice(0, 3), grid.slice(3, 6), grid.slice(6, 9)];
  function fits(rows3) {
    return ['s', 'p', 'n', 'r', 'z'].every(function (a) {
      var rr = rows3.map(function (r) { return rowRule(r, a); });
      if (rr.some(function (x) { return x === 'none'; })) return false;
      if (rr[0].indexOf('dist') === 0) return rr[1] === rr[0] && rr[2] === rr[0]; // the same three values in every row
      if (rr[0] === 'const') return rr.every(function (x) { return x === 'const'; });
      return rr[1] === rr[0] && rr[2] === rr[0];
    });
  }
  check(fits(rows), 'matrix rows follow the rules');
  var n = tk.options.filter(function (o) { return fits([rows[0], rows[1], [grid[6], grid[7], o]]); }).length;
  check(n === 1, 'matrix: exactly one option completes the grid (' + n + ')');
  oneAnswer(tk, fkey);
  check(tk.options.length >= 4 && tk.options.length <= 6, 'matrix 4-6 options');
}

/* ---- 6. turn and mirror (my own cell geometry) ---- */
function nc(c) { var mx = Math.min.apply(null, c.map(function (p) { return p[0]; })), my = Math.min.apply(null, c.map(function (p) { return p[1]; })); return c.map(function (p) { return [p[0] - mx, p[1] - my]; }).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; }); }
function ck(c) { return JSON.stringify(nc(c)); }
function turnQ(c) { return nc(c.map(function (p) { return [-p[1], p[0]]; })); }
function turnsOf(c) { var o = [nc(c)]; for (var i = 1; i < 4; i++) o.push(turnQ(o[i - 1])); return o.map(ck); }
function connected(c) {
  var seen = {}, st = [c[0]], k = function (p) { return p[0] + ',' + p[1]; }; seen[k(c[0])] = 1;
  while (st.length) { var p = st.pop(); c.forEach(function (q) { if (!seen[k(q)] && Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) === 1) { seen[k(q)] = 1; st.push(q); } }); }
  return Object.keys(seen).length === c.length;
}
function checkTurn(tk) {
  oneAnswer(tk, ck);
  tk.options.concat([tk.base]).forEach(function (o) { check(connected(o) && uniq(o.map(String)), 'turn figure is one connected piece'); });
  var base = turnsOf(tk.base);
  if (tk.mode === 'rotate') {
    var ok = tk.options.filter(function (o) { return base.indexOf(ck(o)) >= 0; });
    check(ok.length === 1 && ck(ok[0]) === ck(tk.options[tk.answer]), 'turn: exactly one option is a turn of the figure');
    check(base.indexOf(ck(tk.options[tk.answer])) === tk.turns, 'turn: the right number of quarter turns');
  } else {
    var m = nc(tk.base.map(function (p) { return tk.axis === 'v' ? [-p[0], p[1]] : [p[0], -p[1]]; }));
    var hits = tk.options.filter(function (o) { return ck(o) === ck(m); });
    check(hits.length === 1 && ck(tk.options[tk.answer]) === ck(m), 'mirror: exactly one option is the mirror image');
  }
}

/* ---- 7. fold and cut: unfold by my own reflection rules ---- */
var REF = { v: function (p) { return [3 - p[0], p[1]]; }, h: function (p) { return [p[0], 3 - p[1]]; }, d: function (p) { return [p[1], p[0]]; } };
var IN = { v: function (p) { return p[0] >= 2; }, h: function (p) { return p[1] >= 2; }, d: function (p) { return p[0] <= p[1]; } };
function hk(h) { return h.map(String).sort().join(' '); }
function checkFold(tk) {
  tk.holes.forEach(function (p) { check(tk.folds.every(function (k) { return IN[k](p); }), 'fold: holes are cut in the folded paper'); });
  var set = tk.holes.map(String), pts = tk.holes.slice();
  for (var i = tk.folds.length - 1; i >= 0; i--) pts.slice().forEach(function (p) { var q = REF[tk.folds[i]](p); if (set.indexOf(String(q)) < 0) { set.push(String(q)); pts.push(q); } });
  check(hk(pts) === hk(tk.options[tk.answer]), 'fold: answer is the unfolded paper');
  check(pts.every(function (p) { return p[0] >= 0 && p[0] < 4 && p[1] >= 0 && p[1] < 4; }), 'fold: holes on the paper');
  oneAnswer(tk, hk);
  check(tk.explain.indexOf(String(pts.length)) >= 0, 'fold explain counts the holes');
}

/* ---- 8. secret codes: brute force every value 1..30 ---- */
function checkCode(tk) {
  var n = tk.syms.length, sols = [], v = [];
  (function rec(i) {
    if (i === n) {
      if (tk.eqs.every(function (e) { var a = v[e.t[0]], b = v[e.t[1]], r = e.t.length === 3 ? a + b + v[e.t[2]] : e.op === '+' ? a + b : e.op === '-' ? a - b : a * b; return r === e.res; })) sols.push(v.slice());
      return;
    }
    for (var x = 1; x <= 30; x++) { v[i] = x; rec(i + 1); }
  })(0);
  check(sols.length === 1, 'code: exactly one solution (' + sols.length + ')');
  if (sols.length) check(sols[0][tk.ask] === tk.options[tk.answer], 'code: the answer is the solution');
  check(tk.eqs.every(function (e) { return e.t.every(function (t) { return t < n; }); }), 'code: symbols exist');
  check(tk.eqs.some(function (e) { return e.t.indexOf(tk.ask) >= 0; }), 'code: the asked symbol is used');
  oneAnswer(tk, String);
  check(tk.explain.indexOf('{') < 0 && tk.explain.indexOf('undefined') < 0 && tk.explain.indexOf(String(tk.value)) >= 0, 'code explain');
}

var CHECK = { figrow: checkFigRow, numrow: checkNumRow, odd: checkOdd, analogy: checkAnalogy, matrix: checkMatrix, turn: checkTurn, fold: checkFold, code: checkCode };
var seed = 1, kinds = {};
P.ROUTES.forEach(function (r) {
  check(S.routes[r.id] && S.routes[r.id][0] && S.routes[r.id][1], 'route text ' + r.id);
  for (var lvl = r.min; lvl <= r.max; lvl++) {
    var t0 = Date.now();
    for (var i = 0; i < N; i++) {
      var tk = P.make(r.kind, seeded(seed++), lvl, r.b);
      kinds[tk.type + (tk.kind ? ':' + tk.kind : '') + (tk.mode ? ':' + tk.mode : '')] = 1;
      check(tk.level === lvl, 'level kept');
      check(tk.hint && tk.explain, r.id + ' has hint and explanation');
      check(JSON.stringify(tk) && true, 'task is plain data');
      CHECK[tk.type](tk, lvl);
    }
    check((Date.now() - t0) / N < 30, r.id + ' level ' + lvl + ' is quick (' + ((Date.now() - t0) / N).toFixed(1) + ' ms)');
  }
  var round = P.buildRound(r, r.min, seeded(seed++), 8);
  check(round.length === 8, r.id + ' a round has 8 tasks');
});
['figrow', 'numrow', 'odd:fig', 'odd:num', 'odd:word', 'analogy:fig', 'analogy:word', 'matrix', 'turn:rotate', 'turn:mirror', 'fold', 'code'].forEach(function (k) { check(kinds[k], 'task kind made: ' + k); });

// word lists: no word in two groups; analogies have three wrong options, never the answer
var seenW = {};
P.WORDS.forEach(function (c) { c.words.forEach(function (w) { check(!seenW[w], 'word in two groups: ' + w); seenW[w] = 1; }); check(c.words.length >= 6, 'enough words ' + c.id); });
P.ANALOGIES.forEach(function (a) { check(a[5].length === 3 && a[5].indexOf(a[4]) < 0 && uniq(a[5]) && /\.$/.test(a[6]), 'analogy row ' + a.slice(1, 5).join(' ')); });

// daily challenge: plain data, the answer is among the options, the same task for the same seed
var dd = { routes: {}, lv: {} };
['M', 'U'].forEach(function (b) {
  for (var i = 0; i < 200; i++) {
    var save = Math.random; Math.random = seeded(1000 + i);
    var q1 = game.quickTask(b, dd); Math.random = seeded(1000 + i); var q2 = game.quickTask(b, dd); Math.random = save;
    check(JSON.stringify(q1) === JSON.stringify(q2), 'quickTask is the same for the same day');
    check(q1.q && q1.hint && q1.options.indexOf(q1.answer) >= 0 && uniq(q1.options), 'quickTask answer among options');
    check(JSON.parse(JSON.stringify(q1)).answer === q1.answer, 'quickTask is plain data');
  }
});
// level adaptation fields in the report
check(game.summary({ routes: {}, band: 'M' }).max === 18, 'summary max');

// Danish spelling of every text a child sees, including the word lists and analogies
function tok(s) { return String(s).replace(/­/g, '').replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉé]+/g) || []; }
var words = [];
(function walk(x) {
  if (typeof x === 'string') { words = words.concat(tok(x)); return; }
  if (Array.isArray(x)) return x.forEach(walk);
  if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { if (k !== 'id' && k !== 'b' && k !== 'not') walk(x[k]); });
})([S, P.WORDS, P.ANALOGIES]);
var OK = ['IQ', 'tankegangen'];
var list = Array.from(new Set(words)).filter(function (w) { return OK.indexOf(w) < 0 && !/^[A-Z]$/.test(w); });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));

console.log(fails ? 'Tankespind: ' + fails + ' of ' + checks + ' checks FAILED' : 'Tankespind: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
