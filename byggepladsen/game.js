/*
 * Byggepladsen – geometri og måling.
 * Bob har en byggeplads, og hver opgave er geometri. Mini-spil: Hegnet, Spejlet, Kassefabrikken, Tegnebordet,
 * Former og vinkler, Fliserne (mellemtrin) og Hegnet, Kranen, Kassefabrikken, Udsigten, Grundene, Målebordet (udskoling).
 * Frit byggeri er en sandkasse. Færdige byggeopgaver bliver til byggeprojekter.
 * Alle tegninger er SVG med farver som attributter, så de også virker i hubbens daglige udfordring.
 */
(function (root) {
  'use strict';
  var Core = root.Core, G = root.BP_GEO, Bob = root.Bob, S = root.STR.bp, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'byggepladsen', OUTFIT = 'builder';
  var app = null, st = null, timers = [], clock = 0, el = {};
  var C = { ink: '#4A2C17', grid: '#D8C7A2', gridL: '#E9DCC0', grass: '#D7EBBE', sand: '#FBF3E2', paper: '#FFFDF7', blue: '#3B86C4', blueL: '#CFE5F4', yellow: '#F7C548',
    green: '#3F8A3A', greenL: '#BFE3B4', red: '#C23B30', post: '#8B5A2B', tile: '#DCCDB4', tileLine: '#9C8A6E', top: '#FBD96B', front: '#F2A93B', side: '#D9822B', net: '#F6DDB0' };

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0 }); }
  function routes(band) { return G.ROUTES.filter(function (r) { return r.b === band; }).map(function (r) { return { id: r.id, b: r.b, plan: r.plan, name: S.routes[r.id].name, desc: S.routes[r.id].desc }; }); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function sayify(s) { S.say.forEach(function (p) { s = s.split(p[0]).join(p[1]); }); return s.replace(/\s+/g, ' '); }

  /* ================= SVG DRAWINGS (attributes only, no classes) ================= */
  function n2(x) { return Math.round(x * 1000) / 1000; }
  function svg(vb, inner, style) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.map(n2).join(' ') + '" style="' + (style || 'display:block;width:100%;height:auto') + '" aria-hidden="true">' + inner + '</svg>'; }
  function R(x, y, w, hh, fill, stroke, sw, extra) { return '<rect x="' + n2(x) + '" y="' + n2(y) + '" width="' + n2(w) + '" height="' + n2(hh) + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + sw + '"' : '') + (extra || '') + '/>'; }
  function L(x1, y1, x2, y2, stroke, sw, dash) { return '<line x1="' + n2(x1) + '" y1="' + n2(y1) + '" x2="' + n2(x2) + '" y2="' + n2(y2) + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }
  function P(pts, fill, stroke, sw, extra) { return '<polygon points="' + pts.map(function (p) { return n2(p[0]) + ',' + n2(p[1]); }).join(' ') + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round"' + (extra || '') + '/>'; }
  function Ci(x, y, r, fill, stroke, sw) { return '<circle cx="' + n2(x) + '" cy="' + n2(y) + '" r="' + n2(r) + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + sw + '"' : '') + '/>'; }
  function T(x, y, str, size, fill, anchor, extra) { return '<text x="' + n2(x) + '" y="' + n2(y) + '" font-size="' + size + '" fill="' + (fill || C.ink) + '" text-anchor="' + (anchor || 'middle') + '" font-family="Segoe UI, system-ui, sans-serif" font-weight="700"' + (extra || '') + '>' + esc(str) + '</text>'; }
  function grid(W, H, color, sw) { var s = ''; for (var x = 0; x <= W; x++) s += L(x, 0, x, H, color, sw); for (var y = 0; y <= H; y++) s += L(0, y, W, y, color, sw); return s; }
  function cellRects(cells, fill, stroke) { return cells.map(function (c) { return R(c[0] + 0.05, c[1] + 0.05, 0.9, 0.9, fill, stroke || C.ink, 0.05, ' rx="0.1"'); }).join(''); }
  function parseKey(k) { return k.split(',').map(Number); }
  function axisSvg(ax, W, H) {
    if (!ax) return '';
    var w = 0.1, c = C.red;
    if (ax.type === 'v') return L(ax.at, -0.2, ax.at, H + 0.2, c, w);
    if (ax.type === 'h') return L(-0.2, ax.at, W + 0.2, ax.at, c, w);
    if (ax.type === 'd') { var t0 = Math.max(-ax.px, -ax.py), t1 = Math.min(W - ax.px, H - ax.py); return L(ax.px + t0, ax.py + t0, ax.px + t1, ax.py + t1, c, w); }
    var a0 = Math.max(ax.px - W, -ax.py), a1 = Math.min(ax.px, H - ax.py); return L(ax.px - a0, ax.py + a0, ax.px - a1, ax.py + a1, c, w);
  }
  var M_CELLS = { l: 0.25, t: 0.25, r: 0.25, b: 0.25 }, M_POSTS = { l: 0.5, t: 0.5, r: 0.5, b: 0.5 }, M_COORD = { l: 1, t: 0.7, r: 0.8, b: 1 };
  function vb(W, H, m) { return [-m.l, -m.t, W + m.l + m.r, H + m.t + m.b]; }

  // the drawing for a cells task (Spejlet, Kranen, Fliserne, Frit byggeri)
  function cellsSvg(tk, sel, opts) {
    opts = opts || {};
    var s = R(0, 0, tk.W, tk.H, opts.bg || C.sand) + grid(tk.W, tk.H, C.grid, 0.03);
    if (opts.reveal) s += cellRects(tk.answer.map(parseKey), C.greenL, C.green);
    s += cellRects(tk.given, opts.givenFill || C.blue);
    if (tk.image) s += cellRects(tk.image, C.green);
    if (sel) s += Object.keys(sel).map(function (k) { var c = parseKey(k), bad = opts.wrong && opts.wrong[k]; return R(c[0] + 0.12, c[1] + 0.12, 0.76, 0.76, bad ? '#FBE1DD' : C.yellow, bad ? C.red : C.ink, 0.07, ' rx="0.1"'); }).join('');
    s += axisSvg(tk.axis, tk.W, tk.H);
    if (tk.center) s += Ci(tk.center[0], tk.center[1], 0.17, C.ink, '#fff', 0.06);
    return s;
  }
  function tilesSvg(tk) {
    return R(0, 0, tk.W, tk.H, C.grass) + grid(tk.W, tk.H, '#C3DCA5', 0.03) +
      tk.given.map(function (c) { return R(c[0], c[1], 1, 1, C.tile, C.tileLine, 0.05) + L(c[0] + 0.15, c[1] + 0.3, c[0] + 0.45, c[1] + 0.3, '#EFE4D0', 0.06); }).join('') +
      outline(tk.given, C.ink, 0.08);
  }
  function outline(cells, color, sw) { // the outer edges of a shape made of cells
    var s = {}, out = ''; cells.forEach(function (c) { s[c[0] + ',' + c[1]] = 1; });
    cells.forEach(function (c) {
      var x = c[0], y = c[1];
      if (!s[x + ',' + (y - 1)]) out += L(x, y, x + 1, y, color, sw);
      if (!s[x + ',' + (y + 1)]) out += L(x, y + 1, x + 1, y + 1, color, sw);
      if (!s[(x - 1) + ',' + y]) out += L(x, y, x, y + 1, color, sw);
      if (!s[(x + 1) + ',' + y]) out += L(x + 1, y, x + 1, y + 1, color, sw);
    });
    return out;
  }
  function fenceSvg(tk, a, b, opts) {
    opts = opts || {};
    var s = R(0, 0, tk.W, tk.H, C.grass) + grid(tk.W, tk.H, '#C3DCA5', 0.03);
    function pen(p, q, stroke, fill, dash) {
      var x0 = Math.min(p[0], q[0]), y0 = Math.min(p[1], q[1]), w = Math.abs(p[0] - q[0]), hh = Math.abs(p[1] - q[1]);
      var o = R(x0, y0, w, hh, fill, stroke, 0.13, dash ? ' stroke-dasharray="0.3 0.2"' : '');
      if (w > 1 && hh > 1) o += T(x0 + w / 2, y0 + 0.5, w + ' m', 0.4, C.ink) + T(x0 + 0.18, y0 + hh / 2 + 0.15, hh + ' m', 0.4, C.ink, 'start'); // small pens: the numbers under the board are enough
      return o;
    }
    if (opts.solution) s += pen([tk.answer[0], tk.answer[1]], [tk.answer[2], tk.answer[3]], C.green, 'rgba(191,227,180,.55)', true);
    if (a && b) s += pen(a, b, opts.ok ? C.green : C.post, 'rgba(247,197,72,.35)');
    for (var x = 0; x <= tk.W; x++) for (var y = 0; y <= tk.H; y++) s += Ci(x, y, 0.08, C.post);
    [a, b].forEach(function (p) { if (p) s += Ci(p[0], p[1], 0.2, C.yellow, C.ink, 0.06); });
    if (a && b) [[a[0], b[1]], [b[0], a[1]]].forEach(function (p) { s += Ci(p[0], p[1], 0.14, C.post); });
    return s;
  }
  // coordinate system, first quadrant; math y goes up, so a point (x, y) is drawn at (x, H - y)
  function coordSvg(tk, mark, opts) {
    opts = opts || {};
    var W = tk.W, H = tk.H, s = R(0, 0, W, H, C.paper) + grid(W, H, C.gridL, 0.03);
    s += L(0, H, W + 0.5, H, C.ink, 0.06) + L(0, H, 0, -0.5, C.ink, 0.06) + P([[W + 0.6, H], [W + 0.35, H - 0.13], [W + 0.35, H + 0.13]], C.ink, C.ink, 0.02) + P([[0, -0.6], [-0.13, -0.35], [0.13, -0.35]], C.ink, C.ink, 0.02);
    for (var x = 0; x <= W; x++) s += T(x, H + 0.55, String(x), 0.42, C.ink);
    for (var y = 1; y <= H; y++) s += T(-0.3, H - y + 0.15, String(y), 0.42, C.ink, 'end');
    s += T(W + 0.6, H + 0.6, S.axisX, 0.45, C.ink, 'middle', ' font-style="italic"') + T(-0.45, -0.35, S.axisY, 0.45, C.ink, 'middle', ' font-style="italic"');
    if (tk.shown) {
      var sh = tk.shown.map(function (p) { return [p[0], H - p[1]]; });
      for (var i = 0; i < sh.length - 1; i++) s += L(sh[i][0], sh[i][1], sh[i + 1][0], sh[i + 1][1], C.post, 0.1);
      sh.forEach(function (p) { s += Ci(p[0], p[1], 0.18, C.post, C.ink, 0.05); });
    }
    if (tk.point) s += Ci(tk.point[0], H - tk.point[1], 0.17, C.red) + T(tk.point[0] + 0.25, H - tk.point[1] - 0.22, tk.label, 0.5, C.red, 'start');
    if (opts.solution) { var sp = tk.answer.split(',').map(Number); s += Ci(sp[0], H - sp[1], 0.24, C.greenL, C.green, 0.08); }
    if (mark) s += Ci(mark[0], H - mark[1], 0.2, C.yellow, C.ink, 0.06);
    return s;
  }
  function netSvg(cells, opts) {
    opts = opts || {};
    var sz = G.size(cells), s = '';
    cells.forEach(function (c, i) {
      var fill = i === opts.mark ? C.yellow : opts.good === i ? C.greenL : C.net;
      s += R(c[0], c[1], 1, 1, fill, C.ink, 0.06);
      if (opts.labels && opts.labels[i]) s += T(c[0] + 0.5, c[1] + 0.68, opts.labels[i], 0.5, C.ink);
    });
    return svg([-0.1, -0.1, sz[0] + 0.2, sz[1] + 0.2], s, opts.style);
  }
  function viewSvg(code, style) {
    var s = '';
    if (code.charAt(0) === 't') {
      var p = code.slice(1).split(':'), W = +p[0], bits = p[1].split(''), D = bits.length / W;
      for (var r = 0; r < D; r++) for (var x = 0; x < W; x++) s += R(x, r, 1, 1, bits[r * W + x] === '1' ? C.front : '#fff', bits[r * W + x] === '1' ? C.ink : C.grid, 0.05);
      return svg([-0.15, -0.15, W + 0.3, D + 0.3], s, style);
    }
    var hs = code.slice(1).split('').map(Number), n = hs.length;
    for (var i = 0; i < n; i++) for (var z = 0; z < 3; z++) s += hs[i] > z ? R(i, 2 - z, 1, 1, C.front, C.ink, 0.05) : R(i + 0.02, 2 - z + 0.02, 0.96, 0.96, '#fff', C.gridL, 0.03);
    s += L(-0.1, 3, n + 0.1, 3, C.ink, 0.08);
    return svg([-0.15, -0.15, n + 0.3, 3.3], s, style);
  }
  // an isometric drawing of a block tower, seen from the front right and above
  function towerSvg(hgt, style) {
    var W = hgt.length, D = hgt[0].length, c = 0.866, u = 26;
    function pr(x, y, z) { return [(x + y) * c * u, (x - y) * 0.5 * u - z * u]; }
    var s = '';
    for (var gx = 0; gx <= W; gx++) { var a = pr(gx, 0, 0), b = pr(gx, D, 0); s += L(a[0], a[1], b[0], b[1], C.grid, 1); }
    for (var gy = 0; gy <= D; gy++) { var a2 = pr(0, gy, 0), b2 = pr(W, gy, 0); s += L(a2[0], a2[1], b2[0], b2[1], C.grid, 1); }
    for (var y = D - 1; y >= 0; y--) for (var x = 0; x < W; x++) for (var z = 0; z < hgt[x][y]; z++) {
      s += P([pr(x, y, z + 1), pr(x + 1, y, z + 1), pr(x + 1, y + 1, z + 1), pr(x, y + 1, z + 1)], C.top, C.ink, 1.3);
      s += P([pr(x, y, z), pr(x + 1, y, z), pr(x + 1, y, z + 1), pr(x, y, z + 1)], C.front, C.ink, 1.3);
      s += P([pr(x + 1, y, z), pr(x + 1, y + 1, z), pr(x + 1, y + 1, z + 1), pr(x + 1, y, z + 1)], C.side, C.ink, 1.3);
    }
    // labels: an arrow towards the front side and one towards the right side
    var f = pr(W / 2, 0, 0), r = pr(W, D / 2, 0);
    s += arrow(f[0] - 34, f[1] + 30, f[0] - 12, f[1] + 10) + T(f[0] - 40, f[1] + 46, S.viewLabelFront, 13, C.blue);
    s += arrow(r[0] + 34, r[1] + 30, r[0] + 12, r[1] + 10) + T(r[0] + 40, r[1] + 46, S.viewLabelRight, 13, C.blue);
    var top = pr(0, D, 3)[1] - 6;
    return svg([-62, top, (W + D) * c * u + 124, (W * 0.5 * u + 50) - top + 6], s, style);
  }
  function arrow(x1, y1, x2, y2) {
    var a = Math.atan2(y2 - y1, x2 - x1), k = 7;
    return L(x1, y1, x2, y2, C.blue, 2.4) + P([[x2, y2], [x2 - k * Math.cos(a - 0.5), y2 - k * Math.sin(a - 0.5)], [x2 - k * Math.cos(a + 0.5), y2 - k * Math.sin(a + 0.5)]], C.blue, C.blue, 1);
  }
  function planSvg(hgt, style) { // a top view with the number of blocks on every square
    var W = hgt.length, D = hgt[0].length, s = '';
    for (var x = 0; x < W; x++) for (var y = 0; y < D; y++) { var r = D - 1 - y, v = hgt[x][y]; s += R(x, r, 1, 1, v ? C.top : '#fff', C.ink, 0.05); if (v) s += T(x + 0.5, r + 0.68, String(v), 0.55, C.ink); }
    s += T(W / 2, D + 0.95, S.viewLabelFront, 0.36, C.blue) + L(W / 2, D + 0.62, W / 2, D + 0.15, C.blue, 0.06) + P([[W / 2, D + 0.08], [W / 2 - 0.1, D + 0.25], [W / 2 + 0.1, D + 0.25]], C.blue, C.blue, 0.02);
    s += T(W + 0.75, D / 2 - 0.15, S.viewLabelRight.split(' ')[0], 0.36, C.blue) + T(W + 0.75, D / 2 + 0.25, S.viewLabelRight.split(' ').slice(1).join(' '), 0.36, C.blue);
    s += L(W + 0.55, D / 2 + 0.5, W + 0.15, D / 2 + 0.5, C.blue, 0.06) + P([[W + 0.08, D / 2 + 0.5], [W + 0.25, D / 2 + 0.4], [W + 0.25, D / 2 + 0.6]], C.blue, C.blue, 0.02);
    return svg([-0.15, -0.15, W + 1.55, D + 1.25], s, style);
  }
  function shapeSvg(fig, style) {
    var s = fig.circle ? Ci(fig.circle[0], fig.circle[1], fig.circle[2], C.blueL, C.ink, 1.6) : P(fig.poly, C.blueL, C.ink, 1.6);
    return svg([-4, -4, 108, 78], s, style);
  }
  function angleSvg(tk, style) {
    var v = tk.vertex, a = tk.rays[0], b = tk.rays[1], a1 = Math.atan2(a[1] - v[1], a[0] - v[0]), a2 = Math.atan2(b[1] - v[1], b[0] - v[0]), r = 13;
    var p1 = [v[0] + r * Math.cos(a1), v[1] + r * Math.sin(a1)], p2 = [v[0] + r * Math.cos(a2), v[1] + r * Math.sin(a2)];
    var s = '<path d="M' + n2(v[0]) + ' ' + n2(v[1]) + ' L' + n2(p1[0]) + ' ' + n2(p1[1]) + ' A' + r + ' ' + r + ' 0 0 0 ' + n2(p2[0]) + ' ' + n2(p2[1]) + ' Z" fill="' + C.yellow + '" stroke="none"/>';
    s += L(v[0], v[1], a[0], a[1], C.ink, 2.2) + L(v[0], v[1], b[0], b[1], C.ink, 2.2) + Ci(v[0], v[1], 2, C.ink);
    var xs = [v[0], a[0], b[0]], ys = [v[1], a[1], b[1]], x0 = Math.min.apply(null, xs) - 6, y0 = Math.min.apply(null, ys) - 6;
    return svg([x0, y0, Math.max.apply(null, xs) + 6 - x0, Math.max.apply(null, ys) + 6 - y0], s, style || 'display:block;width:100%;height:auto;max-height:200px');
  }
  // measured drawings for the number tasks; lengths in metres (or cm/dm), drawn to scale
  function lab(x, y, str, anchor) { return T(x, y, str, 14, C.ink, anchor || 'middle'); }
  function rightMark(x, y, dx, dy) { var k = 9; return '<path d="M' + n2(x + dx * k) + ' ' + n2(y) + ' L' + n2(x + dx * k) + ' ' + n2(y + dy * k) + ' L' + n2(x) + ' ' + n2(y + dy * k) + '" fill="none" stroke="' + C.ink + '" stroke-width="1.2"/>'; }
  function figSvg(tk, style) {
    var s = '', k = tk.kind, W = 260, H = 170, sc, ox, oy;
    function X(x) { return ox + x * sc; } function Y(y) { return oy - y * sc; }
    function setScale(minX, maxX, maxY, w, hh) { sc = Math.min(w / (maxX - minX), hh / maxY); ox = (W - (maxX - minX) * sc) / 2 - minX * sc; oy = 30 + maxY * sc; H = oy + 34; }
    var m = ' m', u = function (v, unit) { return G.fmt(v) + ' ' + (unit || 'm'); };
    if (k === 'tri') {
      setScale(Math.min(0, tk.off), Math.max(tk.g, tk.off), tk.h, 200, 110);
      s += P([[X(0), Y(0)], [X(tk.g), Y(0)], [X(tk.off), Y(tk.h)]], C.blueL, C.ink, 2);
      if (tk.off < 0) s += L(X(tk.off), Y(0), X(0), Y(0), C.ink, 1.2, '4 4'); if (tk.off > tk.g) s += L(X(tk.g), Y(0), X(tk.off), Y(0), C.ink, 1.2, '4 4');
      s += L(X(tk.off), Y(tk.h), X(tk.off), Y(0), C.red, 1.8, '5 4') + rightMark(X(tk.off), Y(0), tk.off > tk.g / 2 ? -1 : 1, -1);
      s += lab(X(tk.g / 2), Y(0) + 22, u(tk.g)) + lab(X(tk.off) + (tk.off > tk.g / 2 ? -8 : 8), Y(tk.h / 2), u(tk.h), tk.off > tk.g / 2 ? 'end' : 'start');
    } else if (k === 'para') {
      setScale(0, tk.g + tk.off, tk.h, 210, 110);
      s += P([[X(0), Y(0)], [X(tk.g), Y(0)], [X(tk.g + tk.off), Y(tk.h)], [X(tk.off), Y(tk.h)]], C.blueL, C.ink, 2);
      if (tk.off > tk.g) s += L(X(tk.g), Y(0), X(tk.off), Y(0), C.ink, 1.2, '4 4');
      s += L(X(tk.off), Y(tk.h), X(tk.off), Y(0), C.red, 1.8, '5 4') + rightMark(X(tk.off), Y(0), 1, -1);
      s += lab(X(tk.g / 2), Y(0) + 22, u(tk.g)) + lab(X(tk.off) + 8, Y(tk.h / 2) + 5, u(tk.h), 'start');
      if (tk.side) s += lab(X(tk.off / 2) - 10, Y(tk.h / 2), u(tk.side), 'end');
    } else if (k === 'trap') {
      setScale(0, tk.a, tk.h, 210, 110);
      s += P([[X(0), Y(0)], [X(tk.a), Y(0)], [X(tk.off + tk.b), Y(tk.h)], [X(tk.off), Y(tk.h)]], C.blueL, C.ink, 2);
      s += L(X(tk.off), Y(tk.h), X(tk.off), Y(0), C.red, 1.8, '5 4') + rightMark(X(tk.off), Y(0), 1, -1);
      s += lab(X(tk.a / 2), Y(0) + 22, u(tk.a)) + lab(X(tk.off + tk.b / 2), Y(tk.h) - 9, u(tk.b)) + lab(X(tk.off) + 8, Y(tk.h / 2) + 5, u(tk.h), 'start');
    } else if (k === 'circA' || k === 'circO') {
      H = 180; var cx = 130, cy = 90, rr = 70;
      s += Ci(cx, cy, rr, C.greenL, C.ink, 2) + Ci(cx, cy, 3, C.ink);
      if (tk.d) s += L(cx - rr, cy, cx + rr, cy, C.red, 2) + lab(cx, cy - 10, 'd = ' + u(tk.d));
      else s += L(cx, cy, cx + rr, cy, C.red, 2) + lab(cx + rr / 2, cy - 10, 'r = ' + u(tk.r));
    } else if (k === 'room') {
      setScale(0, tk.a, tk.b, 190, 110);
      s += R(X(0), Y(tk.b), tk.a * sc, tk.b * sc, C.paper, C.ink, 3) + L(X(0), Y(0), X(tk.a), Y(tk.b), C.red, 2, '6 5');
      s += lab(X(tk.a / 2), Y(0) + 22, u(tk.a)) + lab(X(tk.a) + 8, Y(tk.b / 2) + 5, u(tk.b), 'start') + lab(X(tk.a / 2) - 6, Y(tk.b / 2) - 6, '?', 'end');
    } else if (k === 'ladder') {
      var bb = Math.sqrt(tk.c * tk.c - tk.a * tk.a);
      setScale(-0.6, tk.a + 0.4, bb + 0.3, 150, 120);
      s += R(X(-0.6), Y(bb + 0.3), 0.6 * sc, (bb + 0.3) * sc, '#E3C9A8', C.ink, 1.5) + L(X(-0.8), Y(0), X(tk.a + 0.6), Y(0), C.green, 3);
      s += L(X(tk.a), Y(0), X(0), Y(bb), C.post, 5) + L(X(tk.a), Y(0), X(0), Y(bb), C.yellow, 1.5, '2 6');
      s += lab(X(tk.a / 2), Y(0) + 22, u(tk.a)) + lab(X(tk.a / 2) + 10, Y(bb / 2) - 4, u(tk.c), 'start') + lab(X(-0.6) - 8, Y(bb / 2) + 5, '?', 'end');
    } else if (k === 'paint' || k === 'paintL') {
      var f = tk.fig; setScale(0, f.w, f.h, 170, 110);
      var wx = (f.w - f.ww) / 2, wy = (f.h - f.wh) / 2 + 0.2;
      s += R(X(0), Y(f.h), f.w * sc, f.h * sc, '#F9E6C4', C.ink, 2) + R(X(wx), Y(wy + f.wh), f.ww * sc, f.wh * sc, C.blueL, C.ink, 2);
      s += L(X(wx + f.ww / 2), Y(wy + f.wh), X(wx + f.ww / 2), Y(wy), C.ink, 1.2);
      s += lab(X(f.w / 2), Y(0) + 22, u(f.w)) + lab(X(0) - 8, Y(f.h / 2) + 5, u(f.h), 'end');
      s += T(X(wx + f.ww / 2), Y(wy) + 14, u(f.ww), 12, C.blue) + T(X(wx + f.ww) + 5, Y(wy + f.wh / 2) + 4, u(f.wh), 12, C.blue, 'start');
    } else if (k === 'pool' || k === 'poolL' || k === 'boxV' || k === 'boxO') {
      var bl = tk.l, bw = tk.b, bh = k.indexOf('pool') === 0 ? tk.d : tk.h, unit = k.indexOf('pool') === 0 ? 'm' : 'cm';
      var dx = 0.5 * Math.cos(Math.PI / 6), dy = 0.5 * Math.sin(Math.PI / 6), spanX = bl + bw * dx, spanY = bh + bw * dy;
      sc = Math.min(190 / spanX, 110 / spanY); ox = (W - spanX * sc) / 2; oy = 30 + spanY * sc; H = oy + 34;
      var q = function (x, y, z) { return [ox + (x + y * dx) * sc, oy - (z + y * dy) * sc]; };
      var fill = unit === 'm' ? '#BFE0F2' : '#E8CFA6';
      s += P([q(0, 0, bh), q(bl, 0, bh), q(bl, bw, bh), q(0, bw, bh)], unit === 'm' ? '#DDF0FA' : '#F2DDB8', C.ink, 1.8) + P([q(0, 0, 0), q(bl, 0, 0), q(bl, 0, bh), q(0, 0, bh)], fill, C.ink, 1.8) + P([q(bl, 0, 0), q(bl, bw, 0), q(bl, bw, bh), q(bl, 0, bh)], unit === 'm' ? '#9CCBE6' : '#D4B485', C.ink, 1.8);
      var p1 = q(bl / 2, 0, 0), p2 = q(0, 0, bh / 2), p3 = q(bl, bw / 2, 0);
      s += lab(p1[0], p1[1] + 22, u(bl, unit)) + lab(p2[0] - 8, p2[1] + 5, u(bh, unit), 'end') + lab(p3[0] + 8, p3[1] + 14, u(bw, unit), 'start');
    } else if (k === 'cyl') {
      sc = Math.min(70 / tk.r, 110 / tk.h); var rx = tk.r * sc, ry = rx * 0.3, top = 34, bot = top + tk.h * sc, ccx = 130; H = bot + ry + 26;
      s += '<path d="M' + n2(ccx - rx) + ' ' + top + ' L' + n2(ccx - rx) + ' ' + n2(bot) + ' A' + n2(rx) + ' ' + n2(ry) + ' 0 0 0 ' + n2(ccx + rx) + ' ' + n2(bot) + ' L' + n2(ccx + rx) + ' ' + top + '" fill="#9CCBE6" stroke="' + C.ink + '" stroke-width="1.8"/>';
      s += '<ellipse cx="' + ccx + '" cy="' + top + '" rx="' + n2(rx) + '" ry="' + n2(ry) + '" fill="#DDF0FA" stroke="' + C.ink + '" stroke-width="1.8"/>';
      s += L(ccx, top, ccx + rx, top, C.red, 2) + lab(ccx + rx / 2, top - 8, u(tk.r, 'dm')) + lab(ccx + rx + 8, (top + bot) / 2 + 5, u(tk.h, 'dm'), 'start');
    } else if (k === 'scaleUp' || k === 'scaleDown') {
      H = 150; s += R(40, 30, 180, 70, C.paper, C.ink, 3) + R(150, 30, 70, 40, 'none', C.ink, 2) + L(40, 118, 220, 118, C.red, 2) + L(40, 112, 40, 124, C.red, 2) + L(220, 112, 220, 124, C.red, 2);
      s += lab(130, 140, k === 'scaleUp' ? tk.c + ' cm' : G.fmt(tk.r) + ' m') + T(46, 22, t(S.scaleTag, { m: tk.m }), 13, C.blue, 'start');
    } else if (k === 'blocks') return planSvg(tk.heights, style);
    return svg([0, 0, W, H], s, style || 'display:block;width:100%;height:auto;max-height:240px');
  }
  function rectSvg(tk, style) {
    var sc2 = Math.min(180 / tk.l, 100 / tk.b), w = tk.l * sc2, hh = tk.b * sc2, x0 = (260 - w) / 2;
    var s = R(x0, 20, w, hh, '#CDE6B0', C.ink, 2.5) + lab(x0 + w / 2, 20 + hh + 22, tk.l + ' m') + lab(x0 + w + 8, 20 + hh / 2 + 5, tk.b + ' m', 'start');
    return svg([0, 0, 260, hh + 52], s, style || 'display:block;width:100%;height:auto;max-height:200px');
  }

  /* ---------- hub API ---------- */
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = routes(band);
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    routes('M').concat(routes('U')).forEach(function (r) { var rs = (d.routes || {})[r.id]; if (rs && rs.plays) rows.push([r.name + ' (' + r.b + ')', rs.stars + '/3', rs.best + ' %']); });
    return { head: S.reportHead, rows: rows };
  }
  function progress(d) {
    var rs = (d && d.routes) || {}, plays = 0, bands = { M: [], U: [] };
    G.ROUTES.forEach(function (r) { var x = rs[r.id] || {}; plays += x.plays || 0; bands[r.b].push(x.stars || 0); });
    return { plays: plays, bands: bands };
  }
  function collection(d) {
    var rs = (d && d.routes) || {};
    return { n: G.ROUTES.filter(function (r) { return (rs[r.id] || {}).stars > 0; }).length, max: G.ROUTES.length };
  }
  // the daily challenge: one self-contained task from the route with the fewest stars
  var QS = 'display:block;width:100%;max-width:300px;height:auto;max-height:220px;margin:0 auto';
  function quickTask(band, d) {
    band = band === 'U' ? 'U' : 'M';
    var rs = (d && d.routes) || {}, list = G.ROUTES.filter(function (r) { return r.b === band; });
    var least = Math.min.apply(null, list.map(function (r) { return (rs[r.id] || {}).stars || 0; }));
    var r = pick(list.filter(function (x) { return ((rs[x.id] || {}).stars || 0) === least; }));
    var q = quickFor(r.id, band);
    q.speak = sayify(q.q); q.lang = 'da'; q.route = r.id;
    return q;
  }
  function plainNum(tk) { return String(tk.accept[0]).replace('.', ','); }
  function quickFor(id, band) {
    var g = G.gen, tk, html;
    function asChoice(tk2, html2, label) {
      var lb = label || function (o) { return o; };
      return { q: tk2.q, html: html2, options: tk2.options.map(lb), answer: lb(tk2.answer), hint: tk2.hint, explain: tk2.explain };
    }
    function asNumber(tk2, html2) { return { q: tk2.q, html: html2, input: 'number', answer: plainNum(tk2), unit: tk2.unit, hint: tk2.hint, explain: tk2.explain }; }
    switch (id) {
      case 'm-hegn': tk = g.rect(band); return asChoice(tk, rectSvg(tk, QS));
      case 'm-spejl':
        tk = g.mirror(band); var n = tk.answer.length, opts = G.shuffle([n, n + 1, n - 1, n + 2].filter(function (x) { return x > 0; }).slice(0, 4).map(String));
        return { q: S.q.mirrorCount, html: svg(vb(tk.W, tk.H, M_CELLS), cellsSvg(tk, null), QS), options: opts, answer: String(n), hint: S.hint.mirror, explain: t(S.explain.mirrorCount, { n: n }) };
      case 'm-kasse': tk = g.netYesNo(); return asChoice(tk, netSvg(tk.fig, { style: QS }), function (o) { return o === 'yes' ? S.yes : S.no; });
      case 'm-koord': tk = g.coordRead(); return asChoice(tk, svg(vb(tk.W, tk.H, M_COORD), coordSvg(tk), QS));
      case 'm-former':
        var kind = pick(['shapeName', 'angleKind', 'rightAngles']); tk = g[kind]();
        if (kind === 'shapeName') return asChoice(tk, shapeSvg(tk.fig, QS), function (o) { return S.shapes[o]; });
        if (kind === 'angleKind') return asChoice(tk, angleSvg(tk, QS), function (o) { return S.angleNames[o]; });
        return asChoice(tk, shapeSvg(tk.fig, QS));
      case 'm-fliser': tk = g.tiles(band); return asChoice(tk, svg(vb(tk.W, tk.H, M_CELLS), tilesSvg(tk), QS));
      case 'u-hegn':
        tk = g.fenceMax(); return { q: t(S.q.fenceMaxNum, { p: tk.per }), input: 'number', answer: String(tk.area), unit: S.m2, hint: tk.hint, explain: tk.explain };
      case 'u-kran': tk = g.whichMove(); return asChoice(tk, svg(vb(tk.W, tk.H, M_CELLS), cellsSvg(tk, null), QS), function (o) { return S.moveNames[o]; });
      case 'u-kasse': // the daily card takes at most four options: the answer and three other squares
        tk = g.netOpp(); tk.options = G.shuffle([tk.answer].concat(G.shuffle(tk.options.filter(function (o) { return o !== tk.answer; })).slice(0, 3)));
        return asChoice(tk, netSvg(tk.fig, { mark: tk.mark, labels: tk.labels, style: QS }));
      case 'u-udsigt': tk = g.blocks(); return asNumber(tk, planSvg(tk.heights, QS));
      case 'u-grund': tk = g[pick(['tri', 'para', 'trap', 'circA'])](); return asNumber(tk, figSvg(tk, QS));
      default: tk = G.make(pick(['room', 'ladder', 'pool', 'box', 'scale', 'paint']), band); return asNumber(tk, figSvg(tk, QS));
    }
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearTimers(); clearInterval(clock); Core.stopSpeaking(); st = null; el = {}; Core.save(); }

  /* ================= MAP ================= */
  function showMap() {
    clearTimers(); Core.stopSpeaking(); st = null; el = {};
    var d = data(), list = routes(d.band), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (routeState(list[i].id).stars < 3) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen bp-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back), h('button', { type: 'button', class: 'btn secondary bp-projects-btn', onclick: showProjects }, S.projects + ' (' + collection(d).n + ')')]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id);
        return h('button', { type: 'button', class: 'rs-world bp-route' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, r.name), h('span', { class: 'rs-world-desc' }, r.desc), h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      })),
      h('button', { type: 'button', class: 'bp-sandbox-btn', onclick: function () { Core.play('click'); showSandbox(); } }, [
        h('span', { class: 'bp-sandbox-ico', 'aria-hidden': 'true', html: svg([0, 0, 4, 3], cellRects([[0, 2], [1, 2], [2, 2], [1, 1], [2, 1], [2, 0]], C.front), 'display:block;width:100%;height:auto') }),
        h('span', {}, [h('strong', {}, S.sandbox), h('span', {}, S.sandboxDesc)])])
    ]));
  }

  /* ================= PROJECTS (collection) ================= */
  function projectSvg(i, done) {
    var c = done ? ['#F28C28', '#3B86C4', '#3F8A3A', '#C23B30', '#8E5BB5', '#D9822B'][i % 6] : '#C9B58A', f = done ? '#FFF6DE' : '#F4ECDC', s = L(4, 54, 76, 54, C.ink, 2);
    switch (i) {
      case 0: s += R(14, 26, 52, 28, f, c, 3) + L(14, 40, 66, 40, c, 2) + [14, 27, 40, 53, 66].map(function (x) { return L(x, 22, x, 54, c, 3); }).join(''); break; // sheep pen
      case 1: s += P([[14, 54], [14, 30], [40, 14], [66, 30], [66, 54]], f, c, 3) + R(34, 40, 12, 14, c) + P([[40, 30], [30, 24], [30, 36]], c, c, 1) + P([[40, 30], [50, 24], [50, 36]], c, c, 1); break; // butterfly house
      case 2: s += R(22, 34, 20, 20, f, c, 3) + R(42, 34, 20, 20, f, c, 3) + R(32, 14, 20, 20, f, c, 3) + Ci(42, 24, 2.5, c) + Ci(32, 44, 2.5, c) + Ci(52, 44, 2.5, c); break; // dice tower
      case 3: s += R(12, 30, 18, 24, f, c, 3) + L(30, 30, 64, 54, c, 4) + L(20, 30, 20, 18, c, 3) + P([[14, 18], [26, 18], [20, 10]], c, c, 2); break; // playground
      case 4: s += R(12, 30, 56, 24, f, c, 3) + P([[8, 30], [40, 12], [72, 30]], f, c, 3) + R(36, 40, 8, 14, c) + R(18, 36, 8, 8, c) + R(54, 36, 8, 8, c) + L(40, 12, 40, 2, c, 2) + R(40, 2, 9, 6, c); break; // school
      case 5: s += P([[10, 54], [22, 30], [58, 30], [70, 54]], f, c, 3) + L(16, 42, 64, 42, c, 2) + L(34, 30, 30, 54, c, 2) + L(46, 30, 50, 54, c, 2); break; // terrace
      case 6: s += '<ellipse cx="40" cy="40" rx="32" ry="13" fill="' + f + '" stroke="' + c + '" stroke-width="3"/><ellipse cx="40" cy="40" rx="18" ry="5" fill="#D7EBBE" stroke="' + c + '" stroke-width="2"/>' + [12, 26, 54, 68].map(function (x) { return L(x, 30, x, 24, c, 2); }).join(''); break; // riding arena
      case 7: s += R(20, 10, 6, 44, f, c, 3) + R(10, 10, 56, 6, f, c, 3) + L(58, 16, 58, 32, C.ink, 1.5) + R(52, 32, 12, 8, c) + '<path d="M4 50 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0" fill="none" stroke="#6BB8E0" stroke-width="3"/>'; break; // harbour crane
      case 8: s += R(14, 34, 24, 20, f, c, 3) + R(40, 34, 24, 20, f, c, 3) + R(26, 14, 26, 20, f, c, 3) + L(26, 34, 26, 54, c, 2) + L(52, 34, 52, 54, c, 2) + L(39, 14, 39, 34, c, 2); break; // parcels
      case 9: s += P([[28, 54], [34, 12], [46, 12], [52, 54]], f, c, 3) + L(31, 33, 49, 33, c, 2) + L(30, 44, 50, 44, c, 2) + R(30, 4, 20, 8, c) + L(32, 22, 48, 22, c, 2); break; // lookout tower
      case 10: s += R(36, 34, 8, 20, c) + Ci(40, 24, 16, f, c, 3) + R(54, 44, 18, 4, c) + L(56, 48, 56, 54, c, 2) + L(70, 48, 70, 54, c, 2); break; // park
      default: s += R(8, 26, 64, 28, f, c, 3) + P([[4, 26], [40, 10], [76, 26]], f, c, 3) + '<path d="M16 44 q6 -5 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#3B86C4" stroke-width="3"/>'; // swimming hall
    }
    return svg([0, 0, 80, 60], s, 'display:block;width:100%;height:auto');
  }
  function showProjects() {
    var d = data(), col = collection(d);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.projectsTitle)]),
      h('p', { class: 'lead' }, col.n ? t(S.projectsCount, { n: col.n, max: col.max }) : S.projectsEmpty),
      h('ul', { class: 'bp-projects' }, G.ROUTES.map(function (r, i) {
        var done = (d.routes[r.id] || {}).stars > 0;
        return h('li', { class: 'card bp-project' + (done ? ' done' : '') }, [
          h('div', { class: 'bp-project-art', html: projectSvg(i, done) }), h('strong', {}, S.projectNames[r.id]),
          h('span', { class: 'muted small' }, done ? S.projectDone : t(S.projectLocked, { route: S.routes[r.id].name, band: r.b === 'M' ? SC.bandM : SC.bandU }))]);
      }))
    ]));
  }

  /* ================= SANDBOX ================= */
  function showSandbox() {
    Core.visit(ID + ':sandbox');
    var d = data(), W = 10, H = 7, sel = {}, mirror = !!d.sandboxMirror;
    (d.sandbox || []).forEach(function (k) { var c = parseKey(k); if (c[0] >= 0 && c[0] < W && c[1] >= 0 && c[1] < H) sel[k] = 1; });
    var tk = { W: W, H: H, given: [], axis: null }, b = board(W, H, M_CELLS), area = h('strong', {}), per = h('strong', {});
    function draw() {
      var cells = Object.keys(sel).map(parseKey);
      tk.axis = mirror ? { type: 'v', at: W / 2 } : null;
      b.svg.innerHTML = R(0, 0, W, H, C.sand) + grid(W, H, C.grid, 0.03) + cellRects(cells, C.front) + (cells.length ? outline(cells, C.ink, 0.08) : '') + axisSvg(tk.axis, W, H);
      area.textContent = t(S.sandboxArea, { n: cells.length }); per.textContent = t(S.sandboxPer, { n: cells.length ? G.perimeter(cells) : 0 });
      d.sandbox = Object.keys(sel); d.sandboxMirror = mirror; Core.saveSoon();
    }
    for (var x = 0; x < W; x++) for (var y = 0; y < H; y++) (function (x, y) {
      b.hit(x, y, 1, 1, { 'data-c': x + ',' + y, 'aria-label': t(S.cellLabel, { r: y + 1, c: x + 1 }) }, function () {
        var k = x + ',' + y, on = !sel[k];
        [k].concat(mirror ? [(W - 1 - x) + ',' + y] : []).forEach(function (kk) { if (on) sel[kk] = 1; else delete sel[kk]; });
        Core.play(on ? 'step' : 'click'); draw();
      });
    })(x, y);
    var sw = h('input', { type: 'checkbox', onchange: function () { mirror = sw.checked; draw(); } }); sw.checked = mirror;
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen bp-sandbox' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.sandbox)]),
      h('p', {}, S.sandboxHelp),
      h('div', { class: 'bp-live', role: 'status', 'aria-live': 'polite' }, [area, per]),
      b.el,
      h('div', { class: 'row center bp-sandbox-tools' }, [
        h('label', { class: 'switch', title: S.sandboxMirrorHelp }, [sw, h('span', { class: 'track' }), S.sandboxMirror]),
        h('button', { type: 'button', class: 'btn ghost', onclick: function () { sel = {}; Core.play('click'); draw(); } }, S.clear)]),
      h('p', { class: 'muted small center-text' }, S.sandboxMirrorHelp)
    ]));
    draw();
  }

  /* ================= BOARD (SVG drawing + a layer of real buttons) ================= */
  function board(W, H, m) {
    var v = vb(W, H, m), box = h('div', { class: 'bp-board', style: '--ar:' + (v[2] / v[3]).toFixed(4) });
    box.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + v.join(' ') + '" aria-hidden="true"></svg>';
    var layer = h('div', { class: 'bp-hits' }); box.appendChild(layer);
    return { el: box, svg: box.firstChild, layer: layer,
      // a button covering the box (x0, y0, w, hh) in grid units
      hit: function (x0, y0, w, hh, attrs, fn) {
        var b = h('button', { type: 'button', class: 'bp-hit', style: 'left:' + ((x0 - v[0]) / v[2] * 100).toFixed(3) + '%;top:' + ((y0 - v[1]) / v[3] * 100).toFixed(3) + '%;width:' + (w / v[2] * 100).toFixed(3) + '%;height:' + (hh / v[3] * 100).toFixed(3) + '%', onclick: fn });
        for (var k in attrs) b.setAttribute(k, attrs[k]);
        layer.appendChild(b); return b;
      } };
  }

  /* ================= PLAY ================= */
  function startRound(route) {
    clearTimers(); Core.stopSpeaking();
    st = { route: route, tasks: G.buildRound(route), i: 0, results: [], attempt: 0, locked: false };
    app.innerHTML = '';
    el.step = h('span', { class: 'rs-wave' });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, route.name), el.step]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', onclick: readTask }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.scene = h('div', { class: 'oj-scene bp-scene' });
    el.scene.innerHTML = '<svg class="bp-site" viewBox="0 0 260 110" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">' +
      '<g stroke="' + C.ink + '" stroke-width="2" stroke-linejoin="round">' + R(196, 8, 8, 102, '#F2B33D') + R(120, 6, 136, 7, '#F2B33D') + R(120, 13, 22, 10, '#8E9AA8') + L(200, 8, 186, -6, C.ink, 2) + L(200, 8, 236, 6, C.ink, 1.5) + '</g>' +
      L(232, 13, 232, 52, C.ink, 1.5) + R(222, 52, 20, 10, '#C8553D', C.ink, 1.5) +
      '<g stroke="' + C.ink + '" stroke-width="1.5">' + R(70, 90, 18, 10, '#C8553D') + R(88, 90, 18, 10, '#C8553D') + R(106, 90, 18, 10, '#C8553D') + R(79, 80, 18, 10, '#C8553D') + R(97, 80, 18, 10, '#C8553D') + R(88, 70, 18, 10, '#C8553D') + '</g>' +
      P([[20, 110], [28, 92], [36, 110]], '#F28C28', C.ink, 1.5) + R(22, 101, 12, 3, '#fff') + P([[150, 110], [158, 92], [166, 110]], '#F28C28', C.ink, 1.5) + R(152, 101, 12, 3, '#fff') + '</svg>';
    el.bob = h('div', { class: 'oj-bob bp-bob' }); el.bubble = h('div', { class: 'oj-bubble', role: 'status', 'aria-live': 'polite' });
    el.scene.appendChild(el.bob); el.scene.appendChild(el.bubble);
    el.task = h('div', { class: 'oj-task bp-task' });
    el.root = h('div', { class: 'oj-play bp-play' }, [hud, el.scene, h('div', { class: 'oj-task-wrap' }, el.task)]);
    app.appendChild(el.root);
    setBob('hello', pick(S.bobStart));
    showTask();
  }
  function setBob(expr, text) {
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: OUTFIT, size: 200 });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text) { el.bubble.textContent = text; el.bubble.classList.add('show'); clearTimeout(el.bubbleTimer); el.bubbleTimer = setTimeout(function () { el.bubble && el.bubble.classList.remove('show'); }, 3800); }
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ), h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }
  function task() { return st.tasks[st.i]; }
  function label(tk, o) {
    switch (tk.kind) {
      case 'whichMove': return S.moveNames[o];
      case 'netYesNo': return o === 'yes' ? S.yes : S.no;
      case 'shapeName': return S.shapes[o];
      case 'angleKind': return S.angleNames[o];
      default: return o;
    }
  }
  function textOptions(tk) { return ['netPick', 'view', 'viewPlan', 'netOpp'].indexOf(tk.kind) < 0; }
  function readTask() {
    var tk = task(); if (!tk) return;
    Core.speak(sayify(tk.q + (tk.type === 'choice' && textOptions(tk) ? '. ' + tk.options.map(function (o) { return label(tk, o); }).join('. ') : '')));
  }
  function showTask() {
    clearTimers();
    var tk = task(); if (!tk) return finish();
    st.attempt = 0; st.locked = false;
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    el.task.innerHTML = '';
    el.task.appendChild(h('p', { class: 'oj-prompt bp-q' }, tk.q));
    el.body = h('div', { class: 'oj-body bp-body k-' + tk.kind }); el.task.appendChild(el.body);
    el.feedback = h('div', { class: 'oj-feedback', role: 'status', 'aria-live': 'polite' }); el.task.appendChild(el.feedback);
    ({ fence: renderFence, cells: renderCells, point: renderPoint, number: renderNumber, choice: renderChoice })[tk.type](tk);
    el.task.classList.remove('enter'); void el.task.offsetWidth; el.task.classList.add('enter');
  }
  // a drawing and its controls: side by side on wide screens, under each other on phones
  function split(main, side) { el.body.classList.add('split'); el.body.appendChild(h('div', { class: 'bp-main' }, main)); el.body.appendChild(h('div', { class: 'bp-side' }, side)); }
  function checkBtn(fn, text) { return h('button', { type: 'button', class: 'btn primary bp-check', onclick: fn }, text || S.check); }

  /* ---------- Hegnet ---------- */
  function renderFence(tk) {
    var b = board(tk.W, tk.H, M_POSTS), a = null, c = null, status = h('p', { class: 'bp-status' }), live = h('div', { class: 'bp-live', 'aria-live': 'polite' }), btn;
    function draw(opts) {
      b.svg.innerHTML = fenceSvg(tk, a, c, opts);
      var w = a && c ? Math.abs(a[0] - c[0]) : 0, hh = a && c ? Math.abs(a[1] - c[1]) : 0;
      live.innerHTML = '';
      live.appendChild(h('span', {}, [S.fenceArea + ': ', h('strong', {}, (w * hh) + ' ' + S.m2)]));
      live.appendChild(h('span', {}, [S.fencePer + ': ', h('strong', {}, (w && hh ? 2 * (w + hh) : 0) + ' ' + S.m)]));
      status.textContent = !a ? S.fenceStart : !c ? S.fenceNext : S.fenceDone;
      btn.disabled = st.locked || !(w && hh);
    }
    for (var x = 0; x <= tk.W; x++) for (var y = 0; y <= tk.H; y++) (function (x, y) {
      b.hit(x - 0.5, y - 0.5, 1, 1, { 'data-p': x + ',' + y, 'aria-label': t(S.postLabel, { p: G.pt(x, y) }) }, function () {
        if (st.locked) return;
        if (!a || c) { a = [x, y]; c = null; } else if (a[0] === x && a[1] === y) a = null; else c = [x, y];
        Core.play('step'); draw();
      });
    })(x, y);
    btn = checkBtn(function () { answer([a[0], a[1], c[0], c[1]], b.el); }, S.buildFence);
    el.view = { draw: draw, solution: function () { draw({ solution: true }); }, ok: function () { draw({ ok: true }); } };
    split(b.el, [live, status, h('div', { class: 'row center' }, btn)]);
    draw();
  }

  /* ---------- Spejlet / Kranen: tap cells ---------- */
  function renderCells(tk) {
    var b = board(tk.W, tk.H, M_CELLS), sel = {}, fixed = {}, count = h('p', { class: 'bp-status' }), btn, clr, wrong = null;
    tk.given.forEach(function (c) { fixed[c[0] + ',' + c[1]] = 1; });
    function draw(opts) {
      b.svg.innerHTML = cellsSvg(tk, sel, { reveal: opts && opts.reveal, wrong: wrong });
      count.textContent = t(S.cellsCount, { n: Object.keys(sel).length });
      btn.disabled = clr.disabled = st.locked;
    }
    for (var x = 0; x < tk.W; x++) for (var y = 0; y < tk.H; y++) (function (x, y) {
      var k = x + ',' + y; if (fixed[k]) return;
      b.hit(x, y, 1, 1, { 'data-c': k, 'aria-label': t(S.cellLabel, { r: y + 1, c: x + 1 }), 'aria-pressed': 'false' }, function (e) {
        if (st.locked) return;
        if (sel[k]) delete sel[k]; else sel[k] = 1;
        wrong = null; e.currentTarget.setAttribute('aria-pressed', sel[k] ? 'true' : 'false');
        Core.play(sel[k] ? 'step' : 'click'); draw();
      });
    })(x, y);
    btn = checkBtn(function () {
      if (!Object.keys(sel).length) { el.feedback.innerHTML = ''; el.feedback.appendChild(h('p', { class: 'bp-status' }, S.emptyCells)); return; }
      var ans = {}; tk.answer.forEach(function (k) { ans[k] = 1; });
      wrong = {}; Object.keys(sel).forEach(function (k) { if (!ans[k]) wrong[k] = 1; });
      answer(Object.keys(sel), b.el);
      if (!st.locked) draw();
    });
    clr = h('button', { type: 'button', class: 'btn ghost', onclick: function () { sel = {}; wrong = null; [].forEach.call(b.layer.children, function (x) { x.setAttribute('aria-pressed', 'false'); }); draw(); } }, S.clear);
    el.view = { solution: function () { wrong = null; draw({ reveal: true }); }, ok: function () { wrong = null; draw(); } };
    split(b.el, [count, h('div', { class: 'row center' }, [clr, btn])]);
    draw();
  }

  /* ---------- Tegnebordet: tap a point ---------- */
  function renderPoint(tk) {
    var b = board(tk.W, tk.H, M_COORD), mark = null, btn, status = h('p', { class: 'bp-status', 'aria-live': 'polite' });
    function draw(opts) { b.svg.innerHTML = coordSvg(tk, mark, opts); btn.disabled = st.locked || !mark; status.textContent = mark ? t(S.pointLabel, { p: G.pt(mark[0], mark[1]) }) : ''; }
    for (var x = 0; x <= tk.W; x++) for (var y = 0; y <= tk.H; y++) (function (x, y) {
      b.hit(x - 0.5, tk.H - y - 0.5, 1, 1, { 'data-p': x + ',' + y, 'aria-label': t(S.pointLabel, { p: G.pt(x, y) }) }, function () { if (st.locked) return; mark = [x, y]; Core.play('step'); draw(); });
    })(x, y);
    btn = checkBtn(function () { answer(mark[0] + ',' + mark[1], b.el); });
    el.view = { solution: function () { draw({ solution: true }); }, ok: function () { draw(); } };
    split(b.el, [status, h('div', { class: 'row center' }, btn)]);
    draw();
  }

  /* ---------- number input ---------- */
  function renderNumber(tk) {
    var input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'bp-input', id: 'bp-in', 'aria-label': S.answerLabel,
      onkeydown: function (e) { if (e.key === 'Enter') go(); } });
    function go() {
      if (st.locked) return;
      if (isNaN(G.parseNum(input.value))) { el.feedback.innerHTML = ''; el.feedback.appendChild(h('p', { class: 'bp-status' }, S.typeNumber)); input.focus(); return; }
      answer(input.value, input);
      if (!st.locked) { input.classList.remove('wrong'); input.select(); }
    }
    el.input = input;
    split(h('div', { class: 'bp-fig', html: figSvg(tk) }), h('div', { class: 'bp-answer' }, [h('label', { for: 'bp-in', class: 'bp-answer-label' }, S.answerLabel), input, h('span', { class: 'bp-unit' }, tk.unit), checkBtn(go)]));
    el.view = { solution: function () { input.value = tk.answer; input.classList.add('right'); input.readOnly = true; }, ok: function () { input.classList.add('right'); input.readOnly = true; } };
    if (!('ontouchstart' in root)) later(function () { input.focus(); }, 60);
  }

  /* ---------- multiple choice (text, figures or drawings) ---------- */
  function optionBox(tk, cls, content) {
    var box = h('div', { class: 'oj-options ' + cls });
    tk.options.forEach(function (o, i) {
      var c = content ? content(o, i) : null;
      var b = h('button', { type: 'button', class: 'oj-opt' + (c ? ' bp-figopt' : ''), 'data-v': o, onclick: function () { answer(o, b); } }, c ? null : label(tk, o));
      if (c) { b.innerHTML = c.html; b.setAttribute('aria-label', c.label); }
      box.appendChild(b);
    });
    return box;
  }
  function renderChoice(tk) {
    var k = tk.kind, B = el.body, fig = null;
    function art(html, cls) { fig = h('div', { class: 'bp-fig ' + (cls || ''), html: html }); }
    if (k === 'whichMove') art(svg(vb(tk.W, tk.H, M_CELLS), cellsSvg(tk, null)), 'bp-boardfig');
    else if (k === 'coordRead') art(svg(vb(tk.W, tk.H, M_COORD), coordSvg(tk)), 'bp-boardfig');
    else if (k === 'tilesArea' || k === 'tilesPer') art(svg(vb(tk.W, tk.H, M_CELLS), tilesSvg(tk)), 'bp-boardfig');
    else if (k === 'shapeName' || k === 'rightAngles') art(shapeSvg(tk.fig, 'display:block;width:100%;height:auto;max-height:200px'), 'bp-small');
    else if (k === 'angleKind') art(angleSvg(tk), 'bp-small');
    else if (k === 'rectArea' || k === 'rectPer') art(rectSvg(tk), 'bp-small');
    else if (k === 'netYesNo') art(netSvg(tk.fig, { style: 'display:block;width:100%;height:auto;max-height:200px' }), 'bp-small bp-netfig');
    else if (k === 'view') art(towerSvg(tk.heights, 'display:block;width:100%;height:auto;max-height:230px'), 'bp-tower');
    else if (k === 'viewPlan') art(planSvg(tk.heights, 'display:block;width:100%;height:auto;max-height:200px'), 'bp-small');
    var opts;
    if (k === 'netPick') opts = optionBox(tk, 'bp-figopts bp-nets', function (o, i) { return { html: netSvg(tk.figs[i], { style: 'display:block;width:100%;height:auto;max-height:120px' }), label: t(S.figLabel, { n: i + 1 }) }; });
    else if (k === 'view' || k === 'viewPlan') opts = optionBox(tk, 'bp-figopts bp-views', function (o, i) { return { html: viewSvg(o, 'display:block;width:100%;height:auto;max-height:100px'), label: t(S.drawingLabel, { n: i + 1 }) }; });
    else if (k === 'netOpp') return renderNetOpp(tk);
    else opts = optionBox(tk, tk.options.length === 2 ? 'bp-two' : tk.options.every(function (o) { return label(tk, o).length < 8; }) ? 'bp-row' : 'bp-grid2');
    if (fig) split(fig, opts); else B.appendChild(opts);
  }
  // tap the cell of the net that ends up opposite the yellow one
  function renderNetOpp(tk) {
    var sz = G.size(tk.fig), b = board(sz[0], sz[1], { l: 0.1, t: 0.1, r: 0.1, b: 0.1 });
    b.el.classList.add('bp-netboard');
    b.svg.innerHTML = netSvg(tk.fig, { mark: tk.mark, labels: tk.labels }).replace(/^<svg[^>]*>|<\/svg>$/g, '');
    tk.fig.forEach(function (c, i) {
      if (i === tk.mark) return;
      var btn = b.hit(c[0], c[1], 1, 1, { 'data-v': tk.labels[i], 'aria-label': t(S.netLabel, { L: tk.labels[i] }) }, function () { answer(tk.labels[i], btn); });
    });
    el.view = { solution: function () { b.svg.innerHTML = netSvg(tk.fig, { mark: tk.mark, labels: tk.labels, good: tk.labels.indexOf(tk.answer) }).replace(/^<svg[^>]*>|<\/svg>$/g, ''); } };
    el.view.ok = el.view.solution;
    el.body.appendChild(b.el);
  }

  /* ---------- the net folds into a cube (CSS 3D) ---------- */
  function foldNode(cells) {
    var f = G.fold(cells), nodes = [], stage = h('div', { class: 'bp-fold', 'aria-hidden': 'true' }), cube = h('div', { class: 'bp-cube' });
    var colors = ['#F7C548', '#F2A93B', '#6BB8E0', '#9CD08F', '#E58F8F', '#C7A6E0'];
    cells.forEach(function (c, i) { nodes[i] = h('div', { class: 'bp-face', style: 'background:' + colors[i] }); });
    cells.forEach(function (c, i) {
      var p = f.parent[i]; if (p < 0) { cube.appendChild(nodes[i]); return; }
      var d = f.dir[i], n = nodes[i];
      n.classList.add(d[0] === 1 ? 'e' : d[0] === -1 ? 'w' : d[1] === 1 ? 's' : 'n');
      nodes[p].appendChild(n);
    });
    stage.appendChild(cube);
    later(function () { stage.classList.add('folded'); }, 120);
    return stage;
  }

  /* ---------- answers ---------- */
  function answer(value, node) {
    var tk = task(); if (!tk || st.locked) return;
    if (G.check(tk, value)) {
      st.locked = true;
      var first = st.attempt === 0;
      st.results.push(first ? 1 : 0.5);
      Core.saveSoon();
      if (node && node.hasAttribute('data-v')) node.classList.add('right');
      reveal(tk, true);
      Core.play('correct');
      setBob(first ? 'happy' : 'encouraging', pick(first ? S.correct : S.correctSecond));
      if ((tk.kind === 'netPick' || tk.kind === 'netOpp' || (tk.kind === 'netYesNo' && tk.answer === 'yes'))) {
        el.feedback.insertBefore(foldNode(tk.kind === 'netPick' ? tk.figs[tk.options.indexOf(tk.answer)] : tk.fig), el.feedback.firstChild);
        later(function () { if (el.bubble) setBob('cheering', S.foldCheer); }, 1400);
      }
      continueBtn();
      return;
    }
    st.attempt++;
    Core.play('wrong');
    if (node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); if (node.hasAttribute('data-v')) { node.classList.add('wrong'); node.disabled = true; } }
    var binary = tk.type === 'choice' && tk.options.length === 2;
    if (st.attempt === 1 && !binary) {
      setBob('thinking', S.tryAgain);
      el.feedback.innerHTML = '';
      el.feedback.appendChild(h('div', { class: 'oj-rule' }, h('p', {}, tk.hint)));
      return;
    }
    st.results.push(0); st.locked = true;
    reveal(tk, false);
    setBob('encouraging', binary ? S.wrongTwo : null);
    continueBtn();
  }
  function continueBtn() {
    var b = h('button', { type: 'button', class: 'btn primary', onclick: nextTask }, S.continue);
    el.feedback.appendChild(b);
    later(function () { try { b.focus({ preventScroll: false }); } catch (e) { /* ignore */ } }, 30);
  }
  function reveal(tk, ok) {
    [].forEach.call(el.body.querySelectorAll('[data-v]'), function (b) { if (b.getAttribute('data-v') === tk.answer) b.classList.add('right'); b.disabled = true; });
    [].forEach.call(el.body.querySelectorAll('.bp-hit, .bp-check, .btn'), function (b) { b.disabled = true; });
    if (el.view) el.view[ok ? 'ok' : 'solution'] && el.view[ok ? 'ok' : 'solution']();
    el.feedback.innerHTML = '';
    var box = h('div', { class: 'oj-rule' + (ok ? '' : ' final') });
    if (!ok) {
      var what = tk.type === 'fence' ? S.showFence : tk.type === 'cells' ? S.showCells : tk.type === 'point' ? S.showPoint : tk.kind === 'netOpp' ? S.showNet : textOptions(tk) || tk.type === 'number' ? t(S.answerWas, { a: label(tk, tk.answer) + (tk.unit ? ' ' + tk.unit : '') }) : S.answerMarked;
      box.appendChild(h('p', { class: 'oj-answer' }, what));
    }
    box.appendChild(h('p', {}, tk.explain));
    el.feedback.appendChild(box);
  }
  function nextTask() { Core.play('step'); st.i++; el.view = null; showTask(); }

  /* ---------- finish ---------- */
  function finish() {
    clearTimers();
    var total = st.results.length || 1, sum = st.results.reduce(function (a, b) { return a + b; }, 0), acc = sum / total;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0, first = st.results.filter(function (r) { return r === 1; }).length, route = st.route;
    var rs = routeState(route.id), oldStars = rs.stars, newBest = stars > rs.stars;
    rs.stars = Math.max(rs.stars, stars); rs.best = Math.max(rs.best, Math.round(100 * first / total)); rs.plays++;
    Core.save();
    var badgeNode = Core.roundDone(ID, route.id, oldStars, rs.stars);
    setBob(stars >= 2 ? 'cheering' : 'happy', null);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: OUTFIT, size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox, badgeNode || null,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { correct: first, total: st.results.length })),
      !oldStars && stars ? h('p', { class: 'bp-newproject' }, t(S.newProject, { name: S.projectNames[route.id] })) : null,
      stars === 0 ? h('p', { class: 'muted' }, S.resultTip) : null,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), h('button', { type: 'button', class: 'btn primary', onclick: function () { startRound(route); } }, S.playAgain)])
    ]));
    app.appendChild(o);
    Core.play(stars ? 'win' : 'click');
    var se = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) { later(function () { se[i].classList.remove('off'); se[i].classList.add('on', 'pop'); Core.play('star'); }, 450 + i * 380); })(i);
    o.querySelector('.btn.primary').focus();
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport,
    progress: progress, quickTask: quickTask, collection: collection,
    _state: function () { return st; }, _svg: { cells: cellsSvg, tiles: tilesSvg, fence: fenceSvg, coord: coordSvg, net: netSvg, view: viewSvg, tower: towerSvg, plan: planSvg, shape: shapeSvg, angle: angleSvg, fig: figSvg, rect: rectSvg, svg: svg, vb: vb, M: { cells: M_CELLS, posts: M_POSTS, coord: M_COORD } },
    _label: label, _sayify: sayify }); // test hooks
})(window);
