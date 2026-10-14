// Opfinderværkstedet: an independent re-implementation of the machine rules (written from the rules in the header of
// opfinder/physics.js, without using its code) runs every machine's stored solution and proves it reaches the goal,
// proves the machine does NOT work without the child's parts and that obvious wrong placements fail, tries every way
// to place the toolbox parts (brute force) to count the solutions and to check that the two implementations agree,
// recomputes the gear ratios, lever moments and pulley forces, checks that the same machine always does the same,
// that share codes round-trip and bad codes are refused, that the daily tasks are deterministic and right, and that
// all Danish text is spelled right.
// Run: node tools/test-opfinder.js   (needs hunspell da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../opfinder/strings-da.js');
var P = require('../opfinder/parts.js'), F = require('../opfinder/physics.js'), M = require('../opfinder/machines.js');
var S = window.STR.of, execFileSync = require('child_process').execFileSync, game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, gameData: function () { return {}; }, profile: function () { return null; } };
require('../opfinder/game.js');
var fails = 0, checks = 0, seen = {}, texts = [], t0 = Date.now();
function check(ok, msg) { checks++; if (!ok) { fails++; if (!seen[msg]) { seen[msg] = 1; console.log('FAIL', msg); } } }
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function text(s, where) { check(typeof s === 'string' && s.length > 2 && !/\{\w+\}|undefined|NaN|null/.test(s), 'text ok: ' + where + ': ' + s); texts.push(s); }

/* ================= my own machine (from the rules, not from physics.js) ================= */
var W8 = 8, H6 = 6, LIMIT = 200;
var LEGEND = { '#': ['wall'], o: ['ball'], m: ['weight'], '>': ['push', 1], '<': ['push', -1], R: ['ramp', 1], L: ['ramp', -1], d: ['domino'], S: ['spring', 1], Z: ['spring', -1],
  b: ['bell'], u: ['cup'], f: ['flower'], w: ['can', 1], W: ['can', -1], x: ['button'], D: ['door'], F: ['friend'], '-': ['arm'], '^': ['pivot'], g: ['gear'], c: ['crank'], v: ['dial'],
  h: ['winch'], e: ['wbucket'], O: ['wheel'], '|': ['rope'], s: ['slot'], k: ['basket'], M: ['motor'], B: ['load'] };
var GOALKINDS = ['bell', 'cup', 'flower', 'door', 'friend', 'load', 'wbucket'];
var GEARS = ['gear', 'crank', 'dial', 'winch'];
// a level (+ placements) as a flat list of things: { type, x, y, dir, ...props }
function things(lv, placed) {
  var out = [];
  lv.map.forEach(function (row, y) {
    for (var x = 0; x < W8; x++) {
      var ch = row[x]; if (!ch || ch === '.') continue;
      var lg = LEGEND[ch], o = { type: lg[0], x: x, y: y };
      if (lg[1]) o.dir = lg[1];
      var extra = (lv.at || {})[x + ',' + y] || {};
      Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
      if (o.k !== undefined) delete o.k;
      out.push(o);
    }
  });
  (placed || []).forEach(function (pl) {
    var b = lv.box[pl.i], host = out.filter(function (o) { return o.x === pl.c && o.y === pl.r; })[0];
    if (host && b.k === 'gear' && GEARS.indexOf(host.type) >= 0 && !host.z) { host.z = b.z; return; }
    if (host && b.k === 'block' && host.type === 'slot') { host.type = 'block'; host.n = b.n; return; }
    var o = { type: b.k, x: pl.c, y: pl.r };
    ['z', 'm', 'n', 'T'].forEach(function (k) { if (b[k] !== undefined) o[k] = b[k]; });
    if (b.k === 'ramp' || b.k === 'spring') o.dir = pl.d === -1 ? -1 : 1;
    out.push(o);
  });
  out.forEach(function (o) {
    if (o.goal === undefined) o.goal = GOALKINDS.indexOf(o.type) >= 0 || (o.type === 'dial' && o.need !== undefined) || (o.type === 'pivot' && !!(o.balance || o.want));
    if (o.type === 'ball' && !o.m) o.m = 1;
    if (GEARS.indexOf(o.type) >= 0 && o.type === 'gear' && !o.z) o.z = 20;
    if (o.type === 'crank' && o.T === undefined) o.T = 1;
  });
  return out;
}
function simulate(list) {
  var grid = {}, movers = [], queue = [], time = 0, levers = [], rigs = [];
  function key(x, y) { return x + ',' + y; }
  function within(x, y) { return x >= 0 && x < W8 && y >= 0 && y < H6; }
  list.forEach(function (o) {
    var c = JSON.parse(JSON.stringify(o));
    if (c.type === 'ball' || c.type === 'weight') movers.push({ kind: c.type, x: c.x, y: c.y, m: c.m, vx: 0, falling: false, done: false, hop: null, held: -1, rest: false });
    else grid[key(c.x, c.y)] = c;
  });
  function cellAt(x, y) { return within(x, y) ? grid[key(x, y)] || null : null; }
  function moverAt(x, y) { for (var i = 0; i < movers.length; i++) if (!movers[i].done && movers[i].x === x && movers[i].y === y) return movers[i]; return null; }
  function open(c) { return !c || c.type === 'rope' || c.type === 'slot' || (c.type === 'domino' && c.fallen); }
  function free(x, y) { return within(x, y) && open(cellAt(x, y)) && !moverAt(x, y); }
  function soon(dt, f) { queue.push([time + dt, f]); }
  var named = {}, linked = {};
  list.forEach(function (o) { if (o.name) named[o.name] = grid[key(o.x, o.y)]; });
  list.forEach(function (o) { if (o.type === 'button' && o.link && named[o.link]) linked[o.link] = true; });
  // levers
  list.forEach(function (o) {
    if (o.type !== 'pivot') return;
    var L = { x: o.x, y: o.y, l: 0, r: 0, side: o.start || 0, p: grid[key(o.x, o.y)] };
    while ((cellAt(o.x - L.l - 1, o.y) || {}).type === 'arm') L.l++;
    while ((cellAt(o.x + L.r + 1, o.y) || {}).type === 'arm') L.r++;
    levers.push(L);
  });
  // hoists
  list.forEach(function (o) {
    if (o.type !== 'wheel' || (cellAt(o.x + 1, o.y) || {}).type !== 'wheel') return;
    var R = { top: o.y, slot: null, load: null, pull: null, state: 0, mass: 0, rise: 0, done: false };
    [o.x, o.x + 1].forEach(function (x) {
      for (var y = o.y + 1; y < H6; y++) {
        var c = cellAt(x, y); if (!c) break;
        if (c.type === 'load') { R.load = c; R.lx = x; R.ly = y; break; }
        if (c.type === 'basket' || c.type === 'motor') { R.pull = c; R.px = x; R.py = y; c.rig = R; break; }
        if (c.type === 'slot' || c.type === 'block') R.slot = c; else if (c.type !== 'rope') break;
      }
    });
    if (R.load && R.pull) { R.n = R.slot && R.slot.type === 'block' ? R.slot.n : 1; R.max = R.ly - R.top - 1 - (R.slot ? 1 : 0); R.load.rig = R; rigs.push(R); }
  });
  // winches: the bucket hangs straight below
  list.forEach(function (o) {
    if (o.type !== 'winch') return;
    var w = grid[key(o.x, o.y)];
    for (var y = o.y + 1; y < H6; y++) { var c = cellAt(o.x, y); if (!c) break; if (c.type === 'wbucket') { w.bucket = c; c.max = y - o.y - 1; c.rise = 0; break; } if (c.type !== 'rope') break; }
  });
  function poke(x, y, dir) {
    if (!within(x, y)) return;
    var mv = moverAt(x, y);
    if (mv) { if (mv.kind === 'ball' && dir) { mv.vx = dir; mv.held = time; mv.hop = null; mv.rest = false; } return; }
    var c = cellAt(x, y); if (!c) return;
    if (c.type === 'domino' && dir && !c.knocked) { c.knocked = true; soon(1, function () { c.fallen = true; poke(x + dir, y, dir); }); }
    else if (c.type === 'bell' && !c.rang) { c.rang = true; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var f = cellAt(x + d[0], y + d[1]); if (f && f.type === 'friend') f.awake = true; }); }
    else if (c.type === 'button' && !c.down) {
      c.down = true; var tgt = c.link ? named[c.link] : null;
      if (tgt && tgt.type === 'door') tgt.open = true; else if (tgt && tgt.type === 'crank') turnCrank(tgt); else if (tgt && tgt.type === 'motor') runMotor(tgt);
    } else if (c.type === 'can' && !c.tipped) {
      c.tipped = true;
      soon(1, function () {
        var sx = x + c.dir; if (!within(sx, y)) return;
        var yy = y; while (within(sx, yy) && open(cellAt(sx, yy))) yy++;
        var hitc = cellAt(sx, yy); if (hitc && hitc.type === 'flower') hitc.wet = true;
      });
    }
  }
  function turnCrank(cr) {
    if (cr.started) return; cr.started = true;
    if (!cr.z) return;
    var spin = new Map(), stack = [cr], bad = false;
    spin.set(cr, [cr.T, 1]);
    while (stack.length && !bad) {
      var g = stack.pop(), sg = spin.get(g);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nb = cellAt(g.x + d[0], g.y + d[1]); if (!nb || GEARS.indexOf(nb.type) < 0 || !nb.z) return;
        var want = [sg[0] * g.z / nb.z, -sg[1]];
        if (spin.has(nb)) { var hv = spin.get(nb); if (Math.abs(hv[0] - want[0]) > 1e-9 || hv[1] !== want[1]) bad = true; return; }
        spin.set(nb, want); stack.push(nb);
      });
    }
    if (bad) return;
    soon(4, function () {
      spin.forEach(function (v, g) {
        if (g.type === 'dial') { g.turns = v[0]; g.way = v[1]; }
        if (g.type === 'winch' && g.bucket) { var bk = g.bucket; if (v[1] < 0) bk.rise = 0; else if (v[0] > bk.max + 1e-9) { bk.rise = bk.max; bk.crash = true; } else bk.rise = v[0]; }
      });
    });
  }
  function runMotor(mo) {
    var R = mo.rig; if (!R || R.state) return;
    if (R.load.m / R.n > mo.F + 1e-9) { R.state = 3; return; }
    R.state = 1; R.rise = Math.min(R.load.need, mo.R / R.n, R.max);
    soon(4, function () { R.done = true; });
  }
  function intoBasket(c, mv) {
    var R = c.rig; if (!R) return;
    R.mass += mv.m; if (R.state) return;
    if (R.mass * R.n > R.load.m + 1e-9) {
      var D = 0; while (free(R.px, R.py + D + 1)) D++;
      if (!D) return;
      R.state = 1; R.rise = Math.min(D / R.n, R.max); soon(D, function () { R.done = true; });
    }
  }
  function arrived(mv, how) {
    var c = cellAt(mv.x, mv.y);
    if (c && (c.type === 'cup' || c.type === 'basket')) { mv.done = true; mv.falling = false; mv.vx = 0; mv.hop = null; if (c.type === 'cup') c.got = true; else intoBasket(c, mv); return; }
    if (c && c.type === 'ramp') { mv.rest = false; return; }
    var under = cellAt(mv.x, mv.y + 1);
    if (under && under.type === 'button' && how === 'roll') poke(mv.x, mv.y + 1, 0);
    if (mv.kind === 'ball' && under && under.type === 'spring') { mv.hop = { dir: under.dir, n: 0 }; mv.falling = false; }
  }
  function sideways(mv, dir) {
    var nx = mv.x + dir;
    if (!within(nx, mv.y)) { mv.vx = 0; return; }
    var o = moverAt(nx, mv.y);
    if (o) { if (o.kind === 'ball') { o.vx = dir; o.held = time; o.hop = null; o.rest = false; } mv.vx = 0; return; }
    var c = cellAt(nx, mv.y);
    if (open(c)) { mv.x = nx; arrived(mv, 'roll'); return; }
    poke(nx, mv.y, dir); mv.vx = 0;
  }
  function step(mv) {
    if (mv.done || mv.held === time) return;
    if (mv.hop) {
      var nx = mv.x + mv.hop.dir, ny = mv.y - 1;
      if (free(nx, ny)) {
        mv.x = nx; mv.y = ny; mv.hop.n++;
        if (mv.hop.n >= 2) { var d0 = mv.hop.dir; mv.hop = null; mv.vx = d0; mv.falling = true; var sp = cellAt(mv.x, mv.y + 1); if (sp && sp.type === 'spring') { mv.hop = { dir: sp.dir, n: 0 }; mv.falling = false; } }
      } else { var hd = mv.hop.dir; mv.hop = null; mv.vx = 0; mv.falling = true; poke(nx, ny, hd); }
      return;
    }
    var here = cellAt(mv.x, mv.y);
    if (here && here.type === 'ramp') { if (mv.rest) return; mv.vx = here.dir; mv.falling = false; sideways(mv, here.dir); if (!mv.vx) mv.rest = true; return; }
    var below = cellAt(mv.x, mv.y + 1);
    var canFall = within(mv.x, mv.y + 1) && !moverAt(mv.x, mv.y + 1) && (open(below) || below.type === 'basket' || (mv.kind === 'ball' && (below.type === 'cup' || below.type === 'ramp')));
    if (canFall) { mv.y++; mv.falling = true; arrived(mv, 'fall'); return; }
    if (mv.falling) { mv.falling = false; if (below) poke(mv.x, mv.y + 1, 0); return; }
    if (mv.kind === 'ball' && mv.vx) sideways(mv, mv.vx);
  }
  function weightOn(x, y) { var s = 0, mv; while ((mv = moverAt(x, y))) { s += mv.m; y--; } return s; }
  function pulls(L) { var a = 0, b = 0, i; for (i = 1; i <= L.l; i++) a += weightOn(L.x - i, L.y - 1) * i; for (i = 1; i <= L.r; i++) b += weightOn(L.x + i, L.y - 1) * i; return [a, b]; }
  function levers1() {
    levers.forEach(function (L) {
      var m = pulls(L); if (Math.abs(m[0] - m[1]) < 1e-9) return;
      var s = m[1] > m[0] ? 1 : -1; if (s === L.side) return;
      L.side = s;
      for (var x = L.x - L.l; x <= L.x + L.r; x++) { var o = moverAt(x, L.y - 1); if (o) { o.vx = 0; o.hop = null; } }
      var upX = s > 0 ? L.x - L.l : L.x + L.r, dnX = s > 0 ? L.x + L.r : L.x - L.l, top = moverAt(upX, L.y - 1);
      if (top && top.kind === 'ball') { top.hop = { dir: s, n: 0 }; top.held = time; } else poke(upX, L.y - 1, s);
      poke(dnX, L.y + 1, s);
    });
  }
  function snapshot() { return JSON.stringify([movers, queue.length, levers.map(function (L) { return L.side; }), Object.keys(grid).map(function (k) { var c = grid[k]; return [c.knocked, c.fallen, c.rang, c.down, c.open, c.tipped, c.wet, c.got, c.awake, c.started]; }), rigs.map(function (R) { return [R.state, R.mass, R.done]; })]); }
  var loop = true;
  for (time = 1; time <= LIMIT; time++) {
    var before = snapshot();
    if (time === 1) {
      list.forEach(function (o) { if (o.type === 'push') poke(o.x + o.dir, o.y, o.dir); });
      list.forEach(function (o) { if (o.type === 'crank' && !linked[o.name]) turnCrank(grid[key(o.x, o.y)]); });
      rigs.forEach(function (R) { if (R.pull.type === 'motor' && !linked[R.pull.name]) runMotor(R.pull); });
    }
    var due = queue.filter(function (q) { return q[0] === time; }); queue = queue.filter(function (q) { return q[0] !== time; });
    due.forEach(function (q) { q[1](); });
    movers.forEach(step);
    levers1();
    var after = snapshot().replace(/"held":-?\d+/g, '');
    if (after === before.replace(/"held":-?\d+/g, '') && !queue.length) { loop = false; break; }
  }
  // the goals
  var goals = [];
  Object.keys(grid).forEach(function (k) {
    var c = grid[k]; if (!c.goal) return;
    var ok = false;
    if (c.type === 'bell') ok = !!c.rang; else if (c.type === 'cup') ok = !!c.got; else if (c.type === 'flower') ok = !!c.wet; else if (c.type === 'door') ok = !!c.open; else if (c.type === 'friend') ok = !!c.awake;
    else if (c.type === 'dial') ok = c.turns !== undefined && Math.abs(c.turns - c.need) < 1e-9 && (!c.want || c.way === c.want);
    else if (c.type === 'wbucket') ok = !c.crash && Math.abs((c.rise || 0) - c.need) < 1e-9;
    else if (c.type === 'load') ok = !!(c.rig && c.rig.done && c.rig.rise >= c.need - 1e-9);
    else if (c.type === 'pivot') { var L = levers.filter(function (x) { return x.p === c; })[0]; if (c.want) ok = L.side === c.want; else { var m = pulls(L); ok = L.side === 0 && Math.abs(m[0] - m[1]) < 1e-9 && m[0] > 0; } }
    goals.push(ok);
  });
  return { ok: !loop && goals.length > 0 && goals.every(Boolean), loop: loop, goals: goals };
}
function mine(lv, placed) { return simulate(things(lv, placed)).ok; }
function theirs(lv, placed) { return F.run(P.machine(lv, placed)).ok; }

/* ================= the machines ================= */
var report = [], agreeAll = 0, triedAll = 0;
check(M.worlds.length === 6 && M.worlds.filter(function (w) { return w.b === 'M'; }).length === 3, 'six worlds, three per band');
M.worlds.forEach(function (w) {
  check(S.worlds[w.id] && S.cards[w.id] && w.levels.length === 6, w.id + ': name, card and 6 machines');
  var counts = [];
  w.levels.forEach(function (lv, li) {
    var tag = w.id + ' ' + (li + 1);
    lv.id = lv.id || w.id + ':' + (li + 1);
    check(lv.map.length === 6 && lv.map.every(function (r) { return r.length === 8 && /^[.#om<>RLdSZbufwWxDF\-^gcvheO|skMB]+$/.test(r); }), tag + ': the map is 8 × 6 with known parts');
    check(lv.box.length >= 1 && lv.box.length <= 4, tag + ': 1–4 parts in the toolbox');
    text(lv.goal, tag + ' goal'); text(lv.why, tag + ' why');
    check(lv.why.split(/[.!?](\s|$)/).filter(function (s) { return s && s.trim().length > 2; }).length <= 3, tag + ': »Hvorfor?« is short (1–3 sentences)');
    // the stored solution: valid placements, and it works in both implementations
    var ok = true, pl = [];
    lv.sol.forEach(function (so) { if (P.canPlace(lv, pl, lv.box[so.i], so.c, so.r) !== '') ok = false; pl.push(so); });
    check(ok, tag + ': the solution places every part on an allowed cell');
    check(mine(lv, lv.sol), tag + ': the solution works (my rules)');
    check(theirs(lv, lv.sol), tag + ': the solution works (physics.js)');
    // not solved without the child's parts
    check(!mine(lv, []) && !theirs(lv, []), tag + ': the machine does not work without the child\'s parts');
    // every part of the solution is needed
    lv.sol.forEach(function (so, k) { var less = lv.sol.filter(function (x, j) { return j !== k; }); check(!mine(lv, less), tag + ': part ' + k + ' of the solution is needed'); });
    // obvious wrong placements: every part moved to the free cell farthest away from where it should be
    var wrong = [];
    lv.sol.forEach(function (so) {
      var best = null, bd = -1;
      for (var r = 0; r < 6; r++) for (var c = 0; c < 8; c++) {
        if (lv.sol.some(function (x) { return x.c === c && x.r === r; }) || P.canPlace(lv, wrong, lv.box[so.i], c, r) !== '') continue;
        var dist = Math.abs(c - so.c) + Math.abs(r - so.r); if (dist > bd) { bd = dist; best = { i: so.i, c: c, r: r, d: so.d }; }
      }
      if (best) wrong.push(best);
    });
    if (wrong.length) check(!mine(lv, wrong) && !theirs(lv, wrong), tag + ': parts placed far from the right cells do not work');
    lv.sol.forEach(function (so, k) {
      if (!P.KINDS[lv.box[so.i].k].turn) return;
      var flipped = lv.sol.map(function (x, j) { return j === k ? { i: x.i, c: x.c, r: x.r, d: -(x.d || 1) } : x; });
      check(!mine(lv, flipped), tag + ': part ' + k + ' turned the wrong way does not work');
    });
    // same machine, same result
    var a = F.run(P.machine(lv, lv.sol), { trace: true }), b = F.run(P.machine(lv, lv.sol), { trace: true });
    check(JSON.stringify(a.snaps) === JSON.stringify(b.snaps) && JSON.stringify(a.events) === JSON.stringify(b.events) && a.ticks === b.ticks, tag + ': the same machine always runs the same');
    // the story line for the solution run
    a.events.forEach(function (ev, k) { if (!ev.length) return; var s = game._storyOf(ev, a.W, w.b === 'U'); if (s) text(s, tag + ' story ' + k); });
    var empty = F.run(P.machine(lv, []), { trace: true });
    text(game._failText(empty, w.b === 'U'), tag + ' fail text');
    lv.sol.forEach(function (so) { text(game._solStepText(lv, so), tag + ' solution step'); });
    // brute force: every part unused or on any allowed cell (turnable parts both ways)
    var opts = lv.box.map(function (bx) { var o = [null]; for (var r = 0; r < 6; r++) for (var c = 0; c < 8; c++) if (P.canPlace(lv, [], bx, c, r) === '') { o.push([c, r, 1]); if (P.KINDS[bx.k].turn) o.push([c, r, -1]); } return o; });
    var cur = [], sols = 0, tried = 0, agree = 0, dedupe = {}, minimal = 0;
    (function rec(i) {
      if (i === lv.box.length) {
        var plc = [], cells = {};
        for (var k = 0; k < cur.length; k++) if (cur[k]) { var kk = cur[k][0] + ',' + cur[k][1]; if (cells[kk]) return; cells[kk] = 1; plc.push({ i: k, c: cur[k][0], r: cur[k][1], d: cur[k][2] }); }
        var sig = plc.map(function (q) { var bx = lv.box[q.i]; return [bx.k, bx.z, bx.m, bx.n, bx.T, q.c, q.r, P.KINDS[bx.k].turn ? q.d : 0].join(); }).sort().join('|');
        if (dedupe[sig]) return; dedupe[sig] = 1;
        tried++;
        var m1 = mine(lv, plc), m2 = theirs(lv, plc);
        if (m1 === m2) agree++;
        if (m1) { sols++; if (plc.every(function (q, j) { return !mine(lv, plc.filter(function (x, jj) { return jj !== j; })); })) minimal++; }
        return;
      }
      opts[i].forEach(function (o) { cur[i] = o; rec(i + 1); });
    })(0);
    check(sols >= 1, tag + ': at least one solution (' + sols + ')');
    check(agree === tried, tag + ': my rules and physics.js agree on all ' + tried + ' placements (' + agree + ')');
    agreeAll += agree; triedAll += tried;
    counts.push(sols + '/' + minimal + '/' + tried);
  });
  report.push(w.id + ' [' + counts.join(', ') + ']');
});
console.log('Solutions per machine (working / minimal working / placements tried):\n  ' + report.join('\n  '));
console.log('The two implementations agree on ' + agreeAll + ' of ' + triedAll + ' placements.');

/* ---------- the numbers: gears, levers and pulleys recomputed ---------- */
M.worlds.forEach(function (w) {
  w.levels.forEach(function (lv, li) {
    var tag = w.id + ' ' + (li + 1), list = P.machine(lv, lv.sol), res = F.run(list), W = res.W;
    // gears: every dial and winch turns crank turns · crank teeth / own teeth (simple trains), direction by the checkerboard
    W.cranks.forEach(function (cr) {
      if (!cr.z) return;
      W.parts.forEach(function (g) {
        if ((g.k !== 'dial' && g.k !== 'winch') || !g.train || g.train !== cr.train) return;
        var expect = cr.T * cr.z / g.z, dir = ((Math.abs(g.c - cr.c) + Math.abs(g.r - cr.r)) % 2) ? -1 : 1;
        check(Math.abs(g.turns - expect) < 1e-9 && g.dir === dir, tag + ': ' + g.k + ' turns ' + cr.T + ' · ' + cr.z + ' : ' + g.z + ' = ' + expect + ' (' + (dir > 0 ? 'cw' : 'ccw') + ')');
        if (g.k === 'dial' && g.need !== undefined) check(Math.abs(expect - g.need) < 1e-9, tag + ': the dial goal ' + g.need + ' = the gear ratio');
        if (g.k === 'winch' && g.bucket) check(Math.abs(expect - g.bucket.need) < 1e-9, tag + ': the winch goal ' + g.bucket.need + ' = the gear ratio');
      });
    });
    // levers: weight · arm on both sides, counted by hand from the parts
    W.levers.forEach(function (L) {
      var l = 0, r = 0;
      res.W.actors.forEach(function (a) { if (a.done || a.r >= L.pr) return; var col = a.c - L.pc, under = true; for (var y = a.r + 1; y < L.pr; y++) if (!res.W.actors.some(function (b) { return !b.done && b.c === a.c && b.r === y; })) under = false; if (!under) return; if (col < 0 && -col <= L.left) l += a.m * -col; if (col > 0 && col <= L.right) r += a.m * col; });
      check(Math.abs(l - L.endL) < 1e-9 && Math.abs(r - L.endR) < 1e-9, tag + ': lever moments by hand ' + l + ' / ' + r + ' = ' + L.endL + ' / ' + L.endR);
      if (L.pivot.balance) check(l === r && l > 0 && L.state === 0, tag + ': the lever balances (' + l + ' = ' + r + ')');
      if (L.pivot.want) check(L.state === L.pivot.want && (L.pivot.want > 0 ? r > l : l > r), tag + ': the lever tips the right way');
    });
    // pulleys: pull = load / n must be at most the motor's force, rope = n · height at most the motor's rope; other blocks fail
    W.rigs.forEach(function (rig) {
      if (rig.pull.k !== 'motor') { check(rig.mass * rig.n > rig.load.m, tag + ': the basket outweighs the load'); return; }
      var n = rig.n, L0 = rig.load.m, need = rig.load.need, Fm = rig.pull.F, Rm = rig.pull.R;
      check(L0 / n <= Fm + 1e-9 && n * need <= Rm + 1e-9, tag + ': ' + L0 + ' kg : ' + n + ' = ' + L0 / n + ' kg ≤ ' + Fm + ' kg, and ' + n + ' · ' + need + ' m ≤ ' + Rm + ' m');
      lv.box.forEach(function (bx, bi) {
        if (bx.k !== 'block' || bx.n === n) return;
        var other = lv.sol.map(function (so) { return lv.box[so.i].k === 'block' ? { i: bi, c: so.c, r: so.r } : so; });
        var works = L0 / bx.n <= Fm + 1e-9 && bx.n * need <= Rm + 1e-9;
        check(!works && !mine(lv, other) && !theirs(lv, other), tag + ': the block with ' + bx.n + ' rope parts does not do it');
      });
    });
  });
});

/* ---------- stars and progress ---------- */
check(game._starsFor(false, false) === 3 && game._starsFor(true, false) === 2 && game._starsFor(true, true) === 1 && game._starsFor(false, true) === 1, 'stars: 3 clean, 2 with a tip, 1 with the solution');
var dd = { w: { vaerksted: { best: [3, 3, 3, 2, 2, 1], plays: 7 }, haven: { best: [3, 3, 0, 0, 0, 0], plays: 2 }, havnekran: { best: [3, 3, 3, 3, 3, 3], plays: 6 } }, cards: { vaerksted: 1, havnekran: 1 }, band: 'M' };
var pr = game.progress(dd);
check(pr.plays === 15 && JSON.stringify(pr.bands) === JSON.stringify({ M: [2, 1, 0], U: [0, 3, 0] }), 'progress: world stars are the floored average (' + JSON.stringify(pr) + ')');
check(JSON.stringify(game.summary(dd)) === JSON.stringify({ stars: 3, max: 9 }), 'summary for the band');
check(JSON.stringify(game.collection(dd)) === JSON.stringify({ n: 2, max: 6 }), 'collection counts the cards');
var rep = game.parentReport(dd);
check(rep.head.length === 3 && rep.rows.length === 3 && rep.rows[0][1] === '2/3' && rep.rows[0][2] === '6/6', 'parent report');
check(JSON.stringify(game.progress({})) === JSON.stringify({ plays: 0, bands: { M: [0, 0, 0], U: [0, 0, 0] } }), 'progress for a new player');

/* ---------- share codes ---------- */
var SB = F.sandbox, R3 = rng(2024), made = 0, worked = 0;
for (var k2 = 0; k2 < 3000 && made < 300; k2++) {
  var n2 = 2 + Math.floor(R3() * 12), list = [], cellsUsed = {};
  for (var j = 0; j < n2; j++) { var e = P.SANDBOX[Math.floor(R3() * P.SANDBOX.length)], c2 = Math.floor(R3() * 8), r2 = Math.floor(R3() * 6); if (cellsUsed[c2 + ',' + r2]) continue; cellsUsed[c2 + ',' + r2] = 1; var q2 = { k: e.k, c: c2, r: r2 }; if (e.d) q2.d = e.d; list.push(q2); }
  if (!SB.valid(list)) continue;
  made++;
  var code = SB.toCode(list), back = SB.fromCode(code);
  check(/^O1-([A-Z][0-7][0-5]){1,24}$/.test(code) && code.length <= 3 + 3 * P.SB_MAX, 'code format: ' + code);
  var sortL = function (l) { return JSON.stringify(l.slice().sort(function (a, b) { return a.r - b.r || a.c - b.c; })); };
  check(back && sortL(back) === sortL(list), 'share code round trip: ' + code);
  check(SB.fromCode(code.toLowerCase().replace('o1-', 'O1-')) !== null && SB.fromCode(' ' + code.slice(0, 5) + ' ' + code.slice(5) + ' ') !== null, 'codes are read without caring about case and spaces');
  var chk = SB.check(list), mineOk = list.some(function (q) { return P.SB_GOALS.indexOf(q.k) >= 0; }) && simulate(SB.machine(list).map(function (p) { var o = { type: p.k, x: p.c, y: p.r }; if (p.d) o.dir = p.d; if (p.m) o.m = p.m; if (p.goal) o.goal = true; return o; })).ok;
  check(chk.ok === mineOk, 'sandbox machine: my rules agree (' + code + ')');
  if (chk.ok) worked++;
}
check(made >= 200, 'enough random sandbox machines (' + made + ')');
var demo = SB.fromCode('O1-P00B10W01W11W21R33K45');
check(demo && SB.check(demo).ok, 'the example machine works');
['', null, undefined, 'O1-', 'O2-B10', 'O1-B1', 'O1-B10K', 'O1-X00', 'O1-B80', 'O1-B16', 'O1-B10B10', 'O1-b10x', 'O1-B10 K4', '<script>alert(1)</script>', 'O1-' + 'B00'.repeat(25), 'BOB1:abc', 'O1-B10K45<img>', 'O1-B10;K45', 'O1-1B0'].forEach(function (bad) {
  check(SB.fromCode(bad) === null, 'bad code refused: ' + String(bad).slice(0, 24));
});
check(!SB.check(SB.fromCode('O1-P00B10')).ok && SB.check(SB.fromCode('O1-P00B10')).why === 'goal', 'a machine without a goal is refused');
check(!SB.check(SB.fromCode('O1-B00K75')).ok, 'a machine that does not reach its goal is refused');

/* ---------- the daily challenge ---------- */
function tryTask(kind, seed) { var keep = Math.random; Math.random = rng(seed); var q = game._makeTask(kind); Math.random = keep; return q; }
['M', 'U'].forEach(function (b) {
  var kinds = {};
  for (var i = 0; i < 300; i++) {
    var keep = Math.random; Math.random = rng(9 + i); var q1 = game.quickTask(b, {}); Math.random = rng(9 + i); var q2 = game.quickTask(b, {}); Math.random = keep;
    check(JSON.stringify(q1) === JSON.stringify(q2), 'daily task the same for the same seed');
    check(JSON.stringify(JSON.parse(JSON.stringify(q1))) === JSON.stringify(q1), 'daily task is plain data');
    check(Array.isArray(q1.options) && q1.options.length >= 2 && q1.options.length <= 4 && q1.options.indexOf(q1.answer) >= 0 && new Set(q1.options).size === q1.options.length && q1.hint && q1.explain, 'daily task: unique options with the answer');
    if (q1.html) check(/^<div class="of-daily"><svg[\s\S]*<\/svg><\/div>$/.test(q1.html) && !/<script|on\w+=/i.test(q1.html), 'daily picture is a plain svg');
    kinds[q1.q.slice(0, 18)] = 1;
    if (i < 60) { text(q1.q, 'daily q'); text(q1.hint, 'daily hint'); text(q1.explain, 'daily explain'); q1.options.forEach(function (x) { texts.push(x); }); }
  }
  check(Object.keys(kinds).length >= 4, 'several kinds of daily tasks for ' + b + ' (' + Object.keys(kinds).length + ')');
  // weakest worlds first
  var dw = { w: {} }; M.worlds.forEach(function (w) { dw.w[w.id] = { best: [3, 3, 3, 3, 3, 3], plays: 6 }; });
  var weak = M.worlds.filter(function (w) { return w.b === b; })[1]; dw.w[weak.id] = { best: [0, 0, 0, 0, 0, 0], plays: 0 };
  var QS = { ramp: 'qRamp', chain: 'qChain', leverM: 'qLeverM', pulleyM: 'qPulleyM', gearDir: 'qGearDir', gearTurns: 'qGearTurns', moment: 'qMoment', balance: 'qBalance', pulleyForce: 'qPulleyForce', pulleyRope: 'qPulleyRope' };
  var prefixes = game.QKINDS[weak.id].map(function (k) { return S[QS[k]].split('{')[0]; });
  var hits = 0;
  for (var s2 = 0; s2 < 50; s2++) { var keep2 = Math.random; Math.random = rng(500 + s2); var qa = game.quickTask(b, dw); Math.random = keep2; if (prefixes.some(function (pf) { return qa.q.indexOf(pf) === 0; })) hits++; }
  check(hits === 50, 'the daily task leans towards the weakest world (' + weak.id + ': ' + hits + '/50)');
});
// every generator, answers recomputed from the question
for (var s3 = 0; s3 < 400; s3++) {
  var q, mm;
  q = tryTask('gearTurns', s3); mm = /har (\d+) tænder.*med (\d+) tænder/.exec(q.q);
  check(mm && q.answer === String(+mm[1] / +mm[2]) && Number.isInteger(+mm[1] / +mm[2]), 'gear turns: ' + q.q + ' → ' + q.answer);
  q = tryTask('gearDir', s3); mm = /Der er (\d+) tandhjul/.exec(q.explain);
  check(mm && q.answer === (+mm[1] % 2 ? 'Med uret' : 'Mod uret') && (q.html.match(/<polygon/g) || []).length === +mm[1], 'gear direction: ' + mm[1] + ' gears → ' + q.answer);
  q = tryTask('moment', s3); mm = /ligger (\d+) kg (\d+) m til venstre og (\d+) kg (\d+) m til højre/.exec(q.q);
  var L1 = mm[1] * mm[2], R1 = mm[3] * mm[4];
  check(q.answer === S.qMomentOpts[L1 > R1 ? 0 : L1 < R1 ? 1 : 2], 'moments: ' + q.q + ' → ' + q.answer);
  q = tryTask('balance', s3); mm = /ligger (\d+) kg (\d+) m fra midten.*ligge (\d+) m til højre/.exec(q.q);
  check(mm && q.answer === (mm[1] * mm[2] / mm[3]) + ' kg' && Number.isInteger(mm[1] * mm[2] / mm[3]), 'balance: ' + q.q + ' → ' + q.answer);
  q = tryTask('pulleyForce', s3); mm = /vejer (\d+) kg.*med (\d+) bærende/.exec(q.q);
  check(mm && q.answer === (mm[1] / mm[2]) + ' kg' && Number.isInteger(mm[1] / mm[2]), 'pulley force: ' + q.q + ' → ' + q.answer);
  q = tryTask('pulleyRope', s3); mm = /har (\d+) bærende.*skal (\d+) m op/.exec(q.q);
  check(mm && q.answer === (mm[1] * mm[2]) + ' m', 'pulley rope: ' + q.q + ' → ' + q.answer);
  q = tryTask('ramp', s3);
  check(q.answer === (/points="6,8 94,92 6,92"/.test(q.html) && !/scale\(-1,1\)/.test(q.html) ? 'Mod højre' : 'Mod venstre'), 'ramp: the ball rolls down the slope');
}

/* ---------- the facts on the cards ---------- */
Object.keys(S.cards).forEach(function (k) { var c = S.cards[k]; check(/^https:\/\/(lex\.dk|www\.britannica\.com|www\.math\.nyu\.edu|ing\.dk)\//.test(c.url), 'card ' + k + ' has a source from a reliable site: ' + c.url); });
check(/1870/.test(S.cards.vaerksted.fact) && /1820/.test(S.cards.havnekran.fact) && /1915/.test(S.cards.mester.fact) && /1901/.test(S.cards.urmager.fact), 'the years on the cards');

/* ---------- Danish spelling ---------- */
(function walk(x) { if (typeof x === 'string') texts.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k]); }); })(S);
M.worlds.forEach(function (w) { w.levels.forEach(function (lv) { texts.push(lv.goal, lv.why); }); });
var words = {};
texts.forEach(function (s) { (String(s).replace(/https?:\/\/\S+/g, ' ').replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉé]+/g) || []).forEach(function (wd) { words[wd] = 1; }); });
var OK = ['ca', 'Napa']; // ca. (also allowed in tools/spellcheck.js) and the place name Napa (Valley)
var list2 = Object.keys(words).filter(function (wd) { return OK.indexOf(wd) < 0 && wd.length > 1; });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list2.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));
console.log('(' + Math.round((Date.now() - t0) / 1000) + ' s)');
console.log(fails ? 'Opfinder: ' + fails + ' of ' + checks + ' checks FAILED' : 'Opfinder: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
