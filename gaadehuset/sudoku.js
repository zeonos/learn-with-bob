/*
 * Sudoku for Gådehuset: 4×4, 6×6 and 9×9. Every puzzle can be solved with the two simplest techniques, so a child never
 * has to guess, and every step of the solution can be explained:
 *   only number: »I det her felt kan kun 4 stå« (the row, column and box already have the others)
 *   only place:  »I den her række kan 3 kun stå her«
 * A grid is a flat array (row by row), 0 = empty.
 */
(function (root) {
  'use strict';
  var BOX = { 4: [2, 2], 6: [2, 3], 9: [3, 3] }; // box height, box width

  function shuffle(R, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // the cells of each row, column and box
  var unitCache = {};
  function units(n) {
    if (unitCache[n]) return unitCache[n];
    var bh = BOX[n][0], bw = BOX[n][1], out = { row: [], col: [], box: [], of: [] }, r, c;
    for (r = 0; r < n; r++) { out.row.push([]); out.col.push([]); out.box.push([]); }
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
      var i = r * n + c, b = Math.floor(r / bh) * (n / bw) + Math.floor(c / bw);
      out.row[r].push(i); out.col[c].push(i); out.box[b].push(i); out.of[i] = { row: r, col: c, box: b };
    }
    return (unitCache[n] = out);
  }
  function candidates(g, n, i) {
    if (g[i]) return [];
    var U = units(n), o = U.of[i], used = {};
    U.row[o.row].concat(U.col[o.col], U.box[o.box]).forEach(function (j) { if (g[j]) used[g[j]] = 1; });
    var out = []; for (var v = 1; v <= n; v++) if (!used[v]) out.push(v);
    return out;
  }
  // a full grid, filled at random
  function full(n, R) {
    var g = []; for (var i = 0; i < n * n; i++) g.push(0);
    (function fill(i) {
      if (i === n * n) return true;
      var cs = shuffle(R, candidates(g, n, i));
      for (var k = 0; k < cs.length; k++) { g[i] = cs[k]; if (fill(i + 1)) return true; }
      g[i] = 0; return false;
    })(0);
    return g;
  }
  // number of solutions, stopping at limit (for puzzles children make themselves)
  function count(g0, n, limit) {
    var g = g0.slice(), found = 0; limit = limit || 2;
    for (var i = 0; i < g.length; i++) if (g[i] && candidatesIgnoring(g, n, i).indexOf(g[i]) < 0) return 0; // breaks a rule already
    (function rec() {
      if (found >= limit) return;
      var best = -1, bc = null;
      for (var i = 0; i < g.length; i++) if (!g[i]) { var c = candidates(g, n, i); if (!c.length) return; if (!bc || c.length < bc.length) { best = i; bc = c; if (c.length === 1) break; } }
      if (best < 0) { found++; return; }
      for (var k = 0; k < bc.length && found < limit; k++) { g[best] = bc[k]; rec(); }
      g[best] = 0;
    })();
    return found;
  }
  function candidatesIgnoring(g, n, i) { var v = g[i]; g[i] = 0; var c = candidates(g, n, i); g[i] = v; return c; }
  function solveOne(g0, n) { // the solution of a puzzle with exactly one
    var g = g0.slice(), done = false;
    (function rec() {
      var best = -1, bc = null;
      for (var i = 0; i < g.length; i++) if (!g[i]) { var c = candidates(g, n, i); if (!c.length) return; if (!bc || c.length < bc.length) { best = i; bc = c; } }
      if (best < 0) { done = true; return; }
      for (var k = 0; k < bc.length && !done; k++) { g[best] = bc[k]; rec(); }
      if (!done) g[best] = 0;
    })();
    return done ? g : null;
  }

  // One step a child could take: the simplest one first (a value with only one place in a box, then row, column,
  // then a square with only one possible number). Returns { i, v, kind:'place'|'number', unit:'box'|'row'|'col', u } or null.
  function nextStep(g, n, onlyKinds) {
    var U = units(n), kinds = onlyKinds || ['box', 'row', 'col', 'number'];
    for (var k = 0; k < kinds.length; k++) {
      var kind = kinds[k];
      if (kind === 'number') {
        for (var i = 0; i < g.length; i++) if (!g[i]) { var c = candidates(g, n, i); if (c.length === 1) return { i: i, v: c[0], kind: 'number' }; }
        continue;
      }
      for (var u = 0; u < n; u++) {
        var cells = U[kind][u], have = {};
        cells.forEach(function (j) { if (g[j]) have[g[j]] = 1; });
        for (var v = 1; v <= n; v++) {
          if (have[v]) continue;
          var spots = cells.filter(function (j) { return !g[j] && candidates(g, n, j).indexOf(v) >= 0; });
          if (spots.length === 1) return { i: spots[0], v: v, kind: 'place', unit: kind, u: u };
        }
      }
    }
    return null;
  }
  // All steps from a puzzle to the end, or null if the simple techniques get stuck
  function logicSolve(g0, n) {
    var g = g0.slice(), steps = [];
    for (;;) {
      if (g.every(Boolean)) return { grid: g, steps: steps };
      var s = nextStep(g, n);
      if (!s) return null;
      g[s.i] = s.v; steps.push(s);
    }
  }
  // A puzzle with about `givens` numbers left, still solvable with the simple techniques
  function make(n, givens, R) {
    var sol = full(n, R), g = sol.slice(), order = shuffle(R, g.map(function (_, i) { return i; }));
    var left = n * n;
    for (var k = 0; k < order.length && left > givens; k++) {
      var i = order[k], keep = g[i]; g[i] = 0;
      if (logicSolve(g, n)) left--; else g[i] = keep;
    }
    return { n: n, puzzle: g, solution: sol, givens: left };
  }
  // why a step is right, as plain data for the texts: { kind, unit, u, v, r, c, others }
  function explainData(g, n, s) {
    var U = units(n), o = U.of[s.i], d = { kind: s.kind, v: s.v, r: o.row + 1, c: o.col + 1, unit: s.unit };
    if (s.kind === 'number') {
      var seen = {}; U.row[o.row].concat(U.col[o.col], U.box[o.box]).forEach(function (j) { if (g[j]) seen[g[j]] = 1; });
      d.others = Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
    }
    return d;
  }
  // Codes for puzzles children make: S4/S6/S9 + the digits (0 = empty)
  function toCode(n, g) { return 'S' + n + '-' + g.join(''); }
  function fromCode(code) {
    var m = /^S([469])-([0-9]+)$/.exec(String(code || '').trim().toUpperCase());
    if (!m) return null;
    var n = +m[1], g = m[2].split('').map(Number);
    if (g.length !== n * n || g.some(function (v) { return v > n; })) return null;
    return { n: n, puzzle: g };
  }

  var api = { BOX: BOX, units: units, candidates: candidates, full: full, count: count, solveOne: solveOne, nextStep: nextStep, logicSolve: logicSolve,
    make: make, explainData: explainData, toCode: toCode, fromCode: fromCode };
  root.SUDOKU = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
