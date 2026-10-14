/*
 * Regnestorm – opgavegenerator.
 * Pure functions (no DOM), so it can be unit-tested in Node.
 * Each topic has 5 levels; gen(level, R) returns one problem:
 *   { topic, level, text, speech, answer, hint: { text, svg }, solution }
 * Danish notation: · for gange, : for division, decimal comma, − for minus, "25 %".
 */
(function (root) {
  'use strict';

  var MINUS = '−', DOT = '·', NBSP = ' ';
  var SUP = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', 10: '¹⁰' };
  var ORD = { 2: 'anden', 3: 'tredje', 4: 'fjerde', 5: 'femte', 6: 'sjette', 7: 'syvende', 8: 'ottende', 9: 'niende', 10: 'tiende' };

  /* ---------- random ---------- */
  function makeRand(seed) {
    var next;
    if (seed === undefined) next = Math.random;
    else {
      var s = seed >>> 0;
      next = function () { // mulberry32
        s = (s + 0x6D2B79F5) >>> 0;
        var t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    return {
      next: next,
      int: function (a, b) { return a + Math.floor(next() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      chance: function (p) { return next() < p; },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      }
    };
  }

  /* ---------- formatting ---------- */
  function round6(n) { return Math.round(n * 1e6) / 1e6; }
  function fmt(n, decimals) {
    var neg = n < 0, v = Math.abs(n), s;
    s = decimals !== undefined ? v.toFixed(decimals) : String(round6(v));
    return (neg ? MINUS : '') + s.replace('.', ',');
  }
  function par(n) { return n < 0 ? '(' + fmt(n) + ')' : fmt(n); }
  function sup(n) { return SUP[n] || ('^' + n); }
  function t(str, vars) { return str.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; }); }
  function pct(n) { return fmt(n) + NBSP + '%'; }

  var FRAC_WORDS = {
    2: ['halv', 'halve'], 3: ['tredjedel', 'tredjedele'], 4: ['fjerdedel', 'fjerdedele'], 5: ['femtedel', 'femtedele'],
    6: ['sjettedel', 'sjettedele'], 8: ['ottendedel', 'ottendedele'], 10: ['tiendedel', 'tiendedele'],
    16: ['sekstendedel', 'sekstendedele'], 20: ['tyvendedel', 'tyvendedele'], 25: ['femogtyvendedel', 'femogtyvendedele'], 50: ['halvtredsindstyvendedel', 'halvtredsindstyvendedele'],
    100: ['hundrededel', 'hundrededele']
  };
  function fracSpeech(n, d) {
    var w = FRAC_WORDS[d];
    if (!w) return n + ' delt med ' + d;
    if (n === 1) return 'en ' + w[0];
    return n + ' ' + w[1];
  }

  // Turn display text into something a Danish voice reads well.
  function speakify(text) {
    var s = text;
    s = s.replace(/(\d+)\/(\d+)/g, function (m, n, d) { return ' ' + fracSpeech(+n, +d) + ' '; });
    s = s.replace(/√/g, ' kvadratroden af ');
    s = s.replace(/¹⁰/g, ' i tiende');
    s = s.replace(/[²³⁴-⁹]/g, function (c) {
      var map = { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
      return ' i ' + ORD[map[c]] + ' ';
    });
    s = s.replace(/(\d)x/g, '$1 x');
    s = s.replace(/·/g, ' gange ').replace(/ : /g, ' divideret med ');
    s = s.replace(/=\s*\?/g, ' er lig med hvad ');
    s = s.replace(/−/g, ' minus ').replace(/\+/g, ' plus ').replace(/=/g, ' er lig med ');
    s = s.replace(/\((\s*minus [\d,]+\s*)\)/g, '$1');
    s = s.replace(/\(/g, ' parentes ').replace(/\)/g, ' parentes slut ');
    s = s.replace(/%/g, ' procent').replace(/ kr\./g, ' kroner.').replace(/^\s*\?/, 'hvad ').replace(/\?/g, '');
    return s.replace(/\s+/g, ' ').trim();
  }

  /* ---------- SVG hint drawings ---------- */
  var INK = '#4A2C17', BLUE = '#3E8FC2', BLUE_L = '#CFE8F5', YEL = '#F7C548', YEL_L = '#FCE7A8';

  function svgWrap(w, h, body, label) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + (label || 'Tegning') +
      '" font-family="system-ui, sans-serif">' + body + '</svg>';
  }

  // Number line with a jump arc from start to end. Values in integer units; scale=10 shows tenths.
  function numberLine(o) {
    var scale = o.scale || 1;
    var lo = Math.min(o.start, o.end), hi = Math.max(o.start, o.end);
    var span = Math.max(hi - lo, 1);
    var steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    var step = steps[steps.length - 1];
    for (var i = 0; i < steps.length; i++) if (Math.ceil(span / steps[i]) <= 10) { step = steps[i]; break; }
    var min = Math.floor(lo / step) * step - step, max = Math.ceil(hi / step) * step + step;
    if (o.noNegative && min < 0) min = 0;
    var W = 560, H = 150, m = 28, Y = 108;
    function x(v) { return m + (v - min) / (max - min) * (W - 2 * m); }
    var b = '<defs><marker id="rsArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
            '<path d="M0,0 L10,5 L0,10 z" fill="' + BLUE + '"/></marker></defs>';
    b += '<line x1="' + (m - 10) + '" y1="' + Y + '" x2="' + (W - m + 14) + '" y2="' + Y + '" stroke="' + INK + '" stroke-width="2.5"/>';
    var nTicks = Math.round((max - min) / step), wide = String(Math.round(Math.max(Math.abs(min), Math.abs(max)) / scale)).length >= 3 || scale > 1;
    var every = nTicks > 8 && wide ? 2 : 1, k = 0;
    for (var v = min; v <= max + 1e-9; v += step, k++) {
      var X = x(v);
      b += '<line x1="' + X + '" y1="' + (Y - 7) + '" x2="' + X + '" y2="' + (Y + 7) + '" stroke="' + INK + '" stroke-width="2"/>';
      if (k % every === 0) b += '<text x="' + X + '" y="' + (Y + 30) + '" text-anchor="middle" font-size="19" fill="' + INK + '">' + fmt(v / scale) + '</text>';
    }
    var x1 = x(o.start), x2 = x(o.end), lift = Math.min(54, Math.abs(x2 - x1) * 0.45 + 18);
    b += '<path d="M' + x1 + ',' + (Y - 6) + ' Q' + ((x1 + x2) / 2) + ',' + (Y - 6 - lift * 2) + ' ' + x2 + ',' + (Y - 6) +
         '" fill="none" stroke="' + BLUE + '" stroke-width="3" marker-end="url(#rsArr)"/>';
    b += '<rect x="' + ((x1 + x2) / 2 - 30) + '" y="' + (Y - 6 - lift - 22) + '" width="60" height="24" rx="8" fill="#fff" stroke="' + BLUE + '" stroke-width="2"/>';
    b += '<text x="' + ((x1 + x2) / 2) + '" y="' + (Y - 6 - lift - 4) + '" text-anchor="middle" font-size="16" font-weight="700" fill="' + BLUE + '">' + o.jumpLabel + '</text>';
    b += '<circle cx="' + x1 + '" cy="' + Y + '" r="7" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2.5"/>';
    if (o.markEnd) b += '<circle cx="' + x2 + '" cy="' + Y + '" r="7" fill="' + BLUE_L + '" stroke="' + INK + '" stroke-width="2.5"/>';
    return svgWrap(W, H, b, 'Tallinje');
  }

  function dotArray(rows, cols) {
    var c = 24, W = cols * c + 16, H = rows * c + 16, b = '';
    for (var r = 0; r < rows; r++) {
      b += '<rect x="4" y="' + (8 + r * c - 2) + '" width="' + (W - 8) + '" height="' + (c - 2) + '" rx="10" fill="' + (r % 2 ? '#fff' : YEL_L) + '"/>';
      for (var k = 0; k < cols; k++)
        b += '<circle cx="' + (8 + k * c + c / 2) + '" cy="' + (8 + r * c + c / 2 - 3) + '" r="8" fill="' + BLUE + '"/>';
    }
    return svgWrap(W, H, b, rows + ' rækker med ' + cols + ' prikker');
  }

  function blocks(th, hu, te, on) {
    var b = '', X = 6, Y = 10;
    function thousand(x) {
      return '<path d="M' + x + ',' + (Y + 14) + ' l14,-14 h40 l-14,14 z" fill="' + YEL_L + '" stroke="' + INK + '" stroke-width="2"/>' +
             '<path d="M' + (x + 40) + ',' + (Y + 14) + ' l14,-14 v40 l-14,14 z" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2"/>' +
             '<rect x="' + x + '" y="' + (Y + 14) + '" width="40" height="40" fill="#FBD978" stroke="' + INK + '" stroke-width="2"/>' +
             '<text x="' + (x + 20) + '" y="' + (Y + 39) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + INK + '">1000</text>';
    }
    function hundred(x) {
      var s = '<rect x="' + x + '" y="' + (Y + 14) + '" width="40" height="40" fill="' + BLUE_L + '" stroke="' + INK + '" stroke-width="2"/>';
      for (var i = 1; i < 10; i++) s += '<line x1="' + (x + i * 4) + '" y1="' + (Y + 14) + '" x2="' + (x + i * 4) + '" y2="' + (Y + 54) + '" stroke="' + BLUE + '" stroke-width="0.6"/>' +
        '<line x1="' + x + '" y1="' + (Y + 14 + i * 4) + '" x2="' + (x + 40) + '" y2="' + (Y + 14 + i * 4) + '" stroke="' + BLUE + '" stroke-width="0.6"/>';
      return s;
    }
    function ten(x) {
      var s = '<rect x="' + x + '" y="' + (Y + 14) + '" width="8" height="40" fill="#BFE3B4" stroke="' + INK + '" stroke-width="1.6"/>';
      for (var i = 1; i < 10; i++) s += '<line x1="' + x + '" y1="' + (Y + 14 + i * 4) + '" x2="' + (x + 8) + '" y2="' + (Y + 14 + i * 4) + '" stroke="' + INK + '" stroke-width="0.6"/>';
      return s;
    }
    function one(x) { return '<rect x="' + x + '" y="' + (Y + 46) + '" width="8" height="8" fill="#F6B9AA" stroke="' + INK + '" stroke-width="1.6"/>'; }
    var i;
    for (i = 0; i < th; i++) { b += thousand(X); X += 62; }
    if (th) X += 10;
    for (i = 0; i < hu; i++) { b += hundred(X); X += 46; }
    if (hu) X += 10;
    for (i = 0; i < te; i++) { b += ten(X); X += 13; }
    if (te) X += 10;
    for (i = 0; i < on; i++) { b += one(X); X += 12; }
    return svgWrap(Math.max(X + 4, 60), 74, b, 'Klodser');
  }

  function fractionBar(n, d, wholeLabel) {
    var W = 520, m = 20, bw = W - 2 * m, Y = 44, H = 52, b = '';
    if (wholeLabel !== undefined) {
      b += '<path d="M' + m + ',30 v-10 h' + bw + ' v10" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
           '<rect x="' + (W / 2 - 30) + '" y="6" width="60" height="26" rx="8" fill="#fff"/>' +
           '<text x="' + (W / 2) + '" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="' + INK + '">' + wholeLabel + '</text>';
    }
    for (var i = 0; i < d; i++) {
      b += '<rect x="' + (m + i * bw / d) + '" y="' + Y + '" width="' + (bw / d) + '" height="' + H + '" fill="' + (i < n ? YEL : '#fff') + '" stroke="' + INK + '" stroke-width="2.5"/>';
    }
    var extra = 0;
    if (wholeLabel === undefined) {
      b += '<text x="' + m + '" y="' + (Y + H + 24) + '" text-anchor="middle" font-size="16" fill="' + INK + '">0</text>' +
           '<text x="' + (W - m) + '" y="' + (Y + H + 24) + '" text-anchor="middle" font-size="16" fill="' + INK + '">1</text>';
      extra = 30;
    }
    return svgWrap(W, Y + H + 8 + extra, b, 'Brøkstrimmel');
  }

  function percentBar(whole) {
    var W = 560, m = 24, bw = W - 2 * m, Y = 44, H = 44, b = '';
    b += '<path d="M' + m + ',30 v-10 h' + bw + ' v10" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
         '<rect x="' + (W / 2 - 70) + '" y="5" width="140" height="26" rx="8" fill="#fff"/>' +
         '<text x="' + (W / 2) + '" y="25" text-anchor="middle" font-size="17" font-weight="700" fill="' + INK + '">100' + NBSP + '% = ' + fmt(whole) + '</text>';
    for (var i = 0; i < 10; i++) {
      b += '<rect x="' + (m + i * bw / 10) + '" y="' + Y + '" width="' + (bw / 10) + '" height="' + H + '" fill="' + (i % 2 ? '#fff' : BLUE_L) + '" stroke="' + INK + '" stroke-width="2"/>';
    }
    for (i = 0; i <= 10; i += 2) {
      b += '<text x="' + (m + i * bw / 10) + '" y="' + (Y + H + 22) + '" text-anchor="middle" font-size="17" fill="' + INK + '">' + (i * 10) + NBSP + '%</text>';
    }
    return svgWrap(W, Y + H + 28, b, 'Procentstrimmel');
  }

  function hint(text, svg) { return { text: text, svg: svg || '' }; }
  function prob(o) { o.speech = o.speech || speakify(o.text); return o; }

  /* ================= MELLEMTRIN ================= */

  var plusminus = {
    id: 'plusminus', band: 'M', name: 'Plus og minus', desc: 'Læg sammen og træk fra', time: 22,
    decimal: false, negative: false,
    gen: function (L, R) {
      var max = [20, 50, 100, 500, 1000][L - 1], min = [1, 5, 10, 50, 100][L - 1];
      var a, b, s;
      if (L >= 3 && R.chance(0.25)) { // missing addend
        s = R.int(Math.floor(max / 4), max); b = R.int(1, s - 1); a = s - b;
        return prob({ text: '? + ' + b + ' = ' + s, answer: a,
          hint: hint(t('Hvor langt er der fra {b} til {s}? Start ved {b}, og tæl op til {s}.', { b: b, s: s }),
                     numberLine({ start: b, end: s, jumpLabel: '?', markEnd: true, noNegative: true })),
          solution: a + ' + ' + b + ' = ' + s });
      }
      if (R.chance(0.5)) {
        a = R.int(min, max - 1); b = R.int(1, max - a); s = a + b;
        if (R.chance(0.5)) { var sw = a; a = b; b = sw; }
        return prob({ text: a + ' + ' + b + ' = ?', answer: s,
          hint: hint(t('Start ved {a}, og hop {b} frem.', { a: a, b: b }), numberLine({ start: a, end: s, jumpLabel: '+' + b, noNegative: true })),
          solution: a + ' + ' + b + ' = ' + s });
      }
      a = R.int(Math.max(2, min * 2), max); b = R.int(1, a - 1); s = a - b;
      return prob({ text: a + ' ' + MINUS + ' ' + b + ' = ?', answer: s,
        hint: hint(t('Start ved {a}, og hop {b} tilbage.', { a: a, b: b }), numberLine({ start: a, end: s, jumpLabel: MINUS + b, noNegative: true })),
        solution: a + ' ' + MINUS + ' ' + b + ' = ' + s });
    }
  };

  var TABLES = [[2, 5, 10], [2, 3, 4, 5, 10], [1, 2, 3, 4, 5, 6, 10], [2, 3, 4, 5, 6, 7, 8, 9], [2, 3, 4, 5, 6, 7, 8, 9, 10]];

  var gange = {
    id: 'gange', band: 'M', name: 'Gangetabeller', desc: 'Tabellerne fra 1 til 10', time: 20,
    decimal: false, negative: false,
    gen: function (L, R) {
      var a = R.pick(TABLES[L - 1]), b = R.int(L >= 3 ? 2 : 1, 10), p = a * b;
      if (L === 5 && R.chance(0.3)) {
        return prob({ text: '? ' + DOT + ' ' + a + ' = ' + p, answer: b,
          hint: hint(t('Hvor mange rækker med {a} skal der til for at få {p}? Tæl {a} ad gangen.', { a: a, p: p }), dotArray(b, a)),
          solution: b + ' ' + DOT + ' ' + a + ' = ' + p });
      }
      var x = a, y = b;
      if (R.chance(0.5)) { x = b; y = a; }
      return prob({ text: x + ' ' + DOT + ' ' + y + ' = ?', answer: p,
        hint: hint(t('Der er {x} rækker med {y} i hver. Tæl {y} ad gangen.', { x: x, y: y }), dotArray(x, y)),
        solution: x + ' ' + DOT + ' ' + y + ' = ' + p });
    }
  };

  var division = {
    id: 'division', band: 'M', name: 'Division', desc: 'Del tal op i lige store dele', time: 22,
    decimal: false, negative: false,
    gen: function (L, R) {
      var d = R.pick(TABLES[L - 1].filter(function (v) { return v > 1; })), q = R.int(L >= 3 ? 2 : 1, 10), n = d * q;
      return prob({ text: n + ' : ' + d + ' = ?', answer: q,
        hint: hint(t('{n} prikker sat i rækker med {d} i hver. Hvor mange rækker bliver det? Tænk: ? {dot} {d} = {n}.', { n: n, d: d, dot: DOT }), dotArray(q, d)),
        solution: n + ' : ' + d + ' = ' + q + ', fordi ' + q + ' ' + DOT + ' ' + d + ' = ' + n });
    }
  };

  var PLACES = [
    { v: 1000, one: 'tusinde', many: 'tusinder' },
    { v: 100, one: 'hundrede', many: 'hundreder' },
    { v: 10, one: 'tier', many: 'tiere' },
    { v: 1, one: 'ener', many: 'enere' }
  ];
  function listDa(parts) {
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' og ' + parts[parts.length - 1];
  }

  var pladsvaerdi = {
    id: 'pladsvaerdi', band: 'M', name: 'Pladsværdi', desc: 'Enere, tiere, hundreder og tusinder', time: 26,
    decimal: false, negative: false,
    gen: function (L, R) {
      var used = [[2, 3], [1, 2, 3], [1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3]][L - 1];
      var digits = [0, 0, 0, 0];
      used.forEach(function (i) { digits[i] = R.int(1, 9); });
      if (L === 5) digits[R.pick([1, 2, 3])] = 0; // a missing place → write 0
      var parts = [];
      used.forEach(function (i) { if (digits[i]) parts.push(digits[i] + ' ' + (digits[i] === 1 ? PLACES[i].one : PLACES[i].many)); });
      if (L === 3 || L === 5) parts = R.shuffle(parts);
      var n = digits[0] * 1000 + digits[1] * 100 + digits[2] * 10 + digits[3];
      var txt = 'Skriv tallet: ' + listDa(parts);
      var h = 'Skriv cifrene på deres pladser: ' + (used[0] === 0 ? 'tusinder, ' : '') + (used.length >= 3 ? 'hundreder, ' : '') + 'tiere og enere.';
      if (L === 5) h += ' Mangler en plads, skriver du 0 der.';
      return prob({ text: txt, answer: n, hint: hint(h, blocks(digits[0], digits[1], digits[2], digits[3])),
        solution: listDa(parts) + ' er ' + n });
    }
  };

  var broek = {
    id: 'broek', band: 'M', name: 'Brøker', desc: 'Find en brøkdel af et tal', time: 26,
    decimal: false, negative: false,
    gen: function (L, R) {
      var cfg = [
        { d: [2], nUnit: true, max: 20 }, { d: [2, 4], nUnit: true, max: 40 }, { d: [2, 3, 4, 5, 10], nUnit: true, max: 60 },
        { d: [3, 4, 5, 10], nUnit: false, max: 60 }, { d: [3, 4, 5, 6, 8, 10], nUnit: false, max: 120 }
      ][L - 1];
      var d = R.pick(cfg.d), n = cfg.nUnit ? 1 : R.int(1, d - 1);
      while (gcd(n, d) !== 1) n = R.int(1, d - 1); // only fractions in lowest terms
      var k = R.int(1, Math.floor(cfg.max / d)), whole = d * k, ans = n * k;
      var h = n === 1 ? t('Del {w} i {d} lige store dele. Hvor meget er én del?', { w: whole, d: d })
                      : t('Del {w} i {d} lige store dele. Hvor meget er {n} af delene?', { w: whole, d: d, n: n });
      return prob({ text: n + '/' + d + ' af ' + whole + ' = ?', answer: ans,
        hint: hint(h, fractionBar(n, d, whole)),
        solution: n + '/' + d + ' af ' + whole + ' = ' + ans + ', fordi ' + whole + ' : ' + d + ' = ' + k + (n > 1 ? ' og ' + n + ' ' + DOT + ' ' + k + ' = ' + ans : '') });
    }
  };

  var decimal = {
    id: 'decimal', band: 'M', name: 'Decimaltal', desc: 'Plus og minus med komma', time: 26,
    decimal: true, negative: false,
    gen: function (L, R) {
      var scale = L >= 4 ? 100 : 10, dec = L >= 4 ? 2 : 1;
      var max = [100, 100, 1000, 2000, 2000][L - 1];
      var a, b, s, plus = L === 1 ? true : R.chance(0.5);
      do {
        if (L === 5) { a = R.int(10, 100) * 10; b = R.int(5, 99); } // e.g. 3,5 + 0,25
        else { a = R.int(1, max - 1); b = R.int(1, max - 1); }
        if (plus && a + b > max) continue;
        if (!plus && a < b) { var tmp = a; a = b; b = tmp; }
        if (!plus && a === b) continue;
        break;
      } while (true);
      if (a % scale === 0 && b % scale === 0) a += 1; // make sure it is a decimal problem
      s = plus ? a + b : a - b;
      var A = fmt(a / scale, L === 5 ? undefined : dec), B = fmt(b / scale, L === 5 ? undefined : dec);
      var unit = scale === 10 ? 'tiendedele' : 'hundrededele', one = scale === 10 ? 'tiendedel' : 'hundrededel';
      var h = t('Tænk i {u}: {A} er {a} {ua}, og {B} er {b} {ub}.', { u: unit, A: A, B: B, a: a, b: b, ua: a === 1 ? one : unit, ub: b === 1 ? one : unit });
      var svg = (L <= 2) ? numberLine({ start: a, end: s, scale: 10, jumpLabel: (plus ? '+' : MINUS) + B, noNegative: true }) : '';
      return prob({ text: A + ' ' + (plus ? '+' : MINUS) + ' ' + B + ' = ?', answer: round6(s / scale),
        hint: hint(h, svg), solution: A + ' ' + (plus ? '+' : MINUS) + ' ' + B + ' = ' + fmt(s / scale) });
    }
  };

  /* ================= UDSKOLING ================= */

  var negative = {
    id: 'negative', band: 'U', name: 'Negative tal', desc: 'Regn med tal under nul', time: 24,
    decimal: false, negative: true,
    gen: function (L, R) {
      var a, b, r, text, h, svg = '', sol;
      if (L === 1 || L === 2 || (L === 5 && R.chance(0.4))) {
        if (L === 1) { a = R.int(0, 10); b = R.int(a + 1, 15); }
        else { a = -R.int(1, 12); b = R.int(1, 12); }
        var plus = L === 1 ? false : R.chance(0.5);
        r = plus ? a + b : a - b;
        text = fmt(a) + ' ' + (plus ? '+' : MINUS) + ' ' + b + ' = ?';
        h = t('Start ved {a} på tallinjen, og hop {b} {dir}.', { a: fmt(a), b: b, dir: plus ? 'frem' : 'tilbage' });
        svg = numberLine({ start: a, end: r, jumpLabel: (plus ? '+' : MINUS) + b });
        sol = text.replace('?', fmt(r));
      } else if (L === 3) {
        a = R.chance(0.3) ? -R.int(1, 10) : R.int(0, 10); b = -R.int(1, 10);
        var sub = R.chance(0.6);
        r = sub ? a - b : a + b;
        text = fmt(a) + ' ' + (sub ? MINUS : '+') + ' ' + par(b) + ' = ?';
        h = sub ? t('At trække et negativt tal fra er det samme som at lægge til: {a} {m} {pb} = {a} + {nb}.', { a: fmt(a), m: MINUS, pb: par(b), nb: -b })
                : t('At lægge et negativt tal til er det samme som at trække fra: {a} + {pb} = {a} {m} {nb}.', { a: fmt(a), m: MINUS, pb: par(b), nb: -b });
        svg = numberLine({ start: a, end: r, jumpLabel: (r > a ? '+' : MINUS) + Math.abs(b) });
        sol = text.replace('?', fmt(r));
      } else {
        var div = L === 5;
        a = R.int(2, 10) * (R.chance(0.5) ? -1 : 1); b = R.int(2, 10) * (R.chance(0.5) ? -1 : 1);
        if (a > 0 && b > 0) { if (R.chance(0.5)) a = -a; else b = -b; }
        if (div) { var n = a * b; text = par(n) + ' : ' + par(b) + ' = ?'; r = a;
          h = t('Regn først uden fortegn: {x} : {y}. Er fortegnene ens, bliver svaret positivt. Er de forskellige, bliver det negativt.', { x: Math.abs(n), y: Math.abs(b) }); }
        else { text = par(a) + ' ' + DOT + ' ' + par(b) + ' = ?'; r = a * b;
          h = t('Regn først uden fortegn: {x} {dot} {y}. Er fortegnene ens, bliver svaret positivt. Er de forskellige, bliver det negativt.', { x: Math.abs(a), y: Math.abs(b), dot: DOT }); }
        sol = text.replace('?', fmt(r));
      }
      return prob({ text: text, answer: r, hint: hint(h, svg), solution: sol });
    }
  };

  var ITEMS = ['En cykel', 'En jakke', 'Et skateboard', 'Et computerspil', 'En fodbold', 'Et telt', 'En lampe'];

  var procent = {
    id: 'procent', band: 'U', name: 'Procent', desc: 'Procent af, rabat og stigning', time: 30,
    decimal: false, negative: false,
    gen: function (L, R) {
      var p, w, ans, guard = 0;
      function pickInt(ps, step, max) {
        do { p = R.pick(ps); w = R.int(1, max / step) * step; ans = p * w / 100; guard++; } while (ans !== Math.round(ans) && guard < 200);
      }
      if (L <= 3) {
        pickInt([[10, 50], [10, 20, 25, 50], [5, 15, 30, 40, 60, 75]][L - 1], L === 1 ? 10 : 20, L === 1 ? 200 : 400);
        var h = p === 50 ? t('50 % er det samme som halvdelen af {w}.', { w: w })
              : (p === 25 || p === 75) ? t('25 % er det samme som en fjerdedel af {w}.', { w: w })
              : t('100 % er {w}. Så er 10 % lig med {w} : 10. Brug det til at finde {p} %.', { w: w, p: p });
        return prob({ text: pct(p) + ' af ' + w + ' = ?', answer: ans, hint: hint(h.replace(/ %/g, NBSP + '%'), percentBar(w)),
          solution: pct(p) + ' af ' + w + ' = ' + ans });
      }
      if (L === 4) {
        pickInt([10, 20, 25, 50, 75], 20, 400);
        return prob({ text: 'Hvor mange procent er ' + ans + ' af ' + w + '?', answer: p,
          hint: hint(t('Del {a} med {w}, og gang med 100.', { a: ans, w: w }), percentBar(w)),
          solution: t('{a} er {p} af {w}', { a: ans, p: pct(p), w: w }) });
      }
      pickInt([10, 20, 25, 50], 100, 1000);
      var down = R.chance(0.6), item = R.pick(ITEMS), res = down ? w - ans : w + ans;
      return prob({ text: t('{i} koster {w} kr. Prisen sættes {p} {dir}. Hvad koster {pron} nu?', { i: item, w: w, p: pct(p), dir: down ? 'ned' : 'op', pron: /^Et /.test(item) ? 'det' : 'den' }),
        answer: res,
        hint: hint(t('Find først {p} af {w}. {how} prisen.', { p: pct(p), w: w, how: down ? 'Træk det fra' : 'Læg det til' }), percentBar(w)),
        solution: t('{p} af {w} er {a}. {w} {op} {a} = {r} kr.', { p: pct(p), w: w, a: ans, op: down ? MINUS : '+', r: res }) });
    }
  };

  var hierarki = {
    id: 'hierarki', band: 'U', name: 'Regnearternes hierarki', desc: 'Hvad skal regnes først?', time: 30,
    decimal: false, negative: false,
    gen: function (L, R) {
      var a, b, c, d, text, ans, step, sol, kind = R.int(0, 1);
      var RULE = 'Regn gange og division før plus og minus. ';
      if (L === 1) {
        a = R.int(1, 20); b = R.int(2, 9); c = R.int(2, 9);
        if (kind) { text = a + ' + ' + b + ' ' + DOT + ' ' + c; } else { text = b + ' ' + DOT + ' ' + c + ' + ' + a; }
        ans = a + b * c; step = RULE + 'Start med ' + b + ' ' + DOT + ' ' + c + '.';
        sol = text + ' = ' + (kind ? a + ' + ' + b * c : b * c + ' + ' + a) + ' = ' + ans;
      } else if (L === 2) {
        b = R.int(2, 9); c = R.int(2, 9);
        if (kind) { a = R.int(b * c + 1, b * c + 30); text = a + ' ' + MINUS + ' ' + b + ' ' + DOT + ' ' + c; ans = a - b * c;
          step = RULE + 'Start med ' + b + ' ' + DOT + ' ' + c + '.'; sol = text + ' = ' + a + ' ' + MINUS + ' ' + b * c + ' = ' + ans; }
        else { a = R.int(1, 20); var q = b * c; text = a + ' + ' + q + ' : ' + c; ans = a + b;
          step = RULE + 'Start med ' + q + ' : ' + c + '.'; sol = text + ' = ' + a + ' + ' + b + ' = ' + ans; }
      } else if (L === 3) {
        a = R.int(2, 12); b = R.int(1, 9); c = R.int(2, 9);
        if (kind) { text = '(' + a + ' + ' + b + ') ' + DOT + ' ' + c; ans = (a + b) * c;
          step = 'Regn først det, der står i parentesen: ' + a + ' + ' + b + '.'; sol = text + ' = ' + (a + b) + ' ' + DOT + ' ' + c + ' = ' + ans; }
        else { if (a <= b) a = b + R.int(1, 6); text = c + ' ' + DOT + ' (' + a + ' ' + MINUS + ' ' + b + ')'; ans = c * (a - b);
          step = 'Regn først det, der står i parentesen: ' + a + ' ' + MINUS + ' ' + b + '.'; sol = text + ' = ' + c + ' ' + DOT + ' ' + (a - b) + ' = ' + ans; }
      } else if (L === 4) {
        b = R.int(2, 9); c = R.int(2, 9); d = R.int(1, 15);
        if (kind) { a = R.int(1, 20); if (a + b * c <= d) d = R.int(1, a + b * c - 1);
          text = a + ' + ' + b + ' ' + DOT + ' ' + c + ' ' + MINUS + ' ' + d; ans = a + b * c - d;
          step = RULE + 'Start med ' + b + ' ' + DOT + ' ' + c + '.'; sol = text + ' = ' + a + ' + ' + b * c + ' ' + MINUS + ' ' + d + ' = ' + ans; }
        else { var e = R.int(2, 6), f = R.int(2, 9); a = e * f;
          text = a + ' : ' + e + ' + ' + b + ' ' + DOT + ' ' + c; ans = f + b * c;
          step = RULE + 'Regn ' + a + ' : ' + e + ' og ' + b + ' ' + DOT + ' ' + c + ' først.'; sol = text + ' = ' + f + ' + ' + b * c + ' = ' + ans; }
      } else {
        b = R.int(2, 6); c = R.int(2, 9); a = R.int(2, 5);
        if (kind) { text = a + ' ' + DOT + ' ' + b + sup(2) + ' + ' + c; ans = a * b * b + c;
          step = 'Regn potensen først: ' + b + sup(2) + ' = ' + b + ' ' + DOT + ' ' + b + '. Så gange, og til sidst plus.';
          sol = text + ' = ' + a + ' ' + DOT + ' ' + b * b + ' + ' + c + ' = ' + (a * b * b) + ' + ' + c + ' = ' + ans; }
        else { var g = R.int(1, 5); text = '(' + g + ' + ' + b + ')' + sup(2) + ' ' + MINUS + ' ' + c; ans = (g + b) * (g + b) - c;
          step = 'Regn først parentesen, så potensen: (' + g + ' + ' + b + ')' + sup(2) + ' = ' + (g + b) + sup(2) + '.';
          sol = text + ' = ' + (g + b) + sup(2) + ' ' + MINUS + ' ' + c + ' = ' + (g + b) * (g + b) + ' ' + MINUS + ' ' + c + ' = ' + ans; }
      }
      return prob({ text: text + ' = ?', answer: ans, hint: hint(step), solution: sol });
    }
  };

  function lin(a, x) { return (a === 1 ? '' : a) + x; }
  function sgnTerm(n) { return n < 0 ? ' ' + MINUS + ' ' + (-n) : ' + ' + n; }

  var ligninger = {
    id: 'ligninger', band: 'U', name: 'Ligninger', desc: 'Find x', time: 36,
    decimal: false, negative: true,
    gen: function (L, R) {
      var x, a, b, c, d, text, h, check;
      if (L === 1) {
        x = R.int(1, 20); b = R.int(1, 20);
        if (R.chance(0.5)) { c = x + b; text = 'x + ' + b + ' = ' + c; h = t('Træk {b} fra på begge sider af lighedstegnet.', { b: b }); check = x + ' + ' + b + ' = ' + c; }
        else { c = x - b; if (c < 1) { x += b; c = x - b; } text = 'x ' + MINUS + ' ' + b + ' = ' + c; h = t('Læg {b} til på begge sider af lighedstegnet.', { b: b }); check = x + ' ' + MINUS + ' ' + b + ' = ' + c; }
      } else if (L === 2) {
        a = R.int(2, 9); x = R.int(1, 12); c = a * x;
        text = a + 'x = ' + c; h = t('{a}x betyder {a} {dot} x. Del begge sider med {a}.', { a: a, dot: DOT }); check = a + ' ' + DOT + ' ' + x + ' = ' + c;
      } else if (L === 3 || L === 4) {
        a = R.int(2, 9); x = L === 4 && R.chance(0.4) ? -R.int(1, 10) : R.int(1, 12);
        b = R.int(1, 20) * (L === 4 && R.chance(0.5) ? -1 : 1); c = a * x + b;
        text = a + 'x' + sgnTerm(b) + ' = ' + fmt(c);
        h = b > 0 ? t('Træk {b} fra på begge sider. Så står der {a}x = {r}.', { b: b, a: a, r: fmt(c - b) })
                  : t('Læg {b} til på begge sider. Så står der {a}x = {r}.', { b: -b, a: a, r: fmt(c - b) });
        check = a + ' ' + DOT + ' ' + par(x) + sgnTerm(b) + ' = ' + fmt(c);
      } else {
        c = R.int(1, 6); a = c + R.int(1, 5); x = R.int(-8, 12); if (x === 0) x = 3;
        b = R.int(-15, 15); if (b === 0) b = 4; d = (a - c) * x + b;
        text = a + 'x' + sgnTerm(b) + ' = ' + lin(c, 'x') + sgnTerm(d);
        h = t('Saml x på venstre side: træk {c} fra på begge sider. Så står der {k}{b} = {d}.', { c: lin(c, 'x'), k: lin(a - c, 'x'), b: sgnTerm(b), d: fmt(d) });
        check = a + ' ' + DOT + ' ' + par(x) + sgnTerm(b) + ' = ' + (a * x + b) + ' og ' + c + ' ' + DOT + ' ' + par(x) + sgnTerm(d) + ' = ' + (c * x + d);
      }
      return prob({ text: 'Find x: ' + text, speech: 'Find x. ' + speakify(text), answer: x, hint: hint(h),
        solution: 'x = ' + fmt(x) + ', fordi ' + check.replace(/-(\d)/g, MINUS + '$1') });
    }
  };

  function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }
  function toPow10(d) { var p = [10, 100, 1000]; for (var i = 0; i < p.length; i++) if (p[i] % d === 0) return p[i]; return null; }

  var broekdecimal = {
    id: 'broekdecimal', band: 'U', name: 'Brøker og decimaltal', desc: 'Skriv brøker som decimaltal', time: 30,
    decimal: true, negative: false,
    gen: function (L, R) {
      var sets = [
        [[1, 2], [1, 4], [3, 4], [1, 10], [3, 10], [7, 10], [9, 10], [1, 5], [4, 10]],
        [[1, 5], [2, 5], [3, 5], [4, 5], [3, 4], [1, 4], [9, 100], [37, 100]],
        [[3, 20], [7, 20], [11, 20], [13, 20], [17, 20], [3, 25], [7, 25], [12, 25], [18, 25], [9, 50], [21, 50], [33, 50]],
        [[1, 8], [3, 8], [5, 8], [7, 8], [3, 40], [9, 40], [11, 40], [7, 40]]
      ];
      if (L <= 4) {
        var f = R.pick(sets[L - 1]), n = f[0], d = f[1], P = toPow10(d), k = P / d;
        var h = d === 10 || d === 100 ? t('Nævneren er {d}. {n}/{d} betyder {n} {w}.', { d: d, n: n, w: d === 10 ? 'tiendedele' : 'hundrededele' })
              : t('Gang tæller og nævner med det samme tal, så nævneren bliver {P}. Her er {d} {dot} {k} = {P}.', { P: P, d: d, k: k, dot: DOT });
        return prob({ text: 'Som decimaltal: ' + n + '/' + d + ' = ?', answer: round6(n / d),
          hint: hint(h, d <= 10 ? fractionBar(n, d) : ''),
          solution: n + '/' + d + ' = ' + (k === 1 ? '' : (n * k) + '/' + P + ' = ') + fmt(n / d) });
      }
      var pairs = [[[1, 2], [1, 4]], [[1, 4], [1, 5]], [[3, 10], [1, 4]], [[1, 2], [3, 8]], [[2, 5], [1, 4]], [[3, 4], [1, 10]], [[1, 5], [1, 8]], [[1, 2], [1, 5]], [[3, 5], [1, 4]], [[1, 4], [3, 20]], [[7, 10], [1, 8]], [[1, 2], [3, 25]]];
      var pr = R.pick(pairs), A = pr[0], B = pr[1];
      return prob({ text: 'Som decimaltal: ' + A[0] + '/' + A[1] + ' + ' + B[0] + '/' + B[1] + ' = ?', answer: round6(A[0] / A[1] + B[0] / B[1]),
        hint: hint('Lav hver brøk om til et decimaltal først, og læg dem så sammen.'),
        solution: t('{a} = {x} og {b} = {y}. {x} + {y} = {r}', { a: A[0] + '/' + A[1], b: B[0] + '/' + B[1], x: fmt(A[0] / A[1]), y: fmt(B[0] / B[1]), r: fmt(A[0] / A[1] + B[0] / B[1]) }) });
    }
  };

  var potenser = {
    id: 'potenser', band: 'U', name: 'Potenser og rødder', desc: 'Kvadrattal og kvadratrødder', time: 26,
    decimal: false, negative: false,
    gen: function (L, R) {
      var b, e, v, kind;
      function powProb(b, e) {
        var v = Math.pow(b, e), prod = [];
        for (var i = 0; i < e; i++) prod.push(b);
        var expl = prod.join(' ' + DOT + ' ');
        return prob({ text: b + sup(e) + ' = ?', answer: v,
          hint: hint(t('{p} betyder {x}.', { p: b + sup(e), x: expl }), e === 2 && b <= 10 ? dotArray(b, b) : ''),
          solution: b + sup(e) + ' = ' + prod.join(' ' + DOT + ' ') + ' = ' + v });
      }
      function rootProb(b) {
        var n = b * b;
        return prob({ text: '√' + n + ' = ?', answer: b,
          hint: hint(t('Hvilket tal ganget med sig selv giver {n}?', { n: n })),
          solution: '√' + n + ' = ' + b + ', fordi ' + b + ' ' + DOT + ' ' + b + ' = ' + n });
      }
      if (L === 1) return powProb(R.int(1, 10), 2);
      if (L === 2) return R.chance(0.6) ? rootProb(R.int(1, 10)) : powProb(R.int(2, 10), 2);
      if (L === 3) { kind = R.int(0, 2); if (kind === 0) return powProb(R.int(1, 5), 3); if (kind === 1) return powProb(10, R.pick([2, 3])); return rootProb(R.int(2, 10)); }
      if (L === 4) return R.chance(0.5) ? powProb(R.int(11, 15), 2) : rootProb(R.int(11, 15));
      kind = R.int(0, 2);
      if (kind === 0) return powProb(2, R.int(4, 10));
      if (kind === 1) return powProb(3, R.int(3, 4));
      return powProb(10, R.int(4, 6));
    }
  };

  var TOPICS = [plusminus, gange, division, pladsvaerdi, broek, decimal, negative, procent, hierarki, ligninger, broekdecimal, potenser];
  var byId = {};
  TOPICS.forEach(function (tp) { byId[tp.id] = tp; });

  function generate(topicId, level, R) {
    var tp = byId[topicId];
    R = R || makeRand();
    level = Math.max(1, Math.min(5, level | 0 || 1));
    var p = tp.gen(level, R);
    p.topic = topicId; p.level = level;
    p.answerText = fmt(p.answer);
    return p;
  }

  // Parse what the child typed. Accepts 3,5 / 3.5 / -4 / −4. Returns NaN if not a number.
  function parseAnswer(str) {
    if (str === null || str === undefined) return NaN;
    var s = String(str).replace(/\s+/g, '').replace(/−/g, '-').replace(',', '.');
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return parseFloat(s);
  }
  function isCorrect(input, answer) {
    var v = typeof input === 'number' ? input : parseAnswer(input);
    return !isNaN(v) && Math.abs(v - answer) < 1e-9;
  }

  var api = {
    topics: TOPICS, byId: byId, bands: { M: TOPICS.filter(function (x) { return x.band === 'M'; }), U: TOPICS.filter(function (x) { return x.band === 'U'; }) },
    generate: generate, parseAnswer: parseAnswer, isCorrect: isCorrect, makeRand: makeRand,
    fmt: fmt, speakify: speakify, MINUS: MINUS, DOT: DOT
  };
  root.Regn = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
