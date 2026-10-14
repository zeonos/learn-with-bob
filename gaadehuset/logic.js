/*
 * »Hvem ejer hvad?« – logic grids. A hidden answer is picked, clues are written about it, and a step-by-step solver
 * (the same reasoning a child uses with ✓ and ✗ in the grid) must reach the whole answer. Clues that are not needed
 * are taken away again. Words and sentence parts are in strings-da.js (STR.gh.lg).
 *
 * A mark is [person, category, value, true|false] (✓ or ✗). An answer is ans[category][person] = value index.
 */
(function (root) {
  'use strict';
  function L() { return ((root.STR || {}).gh || {}).lg || {}; }
  function shuffle(R, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(R, a) { return a[Math.floor(R() * a.length)]; }

  /* ---------- the puzzle ---------- */
  // level settings: people, categories, which clue kinds may be used
  var LEVELS = {
    M: { 1: { n: 3, cats: 2, kinds: ['pos', 'neg', 'link', 'either'] }, 2: { n: 3, cats: 2, kinds: ['neg', 'link', 'nolink', 'either'] }, 3: { n: 3, cats: 3, kinds: ['pos', 'neg', 'link', 'nolink', 'either'] } },
    U: { 1: { n: 4, cats: 2, kinds: ['pos', 'neg', 'link', 'nolink', 'either'] }, 2: { n: 4, cats: 3, kinds: ['pos', 'neg', 'link', 'nolink', 'either'] }, 3: { n: 4, cats: 3, kinds: ['neg', 'link', 'nolink', 'either'] } }
  };
  // every true clue we could say about the answer
  function allClues(p) {
    var out = [], n = p.n, C = p.cats.length, a, b, x, y, v, w;
    for (a = 0; a < C; a++) for (x = 0; x < n; x++) for (v = 0; v < n; v++) {
      if (p.ans[a][x] === v) out.push({ k: 'pos', p: x, c: a, v: v });
      else out.push({ k: 'neg', p: x, c: a, v: v });
    }
    for (a = 0; a < C; a++) for (x = 0; x < n; x++) for (w = 0; w < n; w++) if (w !== p.ans[a][x]) out.push({ k: 'either', p: x, c: a, v: p.ans[a][x], w: w });
    for (a = 0; a < C; a++) for (b = 0; b < C; b++) if (a !== b) for (v = 0; v < n; v++) for (w = 0; w < n; w++) {
      var owner = p.ans[a].indexOf(v), same = p.ans[b][owner] === w;
      if (a < b && same) out.push({ k: 'link', c: a, v: v, c2: b, w: w });
      if (!same) out.push({ k: 'nolink', c: a, v: v, c2: b, w: w });
    }
    return out;
  }
  function clueTrue(p, cl) {
    switch (cl.k) {
      case 'pos': return p.ans[cl.c][cl.p] === cl.v;
      case 'neg': return p.ans[cl.c][cl.p] !== cl.v;
      case 'either': return cl.v !== cl.w && (p.ans[cl.c][cl.p] === cl.v || p.ans[cl.c][cl.p] === cl.w);
      case 'link': return p.ans[cl.c2][p.ans[cl.c].indexOf(cl.v)] === cl.w;
      case 'nolink': return p.ans[cl.c2][p.ans[cl.c].indexOf(cl.v)] !== cl.w;
    }
    return false;
  }

  /* ---------- the solver: one small reason at a time ---------- */
  // state: st[c][x][v] = 1 (✓), 0 (✗) or -1 (unknown). Returns { solved, steps:[{ why, marks:[[x,c,v,bool]] }], st }
  function blank(n, C) { var st = []; for (var c = 0; c < C; c++) { st.push([]); for (var x = 0; x < n; x++) { st[c].push([]); for (var v = 0; v < n; v++) st[c][x].push(-1); } } return st; }
  function step(p, clues, st) {
    var n = p.n, C = p.cats.length, i, c, x, v;
    function fresh(marks) { return marks.filter(function (m) { return st[m[1]][m[0]][m[2]] === -1; }); }
    function done(why, marks) { marks = fresh(marks); return marks.length ? { why: why, marks: marks } : null; }
    var r;
    // 1. clues that say something straight out
    for (i = 0; i < clues.length; i++) {
      var cl = clues[i];
      if (cl.k === 'pos' && (r = done({ k: 'clue', i: i }, [[cl.p, cl.c, cl.v, true]]))) return r;
      if (cl.k === 'neg' && (r = done({ k: 'clue', i: i }, [[cl.p, cl.c, cl.v, false]]))) return r;
      if (cl.k === 'either') {
        var ms = []; for (v = 0; v < n; v++) if (v !== cl.v && v !== cl.w) ms.push([cl.p, cl.c, v, false]);
        if ((r = done({ k: 'clue', i: i }, ms))) return r;
      }
    }
    // 2. a ✓ rules out the rest of its row and column
    for (c = 0; c < C; c++) for (x = 0; x < n; x++) for (v = 0; v < n; v++) if (st[c][x][v] === 1) {
      var m2 = [];
      for (var w = 0; w < n; w++) if (w !== v) m2.push([x, c, w, false]);
      for (var y = 0; y < n; y++) if (y !== x) m2.push([y, c, v, false]);
      if ((r = done({ k: 'taken', p: x, c: c, v: v }, m2))) return r;
    }
    // 3. only one left in a row or a column
    for (c = 0; c < C; c++) for (x = 0; x < n; x++) {
      var open = [], yes = false;
      for (v = 0; v < n; v++) { if (st[c][x][v] === -1) open.push(v); if (st[c][x][v] === 1) yes = true; }
      if (!yes && open.length === 1 && (r = done({ k: 'lastOfPerson', p: x, c: c, v: open[0] }, [[x, c, open[0], true]]))) return r;
    }
    for (c = 0; c < C; c++) for (v = 0; v < n; v++) {
      var openP = [], yesP = false;
      for (x = 0; x < n; x++) { if (st[c][x][v] === -1) openP.push(x); if (st[c][x][v] === 1) yesP = true; }
      if (!yesP && openP.length === 1 && (r = done({ k: 'lastOfValue', p: openP[0], c: c, v: v }, [[openP[0], c, v, true]]))) return r;
    }
    // 4. clues that join two things: what is known about one is also known about the other
    for (i = 0; i < clues.length; i++) {
      var k = clues[i];
      if (k.k !== 'link' && k.k !== 'nolink') continue;
      for (x = 0; x < n; x++) {
        var a = st[k.c][x][k.v], b = st[k.c2][x][k.w];
        if (k.k === 'link') {
          if (a !== -1 && b === -1 && (r = done({ k: 'link', i: i, p: x, from: [k.c, k.v, a === 1] }, [[x, k.c2, k.w, a === 1]]))) return r;
          if (b !== -1 && a === -1 && (r = done({ k: 'link', i: i, p: x, from: [k.c2, k.w, b === 1] }, [[x, k.c, k.v, b === 1]]))) return r;
        } else {
          if (a === 1 && b === -1 && (r = done({ k: 'nolink', i: i, p: x, from: [k.c, k.v, true] }, [[x, k.c2, k.w, false]]))) return r;
          if (b === 1 && a === -1 && (r = done({ k: 'nolink', i: i, p: x, from: [k.c2, k.w, true] }, [[x, k.c, k.v, false]]))) return r;
        }
      }
    }
    return null;
  }
  function apply(st, s) { s.marks.forEach(function (m) { st[m[1]][m[0]][m[2]] = m[3] ? 1 : 0; }); }
  function solve(p, clues, st0) {
    var st = st0 ? JSON.parse(JSON.stringify(st0)) : blank(p.n, p.cats.length), steps = [], s;
    while ((s = step(p, clues, st))) { apply(st, s); steps.push(s); if (steps.length > 500) break; }
    var solved = st.every(function (cat) { return cat.every(function (row) { return row.filter(function (v) { return v === 1; }).length === 1; }); });
    return { solved: solved, steps: steps, st: st };
  }
  // Is the solver's answer the real one? (it only uses true clues, so a full answer is always right; this double-checks)
  function matches(p, st) { return st.every(function (cat, c) { return cat.every(function (row, x) { return row[p.ans[c][x]] === 1; }); }); }

  /* ---------- making a puzzle ---------- */
  // the things a clue talks about, as 'category:value'
  function mentions(cl) {
    if (cl.k === 'pos' || cl.k === 'neg') return [cl.c + ':' + cl.v];
    if (cl.k === 'either') return [cl.c + ':' + cl.v, cl.c + ':' + cl.w];
    return [cl.c + ':' + cl.v, cl.c2 + ':' + cl.w];
  }
  function missing(p, clues) {
    var seen = {}, out = [];
    clues.forEach(function (cl) { mentions(cl).forEach(function (k) { seen[k] = 1; }); });
    p.cats.forEach(function (_, c) { for (var v = 0; v < p.n; v++) if (!seen[c + ':' + v]) out.push(c + ':' + v); });
    return out;
  }
  function maxClues(cfg) { return cfg.n === 3 ? (cfg.cats === 2 ? 6 : 7) : cfg.cats === 2 ? 9 : 11; }
  function make(band, level, R) {
    var cfg = LEVELS[band][level], lg = L(), names = shuffle(R, lg.names[band]).slice(0, cfg.n);
    for (var guard = 0; guard < 300; guard++) {
      var catIds = shuffle(R, Object.keys(lg.cats)).slice(0, cfg.cats);
      var cats = catIds.map(function (id) { return { id: id, vals: shuffle(R, lg.cats[id].vals.map(function (_, i) { return i; })).slice(0, cfg.n) }; });
      var ans = cats.map(function () { return shuffle(R, names.map(function (_, i) { return i; })); });
      var p = { n: cfg.n, names: names, cats: cats, ans: ans };
      // »enten … eller« clues are many, so only some of them join the pool – the clues get more varied
      var pool = shuffle(R, allClues(p).filter(function (c) { return cfg.kinds.indexOf(c.k) >= 0 && (c.k !== 'either' || R() < (cfg.cats === 3 && cfg.n === 4 ? 0.5 : 0.25)); }));
      // fewer straight answers: »pos« clues go to the back of the line, at most one is used
      pool.sort(function (a, b) { return (a.k === 'pos') - (b.k === 'pos'); });
      var clues = [], usedPos = 0;
      for (var i = 0; i < pool.length && !solve(p, clues).solved; i++) {
        if (pool[i].k === 'pos' && usedPos) continue;
        if (pool[i].k === 'pos') usedPos++;
        clues.push(pool[i]);
      }
      if (!solve(p, clues).solved) continue;
      // every pet, house, sport and instrument is named in at least one clue, so nothing is only found by ruling out
      var extra = shuffle(R, allClues(p).filter(function (c) { return cfg.kinds.indexOf(c.k) >= 0 && c.k !== 'pos'; }));
      missing(p, clues).forEach(function (key) {
        if (missing(p, clues).indexOf(key) < 0) return;
        var add = extra.filter(function (c) { return mentions(c).indexOf(key) >= 0 && c.k !== 'either'; })[0] || extra.filter(function (c) { return mentions(c).indexOf(key) >= 0; })[0];
        if (add) clues.push(add);
      });
      if (missing(p, clues).length) continue;
      // take away clues that are not needed (but keep every thing named)
      shuffle(R, clues.slice()).forEach(function (cl) { var less = clues.filter(function (x) { return x !== cl; }); if (!missing(p, less).length && solve(p, less).solved) clues = less; });
      if (clues.length > maxClues(cfg)) continue;
      p.clues = shuffle(R, clues);
      return p;
    }
    throw new Error('logic grid');
  }

  /* ---------- Danish sentences ---------- */
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function val(p, c, v) { var lg = L(), cat = lg.cats[p.cats[c].id]; return cat.vals[p.cats[c].vals[v]]; } // [verb, object, short name]
  function clueText(p, cl) {
    var lg = L(), a, b;
    switch (cl.k) {
      case 'pos': a = val(p, cl.c, cl.v); return p.names[cl.p] + ' ' + a[0] + ' ' + a[1] + '.';
      case 'neg': a = val(p, cl.c, cl.v); return p.names[cl.p] + ' ' + a[0] + ' ikke ' + a[1] + '.';
      case 'either': a = val(p, cl.c, cl.v); b = val(p, cl.c, cl.w); return p.names[cl.p] + ' ' + a[0] + ' enten ' + a[1] + ' eller ' + b[1] + '.';
      case 'link': a = val(p, cl.c, cl.v); b = val(p, cl.c2, cl.w); return cap(lg.rel) + ' ' + a[0] + ' ' + a[1] + ', ' + b[0] + ' ' + b[1] + '.';
      case 'nolink': a = val(p, cl.c, cl.v); b = val(p, cl.c2, cl.w); return cap(lg.rel) + ' ' + a[0] + ' ' + a[1] + ', ' + b[0] + ' ikke ' + b[1] + '.';
    }
    return '';
  }
  // sub: as a subordinate clause (»at Noah ikke går til håndbold«), where »ikke« comes before the verb
  function fact(p, x, c, v, yes, sub) { var a = val(p, c, v); return p.names[x] + (sub && !yes ? ' ikke ' + a[0] + ' ' : ' ' + a[0] + (yes ? ' ' : ' ikke ')) + a[1]; }
  function stepText(p, s) {
    var lg = L(), w = s.why, T = function (str, o) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); };
    switch (w.k) {
      case 'clue': return T(lg.why.clue, { n: w.i + 1, clue: clueText(p, p.clues[w.i]) });
      case 'taken': return T(lg.why.taken, { fact: fact(p, w.p, w.c, w.v, true), name: p.names[w.p], thing: val(p, w.c, w.v)[2] });
      case 'lastOfPerson': return T(lg.why.lastOfPerson, { name: p.names[w.p], fact: fact(p, w.p, w.c, w.v, true) });
      case 'lastOfValue': return T(lg.why.lastOfValue, { thing: val(p, w.c, w.v)[2], fact: fact(p, w.p, w.c, w.v, true) });
      case 'link': case 'nolink':
        var m = s.marks[0];
        return T(lg.why[w.k], { n: w.i + 1, known: fact(p, w.p, w.from[0], w.from[1], w.from[2], true), fact: fact(p, m[0], m[1], m[2], m[3]) });
    }
    return '';
  }
  function answerText(p) { // »Ida har katten og bor i det røde hus.«
    return p.names.map(function (nm, x) { return nm + ' ' + p.cats.map(function (c, ci) { var a = val(p, ci, p.ans[ci][x]); return a[0] + ' ' + a[1]; }).join(' og ') + '.'; }).join(' ');
  }

  var api = { maxClues: maxClues, missing: missing, LEVELS: LEVELS, allClues: allClues, clueTrue: clueTrue, blank: blank, step: step, apply: apply, solve: solve, matches: matches, make: make,
    clueText: clueText, stepText: stepText, answerText: answerText, val: val };
  root.LOGIC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
