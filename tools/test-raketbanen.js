// Raketbanen: every level is flown with every angle (1°) and every power (1) to prove it can be solved, that the levels
// get harder, that »Vis et skud« hits, that the physics is deterministic and agrees with an independent re-implementation,
// that the facts match the gravity the game uses, that share codes are strict, and that all Danish text is spelled right.
// Run: node tools/test-raketbanen.js   (needs hunspell da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../raketbanen/strings-da.js');
var RK = require('../raketbanen/physics.js');
require('../raketbanen/levels.js');
var S = window.STR.rb, execFileSync = require('child_process').execFileSync, game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, gameData: function () { return {}; }, profile: function () { return null; } };
require('../raketbanen/game.js');
var fails = 0, checks = 0, seen = {}, texts = [];
function check(ok, msg) { checks++; if (!ok) { fails++; if (!seen[msg]) { seen[msg] = 1; console.log('FAIL', msg); } } }
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function text(s, where) { check(typeof s === 'string' && s.length > 3 && !/\{\w+\}|undefined|NaN/.test(s), 'text ok: ' + where + ': ' + s); texts.push(s); }
var WORLDS = RK.worlds;

/* ---------- my own physics (written again from the rules, with Math.sin/cos) ---------- */
var G2 = { jorden: 9.8, maanen: 1.6, mars: 3.7, jupiter: 24.8 };
function ground2(tr, x) { for (var i = 1; i < tr.length; i++) if (x <= tr[i][0]) return tr[i - 1][1] + (tr[i][1] - tr[i - 1][1]) * (x - tr[i - 1][0]) / (tr[i][0] - tr[i - 1][0]); return tr[tr.length - 1][1]; }
function fly2(lv, a, p) {
  var rad = a * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad), space = !!lv.planets, x, y, v = p * (space ? 0.3 : 0.5);
  if (space) { var hp = lv.planets[lv.home || 0]; x = hp.x + c * (hp.r + 0.6); y = hp.y + s * (hp.r + 0.6); } else { x = lv.pad; y = ground2(lv.terrain, lv.pad) + lv.W * 0.02; }
  var vx = c * v, vy = s * v, dt = 1 / 120, Hh = lv.W * 0.6, n = Math.round((space ? 12 : 90) * 120);
  for (var k = 1; k <= n; k++) {
    var ax = 0, ay = 0;
    if (space) lv.planets.forEach(function (q) { var dx = q.x - x, dy = q.y - y, d2 = dx * dx + dy * dy + 0.25, f = q.gm / Math.pow(d2, 1.5); ax += f * dx; ay += f * dy; });
    else { ax = lv.wind || 0; ay = -G2[lv.g]; }
    vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt;
    if (Math.hypot(x - lv.station[0], y - lv.station[1]) <= lv.station[2]) return 'hit';
    if ((lv.walls || []).some(function (w) { return x >= w[0] && x <= w[2] && y >= w[1] && y <= w[3]; })) return 'wall';
    if ((lv.rocks || []).some(function (r) { return Math.hypot(x - r[0], y - r[1]) <= r[2]; })) return 'rock';
    if (space) {
      if (lv.planets.some(function (q) { return Math.hypot(x - q.x, y - q.y) <= q.r; })) return 'planet';
      if (x < -0.12 * lv.W || x > 1.12 * lv.W || y < -0.12 * Hh || y > 1.12 * Hh) return 'out';
    } else {
      if (y <= ground2(lv.terrain, x)) return 'ground';
      if (x < 0 || x > lv.W) return 'out';
    }
  }
  return 'time';
}

/* ---------- trigonometry and determinism ---------- */
var terr = 0; for (var d = -720; d <= 720; d += 0.25) { var tg = RK.trig(d); terr = Math.max(terr, Math.abs(tg[0] - Math.cos(d * Math.PI / 180)), Math.abs(tg[1] - Math.sin(d * Math.PI / 180))); }
check(terr < 1e-13, 'own sine and cosine are exact enough (' + terr + ')');
check(RK.trig(90)[0] === 0 || Math.abs(RK.trig(90)[0]) < 1e-15, 'cos 90° is 0');
WORLDS.forEach(function (w) { var lv = w.levels[2], a = RK.simulate(lv, 37, 61, { path: true }), b = RK.simulate(lv, 37, 61, { path: true }); check(JSON.stringify(a) === JSON.stringify(b), w.id + ': the same shot gives exactly the same path'); });
check(Math.abs(RK.DT - 1 / 120) < 1e-12, 'fixed time step 1/120 s');

/* ---------- gravity and facts ---------- */
check(RK.G.jorden === 9.8 && RK.G.maanen === 1.6 && RK.G.mars === 3.7 && RK.G.jupiter === 24.8, 'the game uses the real surface gravity');
function num(s) { var m = /(\d+(?:,\d+)?)\s*m\/s²/.exec(s); return m ? parseFloat(m[1].replace(',', '.')) : NaN; }
['jorden', 'maanen', 'mars', 'jupiter'].forEach(function (id) {
  var card = S.cards[id], w = WORLDS.filter(function (x) { return x.id === id; })[0];
  check(num(card.rows[0][1]) === RK.G[id], 'fact card ' + id + ': gravity ' + card.rows[0][1] + ' = ' + RK.G[id]);
  check(num(w.fact) === RK.G[id], 'world fact ' + id + ' gravity');
});
var moonR = RK.G.maanen / RK.G.jorden, marsR = RK.G.mars / RK.G.jorden, jupR = RK.G.jupiter / RK.G.jorden;
check(Math.abs(moonR - 1 / 6) < 0.01 && /sjettedel/.test(S.cards.maanen.rows[0][1]) && /1\/6|sjettedel/.test(WORLDS[1].fact), 'the Moon pulls about 1/6 (' + moonR.toFixed(3) + ')');
check(marsR > 1 / 3 && marsR < 0.42 && /lidt over en tredjedel/.test(WORLDS[2].fact), 'Mars pulls a little over a third (' + marsR.toFixed(3) + ')');
check(Math.abs(jupR - 2.5) < 0.05 && /2,5 gange/.test(S.cards.jupiter.rows[0][1]), 'Jupiter pulls about 2.5 times (' + jupR.toFixed(3) + ')');
check(num(S.cards.kredsloeb.rows[3][1]) === 8.7 && Math.abs(9.8 * Math.pow(6371 / (6371 + 400), 2) - 8.7) < 0.05, 'ISS gravity 8,7 m/s² at 400 km (inverse square from 9,8)');
check(/90 %/.test(S.qFloatExplain) && Math.abs(8.7 / 9.8 - 0.9) < 0.02, 'ISS gravity is about 90 % of the ground');
check(/384\.400 km/.test(S.cards.maanen.rows[1][1]) && /150 mio\. km/.test(S.cards.jorden.rows[1][1]) && /228 mio\. km/.test(S.cards.mars.rows[1][1]) && /778 mio\. km/.test(S.cards.jupiter.rows[1][1]), 'distances as written in the fact cards');
// daily task claims, flown with the game's own physics
// how far a shot flies on flat ground: where the path comes back down to the height it started from
function flatRange(g, a, p) {
  var lv = { world: g, g: g, W: 1000, id: 'q', terrain: [[0, -1000], [1000, -1000]], pad: 0, station: [-9e9, -9e9, 1] }, path = RK.simulate(lv, a, p, { path: true }).path, y0 = path[0][1];
  for (var i = 1; i < path.length; i++) if (path[i][1] < y0 && path[i - 1][1] >= y0) { var f = (path[i - 1][1] - y0) / (path[i - 1][1] - path[i][1]); return path[i - 1][0] + f * (path[i][0] - path[i - 1][0]); }
  return NaN;
}
var r30 = flatRange('jorden', 30, 60), r60 = flatRange('jorden', 60, 60), r45 = flatRange('jorden', 45, 60);
check(Math.abs(r30 - r60) / r45 < 0.06 && r45 > r30 && r45 > r60, '30° and 60° land about equally far, 45° furthest (' + r30.toFixed(1) + ', ' + r60.toFixed(1) + ', ' + r45.toFixed(1) + ')');
for (var a5 = 0; a5 <= 90; a5 += 5) if (a5 !== 45) check(flatRange('jorden', a5, 50) < flatRange('jorden', 45, 50), '45° is furthest on flat ground (vs ' + a5 + '°)');
var pE = 1; while (flatRange('jorden', 45, pE) < 20) pE++;
var moonLand = flatRange('maanen', 45, pE), earthLand = flatRange('jorden', 45, pE);
check(Math.abs(moonLand / earthLand - RK.G.jorden / RK.G.maanen) < 0.2 && 20 * moonLand / earthLand > 110 && 20 * moonLand / earthLand < 135, 'the same shot flies about 6 times as far on the Moon (' + earthLand.toFixed(1) + ' m → ' + moonLand.toFixed(1) + ' m; 20 m → ' + (20 * moonLand / earthLand).toFixed(0) + ' m)');

/* ---------- every level ---------- */
var t0 = Date.now(), report = [];
WORLDS.forEach(function (w) {
  check(w.levels.length === 6, w.id + ': six levels');
  check(S.worlds[w.id] && S.cards[w.id] && S.intro[w.id], w.id + ': name, card and intro');
  text(w.fact, w.id + ' fact');
  var prev = 1;
  w.levels.forEach(function (lv, i) {
    var tag = lv.id, sw = RK.sweep(lv);
    report.push(tag + ' ' + (sw.frac * 100).toFixed(2) + '%');
    check(sw.n > 0, tag + ': can be solved (' + sw.n + ' of ' + sw.total + ' shots hit)');
    if (i > 0) check(sw.frac < prev, tag + ': harder than the level before (' + (sw.frac * 100).toFixed(3) + '% < ' + (prev * 100).toFixed(3) + '%)');
    if (i > 0) check(sw.frac < 0.035, tag + ': not trivially easy (' + (sw.frac * 100).toFixed(2) + '%)');
    prev = sw.frac;
    var sol = lv.sol, ar = RK.angleRange(lv);
    check(Array.isArray(sol) && sol[0] >= ar[0] && sol[0] <= ar[1] && sol[1] >= 1 && sol[1] <= 100 && sol.every(function (x) { return x === Math.round(x); }), tag + ': »Vis et skud« is a whole angle and power in range');
    check(RK.simulate(lv, sol[0], sol[1]).hit, tag + ': »Vis et skud« ' + sol + ' hits');
    check(fly2(lv, sol[0], sol[1]) === 'hit', tag + ': my own physics agrees that ' + sol + ' hits');
    var around = 0; for (var da = -1; da <= 1; da++) for (var dp = -1; dp <= 1; dp++) { var aa = RK.isSpace(lv) ? (sol[0] + da + 360) % 360 : sol[0] + da; if (sw.grid[(aa - sw.a0) * 100 + sol[1] + dp - 1]) around++; }
    check(around >= 4, tag + ': »Vis et skud« is a steady shot (' + around + ' of 9 neighbours hit)');
    check(!RK.simulate(lv, 45, 50).hit, tag + ': the start values (45°, 50) do not hit by themselves');
    text(lv.why, tag + ' why');
    // the level fits in the picture
    if (!RK.isSpace(lv)) {
      check(lv.terrain[0][0] === 0 && lv.terrain[lv.terrain.length - 1][0] === lv.W && lv.terrain.every(function (q, k) { return !k || q[0] > lv.terrain[k - 1][0]; }), tag + ': ground from 0 to W');
      check(lv.station[1] - lv.station[2] > RK.groundY(lv, lv.station[0]) - lv.station[2] * 0.8 && lv.station[1] + lv.station[2] < lv.W * 0.6, tag + ': station above ground and in the picture');
      check(lv.pad > 0 && lv.pad < lv.W && Math.abs(RK.groundY(lv, lv.pad - 1) - RK.groundY(lv, lv.pad + 1)) < 0.01, tag + ': the pad stands on flat ground');
    } else {
      check(lv.planets.every(function (q) { return S.bodies[q.name]; }), tag + ': planets have Danish names');
      check(lv.station[0] - lv.station[2] > 0 && lv.station[0] + lv.station[2] < lv.W && lv.station[1] - lv.station[2] > 0 && lv.station[1] + lv.station[2] < lv.W * 0.6, tag + ': station in the picture');
    }
    // the two simulators agree on a sample of shots
    var R = rng(31 + i * 7 + w.id.length), agree = 0, tries = 300;
    for (var k = 0; k < tries; k++) { var a = Math.floor(ar[0] + R() * (ar[1] - ar[0] + 1)), p = 1 + Math.floor(R() * 100); if (RK.simulate(lv, a, p).end === fly2(lv, a, p)) agree++; }
    check(agree >= tries - 2, tag + ': my own physics agrees on ' + agree + ' of ' + tries + ' random shots');
    // Bob's feedback for some misses
    [[45, 50], [sol[0], Math.max(1, sol[1] - 12)], [sol[0], Math.min(100, sol[1] + 12)], [RK.isSpace(lv) ? (sol[0] + 180) % 360 : 150, 40], [sol[0], 1]].forEach(function (s) {
      var r = RK.simulate(lv, s[0], s[1]); if (r.hit) return;
      var f = game._feedback(lv, r, s[0], s[1], 1); text(f, tag + ' feedback ' + s);
    });
    check(/<svg[\s\S]*<\/svg>$/.test(game._sceneSvg(lv, { trails: [RK.simulate(lv, sol[0], sol[1], { path: true, every: 5 }).path] })), tag + ': the scene draws');
  });
});
console.log('Hit fractions: ' + report.join(', ') + ' (' + (Date.now() - t0) + ' ms)');
// a feedback sanity check: a too short and a too long shot on flat ground
var j1 = WORLDS[0].levels[0];
check(/kort/i.test(game._feedback(j1, RK.simulate(j1, 45, 30), 45, 30, 1)) && /mindre kraft|langt|over/i.test(game._feedback(j1, RK.simulate(j1, 45, 80), 45, 80, 1)), 'feedback: short says more power, long says less');
check(/forkerte vej/.test(game._feedback(j1, RK.simulate(j1, 150, 50), 150, 50, 1)), 'feedback: shooting backwards');

/* ---------- stars and progress ---------- */
check(game._starsFor(1, false, false) === 3 && game._starsFor(3, false, false) === 3 && game._starsFor(4, false, false) === 2 && game._starsFor(6, false, false) === 2 && game._starsFor(7, false, false) === 1, 'stars by shots');
check(game._starsFor(2, true, false) === 2 && game._starsFor(9, true, false) === 2 && game._starsFor(7, true, true) === 1 && game._starsFor(1, false, true) === 1, 'stars with help');
var dd = { w: { jorden: { best: [3, 3, 3, 2, 2, 1], plays: 7 }, maanen: { best: [3, 3, 0, 0, 0, 0], plays: 2 }, kredsloeb: { best: [3, 3, 3, 3, 3, 3], plays: 6 } }, cards: { jorden: 1, kredsloeb: 1 }, band: 'M' };
var pr = game.progress(dd);
check(pr.plays === 15 && JSON.stringify(pr.bands) === JSON.stringify({ M: [2, 1, 0], U: [0, 3, 0] }), 'progress: world stars are the floored average (' + JSON.stringify(pr) + ')');
check(JSON.stringify(game.summary(dd)) === JSON.stringify({ stars: 3, max: 9 }), 'summary for the band');
check(JSON.stringify(game.collection(dd)) === JSON.stringify({ n: 2, max: 6 }), 'collection counts the fact cards');
var rep = game.parentReport(dd);
check(rep.head.length === 3 && rep.rows.length === 3 && rep.rows[0][1] === '2/3' && rep.rows[0][2] === '6/6', 'parent report');
check(JSON.stringify(game.progress({})) === JSON.stringify({ plays: 0, bands: { M: [0, 0, 0], U: [0, 0, 0] } }), 'progress for a new player');

/* ---------- sandbox codes ---------- */
var SB = RK.sandbox, R3 = rng(4242), made = 0, rt = 0;
for (var k2 = 0; k2 < 400 && made < 40; k2++) {
  var sb = { w: Math.floor(R3() * 4), pad: Math.floor(R3() * 4), st: [4 + Math.floor(R3() * 4), Math.floor(R3() * 5)], obs: [] };
  var n2 = Math.floor(R3() * 7);
  for (var j = 0; j < n2; j++) { var o = [R3() < 0.5 ? 'm' : 's', Math.floor(R3() * 8), Math.floor(R3() * 4)]; var trial = JSON.parse(JSON.stringify(sb)); trial.obs.push(o); if (SB.valid(trial)) sb = trial; }
  if (!SB.valid(sb)) continue;
  var code = SB.toCode(sb), back = SB.fromCode(code), lvb = SB.build(sb), shot = RK.findShot(lvb);
  made++;
  check(/^R1-[0-3][0-7][0-7][0-4]([MS][0-7][0-4]){0,6}$/.test(code) && code.length <= 25, 'code format: ' + code);
  if (shot) { rt++; check(back && JSON.stringify(back.sb) === JSON.stringify(sb), 'sandbox code round trip: ' + code); check(back && RK.simulate(back.lv, back.shot[0], back.shot[1]).hit, 'the found shot hits: ' + code); check(SB.fromCode(code.toLowerCase().replace('r1-', 'R1-')) !== null && SB.fromCode(' ' + code + ' ') !== null, 'code read without caring about case and spaces'); }
  else { check(back === null, 'a level that cannot be solved is refused: ' + code); check(RK.sweep(lvb, 2, 2).n === 0, 'unsolvable really has no hit: ' + code); }
}
check(rt >= 20, 'enough solvable random sandbox levels (' + rt + ')');
var good = SB.fromCode('R1-0162M42S33');
check(good && good.lv.walls.length === 1 && good.lv.rocks.length === 1, 'a simple code loads');
['', null, undefined, 'R1-', 'R2-0162', 'R1-4162', 'R1-01x2', 'R1-0165', 'R1-0182', 'R1-0162M4', 'R1-0162M42M43', 'R1-0162M12', 'R1-0162M63', 'R1-0162S62', 'R1-0162S10', 'R1-0162M82',
  'R1-0162M43S42', 'R1-0162S20S21S22S23S24S30S31', '<script>alert(1)</script>', 'R1-0162M42<img>', 'R1-0162' + 'S33'.repeat(20), 'BOB1:abc', 'R1-0162M42 S33 x', 'R1-3070M44', 'R1-30704'].forEach(function (bad) {
  check(SB.fromCode(bad) === null, 'bad code refused: ' + String(bad).slice(0, 24));
});
check(RK.sweep(SB.build({ w: 3, pad: 0, st: [7, 0], obs: [['m', 4, 4]] })).n === 0, 'the refused Jupiter code really cannot be solved');

/* ---------- daily challenge ---------- */
['M', 'U'].forEach(function (b) {
  var kinds = {};
  for (var i = 0; i < 200; i++) {
    var keep = Math.random; Math.random = rng(9 + i); var q1 = game.quickTask(b, {}); Math.random = rng(9 + i); var q2 = game.quickTask(b, {}); Math.random = keep;
    check(JSON.stringify(q1) === JSON.stringify(q2), 'daily task the same for the same seed');
    check(JSON.stringify(JSON.parse(JSON.stringify(q1))) === JSON.stringify(q1), 'daily task is plain data');
    check(q1.options.indexOf(q1.answer) >= 0 && new Set(q1.options).size === q1.options.length && q1.hint && q1.explain, 'daily task answer among options');
    kinds[q1.q.slice(0, 20)] = 1;
    if (i < 40) { text(q1.q, 'daily q'); text(q1.hint, 'daily hint'); text(q1.explain, 'daily explain'); q1.options.forEach(function (x) { texts.push(x); }); }
    if (q1.html) {
      check(/^<div[^>]*><svg[\s\S]*<\/svg><\/div>$/.test(q1.html) && !/<script|on\w+=/i.test(q1.html), 'daily picture is a plain svg');
      // the paths: the asked body's letter is the longest (weakest gravity) or the shortest (strongest) path
      var lens = []; q1.html.replace(/<polyline points="([^"]+)"/g, function (m, p) { var xs = p.split(' ').map(function (s) { return +s.split(',')[0]; }); lens.push(Math.max.apply(null, xs)); return m; });
      var askName = /hører til (\S+)\?$/.exec(q1.q)[1], ids = Object.keys(S.bodies).filter(function (k) { return S.bodies[k] === askName; }), id = ids[0];
      var trio = b === 'U' ? ['jupiter', 'jorden', 'mars'] : ['jorden', 'mars', 'maanen'], gs = trio.map(function (x) { return RK.G[x]; });
      var li = 'ABC'.indexOf(q1.answer), want = RK.G[id] === Math.max.apply(null, gs) ? Math.min.apply(null, lens) : Math.max.apply(null, lens);
      check(lens.length === 3 && lens[li] === want, 'daily paths: ' + askName + ' is path ' + q1.answer);
    }
  }
  check(Object.keys(kinds).length >= 4, 'several kinds of daily tasks for ' + b + ' (' + Object.keys(kinds).length + ')');
});

/* ---------- Danish spelling ---------- */
(function walk(x) { if (typeof x === 'string') texts.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k]); }); })(S);
var words = {};
texts.forEach(function (s) { (String(s).replace(/­/g, '').replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉé]+/g) || []).forEach(function (w) { words[w] = 1; }); });
var OK = ['mio', 'ca']; // abbreviations (mio., ca.), also allowed in tools/spellcheck.js
var list = Object.keys(words).filter(function (w) { return OK.indexOf(w) < 0 && w.length > 1; });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));

console.log(fails ? 'Raketbanen: ' + fails + ' of ' + checks + ' checks FAILED' : 'Raketbanen: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
