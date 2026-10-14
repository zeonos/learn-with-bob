/*
 * Malebilleder (nonograms): clues, a line solver and a step-by-step solution.
 * A picture is a list of strings, '.' = empty, any other letter = a filled square in that colour (see PAL).
 * Cell states while solving: 1 = filled, 0 = empty (crossed), -1 = not known yet.
 */
(function (root) {
  'use strict';
  var PAL = { k: '#3B2A20', b: '#3E8FC2', l: '#9FD3EE', r: '#D9463B', p: '#F4A7C3', o: '#F28C28', y: '#F7C548', g: '#5BA34B', m: '#A6D785', n: '#8B5A2B', s: '#B9BEC6', v: '#8E6CC9', w: '#FFFFFF' };

  function grid(pic) { return pic.rows.map(function (r) { return r.split('').map(function (c) { return c === '.' ? 0 : 1; }); }); }
  function lineClue(line) { var out = [], n = 0; line.forEach(function (v) { if (v === 1) n++; else if (n) { out.push(n); n = 0; } }); if (n) out.push(n); return out; }
  function col(g, x) { return g.map(function (r) { return r[x]; }); }
  function clues(g) { return { rows: g.map(lineClue), cols: g[0].map(function (_, x) { return lineClue(col(g, x)); }) }; }

  // Every way the blocks fit the line, folded into: can each cell be filled? can it be empty?
  // Returns null if no placement fits, else an array: 1 = always filled, 0 = always empty, -1 = either.
  function solveLine(clue, line) {
    var n = line.length, K = clue.length, memo = {}, canF = [], canE = [], seen = {};
    function ok(k, i) {
      var key = k * 64 + i; if (memo[key] !== undefined) return memo[key];
      var r = false;
      if (k === K) { r = true; for (var j = i; j < n; j++) if (line[j] === 1) { r = false; break; } }
      else {
        var len = clue[k];
        for (var s = i; s + len <= n; s++) {
          if (s > i && line[s - 1] === 1) break; // a filled square cannot be skipped
          var fits = true;
          for (var q = s; q < s + len; q++) if (line[q] === 0) { fits = false; break; }
          if (fits && (s + len === n || line[s + len] !== 1) && ok(k + 1, Math.min(n, s + len + 1))) { r = true; break; }
        }
      }
      memo[key] = r; return r;
    }
    function mark(k, i) {
      var key = k * 64 + i; if (seen[key]) return; seen[key] = 1;
      if (k === K) { for (var j = i; j < n; j++) canE[j] = true; return; }
      var len = clue[k];
      for (var s = i; s + len <= n; s++) {
        if (s > i && line[s - 1] === 1) break;
        var fits = true;
        for (var q = s; q < s + len; q++) if (line[q] === 0) { fits = false; break; }
        if (!fits || (s + len < n && line[s + len] === 1) || !ok(k + 1, Math.min(n, s + len + 1))) continue;
        for (q = i; q < s; q++) canE[q] = true;
        for (q = s; q < s + len; q++) canF[q] = true;
        if (s + len < n) canE[s + len] = true;
        mark(k + 1, Math.min(n, s + len + 1));
      }
    }
    if (!ok(0, 0)) return null;
    mark(0, 0);
    var out = [];
    for (var j = 0; j < n; j++) out.push(canF[j] && canE[j] ? -1 : canF[j] ? 1 : 0);
    return out;
  }

  // Solves by looking at one line at a time, like a child would. Each step = one line that gives new squares.
  // state: optional starting knowledge (rows of 1/0/-1). Returns { solved, state, steps:[{kind:'row'|'col', i, cells:[[x,y,v]...]}], contradiction }
  function solve(cl, state, maxSteps) {
    var H = cl.rows.length, W = cl.cols.length, st = state ? state.map(function (r) { return r.slice(); }) : [], steps = [];
    if (!state) for (var y = 0; y < H; y++) { st.push([]); for (var x = 0; x < W; x++) st[y].push(-1); }
    var dirty = { row: {}, col: {} }, k;
    for (k = 0; k < H; k++) dirty.row[k] = 1;
    for (k = 0; k < W; k++) dirty.col[k] = 1;
    var guard = 0;
    while (guard++ < 10000) {
      var did = false;
      // simplest first: the line with the most new squares
      var best = null;
      ['row', 'col'].forEach(function (kind) {
        Object.keys(dirty[kind]).forEach(function (ks) {
          var i = +ks, line = kind === 'row' ? st[i] : col(st, i), res = solveLine(kind === 'row' ? cl.rows[i] : cl.cols[i], line);
          if (!res) { best = { bad: true, kind: kind, i: i }; return; }
          var cells = [];
          res.forEach(function (v, j) { if (v !== -1 && line[j] === -1) cells.push(kind === 'row' ? [j, i, v] : [i, j, v]); });
          if (!cells.length) delete dirty[kind][i];
          else if (!best || (!best.bad && cells.length > best.cells.length)) best = { kind: kind, i: i, cells: cells };
        });
      });
      if (best && best.bad) return { solved: false, contradiction: best, state: st, steps: steps };
      if (best) {
        best.cells.forEach(function (c) { st[c[1]][c[0]] = c[2]; dirty.row[c[1]] = 1; dirty.col[c[0]] = 1; });
        steps.push(best); did = true;
        if (maxSteps && steps.length >= maxSteps) break;
      }
      if (!did) break;
    }
    var solved = st.every(function (r) { return r.every(function (v) { return v !== -1; }); });
    return { solved: solved, state: st, steps: steps };
  }
  // A picture is fair when lines alone solve it, and the result is the picture itself
  function check(pic) {
    var g = grid(pic), r = solve(clues(g));
    var same = r.solved && r.state.every(function (row, y) { return row.every(function (v, x) { return v === g[y][x]; }); });
    return { ok: same, steps: r.steps.length, filled: g.reduce(function (a, row) { return a + row.reduce(function (b, v) { return b + v; }, 0); }, 0) };
  }

  var api = { PAL: PAL, grid: grid, clues: clues, lineClue: lineClue, solveLine: solveLine, solve: solve, check: check };
  root.NONO = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
