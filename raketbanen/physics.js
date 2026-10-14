/*
 * Raketbanen – fysikken. En fast tidsskridt-simulering (dt = 1/120 s, semi-implicit Euler), så de samme
 * tal for vinkel og kraft altid giver præcis den samme bane – i alle browsere og i node (testene).
 * Sinus og cosinus regnes med plus, minus, gange og division (ingen Math.sin), så resultatet er ens overalt.
 *
 * To slags baner:
 *  - på en planet (Jorden, Månen, Mars, Jupiter): ens tyngdekraft nedad, jord som en kurve, mure (rektangler),
 *    sten (cirkler) og på Mars en fast vind (vandret acceleration). Vinkel 0–180°, 0° = vandret mod højre.
 *  - i rummet: planeter, der trækker med 1/afstand² (blødgjort). Raketten starter på overfladen af en planet
 *    og flyver lige ud fra den i vinklen 0–359°. Langt ud af feltet eller over 12 sekunder = forbi.
 * Kraft 1–100; på planeterne er farten kraft · 0,5 m/s alle steder, så det er tyngdekraften, der gør forskellen.
 * I rummet er farten kraft · 0,3 (spillets enheder pr. sekund), så planeternes træk kan nå at bøje banen.
 */
(function (root) {
  'use strict';
  // Real surface gravity in m/s². The game uses these numbers directly, so the ratios are the real ones.
  var G = { jorden: 9.8, maanen: 1.6, mars: 3.7, jupiter: 24.8 };
  var DT = 1 / 120, SPEED = 0.5, SPEED_SPACE = 0.3, SPACE_T = 12, GROUND_T = 90, SOFT2 = 0.25, LIFT = 0.6;
  var POW = [1, 100];
  var PI = 3.141592653589793;

  /* ---------- deterministic trigonometry ---------- */
  function taylor(r) { // r in [0, 45] degrees -> [cos, sin]
    var x = r * PI / 180, x2 = x * x;
    var s = x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42 * (1 - x2 / 72 * (1 - x2 / 110 * (1 - x2 / 156 * (1 - x2 / 210)))))));
    var c = 1 - x2 / 2 * (1 - x2 / 12 * (1 - x2 / 30 * (1 - x2 / 56 * (1 - x2 / 90 * (1 - x2 / 132 * (1 - x2 / 182))))));
    return [c, s];
  }
  function trig(deg) {
    var d = deg % 360; if (d < 0) d += 360;
    var q = Math.floor(d / 90), r = d - q * 90, b;
    if (r <= 45) b = taylor(r); else { var t = taylor(90 - r); b = [t[1], t[0]]; }
    var c = b[0], s = b[1];
    return q === 0 ? [c, s] : q === 1 ? [-s, c] : q === 2 ? [-c, -s] : [s, -c];
  }

  /* ---------- levels ---------- */
  function isSpace(lv) { return !!lv.planets; }
  function angleRange(lv) { return isSpace(lv) ? [0, 359] : [0, 180]; }
  function H(lv) { return lv.W * 0.6; }
  // ground height under x (the terrain is a polyline from x = 0 to x = W)
  function groundY(lv, x) {
    var tr = lv.terrain, n = tr.length;
    if (x <= tr[0][0]) return tr[0][1];
    for (var i = 1; i < n; i++) if (x <= tr[i][0]) { var a = tr[i - 1], b = tr[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    return tr[n - 1][1];
  }
  function gravity(lv) { return G[lv.g || lv.world] || 0; }
  // where the rocket starts and which way it points
  function launch(lv, angle, power) {
    var cs = trig(angle), v = power * (isSpace(lv) ? SPEED_SPACE : SPEED), x, y;
    if (isSpace(lv)) { var hp = lv.planets[lv.home || 0], rr = hp.r + LIFT; x = hp.x + cs[0] * rr; y = hp.y + cs[1] * rr; }
    else { x = lv.pad; y = groundY(lv, lv.pad) + lv.W * 0.02; }
    return { x: x, y: y, vx: cs[0] * v, vy: cs[1] * v };
  }
  function padPoint(lv) { return isSpace(lv) ? null : [lv.pad, groundY(lv, lv.pad) + lv.W * 0.02]; }

  /*
   * Flies one shot. Returns { hit, end: 'hit'|'ground'|'wall'|'rock'|'planet'|'out'|'time', at: [x,y], t, steps,
   * minD (closest distance to the station's ring), which (index of the wall/rock/planet), crossY (height when the
   * rocket passed the station's x, or null), path (every `every`-th point, if opts.path) }.
   */
  function simulate(lv, angle, power, opts) {
    opts = opts || {};
    var every = opts.every || 1, path = opts.path ? [] : null;
    var s0 = launch(lv, angle, power), x = s0.x, y = s0.y, vx = s0.vx, vy = s0.vy;
    var space = isSpace(lv), g = gravity(lv), wind = lv.wind || 0, W = lv.W, Hh = H(lv);
    var st = lv.station, sx = st[0], sy = st[1], sr = st[2];
    var walls = lv.walls || [], rocks = lv.rocks || [], planets = lv.planets || [], tr = lv.terrain || [];
    var maxSteps = Math.round((space ? SPACE_T : GROUND_T) / DT), minD = Infinity, crossY = null, side = x - sx;
    var end = 'time', which = -1, step = 0, i;
    if (path) path.push([x, y]);
    for (step = 1; step <= maxSteps; step++) {
      var ax = 0, ay = 0;
      if (space) {
        for (i = 0; i < planets.length; i++) {
          var p = planets[i], dx = p.x - x, dy = p.y - y, d2 = dx * dx + dy * dy + SOFT2, inv = p.gm / (d2 * Math.sqrt(d2));
          ax += dx * inv; ay += dy * inv;
        }
      } else { ax = wind; ay = -g; }
      vx += ax * DT; vy += ay * DT;
      var px = x, py = y;
      x += vx * DT; y += vy * DT;
      if (path && step % every === 0) path.push([x, y]);
      // the station
      var ex = x - sx, ey = y - sy, dd = Math.sqrt(ex * ex + ey * ey) - sr;
      if (dd < minD) minD = dd;
      if (crossY === null && (ex === 0 || (ex > 0) !== (side > 0))) crossY = py + (y - py) * (px === x ? 0 : (sx - px) / (x - px));
      if (dd <= 0) { end = 'hit'; break; }
      // things to crash into
      var hitIt = false;
      for (i = 0; i < walls.length; i++) { var w = walls[i]; if (x >= w[0] && x <= w[2] && y >= w[1] && y <= w[3]) { end = 'wall'; which = i; hitIt = true; break; } }
      if (hitIt) break;
      for (i = 0; i < rocks.length; i++) { var r = rocks[i], rx = x - r[0], ry = y - r[1]; if (rx * rx + ry * ry <= r[2] * r[2]) { end = 'rock'; which = i; hitIt = true; break; } }
      if (hitIt) break;
      if (space) {
        for (i = 0; i < planets.length; i++) { var q = planets[i], qx = x - q.x, qy = y - q.y; if (qx * qx + qy * qy <= q.r * q.r) { end = 'planet'; which = i; hitIt = true; break; } }
        if (hitIt) break;
        if (x < -0.12 * W || x > 1.12 * W || y < -0.12 * Hh || y > 1.12 * Hh) { end = 'out'; break; }
      } else {
        if (tr.length && y <= groundY(lv, x)) { end = 'ground'; break; }
        if (x < 0 || x > W) { end = 'out'; break; }
      }
    }
    if (step > maxSteps) step = maxSteps;
    if (path && path.length && (path[path.length - 1][0] !== x || path[path.length - 1][1] !== y)) path.push([x, y]);
    return { hit: end === 'hit', end: end, at: [x, y], t: step * DT, steps: step, minD: minD, which: which, crossY: crossY, path: path };
  }

  /* ---------- every angle and every power ---------- */
  // Returns { total, n, frac, grid } where grid[(angle - a0) * 100 + (power - 1)] = 1 for a hit.
  function sweep(lv, aStep, pStep) {
    aStep = aStep || 1; pStep = pStep || 1;
    var ar = angleRange(lv), na = ar[1] - ar[0] + 1, grid = new Uint8Array(na * 100), n = 0, total = 0;
    for (var a = ar[0]; a <= ar[1]; a += aStep) for (var p = POW[0]; p <= POW[1]; p += pStep) {
      total++;
      if (simulate(lv, a, p).hit) { grid[(a - ar[0]) * 100 + p - 1] = 1; n++; }
    }
    return { total: total, n: n, frac: n / total, grid: grid, a0: ar[0], na: na };
  }
  // The steadiest working shot: the hit with the most hits around it (so a tiny change still works).
  function solve(lv, sw) {
    sw = sw || sweep(lv);
    if (!sw.n) return null;
    var best = null, bestScore = -1, na = sw.na;
    for (var ai = 0; ai < na; ai++) for (var pi = 0; pi < 100; pi++) {
      if (!sw.grid[ai * 100 + pi]) continue;
      var score = 0;
      for (var da = -3; da <= 3; da++) for (var dp = -3; dp <= 3; dp++) {
        var a2 = ai + da, p2 = pi + dp;
        if (isSpace(lv)) a2 = (a2 + na) % na;
        if (a2 >= 0 && a2 < na && p2 >= 0 && p2 < 100 && sw.grid[a2 * 100 + p2]) score++;
      }
      score = score * 1000 - pi; // ties: the lower power
      if (score > bestScore) { bestScore = score; best = [ai + sw.a0, pi + 1]; }
    }
    return best;
  }
  // A quick search for the sandbox: coarse first, then every shot near a coarse hit.
  function findShot(lv) {
    var ar = angleRange(lv), hits = [];
    for (var a = ar[0]; a <= ar[1]; a += 2) for (var p = 2; p <= 100; p += 2) if (simulate(lv, a, p).hit) hits.push([a, p]);
    if (!hits.length) { // a narrow gap: look at every shot
      for (a = ar[0]; a <= ar[1]; a++) for (p = 1; p <= 100; p++) if (simulate(lv, a, p).hit) return [a, p];
      return null;
    }
    // the coarse hit with the most coarse neighbours
    var set = {}; hits.forEach(function (h) { set[h[0] + ',' + h[1]] = 1; });
    var best = hits[0], bs = -1;
    hits.forEach(function (h) { var s = 0; for (var da = -4; da <= 4; da += 2) for (var dp = -4; dp <= 4; dp += 2) if (set[(h[0] + da) + ',' + (h[1] + dp)]) s++; if (s > bs) { bs = s; best = h; } });
    return best;
  }

  var api = { G: G, DT: DT, SPEED: SPEED, SPEED_SPACE: SPEED_SPACE, SPACE_T: SPACE_T, POW: POW, LIFT: LIFT, trig: trig, isSpace: isSpace, angleRange: angleRange, H: H,
    groundY: groundY, gravity: gravity, launch: launch, padPoint: padPoint, simulate: simulate, sweep: sweep, solve: solve, findShot: findShot };
  root.ROCKET = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
