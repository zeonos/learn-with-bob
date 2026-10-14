/*
 * Laboratoriet – simulations. Pure functions without any DOM, so they can be tested in Node (tools/test-laboratoriet.js).
 * Units: density g/cm³, voltage V, resistance Ω, current A, mass kg, distance in peg positions, volume ml, concentration mol/L.
 */
(function (root) {
  'use strict';

  /* ---------- floating and sinking ---------- */
  // An object floats when its density is lower than the liquid's. A floating object sinks until it has pushed aside
  // its own mass of liquid, so the part under the surface is density(object) / density(liquid) (Archimedes' principle).
  function floatIn(rhoObj, rhoLiq) {
    var floats = rhoObj < rhoLiq;
    return { floats: floats, under: floats ? rhoObj / rhoLiq : 1 };
  }
  // Layers from top to bottom (lowest density on top). Returns the index of the layer the object ends up resting on
  // the top of (it floats on layer i), or layers.length when it sinks to the bottom.
  function settleInLayers(rhoObj, layers) {
    var sorted = layers.slice().sort(function (a, b) { return a.rho - b.rho; });
    for (var i = 0; i < sorted.length; i++) if (rhoObj < sorted[i].rho) return { layer: i, sorted: sorted };
    return { layer: sorted.length, sorted: sorted };
  }
  // A boat with volume V (cm³) and own mass m (g) in a liquid: how much cargo (g) it can carry before water runs in.
  function boatCapacity(volume, mass, rhoLiq) { return volume * rhoLiq - mass; }

  /* ---------- electric circuits on a grid board ---------- */
  // Board: cols × rows connection points. A slot is the edge between two neighbouring points:
  // 'h:r:c' joins (r,c)–(r,c+1), 'v:r:c' joins (r,c)–(r+1,c).
  // Parts: { slot, type: 'wire'|'battery'|'bulb'|'switch'|'material', on (switch), flip (battery: + at the second point),
  //          V (battery, default 4.5), R (bulb/material resistance), cond (material conducts) }.
  var BULB_R = 9, BATTERY_V = 4.5;
  function slotNodes(slot, cols) {
    var p = slot.split(':'), r = +p[1], c = +p[2];
    return p[0] === 'h' ? [r * cols + c, r * cols + c + 1] : [r * cols + c, (r + 1) * cols + c];
  }
  function allSlots(cols, rows) {
    var out = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      if (c < cols - 1) out.push('h:' + r + ':' + c);
      if (r < rows - 1) out.push('v:' + r + ':' + c);
    }
    return out;
  }
  function conductsLikeWire(p) { return p.type === 'wire' || (p.type === 'switch' && p.on) || (p.type === 'material' && p.cond && !p.R); }
  function solveCircuit(board) {
    var cols = board.cols, rows = board.rows, n = cols * rows, parent = [];
    for (var i = 0; i < n; i++) parent[i] = i;
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    function join(a, b) { a = find(a); b = find(b); if (a !== b) parent[a] = b; }
    board.parts.forEach(function (p) { if (conductsLikeWire(p)) { var e = slotNodes(p.slot, cols); join(e[0], e[1]); } });
    // classes = electrical nodes
    var cls = {}, k = 0;
    for (i = 0; i < n; i++) { var f = find(i); if (cls[f] === undefined) cls[f] = k++; }
    function node(x) { return cls[find(x)]; }
    var res = [], bats = [], short = false;
    board.parts.forEach(function (p, idx) {
      var e = slotNodes(p.slot, cols), a = node(e[0]), b = node(e[1]);
      if (p.type === 'bulb') res.push({ idx: idx, a: a, b: b, R: p.R || BULB_R });
      if (p.type === 'material' && p.cond && p.R) res.push({ idx: idx, a: a, b: b, R: p.R });
      if (p.type === 'battery') {
        var plus = p.flip ? b : a, minus = p.flip ? a : b;
        if (plus === minus) short = true;
        bats.push({ idx: idx, plus: plus, minus: minus, V: p.V || BATTERY_V });
      }
    });
    // nodal analysis; batteries as Norton equivalents with a small internal resistance
    var RI = 0.05, G = [], I = [];
    for (i = 0; i < k; i++) { G.push(new Array(k).fill(0)); I.push(0); G[i][i] = 1e-9; }
    function stamp(a, b, g) { G[a][a] += g; G[b][b] += g; G[a][b] -= g; G[b][a] -= g; }
    res.forEach(function (r) { if (r.a !== r.b) stamp(r.a, r.b, 1 / r.R); });
    bats.forEach(function (bt) { if (bt.plus === bt.minus) return; stamp(bt.plus, bt.minus, 1 / RI); I[bt.plus] += bt.V / RI; I[bt.minus] -= bt.V / RI; });
    var v = gauss(G, I);
    var out = { short: short, parts: [] };
    board.parts.forEach(function () { out.parts.push({ I: 0 }); });
    res.forEach(function (r) { out.parts[r.idx].I = Math.abs(v[r.a] - v[r.b]) / r.R; });
    bats.forEach(function (bt) {
      if (bt.plus === bt.minus) { out.parts[bt.idx].I = Infinity; return; }
      out.parts[bt.idx].I = Math.abs((bt.V - (v[bt.plus] - v[bt.minus])) / RI);
      if (out.parts[bt.idx].I > 20) out.short = true; // more than 20 A: a wire straight across the battery
    });
    // brightness: 1 = one bulb on one battery
    var Pnom = BATTERY_V * BATTERY_V / BULB_R;
    board.parts.forEach(function (p, idx) {
      if (p.type === 'bulb') { var I0 = out.short ? 0 : out.parts[idx].I, P = I0 * I0 * (p.R || BULB_R); out.parts[idx].glow = P / Pnom; out.parts[idx].lit = P / Pnom > 0.04; }
    });
    out.anyLit = out.parts.some(function (x) { return x.lit; });
    return out;
  }
  function gauss(A, b) {
    var n = b.length, M = A.map(function (row, i) { return row.concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var piv = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      var tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
      if (Math.abs(M[c][c]) < 1e-15) continue;
      for (r = 0; r < n; r++) if (r !== c) { var f = M[r][c] / M[c][c]; if (f) for (var j = c; j <= n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map(function (row, i) { return Math.abs(row[i]) < 1e-15 ? 0 : row[n] / row[i]; });
  }
  function ohm(given) { // two of U, R, I → the third
    if (given.U === undefined) return given.R * given.I;
    if (given.R === undefined) return given.U / given.I;
    return given.U / given.R;
  }

  /* ---------- levers and gears ---------- */
  // weights: [{ pos: -5..5 (negative = left), kg }]. Moment = kg × distance (the same unit for both sides).
  function lever(weights) {
    var left = 0, right = 0;
    weights.forEach(function (w) { if (w.pos < 0) left += w.kg * -w.pos; else right += w.kg * w.pos; });
    return { left: left, right: right, tilt: left > right ? 'left' : right > left ? 'right' : 'balance' };
  }
  // gears: [teeth...] meshing in a row. Each gear turns the opposite way of its neighbour; turns per turn of the first.
  function gears(teeth) {
    return teeth.map(function (t, i) { return { dir: i % 2 === 0 ? 1 : -1, turns: teeth[0] / t }; });
  }

  /* ---------- acids, bases and indicators ---------- */
  // Strong acid + strong base (like fortyndet saltsyre and natriumhydroxid). ca/cb in mol/L, va/vb in ml.
  function titration(ca, va, cb, vb) {
    var nH = ca * va - cb * vb, V = va + vb; // mmol and ml → mol/L
    if (Math.abs(nH) < 1e-9) return 7;
    if (nH > 0) return Math.max(0, -Math.log10(nH / V));
    return Math.min(14, 14 + Math.log10(-nH / V));
  }
  function mix(c1, c2, t) { return c1.map(function (x, i) { return Math.round(x + (c2[i] - x) * t); }); }
  function hex(c) { return '#' + c.map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function scale(stops, pH) {
    if (pH <= stops[0][0]) return stops[0][1];
    for (var i = 1; i < stops.length; i++) if (pH <= stops[i][0]) {
      var a = stops[i - 1], b = stops[i]; return hex(mix(rgb(a[1]), rgb(b[1]), (pH - a[0]) / (b[0] - a[0])));
    }
    return stops[stops.length - 1][1];
  }
  // Bromthymolblåt: yellow below pH 6, green around 7, blue above 7.6
  var BTB = [[5.8, '#E9CF2E'], [6.9, '#5FAE45'], [7.2, '#4DA56B'], [7.7, '#2E6CC2']];
  // Rødkålssaft: red (acid) – violet (neutral) – blue – green – yellow (strong base)
  var CABBAGE = [[2, '#D41E4E'], [4, '#C2407F'], [6, '#8E4FA8'], [7, '#6F58B4'], [8, '#3F72C4'], [9, '#2E9C8F'], [10.5, '#62B640'], [12.5, '#D7CC33']];
  function indicatorColor(kind, pH) { return scale(kind === 'btb' ? BTB : CABBAGE, pH); }
  function acidity(pH) { return pH < 6 ? 'sur' : pH > 8 ? 'basisk' : 'neutral'; }

  /* ---------- states of water ---------- */
  function waterState(tempC) { return tempC < 0 ? 'fast' : tempC < 100 ? 'flydende' : 'gas'; }

  /* ---------- food chains and populations ---------- */
  // Hares and foxes on a meadow. Hares grow until the grass runs short (K), foxes eat hares.
  function populations(opts, steps) {
    var H = opts.hares, F = opts.foxes, K = opts.K || 200, out = [{ H: H, F: F }];
    var a = 0.35, b = 0.012, c = 0.3, d = 0.25;
    for (var i = 0; i < steps; i++) {
      var eaten = b * H * F;
      var H2 = H + a * H * (1 - H / K) - eaten, F2 = F + c * eaten - d * F;
      H = Math.max(0, H2); F = Math.max(0, F2);
      if (H < 0.5) H = 0; if (F < 0.5) F = 0;
      out.push({ H: H, F: F });
    }
    return out;
  }
  // About 10 % of the energy is passed on to the next link in a food chain.
  function energyAt(start, link) { return start * Math.pow(0.1, link - 1); }

  var api = { floatIn: floatIn, settleInLayers: settleInLayers, boatCapacity: boatCapacity,
    slotNodes: slotNodes, allSlots: allSlots, solveCircuit: solveCircuit, ohm: ohm, BULB_R: BULB_R, BATTERY_V: BATTERY_V,
    lever: lever, gears: gears, titration: titration, indicatorColor: indicatorColor, acidity: acidity,
    waterState: waterState, populations: populations, energyAt: energyAt };
  root.LabSim = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
