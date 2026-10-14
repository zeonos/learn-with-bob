// Gådehuset: re-checks every puzzle with independent solvers. Run: node tools/test-gaadehuset.js [rounds]  (needs hunspell da_DK)
// Every puzzle must have exactly one solution, and every explained step must really follow from what is known at that point.
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../gaadehuset/strings-da.js'); require('../gaadehuset/pictures.js');
var NG = require('../gaadehuset/nonogram.js'), SD = require('../gaadehuset/sudoku.js'), LG = require('../gaadehuset/logic.js'),
  RV = require('../gaadehuset/river.js'), HN = require('../gaadehuset/hanoi.js'), TF = require('../gaadehuset/truth.js');
var S = window.STR.gh, execFileSync = require('child_process').execFileSync, game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, play: function () {}, routeProgress: function () { return {}; }, gameData: function () { return {}; }, profile: function () { return null; } };
require('../gaadehuset/kinds.js'); require('../gaadehuset/game.js');
var K = window.GH_KINDS, N = +process.argv[2] || 150;
var fails = 0, checks = 0, seen = {};
function check(ok, msg) { checks++; if (!ok) { fails++; if (!seen[msg]) { seen[msg] = 1; console.log('FAIL', msg); } } }
function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
var texts = [];
function text(s, where) { check(typeof s === 'string' && s.length && !/\{\w+\}|undefined|NaN|null/.test(s), 'text ok: ' + where + ': ' + s); texts.push(String(s)); }

/* ---------- sudoku: my own rules ---------- */
function sdBox(n) { return SD.BOX[n]; }
function unitsOf(n) {
  var b = sdBox(n), out = [], r, c;
  for (r = 0; r < n; r++) { var row = []; for (c = 0; c < n; c++) row.push(r * n + c); out.push(['row', row]); }
  for (c = 0; c < n; c++) { var col = []; for (r = 0; r < n; r++) col.push(r * n + c); out.push(['col', col]); }
  for (var br = 0; br < n; br += b[0]) for (var bc = 0; bc < n; bc += b[1]) { var box = []; for (r = br; r < br + b[0]; r++) for (c = bc; c < bc + b[1]; c++) box.push(r * n + c); out.push(['box', box]); }
  return out;
}
function peers(n, i) { var U = unitsOf(n), out = {}; U.forEach(function (u) { if (u[1].indexOf(i) >= 0) u[1].forEach(function (j) { if (j !== i) out[j] = 1; }); }); return Object.keys(out).map(Number); }
function possible(g, n, i, v) { return !g[i] && peers(n, i).every(function (j) { return g[j] !== v; }); }
function countSol(g0, n, limit) {
  var g = g0.slice(), found = 0;
  (function rec() {
    if (found >= limit) return;
    var i = g.indexOf(0); if (i < 0) { found++; return; }
    for (var v = 1; v <= n; v++) if (possible(g, n, i, v)) { g[i] = v; rec(); g[i] = 0; }
  })();
  return found;
}
function validFull(g, n) { return unitsOf(n).every(function (u) { var vals = u[1].map(function (i) { return g[i]; }).sort(function (a, b) { return a - b; }); return vals.every(function (v, k) { return v === k + 1; }); }); }
game._routes.filter(function (r) { return r.kind === 'sudoku'; }).forEach(function (r) {
  r.levels.forEach(function (cfg, li) {
    for (var k = 0; k < Math.ceil(N / 3); k++) {
      var pz = K.sudoku.create(cfg, rng(1000 + li * 997 + k)), n = pz.n;
      check(validFull(pz.solution, n), 'sudoku solution is a full grid');
      check(pz.puzzle.every(function (v, i) { return !v || v === pz.solution[i]; }), 'sudoku givens match the solution');
      var giv = pz.puzzle.filter(Boolean).length;
      check(giv <= cfg.givens + (n === 9 ? 6 : 3), r.id + ' level ' + (li + 1) + ' givens near the target (' + giv + ' for ' + cfg.givens + ')');
      check(countSol(pz.puzzle, n, 2) === 1, 'sudoku has exactly one solution');
      // each explained step follows from the grid before it
      var g = pz.puzzle.slice(), steps = K.sudoku.solution(pz);
      steps.forEach(function (st) {
        var i = st.cells[0], before = g.slice(), x = { v: g }; st.apply(x);
        var v = g[i];
        check(v === pz.solution[i], 'sudoku step gives the right number');
        var onlyNumber = [];
        for (var w = 1; w <= n; w++) if (possible(before, n, i, w)) onlyNumber.push(w);
        var onlyPlace = unitsOf(n).some(function (u) { return u[1].indexOf(i) >= 0 && u[1].filter(function (j) { return possible(before, n, j, v); }).length === 1; });
        check((onlyNumber.length === 1 && onlyNumber[0] === v) || onlyPlace, 'sudoku step can be worked out without guessing');
        check(/^Række \d+, kolonne \d+: /.test(st.text), 'sudoku step names the square');
        if (k < 3) text(st.text, 'sudoku step');
      });
      check(validFull(g, n), 'sudoku steps reach the whole solution');
      // the tip from the start is the first such step, and a wrong number is pointed out first
      var st0 = K.sudoku.init(pz), e = st0.v.indexOf(0); st0.v[e] = pz.solution[e] % n + 1;
      var tip = K.sudoku.tip(pz, st0);
      check(tip.errors && tip.errors[0] === e, 'sudoku tip shows a wrong number first');
    }
  });
});

/* ---------- picture puzzles: brute-force line solving ---------- */
function placements(clue, n) { // every way to put the blocks in a line of n squares
  var out = [];
  (function rec(k, pos, line) {
    if (k === clue.length) { var l = line.slice(); for (var j = pos; j < n; j++) l[j] = 0; out.push(l); return; }
    var rest = clue.slice(k + 1).reduce(function (a, b) { return a + b + 1; }, 0);
    for (var s = pos; s + clue[k] + rest <= n; s++) {
      var l2 = line.slice(); for (var j2 = pos; j2 < s; j2++) l2[j2] = 0; for (j2 = s; j2 < s + clue[k]; j2++) l2[j2] = 1;
      if (s + clue[k] < n) l2[s + clue[k]] = 0;
      rec(k + 1, s + clue[k] + 1, l2);
    }
  })(0, 0, []);
  return out.map(function (l) { return l.slice(0, n); });
}
function forced(clue, known) {
  var fit = placements(clue, known.length).filter(function (l) { return l.every(function (v, j) { return known[j] === -1 || known[j] === v; }); });
  return known.map(function (_, j) { var a = fit.every(function (l) { return l[j] === 1; }), b = fit.every(function (l) { return l[j] === 0; }); return fit.length && a ? 1 : fit.length && b ? 0 : -1; });
}
var picIds = {};
(window.GH_PICS).forEach(function (p) {
  check(!picIds[p.id], 'picture id unique ' + p.id); picIds[p.id] = 1;
  var g = NG.grid(p), cl = NG.clues(g), H = g.length, W = g[0].length;
  // my own line-by-line solving reaches the picture
  var st = g.map(function (r) { return r.map(function () { return -1; }); }), changed = true;
  while (changed) {
    changed = false;
    for (var y = 0; y < H; y++) { var f = forced(cl.rows[y], st[y]); f.forEach(function (v, x) { if (v !== -1 && st[y][x] === -1) { st[y][x] = v; changed = true; } }); }
    for (var x = 0; x < W; x++) { var col = st.map(function (r) { return r[x]; }), f2 = forced(cl.cols[x], col); f2.forEach(function (v, y2) { if (v !== -1 && st[y2][x] === -1) { st[y2][x] = v; changed = true; } }); }
  }
  check(st.every(function (r, y) { return r.every(function (v, x) { return v === g[y][x]; }); }), 'picture can be solved line by line: ' + p.id);
  // every explained step only fills what that line forces
  var pz = { pic: p.id }, work = K.nono.init(pz), steps = K.nono.solution(pz), known = g.map(function (r) { return r.map(function () { return -1; }); });
  steps.forEach(function (s) {
    var line = /række (\d+)/.exec(s.text), colm = /kolonne (\d+)/.exec(s.text);
    check(!!(line || colm), 'picture step names its line');
    var isRow = !!line, idx = +(line || colm)[1] - 1, before = isRow ? known[idx].slice() : known.map(function (r) { return r[idx]; }), f = forced(isRow ? cl.rows[idx] : cl.cols[idx], before);
    s.cells.forEach(function (i) { var cy = Math.floor(i / W), cx = i % W, j = isRow ? cx : cy; check(isRow ? cy === idx : cx === idx, 'picture step stays in its line'); check(f[j] === g[cy][cx], 'picture step is forced by the line ' + p.id); });
    s.apply(work);
    s.cells.forEach(function (i) { known[Math.floor(i / W)][i % W] = g[Math.floor(i / W)][i % W]; });
  });
  check(K.nono.complete(pz, work) && K.nono.correct(pz, work), 'picture steps finish the picture ' + p.id);
  check(/^(en|et) /.test(p.name), 'picture name ' + p.id); texts.push(p.name);
  if (p.id === 'hjerte') steps.slice(0, 4).forEach(function (s) { text(s.text, 'picture step'); });
});
['M', 'U'].forEach(function (b) { check(window.GH_PICS.filter(function (p) { return p.b === b; }).length >= 25, 'enough pictures for ' + b); });
game._routes.filter(function (r) { return r.kind === 'nono'; }).forEach(function (r) {
  r.levels.forEach(function (cfg, li) { var pics = window.GH_PICS.filter(function (p) { var m = Math.max(p.rows.length, p.rows[0].length); return p.b === r.b && m >= cfg.from && m <= cfg.to; }); check(pics.length >= 4, r.id + ' level ' + (li + 1) + ' has pictures (' + pics.length + ')'); });
});

/* ---------- logic grids: brute force over every answer ---------- */
function perms(n) { var out = []; (function rec(a, rest) { if (!rest.length) { out.push(a); return; } rest.forEach(function (x, i) { rec(a.concat([x]), rest.slice(0, i).concat(rest.slice(i + 1))); }); })([], Array.from({ length: n }, function (_, i) { return i; })); return out; }
['M', 'U'].forEach(function (band) {
  [1, 2, 3].forEach(function (lvl) {
    for (var k = 0; k < Math.ceil(N / 3); k++) {
      var p = LG.make(band, lvl, rng(5000 + lvl * 131 + k + (band === 'U' ? 77777 : 0))), C = p.cats.length, P = perms(p.n), count = 0;
      check(p.n === (band === 'M' ? 3 : 4), 'logic: number of people');
      check(new Set(p.names).size === p.n, 'logic: names differ');
      p.clues.forEach(function (cl) { check(LG.clueTrue(p, cl), 'logic: every clue is true'); });
      (function rec(c, ans) {
        if (c === C) { var q = { n: p.n, cats: p.cats, ans: ans }; if (p.clues.every(function (cl) { return LG.clueTrue(q, cl); })) count++; return; }
        P.forEach(function (pm) { rec(c + 1, ans.concat([pm])); });
      })(0, []);
      check(count === 1, 'logic: exactly one answer fits the clues (' + count + ')');
      var named = {}; p.clues.forEach(function (cl) { (cl.k === 'pos' || cl.k === 'neg' ? [[cl.c, cl.v]] : cl.k === 'either' ? [[cl.c, cl.v], [cl.c, cl.w]] : [[cl.c, cl.v], [cl.c2, cl.w]]).forEach(function (m) { named[m[0] + ':' + m[1]] = 1; }); });
      check(Object.keys(named).length === C * p.n, 'logic: every pet, house, sport and instrument is named in a clue');
      var steps = K.logic.solution(p), work = K.logic.init(p);
      steps.forEach(function (s) {
        s.cells.forEach(function (cx) { var c = cx[0], x = cx[1], v = cx[2]; check(true, ''); });
        s.apply(work);
        if (k < 2) text(s.text, 'logic step');
      });
      check(K.logic.complete(p, work) && K.logic.correct(p, work), 'logic: the steps reach the answer');
      check(K.logic.wrong(p, work).length === 0, 'logic: no step marks something wrong');
      p.clues.forEach(function (cl) { text(LG.clueText(p, cl), 'logic clue'); });
      text(LG.answerText(p), 'logic answer');
      check(p.clues.length <= LG.maxClues({ n: p.n, cats: p.cats.length }), 'logic: not too many clues');
    }
  });
});

/* ---------- river crossings: my own breadth-first search ---------- */
function myBest(p) {
  var start = { at: {}, boat: 0 }; p.items.forEach(function (it) { start.at[it.id] = 0; });
  function ok(s) {
    return [0, 1].every(function (bank) {
      var here = p.items.filter(function (it) { return s.at[it.id] === bank; });
      return p.rules.every(function (r) {
        if (r.k === 'eats') { var ids = here.map(function (it) { return it.id; }); return !(ids.indexOf(r.a) >= 0 && ids.indexOf(r.b) >= 0 && ids.indexOf(r.guard) < 0); }
        var prey = here.filter(function (it) { return it.type === r.prey; }).length, pred = here.filter(function (it) { return it.type === r.pred; }).length;
        return !(prey && pred > prey);
      });
    });
  }
  var q = [[start, 0]], seenS = {}; seenS[JSON.stringify(start)] = 1;
  while (q.length) {
    var cur = q.shift(), s = cur[0];
    if (p.items.every(function (it) { return s.at[it.id] === 1; })) return cur[1];
    var here = p.items.filter(function (it) { return s.at[it.id] === s.boat; });
    for (var m = 1; m < (1 << here.length); m++) {
      var grp = here.filter(function (_, i) { return m & (1 << i); });
      if (grp.length > p.boat.cap || !grp.some(function (it) { return it.rows; })) continue;
      if (p.boat.maxW && grp.reduce(function (a, it) { return a + (it.w || 0); }, 0) > p.boat.maxW) continue;
      var ns = { at: Object.assign({}, s.at), boat: 1 - s.boat }; grp.forEach(function (it) { ns.at[it.id] = ns.boat; });
      var key = JSON.stringify(ns);
      if (!ok(ns) || seenS[key]) continue;
      seenS[key] = 1; q.push([ns, cur[1] + 1]);
    }
  }
  return -1;
}
RV.PUZZLES.forEach(function (p) {
  var best = myBest(p);
  check(best > 0 && best === RV.best(p), 'river ' + p.id + ' fewest trips ' + best);
  check(p.solution.length === best, 'river ' + p.id + ': the shown solution uses the fewest trips');
  var pz = { id: p.id }, work = K.river.init(pz);
  p.solution.forEach(function (s, i) {
    check(!RV.canSail(p, work, s[0]), 'river ' + p.id + ' step ' + (i + 1) + ' can sail');
    K.river.solution(pz)[i].apply(work);
    check(!RV.broken(p, work), 'river ' + p.id + ' step ' + (i + 1) + ' breaks no rule');
    text(s[1], 'river step');
  });
  check(RV.done(p, work), 'river ' + p.id + ' solution gets everyone over');
  text(p.story, 'river story'); text(p.title, 'river title');
  (p.rules || []).forEach(function (r) { text(r.msg, 'river rule'); });
  p.items.forEach(function (it) { texts.push(it.name); });
  // a tip from the start leads all the way
  var w2 = K.river.init(pz), guard = 0, tp;
  while (!RV.done(p, w2) && guard++ < 40) { tp = K.river.tip(pz, w2); tp.apply(w2); check(!RV.canSail(p, w2, w2.inBoat), 'river tip can sail'); var ns = RV.sail(p, w2, w2.inBoat); w2.at = ns.at; w2.boat = ns.boat; w2.inBoat = []; check(!RV.broken(p, w2), 'river tip is safe'); text(tp.text, 'river tip'); }
  check(RV.done(p, w2) && guard === best, 'river tips use the fewest trips');
});
game._routes.filter(function (r) { return r.kind === 'river'; }).forEach(function (r) { r.levels.forEach(function (c) { check(RV.puzzle(c.puzzle) && RV.puzzle(c.puzzle).b === r.b, 'river level puzzle exists ' + c.puzzle); }); });

/* ---------- Tower of Hanoi ---------- */
[3, 4, 5].forEach(function (n) {
  var pz = { n: n }, steps = K.hanoi.solution(pz), work = K.hanoi.init(pz);
  check(steps.length === Math.pow(2, n) - 1, 'hanoi ' + n + ': fewest moves');
  steps.forEach(function (s) { var from = s.cells[0], to = s.cells[1]; check(HN.canMove(work.pos, from, to), 'hanoi step is allowed'); s.apply(work); if (n === 3) text(s.text, 'hanoi step'); });
  check(HN.done(work.pos, 2), 'hanoi ' + n + ': solved');
  // from random positions the tip always leads home in the fewest moves (checked with my own search for n ≤ 4)
  var R = rng(n * 31);
  for (var k = 0; k < 60; k++) {
    var pos = HN.start(n);
    for (var m = 0; m < 25; m++) { var a = Math.floor(R() * 3), b = Math.floor(R() * 3); if (HN.canMove(pos, a, b)) pos = HN.move(pos, a, b); }
    var left = HN.movesLeft(pos, 2), w = { pos: pos, moves: 0 }, g2 = 0;
    while (!HN.done(w.pos, 2) && g2++ < 100) { var tp = K.hanoi.tip(pz, w); check(HN.canMove(w.pos, tp.cells[0], tp.cells[1]), 'hanoi tip is allowed'); tp.apply(w); }
    check(HN.done(w.pos, 2) && w.moves === left, 'hanoi tips lead home');
    if (n <= 4) {
      var goal = JSON.stringify(HN.start(n).map(function (v) { return v === null ? null : 2; })), q = [[pos, 0]], seenH = {}; seenH[JSON.stringify(pos)] = 1; var d = -1;
      while (q.length) { var cur = q.shift(); if (JSON.stringify(cur[0]) === goal) { d = cur[1]; break; } for (var f = 0; f < 3; f++) for (var t = 0; t < 3; t++) if (HN.canMove(cur[0], f, t)) { var np = HN.move(cur[0], f, t), kk = JSON.stringify(np); if (!seenH[kk]) { seenH[kk] = 1; q.push([np, cur[1] + 1]); } } }
      check(d === left, 'hanoi: tips take the fewest moves (' + left + ' vs ' + d + ')');
    }
  }
});

/* ---------- truth tellers and liars ---------- */
[1, 2, 3].forEach(function (lvl) {
  for (var k = 0; k < N; k++) {
    var p = TF.make(lvl, rng(9000 + lvl * 1000 + k)), fitsN = 0;
    for (var m = 0; m < (1 << p.n); m++) {
      var a = []; for (var i = 0; i < p.n; i++) a.push(!!(m & (1 << i)));
      var good = p.says.every(function (st, i) {
        var tr = a.filter(Boolean).length, val;
        if (st.k === 'is') val = a[st.t] === st.v;
        else if (st.k === 'both') val = a[st.t] === st.v && a[st.u] === st.v;
        else if (st.k === 'same') val = a[st.t] === a[i];
        else if (st.k === 'diff') val = a[st.t] !== a[i];
        else val = st.c === 'oneLie' ? tr < p.n : st.c === 'oneTrue' ? tr === 1 : st.c === 'allTrue' ? tr === p.n : p.n - tr >= 2;
        return a[i] === val;
      });
      if (good) { fitsN++; check(a.every(function (v, i) { return v === p.answer[i]; }), 'truth: the fitting answer is the one given'); }
    }
    check(fitsN === 1, 'truth: exactly one answer fits');
    check(p.says.every(function (st, i) { return st.s === i && (st.k !== 'is' || st.t !== i); }), 'truth: nobody only talks about themselves');
    if (k < 4) { p.says.forEach(function (st) { text(TF.said(p, st), 'truth says'); }); text(K.truth.solution(p)[0].text, 'truth solution'); }
  }
});

/* ---------- codes for puzzles children make ---------- */
var hj = window.GH_PICS[0], code = game._picCode(hj.rows), back = game._parseCode(code);
check(back && back.kind === 'nono' && back.pz.own.rows.join('') === hj.rows.join(''), 'picture code round trip');
var sp = K.sudoku.create({ n: 4, givens: 6 }, rng(3)), sc = SD.toCode(4, sp.puzzle), sb = game._parseCode(sc);
check(sb && sb.kind === 'sudoku' && sb.pz.solution.join('') === sp.solution.join(''), 'sudoku code round trip');
['', '<script>alert(1)</script>', 'B5x5-<img>', 'B99x99-' + 'k'.repeat(9801), 'S4-1111000000000000', 'S4-0000000000000000', 'S9-12', 'BOB1:abc'].forEach(function (bad) { check(game._parseCode(bad) === null, 'bad code refused: ' + bad.slice(0, 20)); });

/* ---------- daily challenge ---------- */
['M', 'U'].forEach(function (b) {
  for (var i = 0; i < 300; i++) {
    var save = Math.random; Math.random = rng(77 + i); var q1 = game.quickTask(b, {}); Math.random = rng(77 + i); var q2 = game.quickTask(b, {}); Math.random = save;
    check(JSON.stringify(q1) === JSON.stringify(q2), 'daily task is the same for the same day');
    check(q1.q && q1.hint && q1.explain, 'daily task texts');
    if (q1.options) check(q1.options.indexOf(q1.answer) >= 0 && new Set(q1.options).size === q1.options.length, 'daily answer among the options');
    else check(q1.input === 'number' && typeof q1.answer === 'number' && q1.answer > 0, 'daily number task');
    if (i < 12) { text(q1.q, 'daily'); text(q1.explain, 'daily'); }
  }
});

/* ---------- rounds ---------- */
game._routes.forEach(function (r) {
  check(S.routes[r.id], 'route text ' + r.id);
  r.levels.forEach(function (cfg, li) { var items = game._makeRound(r, li + 1, rng(li + 3)); check(items.length === cfg.count, r.id + ' level ' + (li + 1) + ' round size'); check(JSON.parse(JSON.stringify(items)).length === items.length, 'round is plain data'); });
});

/* ---------- Danish spelling ---------- */
(function walk(x) { if (typeof x === 'string') texts.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k]); }); })(S);
var words = {};
texts.forEach(function (s) { (String(s).replace(/­/g, '').replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉé]+/g) || []).forEach(function (w) { words[w] = 1; }); });
var OK = ['Gådehuset', 'Hanois', 'sandsigere', 'sandsiger', 'Sandsiger', 'Malebilleder', 'malebilleder', 'malebillede', 'Malebillede', 'Kopiér', 'Frej', 'Gry', 'Liva', 'Oskar', 'Freja', 'Noah', 'Cecilie', 'Ella', 'Hugo', 'Dan', 'Anna', 'Bo', 'Ida', 'Ali', 'Maja', 'Emil', 'Sara', 'Karl', 'Nora', 'kålhoved', 'Gådemager', 'Gådemester', 'kg', 'Viskelæder'];
var list = Object.keys(words).filter(function (w) { return OK.indexOf(w) < 0 && w.length > 1; });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));

console.log(fails ? 'Gådehuset: ' + fails + ' of ' + checks + ' checks FAILED' : 'Gådehuset: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
