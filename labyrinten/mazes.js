/*
 * Labyrinten: the mazes and their solvers. Everything is drawn on a grid of tiles:
 *   '#' wall · '.' floor · 'S' start · 'G' exit · 'a' 'b' 'c' keys (red, blue, yellow) · 'A' 'B' 'C' their doors
 *   '>' '<' '^' 'v' one-way squares (Bob may only cross them in the arrow's direction)
 *   '$' crate · 'x' mark for a crate · '*' crate already on a mark
 * In »Glatis« every floor square is ice: Bob slides until he hits a wall or reaches the exit.
 * A breadth-first search proves every maze can be finished and gives the fewest moves, the tips and the solution.
 */
(function (root) {
  'use strict';
  var DIRS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }, ORDER = ['up', 'right', 'down', 'left'];
  var ARROW = { '^': 'up', '>': 'right', 'v': 'down', '<': 'left' };
  function S() { return ((root.STR || {}).lb) || {}; }
  function T(str, o) { return String(str || '').replace(/\{(\w+)\}/g, function (m, k) { return o[k] !== undefined ? o[k] : m; }); }
  function shuffle(R, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function int(R, a, b) { return a + Math.floor(R() * (b - a + 1)); }

  /* ---------- levels and tiles ---------- */
  function level(kind, rows) {
    var lv = { kind: kind, w: rows[0].length, h: rows.length, rows: rows.map(function (r) { return r.replace(/S/g, '.').replace(/[$*]/g, function (c) { return c === '*' ? 'x' : '.'; }); }) };
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { if (r[x] === 'S') lv.start = [x, y]; if (r[x] === 'G') lv.goal = [x, y]; } });
    var crates = [];
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === '$' || r[x] === '*') crates.push(y * lv.w + x); });
    lv.crates = crates;
    return lv;
  }
  function tile(lv, x, y) { return x < 0 || y < 0 || x >= lv.w || y >= lv.h ? '#' : lv.rows[y][x]; }
  function start(lv) { var s = { x: lv.start[0], y: lv.start[1] }; if (lv.kind === 'keys' || lv.kind === 'build') s.keys = ''; if (lv.kind === 'crates') s.c = lv.crates.slice().sort(function (a, b) { return a - b; }); return s; }
  function key(lv, s) { return s.x + ',' + s.y + (s.keys !== undefined ? '|' + s.keys : '') + (s.c ? '|' + s.c.join(',') : ''); }
  // one move: the new state and what happened ({ s, ev: 'key'|'door'|'push'|'slide', path }) or null when Bob cannot go that way
  function move(lv, s, d) {
    var dx = DIRS[d][0], dy = DIRS[d][1], nx = s.x + dx, ny = s.y + dy, t = tile(lv, nx, ny), here = tile(lv, s.x, s.y);
    if (lv.kind === 'ice') {
      var x = s.x, y = s.y, path = [];
      while (tile(lv, x + dx, y + dy) !== '#') { x += dx; y += dy; path.push([x, y]); if (tile(lv, x, y) === 'G') break; }
      return path.length ? { s: { x: x, y: y }, ev: 'slide', path: path } : null;
    }
    if (t === '#') return null;
    if (ARROW[here] && ARROW[here] !== d) return null;
    if (ARROW[t] && ARROW[t] !== d) return null;
    if (lv.kind === 'crates') {
      var i = ny * lv.w + nx, k = s.c.indexOf(i);
      if (k < 0) return { s: { x: nx, y: ny, c: s.c } };
      var bx = nx + dx, by = ny + dy, j = by * lv.w + bx;
      if (tile(lv, bx, by) === '#' || s.c.indexOf(j) >= 0) return null;
      var c = s.c.slice(); c[k] = j; c.sort(function (a, b) { return a - b; });
      return { s: { x: nx, y: ny, c: c }, ev: 'push' };
    }
    var ns = { x: nx, y: ny }, ev = null;
    if (s.keys !== undefined) {
      ns.keys = s.keys;
      if (/[ABC]/.test(t)) { if (s.keys.indexOf(t.toLowerCase()) < 0) return null; ev = 'door'; }
      if (/[abc]/.test(t) && s.keys.indexOf(t) < 0) { ns.keys = (s.keys + t).split('').sort().join(''); ev = 'key'; }
    }
    if (ARROW[t]) ev = ev || 'arrow';
    return { s: ns, ev: ev };
  }
  function done(lv, s) {
    if (lv.kind === 'crates') { return s.c.every(function (i) { return lv.rows[Math.floor(i / lv.w)][i % lv.w] === 'x'; }); }
    return tile(lv, s.x, s.y) === 'G';
  }
  // fewest moves from s: { n, path: [dir…] } or null
  function solve(lv, s0, limit) {
    s0 = s0 || start(lv); limit = limit || 400000;
    var q = [s0], prev = {}, k0 = key(lv, s0), head = 0; prev[k0] = null;
    var dirOf = {};
    while (head < q.length) {
      var s = q[head++], ks = key(lv, s);
      if (done(lv, s)) {
        var path = [], k = ks;
        while (prev[k] !== null) { path.unshift(dirOf[k]); k = prev[k]; }
        return { n: path.length, path: path };
      }
      if (q.length > limit) return null;
      for (var i = 0; i < 4; i++) {
        var m = move(lv, s, ORDER[i]); if (!m) continue;
        var kn = key(lv, m.s); if (kn in prev) continue;
        prev[kn] = ks; dirOf[kn] = ORDER[i]; q.push(m.s);
      }
    }
    return null;
  }
  function stuck(lv, s) { if (lv.kind === 'crates' && cornered(lv, s)) return true; return !solve(lv, s, 60000); }
  // a crate pushed into a corner that is not a mark can never come out again
  function cornered(lv, s) {
    return s.c.some(function (i) {
      var x = i % lv.w, y = Math.floor(i / lv.w); if (lv.rows[y][x] === 'x') return false;
      var wl = function (dx, dy) { return tile(lv, x + dx, y + dy) === '#'; };
      return (wl(0, -1) || wl(0, 1)) && (wl(-1, 0) || wl(1, 0));
    });
  }

  /* ---------- making mazes ---------- */
  // a perfect maze: one road between any two squares. cw × ch rooms → (2cw+1) × (2ch+1) tiles
  function perfect(cw, ch, R) {
    var W = 2 * cw + 1, H = 2 * ch + 1, g = [], x, y;
    for (y = 0; y < H; y++) { g.push([]); for (x = 0; x < W; x++) g[y].push('#'); }
    var seen = {}, stack = [[0, 0]]; seen['0,0'] = 1; g[1][1] = '.';
    while (stack.length) {
      var c = stack[stack.length - 1], opts = shuffle(R, ORDER).filter(function (d) { var nx = c[0] + DIRS[d][0], ny = c[1] + DIRS[d][1]; return nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen[nx + ',' + ny]; });
      if (!opts.length) { stack.pop(); continue; }
      var d = opts[0], n = [c[0] + DIRS[d][0], c[1] + DIRS[d][1]];
      seen[n[0] + ',' + n[1]] = 1; g[2 * c[1] + 1 + DIRS[d][1]][2 * c[0] + 1 + DIRS[d][0]] = '.'; g[2 * n[1] + 1][2 * n[0] + 1] = '.';
      stack.push(n);
    }
    return g;
  }
  function braid(g, R, frac) { // knock down some inner walls so there are loops
    var cand = [];
    for (var y = 1; y < g.length - 1; y++) for (var x = 1; x < g[0].length - 1; x++) if (g[y][x] === '#' && ((x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0))) cand.push([x, y]);
    shuffle(R, cand).slice(0, Math.round(cand.length * frac)).forEach(function (c) { g[c[1]][c[0]] = '.'; });
    return g;
  }
  function rowsOf(g) { return g.map(function (r) { return r.join(''); }); }
  function distFrom(g, sx, sy) {
    var d = {}, q = [[sx, sy]]; d[sx + ',' + sy] = 0;
    while (q.length) { var c = q.shift(); ORDER.forEach(function (k) { var nx = c[0] + DIRS[k][0], ny = c[1] + DIRS[k][1]; if (g[ny] && g[ny][nx] && g[ny][nx] !== '#' && !((nx + ',' + ny) in d)) { d[nx + ',' + ny] = d[c[0] + ',' + c[1]] + 1; q.push([nx, ny]); } }); }
    return d;
  }
  function makeMaze(cw, ch, R) {
    var g = perfect(cw, ch, R);
    g[1][1] = 'S'; g[2 * ch - 1][2 * cw - 1] = 'G';
    return level('maze', rowsOf(g));
  }
  // keys and doors: doors on the only road to the exit, each key in a side road before its door
  function makeKeys(cw, ch, nKeys, R) {
    for (var guard = 0; guard < 3000; guard++) {
      var g = perfect(cw, ch, R), W = g[0].length, H = g.length;
      g[1][1] = 'S'; g[H - 2][W - 2] = 'G';
      var lv0 = level('maze', rowsOf(g)), sol = solve(lv0);
      var path = [[1, 1]], x = 1, y = 1;
      sol.path.forEach(function (d) { x += DIRS[d][0]; y += DIRS[d][1]; path.push([x, y]); });
      // doors sit on passages between rooms, spread along the road
      var gaps = path.map(function (p, i) { return [p, i]; }).filter(function (q) { return (q[0][0] + q[0][1]) % 2 === 1 && q[1] > 3 && q[1] < path.length - 2; });
      if (gaps.length < nKeys * 2) continue;
      var doors = [], ok = true;
      for (var k = 0; k < nKeys; k++) { var part = gaps.slice(Math.floor(gaps.length * (k + 0.35) / (nKeys + 0.35)), Math.floor(gaps.length * (k + 0.95) / (nKeys + 0.35))); if (!part.length) { ok = false; break; } doors.push(part[Math.floor(R() * part.length)][0]); }
      if (!ok) continue;
      var onPath = {}; path.forEach(function (p) { onPath[p[0] + ',' + p[1]] = 1; });
      var KEYS = 'abc', DOORS = 'ABC', placed = true, before = {};
      for (k = 0; k < nKeys; k++) {
        // the part of the maze Bob can reach with the earlier doors open
        var gg = g.map(function (r) { return r.slice(); });
        for (var j = k; j < nKeys; j++) gg[doors[j][1]][doors[j][0]] = '#';
        var reach = distFrom(gg, 1, 1), side = Object.keys(reach).filter(function (c) { var p = c.split(',').map(Number); return !onPath[c] && !before[c] && g[p[1]][p[0]] === '.' && p[0] % 2 === 1 && p[1] % 2 === 1; });
        // best in a dead end (Bob has to go in and come back out), otherwise anywhere off the road
        var cands = side.filter(function (c) { var p = c.split(',').map(Number); return ORDER.filter(function (d) { return gg[p[1] + DIRS[d][1]][p[0] + DIRS[d][0]] !== '#'; }).length === 1; });
        if (!cands.length) cands = side;
        if (!cands.length) { placed = false; break; }
        var far = cands.sort(function (a, b) { return reach[b] - reach[a]; }).slice(0, 3), pk = far[Math.floor(R() * far.length)].split(',').map(Number);
        g[pk[1]][pk[0]] = KEYS[k];
        Object.keys(reach).forEach(function (c) { before[c] = 1; });
      }
      if (!placed) continue;
      doors.forEach(function (p, i) { g[p[1]][p[0]] = DOORS[i]; });
      var lv = level('keys', rowsOf(g)), r = solve(lv);
      if (!r) continue;
      return lv;
    }
    throw new Error('keys');
  }
  // one-way squares on a maze with loops: the arrows must change the best road
  function makeOneWay(cw, ch, nArrows, R) {
    for (var guard = 0; guard < 400; guard++) {
      var g = braid(perfect(cw, ch, R), R, 0.12), W = g[0].length, H = g.length;
      g[1][1] = 'S'; g[H - 2][W - 2] = 'G';
      var free = level('maze', rowsOf(g)), base = solve(free);
      var straight = [];
      for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
        if (g[y][x] !== '.') continue;
        var h = g[y][x - 1] !== '#' && g[y][x + 1] !== '#' && g[y - 1][x] === '#' && g[y + 1][x] === '#', v = g[y - 1][x] !== '#' && g[y + 1][x] !== '#' && g[y][x - 1] === '#' && g[y][x + 1] === '#';
        if (h || v) straight.push([x, y, h]);
      }
      shuffle(R, straight).slice(0, nArrows).forEach(function (c) { g[c[1]][c[0]] = c[2] ? (R() < 0.5 ? '>' : '<') : (R() < 0.5 ? 'v' : '^'); });
      var lv = level('oneway', rowsOf(g)), r = solve(lv);
      if (!r || r.n < base.n + 4) continue; // the arrows must send Bob on a detour
      var arrowsUsed = 0, x2 = lv.start[0], y2 = lv.start[1];
      r.path.forEach(function (d) { x2 += DIRS[d][0]; y2 += DIRS[d][1]; if (ARROW[tile(lv, x2, y2)]) arrowsUsed++; });
      if (!arrowsUsed) continue;
      return lv;
    }
    throw new Error('oneway');
  }
  // ice: random rocks, the exit stops Bob
  function makeIce(w, h, lo, hi, R) {
    for (var guard = 0; guard < 3000; guard++) {
      var g = [], x, y;
      for (y = 0; y < h + 2; y++) { g.push([]); for (x = 0; x < w + 2; x++) g[y].push(x === 0 || y === 0 || x === w + 1 || y === h + 1 ? '#' : (R() < 0.16 ? '#' : '.')); }
      var floor = []; for (y = 1; y <= h; y++) for (x = 1; x <= w; x++) if (g[y][x] === '.') floor.push([x, y]);
      var s = floor[Math.floor(R() * floor.length)], e = floor[Math.floor(R() * floor.length)];
      if (s === e) continue;
      g[s[1]][s[0]] = 'S'; g[e[1]][e[0]] = 'G';
      var lv = level('ice', rowsOf(g)), r = solve(lv);
      if (!r || r.n < lo || r.n > hi) continue;
      return lv;
    }
    throw new Error('ice');
  }
  // crates: start with the crates on their marks and pull them away backwards, so every level can be solved
  function makeCrates(w, h, n, lo, hi, R) {
    for (var guard = 0; guard < 2000; guard++) {
      var g = [], x, y;
      for (y = 0; y < h + 2; y++) { g.push([]); for (x = 0; x < w + 2; x++) g[y].push(x === 0 || y === 0 || x === w + 1 || y === h + 1 ? '#' : (R() < 0.12 ? '#' : '.')); }
      var floor = []; for (y = 1; y <= h; y++) for (x = 1; x <= w; x++) if (g[y][x] === '.') floor.push([x, y]);
      if (floor.length < 14) continue;
      var dd = distFrom(g, floor[0][0], floor[0][1]); if (Object.keys(dd).length !== floor.length) continue; // one connected room
      floor = shuffle(R, floor);
      var marks = floor.slice(0, n), crates = marks.map(function (p) { return p.slice(); }), p = floor[n].slice();
      var isCrate = function (cx, cy) { return crates.some(function (c) { return c[0] === cx && c[1] === cy; }); };
      for (var step = 0; step < 300; step++) { // walk backwards: Bob steps away, sometimes pulling a crate along
        var d = ORDER[Math.floor(R() * 4)], dx = DIRS[d][0], dy = DIRS[d][1];
        if (g[p[1] + dy][p[0] + dx] === '#' || isCrate(p[0] + dx, p[1] + dy)) continue;
        var behind = crates.filter(function (c) { return c[0] === p[0] - dx && c[1] === p[1] - dy; })[0];
        if (behind && R() < 0.6) { behind[0] = p[0]; behind[1] = p[1]; }
        p = [p[0] + dx, p[1] + dy];
      }
      if (crates.some(function (c) { return marks.some(function (m) { return m[0] === c[0] && m[1] === c[1]; }); })) continue;
      marks.forEach(function (m) { g[m[1]][m[0]] = 'x'; });
      crates.forEach(function (c) { g[c[1]][c[0]] = '$'; });
      g[p[1]][p[0]] = 'S';
      var lv = level('crates', rowsOf(g)), r = solve(lv, null, 250000);
      if (!r || r.n < lo || r.n > hi) continue;
      var pushes = 0, sx = start(lv); r.path.forEach(function (dd2) { var m = move(lv, sx, dd2); if (m.ev === 'push') pushes++; sx = m.s; });
      if (pushes < n * 2) continue;
      return lv;
    }
    throw new Error('crates');
  }
  function fromRows(kind, rows) { return level(kind, rows); }

  /* ---------- explaining a solution ---------- */
  // steps of the best road from s, each a straight run (or a slide/push), with a reason
  function explain(lv, s0) {
    var L = S(), r = solve(lv, s0); if (!r) return [];
    if (lv.kind === 'crates') return explainCrates(lv, s0 || start(lv), r.path);
    var steps = [], s = s0 || start(lv), i = 0;
    while (i < r.path.length) {
      var d = r.path[i], run = [d], s1 = s, m = move(lv, s1, d), evs = [m.ev];
      var junction = lv.kind !== 'ice' && openWays(lv, s) >= 3;
      s1 = m.s; i++;
      if (lv.kind !== 'ice') while (i < r.path.length && r.path[i] === d && !evs[evs.length - 1] && openWays(lv, s1) < 3) { m = move(lv, s1, d); evs.push(m.ev); s1 = m.s; run.push(d); i++; }
      steps.push({ dirs: run, text: stepText(lv, s, s1, d, run.length, evs, junction) });
      s = s1;
    }
    return steps;
  }
  // crates: walk to the crate and push it, as one step per push in the same direction
  function explainCrates(lv, s, path) {
    var L = S(), steps = [], i = 0;
    while (i < path.length) {
      var run = [], walked = 0, m;
      while (i < path.length) { m = move(lv, s, path[i]); if (m.ev === 'push') break; run.push(path[i]); s = m.s; i++; walked++; }
      if (i >= path.length) { if (run.length) steps.push({ dirs: run, text: T(L.walkN, { n: run.length, dir: L.dirs[run[run.length - 1]] }) }); break; }
      var d = path[i], n = 0;
      while (i < path.length && path[i] === d && (m = move(lv, s, d)).ev === 'push') { run.push(d); s = m.s; i++; n++; }
      var text = (walked ? L.walkTo + ' ' : '') + T(n > 1 ? L.pushN : L.push, { n: n, dir: L.dirs[d] });
      if (done(lv, s)) text += ' ' + L.allCrates;
      steps.push({ dirs: run, text: text });
    }
    return steps;
  }
  function mudText(n) { var L = S(); return n === 0 ? L.mud0 : n === 1 ? L.mud1 : T(L.mudN, { n: n }); }
  function openWays(lv, s) { return ORDER.filter(function (d) { return tile(lv, s.x + DIRS[d][0], s.y + DIRS[d][1]) !== '#'; }).length; }
  function stepText(lv, a, b, d, n, evs, junction) {
    var L = S(), dir = (L.dirs || {})[d] || d, last = evs[evs.length - 1], t = tile(lv, b.x, b.y), out = [];
    if (lv.kind === 'ice') {
      out.push(T(L.slide, { dir: dir }) + ' ' + (t === 'G' ? L.slideGoal : T(L.slideStop, { what: tile(lv, b.x + DIRS[d][0], b.y + DIRS[d][1]) === '#' && inside(lv, b.x + DIRS[d][0], b.y + DIRS[d][1]) ? L.rock : L.edge })));
      return out.join(' ');
    }
    if (lv.kind === 'crates') { out.push(last === 'push' ? T(L.push, { dir: dir }) : T(n > 1 ? L.walkN : L.walk1, { n: n, dir: dir })); if (done(lv, b)) out.push(L.allCrates); return out.join(' '); }
    if (junction) out.push(T(L.junction, { dir: dir, target: (a.keys !== undefined && missingKey(lv, a, b)) ? L.toKey : L.toExit }));
    else out.push(T(n > 1 ? L.walkN : L.walk1, { n: n, dir: dir }));
    if (last === 'key') out.push(T(L.gotKey, { col: L.colors[t] }));
    if (last === 'door') out.push(T(L.openDoor, { col: L.colors[t.toLowerCase()] }));
    if (evs.indexOf('arrow') >= 0) out.push(L.arrow);
    if (t === 'G') out.push(L.atExit);
    return out.join(' ');
  }
  function inside(lv, x, y) { return x > 0 && y > 0 && x < lv.w - 1 && y < lv.h - 1; }
  function missingKey(lv, a) { var all = lv.rows.join('').replace(/[^abc]/g, ''); return all.split('').some(function (k) { return a.keys.indexOf(k) < 0; }); }

  /* ---------- Lys og spejle (light and mirrors) ---------- */
  var REFLECT = { '/': { right: 'up', up: 'right', left: 'down', down: 'left' }, '\\': { right: 'down', down: 'right', left: 'up', up: 'left' } };
  function trace(pz, orient) {
    var x = pz.laser[0], y = pz.laser[1], d = pz.laser[2], cells = [], guard = 0;
    while (guard++ < 400) {
      x += DIRS[d][0]; y += DIRS[d][1];
      if (x < 0 || y < 0 || x >= pz.w || y >= pz.h || pz.walls.indexOf(y * pz.w + x) >= 0) return { cells: cells, hit: false };
      cells.push([x, y, d]);
      if (x === pz.crystal[0] && y === pz.crystal[1]) return { cells: cells, hit: true };
      var mi = mirrorAt(pz, x, y);
      if (mi >= 0) d = REFLECT[orient[mi]][d];
    }
    return { cells: cells, hit: false };
  }
  function mirrorAt(pz, x, y) { for (var i = 0; i < pz.mirrors.length; i++) if (pz.mirrors[i][0] === x && pz.mirrors[i][1] === y) return i; return -1; }
  function mirrorSolutions(pz) {
    var out = [], m = pz.mirrors.length;
    for (var mask = 0; mask < (1 << m); mask++) { var o = []; for (var i = 0; i < m; i++) o.push(mask & (1 << i) ? '\\' : '/'); if (trace(pz, o).hit) out.push(o); }
    return out;
  }
  function taps(a, b) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; }
  function makeMirrors(size, nMirrors, minUsed, R) {
    for (var guard = 0; guard < 4000; guard++) {
      var w = size, h = size, walls = [], mirrors = [], used = {};
      var ly = int(R, 0, h - 1), laser = [-1, ly, 'right'];
      for (var k = 0; k < Math.round(size * size * 0.08); k++) { var wi = int(R, 0, w * h - 1); if (Math.floor(wi / w) !== ly || wi % w > 1) { walls.push(wi); used[wi] = 1; } }
      while (mirrors.length < nMirrors) { var mi = int(R, 0, w * h - 1); if (!used[mi]) { used[mi] = 1; mirrors.push([mi % w, Math.floor(mi / w)]); } }
      var pz = { w: w, h: h, walls: walls, mirrors: mirrors, laser: laser, crystal: [-9, -9] };
      // try every way of turning the mirrors, and remember the squares the light can reach and how
      var reach = {}, m = mirrors.length;
      for (var mask = 0; mask < (1 << m); mask++) {
        var o = []; for (var i = 0; i < m; i++) o.push(mask & (1 << i) ? '\\' : '/');
        var tr = trace(pz, o), bounces = 0;
        tr.cells.forEach(function (c, j) { if (mirrorAt(pz, c[0], c[1]) >= 0) { bounces++; return; } var kk = c[1] * w + c[0]; (reach[kk] = reach[kk] || []).push({ o: o, b: bounces }); });
      }
      // the crystal goes where few ways lead and the light must bounce on enough mirrors
      var spots = Object.keys(reach).filter(function (kk) { return reach[kk].every(function (r) { return r.b >= minUsed; }) && reach[kk].length <= 4; });
      if (!spots.length) continue;
      var c0 = +spots[Math.floor(R() * spots.length)];
      pz.crystal = [c0 % w, Math.floor(c0 / w)];
      var sols = mirrorSolutions(pz); if (!sols.length) continue;
      // start with every mirror the wrong way for the nearest solution, at least minUsed taps away
      var startO = sols[0].map(function (o) { return R() < 0.5 ? '/' : '\\'; });
      var best = Math.min.apply(null, sols.map(function (s) { return taps(startO, s); }));
      if (best < minUsed || trace(pz, startO).hit) continue;
      pz.start = startO; pz.best = best;
      return pz;
    }
    throw new Error('mirrors');
  }
  function mirrorSteps(pz, cur) {
    var sols = mirrorSolutions(pz), best = null, bt = 99;
    sols.forEach(function (s) { var tt = taps(cur, s); if (tt < bt) { bt = tt; best = s; } });
    if (!best) return [];
    var L = S(), o = cur.slice(), steps = [];
    // turn the mirrors in the order the light meets them
    var order = trace(pz, best).cells.map(function (c) { return mirrorAt(pz, c[0], c[1]); }).filter(function (i) { return i >= 0; });
    best.forEach(function (_, i) { if (order.indexOf(i) < 0) order.push(i); });
    order.forEach(function (i) {
      if (o[i] === best[i]) return;
      o[i] = best[i];
      var p = trace(pz, best).cells.filter(function (c) { return c[0] === pz.mirrors[i][0] && c[1] === pz.mirrors[i][1]; })[0];
      var out = p ? REFLECT[best[i]][p[2]] : null;
      steps.push({ mirror: i, text: T(L.turnMirror, { r: pz.mirrors[i][1] + 1, c: pz.mirrors[i][0] + 1 }) + (out ? ' ' + T(L.beamGoes, { dir: L.dirs[out] }) : '') });
    });
    return steps;
  }

  /* ---------- Korteste vej (shortest road on a map) ---------- */
  // map: w × h, '#' tree, '~' mud (costs 2), '.' grass. Bob at S, the treasure at T.
  function cost(map, x, y) { return map[y][x] === '~' ? 2 : 1; }
  function dijkstra(map, s) {
    var H = map.length, W = map[0].length, dist = {}, q = [[0, s[0], s[1]]]; dist[s[0] + ',' + s[1]] = 0;
    while (q.length) {
      q.sort(function (a, b) { return a[0] - b[0]; });
      var c = q.shift();
      if (c[0] > dist[c[1] + ',' + c[2]]) continue;
      ORDER.forEach(function (d) { var nx = c[1] + DIRS[d][0], ny = c[2] + DIRS[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H || map[ny][nx] === '#') return; var nd = c[0] + cost(map, nx, ny), k = nx + ',' + ny; if (!(k in dist) || nd < dist[k]) { dist[k] = nd; q.push([nd, nx, ny]); } });
    }
    return dist;
  }
  function countShortest(map, s, t) { // number of different shortest roads (steps of 1, no mud)
    var dist = dijkstra(map, s), memo = {};
    function ways(x, y) {
      var k = x + ',' + y; if (k in memo) return memo[k];
      if (x === s[0] && y === s[1]) return 1;
      var n = 0;
      ORDER.forEach(function (d) { var px = x - DIRS[d][0], py = y - DIRS[d][1], pk = px + ',' + py; if (pk in dist && dist[pk] + cost(map, x, y) === dist[k]) n += ways(px, py); });
      return (memo[k] = n);
    }
    return ways(t[0], t[1]);
  }
  function randomMap(R, w, h, trees, mud) {
    var m = [];
    for (var y = 0; y < h; y++) { m.push([]); for (var x = 0; x < w; x++) m[y].push(R() < trees ? '#' : R() < mud ? '~' : '.'); }
    return m;
  }
  function pathCost(map, path) { return path.slice(1).reduce(function (a, p) { return a + cost(map, p[0], p[1]); }, 0); }
  // a random road from s to t that never visits a square twice (for the »which road« questions)
  function randomRoad(R, map, s, t) {
    var H = map.length, W = map[0].length;
    for (var tries = 0; tries < 200; tries++) {
      var path = [s.slice()], seen = {}; seen[s[0] + ',' + s[1]] = 1;
      var c = s.slice(), guard = 0;
      while ((c[0] !== t[0] || c[1] !== t[1]) && guard++ < 60) {
        var opts = ORDER.map(function (d) { return [c[0] + DIRS[d][0], c[1] + DIRS[d][1]]; }).filter(function (p) { return p[0] >= 0 && p[1] >= 0 && p[0] < W && p[1] < H && map[p[1]][p[0]] !== '#' && !seen[p[0] + ',' + p[1]]; });
        if (!opts.length) break;
        // lean towards the treasure
        opts.sort(function (a, b) { return (Math.abs(a[0] - t[0]) + Math.abs(a[1] - t[1])) - (Math.abs(b[0] - t[0]) + Math.abs(b[1] - t[1])); });
        c = R() < 0.62 ? opts[0] : opts[Math.floor(R() * opts.length)];
        seen[c[0] + ',' + c[1]] = 1; path.push(c.slice());
      }
      if (c[0] === t[0] && c[1] === t[1]) return path;
    }
    return null;
  }
  function makeRouteQ(kind, R) {
    var L = S();
    for (var guard = 0; guard < 2000; guard++) {
      var w = kind === 'count' ? int(R, 3, 5) : int(R, 6, 7), h = kind === 'count' ? int(R, 3, 4) : int(R, 5, 6);
      var mudOn = kind === 'pickMud' || kind === 'stepsMud';
      var map = randomMap(R, w, h, kind === 'count' ? 0 : 0.14, mudOn ? 0.22 : 0), s = [0, int(R, 0, h - 1)], t = [w - 1, int(R, 0, h - 1)];
      if (kind === 'count') { s = [0, h - 1]; t = [w - 1, 0]; if (R() < 0.5) map[int(R, 0, h - 1)][int(R, 1, w - 2)] = '#'; }
      map[s[1]][s[0]] = '.'; map[t[1]][t[0]] = '.';
      var dist = dijkstra(map, s), best = dist[t[0] + ',' + t[1]];
      if (best === undefined) continue;
      var task = { type: 'route', kind: kind, map: map.map(function (r) { return r.join(''); }), s: s, t: t, best: best };
      if (kind === 'steps' || kind === 'stepsMud') {
        if (best < 6) continue;
        if (mudOn) { var plain = map.map(function (r) { return r.map(function (c) { return c === '~' ? '.' : c; }); }), steps0 = dijkstra(plain, s)[t[0] + ',' + t[1]]; if (steps0 === best) continue; } // the mud must matter
        var wrong = shuffle(R, [best - 2, best - 1, best + 1, best + 2, best + 3].filter(function (v) { return v > 0; })).slice(0, 3);
        task.options = shuffle(R, [best].concat(wrong)); task.answer = task.options.indexOf(best);
        task.q = mudOn ? L.qStepsMud : L.qSteps; task.hint = mudOn ? L.hintMud : L.hintSteps;
        task.road = shortestRoad(map, s, t);
        task.explain = T(mudOn ? L.exStepsMud : L.exSteps, { n: best, mud: mudText(task.road.filter(function (p) { return map[p[1]][p[0]] === '~'; }).length) });
        return task;
      }
      if (kind === 'pick' || kind === 'pickMud') {
        var roads = [], costs = [];
        roads.push(shortestRoad(map, s, t));
        for (var k = 0; k < 20 && roads.length < 3; k++) {
          var r = randomRoad(R, map, s, t);
          if (!r) continue;
          var c = pathCost(map, r);
          if (c === best || costs.indexOf(c) >= 0 || c > best + 8) continue;
          if (roads.some(function (o) { return JSON.stringify(o) === JSON.stringify(r); })) continue;
          roads.push(r); costs.push(c);
        }
        if (roads.length < 3) continue;
        var all = roads.map(function (rd) { return { road: rd, cost: pathCost(map, rd), steps: rd.length - 1 }; });
        if (mudOn && !all.some(function (a) { return a.road.some(function (p) { return map[p[1]][p[0]] === '~'; }); })) continue;
        if (mudOn && !all.some(function (a, i) { return i > 0 && a.steps <= all[0].steps; })) continue; // a road with fewer squares but more mud must be among the wrong ones
        all = shuffle(R, all);
        task.roads = all.map(function (a) { return a.road; });
        task.options = ['A', 'B', 'C']; task.answer = all.map(function (a) { return a.cost; }).indexOf(best);
        task.q = mudOn ? L.qPickMud : L.qPick; task.hint = mudOn ? L.hintMud : L.hintPick;
        task.explain = all.map(function (a, i) { return T(mudOn ? L.exRoadMud : L.exRoad, { l: 'ABC'[i], n: a.cost, mud: mudText(a.road.filter(function (p) { return map[p[1]][p[0]] === '~'; }).length) }); }).join(' ') + ' ' + T(L.exPickBest, { l: 'ABC'[task.answer] });
        return task;
      }
      if (kind === 'count') {
        if (best !== (w - 1) + (h - 1)) continue; // only right and up
        var n = countShortest(map, s, t);
        if (n < 3 || n > 35) continue;
        var wr = shuffle(R, [n - 2, n - 1, n + 1, n + 2, n * 2].filter(function (v) { return v > 0 && v !== n; })).slice(0, 3);
        task.options = shuffle(R, [n].concat(wr)); task.answer = task.options.indexOf(n);
        task.q = L.qCount; task.hint = L.hintCount;
        task.explain = T(L.exCount, { n: n, steps: best });
        return task;
      }
    }
    throw new Error('route ' + kind);
  }
  function shortestRoad(map, s, t) {
    var dist = dijkstra(map, s), path = [t.slice()], c = t.slice();
    while (c[0] !== s[0] || c[1] !== s[1]) {
      var k = c[0] + ',' + c[1];
      for (var i = 0; i < 4; i++) { var px = c[0] - DIRS[ORDER[i]][0], py = c[1] - DIRS[ORDER[i]][1], pk = px + ',' + py; if (pk in dist && dist[pk] + cost(map, c[0], c[1]) === dist[k]) { c = [px, py]; break; } }
      path.unshift(c.slice());
    }
    return path;
  }
  // the map as SVG: trees, mud, Bob's start, the treasure and (optional) roads
  var ROAD_COL = ['#D9463B', '#2F7DB3', '#7A4FB5'];
  function routeSvg(task, px, opts) {
    opts = opts || {};
    var map = task.map, W = map[0].length, H = map.length, u = 40, s = '';
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var c = map[y][x], X = x * u, Y = y * u;
      s += '<rect x="' + X + '" y="' + Y + '" width="' + u + '" height="' + u + '" fill="' + (c === '~' ? '#B98A57' : '#BFE3A0') + '" stroke="#9CC77E" stroke-width="1"/>';
      if (c === '~') s += '<ellipse cx="' + (X + 14) + '" cy="' + (Y + 24) + '" rx="7" ry="4" fill="#8B5A2B"/><ellipse cx="' + (X + 27) + '" cy="' + (Y + 14) + '" rx="6" ry="3.5" fill="#8B5A2B"/>';
      if (c === '#') s += '<path d="M' + (X + 20) + ' ' + (Y + 5) + ' L' + (X + 33) + ' ' + (Y + 26) + ' H' + (X + 7) + ' Z" fill="#3F8A3A" stroke="#2E5E2A" stroke-width="1.5"/><rect x="' + (X + 17) + '" y="' + (Y + 26) + '" width="6" height="9" fill="#8B5A2B"/>';
    }
    (task.roads || (opts.road ? [opts.road] : [])).forEach(function (rd, i) {
      var off = (i - 1) * 4, col = task.roads ? ROAD_COL[i] : '#2E9E3A';
      s += '<polyline points="' + rd.map(function (p) { return (p[0] * u + u / 2 + off) + ',' + (p[1] * u + u / 2 + off); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>';
      if (task.roads) { var mid = rd[Math.floor(rd.length / 2)]; s += '<circle cx="' + (mid[0] * u + u / 2 + off) + '" cy="' + (mid[1] * u + u / 2 + off) + '" r="10" fill="#fff" stroke="' + col + '" stroke-width="3"/><text x="' + (mid[0] * u + u / 2 + off) + '" y="' + (mid[1] * u + u / 2 + off + 5) + '" text-anchor="middle" font-size="14" font-weight="800" fill="' + col + '" font-family="system-ui,sans-serif">' + 'ABC'[i] + '</text>'; }
    });
    var sx = task.s[0] * u + u / 2, sy = task.s[1] * u + u / 2, tx = task.t[0] * u + u / 2, ty = task.t[1] * u + u / 2;
    s += '<circle cx="' + sx + '" cy="' + sy + '" r="13" fill="#F7C548" stroke="#4A2C17" stroke-width="2.5"/><path d="M' + (sx - 8) + ' ' + (sy - 2) + 'h16M' + (sx - 8) + ' ' + (sy + 5) + 'h16" stroke="#6B4426" stroke-width="3"/><circle cx="' + (sx - 4) + '" cy="' + (sy - 6) + '" r="1.8" fill="#4A2C17"/><circle cx="' + (sx + 4) + '" cy="' + (sy - 6) + '" r="1.8" fill="#4A2C17"/>';
    s += '<rect x="' + (tx - 13) + '" y="' + (ty - 9) + '" width="26" height="19" rx="3" fill="#B5652E" stroke="#4A2C17" stroke-width="2.5"/><rect x="' + (tx - 13) + '" y="' + (ty - 9) + '" width="26" height="7" rx="3" fill="#E8B923" stroke="#4A2C17" stroke-width="2"/><rect x="' + (tx - 3) + '" y="' + (ty - 4) + '" width="6" height="6" fill="#4A2C17"/>';
    return '<svg viewBox="0 0 ' + W * u + ' ' + H * u + '" width="' + px + '" height="' + Math.round(px * H / W) + '" role="img" aria-label="' + (opts.label || '') + '" style="max-width:100%;height:auto;border-radius:8px">' + s + '</svg>';
  }

  /* ---------- the daily challenge: which exit does Bob reach? ---------- */
  function makeExits(R) {
    for (var guard = 0; guard < 500; guard++) {
      var cw = 5, ch = 5, g = perfect(cw, ch, R), W = g[0].length, H = g.length;
      var doors = shuffle(R, [[2 * int(R, 0, cw - 1) + 1, 0], [W - 1, 2 * int(R, 0, ch - 1) + 1], [2 * int(R, 0, cw - 1) + 1, H - 1]]);
      doors.forEach(function (d) { g[d[1]][d[0]] = '.'; });
      var bob = [2 * int(R, 1, cw - 2) + 1, 2 * int(R, 1, ch - 2) + 1];
      // close passages until exactly one exit is reachable
      var walls = []; for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) if (g[y][x] === '.' && (x + y) % 2 === 1) walls.push([x, y]);
      walls = shuffle(R, walls);
      for (var k = 0; k < walls.length; k++) {
        var reach = distFrom(g, bob[0], bob[1]), n = doors.filter(function (d) { return (d[0] + ',' + d[1]) in reach; }).length;
        if (n === 1) break;
        var w0 = walls[k]; g[w0[1]][w0[0]] = '#';
        var r2 = distFrom(g, bob[0], bob[1]); if (!doors.some(function (d) { return (d[0] + ',' + d[1]) in r2; })) g[w0[1]][w0[0]] = '.';
      }
      var fin = distFrom(g, bob[0], bob[1]), ok = doors.map(function (d) { return (d[0] + ',' + d[1]) in fin; });
      if (ok.filter(Boolean).length !== 1) continue;
      return { rows: rowsOf(g), bob: bob, exits: doors, answer: ok.indexOf(true) };
    }
    throw new Error('exits');
  }
  function exitsSvg(e, px) {
    var u = 20, H = e.rows.length, W = e.rows[0].length, s = '';
    e.rows.forEach(function (r, y) { for (var x = 0; x < W; x++) s += '<rect x="' + x * u + '" y="' + y * u + '" width="' + u + '" height="' + u + '" fill="' + (r[x] === '#' ? '#5B4A3A' : '#F7F0E0') + '"/>'; });
    e.exits.forEach(function (d, i) { s += '<circle cx="' + (d[0] * u + u / 2) + '" cy="' + (d[1] * u + u / 2) + '" r="9" fill="#FFFFFF" stroke="#2F7DB3" stroke-width="2.5"/><text x="' + (d[0] * u + u / 2) + '" y="' + (d[1] * u + u / 2 + 4.5) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#2F7DB3" font-family="system-ui,sans-serif">' + 'ABC'[i] + '</text>'; });
    s += '<circle cx="' + (e.bob[0] * u + u / 2) + '" cy="' + (e.bob[1] * u + u / 2) + '" r="8" fill="#F7C548" stroke="#4A2C17" stroke-width="2"/>';
    return '<svg viewBox="0 0 ' + W * u + ' ' + H * u + '" width="' + px + '" height="' + px + '" role="img" aria-label="" style="max-width:100%;height:auto">' + s + '</svg>';
  }

  /* ---------- codes for mazes children build ---------- */
  function toCode(lv) { var rows = lv.rows.map(function (r, y) { return r.split('').map(function (c, x) { return lv.start && x === lv.start[0] && y === lv.start[1] ? 'S' : c; }).join(''); }); return 'L' + lv.w + 'x' + lv.h + '-' + rows.join('').replace(/#/g, 'w').replace(/\./g, 'o'); }
  function fromCode(code) {
    var m = /^L(\d{1,2})x(\d{1,2})-([woSGabAB]+)$/.exec(String(code || '').replace(/\s+/g, ''));
    if (!m) return null;
    var W = +m[1], H = +m[2], s = m[3];
    if (W < 5 || H < 5 || W > 15 || H > 15 || s.length !== W * H) return null;
    if ((s.match(/S/g) || []).length !== 1 || (s.match(/G/g) || []).length !== 1) return null;
    var rows = []; for (var y = 0; y < H; y++) rows.push(s.slice(y * W, y * W + W).replace(/w/g, '#').replace(/o/g, '.'));
    var lv = level('build', rows);
    return solve(lv) ? lv : null;
  }

  var api = { DIRS: DIRS, ORDER: ORDER, ARROW: ARROW, REFLECT: REFLECT, level: level, fromRows: fromRows, tile: tile, start: start, key: key, move: move, done: done, solve: solve, stuck: stuck, cornered: cornered,
    perfect: perfect, makeMaze: makeMaze, makeKeys: makeKeys, makeOneWay: makeOneWay, makeIce: makeIce, makeCrates: makeCrates, explain: explain,
    trace: trace, mirrorAt: mirrorAt, mirrorSolutions: mirrorSolutions, taps: taps, makeMirrors: makeMirrors, mirrorSteps: mirrorSteps,
    dijkstra: dijkstra, countShortest: countShortest, pathCost: pathCost, makeRouteQ: makeRouteQ, shortestRoad: shortestRoad, routeSvg: routeSvg,
    makeExits: makeExits, exitsSvg: exitsSvg, toCode: toCode, fromCode: fromCode };
  root.MAZE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
