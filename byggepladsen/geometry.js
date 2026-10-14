/*
 * Byggepladsen – geometri: data, matematik og opgavegeneratorer. Ingen DOM.
 * Alle svar regnes ud her. tools/test-byggepladsen.js regner dem efter på en anden måde.
 * Teksterne kommer fra window.STR.bp (strings-da.js), så alt dansk står ét sted.
 * Gitter: x mod højre, y nedad (skærmens retning). Koordinatsystemet (Tegnebordet) vender y opad.
 */
(function (root) {
  'use strict';
  function S() { return root.STR.bp; }
  function t(str, v) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function between(a, b) { return a + rnd(b - a + 1); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function uniq(a) { var o = [], s = {}; a.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }

  /* ---------- numbers: Danish format (1.234,5) and tolerant parsing ---------- */
  function fmt(n, dec) {
    var neg = n < 0, s = Math.abs(n).toFixed(dec === undefined ? 3 : dec), p = s.split('.'), i = p[0], f = p[1] || '';
    if (dec === undefined) f = f.replace(/0+$/, '');
    if (i.length > 3) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + i + (f ? ',' + f : '');
  }
  // "12,5" "12.5" " 7 " "1.000" "1.000,5" "28,3 m²" -> number; anything else -> NaN
  function parseNum(s) {
    s = String(s === null || s === undefined ? '' : s).replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/[^\d,.]+$/, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
    if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }
  // integer arithmetic: value given in 1/den units, rounded half up to `dec` decimals
  function roundFrac(num, den, dec) { var p = Math.pow(10, dec); return Math.floor((num * p * 2 + den) / (2 * den)) / p; }

  /* ---------- polyominoes (sets of grid cells) ---------- */
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function ck(c) { return c[0] + ',' + c[1]; }
  function cellSet(cells) { var o = {}; cells.forEach(function (c) { o[ck(c)] = 1; }); return o; }
  function keys(cells) { return cells.map(ck).sort(); }
  function norm(cells) {
    var mx = Math.min.apply(null, cells.map(function (c) { return c[0]; })), my = Math.min.apply(null, cells.map(function (c) { return c[1]; }));
    return cells.map(function (c) { return [c[0] - mx, c[1] - my]; }).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
  }
  function shapeKey(cells) { return norm(cells).map(ck).join(';'); }
  var SYM = [function (c) { return [c[0], c[1]]; }, function (c) { return [-c[0], c[1]]; }, function (c) { return [c[0], -c[1]]; }, function (c) { return [-c[0], -c[1]]; },
    function (c) { return [c[1], c[0]]; }, function (c) { return [-c[1], c[0]]; }, function (c) { return [c[1], -c[0]]; }, function (c) { return [-c[1], -c[0]]; }];
  function orient(cells, k) { return norm(cells.map(SYM[k])); }
  function canon(cells) { return SYM.map(function (f) { return shapeKey(cells.map(f)); }).sort()[0]; }
  function asymmetric(cells) { return uniq(SYM.map(function (f) { return shapeKey(cells.map(f)); })).length === 8; }
  function size(cells) { var n = norm(cells); return [Math.max.apply(null, n.map(function (c) { return c[0]; })) + 1, Math.max.apply(null, n.map(function (c) { return c[1]; })) + 1]; }
  function perimeter(cells) { var s = cellSet(cells), p = 0; cells.forEach(function (c) { DIRS.forEach(function (d) { if (!s[(c[0] + d[0]) + ',' + (c[1] + d[1])]) p++; }); }); return p; }
  function parseShape(str) { var out = []; str.split('/').forEach(function (row, y) { row.split('').forEach(function (ch, x) { if (ch === '#') out.push([x, y]); }); }); return out; }
  // random connected shape of n cells grown from `start`, only on cells where inside(x, y) is true
  function grow(n, inside, start) {
    if (!inside(start[0], start[1])) return null;
    var cells = [start], s = {}; s[ck(start)] = 1;
    for (var tries = 0; cells.length < n && tries < 400; tries++) {
      var c = pick(cells), d = pick(DIRS), q = [c[0] + d[0], c[1] + d[1]];
      if (!s[ck(q)] && inside(q[0], q[1])) { s[ck(q)] = 1; cells.push(q); }
    }
    return cells.length === n ? cells : null;
  }

  /* ---------- the 11 nets of a cube (proved by brute force in the test) ---------- */
  var NETS = ['...#/####/...#', '...#/####/..#.', '...#/####/.#..', '...#/####/#...', '..#./####/..#.', '..#./####/.#..',
    '..#./###./..##', '..#./.###/##..', '...#/.###/##..', '..###/###..', '..##/.##./##..'];
  var NET_KEYS = NETS.map(function (s) { return canon(parseShape(s)); });
  function isNet(cells) { return cells.length === 6 && NET_KEYS.indexOf(canon(cells)) >= 0; }
  var hexCache = null;
  function hexominoes() { // all 35 free hexominoes, built cell by cell
    if (hexCache) return hexCache;
    var cur = {}; cur['0,0'] = [[0, 0]];
    for (var n = 2; n <= 6; n++) {
      var next = {};
      Object.keys(cur).forEach(function (k) {
        var c = cur[k], s = cellSet(c);
        c.forEach(function (p) { DIRS.forEach(function (d) { var q = [p[0] + d[0], p[1] + d[1]]; if (!s[ck(q)]) { var cc = norm(c.concat([q])); next[canon(cc)] = cc; } }); });
      });
      cur = next;
    }
    hexCache = Object.keys(cur).map(function (k) { return cur[k]; });
    return hexCache;
  }
  function has2x2(cells) { var s = cellSet(cells); return cells.some(function (c) { return s[(c[0] + 1) + ',' + c[1]] && s[c[0] + ',' + (c[1] + 1)] && s[(c[0] + 1) + ',' + (c[1] + 1)]; }); }
  // Folds a net by rolling a cube from cell to cell. Returns the hinge tree (for the animation) and the cube face of every cell.
  function fold(cells) {
    var s = {}, deg = cells.map(function (c) { return DIRS.filter(function (d) { return cellSet(cells)[(c[0] + d[0]) + ',' + (c[1] + d[1])]; }).length; });
    cells.forEach(function (c, i) { s[ck(c)] = i; });
    var rootI = deg.indexOf(Math.max.apply(null, deg)), parent = [], dir = [], face = [], seen = {}, queue = [rootI];
    function neg(v) { return v.map(function (x) { return -x; }); }
    var or = []; or[rootI] = { d: [0, 0, -1], n: [0, -1, 0], e: [1, 0, 0] }; seen[rootI] = 1; parent[rootI] = -1;
    while (queue.length) {
      var i = queue.shift(), o = or[i]; face[i] = o.d.join(',');
      DIRS.forEach(function (d) {
        var j = s[(cells[i][0] + d[0]) + ',' + (cells[i][1] + d[1])];
        if (j === undefined || seen[j]) return;
        seen[j] = 1; parent[j] = i; dir[j] = d; queue.push(j);
        // roll the cube over the shared edge: the side facing that way ends up underneath
        if (d[0] === 1) or[j] = { d: o.e, e: neg(o.d), n: o.n };
        else if (d[0] === -1) or[j] = { d: neg(o.e), e: o.d, n: o.n };
        else if (d[1] === -1) or[j] = { d: o.n, n: neg(o.d), e: o.e };
        else or[j] = { d: neg(o.n), n: o.d, e: o.e };
      });
    }
    return { root: rootI, parent: parent, dir: dir, face: face, ok: uniq(face).length === 6 && face.length === 6 };
  }
  function opposite(cells, i) { var f = fold(cells), want = f.face[i].split(',').map(function (x) { return String(-x); }).join(','); return f.face.indexOf(want); }

  /* ---------- views of a block tower: h[x][y], x to the right, y = 0 at the front ---------- */
  function views(h) {
    var W = h.length, D = h[0].length, front = [], right = [], top = [];
    for (var x = 0; x < W; x++) { var m = 0; for (var y = 0; y < D; y++) m = Math.max(m, h[x][y]); front.push(m); }
    for (var y2 = 0; y2 < D; y2++) { var m2 = 0; for (var x2 = 0; x2 < W; x2++) m2 = Math.max(m2, h[x2][y2]); right.push(m2); } // seen from the right: the front is on the left
    for (var r = D - 1; r >= 0; r--) for (var x3 = 0; x3 < W; x3++) top.push(h[x3][r] > 0 ? 1 : 0); // from above: back row first
    return { front: 'c' + front.join(''), right: 'c' + right.join(''), top: 't' + W + ':' + top.join('') };
  }

  /* ---------- shape names (inclusive definitions, used to keep wrong options really wrong) ---------- */
  function polyFacts(p) {
    var n = p.length, sides = [], right = 0, par = 0;
    for (var i = 0; i < n; i++) { var a = p[i], b = p[(i + 1) % n]; sides.push([b[0] - a[0], b[1] - a[1]]); }
    for (var k = 0; k < n; k++) { var u = sides[k], v = sides[(k + 1) % n], len = Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]); if (Math.abs(u[0] * v[0] + u[1] * v[1]) / len < 0.01) right++; }
    if (n === 4) for (var m = 0; m < 2; m++) { var s1 = sides[m], s2 = sides[m + 2]; if (Math.abs(s1[0] * s2[1] - s1[1] * s2[0]) / (Math.hypot(s1[0], s1[1]) * Math.hypot(s2[0], s2[1])) < 0.01) par++; }
    var lens = sides.map(function (s) { return Math.hypot(s[0], s[1]); }), equal = lens.every(function (l) { return Math.abs(l - lens[0]) < 0.01 * lens[0]; });
    return { n: n, right: right, par: par, equal: equal };
  }
  function namesFor(fig) { // every name that is true for the figure
    if (fig.circle) return ['cirkel'];
    var f = polyFacts(fig.poly);
    if (f.n === 3) return ['trekant']; if (f.n === 5) return ['femkant']; if (f.n === 6) return ['sekskant'];
    var out = [];
    if (f.right === 4 && f.equal) out.push('kvadrat');
    if (f.right === 4) out.push('rektangel');
    if (f.par === 2) out.push('parallelogram');
    if (f.par >= 1) out.push('trapez');
    return out;
  }

  /* ---------- small helpers for drawings ---------- */
  function rot(p, deg, c) { var a = deg * Math.PI / 180, x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function fitPoly(pts, deg) { // rotate around the middle, then move into the box 0..100 × 0..70
    var cx = 0, cy = 0; pts.forEach(function (p) { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
    var q = pts.map(function (p) { return rot(p, deg, [cx, cy]); });
    var xs = q.map(function (p) { return p[0]; }), ys = q.map(function (p) { return p[1]; });
    var w = Math.max.apply(null, xs) - Math.min.apply(null, xs), hh = Math.max.apply(null, ys) - Math.min.apply(null, ys), sc = Math.min(80 / w, 56 / hh, 1.6);
    var ox = 50 - (Math.min.apply(null, xs) + w / 2) * sc, oy = 35 - (Math.min.apply(null, ys) + hh / 2) * sc;
    return q.map(function (p) { return [r2(p[0] * sc + ox), r2(p[1] * sc + oy)]; });
  }
  function convexOk(p) { var sgn = 0; for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length], cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(cr) < 1e-6) return false; if (sgn && Math.sign(cr) !== sgn) return false; sgn = Math.sign(cr); } return true; }
  function minAngle(p) { var m = 180; for (var i = 0; i < p.length; i++) { var a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length]; var u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]]; m = Math.min(m, Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180 / Math.PI); } return m; }
  function maxAngle(p) { var m = 0; for (var i = 0; i < p.length; i++) { var a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length]; var u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]]; m = Math.max(m, Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180 / Math.PI); } return m; }
  function regular(n, jitter) {
    for (;;) {
      var start = rnd(360), pts = [];
      for (var i = 0; i < n; i++) { var a = (start + i * 360 / n + (jitter ? between(-8, 8) : 0)) * Math.PI / 180, r = 40 * (jitter ? 0.85 + Math.random() * 0.3 : 1); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
      if (convexOk(pts) && minAngle(pts) > 60) return pts;
    }
  }
  function choice(kind, answer, wrong, extra) {
    var tk = { type: 'choice', kind: kind, answer: answer, options: shuffle([answer].concat(wrong)) };
    for (var k in extra) tk[k] = extra[k];
    return tk;
  }
  function numTask(kind, value, accept, unit, extra) {
    var tk = { type: 'number', kind: kind, answer: fmt(value, extra && extra.round === 1 ? 1 : undefined), accept: uniq([value].concat(accept || [])), unit: unit };
    for (var k in extra) tk[k] = extra[k];
    return tk;
  }
  function felt(n) { return n + ' ' + (n === 1 ? S().cell1 : S().cellN); }

  /* ================= GENERATORS ================= */
  var FW = 8, FH = 6; // the fence board: 8 × 6 metres, posts at every whole metre
  function rects(cond) { var out = []; for (var w = 1; w <= FW; w++) for (var h = 1; h <= FH; h++) if (cond(w, h)) out.push([w, h]); return out; }
  function pairs(sol) { return uniq(sol.map(function (s) { return Math.max(s[0], s[1]) + ' m · ' + Math.min(s[0], s[1]) + ' m'; })); }
  function fenceTask(kind, sol, v) {
    var s = S(), w = sol[0][0], h = sol[0][1];
    var list = pairs(sol);
    v.w = w; v.h = h; v.list = list.join(', '); v.half = v.p / 2;
    return { type: 'fence', kind: kind, W: FW, H: FH, solutions: sol, answer: [0, 0, w, h], area: v.a, per: v.p,
      q: t(s.q[kind], v), hint: t(s.hint[kind], v), explain: t(s.explain[kind], v) + (list.length > 1 ? ' ' + t(s.fenceAll, v) : '') };
  }

  var gen = {
    /* ---- Hegnet ---- */
    fenceArea: function (band) {
      var a = pick(band === 'M' ? [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24] : [12, 16, 18, 20, 24, 30]);
      var sol = rects(function (w, h) { return w * h === a; });
      return fenceTask('fenceArea', sol, { a: a, p: 2 * (sol[0][0] + sol[0][1]) });
    },
    fencePer: function () {
      var half = between(3, 11), sol = rects(function (w, h) { return w + h === half; });
      return fenceTask('fencePer', sol, { p: 2 * half, a: sol[0][0] * sol[0][1] });
    },
    fenceBoth: function () {
      for (;;) {
        var w = between(2, 8), h = between(2, 6), a = w * h, p = 2 * (w + h);
        var sol = rects(function (x, y) { return x * y === a && x + y === w + h; });
        if (rects(function (x, y) { return x * y === a; }).length > sol.length) return fenceTask('fenceBoth', sol, { a: a, p: p }); // the area alone must not be enough
      }
    },
    fenceMax: function () {
      var half = between(5, 11), all = rects(function (w, h) { return w + h === half; });
      var best = Math.max.apply(null, all.map(function (s) { return s[0] * s[1]; }));
      return fenceTask('fenceMax', all.filter(function (s) { return s[0] * s[1] === best; }), { p: 2 * half, a: best });
    },
    fenceMin: function () {
      var a = pick([12, 16, 18, 20, 24, 30, 36]), all = rects(function (w, h) { return w * h === a; });
      var least = Math.min.apply(null, all.map(function (s) { return s[0] + s[1]; }));
      return fenceTask('fenceMin', all.filter(function (s) { return s[0] + s[1] === least; }), { a: a, p: 2 * least });
    },

    /* ---- Spejlet: draw the missing half (vertical or horizontal mirror line in the middle) ---- */
    mirror: function (band, dir) {
      var W = 8, H = 6, s = S();
      dir = dir || pick(['v', 'h']);
      for (;;) {
        var n = band === 'M' ? between(4, 7) : between(6, 9), side = pick([0, 1]), inside, start, mir;
        if (dir === 'v') {
          inside = function (x, y) { return y >= 0 && y < H && (side ? x >= 4 && x < W : x >= 0 && x < 4); };
          start = [side ? 4 : 3, between(0, H - 1)]; mir = function (c) { return [7 - c[0], c[1]]; };
        } else {
          inside = function (x, y) { return x >= 0 && x < W && (side ? y >= 3 && y < H : y >= 0 && y < 3); };
          start = [between(0, W - 1), side ? 3 : 2]; mir = function (c) { return [c[0], 5 - c[1]]; };
        }
        var cells = grow(n, inside, start);
        if (!cells) continue;
        return { type: 'cells', kind: 'mirror', W: W, H: H, given: cells, answer: keys(cells.map(mir)), axis: dir === 'v' ? { type: 'v', at: 4 } : { type: 'h', at: 3 },
          q: s.q.mirror, hint: s.hint.mirror, explain: s.explain.mirror };
      }
    },

    /* ---- Kranen: move, turn and mirror a figure (draw the result) ---- */
    move: function () {
      var W = 8, H = 6, s = S();
      for (;;) {
        var fig = grow(between(4, 5), function (x, y) { return x >= 0 && x < 3 && y >= 0 && y < 3; }, [1, 1]);
        if (!fig) continue;
        var ox = between(0, W - 3), oy = between(0, H - 3), dx = between(-5, 5), dy = between(-4, 4);
        if (!dx || !dy) continue;
        var given = fig.map(function (c) { return [c[0] + ox, c[1] + oy]; }), img = given.map(function (c) { return [c[0] + dx, c[1] + dy]; });
        if (!fits(img, W, H) || overlap(given, img)) continue;
        var parts = [t(dx > 0 ? s.moveRight : s.moveLeft, { n: felt(Math.abs(dx)) }), t(dy > 0 ? s.moveDown : s.moveUp, { n: felt(Math.abs(dy)) })].join(' ' + s.and + ' ');
        return { type: 'cells', kind: 'move', W: W, H: H, given: given, answer: keys(img), move: [dx, dy], q: t(s.q.move, { parts: parts }), hint: s.hint.move, explain: t(s.explain.move, { parts: parts }) };
      }
    },
    rotate: function () {
      var W = 8, H = 6, s = S();
      for (;;) {
        var px = between(2, 6), py = between(2, 4), deg = pick([90, 90, 180]), cw = pick([true, false]), qx = pick([0, 1]), qy = pick([0, 1]);
        // the figure sits in one quarter next to the black point, touching it with a corner
        var fig = grow(between(3, 5), function (x, y) { return x >= 0 && x < W && y >= 0 && y < H && (qx ? x >= px : x < px) && (qy ? y >= py : y < py) && Math.abs(x + 0.5 - px) < 3 && Math.abs(y + 0.5 - py) < 3; },
          [qx ? px : px - 1, qy ? py : py - 1]);
        if (!fig) continue;
        var img = fig.map(function (c) { return turnCell(c, px, py, deg, cw); });
        if (!fits(img, W, H) || overlap(fig, img)) continue;
        var how = deg === 180 ? t(s.turn180, {}) : t(cw ? s.turnCw : s.turnCcw, { deg: deg });
        return { type: 'cells', kind: 'rotate', W: W, H: H, given: fig, answer: keys(img), center: [px, py], deg: deg, cw: deg === 180 ? null : cw,
          q: t(s.q.rotate, { how: how }), hint: s.hint.rotate, explain: t(s.explain.rotate, { how: how }) };
      }
    },
    reflect: function (band, kind) {
      var W = 8, H = 6, s = S();
      kind = kind === 'vh' ? pick(['v', 'h']) : kind === 'diag' ? pick(['d', 'a']) : kind || pick(['v', 'h', 'd', 'a']);
      for (;;) {
        var ax, side = pick([0, 1]), f, inside;
        if (kind === 'v') { ax = { type: 'v', at: between(3, 5) }; f = function (c) { return [2 * ax.at - 1 - c[0], c[1]]; }; inside = function (x) { return side ? x >= ax.at : x < ax.at; }; }
        else if (kind === 'h') { ax = { type: 'h', at: 3 }; f = function (c) { return [c[0], 2 * ax.at - 1 - c[1]]; }; inside = function (x, y) { return side ? y >= ax.at : y < ax.at; }; }
        else if (kind === 'd') { ax = { type: 'd', px: between(1, 2), py: 0 }; f = function (c) { return [ax.px + c[1] - ax.py, ax.py + c[0] - ax.px]; }; inside = function (x, y) { var k = (x - ax.px) - (y - ax.py); return side ? k >= 1 : k <= -1; }; }
        else { ax = { type: 'a', px: between(6, 7), py: 0 }; f = function (c) { return [ax.px + ax.py - c[1] - 1, ax.px + ax.py - c[0] - 1]; }; inside = function (x, y) { var k = x + y + 1 - (ax.px + ax.py); return side ? k >= 1 : k <= -1; }; }
        var ok = function (x, y) { if (x < 0 || y < 0 || x >= W || y >= H || !inside(x, y)) return false; var m = f([x, y]); return m[0] >= 0 && m[1] >= 0 && m[0] < W && m[1] < H; };
        var cand = []; for (var x = 0; x < W; x++) for (var y = 0; y < H; y++) if (ok(x, y)) cand.push([x, y]);
        if (!cand.length) continue;
        // start next to the mirror line, so the figure and its mirror image meet there
        var near = cand.filter(function (c) { var m = f(c); return Math.abs(m[0] - c[0]) + Math.abs(m[1] - c[1]) <= 2; });
        var fig = grow(between(4, 6), ok, pick(near.length ? near : cand));
        if (!fig) continue;
        var img = fig.map(f);
        if (overlap(fig, img)) continue;
        return { type: 'cells', kind: 'reflect', W: W, H: H, given: fig, answer: keys(img), axis: ax, q: s.q.reflect, hint: s.hint[kind === 'd' || kind === 'a' ? 'reflectDiag' : 'reflect'], explain: s.explain.reflect };
      }
    },
    whichMove: function () {
      var W = 8, H = 6, s = S();
      for (;;) {
        var fig = grow(between(4, 5), function (x, y) { return x >= 0 && x < 3 && y >= 0 && y < 3; }, [1, 1]);
        if (!fig || !asymmetric(fig)) continue; // no symmetry: then only one kind of move can do it
        var ox = between(0, W - 3), oy = between(0, H - 3), given = fig.map(function (c) { return [c[0] + ox, c[1] + oy]; });
        var type = pick(['move', 'rotate', 'reflect']), img;
        if (type === 'move') { var dx = between(-5, 5), dy = between(-3, 3); img = given.map(function (c) { return [c[0] + dx, c[1] + dy]; }); }
        else if (type === 'rotate') { var px = between(1, 7), py = between(1, 5), deg = pick([90, 180]), cw = pick([true, false]); img = given.map(function (c) { return turnCell(c, px, py, deg, cw); }); }
        else { var at = between(1, 7); img = pick([0, 1]) ? given.map(function (c) { return [2 * at - 1 - c[0], c[1]]; }) : given.map(function (c) { return [c[0], 2 * Math.min(at, 5) - 1 - c[1]]; }); }
        if (!fits(img, W, H) || overlap(given, img) || touching(given, img)) continue;
        return { type: 'choice', kind: 'whichMove', W: W, H: H, given: given, image: img, answer: type, options: ['move', 'rotate', 'reflect'],
          q: s.q.whichMove, hint: s.hint.whichMove, explain: s.explain['which_' + type] };
      }
    },

    /* ---- Kassefabrikken ---- */
    netPick: function (band) {
      var s = S(), net = orient(parseShape(pick(NETS)), rnd(8));
      var bad = hexominoes().filter(function (c) { return !isNet(c) && (band === 'M' || !has2x2(c)); });
      var wrong = shuffle(bad).slice(0, 2).map(function (c) { return orient(c, rnd(8)); });
      var figs = shuffle([net].concat(wrong)), ids = ['a', 'b', 'c'], answer = ids[figs.indexOf(net)];
      return { type: 'choice', kind: 'netPick', figs: figs, options: ids, answer: answer, q: s.q.netPick, hint: s.hint.netPick, explain: s.explain.netPick };
    },
    netYesNo: function () {
      var s = S(), yes = Math.random() < 0.5, c = yes ? parseShape(pick(NETS)) : pick(hexominoes().filter(function (x) { return !isNet(x); }));
      c = orient(c, rnd(8));
      return { type: 'choice', kind: 'netYesNo', fig: c, options: ['yes', 'no'], answer: yes ? 'yes' : 'no', q: s.q.netYesNo, hint: s.hint.netPick, explain: s.explain[yes ? 'netYes' : 'netNo'] };
    },
    netOpp: function () {
      var s = S(), c = orient(parseShape(pick(NETS)), rnd(8)), mark = rnd(6), opp = opposite(c, mark), letters = s.letters.slice(0, 6);
      var labels = c.map(function (x, i) { return i === mark ? '' : letters[i]; });
      return { type: 'choice', kind: 'netOpp', fig: c, mark: mark, labels: labels, options: labels.filter(Boolean), answer: labels[opp],
        q: s.q.netOpp, hint: s.hint.netOpp, explain: t(s.explain.netOpp, { a: labels[opp] }) };
    },

    /* ---- Udsigten: views of a block tower ---- */
    view: function (band, which, plan) {
      var s = S(); which = which || pick(plan ? ['front', 'right'] : ['front', 'right', 'top']);
      for (;;) {
        var h = tower(); if (!h) continue;
        var v = views(h), ans = v[which], wrong = viewDistractors(h, which, v);
        if (wrong.length < 3) continue;
        return { type: 'choice', kind: plan ? 'viewPlan' : 'view', heights: h, which: which, answer: ans, options: shuffle([ans].concat(wrong.slice(0, 3))),
          q: t(plan ? s.q.viewPlan : s.q.view, { side: s.sides[which] }), hint: s.hint['view_' + which], explain: s.explain['view_' + which] };
      }
    },

    /* ---- Tegnebordet: first quadrant, 0..8 × 0..6 ---- */
    coordPlace: function () {
      var s = S(), x = between(0, 8), y = between(0, 6);
      if (x === 0 && y === 0) x = 3;
      return { type: 'point', kind: 'coordPlace', W: 8, H: 6, answer: x + ',' + y, q: t(s.q.coordPlace, { p: pt(x, y) }), hint: s.hint.coordPlace, explain: t(s.explain.coordPlace, { x: x, y: y, p: pt(x, y) }) };
    },
    coordRead: function () {
      var s = S();
      for (;;) {
        var x = between(1, 8), y = between(1, 6), L = pick(s.pointNames);
        var cand = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1], [x + 1, y + 1], [y + 1, x]].filter(function (c) { return c[0] >= 0 && c[0] <= 8 && c[1] >= 0 && c[1] <= 6 && (c[0] !== x || c[1] !== y); });
        var wrong = uniq(cand.map(function (c) { return pt(c[0], c[1]); }));
        if (x !== y && y <= 8 && x <= 6) wrong = [pt(y, x)].concat(shuffle(wrong.filter(function (w) { return w !== pt(y, x); }))); // the classic mix-up first
        else wrong = shuffle(wrong);
        wrong = uniq(wrong).filter(function (w) { return w !== pt(x, y); }).slice(0, 3);
        if (wrong.length < 3) continue;
        return choice('coordRead', pt(x, y), wrong, { W: 8, H: 6, point: [x, y], label: L, q: t(s.q.coordRead, { L: L }), hint: s.hint.coordRead, explain: t(s.explain.coordRead, { L: L, p: pt(x, y), x: x, y: y }) });
      }
    },
    coordRect: function () {
      var s = S(), x1 = between(0, 5), x2 = between(x1 + 2, 8), y1 = between(0, 3), y2 = between(y1 + 2, 6), corners = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], miss = rnd(4);
      var shown = corners.filter(function (c, i) { return i !== miss; }), m = corners[miss];
      return { type: 'point', kind: 'coordRect', W: 8, H: 6, shown: shown, answer: m[0] + ',' + m[1], q: s.q.coordRect, hint: s.hint.coordRect, explain: t(s.explain.coordRect, { p: pt(m[0], m[1]) }) };
    },

    /* ---- Former og vinkler ---- */
    shapeName: function () {
      var s = S(), name = pick(['kvadrat', 'rektangel', 'trekant', 'cirkel', 'femkant', 'sekskant', 'parallelogram', 'trapez']), fig = shapeFig(name);
      var also = namesFor(fig), wrong = shuffle(Object.keys(s.shapes).filter(function (n) { return also.indexOf(n) < 0; })).slice(0, 3);
      return choice('shapeName', name, wrong, { fig: fig, q: s.q.shapeName, hint: s.hint.shapeName, explain: s.shapeFacts[name] });
    },
    angleKind: function () {
      var s = S(), kind = pick(['spids', 'ret', 'stump']), deg = kind === 'ret' ? 90 : kind === 'spids' ? between(25, 70) : between(110, 160), turn = between(-30, 30);
      var c = [50, 52], a = rot([90, 52], -turn, c), b = rot([90, 52], -turn - deg, c);
      return choice('angleKind', kind, ['spids', 'ret', 'stump'].filter(function (k) { return k !== kind; }), { vertex: c, rays: [[r2(a[0]), r2(a[1])], [r2(b[0]), r2(b[1])]], deg: deg,
        q: s.q.angleKind, hint: s.hint.angleKind, explain: s.angleFacts[kind] + ' ' + t(s.angleIs, { deg: deg }) });
    },
    rightAngles: function () {
      var s = S(), kind = pick(['kvadrat', 'rektangel', 'retTrekant', 'trekant', 'parallelogram', 'retTrapez', 'hus']), fig = shapeFig(kind), n = polyFacts(fig.poly).right;
      var wrong = shuffle(['0', '1', '2', '3', '4'].filter(function (x) { return x !== String(n); })).slice(0, 3);
      return choice('rightAngles', String(n), wrong, { fig: fig, q: s.q.rightAngles, hint: s.hint.rightAngles, explain: t(n === 0 ? s.explain.rightAngles0 : n === 1 ? s.explain.rightAngles1 : s.explain.rightAngles, { n: n }) });
    },

    /* ---- Fliserne: area and perimeter of shapes made of 1 m × 1 m tiles ---- */
    tiles: function (band, ask) {
      var s = S(); ask = ask || pick(['area', 'per']);
      for (;;) {
        var n = between(5, 11), cells = grow(n, function (x, y) { return x >= 0 && x < 7 && y >= 0 && y < 5; }, [between(2, 4), between(1, 3)]);
        if (!cells) continue;
        var a = cells.length, p = perimeter(cells), right = ask === 'area' ? a : p, unit = ask === 'area' ? s.m2 : s.m;
        var wrong = uniq([ask === 'area' ? p : a, right + 1, right - 1, right + 2, right - 2]).filter(function (x) { return x !== right && x > 0; });
        wrong = [wrong[0]].concat(shuffle(wrong.slice(1))).slice(0, 3);
        return choice(ask === 'area' ? 'tilesArea' : 'tilesPer', right + ' ' + unit, wrong.map(function (x) { return x + ' ' + unit; }), { W: 8, H: 6, given: cells,
          q: s.q[ask === 'area' ? 'tilesArea' : 'tilesPer'], hint: s.hint[ask === 'area' ? 'tilesArea' : 'tilesPer'], explain: t(s.explain[ask === 'area' ? 'tilesArea' : 'tilesPer'], { n: right }) });
      }
    },
    rect: function (band, ask) {
      var s = S(); ask = ask || pick(['area', 'per']);
      for (;;) {
        var l = between(3, 9), b = between(2, 7), a = l * b, p = 2 * (l + b);
        if (l === b || a === p) continue;
        var right = ask === 'area' ? a : p, unit = ask === 'area' ? s.m2 : s.m, wrong = uniq([ask === 'area' ? p : a, l + b, right + 2]).filter(function (x) { return x !== right; }).slice(0, 3);
        return choice(ask === 'area' ? 'rectArea' : 'rectPer', right + ' ' + unit, wrong.map(function (x) { return x + ' ' + unit; }), { l: l, b: b,
          q: t(s.q[ask === 'area' ? 'rectArea' : 'rectPer'], { l: l, b: b }), hint: s.hint[ask === 'area' ? 'rectArea' : 'rectPer'], explain: t(s.explain[ask === 'area' ? 'rectArea' : 'rectPer'], { l: l, b: b, n: right }) });
      }
    },

    /* ---- Grundene: area of triangles, parallelograms, trapezia and circles ---- */
    tri: function () {
      var s = S(), g = between(3, 10), h = between(2, 8), off = between(-2, g + 2), A2 = g * h; // A2 = twice the area
      return numTask('tri', A2 / 2, [], s.m2, { g: g, h: h, off: off, q: s.q.tri, hint: s.hint.tri, explain: t(s.explain.tri, { g: g, h: h, a: fmt(A2 / 2) }) });
    },
    para: function () {
      var s = S(), pair = pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [2, 3, 0], [1, 4, 0], [2, 5, 0]]), g = between(4, 10), o = pair[0], h = pair[1];
      return numTask('para', g * h, [], s.m2, { g: g, h: h, off: o, side: pair[2] || null, q: s.q.para, hint: s.hint.para, explain: t(s.explain.para, { g: g, h: h, a: g * h }) });
    },
    trap: function () {
      var s = S(), a = between(5, 11), b = between(2, a - 2), h = between(2, 7), off = between(0, a - b), A2 = (a + b) * h;
      return numTask('trap', A2 / 2, [], s.m2, { a: a, b: b, h: h, off: off, q: s.q.trap, hint: s.hint.trap, explain: t(s.explain.trap, { a: a, b: b, h: h, s: a + b, A: fmt(A2 / 2) }) });
    },
    circA: function () {
      var s = S(), r = between(2, 9), useD = Math.random() < 0.4, ans = roundFrac(314 * r * r, 100, 1), exact = fmt(314 * r * r / 100);
      return numTask('circA', ans, [Math.round(Math.PI * r * r * 10) / 10], s.m2, { r: r, d: useD ? 2 * r : null,
        q: t(useD ? s.q.circAd : s.q.circA, { r: r, d: 2 * r }) + ' ' + s.round1pi, hint: s.hint.circA, explain: t(s.explain.circA, { r: r, x: exact, a: fmt(ans, 1) }), round: 1 });
    },
    circO: function () {
      var s = S(), r = between(2, 9), ans = roundFrac(628 * r, 100, 1), exact = fmt(628 * r / 100);
      return numTask('circO', ans, [Math.round(2 * Math.PI * r * 10) / 10], s.m, { r: r, d: null,
        q: t(s.q.circO, { r: r }) + ' ' + s.round1pi, hint: s.hint.circO, explain: t(s.explain.circO, { r: r, x: exact, a: fmt(ans, 1) }), round: 1 });
    },

    /* ---- Målebordet: measuring and calculating on drawings ---- */
    room: function () {
      var s = S();
      for (;;) {
        var a = between(3, 9), b = between(2, a - 1), q = a * a + b * b, c = Math.sqrt(q), ans = Math.round(c * 10) / 10;
        if (Math.abs(c * 10 - Math.floor(c * 10) - 0.5) < 1e-6) continue;
        return numTask('room', ans, [], s.m, { a: a, b: b, q: t(s.q.room, { a: a, b: b }) + ' ' + s.round1, hint: s.hint.room, explain: t(s.explain.room, { a: a, b: b, s: q, c: fmt(ans, 1) }), round: 1 });
      }
    },
    ladder: function () {
      var s = S();
      for (;;) {
        var c = between(3, 8), a = between(1, Math.min(3, c - 1)), q = c * c - a * a, b = Math.sqrt(q), ans = Math.round(b * 10) / 10;
        if (Math.abs(b * 10 - Math.floor(b * 10) - 0.5) < 1e-6) continue;
        return numTask('ladder', ans, [], s.m, { a: a, c: c, q: t(s.q.ladder, { a: a, c: c }) + ' ' + s.round1, hint: s.hint.ladder, explain: t(s.explain.ladder, { a: a, c: c, s: q, b: fmt(ans, 1) }), round: 1 });
      }
    },
    paint: function (band, liters) {
      var s = S(), w = between(3, 8), h10 = pick([25, 30]), win = pick([[10, 10], [10, 15], [15, 10], [20, 10], [15, 15]]);
      var A100 = w * 10 * h10 - win[0] * win[1], v = { w: w, h: fmt(h10 / 10), ww: fmt(win[0] / 10), wh: fmt(win[1] / 10), wall: fmt(w * h10 / 10), win: fmt(win[0] * win[1] / 100), a: fmt(A100 / 100) };
      var fig = { w: w, h: h10 / 10, ww: win[0] / 10, wh: win[1] / 10 };
      v.wallText = t(s.paintWall, v);
      if (!liters) return numTask('paint', A100 / 100, [], s.m2, { fig: fig, q: t(s.q.paint, v), hint: s.hint.paint, explain: t(s.explain.paint, v) });
      var k = pick([4, 5, 6, 8]), L = Math.ceil(A100 / (k * 100)); v.k = k; v.L = L;
      v.x = fmt(Math.round(A100 / k) / 100); v.eq = A100 % k === 0 ? '=' : '≈';
      return numTask('paintL', L, [], s.liter, { fig: fig, k: k, q: t(s.q.paintL, v), hint: t(s.hint.paintL, v), explain: t(s.explain.paintL, v), round: 'up' });
    },
    pool: function (band, liters) {
      var s = S(), l = between(6, 12), b = between(3, 6), d10 = pick([10, 15, 20]), V10 = l * b * d10, v = { l: l, b: b, d: fmt(d10 / 10), V: fmt(V10 / 10), L: fmt(V10 * 100) };
      if (!liters) return numTask('pool', V10 / 10, [], s.m3, { l: l, b: b, d: d10 / 10, q: t(s.q.pool, v), hint: s.hint.pool, explain: t(s.explain.pool, v) });
      return numTask('poolL', V10 * 100, [], s.liter, { l: l, b: b, d: d10 / 10, q: t(s.q.poolL, v), hint: s.hint.poolL, explain: t(s.explain.poolL, v) });
    },
    box: function (band, ask) {
      var s = S(), l = between(10, 40), b = between(5, 25), h = between(5, 20), V = l * b * h, O = 2 * (l * b + l * h + b * h); ask = ask || pick(['V', 'O']);
      var v = { l: l, b: b, h: h, V: fmt(V), O: fmt(O), lb: l * b, lh: l * h, bh: b * h };
      return numTask(ask === 'V' ? 'boxV' : 'boxO', ask === 'V' ? V : O, [], ask === 'V' ? s.cm3 : s.cm2, { l: l, b: b, h: h, q: t(s.q[ask === 'V' ? 'boxV' : 'boxO'], v), hint: s.hint[ask === 'V' ? 'boxV' : 'boxO'], explain: t(s.explain[ask === 'V' ? 'boxV' : 'boxO'], v) });
    },
    cyl: function () {
      var s = S(), r = between(2, 5), h = between(4, 10), ans = roundFrac(314 * r * r * h, 100, 0);
      return numTask('cyl', ans, [Math.round(Math.PI * r * r * h)], s.liter, { r: r, h: h, q: t(s.q.cyl, { r: r, h: h }) + ' ' + s.round0pi, hint: s.hint.cyl,
        explain: t(s.explain.cyl, { r: r, h: h, x: fmt(314 * r * r * h / 100), a: fmt(ans) }), round: 0 });
    },
    scale: function (band, dir) {
      var s = S(), m = pick([20, 50, 100, 200]); dir = dir || pick(['up', 'down']);
      for (;;) {
        if (dir === 'up') { // drawing (cm) -> real (m)
          var c = between(2, 15), cm = c * m;
          if (cm % 10) continue;
          return numTask('scaleUp', cm / 100, [], s.m, { m: m, c: c, q: t(s.q.scaleUp, { m: m, c: c }), hint: t(s.hint.scaleUp, { m: m }), explain: t(s.explain.scaleUp, { m: m, c: c, cm: fmt(cm), a: fmt(cm / 100) }) });
        }
        var r10 = between(2, 24) * 5, d100 = r10 * 1000 / m; // real length in tenths of a metre; drawing in 1/100 cm
        if (d100 % 10 || d100 < 200) continue;
        return numTask('scaleDown', d100 / 100, [], s.cm, { m: m, r: r10 / 10, q: t(s.q.scaleDown, { m: m, r: fmt(r10 / 10) }), hint: t(s.hint.scaleDown, { m: m }), explain: t(s.explain.scaleDown, { m: m, r: fmt(r10 / 10), cm: fmt(r10 * 10), a: fmt(d100 / 100) }) });
      }
    },
    blocks: function () { // quick task: count the blocks on a plan with numbers
      var s = S(), h; do { h = tower(); } while (!h);
      var n = 0; h.forEach(function (col) { col.forEach(function (x) { n += x; }); });
      return numTask('blocks', n, [], s.blocksUnit, { heights: h, q: s.q.blocks, hint: s.hint.blocks, explain: t(s.explain.blocks, { n: n }) });
    }
  };

  /* ---------- helpers for the generators ---------- */
  function fits(cells, W, H) { return cells.every(function (c) { return c[0] >= 0 && c[1] >= 0 && c[0] < W && c[1] < H; }); }
  function overlap(a, b) { var s = cellSet(a); return b.some(function (c) { return s[ck(c)]; }); }
  function touching(a, b) { var s = cellSet(a); return b.some(function (c) { return DIRS.some(function (d) { return s[(c[0] + d[0]) + ',' + (c[1] + d[1])]; }); }); }
  // turns a cell around the grid point (px, py); clockwise as seen on the screen (y points down)
  function turnCell(c, px, py, deg, cw) {
    var u = c[0] - px, v = c[1] - py;
    if (deg === 180) return [px - u - 1, py - v - 1];
    if ((deg === 90) === !!cw) return [px - v - 1, py + u];
    return [px + v, py - u - 1];
  }
  function pt(x, y) { return '(' + x + ', ' + y + ')'; }
  function tower() { // 3 × 3 base, heights 0..3, every column visible in the drawing
    var W = 3, D = 3, h = [];
    for (var x = 0; x < W; x++) { h.push([]); for (var y = 0; y < D; y++) h[x].push(Math.random() < 0.25 ? 0 : between(1, 3)); }
    var n = 0, cols = 0; h.forEach(function (c) { c.forEach(function (v) { n += v; if (v) cols++; }); });
    if (n < 6 || n > 16 || cols < 5) return null;
    // the drawing looks from the front right and above: a stack may not hide the stacks behind it
    for (var x2 = 0; x2 < W; x2++) for (var y2 = 0; y2 < D; y2++) for (var k = 1; x2 + k < W && y2 - k >= 0; k++) if (h[x2 + k][y2 - k] >= h[x2][y2] + k) return null;
    // the stacks must stand together
    var seen = {}, start = null; h.forEach(function (c, i) { c.forEach(function (v, j) { if (v && !start) start = [i, j]; }); });
    var stack = [start]; seen[ck(start)] = 1; var cnt = 0;
    while (stack.length) { var p = stack.pop(); cnt++; DIRS.forEach(function (d) { var q = [p[0] + d[0], p[1] + d[1]]; if (q[0] >= 0 && q[0] < W && q[1] >= 0 && q[1] < D && h[q[0]][q[1]] && !seen[ck(q)]) { seen[ck(q)] = 1; stack.push(q); } }); }
    return cnt === cols ? h : null;
  }
  function viewDistractors(h, which, v) {
    var out = [];
    if (which === 'top') {
      var bits = v.top.split(':')[1].split('').map(Number), W = h.length, D = h[0].length, grid = function (f) { var o = []; for (var r = 0; r < D; r++) for (var x = 0; x < W; x++) o.push(f(x, r)); return 't' + W + ':' + o.join(''); };
      out.push(grid(function (x, r) { return bits[r * W + (W - 1 - x)]; }), grid(function (x, r) { return bits[(D - 1 - r) * W + x]; }), grid(function (x, r) { return bits[x * W + r]; }));
      for (var i = 0; i < 4; i++) { var k = rnd(W * D); out.push(grid(function (x, r) { return r * W + x === k ? 1 - bits[k] : bits[r * W + x]; })); }
    } else {
      var arr = v[which].slice(1).split('').map(Number), other = v[which === 'front' ? 'right' : 'front'];
      out.push(other, 'c' + arr.slice().reverse().join(''), 'c' + other.slice(1).split('').reverse().join(''));
      for (var j = 0; j < 6; j++) { var a2 = arr.slice(), m = rnd(a2.length); a2[m] = Math.max(0, Math.min(3, a2[m] + pick([-1, 1]))); out.push('c' + a2.join('')); }
      out = out.filter(function (o) { return /[1-9]/.test(o); });
    }
    return shuffle(uniq(out).filter(function (o) { return o !== v[which]; }));
  }
  function shapeFig(name) {
    var p, tilt = Math.random() < 0.4 ? 0 : between(-25, 25);
    switch (name) {
      case 'cirkel': var r = between(22, 32); return { circle: [50, 35, r] };
      case 'kvadrat': var a = between(30, 50); p = [[0, 0], [a, 0], [a, a], [0, a]]; break;
      case 'rektangel': var w = between(48, 70), hh = between(18, 32); p = [[0, 0], [w, 0], [w, hh], [0, hh]]; break;
      case 'trekant': case 'retTrekant':
        if (name === 'retTrekant') { var b = between(30, 60), c = between(25, 45); p = [[0, 0], [0, c], [b, c]]; break; }
        do { p = [[between(0, 30), between(0, 10)], [between(50, 80), between(0, 40)], [between(0, 40), between(40, 60)]]; } while (!convexOk(p) || minAngle(p) < 28 || Math.abs(maxAngle(p) - 90) < 10);
        break;
      case 'femkant': p = regular(5, Math.random() < 0.5); break;
      case 'sekskant': p = regular(6, Math.random() < 0.5); break;
      case 'parallelogram': var g = between(40, 60), o = between(12, 22) * pick([-1, 1]), h2 = between(24, 34); p = [[0, h2], [g, h2], [g + o, 0], [o, 0]]; break;
      case 'trapez': var b1 = between(56, 72), b2 = between(24, 40), o1 = between(6, b1 - b2 - 6), h3 = between(24, 34); p = [[0, h3], [b1, h3], [o1 + b2, 0], [o1, 0]]; break;
      case 'retTrapez': var c1 = between(50, 70), c2 = between(24, 40), h4 = between(26, 36); p = [[0, h4], [c1, h4], [c2, 0], [0, 0]]; break;
      case 'hus': var hw = between(40, 56), wall = between(22, 30), roof = between(12, 16); /* the roof top is clearly wider than 90° */ p = [[0, roof + wall], [hw, roof + wall], [hw, roof], [hw / 2, 0], [0, roof]]; break;
    }
    return { poly: fitPoly(p, tilt) };
  }

  /* ---------- checking an answer (the game and the tests use the same rule) ---------- */
  function check(tk, value) {
    switch (tk.type) {
      case 'fence':
        if (!value || value.length !== 4) return false;
        var w = Math.abs(value[2] - value[0]), h = Math.abs(value[3] - value[1]);
        return tk.solutions.some(function (s) { return s[0] === w && s[1] === h; });
      case 'cells': return Array.isArray(value) && value.slice().sort().join(';') === tk.answer.join(';');
      case 'number': var v = parseNum(value); return !isNaN(v) && tk.accept.some(function (a) { return Math.abs(a - v) < 1e-6; });
      default: return value === tk.answer;
    }
  }

  /* ---------- routes and rounds ---------- */
  var ROUTES = [
    { id: 'm-hegn', b: 'M', plan: [['fenceArea', 4], ['fencePer', 4]] },
    { id: 'm-spejl', b: 'M', plan: [['mirror', 4, 'v'], ['mirror', 4, 'h']] },
    { id: 'm-kasse', b: 'M', plan: [['netPick', 5], ['netYesNo', 3]] },
    { id: 'm-koord', b: 'M', plan: [['coordPlace', 3], ['coordRead', 3], ['coordRect', 2]] },
    { id: 'm-former', b: 'M', plan: [['shapeName', 4], ['angleKind', 2], ['rightAngles', 2]] },
    { id: 'm-fliser', b: 'M', plan: [['tiles', 3, 'area'], ['tiles', 3, 'per'], ['rect', 1, 'area'], ['rect', 1, 'per']] },
    { id: 'u-hegn', b: 'U', plan: [['fenceBoth', 3], ['fenceMax', 3], ['fenceMin', 2]] },
    { id: 'u-kran', b: 'U', plan: [['move', 2], ['rotate', 2], ['reflect', 1, 'vh'], ['reflect', 1, 'diag'], ['whichMove', 2]] },
    { id: 'u-kasse', b: 'U', plan: [['netPick', 4], ['netOpp', 4]] },
    { id: 'u-udsigt', b: 'U', plan: [['view', 2, 'front'], ['view', 2, 'right'], ['view', 2, 'top'], ['viewPlan', 2]] },
    { id: 'u-grund', b: 'U', plan: [['tri', 2], ['para', 2], ['trap', 1], ['circA', 2], ['circO', 1]] },
    { id: 'u-maal', b: 'U', plan: [['room', 1], ['ladder', 1], ['paint', 1], ['paintL', 1], ['pool', 1], ['box', 1], ['cyl', 1], ['scale', 1]] }
  ];
  // one task of a kind from a plan entry
  function make(kind, band, arg) {
    switch (kind) {
      case 'viewPlan': return gen.view(band, arg, true);
      case 'view': return gen.view(band, arg, false);
      case 'paintL': return gen.paint(band, true);
      case 'poolL': return gen.pool(band, true);
      default: return gen[kind](band, arg);
    }
  }
  function taskKey(tk) { return JSON.stringify([tk.kind, tk.q, tk.answer, tk.given || tk.fig || tk.figs || tk.heights || tk.point || tk.shown || tk.rays || null]); }
  function buildRound(route) {
    var list = [], seen = {};
    route.plan.forEach(function (p) {
      for (var i = 0, tries = 0; i < p[1] && tries < 60; tries++) {
        var tk = make(p[0], route.b, p[2]), k = taskKey(tk);
        if (seen[k] && tries < 50) continue;
        seen[k] = 1; list.push(tk); i++;
      }
    });
    if (route.id === 'm-spejl' || route.id === 'u-maal') return list; // easy to hard / a mix that is already varied
    return shuffle(list);
  }

  var G = {
    fmt: fmt, parseNum: parseNum, roundFrac: roundFrac, check: check,
    NETS: NETS, parseShape: parseShape, canon: canon, isNet: isNet, hexominoes: hexominoes, has2x2: has2x2, fold: fold, opposite: opposite, orient: orient,
    perimeter: perimeter, keys: keys, size: size, asymmetric: asymmetric, views: views, namesFor: namesFor, polyFacts: polyFacts, turnCell: turnCell, pt: pt,
    gen: gen, make: make, ROUTES: ROUTES, buildRound: buildRound, taskKey: taskKey, shuffle: shuffle, pick: pick, between: between
  };
  root.BP_GEO = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : global);
