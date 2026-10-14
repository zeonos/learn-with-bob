/*
 * Mysteriet på museet – gådegeneratorerne. Hvert rum laves ud fra en seedet tilfældighedsfunktion R, så et nyt spil
 * giver en ny gåde, men historien hænger sammen (uret stopper altid mellem kl. 21.15 og 22.10, mens natvagten var i
 * kælderen, Lise sad i toget, og Mr. Smith spillede koncert).
 * Et rum er en liste af trin (steps). Hvert trin har præcis ét rigtigt svar (tools/test-museet.js beviser det).
 * Trin-typer: code (kodelås), timeline (tidslinje), runes (skriv ordet), mc (vælg et svar), scale (skålvægt), strike (stryg de mistænkte).
 * Tegnefunktionerne (ur, runer, skålvægt, fund) laver rene SVG-strenge, som også bruges af dagens opgave og korrekturarket.
 */
(function (root) {
  'use strict';
  var STORY = root.MU_STORY || (typeof require !== 'undefined' ? require('./story.js') : null);
  function S() { return root.STR.mu.pz; }
  function t(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pickR(R, a) { return a[Math.floor(R() * a.length)]; }
  function intR(R, a, b) { return a + Math.floor(R() * (b - a + 1)); }
  function shuffleR(R, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function hm(min) { return Math.floor(min / 60) + '.' + pad2(min % 60); }
  function f1(n) { return Math.round(n * 10) / 10; }
  var ROOMS = ['hallen', 'oldtiden', 'vikingetiden', 'middelalderen', 'renaessancen', 'loftet'];
  var SIGN_OUT = 16 * 60 + 30, CLOSE = 17 * 60, T_MIN = 21 * 60 + 15, T_MAX = 22 * 60 + 10;

  /* ================= 1. Hallen: the clock and the code ================= */
  // the time the big clock stopped (minutes after midnight). Never a whole hour after closing time (M) or after 16.30 (U),
  // so the answer always has both hours and minutes.
  function clockTime(band, R) {
    var step = band === 'M' ? 5 : 1, n = Math.floor((T_MAX - T_MIN) / step), T;
    do { T = T_MIN + step * intR(R, 0, n); } while (T % 60 === (band === 'M' ? 0 : 30));
    return T;
  }
  function makeHallen(band, R) {
    var P = S(), T = clockTime(band, R), from = band === 'M' ? CLOSE : SIGN_OUT, el = T - from, h = Math.floor(el / 60), m = el % 60;
    var vars = { T: hm(T), clock: hm(T - 12 * 60), h: h, m: m, from: hm(from), full: hm(Math.floor(T / 60) * 60) };
    var step = { kind: 'code', T: T, from: from, fields: [{ label: P.hours, max: 1, answer: h }, { label: P.minutes, max: 2, answer: m }] };
    if (band === 'M') {
      step.q = P.hallenQM; step.rule = P.hallenRuleM;
      step.hints = [P.hallenHintM1, t(P.hallenHintM2, vars)];
      step.explain = t(P.hallenExplainM, vars);
    } else {
      var signs, lo, hi;
      do { signs = shuffleR(R, STORY.signs).slice(0, 3); lo = Math.min.apply(null, signs.map(function (s) { return s.year; })); hi = Math.max.apply(null, signs.map(function (s) { return s.year; })); } while (hi - lo < 100 || hi - lo > 999);
      step.signs = signs.map(function (s) { return { year: s.year, text: s.text }; });
      step.fields.push({ label: P.years, max: 3, answer: hi - lo });
      vars.lo = lo; vars.hi = hi; vars.diff = hi - lo;
      // the whole hours from 16.30 that fit before the clock time
      var whole = Math.floor(el / 60); vars.hh = hm(SIGN_OUT + whole * 60); vars.n = whole;
      step.q = P.hallenQU; step.rule = P.hallenRuleU;
      step.hints = [P.hallenHintU1, t(P.hallenHintU2, vars)];
      step.explain = t(P.hallenExplainU, vars);
    }
    step.answer = step.fields.map(function (f) { return f.answer; });
    return { room: 'hallen', band: band, steps: [step], vars: { T: hm(T) } };
  }

  /* ================= 2. Oldtiden: the timeline ================= */
  var FINDS = [
    { id: 'koelbjerg', year: -8500, period: 'sten' }, { id: 'solvognen', year: -1400, period: 'bronze' }, { id: 'egtved', year: -1370, period: 'bronze' },
    { id: 'tollund', year: -400, period: 'jern' }, { id: 'hjortspring', year: -350, period: 'jern' }, { id: 'guldhorn', year: 400, period: 'jern' }, { id: 'jelling', year: 965, period: 'viking' }
  ];
  var PERIODS = ['sten', 'bronze', 'jern', 'viking'];
  function find(id) { return FINDS.filter(function (f) { return f.id === id; })[0]; }
  function makeOldtiden(band, R) {
    var P = S(), items;
    if (band === 'M') items = PERIODS.map(function (p) { return pickR(R, FINDS.filter(function (f) { return f.period === p; })).id; });
    else items = shuffleR(R, FINDS).slice(0, R() < 0.5 ? 5 : 6).map(function (f) { return f.id; });
    var answer = items.slice().sort(function (a, b) { return find(a).year - find(b).year; });
    do { items = shuffleR(R, items); } while (items.join() === answer.join());
    var nm = function (id) { return STORY.finds[id].name; };
    var vars = { first: nm(answer[0]), second: nm(answer[1]), last: nm(answer[answer.length - 1]), order: answer.map(nm).join(' → ') };
    var step = { kind: 'timeline', items: items, answer: answer, showPeriod: band === 'M', showYear: band === 'U', q: band === 'M' ? P.oldQM : P.oldQU,
      hints: band === 'M' ? [P.oldHintM1, t(P.oldHintM2, vars)] : [P.oldHintU1, t(P.oldHintU2, vars)], explain: t(band === 'M' ? P.oldExplainM : P.oldExplainU, vars) };
    return { room: 'oldtiden', band: band, steps: [step], vars: {} };
  }

  /* ================= 3. Vikingetiden: runes ================= */
  // The 16 runes of the Viking Age (the long-branch row), drawn as SVG paths in a box 20 wide and 40 high.
  var RUNES = [
    { k: 'f', main: 'f', vals: ['f'], d: 'M6,2V38M6,11L16,3M6,21L16,13' },
    { k: 'u', main: 'u', vals: ['u', 'o', 'v'], d: 'M5,38V2L15,15V38' },
    { k: 'th', main: 'þ', vals: ['þ'], d: 'M6,2V38M6,12L15,20L6,28' },
    { k: 'o', main: 'o', vals: ['ą', 'o'], d: 'M10,2V38M3,7L17,17M3,15L17,25' },
    { k: 'r', main: 'r', vals: ['r'], d: 'M6,38V2L15,10L6,19L15,38' },
    { k: 'k', main: 'k', vals: ['k', 'g'], d: 'M6,2V38M6,16L16,4' },
    { k: 'h', main: 'h', vals: ['h'], d: 'M10,2V38M3,13L17,27M17,13L3,27' },
    { k: 'n', main: 'n', vals: ['n'], d: 'M10,2V38M4,14L16,26' },
    { k: 'i', main: 'i', vals: ['i', 'e', 'j'], d: 'M10,2V38' },
    { k: 'a', main: 'a', vals: ['a', 'æ'], d: 'M10,2V38M4,26L16,14' },
    { k: 's', main: 's', vals: ['s'], d: 'M5,2V25L15,13V38' },
    { k: 't', main: 't', vals: ['t', 'd'], d: 'M10,2V38M3,13L10,2L17,13' },
    { k: 'b', main: 'b', vals: ['b', 'p'], d: 'M6,2V38M6,2L15,11L6,20L15,29L6,38' },
    { k: 'm', main: 'm', vals: ['m'], d: 'M10,2V38M3,3L10,15L17,3' },
    { k: 'l', main: 'l', vals: ['l'], d: 'M6,38V2L16,12' },
    { k: 'R', main: 'ʀ', vals: ['ʀ'], d: 'M10,2V38M3,37L10,25L17,37' }
  ];
  function rune(k) { return RUNES.filter(function (r) { return r.k === k; })[0]; }
  // Danish letters -> runes (only the letters the game's messages use)
  var ENC = { a: 'a', 'æ': 'a', b: 'b', p: 'b', d: 't', t: 't', e: 'i', i: 'i', j: 'i', f: 'f', g: 'k', k: 'k', h: 'h', l: 'l', m: 'm', n: 'n', r: 'r', s: 's', u: 'u' };
  function encode(text) { return String(text).toLowerCase().split(/\s+/).filter(Boolean).map(function (w) { return w.split('').map(function (c) { if (!ENC[c]) throw new Error('no rune for ' + c); return ENC[c]; }); }); }
  var M_WORDS = ['SKIB', 'SKAB', 'KRUS', 'HUS', 'TRIN'];
  var U_PARTS = {
    verb: ['KIG', 'SE'],
    adj: ['GAMLE', 'LILLE', 'BRUNE', 'TUNGE'],
    nouns: { 'BÆNK': ['UNDER', 'BAG'], KISTE: ['I', 'BAG'], HJELM: ['I', 'UNDER'], 'SÆK': ['I', 'BAG'], LAMPE: ['UNDER', 'BAG'], SPAND: ['I', 'UNDER', 'BAG'] }
  };
  function sentence(p) { return [p.verb, p.prep, 'DEN', p.adj, p.noun].join(' '); }
  function makeVikinge(band, R) {
    var P = S(), step, where;
    if (band === 'M') {
      var w = pickR(R, M_WORDS), runes = encode(w);
      step = { kind: 'runes', word: w, runes: runes, answer: w, letters: P.runeLetters, q: P.vikQM,
        hints: [P.vikHintM1, t(P.vikHintM2, { a: w[0], n: w.length })], explain: t(P.vikExplainM, { w: w, list: w.split('').join(' – ') }) };
      where = P.places[w];
    } else {
      var nouns = Object.keys(U_PARTS.nouns), noun = pickR(R, nouns), p = { verb: pickR(R, U_PARTS.verb), prep: pickR(R, U_PARTS.nouns[noun]), adj: pickR(R, U_PARTS.adj), noun: noun };
      var right = sentence(p), wrong = [];
      var otherPrep = U_PARTS.nouns[noun].filter(function (x) { return x !== p.prep; }), otherAdj = U_PARTS.adj.filter(function (x) { return x !== p.adj; });
      var otherNoun = nouns.filter(function (x) { return x !== noun && U_PARTS.nouns[x].indexOf(p.prep) >= 0; });
      wrong.push(sentence({ verb: p.verb, prep: pickR(R, otherPrep), adj: p.adj, noun: noun }));
      wrong.push(sentence({ verb: p.verb, prep: p.prep, adj: pickR(R, otherAdj), noun: noun }));
      wrong.push(sentence({ verb: p.verb, prep: p.prep, adj: p.adj, noun: pickR(R, otherNoun) }));
      var used = {}, twist = [];
      right.toLowerCase().replace(/[^ ]/g, function (c) { var r = rune(ENC[c]); if (c !== r.main && !used[c]) { used[c] = 1; twist.push(t(P.twistOne, { r: r.main, c: c })); } return c; });
      step = { kind: 'mc', runes: encode(right), options: shuffleR(R, [right].concat(wrong)), answer: right, q: P.vikQU,
        hints: [P.vikHintU1, t(P.vikHintU2, { w: noun })], explain: t(P.vikExplainU, { s: right, twist: twist.join(', ') }) };
      where = [p.prep, 'den', p.adj, p.noun].join(' ').toLowerCase();
    }
    return { room: 'vikingetiden', band: band, steps: [step], vars: {}, where: where };
  }
  // does a text fit the runes? (a letter fits a rune when it is one of the rune's sounds)
  function fits(runes, text) {
    var words = String(text).toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length !== runes.length) return false;
    return words.every(function (w, i) { return w.length === runes[i].length && w.split('').every(function (c, j) { return rune(runes[i][j]).vals.indexOf(c) >= 0; }); });
  }

  /* ================= 4. Middelalderen: the scale (quarters of a kilo) ================= */
  var FR = { 1: '¼', 2: '½', 3: '¾' };
  function fq(q) { var w = Math.floor(q / 4), r = q % 4; return (w || !r ? String(w) : '') + (r ? FR[r] : ''); }
  function kg(q) { return fq(q) + ' kg'; }
  function sumQ(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function makeMiddel(band, R) {
    var P = S(), step, ans, opts, cand = [];
    if (band === 'M') {
      if (R() < 0.55) { // A: one weight is missing on the right
        var left, right, okA = false;
        while (!okA) {
          left = [4 * intR(R, 1, 5), pickR(R, [2, 2, 1, 4, 6])]; right = [4 * intR(R, 1, 4)];
          ans = sumQ(left) - sumQ(right); okA = ans >= 1 && ans <= 20 && ans % 4 !== 0;
        }
        step = { kind: 'scale', mode: 'add', left: left, right: right, q: P.scaleQA };
        var vA = { l: left.map(kg).join(' + '), r: right.map(kg).join(' + '), L: kg(sumQ(left)), Rr: kg(sumQ(right)), a: kg(ans) };
        step.hints = [P.scaleHintA1, t(P.scaleHintA2, vA)]; step.explain = t(P.scaleExplainA, vA);
        cand = [ans + 2, ans - 2, ans + 4, ans - 1, ans + 1, sumQ(left), ans + 6];
      } else { // B: n equal sacks on the left balance some weights on the right
        var n = pickR(R, [2, 2, 4, 3]), per;
        do { per = n === 3 ? 4 * intR(R, 1, 3) + (R() < 0.5 ? 2 : 0) : intR(R, 1, 12); } while ((per * n) % 4 !== 0 || per % 4 === 0 && R() < 0.7);
        var W = per * n, wts = W > 16 ? [16, W - 16] : [W];
        ans = per;
        step = { kind: 'scale', mode: 'sacks', n: n, left: [], right: wts, q: t(P.scaleQB, { n: n }) };
        var vB = { n: n, W: kg(W), a: kg(per) };
        step.hints = [P.scaleHintB1, t(P.scaleHintB2, vB)]; step.explain = t(P.scaleExplainB, vB);
        cand = [per * 2, per + 2, per - 2, per + 1, W, per + 4, per - 1];
      }
    } else { // U: a·x + b = c·x + d, x can be a half
      var a, c, b, d, x, half;
      do {
        a = intR(R, 2, 6); c = intR(R, 1, a - 1); half = (a - c) % 2 === 0 && R() < 0.4;
        x = half ? 4 * intR(R, 1, 4) + 2 : 4 * intR(R, 1, 8); b = intR(R, 0, 8) * 4; d = (a - c) * x + b;
      } while (d / 4 > 40 || d === b);
      ans = x;
      var lhs = (a === 1 ? '' : a) + 'x' + (b ? ' + ' + b / 4 : ''), rhs = (c === 1 ? '' : c) + 'x + ' + d / 4;
      var vU = { eq: lhs + ' = ' + rhs, k: a - c, c: c, b: b / 4, d: d / 4, db: (d - b) / 4, x: fq(x), lhs2: (a - c === 1 ? '' : a - c) + 'x' + (b ? ' + ' + b / 4 : ''), kx: (a - c === 1 ? '' : a - c) + 'x' };
      step = { kind: 'scale', mode: 'eq', a: a, b: b, c: c, d: d, eq: vU.eq, q: t(P.eqQ, vU) };
      step.hints = [P.eqHint1, t(P.eqHint2, vU)]; step.explain = t(b ? P.eqExplain : P.eqExplain0, vU);
      cand = [d - b, (d - b) / (a + c), x + 4, x - 4, x + 2, x * 2, (d + b) / (a - c)];
    }
    // the options: the answer and three wrong values (quarters, positive, different)
    opts = [ans];
    shuffleR(R, cand).forEach(function (v) { v = Math.round(v); if (opts.length < 4 && v > 0 && v <= 160 && opts.indexOf(v) < 0) opts.push(v); });
    for (var k = 1; opts.length < 4; k++) if (opts.indexOf(ans + 4 * k) < 0) opts.push(ans + 4 * k);
    opts.sort(function (p, q) { return p - q; });
    step.values = opts; step.options = opts.map(kg); step.answer = kg(ans); step.value = ans;
    return { room: 'middelalderen', band: band, steps: [step], vars: {} };
  }
  // the two sides' weights (quarters) when the child picks value v
  function scaleSides(step, v) {
    if (step.mode === 'add') return [sumQ(step.left), sumQ(step.right) + v];
    if (step.mode === 'sacks') return [step.n * v, sumQ(step.right)];
    return [step.a * v + step.b, step.c * v + step.d];
  }

  /* ================= 5. Renæssancen: Mr. Smith's letter ================= */
  var LETTER = {
    instr: [['violin', 'violin'], ['cello', 'cello'], ['piano', 'klaver'], ['trumpet', 'trompet']],
    place: [['the Town Hall', 'på rådhuset'], ['the cathedral', 'i domkirken'], ['the concert hall', 'i koncertsalen'], ['the old theatre', 'på det gamle teater']],
    sis: ['Mary', 'Emma', 'Kate', 'Lucy'],
    startM: [['7 pm', 19 * 60], ['8 pm', 20 * 60]], endM: [['11 pm', 23 * 60], ['11.30 pm', 23 * 60 + 30]],
    dinner: [['six o\'clock', 18 * 60], ['half past five', 17 * 60 + 30]], startU: [['half past seven', 19 * 60 + 30], ['eight o\'clock', 20 * 60]],
    endU: [['eleven', 23 * 60], ['half past eleven', 23 * 60 + 30]], n: [200, 300, 400], train: [['nine', 9 * 60], ['ten', 10 * 60]]
  };
  function uniq4(right, pool, R) { var o = [right]; shuffleR(R, pool).forEach(function (x) { if (o.length < 4 && o.indexOf(x) < 0) o.push(x); }); return shuffleR(R, o); }
  function makeLetter(band, R, ctx) {
    var P = S(), ins = pickR(R, LETTER.instr), pl = pickR(R, LETTER.place), sis = pickR(R, LETTER.sis), T = (ctx && ctx.T) || clockTime(band, R);
    var placeDa = LETTER.place.map(function (x) { return x[1]; });
    var steps = [], text, v;
    if (band === 'M') {
      var st = pickR(R, LETTER.startM), en = pickR(R, LETTER.endM);
      v = { instr: ins[0], place: pl[0], start: st[0], end: en[0], sis: sis };
      text = t(STORY.letters.M, v);
      var endDa = 'kl. ' + hm(en[1]);
      steps.push({ kind: 'mc', q: P.letQ1M, options: uniq4(t(P.letA1M, { i: ins[1] }), P.letW1M, R), answer: t(P.letA1M, { i: ins[1] }), ev: 'playing the ' + ins[0], hints: [P.letHint1M1, t(P.letHint1M2, { i: ins[0] })], explain: t(P.letExplain1M, { i: ins[0], d: ins[1] }) });
      steps.push({ kind: 'mc', q: P.letQ2M, options: uniq4(cap(pl[1]), placeDa.map(cap), R), answer: cap(pl[1]), ev: 'at ' + pl[0], hints: [P.letHint2M1, t(P.letHint2M2, { p: pl[0] })], explain: t(P.letExplain2M, { p: pl[0], d: pl[1] }) });
      steps.push({ kind: 'mc', q: P.letQ3M, options: uniq4(endDa, ['kl. ' + hm(en[1] - 12 * 60), 'kl. ' + hm(st[1]), 'kl. ' + hm(en[1] - 60), 'kl. ' + hm(st[1] - 12 * 60)], R), answer: endDa, ev: 'ends at ' + en[0], hints: [P.letHint3M1, t(P.letHint3M2, { e: en[0] })], explain: t(P.letExplain3M, { e: en[0], d: hm(en[1]) }) });
      v.startDa = hm(st[1]); v.endDa = hm(en[1]); v.from = st[1]; v.to = en[1];
    } else {
      var dn = pickR(R, LETTER.dinner), su = pickR(R, LETTER.startU), eu = pickR(R, LETTER.endU), n = pickR(R, LETTER.n), tr = pickR(R, LETTER.train);
      v = { instr: ins[0], place: pl[0], dinner: dn[0], start: su[0], end: eu[0], n: n, train: tr[0], sis: sis };
      text = t(STORY.letters.U, v);
      var a1 = t(P.letA1U, { p: pl[1] }), trainDa = 'kl. ' + hm(tr[1]);
      steps.push({ kind: 'mc', q: t(P.letQ1U, { T: hm(T) }), options: uniq4(a1, P.letW1U, R), answer: a1, ev: 'at ' + su[0] + ', I am playing the ' + ins[0], hints: [P.letHint1U1, t(P.letHint1U2, { s: su[0], e: eu[0], sd: hm(su[1]), ed: hm(eu[1]) })], explain: t(P.letExplain1U, { s: su[0], e: eu[0], sd: hm(su[1]), ed: hm(eu[1]), T: hm(T) }) });
      var a2 = t(P.letA2U, { n: n });
      steps.push({ kind: 'mc', q: P.letQ2U, options: uniq4(a2, P.letW2U, R), answer: a2, ev: 'More than ' + n + ' people', hints: [P.letHint2U1, P.letHint2U2], explain: t(P.letExplain2U, { n: n }) });
      steps.push({ kind: 'mc', q: P.letQ3U, options: uniq4(trainDa, ['kl. ' + hm(tr[1] + 12 * 60), 'kl. 16.00', 'kl. ' + hm(eu[1]), 'kl. ' + hm(dn[1])], R), answer: trainDa, ev: 'train leaves at ' + tr[0], hints: [P.letHint3U1, t(P.letHint3U2, { tr: tr[0] })], explain: t(P.letExplain3U, { tr: tr[0], d: hm(tr[1]) }) });
      v.startDa = hm(su[1]); v.endDa = hm(eu[1]); v.from = su[1]; v.to = eu[1]; v.dinnerAt = dn[1];
    }
    return { room: 'renaessancen', band: band, steps: steps, letter: text, T: T, vars: { instr: ins[1], place: pl[1], start: v.startDa, end: v.endDa }, info: v };
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ================= 6. Loftet: who is the thief? ================= */
  function makeLoftet(band, R, ctx) {
    var P = S(), T = hm((ctx && ctx.T) || clockTime(band, R)), steps = [];
    var sus = STORY.suspects, cleared = sus.filter(function (s) { return !s.culprit; }).map(function (s) { return s.id; }).sort(), thief = sus.filter(function (s) { return s.culprit; })[0];
    var magpie = band === 'M' ? P.magpieM : P.magpieU;
    steps.push({ kind: 'mc', q: P.loftQ1, options: shuffleR(R, magpie.slice()), answer: magpie[0], hints: [P.loftHint1a, P.loftHint1b], explain: P.loftExplain1 });
    steps.push({ kind: 'strike', q: band === 'M' ? P.loftQ2M : P.loftQ2U, answer: cleared, help: band === 'M', hints: [t(P.loftHint2a, { T: T }), P.loftHint2b], explain: P.loftExplain2 });
    if (band === 'U') {
      var why = P.whyU.map(function (x) { return t(x, { T: T }); });
      steps.push({ kind: 'mc', q: P.loftQ3U, options: shuffleR(R, why.slice()), answer: why[0], hints: [P.loftHint3a, t(P.loftHint3b, { T: T })], explain: t(P.loftExplain3, { T: T }) });
    }
    var names = sus.map(function (s) { return s.name + ' (' + s.role + ')'; }), right = thief.name + ' (' + thief.role + ')';
    steps.push({ kind: 'mc', q: P.loftQ4, options: shuffleR(R, names), answer: right, accuse: true, hints: [P.loftHint4a, P.loftHint4b], explain: t(P.loftExplain4, { T: T }) });
    return { room: 'loftet', band: band, steps: steps, vars: {}, T: T };
  }

  function make(room, band, R, ctx) {
    R = R || Math.random;
    switch (room) {
      case 'hallen': return makeHallen(band, R);
      case 'oldtiden': return makeOldtiden(band, R);
      case 'vikingetiden': return makeVikinge(band, R);
      case 'middelalderen': return makeMiddel(band, R);
      case 'renaessancen': return makeLetter(band, R, ctx);
      case 'loftet': return makeLoftet(band, R, ctx);
    }
    return null;
  }
  // is this answer right? code: [numbers], timeline: [ids], runes: 'WORD', mc/scale: 'option', strike: [ids]
  function check(step, a) {
    if (step.kind === 'code') return Array.isArray(a) && a.length === step.answer.length && a.every(function (x, i) { return String(x).trim() !== '' && Number(x) === step.answer[i]; });
    if (step.kind === 'timeline') return Array.isArray(a) && a.join() === step.answer.join();
    if (step.kind === 'runes') return String(a).toUpperCase() === step.answer;
    if (step.kind === 'strike') return Array.isArray(a) && a.slice().sort().join() === step.answer.slice().sort().join();
    return a === step.answer;
  }

  /* ================= drawings (pure SVG strings) ================= */
  // an analogue clock face showing minute-of-day T (the hour hand moves smoothly)
  function clockSvg(T, size, label) {
    var m = T % 60, h = (Math.floor(T / 60) % 12) + m / 60, o = '';
    o += '<circle cx="60" cy="60" r="56" fill="#FFF8E7" stroke="#6B4A1E" stroke-width="5"/><circle cx="60" cy="60" r="50" fill="none" stroke="#D9C49A" stroke-width="1.5"/>';
    for (var i = 0; i < 60; i++) { var a = i * Math.PI / 30, big = i % 5 === 0, r1 = big ? 42 : 46; o += '<line x1="' + f1(60 + Math.sin(a) * r1) + '" y1="' + f1(60 - Math.cos(a) * r1) + '" x2="' + f1(60 + Math.sin(a) * 49) + '" y2="' + f1(60 - Math.cos(a) * 49) + '" stroke="#3B2A14" stroke-width="' + (big ? 2.6 : 1) + '"/>'; }
    for (var n = 1; n <= 12; n++) { var b = n * Math.PI / 6; o += '<text x="' + f1(60 + Math.sin(b) * 34) + '" y="' + f1(60 - Math.cos(b) * 34 + 4.5) + '" font-size="12" font-weight="700" text-anchor="middle" fill="#3B2A14" font-family="Georgia,serif">' + n + '</text>'; }
    var ha = h * Math.PI / 6, ma = m * Math.PI / 30;
    o += '<line x1="60" y1="60" x2="' + f1(60 + Math.sin(ha) * 24) + '" y2="' + f1(60 - Math.cos(ha) * 24) + '" stroke="#1E140A" stroke-width="5.5" stroke-linecap="round"/>';
    o += '<line x1="60" y1="60" x2="' + f1(60 + Math.sin(ma) * 40) + '" y2="' + f1(60 - Math.cos(ma) * 40) + '" stroke="#1E140A" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="60" r="4" fill="#B8862B" stroke="#1E140A" stroke-width="1.5"/>';
    return '<svg viewBox="0 0 120 120" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(label || '') + '">' + o + '</svg>';
  }
  // runes: words = [[keys]], drawn on a stone-coloured band with dots between the words
  function runesSvg(words, o) {
    o = o || {};
    var hgt = o.h || 60, sc = hgt / 50, gap = 8, x = 10, parts = '', ink = o.ink || '#2B1A0C';
    words.forEach(function (w, wi) {
      if (wi) { parts += '<circle cx="' + f1((x + 3) * sc) + '" cy="' + f1(20 * sc) + '" r="' + f1(2.2 * sc) + '" fill="' + ink + '"/><circle cx="' + f1((x + 3) * sc) + '" cy="' + f1(32 * sc) + '" r="' + f1(2.2 * sc) + '" fill="' + ink + '"/>'; x += 14; }
      w.forEach(function (k) { parts += '<path d="' + rune(k).d + '" transform="translate(' + f1(x * sc) + ',' + f1(5 * sc) + ') scale(' + f1(sc * 100) / 100 + ')" fill="none" stroke="' + ink + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'; x += 20 + gap; });
    });
    var W = Math.round((x + 6) * sc), H = Math.round(hgt);
    return '<svg class="mu-runes-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.label || '') + '">' + parts + '</svg>';
  }
  // one rune as a small svg (for the key)
  function runeIcon(k, size, ink) {
    return '<svg viewBox="0 0 20 40" width="' + Math.round(size / 2) + '" height="' + size + '" aria-hidden="true"><path d="' + rune(k).d + '" fill="none" stroke="' + (ink || '#2B1A0C') + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  // the label under a rune in the key: Mellemtrin shows the main letter, Udskoling all its sounds
  function runeLabel(k, band) { var r = rune(k); return band === 'U' ? r.vals.join('/') : r.main; }

  // the scale: sides = [left quarters, right quarters] decide the tilt; weights and sacks are drawn in the pans with big labels
  function scaleSvg(step, v, o) {
    o = o || {};
    var has = v !== null && v !== undefined, sides = has ? scaleSides(step, v) : null, tilt = 0;
    if (step.mode === 'add' && !has) sides = [sumQ(step.left), sumQ(step.right)];
    if (sides) tilt = sides[0] > sides[1] ? -8 : sides[0] < sides[1] ? 8 : 0;
    var W = 500, Hh = 300, cx = 250, top = 50, arm = 150, rad = tilt * Math.PI / 180, out = '';
    var lx = cx - Math.cos(rad) * arm, ly = top - Math.sin(rad) * arm, rx = cx + Math.cos(rad) * arm, ry = top + Math.sin(rad) * arm;
    out += '<rect x="220" y="282" width="60" height="14" rx="4" fill="#6B4A1E"/><rect x="243" y="' + top + '" width="14" height="234" fill="#8A6230" stroke="#4A3010" stroke-width="2"/>';
    out += '<line x1="' + f1(lx) + '" y1="' + f1(ly) + '" x2="' + f1(rx) + '" y2="' + f1(ry) + '" stroke="#5A3A12" stroke-width="9" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + top + '" r="9" fill="#C9A03B" stroke="#4A3010" stroke-width="2"/>';
    function thingW(th) { return th.sack ? 40 : Math.max(38, th.label.length * 10 + 14); }
    function pan(px, py, things) {
      var g = '', pw = 196, bx = px - pw / 2, by = py + 150;
      g += '<line x1="' + f1(px) + '" y1="' + f1(py) + '" x2="' + f1(bx + 6) + '" y2="' + f1(by) + '" stroke="#4A3010" stroke-width="2"/><line x1="' + f1(px) + '" y1="' + f1(py) + '" x2="' + f1(bx + pw - 6) + '" y2="' + f1(by) + '" stroke="#4A3010" stroke-width="2"/>';
      // lay the things out in rows from the bottom of the pan
      var rows = [[]], rowW = [0];
      things.forEach(function (th) { var w = thingW(th) + 4; if (rowW[rowW.length - 1] + w > pw - 10 && rows[rows.length - 1].length) { rows.push([]); rowW.push(0); } rows[rows.length - 1].push(th); rowW[rowW.length - 1] += w; });
      rows.forEach(function (row, ri) {
        var x = px - rowW[ri] / 2 + 2, base = by - ri * 36;
        row.forEach(function (th) {
          var w = thingW(th);
          if (th.sack) g += '<path d="M' + f1(x + 4) + ',' + f1(base) + ' q-6,-18 6,-28 l-3,-5 h' + f1(w - 14) + ' l-3,5 q12,10 6,28z" fill="#D9B97A" stroke="#6B4A1E" stroke-width="2"/><text x="' + f1(x + w / 2) + '" y="' + f1(base - 9) + '" font-size="15" font-weight="800" text-anchor="middle" fill="#2B1D10" font-family="system-ui,sans-serif">' + esc(th.label) + '</text>';
          else g += '<path d="M' + f1(x) + ',' + f1(base) + ' l4,-30 h' + f1(w - 8) + ' l4,30z" fill="' + (th.unknown ? '#F7C548' : '#5F636B') + '" stroke="#2E2F33" stroke-width="2"/><text x="' + f1(x + w / 2) + '" y="' + f1(base - 9) + '" font-size="16" font-weight="800" text-anchor="middle" fill="' + (th.unknown ? '#2B1D10' : '#FFFFFF') + '" font-family="system-ui,sans-serif">' + esc(th.label) + '</text>';
          x += w + 4;
        });
      });
      g += '<path d="M' + f1(bx) + ',' + f1(by) + ' h' + pw + ' q-8,18 -' + (pw / 2) + ',18 q-' + (pw / 2 - 8) + ',0 -' + (pw / 2) + ',-18z" fill="#C9A03B" stroke="#6B4A1E" stroke-width="2"/>';
      return g;
    }
    function wt(q) { return { label: kg(q) }; }
    var L = [], Rr = [], lab = has ? fq(v) : null;
    if (step.mode === 'add') { L = step.left.map(wt); Rr = step.right.map(wt); Rr.push({ label: has ? kg(v) : '?', unknown: true }); }
    else if (step.mode === 'sacks') { for (var i = 0; i < step.n; i++) L.push({ sack: true, label: lab || '?' }); Rr = step.right.map(wt); }
    else {
      for (var a = 0; a < step.a; a++) L.push({ sack: true, label: lab || 'x' });
      if (step.b) L.push(wt(step.b));
      for (var c = 0; c < step.c; c++) Rr.push({ sack: true, label: lab || 'x' });
      Rr.push(wt(step.d));
    }
    out += pan(lx, ly, L) + pan(rx, ry, Rr);
    return '<svg class="mu-scale-svg" viewBox="0 0 ' + W + ' ' + Hh + '" width="' + (o.w || W) + '" role="img" aria-label="' + esc(o.label || '') + '">' + out + '</svg>';
  }
  // the scale in words (for screen readers and small screens)
  function scaleText(step) {
    var P = S(), l, r;
    if (step.mode === 'add') { l = step.left.map(kg).join(' + '); r = step.right.map(kg).concat(['?']).join(' + '); }
    else if (step.mode === 'sacks') { l = t(P.sacksN, { n: step.n }); r = step.right.map(kg).join(' + '); }
    else { var sx = function (n) { return n === 1 ? 'x' : t(P.sacksX, { n: n }); }; l = sx(step.a) + (step.b ? ' + ' + kg(step.b) : ''); r = sx(step.c) + ' + ' + kg(step.d); }
    return t(P.scaleWords, { l: l, r: r });
  }

  // small pictures of the finds on the timeline
  function findSvg(id, size) {
    var o = '';
    switch (id) {
      case 'koelbjerg': o = '<path d="M14,34 q-6,-4 -2,-9 q4,-3 7,1 l22,0 q3,-4 7,-1 q4,5 -2,9 q6,4 2,9 q-4,3 -7,-1 l-22,0 q-3,4 -7,1 q-4,-5 2,-9z" fill="#EFE6D0" stroke="#6E5B3A" stroke-width="2"/>'; break;
      case 'solvognen': o = '<circle cx="44" cy="26" r="13" fill="#E9B93A" stroke="#7A5A10" stroke-width="2"/><path d="M38,26 a6,6 0 1 1 6,6" fill="none" stroke="#7A5A10" stroke-width="1.6"/><path d="M8,38 q2,-10 10,-12 l6,-6 l2,4 q4,2 6,8 l0,6" fill="#B07A3A" stroke="#5A3A12" stroke-width="2"/><line x1="12" y1="38" x2="12" y2="46" stroke="#5A3A12" stroke-width="2.5"/><line x1="28" y1="40" x2="28" y2="46" stroke="#5A3A12" stroke-width="2.5"/><circle cx="12" cy="49" r="4" fill="none" stroke="#5A3A12" stroke-width="2"/><circle cx="28" cy="49" r="4" fill="none" stroke="#5A3A12" stroke-width="2"/><circle cx="44" cy="49" r="4" fill="none" stroke="#5A3A12" stroke-width="2"/>'; break;
      case 'egtved': o = '<path d="M14,50 v-20 q0,-12 16,-12 q16,0 16,12 v20z" fill="#B77F45" stroke="#5A3A12" stroke-width="2"/><circle cx="30" cy="34" r="9" fill="#E9B93A" stroke="#7A5A10" stroke-width="2"/><path d="M26,34 a4,4 0 1 1 4,4" fill="none" stroke="#7A5A10" stroke-width="1.5"/><path d="M14,46 h32" stroke="#5A3A12" stroke-width="2"/>'; break;
      case 'tollund': o = '<path d="M14,40 q0,-24 16,-24 q16,0 16,24 q-16,6 -32,0z" fill="#6E4A2A" stroke="#3B2614" stroke-width="2"/><path d="M18,24 l24,0 M16,30 l28,0 M20,18 l20,0" stroke="#9A7048" stroke-width="2"/><path d="M30,16 v-4" stroke="#3B2614" stroke-width="3" stroke-linecap="round"/>'; break;
      case 'hjortspring': o = '<path d="M4,30 q6,8 16,10 h20 q10,-2 16,-10 l2,-6 q-4,8 -18,10 h-20 q-14,-2 -18,-10z" fill="#8A5A2E" stroke="#4A2C12" stroke-width="2"/><path d="M4,30 l-2,-8 M56,30 l2,-8" stroke="#4A2C12" stroke-width="2.5" stroke-linecap="round"/>'; break;
      case 'guldhorn': o = '<path d="M8,46 q4,-28 38,-38 l4,8 q-26,10 -32,34z" fill="#E9B93A" stroke="#7A5A10" stroke-width="2"/><path d="M14,40 l8,4 M18,32 l9,3 M24,24 l9,2 M32,17 l8,2" stroke="#7A5A10" stroke-width="1.8"/>'; break;
      case 'jelling': o = '<path d="M14,52 l-2,-26 q6,-18 20,-18 q16,2 18,18 l-2,26z" fill="#B9B1A3" stroke="#555048" stroke-width="2"/><path d="M22,26 v18 M22,26 l5,5 M30,24 v20 M30,30 l5,-5 M38,26 v18 M34,30 l8,8" stroke="#8C2F25" stroke-width="2" stroke-linecap="round"/>'; break;
    }
    return '<svg viewBox="0 0 60 60" width="' + size + '" height="' + size + '" aria-hidden="true">' + o + '</svg>';
  }

  var MU_PUZ = { ROOMS: ROOMS, FINDS: FINDS, PERIODS: PERIODS, RUNES: RUNES, ENC: ENC, M_WORDS: M_WORDS, U_PARTS: U_PARTS, LETTER: LETTER, SIGN_OUT: SIGN_OUT, CLOSE: CLOSE, T_MIN: T_MIN, T_MAX: T_MAX,
    make: make, check: check, hm: hm, fq: fq, kg: kg, encode: encode, fits: fits, rune: rune, runeLabel: runeLabel, scaleSides: scaleSides, clockTime: clockTime, sentence: sentence,
    clockSvg: clockSvg, runesSvg: runesSvg, scaleText: scaleText, runeIcon: runeIcon, scaleSvg: scaleSvg, findSvg: findSvg, find: find, t: t };
  root.MU_PUZ = MU_PUZ;
  if (typeof module !== 'undefined') module.exports = MU_PUZ;
})(typeof window !== 'undefined' ? window : this);
