// Labyrinten: re-checks every kind of maze with independent searches. Run: node tools/test-labyrinten.js [rounds]  (needs hunspell da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../labyrinten/strings-da.js');
var LAB = require('../labyrinten/mazes.js'), S = window.STR.lb, execFileSync = require('child_process').execFileSync, game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, gameData: function () { return {}; }, profile: function () { return null; }, routeProgress: function () { return {}; } };
require('../labyrinten/game.js');
var N = +process.argv[2] || 40, fails = 0, checks = 0, seen = {}, texts = [];
function check(ok, msg) { checks++; if (!ok) { fails++; if (!seen[msg]) { seen[msg] = 1; console.log('FAIL', msg); } } }
function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
function text(s, where) { check(typeof s === 'string' && s.length > 3 && !/\{\w+\}|undefined|NaN/.test(s), 'text ok: ' + where + ': ' + s); texts.push(s); }
var D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, AR = { '^': 'up', 'v': 'down', '<': 'left', '>': 'right' };
function find(rows, ch) { for (var y = 0; y < rows.length; y++) { var x = rows[y].indexOf(ch); if (x >= 0) return [x, y]; } return null; }
function at(rows, x, y) { return y < 0 || x < 0 || y >= rows.length || x >= rows[0].length ? '#' : rows[y][x]; }

/* ---------- my own searches ---------- */
// walking with keys, doors and arrows: rows as made (S and G included)
function walkBest(rows, opts) {
  opts = opts || {};
  var s = find(rows, 'S'), g = find(rows, 'G'), q = [[s[0], s[1], '', 0]], seenW = {};
  seenW[s + '|'] = 1;
  while (q.length) {
    var c = q.shift();
    if (c[0] === g[0] && c[1] === g[1]) return c[3];
    for (var d in D) {
      var nx = c[0] + D[d][0], ny = c[1] + D[d][1], t = at(rows, nx, ny), here = at(rows, c[0], c[1]), keys = c[2];
      if (t === '#') continue;
      if (!opts.noArrows && ((AR[here] && AR[here] !== d) || (AR[t] && AR[t] !== d))) continue;
      if (/[ABC]/.test(t) && (opts.closed || keys.indexOf(t.toLowerCase()) < 0)) continue;
      if (/[abc]/.test(t) && keys.indexOf(t) < 0) keys = (keys + t).split('').sort().join('');
      var k = nx + ',' + ny + '|' + keys; if (seenW[k]) continue; seenW[k] = 1;
      q.push([nx, ny, keys, c[3] + 1]);
    }
  }
  return -1;
}
function rowsWithStart(lv) { return lv.rows.map(function (r, y) { return y === lv.start[1] ? r.slice(0, lv.start[0]) + 'S' + r.slice(lv.start[0] + 1) : r; }); }
function iceBest(rows) {
  var s = find(rows, 'S'), q = [[s[0], s[1], 0]], seenI = {}; seenI[s] = 1;
  while (q.length) {
    var c = q.shift();
    if (at(rows, c[0], c[1]) === 'G') return c[2];
    for (var d in D) {
      var x = c[0], y = c[1], moved = false;
      while (at(rows, x + D[d][0], y + D[d][1]) !== '#') { x += D[d][0]; y += D[d][1]; moved = true; if (at(rows, x, y) === 'G') break; }
      if (!moved || seenI[x + ',' + y]) continue; seenI[x + ',' + y] = 1; q.push([x, y, c[2] + 1]);
    }
  }
  return -1;
}
function crateBest(lv) {
  var w = lv.w, s0 = [lv.start[0], lv.start[1], lv.crates.slice().sort(function (a, b) { return a - b; })], q = [[s0, 0]], seenC = {};
  seenC[JSON.stringify(s0)] = 1;
  var marks = []; lv.rows.forEach(function (r, y) { for (var x = 0; x < w; x++) if (r[x] === 'x') marks.push(y * w + x); });
  while (q.length) {
    var c = q.shift(), st = c[0];
    if (st[2].every(function (i) { return marks.indexOf(i) >= 0; })) return c[1];
    for (var d in D) {
      var nx = st[0] + D[d][0], ny = st[1] + D[d][1]; if (lv.rows[ny][nx] === '#') continue;
      var cr = st[2].slice(), k = cr.indexOf(ny * w + nx);
      if (k >= 0) { var bx = nx + D[d][0], by = ny + D[d][1]; if (lv.rows[by][bx] === '#' || cr.indexOf(by * w + bx) >= 0) continue; cr[k] = by * w + bx; cr.sort(function (a, b) { return a - b; }); }
      var ns = [nx, ny, cr], key = JSON.stringify(ns); if (seenC[key]) continue; seenC[key] = 1; q.push([ns, c[1] + 1]);
    }
  }
  return -1;
}
function replay(lv, steps) { var s = LAB.start(lv); steps.forEach(function (st) { st.dirs.forEach(function (d) { var m = LAB.move(lv, s, d); check(!!m, 'explained step can be walked'); if (m) s = m.s; }); }); return LAB.done(lv, s); }

/* ---------- mazes ---------- */
game._routes.filter(function (r) { return r.kind !== 'route'; }).forEach(function (r) {
  r.levels.forEach(function (cfg, li) {
    for (var k = 0; k < (r.kind === 'crates' && li === 2 ? Math.ceil(N / 4) : N); k++) {
      var items = game._makeRound(r, li + 1, rng(1000 * (li + 1) + k + r.id.length * 77)), it = items[0], lv = it.lv, tag = r.id + ' level ' + (li + 1);
      check(items.length === cfg.count, tag + ' round size');
      if (r.kind === 'mirrors') {
        var pz = lv, sols = 0, bestT = 99;
        for (var mask = 0; mask < (1 << pz.mirrors.length); mask++) {
          var o = pz.mirrors.map(function (_, i) { return mask & (1 << i) ? '\\' : '/'; });
          // my own light: in from the left of row laser[1]
          var x = -1, y = pz.laser[1], d = 'right', hit = false;
          for (var g2 = 0; g2 < 300; g2++) {
            x += D[d][0]; y += D[d][1];
            if (x < 0 || y < 0 || x >= pz.w || y >= pz.h || pz.walls.indexOf(y * pz.w + x) >= 0) break;
            if (x === pz.crystal[0] && y === pz.crystal[1]) { hit = true; break; }
            var mi = -1; pz.mirrors.forEach(function (m, i) { if (m[0] === x && m[1] === y) mi = i; });
            if (mi >= 0) d = o[mi] === '/' ? { right: 'up', up: 'right', left: 'down', down: 'left' }[d] : { right: 'down', down: 'right', left: 'up', up: 'left' }[d];
          }
          check(hit === LAB.trace(pz, o).hit, 'mirrors: the light agrees with my own');
          if (hit) { sols++; var tt = o.filter(function (v, i) { return v !== pz.start[i]; }).length; bestT = Math.min(bestT, tt); }
        }
        check(sols >= 1, tag + ': the light can reach the crystal');
        check(bestT === pz.best && bestT >= cfg.used, tag + ': fewest turns ' + bestT);
        check(pz.mirrors.length === cfg.m, tag + ': number of mirrors');
        var steps = LAB.mirrorSteps(pz, pz.start), o2 = pz.start.slice();
        steps.forEach(function (s) { o2[s.mirror] = o2[s.mirror] === '/' ? '\\' : '/'; if (k < 2) text(s.text, 'mirror step'); });
        check(steps.length === pz.best && LAB.trace(pz, o2).hit, tag + ': the shown solution lights the crystal in the fewest turns');
        continue;
      }
      var rows = rowsWithStart(lv), b = LAB.solve(lv).n;
      check(lv.rows.every(function (rw) { return rw.length === lv.w; }) && lv.rows.length === lv.h, tag + ' rows');
      if (r.kind === 'ice') {
        check(iceBest(rows) === b, tag + ': fewest slides agree (' + b + ')');
        check(b >= cfg.lo && b <= cfg.hi, tag + ': slides in range ' + b);
      } else if (r.kind === 'crates') {
        check(crateBest(lv) === b, tag + ': fewest moves agree (' + b + ')');
        check(lv.crates.length === cfg.n, tag + ': crates');
        check(lv.rows.join('').split('x').length - 1 === cfg.n, tag + ': marks');
        check(lv.crates.every(function (i) { return lv.rows[Math.floor(i / lv.w)][i % lv.w] !== 'x'; }), tag + ': no crate starts on a mark');
      } else {
        check(walkBest(rows) === b, tag + ': fewest steps agree (' + b + ')');
        if (r.kind === 'maze') { // a perfect maze: open squares − 1 = connections
          var open = 0, links = 0;
          for (var y = 0; y < lv.h; y++) for (var x = 0; x < lv.w; x++) if (lv.rows[y][x] !== '#') { open++; if (lv.rows[y][x + 1] && lv.rows[y][x + 1] !== '#') links++; if (lv.rows[y + 1] && lv.rows[y + 1][x] !== '#') links++; }
          check(links === open - 1, tag + ': one road between any two squares');
          check(lv.w === 2 * cfg.cw + 1 && lv.h === 2 * cfg.ch + 1, tag + ': size');
        }
        if (r.kind === 'keys') {
          check(walkBest(rows, { closed: true }) === -1, tag + ': the doors block the road without keys');
          check((lv.rows.join('').match(/[abc]/g) || []).length === cfg.keys && (lv.rows.join('').match(/[ABC]/g) || []).length === cfg.keys, tag + ': keys and doors');
        }
        if (r.kind === 'oneway') {
          var free = walkBest(rows, { noArrows: true });
          check(free > 0 && b >= free + 4, tag + ': the arrows force a detour (' + free + ' → ' + b + ')');
          check((lv.rows.join('').match(/[<>^v]/g) || []).length === cfg.arrows, tag + ': arrows');
        }
      }
      var ex = LAB.explain(lv);
      check(replay(lv, ex), tag + ': the explained road reaches the end');
      check(ex.reduce(function (a, s) { return a + s.dirs.length; }, 0) === b, tag + ': the explained road is the shortest');
      if (k < 2) ex.forEach(function (s) { text(s.text, r.kind + ' step'); });
      check(game._allow(it) > b, tag + ': room for a few extra steps for 3 stars');
    }
  });
});

/* ---------- shortest-road questions ---------- */
function myDist(map, s) {
  var dist = {}, q = [[s[0], s[1], 0]]; dist[s] = 0;
  while (q.length) { q.sort(function (a, b) { return a[2] - b[2]; }); var c = q.shift(); if (c[2] > dist[c[0] + ',' + c[1]]) continue;
    for (var d in D) { var x = c[0] + D[d][0], y = c[1] + D[d][1]; if (!map[y] || map[y][x] === undefined || map[y][x] === '#') continue; var nd = c[2] + (map[y][x] === '~' ? 2 : 1); if (dist[x + ',' + y] === undefined || nd < dist[x + ',' + y]) { dist[x + ',' + y] = nd; q.push([x, y, nd]); } } }
  return dist;
}
['steps', 'stepsMud', 'pick', 'pickMud', 'count'].forEach(function (kind) {
  for (var k = 0; k < N * 3; k++) {
    var q = LAB.makeRouteQ(kind, rng(77 + k * 13 + kind.length)), dist = myDist(q.map, q.s), best = dist[q.t[0] + ',' + q.t[1]];
    check(new Set(q.options.map(String)).size === q.options.length && q.answer >= 0, kind + ': options');
    if (kind === 'steps' || kind === 'stepsMud') {
      check(q.options[q.answer] === best, kind + ': the answer is the cheapest road');
      check(LAB.pathCost(q.map, q.road) === best && q.road.every(function (p, i) { return !i || Math.abs(p[0] - q.road[i - 1][0]) + Math.abs(p[1] - q.road[i - 1][1]) === 1; }), kind + ': the green road is a real cheapest road');
      if (kind === 'stepsMud') check(q.map.join('').indexOf('~') >= 0, 'stepsMud has mud');
    }
    if (kind === 'pick' || kind === 'pickMud') {
      var costs = q.roads.map(function (rd) { check(rd.every(function (p, i) { return q.map[p[1]][p[0]] !== '#' && (!i || Math.abs(p[0] - rd[i - 1][0]) + Math.abs(p[1] - rd[i - 1][1]) === 1); }), kind + ': roads are real'); return LAB.pathCost(q.map, rd); });
      var min = Math.min.apply(null, costs);
      check(costs.filter(function (c) { return c === min; }).length === 1 && costs[q.answer] === min, kind + ': exactly one cheapest road, and it is the answer');
    }
    if (kind === 'count') {
      var W = q.map[0].length, H = q.map.length, ways = {};
      for (var y = H - 1; y >= 0; y--) for (var x = 0; x < W; x++) { var kk = x + ',' + y; if (q.map[y][x] === '#') { ways[kk] = 0; continue; } ways[kk] = x === q.s[0] && y === q.s[1] ? 1 : (ways[(x - 1) + ',' + y] || 0) + (ways[x + ',' + (y + 1)] || 0); }
      check(q.options[q.answer] === ways[q.t[0] + ',' + q.t[1]], 'count: number of roads right and up');
    }
    if (k < 3) { text(q.q, 'question'); text(q.hint, 'hint'); text(q.explain, 'explain'); }
    check(/<svg/.test(LAB.routeSvg(q, 300)), 'map draws');
  }
});

/* ---------- daily: which exit ---------- */
for (var k = 0; k < N * 3; k++) {
  var e = LAB.makeExits(rng(500 + k)), reach = {}, qq = [e.bob]; reach[e.bob] = 1;
  while (qq.length) { var c = qq.shift(); for (var d in D) { var x = c[0] + D[d][0], y = c[1] + D[d][1]; if (at(e.rows, x, y) !== '#' && !reach[x + ',' + y]) { reach[x + ',' + y] = 1; qq.push([x, y]); } } }
  var ok = e.exits.map(function (x) { return !!reach[x[0] + ',' + x[1]]; });
  check(ok.filter(Boolean).length === 1 && ok[e.answer], 'exits: exactly one exit can be reached, and it is the answer');
}
['M', 'U'].forEach(function (b) {
  for (var i = 0; i < 150; i++) {
    var keep = Math.random; Math.random = rng(9 + i); var q1 = game.quickTask(b, {}); Math.random = rng(9 + i); var q2 = game.quickTask(b, {}); Math.random = keep;
    check(JSON.stringify(q1) === JSON.stringify(q2), 'daily task the same for the same day');
    check(q1.options.indexOf(q1.answer) >= 0 && q1.hint && q1.explain, 'daily task answer among options');
  }
});

/* ---------- codes ---------- */
var built = LAB.level('build', ['#######', '#S.a..#', '#####.#', '#G.A..#', '#######']);
check(LAB.solve(built).n > 0, 'a built maze with a key can be solved');
var code = LAB.toCode(built), back = LAB.fromCode(code);
check(back && back.rows.join('') === built.rows.join('') && back.start.join() === built.start.join(), 'maze code round trip');
['', 'L7x5-<script>', 'L7x5-' + 'w'.repeat(35), 'L99x99-o', 'L5x5-SGoooooooooooooooooooooo', 'B5x5-kkkkk'].forEach(function (bad) { check(LAB.fromCode(bad) === null, 'bad code refused: ' + bad.slice(0, 16)); });

/* ---------- Danish spelling ---------- */
(function walk(x) { if (typeof x === 'string') texts.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k]); }); })(S);
var words = {};
texts.forEach(function (s) { (String(s).replace(/­/g, '').replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉé]+/g) || []).forEach(function (w) { words[w] = 1; }); });
var OK = ['Labyrinten', 'Glatis', 'Kassekløveren', 'Envejsgader', 'Kopiér'];
var list = Object.keys(words).filter(function (w) { return OK.indexOf(w) < 0 && w.length > 1; });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));

console.log(fails ? 'Labyrinten: ' + fails + ' of ' + checks + ' checks FAILED' : 'Labyrinten: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
