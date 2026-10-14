/*
 * Tankespind – opgaverne. Alle opgaver laves af regler i koden, så der altid er præcis ét rigtigt svar:
 * hver forkert valgmulighed bryder netop én regel. Ingen DOM her: tegningerne er SVG-tekst.
 * Danske ord og forklaringer står i strings-da.js (STR.tk); ordlister til ordopgaverne står nederst her.
 * Testes med node tools/test-tankespind.js.
 */
(function (root) {
  'use strict';

  /* ---------- small helpers (R = a function returning 0 ≤ x < 1) ---------- */
  function int(R, a, b) { return a + Math.floor(R() * (b - a + 1)); }
  function pick(R, a) { return a[Math.floor(R() * a.length)]; }
  function shuffle(R, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function cap(x) { return x.charAt(0).toUpperCase() + x.slice(1); }
  function T(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; }); }
  function S() { return (root.STR && root.STR.tk) || {}; }

  /* ---------- figures ----------
     A figure is { s: shape, p: paint, n: how many (1–6), r: turned in 1/8 turns (0–7), z: size 0–2 }.
     Only arrows and triangles are ever turned, so turning is always visible. Every colour has its own pattern,
     so children who cannot tell the colours apart can still solve every puzzle. */
  var SHAPES = ['cirkel', 'kvadrat', 'trekant', 'stjerne', 'pil', 'kryds']; // no hexagon: at small sizes it looks too much like a circle
  var TURNABLE = ['pil', 'trekant'];
  var PAINTS = ['blaa', 'roed', 'gul', 'groen', 'hvid'];
  var PAINT = { blaa: ['#3E8FC2', null], roed: ['#D9463B', 'stripes'], gul: ['#F2C94C', 'dots'], groen: ['#6FB04A', 'check'], hvid: ['#FFFFFF', null] };
  function fig(o) { return { s: o.s || 'cirkel', p: o.p || 'blaa', n: o.n || 1, r: o.r || 0, z: o.z === undefined ? 1 : o.z }; }
  function norm(f) { return { s: f.s, p: f.p, n: f.n, r: TURNABLE.indexOf(f.s) >= 0 ? ((f.r % 8) + 8) % 8 : 0, z: f.z }; }
  function same(a, b) { a = norm(a); b = norm(b); return a.s === b.s && a.p === b.p && a.n === b.n && a.r === b.r && a.z === b.z; }
  function diffAttrs(a, b) { a = norm(a); b = norm(b); return ['s', 'p', 'n', 'r', 'z'].filter(function (k) { return a[k] !== b[k]; }); }
  function key(f) { f = norm(f); return [f.s, f.p, f.n, f.r, f.z].join('|'); }

  function shapePath(s, R) {
    var i, d = '', a;
    switch (s) {
      case 'cirkel': return '<circle r="' + R + '"/>';
      case 'kvadrat': return '<rect x="' + (-R * 0.85) + '" y="' + (-R * 0.85) + '" width="' + (R * 1.7) + '" height="' + (R * 1.7) + '" rx="' + (R * 0.12) + '"/>';
      case 'trekant': return '<path d="M0,' + (-R) + ' L' + (R * 0.95) + ',' + (R * 0.75) + ' L' + (-R * 0.95) + ',' + (R * 0.75) + ' Z"/>';
      case 'stjerne': for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; var rr = i % 2 ? R * 0.45 : R; d += (i ? 'L' : 'M') + (rr * Math.cos(a)).toFixed(1) + ',' + (rr * Math.sin(a)).toFixed(1); } return '<path d="' + d + 'Z"/>';
      case 'pil': return '<path d="M0,' + (-R) + ' L' + (R * 0.8) + ',' + (-R * 0.15) + ' L' + (R * 0.3) + ',' + (-R * 0.15) + ' L' + (R * 0.3) + ',' + R + ' L' + (-R * 0.3) + ',' + R + ' L' + (-R * 0.3) + ',' + (-R * 0.15) + ' L' + (-R * 0.8) + ',' + (-R * 0.15) + ' Z"/>';
      case 'sekskant': for (i = 0; i < 6; i++) { a = i * Math.PI / 3; d += (i ? 'L' : 'M') + (R * Math.cos(a)).toFixed(1) + ',' + (R * Math.sin(a)).toFixed(1); } return '<path d="' + d + 'Z"/>';
      case 'kryds': var w = R * 0.36; return '<path d="M' + (-w) + ',' + (-R) + ' H' + w + ' V' + (-w) + ' H' + R + ' V' + w + ' H' + w + ' V' + R + ' H' + (-w) + ' V' + w + ' H' + (-R) + ' V' + (-w) + ' H' + (-w) + ' Z"/>';
    }
    return '';
  }
  var POS = { 1: [[50, 50]], 2: [[29, 50], [71, 50]], 3: [[50, 28], [28, 70], [72, 70]], 4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]], 6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]] };
  var uid = 0, idPre = '';
  // Pattern ids must be unique on the page. The daily challenge draws with its own prefix and counter, so the same day gives the same picture.
  function ids(prefix, fn) { var keep = [uid, idPre]; uid = 0; idPre = prefix; try { return fn(); } finally { uid = keep[0]; idPre = keep[1]; } }
  // A figure in a 100×100 box (as SVG elements, no outer <svg>)
  function figInner(f, idp) {
    f = norm(f);
    var col = PAINT[f.p] || PAINT.blaa, fill = col[0], defs = '';
    if (col[1]) {
      var pid = idPre + idp + 'p' + (uid++);
      var body = col[1] === 'stripes' ? '<rect width="8" height="8" fill="#FFFFFF"/><rect width="4" height="8" fill="' + col[0] + '"/>'
        : col[1] === 'dots' ? '<rect width="8" height="8" fill="' + col[0] + '"/><circle cx="4" cy="4" r="1.6" fill="#7A5A10"/>'
        : '<rect width="8" height="8" fill="#FFFFFF"/><rect width="4" height="4" fill="' + col[0] + '"/><rect x="4" y="4" width="4" height="4" fill="' + col[0] + '"/>';
      defs = '<defs><pattern id="' + pid + '" width="8" height="8" patternUnits="userSpaceOnUse"' + (col[1] === 'stripes' ? ' patternTransform="rotate(45)"' : '') + '>' + body + '</pattern></defs>';
      fill = 'url(#' + pid + ')';
    }
    var base = [16, 24, 33][f.z] * (f.n > 1 ? (f.n > 4 ? 0.5 : 0.6) : 1);
    var out = defs;
    POS[f.n].forEach(function (p) {
      out += '<g transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + (f.r * 45) + ')" fill="' + fill + '" stroke="#4A2C17" stroke-width="3" stroke-linejoin="round">' + shapePath(f.s, base) + '</g>';
    });
    return out;
  }
  function figSvg(f, px, label) {
    return '<svg viewBox="0 0 100 100" width="' + (px || 80) + '" height="' + (px || 80) + '" role="img" aria-label="' + (label || describe(f)) + '">' + figInner(f, 'f') + '</svg>';
  }
  function describe(f) {
    var s = S(); f = norm(f);
    var shape = (s.shapes || {})[f.s] || f.s, paint = (s.paints || {})[f.p] || f.p;
    return f.n > 1 ? f.n + ' ' + ((s.shapesPl || {})[f.s] || shape) + ', ' + paint : shape + ', ' + paint;
  }

  /* ---------- 1. Hvad kommer nu? (figure rows) ---------- */
  // rules: { a: attribute, kind: 'step' | 'cycle', d: step, list: values }
  function applyRules(start, rules, i) {
    var f = fig(start);
    rules.forEach(function (ru) {
      if (ru.kind === 'step') f[ru.a] = start[ru.a] + ru.d * i;
      else f[ru.a] = ru.list[i % ru.list.length];
    });
    if (f.r !== undefined) f.r = ((f.r % 8) + 8) % 8;
    return f;
  }
  var RULE_POOL = {
    1: ['n+1', 'p2', 's2'], 2: ['n+1', 'n-1', 'p3', 's3', 'r2'], 3: ['n+1', 'n-1', 'p2', 'p3', 's2', 's3', 'r2'],
    4: ['n+1', 'n-1', 'p3', 's3', 'r2', 'r1', 'z2'], 5: ['n+1', 'n-1', 'p3', 's3', 'r1', 'r2', 'z2', 'z3']
  };
  var RULE_COUNT = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3 };
  function makeRule(R, id, start) {
    var a = id.charAt(0);
    if (a === 'n') return { a: 'n', kind: 'step', d: id === 'n+1' ? 1 : -1 };
    if (a === 'r') return { a: 'r', kind: 'step', d: +id.charAt(1) };
    var len = +id.charAt(1), pool = a === 'p' ? PAINTS.slice(0, 4) : a === 's' ? SHAPES : [0, 1, 2];
    var list = shuffle(R, pool).slice(0, len);
    return { a: a, kind: 'cycle', list: list };
  }
  function ruleSentence(ru) {
    var s = S(), L = s.rules || {};
    if (ru.a === 'n') return ru.d > 0 ? L.nUp : L.nDown;
    if (ru.a === 'r') return ru.d === 2 ? L.rQuarter : L.rEighth;
    var names = ru.list.map(function (v) { return ru.a === 'p' ? s.paints[v] : ru.a === 's' ? s.shapes[v] : s.sizes[v]; });
    return T(ru.a === 'p' ? L.pCycle : ru.a === 's' ? L.sCycle : L.zCycle, { list: names.concat(names[0]).join(', ') + ' …' });
  }
  function ruleHint(ru) { var H = S().hints || {}; return H[ru.a]; }
  function figRow(R, level) {
    for (var guard = 0; guard < 400; guard++) {
      var ids = shuffle(R, RULE_POOL[level]), chosen = [], attrs = {};
      ids.forEach(function (id) { var a = id.charAt(0); if (chosen.length < RULE_COUNT[level] && !attrs[a]) { attrs[a] = 1; chosen.push(id); } });
      if (attrs.r && attrs.s) continue; // turning needs a turnable shape all the way
      var start = fig({ s: attrs.r ? pick(R, TURNABLE) : pick(R, SHAPES), p: pick(R, PAINTS.slice(0, 4)), n: 1, r: attrs.r ? int(R, 0, 7) : 0, z: attrs.z ? 0 : 1 });
      if (attrs.n) start.n = chosen.indexOf('n-1') >= 0 ? int(R, 5, 6) : int(R, 1, 2);
      if (!attrs.n && !attrs.z && R() < 0.4) start.n = int(R, 1, 3);
      var rules = chosen.map(function (id) { return makeRule(R, id, start); });
      rules.forEach(function (ru) { if (ru.kind === 'cycle') start[ru.a] = ru.list[0]; });
      var seq = [0, 1, 2, 3].map(function (i) { return applyRules(start, rules, i); }), ans = applyRules(start, rules, 4);
      if (ans.n < 1 || ans.n > 6 || seq.some(function (f) { return f.n < 1 || f.n > 6; })) continue;
      var wrong = wrongOptions(R, ans, rules, seq[3], 3);
      if (!wrong) continue;
      var opts = shuffle(R, [ans].concat(wrong));
      return { type: 'figrow', level: level, seq: seq, options: opts, answer: opts.indexOf(ans), rules: rules, start: start,
        hint: ruleHint(rules[0]), explain: rules.map(ruleSentence).join(' ') };
    }
    throw new Error('figRow');
  }
  // Wrong options that each differ from the answer in exactly one attribute
  function wrongOptions(R, ans, rules, prev, count) {
    var cands = [], changing = rules.map(function (r) { return r.a; });
    rules.forEach(function (ru) { var f = fig(ans); f[ru.a] = prev[ru.a]; cands.push(f); }); // forgot to change it
    rules.forEach(function (ru) {
      var f = fig(ans);
      if (ru.a === 'n') f.n = ans.n + (ru.d > 0 ? 1 : -1);
      else if (ru.a === 'r') f.r = ans.r + (ru.d === 2 ? 4 : 2);
      else { var vals = (ru.a === 'p' ? PAINTS.slice(0, 4) : ru.a === 's' ? (changing.indexOf('r') >= 0 ? TURNABLE : SHAPES) : [0, 1, 2]).filter(function (v) { return v !== ans[ru.a]; }); f[ru.a] = pick(R, vals); }
      cands.push(f);
    });
    ['p', 's', 'n'].forEach(function (a) {
      if (changing.indexOf(a) >= 0 || (a === 's' && changing.indexOf('r') >= 0)) return;
      var f = fig(ans);
      if (a === 'n') f.n = ans.n === 6 ? 5 : ans.n + 1;
      else f[a] = pick(R, (a === 'p' ? PAINTS.slice(0, 4) : SHAPES).filter(function (v) { return v !== ans[a]; }));
      cands.push(f);
    });
    if (TURNABLE.indexOf(ans.s) >= 0 && changing.indexOf('r') < 0) { var g = fig(ans); g.r = ans.r + 2; cands.push(g); }
    var out = [];
    shuffle(R, cands).forEach(function (f) {
      if (out.length >= count || f.n < 1 || f.n > 6 || f.z < 0 || f.z > 2) return;
      if (diffAttrs(f, ans).length !== 1) return;
      if (out.some(function (o) { return same(o, f); })) return;
      out.push(f);
    });
    return out.length === count ? out : null;
  }

  /* ---------- 2. Talrækker ---------- */
  var NUM_RULES = { 1: ['add'], 2: ['add', 'sub', 'mul2'], 3: ['alt', 'inc', 'sub', 'mul2'], 4: ['alt', 'inc', 'sq', 'mul3', 'inter'], 5: ['fib', 'mul2add', 'tri', 'inter', 'sq', 'inc2'] };
  function numSeq(rule, len) {
    var out = [], i;
    switch (rule.k) {
      case 'add': for (i = 0; i < len; i++) out.push(rule.a + rule.d * i); break;
      case 'sub': for (i = 0; i < len; i++) out.push(rule.a - rule.d * i); break;
      case 'mul2': case 'mul3': for (i = 0, x = rule.a; i < len; i++, x *= rule.m) out.push(x); break;
      case 'alt': for (i = 0, x = rule.a; i < len; i++) { out.push(x); x += i % 2 ? rule.e : rule.d; } break;
      case 'inc': for (i = 0, x = rule.a; i < len; i++) { out.push(x); x += rule.d + i; } break;
      case 'inc2': for (i = 0, x = rule.a; i < len; i++) { out.push(x); x += rule.d + 2 * i; } break;
      case 'sq': for (i = 0; i < len; i++) out.push((rule.a + i) * (rule.a + i)); break;
      case 'tri': for (i = 0; i < len; i++) out.push((rule.a + i) * (rule.a + i + 1) / 2); break;
      case 'inter': for (i = 0; i < len; i++) out.push(i % 2 ? rule.b + rule.e * ((i - 1) / 2) : rule.a + rule.d * (i / 2)); break;
      case 'fib': out.push(rule.a, rule.b); for (i = 2; i < len; i++) out.push(out[i - 1] + out[i - 2]); break;
      case 'mul2add': for (i = 0, x = rule.a; i < len; i++, x = 2 * x + rule.d) out.push(x); break;
    }
    var x;
    return out;
  }
  function numExplain(rule, seq, ans) {
    var L = S().num || {}, last = seq[seq.length - 1], prev = seq[seq.length - 2], t = { a: last, ans: ans, d: rule.d, e: rule.e, m: rule.m };
    switch (rule.k) {
      case 'add': return T(L.add, t);
      case 'sub': return T(L.sub, t);
      case 'mul2': case 'mul3': return T(L.mul, t);
      case 'alt': return T(L.alt, { d: rule.d, e: rule.e, a: last, ans: ans, s: ans - last });
      case 'inc': case 'inc2': return T(L.inc, { diffs: seq.slice(1).map(function (v, i) { return '+' + (v - seq[i]); }).join(', '), a: last, s: ans - last, ans: ans });
      case 'sq': return T(L.sq, { n: rule.a + seq.length, ans: ans });
      case 'tri': return T(L.tri, { a: last, s: ans - last, ans: ans });
      case 'inter': return T(L.inter, { b: seq[seq.length - 2], s: ans - seq[seq.length - 2], ans: ans });
      case 'fib': return T(L.fib, { a: prev, b: last, ans: ans });
      case 'mul2add': return T(rule.d > 0 ? L.mul2add : L.mul2sub, { a: last, d: Math.abs(rule.d), ans: ans });
    }
    return '';
  }
  function numRow(R, level) {
    for (var guard = 0; guard < 400; guard++) {
      var k = pick(R, NUM_RULES[level]), rule = { k: k };
      switch (k) {
        case 'add': rule.a = int(R, 1, level > 1 ? 40 : 15); rule.d = int(R, level > 1 ? 3 : 1, level > 1 ? 12 : 5); break;
        case 'sub': rule.d = int(R, 2, 9); rule.a = rule.d * int(R, 6, 9) + int(R, 0, 9); break;
        case 'mul2': rule.m = 2; rule.a = int(R, 1, level > 2 ? 6 : 3); break;
        case 'mul3': rule.m = 3; rule.a = int(R, 1, 3); break;
        case 'alt': rule.a = int(R, 1, 10); rule.d = int(R, 1, 6); rule.e = int(R, 1, 6); if (rule.d === rule.e) continue; break;
        case 'inc': rule.a = int(R, 1, 10); rule.d = int(R, 1, 3); break;
        case 'inc2': rule.a = int(R, 1, 10); rule.d = int(R, 1, 3); break;
        case 'sq': rule.a = int(R, 1, 5); break;
        case 'tri': rule.a = 1; break;
        case 'inter': rule.a = int(R, 1, 9); rule.d = int(R, 1, 4); rule.b = int(R, 20, 40); rule.e = -int(R, 1, 4); break;
        case 'fib': rule.a = int(R, 1, 3); rule.b = int(R, 1, 4); break;
        case 'mul2add': rule.a = int(R, 1, 4); rule.d = R() < 0.5 ? 1 : -1; if (rule.d < 0 && rule.a < 2) continue; break;
      }
      var len = level === 1 ? 5 : 6, all = numSeq(rule, len + 1), seq = all.slice(0, len), ans = all[len];
      if (all.some(function (v) { return v < 0 || v > 999 || v !== Math.round(v); })) continue;
      var last = seq[len - 1], d1 = last - seq[len - 2];
      var cands = [ans + 1, ans - 1, last + d1, ans + d1, ans - d1, ans + 2, ans - 2, ans + 10, last + (seq[1] - seq[0])];
      var wrong = [];
      shuffle(R, cands).forEach(function (v) { if (wrong.length < 3 && v >= 0 && v !== ans && wrong.indexOf(v) < 0) wrong.push(v); });
      if (wrong.length < 3) continue;
      var opts = shuffle(R, [ans].concat(wrong));
      return { type: 'numrow', level: level, seq: seq, rule: rule, options: opts, answer: opts.indexOf(ans), value: ans,
        hint: (S().hints || {}).num, explain: numExplain(rule, seq, ans) };
    }
    throw new Error('numRow');
  }

  /* ---------- 3. Den skæve ---------- */
  var NUM_PROPS = {
    even: function (x) { return x % 2 === 0; }, five: function (x) { return x % 5 === 0; }, ten: function (x) { return x % 10 === 0; },
    three: function (x) { return x % 3 === 0; }, square: function (x) { return Math.round(Math.sqrt(x)) * Math.round(Math.sqrt(x)) === x; },
    twodigit: function (x) { return x >= 10 && x <= 99; }
  };
  function oddFigures(R, level) {
    var target = level === 1 ? 's' : level === 2 ? 'p' : pick(R, ['n', 's', 'p']);
    for (var guard = 0; guard < 500; guard++) {
      var figs = [0, 1, 2, 3, 4].map(function () { return fig({}); }), oddIdx = int(R, 0, 4);
      var common = { s: pick(R, SHAPES.filter(function (s) { return TURNABLE.indexOf(s) < 0; })), p: pick(R, PAINTS.slice(0, 4)), n: int(R, 1, 4) };
      var other = { s: pick(R, SHAPES.filter(function (s) { return s !== common.s && TURNABLE.indexOf(s) < 0; })), p: pick(R, PAINTS.filter(function (p) { return p !== common.p; })), n: common.n === 4 ? 2 : common.n + int(R, 1, 2) };
      ['s', 'p', 'n'].forEach(function (a) {
        if (a === target) { figs.forEach(function (f, i) { f[a] = i === oddIdx ? other[a] : common[a]; }); return; }
        var varies = level >= 3 || (level === 1 && a === 'p') || (level === 2 && a === 's');
        if (!varies) { figs.forEach(function (f) { f[a] = common[a]; }); return; }
        // two values, each on at least two figures, so this attribute never points at a single figure
        var two = [common[a], other[a]], split = shuffle(R, [0, 0, 1, 1, R() < 0.5 ? 0 : 1]);
        figs.forEach(function (f, i) { f[a] = two[split[i]]; });
      });
      if (!oddOk(figs, oddIdx, target)) continue;
      var s = S(), name = { s: function (f) { return s.shapes[f.s]; }, p: function (f) { return s.paints[f.p]; }, n: function (f) { return String(f.n); } }[target];
      return { type: 'odd', kind: 'fig', level: level, items: figs, answer: oddIdx, target: target, hint: (s.hints || {})['odd_' + target],
        explain: T(s.oddFig[target], { common: name(figs[(oddIdx + 1) % 5]), odd: name(figs[oddIdx]) }) };
    }
    throw new Error('oddFigures');
  }
  // exactly one attribute has a single figure that differs from the rest, and that figure is the odd one
  function oddOk(figs, oddIdx, target) {
    var ok = true;
    ['s', 'p', 'n'].forEach(function (a) {
      var counts = {}; figs.forEach(function (f) { counts[f[a]] = (counts[f[a]] || 0) + 1; });
      var vals = Object.keys(counts);
      if (a === target) { if (!(vals.length === 2 && counts[figs[oddIdx][a]] === 1)) ok = false; }
      else if (vals.some(function (v) { return counts[v] === 1; })) ok = false;
    });
    return ok;
  }
  function oddNumbers(R, level) {
    var props = level >= 5 ? ['even', 'five', 'three', 'square', 'ten'] : ['even', 'five', 'ten'];
    for (var guard = 0; guard < 2000; guard++) {
      var prop = pick(R, props), f = NUM_PROPS[prop], max = level >= 5 ? 100 : 60, items = [], odd = null, tries = 0;
      while (items.length < 4 && tries++ < 300) { var x = int(R, 2, max); if (f(x) && items.indexOf(x) < 0) items.push(x); }
      while (odd === null && tries++ < 600) { var y = int(R, 2, max); if (!f(y) && items.indexOf(y) < 0) odd = y; }
      if (items.length < 4 || odd === null) continue;
      var oddIdx = int(R, 0, 4); items.splice(oddIdx, 0, odd);
      // no other property may also single out exactly one number
      var clash = Object.keys(NUM_PROPS).some(function (p) {
        if (p === prop) return false;
        var n = items.filter(NUM_PROPS[p]).length; return n === 1 || n === 4;
      });
      if (clash) continue;
      var s = S();
      return { type: 'odd', kind: 'num', level: level, items: items, answer: oddIdx, prop: prop, hint: s.hints.odd_num,
        explain: T(s.oddNum[prop], { list: items.filter(function (v, i) { return i !== oddIdx; }).join(', '), odd: odd }) };
    }
    throw new Error('oddNumbers');
  }
  function oddWords(R, level, band) {
    var cats = WORDS.filter(function (c) { return c.b === 'M' || band === 'U'; });
    var a = pick(R, cats), b = pick(R, cats.filter(function (c) { return c !== a && c.not.indexOf(a.id) < 0 && a.not.indexOf(c.id) < 0; }));
    var items = shuffle(R, a.words).slice(0, 4), odd = pick(R, b.words), oddIdx = int(R, 0, 4);
    items.splice(oddIdx, 0, odd);
    var s = S(), four = items.filter(function (w, i) { return i !== oddIdx; });
    return { type: 'odd', kind: 'word', level: level, items: items, answer: oddIdx, cat: a.id, oddCat: b.id, hint: s.hints.odd_word,
      explain: T(s.oddWord, { list: cap(four.slice(0, 3).join(', ') + ' og ' + four[3]), cat: a.name, odd: odd, oddCat: b.one }) };
  }
  function oddOne(R, level, band) {
    if (level <= 3) return oddFigures(R, level);
    if (level === 4) return R() < 0.5 ? oddNumbers(R, level) : oddWords(R, level, band);
    return pick(R, [oddNumbers, oddWords, oddFigures])(R, level, band);
  }

  /* ---------- 4. Analogier ---------- */
  var TRANSFORMS = {
    quarter: { need: 'turn', apply: function (f) { f.r += 2; } },
    half: { need: 'turn', apply: function (f) { f.r += 4; } },
    plus1: { apply: function (f) { f.n += 1; } },
    double: { apply: function (f) { f.n *= 2; } },
    grow: { apply: function (f) { f.z = 2; } },
    empty: { apply: function (f) { f.p = 'hvid'; } }
  };
  var AN_POOL = { 1: ['plus1', 'empty', 'grow'], 2: ['quarter', 'plus1', 'double', 'empty', 'grow'], 3: ['quarter', 'half', 'plus1', 'double', 'empty', 'grow'] };
  function analogyFigures(R, level) {
    var nT = level >= 4 ? 2 : 1, pool = AN_POOL[Math.min(level, 3)];
    for (var guard = 0; guard < 500; guard++) {
      var ts = shuffle(R, pool).slice(0, nT);
      if (ts.indexOf('quarter') >= 0 && ts.indexOf('half') >= 0) continue;
      if (ts.indexOf('plus1') >= 0 && ts.indexOf('double') >= 0) continue;
      var turn = ts.some(function (k) { return TRANSFORMS[k].need === 'turn'; });
      var shapes = turn ? TURNABLE : SHAPES;
      var A = fig({ s: pick(R, shapes), p: pick(R, PAINTS.slice(0, 4)), n: int(R, 1, 3), r: turn ? int(R, 0, 3) * 2 : 0, z: ts.indexOf('grow') >= 0 ? 0 : 1 });
      var C = fig({ s: pick(R, shapes.filter(function (s) { return s !== A.s || turn; })), p: pick(R, PAINTS.slice(0, 4).filter(function (p) { return p !== A.p; })), n: int(R, 1, 3), r: turn ? int(R, 0, 3) * 2 : 0, z: A.z });
      if (same(A, C)) continue;
      if (A.n === 1 && (ts.indexOf('plus1') >= 0 || ts.indexOf('double') >= 0)) continue; // 1 → 2 could be »one more« or »twice as many«
      var B = fig(A), D = fig(C);
      ts.forEach(function (k) { TRANSFORMS[k].apply(B); TRANSFORMS[k].apply(D); });
      if ([B, D].some(function (f) { return f.n > 6; })) continue;
      // wrong: transform half-applied / wrongly applied / C unchanged in one attribute
      var cands = [];
      ts.forEach(function (k) {
        var w = fig(D);
        if (k === 'quarter') w.r = D.r + 4; else if (k === 'half') w.r = D.r + 2;
        else if (k === 'plus1') w.n = D.n + 1; else if (k === 'double') w.n = D.n + 1;
        else if (k === 'grow') w.z = 0; else if (k === 'empty') w.p = C.p;
        cands.push(w);
        var w2 = fig(D);
        if (k === 'quarter') w2.r = D.r - 4 + 8 - 2; else if (k === 'plus1' || k === 'double') w2.n = Math.max(1, D.n - 1); else if (k === 'grow') w2.z = 1; else if (k === 'empty') w2.p = A.p; else if (k === 'half') w2.r = C.r;
        cands.push(w2);
      });
      var w3 = fig(D); w3.s = A.s === D.s ? pick(R, shapes.filter(function (s) { return s !== D.s; })) : A.s; cands.push(w3);
      var w4 = fig(D); w4.p = D.p === 'hvid' ? C.p : pick(R, PAINTS.slice(0, 4).filter(function (p) { return p !== D.p; })); cands.push(w4);
      var wrong = [];
      shuffle(R, cands).forEach(function (w) {
        if (wrong.length < 3 && w.n >= 1 && w.n <= 6 && diffAttrs(w, D).length === 1 && !wrong.some(function (o) { return same(o, w); })) wrong.push(w);
      });
      if (wrong.length < 3) continue;
      var opts = shuffle(R, [D].concat(wrong)), s = S();
      return { type: 'analogy', kind: 'fig', level: level, a: A, b: B, c: C, options: opts, answer: opts.indexOf(D), transforms: ts,
        hint: s.hints.analogy, explain: T(s.anFig, { what: ts.map(function (k) { return s.transforms[k]; }).join(' ') }) };
    }
    throw new Error('analogyFigures');
  }
  function analogyWords(R, level, band) {
    var list = ANALOGIES.filter(function (x) { return band === 'U' ? x[0] !== 'M' || R() < 0.3 : x[0] === 'M'; });
    var it = pick(R, list), opts = shuffle(R, [it[4]].concat(it[5])), s = S();
    return { type: 'analogy', kind: 'word', level: level, a: it[1], b: it[2], c: it[3], options: opts, answer: opts.indexOf(it[4]), hint: s.hints.analogyWord,
      explain: it[6] };
  }
  function analogy(R, level, band) {
    if (band === 'U' && level >= 3) return R() < 0.5 ? analogyWords(R, level, band) : analogyFigures(R, level);
    return R() < 0.45 ? analogyWords(R, level, band) : analogyFigures(R, level);
  }

  /* ---------- 5. Det manglende felt (3×3) ---------- */
  // attribute rules over the grid: 'dist' (each row has each of three values), 'rowconst' (same in a row, other rows differ),
  // 'prog' (count grows by one to the right), 'turn' (turns a quarter more for each square to the right)
  var MX_RULES = { 1: [['s', 'dist']], 2: [['s', 'dist'], ['p', 'rowconst']], 3: [['s', 'dist'], ['p', 'dist'], ['n', 'prog']],
    4: [['r', 'turn'], ['p', 'dist'], ['n', 'prog']], 5: [['s', 'dist'], ['p', 'dist'], ['n', 'prog'], ['z', 'rowconst']] };
  function matrix(R, level) {
    for (var guard = 0; guard < 500; guard++) {
      var rules = MX_RULES[level].map(function (x) { return { a: x[0], k: x[1] }; });
      if (level === 2 && R() < 0.5) rules = [{ a: 'p', k: 'dist' }, { a: 'n', k: 'prog' }];
      if (level === 3 && R() < 0.5) rules = [{ a: 's', k: 'rowconst' }, { a: 'p', k: 'dist' }, { a: 'n', k: 'prog' }];
      var hasR = rules.some(function (r) { return r.a === 'r'; });
      var base = fig({ s: hasR ? pick(R, TURNABLE) : pick(R, SHAPES.filter(function (s) { return TURNABLE.indexOf(s) < 0 || R() < 0.3; })), p: pick(R, PAINTS.slice(0, 4)), n: 1, z: 1 });
      if (!hasR) base.r = 0;
      var grid = [];
      rules.forEach(function (ru) {
        var pool = ru.a === 's' ? SHAPES.filter(function (s) { return TURNABLE.indexOf(s) < 0; }) : ru.a === 'p' ? PAINTS.slice(0, 4) : ru.a === 'z' ? [0, 1, 2] : null;
        ru.vals = pool ? shuffle(R, pool).slice(0, 3) : null;
        ru.shift = shuffle(R, [0, 1, 2]);
        ru.starts = [int(R, 1, 3), int(R, 1, 3), int(R, 1, 3)];
        ru.turnStart = [int(R, 0, 3) * 2, int(R, 0, 3) * 2, int(R, 0, 3) * 2];
      });
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
        var f = fig(base);
        rules.forEach(function (ru) {
          if (ru.k === 'dist') f[ru.a] = ru.vals[(j + ru.shift[i]) % 3];
          else if (ru.k === 'rowconst') f[ru.a] = ru.vals[i];
          else if (ru.k === 'prog') f.n = ru.starts[i] + j;
          else if (ru.k === 'turn') f.r = (ru.turnStart[i] + 2 * j) % 8;
        });
        grid.push(f);
      }
      // the rows must not all be alike for a 'dist' rule, and counts must fit
      if (grid.some(function (f) { return f.n > 6; })) continue;
      var ans = grid[8], cands = [];
      rules.forEach(function (ru) {
        var w = fig(ans);
        if (ru.k === 'prog') { w.n = ans.n + 1; cands.push(w); var w2 = fig(ans); w2.n = ans.n - 1; cands.push(w2); return; }
        if (ru.k === 'turn') { w.r = ans.r + 2; cands.push(w); var w3 = fig(ans); w3.r = ans.r + 4; cands.push(w3); return; }
        ru.vals.forEach(function (v) { if (v !== ans[ru.a]) { var x = fig(ans); x[ru.a] = v; cands.push(x); } });
      });
      ['s', 'p', 'n'].forEach(function (a) {
        if (rules.some(function (r) { return r.a === a || (a === 's' && r.a === 'r'); })) return;
        var x = fig(ans);
        if (a === 'n') x.n = ans.n + 1; else x[a] = pick(R, (a === 'p' ? PAINTS.slice(0, 4) : SHAPES.filter(function (s) { return TURNABLE.indexOf(s) < 0; })).filter(function (v) { return v !== ans[a]; }));
        cands.push(x);
      });
      var wrong = [];
      shuffle(R, cands).forEach(function (w) {
        if (wrong.length < 5 && w.n >= 1 && w.n <= 6 && diffAttrs(w, ans).length === 1 && !wrong.some(function (o) { return same(o, w); })) wrong.push(w);
      });
      if (wrong.length < 3) continue;
      var opts = shuffle(R, [ans].concat(wrong)), s = S();
      return { type: 'matrix', level: level, grid: grid.slice(0, 8).concat([null]), solution: ans, rules: rules.map(function (r) { return { a: r.a, k: r.k, vals: r.vals }; }),
        options: opts, answer: opts.indexOf(ans), hint: s.hints.matrix,
        explain: rules.map(function (ru) { return T(s.mx[ru.k + '_' + ru.a] || s.mx[ru.k], { list: (ru.vals || []).map(function (v) { return ru.a === 's' ? s.shapes[v] : ru.a === 'p' ? s.paints[v] : s.sizes[v]; }).join(', ') }); }).join(' ') };
    }
    throw new Error('matrix');
  }

  /* ---------- 6. Drej og spejl (polyominoes) ---------- */
  function normCells(cells) {
    var mx = Math.min.apply(null, cells.map(function (c) { return c[0]; })), my = Math.min.apply(null, cells.map(function (c) { return c[1]; }));
    return cells.map(function (c) { return [c[0] - mx, c[1] - my]; }).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
  }
  function cellsKey(cells) { return normCells(cells).map(function (c) { return c.join(','); }).join(';'); }
  function rot(cells) { return normCells(cells.map(function (c) { return [-c[1], c[0]]; })); } // a quarter turn clockwise (y down)
  function mirX(cells) { return normCells(cells.map(function (c) { return [-c[0], c[1]]; })); } // mirror in a vertical line
  function mirY(cells) { return normCells(cells.map(function (c) { return [c[0], -c[1]]; })); } // mirror in a horizontal line
  function rotations(cells) { var out = [normCells(cells)]; for (var i = 1; i < 4; i++) out.push(rot(out[i - 1])); return out; }
  function randomPoly(R, size) {
    var cells = [[0, 0]];
    while (cells.length < size) {
      var c = pick(R, cells), d = pick(R, [[1, 0], [-1, 0], [0, 1], [0, -1]]), n = [c[0] + d[0], c[1] + d[1]];
      if (!cells.some(function (x) { return x[0] === n[0] && x[1] === n[1]; })) cells.push(n);
    }
    return normCells(cells);
  }
  function chiral(cells) {
    var rs = rotations(cells), keys = rs.map(cellsKey);
    if (new Set(keys).size < 4) return false; // every turn must look different
    var mk = rotations(mirX(cells)).map(cellsKey);
    return !mk.some(function (k) { return keys.indexOf(k) >= 0; }); // the mirror image is never a turn of it
  }
  function polyBox(cells) { var n = normCells(cells); return [Math.max.apply(null, n.map(function (c) { return c[0]; })) + 1, Math.max.apply(null, n.map(function (c) { return c[1]; })) + 1]; }
  function turnMirror(R, level) {
    var size = level <= 2 ? 4 + (level === 2 ? 1 : 0) : level === 3 ? 5 : 6, mode = level >= 4 && R() < 0.6 ? 'mirror' : 'rotate';
    for (var guard = 0; guard < 2000; guard++) {
      var base = randomPoly(R, size), box = polyBox(base);
      if (!chiral(base) || box[0] > 4 || box[1] > 4) continue;
      var s = S(), right, wrong = [], turns, axis;
      if (mode === 'rotate') {
        turns = int(R, 1, 3); right = rotations(base)[turns];
        var mirrors = rotations(mirX(base));
        var nMirror = level === 1 ? 1 : level === 2 ? 2 : 3;
        shuffle(R, mirrors).slice(0, nMirror).forEach(function (m) { wrong.push(m); });
        // fill up with clearly different figures (one square more or fewer)
        for (var t = 0; wrong.length < 3 && t < 200; t++) {
          var o = randomPoly(R, size + (R() < 0.5 ? 1 : -1));
          if (!wrong.some(function (w) { return cellsKey(w) === cellsKey(o); })) wrong.push(o);
        }
        if (wrong.length < 3) continue;
      } else {
        axis = R() < 0.5 ? 'v' : 'h'; right = axis === 'v' ? mirX(base) : mirY(base);
        var other = axis === 'v' ? mirY(base) : mirX(base);
        [other].concat(rotations(base).slice(1)).forEach(function (x) { wrong.push(x); });
        wrong = shuffle(R, wrong.filter(function (x) { return cellsKey(x) !== cellsKey(right); })).slice(0, 3);
      }
      var keys = [cellsKey(right)].concat(wrong.map(cellsKey));
      if (new Set(keys).size !== 4) continue;
      if (wrong.some(function (w) { var b = polyBox(w); return b[0] > 4 || b[1] > 4; }) || (function () { var b = polyBox(right); return b[0] > 4 || b[1] > 4; })()) continue;
      var opts = shuffle(R, [right].concat(wrong));
      return { type: 'turn', level: level, mode: mode, base: base, axis: axis || null, turns: turns || 0, options: opts, answer: opts.map(cellsKey).indexOf(cellsKey(right)),
        hint: mode === 'rotate' ? s.hints.turn : s.hints.mirror,
        explain: mode === 'rotate' ? T(s.turnExplain, { turn: s.turnNames[turns] }) : T(s.mirrorExplain, { axis: s.axisNames[axis] }) };
    }
    throw new Error('turnMirror');
  }
  function polySvg(cells, px, opts) {
    opts = opts || {};
    var n = normCells(cells), u = 22, W = 4 * u + 8, H = 4 * u + 8, b = polyBox(n), ox = (W - b[0] * u) / 2, oy = (H - b[1] * u) / 2, s = '';
    s += '<rect x="2" y="2" width="' + (W - 4) + '" height="' + (H - 4) + '" rx="8" fill="#FFFFFF" stroke="#E3D6BB" stroke-width="2"/>';
    n.forEach(function (c) { s += '<rect x="' + (ox + c[0] * u) + '" y="' + (oy + c[1] * u) + '" width="' + u + '" height="' + u + '" fill="' + (opts.color || '#6BB8E0') + '" stroke="#4A2C17" stroke-width="2.5"/>'; });
    if (opts.axis === 'v') s += '<line x1="' + (W - 1) + '" y1="4" x2="' + (W - 1) + '" y2="' + (H - 4) + '" stroke="#D9463B" stroke-width="3" stroke-dasharray="6 5"/>';
    if (opts.axis === 'h') s += '<line x1="4" y1="' + (H - 1) + '" x2="' + (W - 4) + '" y2="' + (H - 1) + '" stroke="#D9463B" stroke-width="3" stroke-dasharray="6 5"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + (px || 90) + '" height="' + (px || 90) + '" role="img" aria-label="' + (opts.label || '') + '">' + s + '</svg>';
  }

  /* ---------- 7. Fold og klip ---------- */
  var FOLDS = {
    v: { inside: function (c) { return c[0] >= 2; }, mirror: function (c) { return [3 - c[0], c[1]]; } },
    h: { inside: function (c) { return c[1] >= 2; }, mirror: function (c) { return [c[0], 3 - c[1]]; } },
    d: { inside: function (c) { return c[0] <= c[1]; }, mirror: function (c) { return [c[1], c[0]]; } }
  };
  function unfold(folds, holes) {
    var H = holes.map(function (c) { return c.slice(); });
    folds.slice().reverse().forEach(function (k) {
      H.slice().forEach(function (c) { var m = FOLDS[k].mirror(c); if (!H.some(function (x) { return x[0] === m[0] && x[1] === m[1]; })) H.push(m); });
    });
    return H.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
  }
  function holesKey(h) { return h.slice().sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; }).map(function (c) { return c.join(','); }).join(';'); }
  function foldCut(R, level) {
    var plans = { 1: [['v']], 2: [['v'], ['h']], 3: [['v', 'h'], ['h', 'v']], 4: [['d'], ['v', 'h']], 5: [['v', 'd'], ['d'], ['v', 'h']] };
    for (var guard = 0; guard < 1000; guard++) {
      var folds = pick(R, plans[level]), region = [];
      for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) { var c = [x, y]; if (folds.every(function (k) { return FOLDS[k].inside(c); })) region.push(c); }
      var nh = level === 2 || level === 5 ? 2 : 1, holes = shuffle(R, region).slice(0, nh);
      if (folds.indexOf('d') >= 0 && holes.some(function (c) { return c[0] === c[1]; })) continue; // a hole on the fold line is too hard to read
      var right = unfold(folds, holes), cands = [];
      cands.push(holes); // forgot to unfold
      var other = folds.map(function (k) { return k === 'v' ? 'h' : k === 'h' ? 'v' : 'v'; });
      cands.push(unfold(other, holes)); // mirrored the wrong way
      if (right.length > 1) cands.push(right.slice(0, -1)); // one hole missing
      cands.push(unfold(folds.slice(0, -1), holes));
      var moved = right.map(function (c, i) { return i === 0 ? [(c[0] + 1) % 4, c[1]] : c; }); cands.push(moved);
      var wrong = [];
      shuffle(R, cands).forEach(function (w) { var k = holesKey(w); if (wrong.length < 3 && w.length && k !== holesKey(right) && !wrong.some(function (o) { return holesKey(o) === k; }) && new Set(w.map(String)).size === w.length) wrong.push(w); });
      if (wrong.length < 3) continue;
      var opts = shuffle(R, [right].concat(wrong)), s = S();
      return { type: 'fold', level: level, folds: folds, holes: holes, options: opts, answer: opts.map(holesKey).indexOf(holesKey(right)), solution: right,
        hint: s.hints.fold, explain: T(s.foldExplain, { n: right.length }) };
    }
    throw new Error('foldCut');
  }
  // one step of the fold story: the paper so far (folded region solid, the rest dashed), the next fold line, holes
  function foldStepSvg(folds, upto, holes, px, label) {
    var u = 18, W = 4 * u + 12, s = '<rect x="2" y="2" width="' + (W - 4) + '" height="' + (W - 4) + '" rx="6" fill="#F7F2E8"/>';
    for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
      var c = [x, y], inside = folds.slice(0, upto).every(function (k) { return FOLDS[k].inside(c); });
      s += '<rect x="' + (6 + x * u) + '" y="' + (6 + y * u) + '" width="' + u + '" height="' + u + '" fill="' + (inside ? '#FFFFFF' : 'none') + '" stroke="' + (inside ? '#C9B48A' : '#DDD2BC') + '" stroke-width="1" ' + (inside ? '' : 'stroke-dasharray="3 3"') + '/>';
    }
    var next = folds[upto];
    if (next === 'v') s += '<line x1="' + (6 + 2 * u) + '" y1="4" x2="' + (6 + 2 * u) + '" y2="' + (W - 4) + '" stroke="#D9463B" stroke-width="3" stroke-dasharray="5 4"/><path d="M' + (6 + u) + ',' + (W / 2) + ' q' + u + ',-14 ' + (2 * u) + ',0" fill="none" stroke="#3E8FC2" stroke-width="3" marker-end="url(#ar)"/>';
    if (next === 'h') s += '<line x1="4" y1="' + (6 + 2 * u) + '" x2="' + (W - 4) + '" y2="' + (6 + 2 * u) + '" stroke="#D9463B" stroke-width="3" stroke-dasharray="5 4"/><path d="M' + (W / 2) + ',' + (6 + u) + ' q-14,' + u + ' 0,' + (2 * u) + '" fill="none" stroke="#3E8FC2" stroke-width="3" marker-end="url(#ar)"/>';
    if (next === 'd') s += '<line x1="6" y1="6" x2="' + (6 + 4 * u) + '" y2="' + (6 + 4 * u) + '" stroke="#D9463B" stroke-width="3" stroke-dasharray="5 4"/><path d="M' + (6 + 3 * u) + ',' + (6 + u) + ' q-' + (u * 0.4) + ',' + (u * 1.6) + ' -' + (2 * u) + ',' + (2 * u) + '" fill="none" stroke="#3E8FC2" stroke-width="3" marker-end="url(#ar)"/>';
    (holes || []).forEach(function (c) { s += '<circle cx="' + (6 + c[0] * u + u / 2) + '" cy="' + (6 + c[1] * u + u / 2) + '" r="' + (u * 0.3) + '" fill="#4A2C17"/>'; });
    return '<svg viewBox="0 0 ' + W + ' ' + W + '" width="' + (px || 84) + '" height="' + (px || 84) + '" role="img" aria-label="' + (label || '') + '"><defs><marker id="ar" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#3E8FC2"/></marker></defs>' + s + '</svg>';
  }

  /* ---------- 8. Hemmelige koder ---------- */
  var CODE_SYMS = [['trekant', 'gul'], ['cirkel', 'blaa'], ['stjerne', 'roed'], ['kvadrat', 'groen']];
  function codePuzzle(R, level) {
    for (var guard = 0; guard < 2000; guard++) {
      var syms = shuffle(R, CODE_SYMS).slice(0, level === 1 ? 1 : level === 2 ? 2 : 3), v = syms.map(function () { return int(R, 1, level <= 2 ? 9 : 12); }), eqs = [], ask;
      if (level === 1) { eqs.push({ t: [0, 0], op: '+' }); ask = 0; }
      else if (level === 2) { eqs.push({ t: [0, 0], op: '+' }, { t: [0, 1], op: '+' }); ask = 1; }
      else if (level === 3) { eqs.push({ t: [0, 0, 0], op: '+' }, { t: [0, 1], op: '+' }, { t: [1, 2], op: '-' }); ask = 2; }
      else if (level === 4) { if (R() < 0.5) { eqs.push({ t: [0, 0], op: '+' }, { t: [0, 1], op: '×' }, { t: [1, 2], op: '+' }); ask = 2; } else { syms = syms.slice(0, 2); v = v.slice(0, 2); eqs.push({ t: [0, 1], op: '+' }, { t: [0, 1], op: '-' }); ask = 0; } }
      else { eqs.push({ t: [0, 1], op: '+' }, { t: [1, 2], op: '+' }, { t: [0, 2], op: '+' }); ask = 0; }
      var bad = false;
      eqs.forEach(function (e) { e.res = calc(e, v); if (e.res < 0 || e.res > 99) bad = true; });
      if (bad || eqs.some(function (e) { return e.op === '-' && e.res === 0; })) continue;
      if (solveCodes(eqs, syms.length).length !== 1) continue;
      var ans = v[ask], cands = [ans + 1, ans - 1, ans * 2, eqs[eqs.length - 1].res, v[(ask + 1) % v.length], ans + 2], wrong = [];
      shuffle(R, cands).forEach(function (x) { if (wrong.length < 3 && x > 0 && x !== ans && wrong.indexOf(x) < 0) wrong.push(x); });
      if (wrong.length < 3) continue;
      var opts = shuffle(R, [ans].concat(wrong)), s = S();
      return { type: 'code', level: level, syms: syms, eqs: eqs, ask: ask, options: opts, answer: opts.indexOf(ans), value: ans, values: v,
        hint: s.hints.code, explain: codeExplain(eqs, syms, v, ask) };
    }
    throw new Error('codePuzzle');
  }
  function calc(e, v) {
    var a = v[e.t[0]], b = v[e.t[1]];
    if (e.t.length === 3) return a + b + v[e.t[2]];
    return e.op === '+' ? a + b : e.op === '-' ? a - b : a * b;
  }
  // every set of positive whole values 1..20 that fits all the equations
  function solveCodes(eqs, n) {
    var out = [], v = [];
    (function rec(i) {
      if (i === n) { if (eqs.every(function (e) { return calc(e, v) === e.res; })) out.push(v.slice()); return; }
      for (var x = 1; x <= 20; x++) { v[i] = x; rec(i + 1); }
    })(0);
    return out;
  }
  function codeExplain(eqs, syms, v, ask) {
    var s = S(), nm = function (i) { return s.symDef[syms[i][0]]; }, word = function (i) { return s.symWord[syms[i][0]]; };
    var ex = s.codeSteps || {}, known = {}, steps = [];
    function eqText(e) { return e.t.map(word).join(' ' + (e.t.length === 3 ? '+' : e.op === '-' ? '−' : e.op) + ' ').replace(/^\w/, function (c) { return c.toUpperCase(); }) + ' = ' + e.res; }
    for (var round = 0; round < 4 && !known[ask]; round++) eqs.forEach(function (e) {
      if (known[ask]) return;
      var unknown = e.t.filter(function (t, i, a) { return !known[t] && a.indexOf(t) === i; });
      if (unknown.length !== 1) return;
      known[unknown[0]] = true;
      steps.push(T(ex.found, { eq: eqText(e), name: nm(unknown[0]), v: v[unknown[0]] }));
    });
    if (!known[ask]) steps = [T(ex.system, { names: syms.map(function (x, i) { return nm(i) + ' = ' + v[i]; }).join(', ') })];
    return steps.join(' ');
  }
  function codeSvg(e, syms, px) {
    var items = [], s = '', x = 6, h = 60;
    e.t.forEach(function (t, i) { if (i) items.push({ op: e.t.length === 3 ? '+' : e.op }); items.push({ sym: syms[t] }); });
    items.push({ op: '=' }); items.push({ num: e.res });
    items.forEach(function (it) {
      if (it.sym) { s += '<g transform="translate(' + x + ' 6) scale(0.48)">' + figInner(fig({ s: it.sym[0], p: it.sym[1], n: 1, z: 1 }), 'c') + '</g>'; x += 52; }
      else { var txt = it.op === '-' ? '−' : it.op || String(it.num), w = it.num !== undefined ? 18 * String(it.num).length + 8 : 30; s += '<text x="' + (x + w / 2) + '" y="40" text-anchor="middle" font-size="28" font-weight="800" fill="#4A2C17" font-family="system-ui,sans-serif">' + txt + '</text>'; x += w; }
    });
    return '<svg viewBox="0 0 ' + (x + 6) + ' ' + h + '" width="' + Math.round((x + 6) * (px || 1)) + '" height="' + Math.round(h * (px || 1)) + '" role="img" aria-label="">' + s + '</svg>';
  }

  /* ---------- routes and rounds ---------- */
  var GEN = {
    figrow: function (R, l) { return figRow(R, l); },
    numrow: function (R, l) { return numRow(R, l); },
    odd: function (R, l, b) { return oddOne(R, l, b); },
    analogy: function (R, l, b) { return analogy(R, l, b); },
    matrix: function (R, l) { return matrix(R, Math.max(1, l)); },
    turn: function (R, l) { return turnMirror(R, l); },
    fold: function (R, l) { return foldCut(R, l); },
    code: function (R, l) { return codePuzzle(R, l); }
  };
  // id, band, kind, level range for the band
  var ROUTES = [
    { id: 'm-naeste', b: 'M', kind: 'figrow', min: 1, max: 4 },
    { id: 'm-tal', b: 'M', kind: 'numrow', min: 1, max: 3 },
    { id: 'm-skaeve', b: 'M', kind: 'odd', min: 1, max: 4 },
    { id: 'm-analogi', b: 'M', kind: 'analogy', min: 1, max: 3 },
    { id: 'm-drej', b: 'M', kind: 'turn', min: 1, max: 3 },
    { id: 'm-kode', b: 'M', kind: 'code', min: 1, max: 3 },
    { id: 'u-tal', b: 'U', kind: 'numrow', min: 2, max: 5 },
    { id: 'u-analogi', b: 'U', kind: 'analogy', min: 2, max: 5 },
    { id: 'u-felt', b: 'U', kind: 'matrix', min: 1, max: 5 },
    { id: 'u-drej', b: 'U', kind: 'turn', min: 3, max: 5 },
    { id: 'u-fold', b: 'U', kind: 'fold', min: 1, max: 5 },
    { id: 'u-kode', b: 'U', kind: 'code', min: 2, max: 5 }
  ];
  function make(kind, R, level, band) { return GEN[kind](R, level, band); }
  function buildRound(route, level, R, n) {
    var out = [], seen = {};
    for (var g = 0; g < 200 && out.length < (n || 8); g++) {
      var tk = make(route.kind, R, level, route.b), k = JSON.stringify([tk.seq, tk.items, tk.a, tk.c, tk.grid, tk.base, tk.holes, tk.eqs]);
      if (seen[k]) continue; seen[k] = 1; out.push(tk);
    }
    return out;
  }

  /* ---------- word lists (Danish; categories that never overlap) ---------- */
  var WORDS = [
    { id: 'dyr', b: 'M', name: 'dyr', one: 'et dyr', not: ['fugle'], words: ['hund', 'kat', 'ko', 'gris', 'hest', 'får', 'kanin', 'ræv', 'elefant', 'giraf'] },
    { id: 'fugle', b: 'U', name: 'fugle', one: 'en fugl', not: ['dyr'], words: ['spurv', 'krage', 'måge', 'ugle', 'svane', 'stork', 'ørn', 'due'] },
    { id: 'frugt', b: 'M', name: 'frugter', one: 'en frugt', not: ['groent'], words: ['æble', 'pære', 'banan', 'appelsin', 'blomme', 'kirsebær', 'citron', 'vindrue'] },
    { id: 'groent', b: 'M', name: 'grøntsager', one: 'en grøntsag', not: ['frugt'], words: ['gulerod', 'kartoffel', 'løg', 'porre', 'kål', 'ært', 'broccoli'] },
    { id: 'blomster', b: 'M', name: 'blomster', one: 'en blomst', not: [], words: ['rose', 'tulipan', 'mælkebøtte', 'solsikke', 'vintergæk', 'påskelilje'] },
    { id: 'moebler', b: 'M', name: 'møbler', one: 'et møbel', not: [], words: ['stol', 'bord', 'sofa', 'seng', 'reol', 'skab', 'kommode'] },
    { id: 'koeretoejer', b: 'M', name: 'køretøjer', one: 'et køretøj', not: [], words: ['bil', 'bus', 'tog', 'cykel', 'lastbil', 'traktor', 'knallert'] },
    { id: 'instrumenter', b: 'M', name: 'musikinstrumenter', one: 'et musikinstrument', not: [], words: ['guitar', 'klaver', 'tromme', 'violin', 'fløjte', 'trompet', 'harpe'] },
    { id: 'toej', b: 'M', name: 'tøj', one: 'noget tøj', not: [], words: ['bukser', 'trøje', 'jakke', 'nederdel', 'skjorte', 'kjole', 'strømper'] },
    { id: 'vaerktoej', b: 'U', name: 'værktøj', one: 'noget værktøj', not: [], words: ['hammer', 'sav', 'skruetrækker', 'tang', 'boremaskine', 'skiftenøgle'] },
    { id: 'krop', b: 'M', name: 'dele af kroppen', one: 'en del af kroppen', not: [], words: ['arm', 'ben', 'næse', 'øre', 'albue', 'knæ', 'mave'] },
    { id: 'vejr', b: 'U', name: 'slags vejr', one: 'en slags vejr', not: [], words: ['regn', 'sne', 'hagl', 'storm', 'tåge', 'slud'] },
    { id: 'planeter', b: 'U', name: 'planeter', one: 'en planet', not: [], words: ['Merkur', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Neptun'] }
  ];
  // [band, A, B, C, right answer, [wrong answers], explanation]
  var ANALOGIES = [
    ['M', 'hund', 'hvalp', 'kat', 'killing', ['hvalp', 'mis', 'mælk'], 'En hvalp er en ung hund, og en killing er en ung kat.'],
    ['M', 'ko', 'kalv', 'hest', 'føl', ['kalv', 'stald', 'hø'], 'En kalv er en ung ko, og et føl er en ung hest.'],
    ['M', 'varm', 'kold', 'lys', 'mørk', ['lampe', 'sol', 'kold'], 'Varm og kold er modsatte. Det modsatte af lys er mørk.'],
    ['M', 'fod', 'sko', 'hånd', 'handske', ['finger', 'arm', 'strømpe'], 'Man har en sko på foden og en handske på hånden.'],
    ['M', 'fugl', 'rede', 'bi', 'bistade', ['honning', 'blomst', 'rede'], 'En fugl bor i en rede, og en bi bor i et bistade.'],
    ['M', 'lærer', 'skole', 'læge', 'hospital', ['patient', 'medicin', 'skole'], 'En lærer arbejder på en skole, og en læge arbejder på et hospital.'],
    ['M', 'fisk', 'svømme', 'fugl', 'flyve', ['rede', 'synge', 'svømme'], 'En fisk svømmer, og en fugl flyver.'],
    ['M', 'stor', 'lille', 'høj', 'lav', ['større', 'tårn', 'stor'], 'Stor og lille er modsatte, og høj og lav er modsatte.'],
    ['M', 'dag', 'nat', 'sommer', 'vinter', ['sol', 'forår', 'varm'], 'Dag og nat er modsatte, og sommer og vinter er modsatte.'],
    ['M', 'øje', 'se', 'øre', 'høre', ['lyd', 'næse', 'se'], 'Man ser med øjnene og hører med ørerne.'],
    ['M', 'is', 'kold', 'ild', 'varm', ['rød', 'brænde', 'kold'], 'Is er kold, og ild er varm.'],
    ['M', 'en', 'to', 'tre', 'fire', ['tre', 'seks', 'fem'], 'Tallene kommer i rækkefølge: efter tre kommer fire.'],
    ['M', 'bager', 'brød', 'maler', 'maleri', ['pensel', 'farve', 'brød'], 'En bager laver brød, og en maler laver et maleri.'],
    ['M', 'sove', 'seng', 'sidde', 'stol', ['bord', 'sove', 'gulv'], 'Man sover i en seng og sidder på en stol.'],
    ['M', 'regn', 'paraply', 'sol', 'solbriller', ['sky', 'varme', 'paraply'], 'En paraply beskytter mod regn, og solbriller beskytter mod sol.'],
    ['M', 'kniv', 'skære', 'blyant', 'skrive', ['papir', 'tegning', 'skære'], 'Man skærer med en kniv og skriver med en blyant.'],
    ['M', 'gris', 'grisestald', 'høne', 'hønsehus', ['æg', 'kylling', 'mark'], 'En gris bor i en grisestald, og en høne bor i et hønsehus.'],
    ['M', 'æble', 'træ', 'jordbær', 'plante', ['rød', 'syltetøj', 'træ'], 'Æbler gror på et træ, og jordbær gror på en plante.'],
    ['M', 'bog', 'læse', 'sang', 'synge', ['tekst', 'høre', 'læse'], 'Man læser en bog og synger en sang.'],
    ['M', 'hoved', 'hat', 'hals', 'halstørklæde', ['hoved', 'jakke', 'vante'], 'Man har en hat på hovedet og et halstørklæde om halsen.'],
    ['M', 'mandag', 'tirsdag', 'januar', 'februar', ['marts', 'december', 'onsdag'], 'Tirsdag kommer efter mandag, og februar kommer efter januar.'],
    ['M', 'bil', 'vej', 'tog', 'skinner', ['station', 'fart', 'vej'], 'En bil kører på en vej, og et tog kører på skinner.'],
    ['U', 'ord', 'sætning', 'tone', 'melodi', ['lyd', 'node', 'sang'], 'En sætning består af ord, og en melodi består af toner.'],
    ['U', 'termometer', 'temperatur', 'ur', 'tid', ['viser', 'time', 'varme'], 'Et termometer måler temperatur, og et ur måler tid.'],
    ['U', 'åbne', 'lukke', 'begynde', 'slutte', ['starte', 'midte', 'lukke'], 'Åbne og lukke er modsatte, og begynde og slutte er modsatte.'],
    ['U', 'forfatter', 'bog', 'komponist', 'musik', ['instrument', 'koncert', 'bog'], 'En forfatter skriver en bog, og en komponist skriver musik.'],
    ['U', 'kilometer', 'afstand', 'kilogram', 'vægt', ['størrelse', 'tid', 'meter'], 'Kilometer er en enhed for afstand, og kilogram er en enhed for vægt.'],
    ['U', 'hurtig', 'langsom', 'tung', 'let', ['vægt', 'stærk', 'langsom'], 'Hurtig og langsom er modsatte, og tung og let er modsatte.'],
    ['U', 'land', 'hovedstad', 'Danmark', 'København', ['Aarhus', 'Sverige', 'Odense'], 'København er hovedstaden i Danmark.'],
    ['U', 'tre', 'trekant', 'seks', 'sekskant', ['femkant', 'terning', 'trekant'], 'En trekant har tre sider, og en sekskant har seks.'],
    ['U', 'plante', 'frø', 'fugl', 'æg', ['rede', 'fjer', 'unge'], 'En plante vokser op af et frø, og en fugl kommer ud af et æg.'],
    ['U', 'sulten', 'spise', 'træt', 'sove', ['seng', 'vågen', 'spise'], 'Når man er sulten, spiser man. Når man er træt, sover man.'],
    ['U', 'læge', 'syg', 'mekaniker', 'bil', ['værksted', 'værktøj', 'syg'], 'En læge hjælper den, der er syg, og en mekaniker reparerer en bil.']
  ];

  var api = {
    ids: ids, SHAPES: SHAPES, PAINTS: PAINTS, TURNABLE: TURNABLE, WORDS: WORDS, ANALOGIES: ANALOGIES, ROUTES: ROUTES, NUM_PROPS: NUM_PROPS, FOLDS: FOLDS,
    fig: fig, same: same, diffAttrs: diffAttrs, key: key, describe: describe, figSvg: figSvg, figInner: figInner,
    applyRules: applyRules, numSeq: numSeq, solveCodes: solveCodes, calc: calc, unfold: unfold, holesKey: holesKey,
    normCells: normCells, cellsKey: cellsKey, rotations: rotations, mirX: mirX, mirY: mirY, chiral: chiral, polySvg: polySvg, foldStepSvg: foldStepSvg, codeSvg: codeSvg,
    gen: GEN, make: make, buildRound: buildRound, oddOk: oddOk
  };
  root.TK = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
