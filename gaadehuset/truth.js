/*
 * »Sandt eller falsk« – truth-tellers (always tell the truth) and liars (always lie). Each person says one sentence.
 * A puzzle is kept only if exactly one way of being truth-teller or liar fits everything that is said.
 * assign[i] = true (truth-teller) or false (liar).
 */
(function (root) {
  'use strict';
  function shuffle(R, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(R, a) { return a[Math.floor(R() * a.length)]; }
  var NAMES = ['Anna', 'Bo', 'Cecilie', 'Dan', 'Ella', 'Frej', 'Gry', 'Hugo'];

  // statement kinds: is (t, v), both (t, u, v), same (t), diff (t), count (k: 'oneLie' | 'oneTrue' | 'allTrue' | 'twoLie')
  function evalS(st, a, n) {
    var truths = a.filter(Boolean).length;
    switch (st.k) {
      case 'is': return a[st.t] === st.v;
      case 'both': return a[st.t] === st.v && a[st.u] === st.v;
      case 'same': return a[st.t] === a[st.s];
      case 'diff': return a[st.t] !== a[st.s];
      case 'count':
        if (st.c === 'oneLie') return truths <= n - 1;      // at least one of us lies
        if (st.c === 'oneTrue') return truths === 1;       // exactly one of us tells the truth
        if (st.c === 'allTrue') return truths === n;
        if (st.c === 'twoLie') return n - truths >= 2;     // at least two of us lie
    }
    return false;
  }
  function all(n) { var out = []; for (var m = 0; m < (1 << n); m++) { var a = []; for (var i = 0; i < n; i++) a.push(!!(m & (1 << i))); out.push(a); } return out; }
  function fits(p, a) { return p.says.every(function (st, i) { return a[i] === evalS(st, a, p.n); }); }
  function solutions(p) { return all(p.n).filter(function (a) { return fits(p, a); }); }

  var LEVELS = { 1: { n: 2, kinds: ['is', 'both', 'same', 'diff'] }, 2: { n: 3, kinds: ['is', 'both', 'same', 'diff'] }, 3: { n: 3, kinds: ['is', 'both', 'diff', 'count'] } };
  function randomStatement(R, s, n, kinds) {
    var others = []; for (var i = 0; i < n; i++) if (i !== s) others.push(i);
    var k = pick(R, kinds);
    if (k === 'is') return { k: 'is', s: s, t: pick(R, others), v: R() < 0.5 };
    if (k === 'both') { var two = shuffle(R, others.concat(n === 2 ? [s] : [])).slice(0, 2); if (two.length < 2) two = [s, others[0]]; return { k: 'both', s: s, t: two[0], u: two[1], v: R() < 0.5 }; }
    if (k === 'same' || k === 'diff') return { k: k, s: s, t: pick(R, others) };
    return { k: 'count', s: s, c: pick(R, n === 2 ? ['oneLie', 'oneTrue', 'allTrue'] : ['oneLie', 'oneTrue', 'allTrue', 'twoLie']) };
  }
  function make(level, R) {
    var cfg = LEVELS[level];
    for (var guard = 0; guard < 2000; guard++) {
      var names = shuffle(R, NAMES).slice(0, cfg.n).sort(), says = [];
      for (var s = 0; s < cfg.n; s++) says.push(randomStatement(R, s, cfg.n, cfg.kinds));
      var p = { n: cfg.n, names: names, says: says, level: level }, sol = solutions(p);
      if (sol.length !== 1) continue;
      // not too easy: everyone the same kind at most every other time
      var a = sol[0];
      if ((a.every(Boolean) || !a.some(Boolean)) && R() < 0.6) continue;
      p.answer = a;
      return p;
    }
    throw new Error('truth');
  }

  /* ---------- Danish ---------- */
  function T() { return (((root.STR || {}).gh || {}).tf) || {}; }
  // what the speaker says, in their own words (»Bo lyver.«) and as a plain fact (»Bo lyver«)
  function said(p, st) {
    var w = T(), nm = function (i) { return p.names[i]; };
    switch (st.k) {
      case 'is': return nm(st.t) + ' ' + (st.v ? w.truth : w.lie) + '.';
      case 'both': return (st.t === st.s ? nm(st.u) + ' ' + w.andMe : st.u === st.s ? nm(st.t) + ' ' + w.andMe : nm(st.t) + ' og ' + nm(st.u)) + ' ' + (st.v ? w.bothTruth : w.bothLie) + '.';
      case 'same': return nm(st.t) + ' ' + w.andMe + ' ' + w.same + '.';
      case 'diff': return nm(st.t) + ' ' + w.andMe + ' ' + w.diff + '.';
      case 'count': return w.count[st.c] + '.';
    }
  }
  function fact(p, st) {
    var w = T(), nm = function (i) { return p.names[i]; };
    switch (st.k) {
      case 'is': return nm(st.t) + ' ' + (st.v ? w.truth : w.lie);
      case 'both': return nm(st.t) + ' og ' + nm(st.u) + ' ' + (st.v ? w.bothTruth : w.bothLie);
      case 'same': return nm(st.t) + ' og ' + nm(st.s) + ' ' + w.same;
      case 'diff': return nm(st.t) + ' og ' + nm(st.s) + ' ' + w.diff;
      case 'count': return w.countFact[st.c];
    }
  }
  var api = { NAMES: NAMES, LEVELS: LEVELS, evalS: evalS, fits: fits, solutions: solutions, make: make, said: said, fact: fact };
  root.TRUTH = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
