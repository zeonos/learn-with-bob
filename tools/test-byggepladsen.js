// Byggepladsen: proves the cube nets and re-computes every generated task in a different way. Run: node tools/test-byggepladsen.js  (needs hunspell da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../byggepladsen/strings-da.js');
var G = require('../byggepladsen/geometry.js'), S = window.STR.bp, execFileSync = require('child_process').execFileSync;
var game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); }, registerGame: function (g) { game = g; }, profile: function () { return null; } };
require('../byggepladsen/game.js');
var fails = 0, checks = 0, failMsgs = {};
function check(ok, msg) { checks++; if (!ok) { fails++; var k = String(msg).slice(0, 60); failMsgs[k] = (failMsgs[k] || 0) + 1; if (failMsgs[k] <= 3) console.log('FAIL', msg); } }
function uniq(a) { return new Set(a).size === a.length; }
// the same seeded generator as Core.rng (mulberry32), so tasks can be repeated
function rng(a) { a = a >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function seeded(seed, fn) { var keep = Math.random; Math.random = rng(seed); try { return fn(); } finally { Math.random = keep; } }
var SEEDS = +(process.env.BP_SEEDS || 2000);

/* ================= 1. The 11 nets of a cube, proved by brute force ================= */
// (a) every hexomino: grow all fixed shapes cell by cell (own code), then group them under the 8 symmetries of the square
function keyOf(cells) { var mx = Infinity, my = Infinity; cells.forEach(function (c) { mx = Math.min(mx, c[0]); my = Math.min(my, c[1]); }); return cells.map(function (c) { return (c[0] - mx) + ':' + (c[1] - my); }).sort().join(' '); }
function cellsOf(key) { return key.split(' ').map(function (s) { return s.split(':').map(Number); }); }
var MATS = [[1, 0, 0, 1], [0, -1, 1, 0], [-1, 0, 0, -1], [0, 1, -1, 0], [-1, 0, 0, 1], [1, 0, 0, -1], [0, 1, 1, 0], [0, -1, -1, 0]];
function apply(m, c) { return [m[0] * c[0] + m[1] * c[1], m[2] * c[0] + m[3] * c[1]]; }
function freeKey(cells) { return MATS.map(function (m) { return keyOf(cells.map(function (c) { return apply(m, c); })); }).sort()[0]; }
var level = new Set(['0:0']);
for (var n = 2; n <= 6; n++) {
  var nextLevel = new Set();
  level.forEach(function (k) {
    var cs = cellsOf(k), has = new Set(k.split(' '));
    cs.forEach(function (c) { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var q = (c[0] + d[0]) + ':' + (c[1] + d[1]); if (!has.has(q)) nextLevel.add(keyOf(cs.concat([[c[0] + d[0], c[1] + d[1]]]))); }); });
  });
  level = nextLevel;
}
var fixedHex = Array.from(level), freeHex = Array.from(new Set(fixedHex.map(function (k) { return freeKey(cellsOf(k)); })));
check(fixedHex.length === 216, 'there are 216 fixed hexominoes (' + fixedHex.length + ')');
check(freeHex.length === 35, 'there are 35 free hexominoes (' + freeHex.length + ')');
// (b) fold by rolling a die over the paper: every square gets the side of the die that lies on it.
// The paper folds into a cube exactly when the six squares get six different sides and every fold line agrees.
var ROLL = { // which side ends up in each position after tipping the die one square in that direction
  E: function (s) { return { B: s.E, T: s.W, E: s.T, W: s.B, N: s.N, S: s.S }; },
  W: function (s) { return { B: s.W, T: s.E, W: s.T, E: s.B, N: s.N, S: s.S }; },
  N: function (s) { return { B: s.N, T: s.S, N: s.T, S: s.B, E: s.E, W: s.W }; },
  S: function (s) { return { B: s.S, T: s.N, S: s.T, N: s.B, E: s.E, W: s.W }; }
};
var STEP = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
function rollFold(cells) {
  var at = {}, side = {}, state = {};
  cells.forEach(function (c, i) { at[c[0] + ':' + c[1]] = i; });
  (function dfs(i, s) {
    state[i] = s; side[i] = s.B;
    Object.keys(STEP).forEach(function (d) { var j = at[(cells[i][0] + STEP[d][0]) + ':' + (cells[i][1] + STEP[d][1])]; if (j !== undefined && state[j] === undefined) dfs(j, ROLL[d](s)); });
  })(0, { B: 'b', T: 't', N: 'n', S: 's', E: 'e', W: 'w' });
  var ok = Object.keys(state).length === cells.length && new Set(Object.keys(side).map(function (k) { return side[k]; })).size === 6;
  // every pair of neighbouring squares must agree, also along edges the search did not use
  cells.forEach(function (c, i) { Object.keys(STEP).forEach(function (d) { var j = at[(c[0] + STEP[d][0]) + ':' + (c[1] + STEP[d][1])]; if (j !== undefined && ROLL[d](state[i]).B !== side[j]) ok = false; }); });
  return { ok: ok, side: side };
}
var OPP = { b: 't', t: 'b', n: 's', s: 'n', e: 'w', w: 'e' };
var foldable = freeHex.filter(function (k) { return rollFold(cellsOf(k)).ok; });
check(foldable.length === 11, 'exactly 11 hexominoes fold into a cube (' + foldable.length + ')');
var stored = G.NETS.map(function (s) { return freeKey(G.parseShape(s)); });
check(uniq(stored) && stored.length === 11, 'the game knows 11 different nets');
check(stored.slice().sort().join('|') === foldable.slice().sort().join('|'), 'the game\'s 11 nets are exactly the ones that fold');
fixedHex.forEach(function (k) { var c = cellsOf(k); check(G.isNet(c) === rollFold(c).ok, 'isNet agrees with folding for ' + k); });
check(G.hexominoes().length === 35, 'the game finds 35 hexominoes');
// opposite sides in the game's own fold agree with the die
G.NETS.forEach(function (s) {
  for (var o = 0; o < 8; o++) {
    var c = G.orient(G.parseShape(s), o), f = rollFold(c), gf = G.fold(c);
    check(gf.ok, 'game fold works for ' + s);
    for (var i = 0; i < 6; i++) { var want = -1; for (var j = 0; j < 6; j++) if (f.side[j] === OPP[f.side[i]]) want = j; check(G.opposite(c, i) === want, 'opposite side ' + s + ' #' + i); }
    // the hinge tree used by the animation reaches every square through neighbours
    check(gf.parent.filter(function (p) { return p === -1; }).length === 1 && gf.parent.every(function (p, i) { return p === -1 || Math.abs(c[p][0] - c[i][0]) + Math.abs(c[p][1] - c[i][1]) === 1; }), 'hinge tree ' + s);
  }
});

/* ================= helpers for re-computing tasks ================= */
function keySet(list) { return new Set(list); }
function sameSet(a, b) { a = Array.from(a).sort(); b = Array.from(b).sort(); return a.join(';') === b.join(';'); }
function centre(c) { return [c[0] + 0.5, c[1] + 0.5]; }
function toCell(p) { return Math.floor(p[0] + 1e-9) + ',' + Math.floor(p[1] + 1e-9); }
function inGrid(k, W, H) { var c = k.split(',').map(Number); return c[0] >= 0 && c[1] >= 0 && c[0] < W && c[1] < H; }
function connected(cells) {
  var s = new Set(cells.map(function (c) { return c.join(','); })), seen = new Set([cells[0].join(',')]), st = [cells[0]];
  while (st.length) { var c = st.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var k = (c[0] + d[0]) + ',' + (c[1] + d[1]); if (s.has(k) && !seen.has(k)) { seen.add(k); st.push(k.split(',').map(Number)); } }); }
  return seen.size === s.size;
}
function reflectPoint(p, ax) {
  if (ax.type === 'v') return [2 * ax.at - p[0], p[1]];
  if (ax.type === 'h') return [p[0], 2 * ax.at - p[1]];
  var d = ax.type === 'd' ? [Math.SQRT1_2, Math.SQRT1_2] : [-Math.SQRT1_2, Math.SQRT1_2], v = [p[0] - ax.px, p[1] - ax.py], t = v[0] * d[0] + v[1] * d[1];
  return [ax.px + 2 * t * d[0] - v[0], ax.py + 2 * t * d[1] - v[1]];
}
function sideOf(p, ax) { // signed distance to the mirror line
  if (ax.type === 'v') return p[0] - ax.at; if (ax.type === 'h') return p[1] - ax.at;
  var d = ax.type === 'd' ? [1, 1] : [-1, 1], v = [p[0] - ax.px, p[1] - ax.py]; return v[0] * d[1] - v[1] * d[0];
}
function dk(s) { return parseFloat(String(s).replace(/\./g, '').replace(',', '.')); } // Danish number text -> number
function num(re, s) { var m = s.match(re); return m ? dk(m[1]) : NaN; }
function round(x, dec) { var p = Math.pow(10, dec); return Math.round(x * p + 1e-9) / p; }
function danish(x, dec) { var s = (dec === undefined ? String(+x.toFixed(6)) : x.toFixed(dec)).split('.'); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (s[1] ? ',' + s[1] : ''); }
var ROUNDING = [S.round1, S.round1pi, S.round0pi, 'rund op'];
function textOk(tk, where) {
  ['q', 'hint', 'explain'].forEach(function (f) { check(typeof tk[f] === 'string' && tk[f].length > 3 && !/\{\w+\}|undefined|NaN/.test(tk[f]), where + ' has a good ' + f + ': ' + tk[f]); });
}

/* ================= 2. Every generator, thousands of seeds, answers re-computed ================= */
var KINDS = ['fenceArea', 'fencePer', 'fenceBoth', 'fenceMax', 'fenceMin', 'mirror', 'move', 'rotate', 'reflect', 'whichMove', 'netPick', 'netYesNo', 'netOpp', 'view', 'viewPlan',
  'coordPlace', 'coordRead', 'coordRect', 'shapeName', 'angleKind', 'rightAngles', 'tiles', 'rect', 'tri', 'para', 'trap', 'circA', 'circO', 'room', 'ladder', 'paint', 'paintL', 'pool', 'poolL', 'box', 'cyl', 'scale', 'blocks'];
var counts = {}, allTexts = [];
KINDS.forEach(function (kind) {
  counts[kind] = 0;
  for (var seed = 1; seed <= SEEDS; seed++) {
    var band = seed % 2 ? 'M' : 'U', tk = seeded(seed * 7919 + kind.length, function () { return G.make(kind, band); }), w = kind + ' #' + seed;
    counts[kind]++;
    textOk(tk, w);
    if (seed <= 40) allTexts.push(tk.q, tk.hint, tk.explain);
    verify(tk, w, seed <= 150);
  }
});
function verify(tk, w, deep) {
  var q = tk.q;
  switch (tk.type) {
    case 'fence': {
      var A = num(/arealet (\d+) m²/, q), P = num(/omkredsen (\d+) m/, q), have = num(/har (?:præcis )?(\d+) m hegn/, q), good = [];
      var all = []; for (var ww = 1; ww <= 8; ww++) for (var hh = 1; hh <= 6; hh++) all.push([ww, hh]);
      if (tk.kind === 'fenceArea') good = all.filter(function (r) { return r[0] * r[1] === A; });
      if (tk.kind === 'fencePer') good = all.filter(function (r) { return 2 * r[0] + 2 * r[1] === P && P === have; });
      if (tk.kind === 'fenceBoth') good = all.filter(function (r) { return r[0] * r[1] === A && 2 * (r[0] + r[1]) === P; });
      if (tk.kind === 'fenceMax') { var withP = all.filter(function (r) { return 2 * (r[0] + r[1]) === have; }), best = Math.max.apply(null, withP.map(function (r) { return r[0] * r[1]; })); good = withP.filter(function (r) { return r[0] * r[1] === best; }); }
      if (tk.kind === 'fenceMin') { var withA = all.filter(function (r) { return r[0] * r[1] === A; }), least = Math.min.apply(null, withA.map(function (r) { return 2 * (r[0] + r[1]); })); good = withA.filter(function (r) { return 2 * (r[0] + r[1]) === least; }); }
      check(good.length >= 1, w + ' has a solution');
      check(sameSet(good.map(String), tk.solutions.map(String)), w + ' solutions match brute force: ' + JSON.stringify(good) + ' vs ' + JSON.stringify(tk.solutions));
      check(G.check(tk, tk.answer) && tk.answer.every(function (v, i) { return v >= 0 && v <= (i % 2 ? 6 : 8); }), w + ' stored answer is a right pen on the board');
      if (deep) { // every pair of posts on the board
        var goodSet = new Set(good.map(String));
        for (var x1 = 0; x1 <= 8; x1++) for (var y1 = 0; y1 <= 6; y1++) for (var x2 = 0; x2 <= 8; x2++) for (var y2 = 0; y2 <= 6; y2++)
          if (G.check(tk, [x1, y1, x2, y2]) !== goodSet.has(Math.abs(x2 - x1) + ',' + Math.abs(y2 - y1))) check(false, w + ' check() wrong for pen ' + [x1, y1, x2, y2]);
      }
      if (tk.kind === 'fenceBoth') check(all.filter(function (r) { return r[0] * r[1] === A; }).length > good.length, w + ' the area alone is not enough');
      break;
    }
    case 'cells': {
      var given = tk.given.map(function (c) { return c.join(','); }), img = new Set();
      check(uniq(given) && tk.given.every(function (c) { return inGrid(c.join(','), tk.W, tk.H); }) && connected(tk.given), w + ' figure is one piece on the board');
      if (tk.kind === 'mirror' || tk.kind === 'reflect') {
        tk.given.forEach(function (c) { img.add(toCell(reflectPoint(centre(c), tk.axis))); });
        var sides = tk.given.map(function (c) { return Math.sign(sideOf(centre(c), tk.axis)); });
        check(sides.every(function (s) { return s !== 0 && s === sides[0]; }), w + ' figure lies on one side of the line');
        if (tk.kind === 'mirror') {
          var whole = given.concat(tk.answer);
          check(whole.every(function (k) { return keySet(whole).has(toCell(reflectPoint(centre(k.split(',').map(Number)), tk.axis))); }), w + ' the finished figure is symmetric');
          check(tk.given.some(function (c) { return Math.abs(sideOf(centre(c), tk.axis)) === 0.5; }), w + ' figure touches the mirror line');
          check((tk.axis.type === 'v' && tk.axis.at === 4) || (tk.axis.type === 'h' && tk.axis.at === 3), w + ' mirror line in the middle');
        }
      } else if (tk.kind === 'move') {
        var dx = num(/(\d+) felte?r? til højre/, q) || -num(/(\d+) felte?r? til venstre/, q), dy = num(/(\d+) felte?r? ned/, q) || -num(/(\d+) felte?r? op/, q);
        check(dx === tk.move[0] && dy === tk.move[1], w + ' text says the same move');
        tk.given.forEach(function (c) { img.add(toCell([c[0] + 0.5 + dx, c[1] + 0.5 + dy])); });
      } else if (tk.kind === 'rotate') {
        var deg = num(/(\d+)°/, q), th = (/mod uret/.test(q) ? -deg : deg) * Math.PI / 180; // y points down: a positive angle turns clockwise on the screen
        check(deg === tk.deg && (deg === 180 || /med uret|mod uret/.test(q)), w + ' text gives the angle and the direction');
        tk.given.forEach(function (c) { var u = c[0] + 0.5 - tk.center[0], v = c[1] + 0.5 - tk.center[1]; img.add(toCell([tk.center[0] + u * Math.cos(th) - v * Math.sin(th), tk.center[1] + u * Math.sin(th) + v * Math.cos(th)])); });
      }
      check(sameSet(img, tk.answer), w + ' answer equals the re-computed image');
      check(tk.answer.every(function (k) { return inGrid(k, tk.W, tk.H); }) && !tk.answer.some(function (k) { return given.indexOf(k) >= 0; }), w + ' image is on the board and does not cover the figure');
      check(G.check(tk, tk.answer.slice().reverse()) && !G.check(tk, tk.answer.slice(1)), w + ' check() accepts exactly the image');
      break;
    }
    case 'point': {
      var p = tk.answer.split(',').map(Number);
      check(p[0] >= 0 && p[0] <= 8 && p[1] >= 0 && p[1] <= 6 && tk.W === 8 && tk.H === 6, w + ' point is inside the first quadrant shown');
      if (tk.kind === 'coordPlace') { var m = q.match(/\((\d+), (\d+)\)/); check(m && +m[1] === p[0] && +m[2] === p[1], w + ' text gives the point'); }
      else {
        var pts = tk.shown.concat([p]), xs = new Set(pts.map(function (c) { return c[0]; })), ys = new Set(pts.map(function (c) { return c[1]; }));
        check(xs.size === 2 && ys.size === 2 && uniq(pts.map(String)) && tk.shown.every(function (c) { return c[0] >= 0 && c[0] <= 8 && c[1] >= 0 && c[1] <= 6; }), w + ' the four corners make a rectangle');
      }
      check(G.check(tk, tk.answer) && !G.check(tk, (p[0] + 1) + ',' + p[1]), w + ' check() for points');
      break;
    }
    case 'number': {
      var exact = expected(tk), ans = exact.ans;
      check(isFinite(ans), w + ' could be re-computed');
      check(Math.abs(G.parseNum(tk.answer) - ans) < 1e-9 && tk.answer === danish(ans, exact.dec), w + ' answer ' + tk.answer + ' = ' + danish(ans, exact.dec));
      check(G.check(tk, tk.answer) && G.check(tk, String(ans)) && !G.check(tk, String(ans + (exact.alt !== undefined ? 3 : 1))) && !G.check(tk, ''), w + ' check() for the number');
      check(tk.accept.every(function (a) { return Math.abs(a - ans) < 1e-9 || (exact.alt !== undefined && Math.abs(a - exact.alt) < 1e-9); }), w + ' only right values are accepted');
      if (Math.abs(exact.raw - ans) > 1e-9) { // rounding happened: the task must say how
        check(ROUNDING.some(function (r) { return q.indexOf(r) >= 0; }), w + ' states the rounding: ' + q);
        check(/[Rr]unde|rund op|købe/.test(tk.explain), w + ' explains the rounding');
        if (exact.dec !== undefined && exact.dec > 0) check(Math.abs(exact.raw * Math.pow(10, exact.dec) - Math.floor(exact.raw * Math.pow(10, exact.dec)) - 0.5) > 1e-6, w + ' is not on a rounding boundary');
      }
      if (/π/.test(q)) check(q.indexOf('3,14') >= 0, w + ' says π ≈ 3,14');
      check(exact.raw > 0 && ans < 200000, w + ' sensible size');
      break;
    }
    default: verifyChoice(tk, w);
  }
}
function expected(tk) { // re-computes a number task from the numbers in the text or the drawing, in whole units where possible
  var q = tk.q, r, v;
  switch (tk.kind) {
    case 'tri': return { raw: tk.g * tk.h / 2, ans: tk.g * tk.h / 2 };
    case 'para': if (tk.side) check(tk.side * tk.side === tk.off * tk.off + tk.h * tk.h, 'slanted side label is right'); return { raw: tk.g * tk.h, ans: tk.g * tk.h };
    case 'trap': return { raw: (tk.a + tk.b) * tk.h / 2, ans: (tk.a + tk.b) * tk.h / 2 };
    case 'circA': r = tk.d ? num(/diameteren (\d+) m/, q) / 2 : num(/radius (\d+) m/, q); v = 3.14 * r * r; return { raw: v, ans: Math.floor((314 * r * r + 5) / 10) / 10, dec: 1, alt: round(Math.PI * r * r, 1) };
    case 'circO': r = num(/radius (\d+) m/, q); v = 2 * 3.14 * r; return { raw: v, ans: Math.floor((628 * r + 5) / 10) / 10, dec: 1, alt: round(2 * Math.PI * r, 1) };
    case 'room': var a = num(/er (\d+) m langt/, q), b = num(/og (\d+) m bredt/, q); v = Math.hypot(a, b); return { raw: v, ans: round(v, 1), dec: 1 };
    case 'ladder': var c = num(/stige er (\d+) m/, q), f = num(/står (\d+) m fra/, q); v = Math.sqrt(c * c - f * f); return { raw: v, ans: round(v, 1), dec: 1 };
    case 'paint': case 'paintL':
      var W = num(/væg er ([\d,]+) m bred/, q), H = num(/og ([\d,]+) m høj/, q), ww = num(/vindue på ([\d,]+) m ·/, q), wh = num(/· ([\d,]+) m\./, q);
      var area100 = Math.round(W * 100) * Math.round(H * 100) / 100 - Math.round(ww * 100) * Math.round(wh * 100) / 100; // in 1/100 m²
      if (tk.kind === 'paint') return { raw: area100 / 100, ans: area100 / 100 };
      var k = num(/rækker til (\d+) m²/, q); return { raw: area100 / 100 / k, ans: Math.ceil(area100 / (100 * k) - 1e-12) };
    case 'pool': case 'poolL':
      var l = num(/er (\d+) m langt/, q), bb = num(/(\d+) m bredt/, q), d = num(/og ([\d,]+) m dybt/, q), V = l * bb * Math.round(d * 10) / 10;
      return tk.kind === 'pool' ? { raw: V, ans: V } : { raw: V * 1000, ans: V * 1000 };
    case 'boxV': case 'boxO':
      var L = num(/er (\d+) cm lang/, q), B = num(/(\d+) cm bred/, q), Hh = num(/(\d+) cm høj/, q);
      v = tk.kind === 'boxV' ? L * B * Hh : 2 * L * B + 2 * L * Hh + 2 * B * Hh; return { raw: v, ans: v };
    case 'cyl': r = num(/radius (\d+) dm/, q); var hc = num(/er (\d+) dm høj/, q); v = 3.14 * r * r * hc; return { raw: v, ans: Math.floor((314 * r * r * hc + 50) / 100), dec: 0, alt: Math.round(Math.PI * r * r * hc) };
    case 'scaleUp': var m = num(/1:(\d+)/, q), cm = num(/er (\d+) cm på tegningen/, q); return { raw: cm * m / 100, ans: cm * m / 100 };
    case 'scaleDown': var m2 = num(/1:(\d+)/, q), real = num(/væg er ([\d,]+) m lang/, q); v = Math.round(real * 100) / m2; check(v >= 2, 'scale drawing is at least 2 cm'); return { raw: v, ans: v };
    case 'blocks': var s = 0; tk.heights.forEach(function (col) { col.forEach(function (x) { s += x; }); }); return { raw: s, ans: s };
  }
  return { raw: NaN, ans: NaN };
}
// views of a tower, computed from the blocks themselves
function voxels(h) { var out = []; h.forEach(function (col, x) { col.forEach(function (n, y) { for (var z = 0; z < n; z++) out.push([x, y, z]); }); }); return out; }
function viewPixels(h, which) {
  var px = new Set();
  voxels(h).forEach(function (b) { if (which === 'front') px.add(b[0] + ',' + b[2]); else if (which === 'right') px.add(b[1] + ',' + b[2]); else px.add(b[0] + ',' + b[1]); });
  return px;
}
function decodeView(code) { // the picture an option draws, as pixels (column, row from the bottom / from the front)
  var px = new Set();
  if (code[0] === 'c') code.slice(1).split('').forEach(function (n, i) { for (var z = 0; z < +n; z++) px.add(i + ',' + z); });
  else { var p = code.slice(1).split(':'), W = +p[0], bits = p[1]; for (var i = 0; i < bits.length; i++) if (bits[i] === '1') { var row = Math.floor(i / W), D = bits.length / W; px.add((i % W) + ',' + (D - 1 - row)); } }
  return px;
}
function classify(fig) { // names that fit the figure, from its corners
  if (fig.circle) return { names: ['cirkel'], right: 0 };
  var p = fig.poly, n = p.length, ang = [], len = [];
  for (var i = 0; i < n; i++) {
    var a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n], u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];
    ang.push(Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(u[0], u[1]) / Math.hypot(v[0], v[1])) * 180 / Math.PI); len.push(Math.hypot(c[0] - b[0], c[1] - b[1]));
  }
  var right = ang.filter(function (x) { return Math.abs(x - 90) < 1; }).length, names = [];
  if (n === 3) names.push('trekant'); if (n === 5) names.push('femkant'); if (n === 6) names.push('sekskant');
  if (n === 4) {
    var dir = function (i) { return Math.atan2(p[(i + 1) % 4][1] - p[i][1], p[(i + 1) % 4][0] - p[i][0]); };
    var par = function (i, j) { var d = Math.abs(dir(i) - dir(j)) % Math.PI; return Math.min(d, Math.PI - d) < 0.01; };
    var pp = (par(0, 2) ? 1 : 0) + (par(1, 3) ? 1 : 0);
    if (right === 4 && Math.max.apply(null, len) - Math.min.apply(null, len) < 0.02 * len[0]) names.push('kvadrat');
    if (right === 4) names.push('rektangel'); if (pp === 2) names.push('parallelogram'); if (pp >= 1) names.push('trapez');
  }
  return { names: names, right: right, ang: ang };
}
function verifyChoice(tk, w) {
  check(Array.isArray(tk.options) && tk.options.length >= 2 && tk.options.length <= 5 && uniq(tk.options) && tk.options.indexOf(tk.answer) >= 0, w + ' answer among unique options');
  var lab = tk.options.map(function (o) { return game._label(tk, o); });
  check(uniq(lab) && lab.every(function (l) { return typeof l === 'string' && l.length; }), w + ' option labels unique');
  switch (tk.kind) {
    case 'netPick':
      var folds = tk.figs.map(function (c) { return c.length === 6 && connected(c) && rollFold(c).ok; });
      check(folds.filter(Boolean).length === 1 && folds[tk.options.indexOf(tk.answer)], w + ' exactly the right figure folds (the others are proved not to)');
      check(uniq(tk.figs.map(freeKey)), w + ' three different figures');
      if (tk.q && w.indexOf('#') && w.split('#')[1] % 2 === 0) check(tk.figs.every(function (c) { return rollFold(c).ok || !G.has2x2(c); }), w + ' udskoling: no easy 2 × 2 blocks');
      break;
    case 'netYesNo': check(rollFold(tk.fig).ok === (tk.answer === 'yes') && tk.fig.length === 6 && connected(tk.fig), w + ' yes/no matches folding'); break;
    case 'netOpp':
      var f = rollFold(tk.fig), opp = -1; for (var j = 0; j < 6; j++) if (f.side[j] === OPP[f.side[tk.mark]]) opp = j;
      check(f.ok && tk.labels[opp] === tk.answer && tk.options.length === 5 && tk.options.indexOf(tk.labels[tk.mark]) < 0, w + ' opposite side re-computed by rolling a die');
      break;
    case 'view': case 'viewPlan':
      var want = viewPixels(tk.heights, tk.which);
      check(sameSet(decodeView(tk.answer), want), w + ' the right drawing equals the view computed from the blocks');
      check(tk.options.filter(function (o) { return sameSet(decodeView(o), want); }).length === 1, w + ' no wrong drawing shows the same view');
      check(q(tk).indexOf(S.sides[tk.which]) >= 0, w + ' asks for the right side');
      var h = tk.heights, vis = true;
      for (var x = 0; x < 3; x++) for (var y = 0; y < 3; y++) for (var k = 1; x + k < 3 && y - k >= 0; k++) if (h[x + k][y - k] >= h[x][y] + k) vis = false;
      check(vis, w + ' no stack is hidden in the drawing');
      break;
    case 'coordRead':
      var m = tk.answer.match(/^\((\d+), (\d+)\)$/);
      check(m && +m[1] === tk.point[0] && +m[2] === tk.point[1] && tk.point[0] <= 8 && tk.point[1] <= 6 && tk.point[0] >= 0 && tk.point[1] >= 0, w + ' coordinates read from the point');
      check(tk.options.every(function (o) { var mm = o.match(/^\((\d+), (\d+)\)$/); return mm && +mm[1] <= 8 && +mm[2] <= 6; }), w + ' all options are points on the board');
      break;
    case 'shapeName':
      var cl = classify(tk.fig);
      check(cl.names[0] === tk.answer, w + ' figure is a ' + tk.answer + ' (' + cl.names + ')');
      check(tk.options.every(function (o) { return o === tk.answer || cl.names.indexOf(o) < 0; }), w + ' no wrong name also fits (' + cl.names + ')');
      if (tk.fig.poly) check(tk.fig.poly.every(function (pt) { return pt[0] >= -4 && pt[0] <= 104 && pt[1] >= -4 && pt[1] <= 74; }), w + ' figure fits the drawing');
      break;
    case 'angleKind':
      var v = tk.vertex, a = tk.rays[0], b = tk.rays[1], u1 = [a[0] - v[0], a[1] - v[1]], u2 = [b[0] - v[0], b[1] - v[1]];
      var deg = Math.acos((u1[0] * u2[0] + u1[1] * u2[1]) / Math.hypot(u1[0], u1[1]) / Math.hypot(u2[0], u2[1])) * 180 / Math.PI;
      var kind = Math.abs(deg - 90) < 0.5 ? 'ret' : deg < 90 ? 'spids' : 'stump';
      check(kind === tk.answer && (kind === 'ret' || Math.abs(deg - 90) >= 19), w + ' angle measured ' + deg.toFixed(1) + '° is ' + tk.answer);
      check(tk.explain.indexOf(Math.round(deg) + '°') >= 0, w + ' explanation gives the size');
      break;
    case 'rightAngles': check(String(classify(tk.fig).right) === tk.answer, w + ' right angles counted'); break;
    case 'tilesArea': case 'tilesPer':
      var cells = tk.given, s = new Set(cells.map(String)), adj = 0;
      cells.forEach(function (c) { if (s.has([c[0] + 1, c[1]].join(','))) adj++; if (s.has([c[0], c[1] + 1].join(','))) adj++; });
      var right = tk.kind === 'tilesArea' ? s.size + ' m²' : (4 * s.size - 2 * adj) + ' m';
      check(right === tk.answer && connected(cells) && uniq(cells.map(String)), w + ' ' + right);
      break;
    case 'rectArea': case 'rectPer':
      var l = num(/(\d+) m langt/, tk.q), bb = num(/(\d+) m bredt/, tk.q);
      check((tk.kind === 'rectArea' ? l * bb + ' m²' : 2 * (l + bb) + ' m') === tk.answer, w + ' rectangle');
      break;
    case 'whichMove':
      // try every rotation/reflection of the grid together with every shift; classify the moves that work
      var found = new Set(), A = tk.given.map(centre), target = new Set(tk.image.map(function (c) { return c.join(','); }));
      MATS.forEach(function (M) {
        var mapped = A.map(function (p) { return apply(M, p); }), mn = mapped.reduce(function (m, p) { return p[0] < m[0] || (p[0] === m[0] && p[1] < m[1]) ? p : m; });
        var tmin = tk.image.map(centre).reduce(function (m, p) { return p[0] < m[0] || (p[0] === m[0] && p[1] < m[1]) ? p : m; });
        var t = [tmin[0] - mn[0], tmin[1] - mn[1]], img = new Set(mapped.map(function (p) { return toCell([p[0] + t[0], p[1] + t[1]]); }));
        if (!sameSet(img, target)) return;
        var det = M[0] * M[3] - M[1] * M[2];
        if (det === 1) found.add(M[0] === 1 && M[3] === 1 ? 'move' : 'rotate');
        else found.add(Math.abs(apply(M, t)[0] + t[0]) < 1e-9 && Math.abs(apply(M, t)[1] + t[1]) < 1e-9 ? 'reflect' : 'glide');
      });
      check(found.size === 1 && found.has(tk.answer), w + ' only one kind of move fits: ' + Array.from(found));
      break;
  }
  function q(t2) { return t2.q; }
}

/* ================= 3. Numbers, rounding and parsing ================= */
[['12,5', 12.5], ['12.5', 12.5], [' 7 ', 7], ['1.000', 1000], ['1.000,5', 1000.5], ['28,3 m²', 28.3], ['4.760', 4760], ['0,5', 0.5], ['-3', -3], ['abc', NaN], ['', NaN], ['1,2,3', NaN], ['7,', NaN]].forEach(function (c) {
  var v = G.parseNum(c[0]); check(isNaN(c[1]) ? isNaN(v) : v === c[1], 'parseNum("' + c[0] + '") = ' + c[1] + ' (got ' + v + ')');
});
[[28.3, undefined, '28,3'], [113, 1, '113,0'], [4760, undefined, '4.760'], [48000, undefined, '48.000'], [0.5, undefined, '0,5'], [12.25, undefined, '12,25'], [7, undefined, '7']].forEach(function (c) { check(G.fmt(c[0], c[1]) === c[2], 'fmt ' + c[0] + ' -> ' + c[2] + ' (got ' + G.fmt(c[0], c[1]) + ')'); });
[[2826, 100, 1, 28.3], [1225, 100, 1, 12.3], [1224, 100, 1, 12.2], [14130, 100, 0, 141], [14150, 100, 0, 142], [5, 10, 0, 1]].forEach(function (c) { check(G.roundFrac(c[0], c[1], c[2]) === c[3], 'roundFrac ' + c.join(' ')); });

/* ================= 4. Rounds ================= */
var UONLY = ['fenceBoth', 'fenceMax', 'fenceMin', 'move', 'rotate', 'reflect', 'whichMove', 'netOpp', 'view', 'viewPlan', 'tri', 'para', 'trap', 'circA', 'circO', 'room', 'ladder', 'paint', 'paintL', 'pool', 'poolL', 'boxV', 'boxO', 'cyl', 'scaleUp', 'scaleDown'];
check(G.ROUTES.filter(function (r) { return r.b === 'M'; }).length === 6 && G.ROUTES.filter(function (r) { return r.b === 'U'; }).length === 6, 'six routes per band');
G.ROUTES.forEach(function (r) {
  check(S.routes[r.id] && S.routes[r.id].name && S.routes[r.id].desc && S.projectNames[r.id], r.id + ' has texts');
  for (var i = 0; i < 60; i++) {
    var tasks = seeded(1000 + i * 31 + r.id.length, function () { return G.buildRound(r); });
    check(tasks.length === 8, r.id + ' round has 8 tasks');
    check(uniq(tasks.map(G.taskKey)), r.id + ' no repeated task in a round');
    if (r.b === 'M') check(tasks.every(function (tk) { return UONLY.indexOf(tk.kind) < 0; }), r.id + ' only mellemtrin content: ' + tasks.map(function (x) { return x.kind; }));
    tasks.forEach(function (tk) { verify(tk, r.id + ' round task ' + tk.kind, false); });
  }
});

/* ================= 5. Hub API and the daily task ================= */
var sum0 = game.summary({});
check(sum0.stars === 0 && sum0.max === 18, 'summary for a new player');
var full = { band: 'U', routes: {} }; G.ROUTES.forEach(function (r, i) { full.routes[r.id] = { stars: i % 4, best: 50, plays: 2 }; });
var pr = game.progress(full); check(pr.plays === 24 && pr.bands.M.join('') === '012301' && pr.bands.U.join('') === '230123', 'progress ' + JSON.stringify(pr));
check(JSON.stringify(game.progress({})) === JSON.stringify({ plays: 0, bands: { M: [0, 0, 0, 0, 0, 0], U: [0, 0, 0, 0, 0, 0] } }), 'progress for a new player');
check(game.collection(full).n === 9 && game.collection(full).max === 12 && game.collection({}).n === 0, 'collection counts finished projects');
check(game.parentReport(full).rows.length === 12 && game.parentReport(full).head.length === 3, 'parent report');
['M', 'U'].forEach(function (band) {
  var routesSeen = {};
  for (var seed = 1; seed <= 600; seed++) {
    var qt = seeded(seed, function () { return game.quickTask(band, seed % 3 ? {} : full); }), again = seeded(seed, function () { return game.quickTask(band, seed % 3 ? {} : full); }), w = 'quickTask ' + band + ' #' + seed;
    routesSeen[qt.route] = 1;
    check(JSON.stringify(qt) === JSON.stringify(again), w + ' is the same for the same seed');
    check(JSON.stringify(JSON.parse(JSON.stringify(qt))) === JSON.stringify(qt), w + ' is plain JSON');
    check(typeof qt.q === 'string' && qt.q.length > 5 && qt.hint && qt.explain && qt.speak && qt.lang === 'da' && !/\{\w+\}|undefined|NaN/.test(qt.q + qt.hint + qt.explain), w + ' has texts');
    if (qt.options) check(qt.options.length >= 2 && qt.options.length <= 4 && uniq(qt.options) && qt.options.indexOf(qt.answer) >= 0 && qt.options.every(function (o) { return typeof o === 'string'; }), w + ' options ' + JSON.stringify(qt.options));
    else check(qt.input === 'number' && /^\d+(,\d+)?$/.test(qt.answer) && qt.unit, w + ' number answer ' + qt.answer);
    if (qt.html) check(/^<svg/.test(qt.html) && !/class=|<script|href=/.test(qt.html) && /max-height:2[0-4]\dpx/.test(qt.html) && qt.html.length < 30000, w + ' illustration is a small inline SVG');
    if (seed % 3 === 0) check(['m-hegn', 'm-former', 'u-kasse'].indexOf(qt.route) >= 0, w + ' leans towards the route with fewest stars (' + qt.route + ')');
    if (seed <= 30) allTexts.push(qt.q, qt.hint, qt.explain);
  }
  check(Object.keys(routesSeen).length === 6, band + ' daily tasks come from all six routes');
});
check(game._sayify('3 m² · 2') === '3 kvadratmeter gange 2', 'read-aloud says the symbols');

/* ================= 6. Danish spelling ================= */
var words = new Set();
(function walk(x, key) {
  if (typeof x === 'string') { if (key !== 'id') (x.replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉé]+/g) || []).forEach(function (wd) { if (wd.length > 1) words.add(wd); }); return; }
  if (Array.isArray(x)) return x.forEach(function (v) { walk(v, key); });
  if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k], k); });
})([S, allTexts]);
var OK = ['cm', 'dm', 'Fx', 'fx', 'ca'];
var list = Array.from(words).filter(function (wd) { return OK.indexOf(wd) < 0; });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));
check(list.length > 300, 'spell check saw the texts (' + list.length + ' words)');
// invented names only: nothing that looks like a real company or brand
var REAL = /lego|ikea|bauhaus|silvan|jem & fix|stark|harald nyborg|google|apple|minecraft/i;
check(!REAL.test(JSON.stringify(S) + allTexts.join(' ')), 'no real brand names');

var total = 0; Object.keys(counts).forEach(function (k) { total += counts[k]; });
console.log('Generated and re-checked ' + total + ' tasks (' + SEEDS + ' seeds × ' + KINDS.length + ' generators) + 720 rounds + 1.200 daily tasks.');
console.log(fails ? 'Byggepladsen: ' + fails + ' of ' + checks + ' checks FAILED' : 'Byggepladsen: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
