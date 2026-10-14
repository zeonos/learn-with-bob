/*
 * Laboratoriet – drawings and animations of the lab equipment (inline SVG, viewBox 800 × 480).
 * Each scene: LabScenes.create(kind, host, cfg, opts) → api with the methods the game needs.
 */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', Sim = root.LabSim, L = root.LAB, S = root.STR.lab;
  var W = 800, H = 480, INK = '#4A2C17';

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function g(parent, attrs) { return el('g', attrs || {}, parent); }
  function txt(parent, x, y, s, cls, anchor) { var t = el('text', { x: x, y: y, class: cls || 'lab-t', 'text-anchor': anchor || 'middle' }, parent); t.textContent = s; return t; }
  function svgRoot(host, label) {
    host.innerHTML = '';
    var s = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'lab-svg', role: 'img', 'aria-label': label || '', preserveAspectRatio: 'xMidYMid meet' });
    host.appendChild(s); return s;
  }
  var raf = [];
  function tween(dur, fn, done) {
    var t0 = performance.now(), id = { stop: false };
    raf.push(id);
    (function step(now) {
      if (id.stop) return;
      var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      fn(e, k);
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    })(t0);
    return id;
  }
  function stopAll() { raf.forEach(function (r) { r.stop = true; }); raf = []; }
  function num(x) { return String(Math.round(x * 100) / 100).replace('.', ','); }

  /* ---------- objects for the water tank ---------- */
  // returns { s: svg markup centred on 0,0, w, h }
  function objShape(id, rho) {
    var o = '<g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">';
    switch (id) {
      case 'kork': return { w: 46, h: 58, s: o + '<path d="M-20,-29 L20,-29 L23,29 L-23,29 Z" fill="#C89A63"/><circle cx="-6" cy="-10" r="2.5" fill="#9C6E3A" stroke="none"/><circle cx="8" cy="8" r="2" fill="#9C6E3A" stroke="none"/></g>' };
      case 'trae': return { w: 120, h: 64, s: o + '<rect x="-60" y="-32" width="120" height="64" rx="5" fill="#E2B270"/><path d="M-50,-14 Q0,-24 50,-12 M-52,10 Q0,0 52,14" fill="none" stroke="#B4823F" stroke-width="2"/></g>' };
      case 'aeble': return { w: 80, h: 84, s: o + '<path d="M0,-28 C-30,-46 -44,-6 -36,14 C-28,40 -8,42 0,36 C8,42 28,40 36,14 C44,-6 30,-46 0,-28 Z" fill="#D9463B"/><path d="M0,-28 L4,-42" stroke-width="4"/><path d="M5,-38 Q20,-48 26,-36 Q14,-30 5,-38 Z" fill="#5FAE45" stroke-width="2"/></g>' };
      case 'is': return { w: 70, h: 70, s: o + '<rect x="-35" y="-35" width="70" height="70" rx="12" fill="#DDF3FF" fill-opacity=".85"/><path d="M-22,-22 L-6,-22" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>' };
      case 'lys': return { w: 130, h: 36, s: o + '<rect x="-58" y="-18" width="116" height="36" rx="6" fill="#FFF8E6"/><path d="M58,0 L70,0" stroke-width="3"/></g>' };
      case 'and': return { w: 110, h: 84, s: o + '<path d="M-48,8 C-50,40 40,44 50,14 C56,-4 40,-4 30,2 C26,-30 -10,-40 -16,-12 C-30,-8 -46,-6 -48,8 Z" fill="#F7C548"/><path d="M-16,-26 C-34,-30 -40,-18 -30,-12" fill="#F28C28"/><circle cx="-6" cy="-24" r="3.5" fill="' + INK + '" stroke="none"/></g>' };
      case 'flaske': return { w: 150, h: 52, s: o + '<path d="M-72,-22 L40,-22 L54,-10 L62,-10 L62,10 L54,10 L40,22 L-72,22 Z" fill="#CFEFFF" fill-opacity=".7"/><rect x="62" y="-12" width="12" height="24" fill="#2F7DB3"/></g>' };
      case 'sten': return { w: 96, h: 60, s: o + '<path d="M-44,10 C-50,-18 -20,-30 4,-28 C34,-28 50,-10 46,10 C42,28 -36,32 -44,10 Z" fill="#9C9A93"/><path d="M-20,-10 L-8,-14 M10,4 L22,0" stroke="#7D7B74" stroke-width="2"/></g>' };
      case 'moent': return { w: 60, h: 18, s: o + '<ellipse rx="30" ry="9" fill="#E8C35A"/><ellipse rx="18" ry="4.5" fill="none" stroke="#B8902A" stroke-width="2"/></g>' };
      case 'noegle': return { w: 96, h: 40, s: o + '<circle cx="-30" cy="0" r="16" fill="#D9B44A"/><circle cx="-30" cy="0" r="6" fill="#fff"/><path d="M-14,-5 L46,-5 L46,5 L38,5 L38,14 L30,14 L30,5 L22,5 L22,12 L14,12 L14,5 L-14,5 Z" fill="#D9B44A"/></g>' };
      case 'glaskugle': return { w: 52, h: 52, s: o + '<circle r="26" fill="#BFE9E0" fill-opacity=".8"/><path d="M-12,-10 Q0,-22 12,-12 M-14,8 Q2,0 14,12" fill="none" stroke="#3E9C8C" stroke-width="3"/><circle cx="-10" cy="-12" r="4" fill="#fff" stroke="none"/></g>' };
      case 'viskelaeder': return { w: 76, h: 38, s: o + '<rect x="-38" y="-19" width="76" height="38" rx="8" fill="#F4A6B8"/><rect x="-38" y="-19" width="26" height="38" rx="8" fill="#7FB8E6"/></g>' };
      case 'soem': return { w: 100, h: 20, s: o + '<path d="M-44,-3 L40,-3 L50,0 L40,3 L-44,3 Z" fill="#A7A9AC"/><rect x="-50" y="-9" width="7" height="18" rx="2" fill="#A7A9AC"/></g>' };
      case 'aeg': return { w: 58, h: 74, s: o + '<path d="M0,-37 C24,-37 30,0 28,12 C26,30 14,37 0,37 C-14,37 -26,30 -28,12 C-30,0 -24,-37 0,-37 Z" fill="#F6E8D2"/></g>' };
      case 'ler': return { w: 72, h: 72, s: o + '<circle r="36" fill="#6FB57E"/><path d="M-14,-18 Q0,-26 14,-16" fill="none" stroke="#4E8F5C" stroke-width="3"/></g>' };
      case 'lerbaad': return { w: 180, h: 46, s: o + '<path d="M-90,-23 L90,-23 L64,23 L-64,23 Z" fill="#6FB57E"/><path d="M-78,-12 L78,-12" stroke="#4E8F5C" stroke-width="2"/></g>' };
      case 'appelsin': return { w: 82, h: 82, s: o + '<circle r="41" fill="#F59A23"/><circle cx="-12" cy="-10" r="2" fill="#D9790E" stroke="none"/><circle cx="10" cy="6" r="2" fill="#D9790E" stroke="none"/><circle cx="-4" cy="16" r="2" fill="#D9790E" stroke="none"/></g>' };
      case 'appelsin2': return { w: 72, h: 72, s: o + '<circle r="36" fill="#FFD08A"/><path d="M0,-36 L0,36 M-31,-18 L31,18 M-31,18 L31,-18" stroke="#F0A84A" stroke-width="2.5"/></g>' };
      case 'klods': return { w: 92, h: 92, s: o + '<rect x="-46" y="-46" width="92" height="92" rx="6" fill="' + (rho < 1 ? '#F2C98B' : '#B5B9C4') + '"/></g><text y="8" class="lab-t small" text-anchor="middle">' + num(rho) + ' g/cm³</text>' };
      case 'baad': return { w: 220, h: 60, s: o + '<path d="M-110,-30 L110,-30 L84,30 L-84,30 Z" fill="#E36B4C"/><path d="M-100,-18 L100,-18" stroke="#fff" stroke-width="3"/></g>' };
    }
    return { w: 60, h: 60, s: o + '<rect x="-30" y="-30" width="60" height="60" fill="#ccc"/></g>' };
  }

  /* ================= TANK ================= */
  var TANK = { x0: 170, x1: 630, top: 205, bottom: 440 };
  function tank(host, cfg) {
    var svg = svgRoot(host, 'Vandtank'), liqKey = cfg.liquid || 'vand';
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 110, y: 440, width: 580, height: 22, rx: 6, class: 'lab-table' }, svg);
    var liquid = el('rect', { x: TANK.x0, y: TANK.top, width: TANK.x1 - TANK.x0, height: TANK.bottom - TANK.top, fill: L.liquids[liqKey].color, class: 'lab-liquid' }, svg);
    var surf = el('path', { d: 'M' + TANK.x0 + ',' + TANK.top + ' L' + TANK.x1 + ',' + TANK.top, class: 'lab-surface' }, svg);
    var objs = g(svg);
    el('path', { d: 'M' + (TANK.x0 - 4) + ',' + 110 + ' L' + (TANK.x0 - 4) + ',' + (TANK.bottom + 4) + ' L' + (TANK.x1 + 4) + ',' + (TANK.bottom + 4) + ' L' + (TANK.x1 + 4) + ',110', class: 'lab-glass' }, svg);
    var label = txt(svg, TANK.x0 + 14, TANK.bottom - 14, L.liquids[liqKey].name, 'lab-t small', 'start');
    var sprinkle = g(svg);
    var items = [];
    function add(id, x, rho) {
      var sh = objShape(id, rho), node = g(objs, { class: 'lab-obj' }); node.innerHTML = sh.s;
      var it = { id: id, rho: rho !== undefined ? rho : (L.objects[id] || {}).rho, node: node, sh: sh, x: x || W / 2, y: 95, rot: 0 };
      if (id === 'lerbaad') it.rho = 0.25; // a hollow boat: its average density (clay + air inside) is low
      place(it); items.push(it); return it;
    }
    function place(it) { it.node.setAttribute('transform', 'translate(' + it.x + ',' + it.y + ') rotate(' + it.rot + ')'); }
    function target(it) {
      var r = Sim.floatIn(it.rho, L.liquids[liqKey].rho), h = it.sh.h;
      return r.floats ? TANK.top - h / 2 + h * r.under : TANK.bottom - h / 2;
    }
    var api = {
      add: add,
      clear: function () { items.forEach(function (it) { it.node.remove(); }); items = []; },
      drop: function (it, done) {
        it = it || items[items.length - 1];
        var y0 = it.y, y1 = target(it), floats = y1 < TANK.bottom - it.sh.h / 2 - 1;
        tween(floats ? 1100 : 1300, function (e, k) {
          var bob = floats ? Math.sin(k * Math.PI * 3) * (1 - k) * 14 : 0;
          it.y = y0 + (y1 - y0) * e + bob; place(it);
        }, function () { it.y = y1; place(it); if (done) done(floats); });
      },
      setLiquid: function (key, done) {
        var from = L.liquids[liqKey].color; liqKey = key; label.textContent = L.liquids[key].name;
        sprinkle.innerHTML = '';
        for (var i = 0; i < 26; i++) el('circle', { cx: 200 + Math.random() * 400, cy: 120 + Math.random() * 40, r: 3, fill: '#fff', stroke: '#9AA', 'stroke-width': 1 }, sprinkle);
        tween(900, function (e) { sprinkle.setAttribute('transform', 'translate(0,' + e * 120 + ')'); sprinkle.setAttribute('opacity', 1 - e); }, function () {
          liquid.setAttribute('fill', L.liquids[key].color);
          var n = items.length; if (!n) return done && done();
          items.forEach(function (it, i) { api.drop(it, i === n - 1 ? done : null); });
        });
        liquid.setAttribute('fill', from);
      },
      morph: function (id, done) {
        var it = items[items.length - 1]; if (!it) return;
        tween(500, function (e) { it.node.setAttribute('opacity', 1 - e); }, function () {
          it.node.remove(); items.pop(); var n = add(id, it.x); n.y = 95; place(n); api.drop(n, done);
        });
      },
      liquidKey: function () { return liqKey; },
      items: function () { return items; }
    };
    return api;
  }

  /* ================= BOAT (load test) ================= */
  function boat(host, cfg) {
    var svg = svgRoot(host, 'Båd'), L2 = L.liquids[cfg.liquid];
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 60, y: 210, width: 680, height: 230, fill: L2.color, class: 'lab-liquid' }, svg);
    el('path', { d: 'M60,210 L740,210', class: 'lab-surface' }, svg);
    var b = g(svg), hull = g(b); hull.innerHTML = objShape('baad').s;
    var load = g(b);
    el('path', { d: 'M56,120 L56,444 L744,444 L744,120', class: 'lab-glass' }, svg);
    txt(svg, W / 2, 470, L2.name + ' · ' + cfg.V + ' cm³ båd · ' + cfg.m + ' g', 'lab-t small');
    var y = 210 - 30 + 60 * (cfg.m / (cfg.V * L2.rho)), rot = 0;
    function place() { b.setAttribute('transform', 'translate(' + W / 2 + ',' + y + ') rotate(' + rot + ')'); }
    function setLoad(n) {
      load.innerHTML = '';
      for (var i = 0; i < n; i++) {
        var row = Math.floor(i / 7), col = i % 7;
        var r = el('rect', { x: -84 + col * 24, y: -30 - 18 * (row + 1), width: 22, height: 17, rx: 3, class: 'lab-weight' }, load);
      }
    }
    place();
    return {
      setLoad: setLoad,
      test: function (n, done) {
        var mass = cfg.m + n * cfg.w, capG = cfg.V * L2.rho, floats = mass <= capG + 1e-9;
        var y0 = y, y1 = floats ? 210 - 30 + 60 * (mass / capG) : 390;
        tween(floats ? 900 : 1600, function (e) { y = y0 + (y1 - y0) * e; rot = floats ? 0 : 9 * e; place(); }, function () { done && done(floats); });
      },
      reset: function () { y = 210 - 30 + 60 * (cfg.m / (cfg.V * L2.rho)); rot = 0; place(); }
    };
  }

  /* ================= SHIP (sea → river) ================= */
  function ship(host) {
    var svg = svgRoot(host, 'Skib');
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-sky' }, svg);
    var water = el('rect', { x: 0, y: 260, width: W, height: 220, fill: '#2F86B8' }, svg);
    var where = txt(svg, 680, 320, S.sea, 'lab-t big light');
    var s = g(svg);
    s.innerHTML = '<g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"><path d="M-170,-40 L170,-40 L140,40 L-140,40 Z" fill="#B3402F"/><rect x="-100" y="-96" width="120" height="56" fill="#F4F1EA"/><rect x="40" y="-120" width="34" height="80" fill="#F7C548"/><path d="M-170,-6 L170,-6" stroke="#fff" stroke-width="4"/></g>';
    var y = 270;
    function place() { s.setAttribute('transform', 'translate(380,' + y + ')'); }
    place();
    return {
      run: function (done) {
        tween(1600, function (e) {
          y = 270 + 22 * e;
          water.setAttribute('fill', e < 0.5 ? '#2F86B8' : '#7CC0DD');
        }, function () { where.textContent = S.river; done && done(); });
      }
    };
  }

  /* ================= CIRCUIT BOARD ================= */
  function board(host, cfg, opts) {
    var svg = svgRoot(host, 'Strømbord'), cols = cfg.cols, rows = cfg.rows;
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 70, y: 30, width: 660, height: 420, rx: 22, class: 'lab-boardbg' }, svg);
    var x0 = 170, x1 = 630, y0 = 85, y1 = 395;
    function pt(n) { var r = Math.floor(n / cols), c = n % cols; return [x0 + c * (x1 - x0) / (cols - 1), y0 + r * (y1 - y0) / (rows - 1)]; }
    var gSlots = g(svg), gParts = g(svg), gNodes = g(svg);
    for (var i = 0; i < cols * rows; i++) { var p = pt(i); el('circle', { cx: p[0], cy: p[1], r: 7, class: 'lab-node' }, gNodes); }
    var parts = cfg.parts.map(function (p) { return Object.assign({}, p); }), result = null, editable = !!opts.editable;
    var slotEls = {};
    Sim.allSlots(cols, rows).forEach(function (sl) {
      var e = Sim.slotNodes(sl, cols), a = pt(e[0]), b = pt(e[1]);
      var gg = g(gSlots, { class: 'lab-slot', 'data-slot': sl });
      el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'lab-slot-line' }, gg);
      el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'lab-slot-hit' }, gg);
      gg.addEventListener('click', function () { if (opts.onSlot) opts.onSlot(sl); });
      slotEls[sl] = gg;
    });
    function partAt(sl) { for (var i = 0; i < parts.length; i++) if (parts[i].slot === sl) return parts[i]; return null; }
    function drawPart(p, idx) {
      var e = Sim.slotNodes(p.slot, cols), a = pt(e[0]), b = pt(e[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var horiz = a[1] === b[1], len = horiz ? b[0] - a[0] : b[1] - a[1];
      var gg = g(gParts, { class: 'lab-part lab-' + p.type + (p.lock ? ' locked' : ''), transform: 'translate(' + mx + ',' + my + ') rotate(' + (horiz ? 0 : 90) + ')' });
      var half = len / 2, res = result && result.parts[idx];
      function lead(r) { el('line', { x1: -half, y1: 0, x2: -r, y2: 0, class: 'lab-wire' + (p.warn ? ' warn' : '') }, gg); el('line', { x1: r, y1: 0, x2: half, y2: 0, class: 'lab-wire' + (p.warn ? ' warn' : '') }, gg); }
      if (p.type === 'wire') { el('line', { x1: -half, y1: 0, x2: half, y2: 0, class: 'lab-wire' + (p.warn ? ' warn' : '') }, gg); if (result && result.anyLit && !result.short) el('line', { x1: -half, y1: 0, x2: half, y2: 0, class: 'lab-flow' }, gg); }
      if (p.type === 'battery') {
        lead(36);
        var hot = result && result.short;
        el('rect', { x: -36, y: -20, width: 72, height: 40, rx: 6, class: 'lab-batt' + (hot ? ' hot' : '') }, gg);
        el('rect', { x: p.flip ? 36 : -42, y: -8, width: 6, height: 16, fill: INK }, gg);
        var tt = txt(gg, p.flip ? 22 : -22, 7, '+', 'lab-t plus'); if (!horiz) tt.setAttribute('transform', 'rotate(-90,' + (p.flip ? 22 : -22) + ',0)');
        var vt = txt(gg, 8, 6, '4,5 V', 'lab-t tiny light'); if (!horiz) vt.setAttribute('transform', 'rotate(-90,8,0)');
      }
      if (p.type === 'bulb') {
        lead(22);
        var glow = res && res.glow ? Math.min(1, res.glow) : 0;
        var up = g(gg, { transform: horiz ? '' : 'rotate(-90)' });
        el('circle', { r: 58, class: 'lab-glow', opacity: glow > 0.04 ? 0.25 + 0.75 * glow : 0 }, up);
        el('circle', { r: 22, class: 'lab-bulb' + (glow > 0.04 ? ' on' : '') }, up);
        el('path', { d: 'M-10,6 Q-5,-10 0,6 Q5,-10 10,6', class: 'lab-filament' }, up);
      }
      if (p.type === 'switch') {
        lead(26);
        el('circle', { cx: -26, cy: 0, r: 6, fill: INK }, gg); el('circle', { cx: 26, cy: 0, r: 6, fill: INK }, gg);
        el('line', { x1: -26, y1: 0, x2: 26, y2: 0, class: 'lab-switch', transform: p.on ? '' : 'rotate(-32,-26,0)' }, gg);
        el('rect', { x: -40, y: -34, width: 80, height: 52, fill: 'transparent' }, gg).addEventListener('click', function (ev) { ev.stopPropagation(); if (opts.onSwitch) opts.onSwitch(p); });
      }
      if (p.type === 'material') {
        lead(44);
        el('rect', { x: -44, y: -18, width: 88, height: 36, rx: 6, class: 'lab-mat ' + (p.cond ? 'cond' : 'ins') }, gg);
        var mt = txt(gg, 0, 6, L.materials[p.mat].name, 'lab-t tiny'); if (!horiz) mt.setAttribute('transform', 'rotate(-90,0,0)');
      }
      gg.addEventListener('click', function (ev) { if (opts.onSlot) { ev.stopPropagation(); opts.onSlot(p.slot); } });
    }
    function render() {
      gParts.innerHTML = '';
      parts.forEach(drawPart);
      Object.keys(slotEls).forEach(function (sl) { slotEls[sl].classList.toggle('free', editable && !partAt(sl)); });
    }
    render();
    return {
      parts: function () { return parts; },
      setParts: function (ps) { parts = ps; result = null; render(); },
      partAt: partAt,
      solve: function () { result = Sim.solveCircuit({ cols: cols, rows: rows, parts: parts }); render(); return result; },
      off: function () { result = null; render(); },
      setEditable: function (v) { editable = v; render(); },
      render: render
    };
  }

  /* ================= LEVER ================= */
  function lever(host, cfg, opts) {
    var svg = svgRoot(host, 'Vippe'), max = cfg.max || 5, CX = 400, CY = 300;
    (cfg.weights || []).forEach(function (w) { max = Math.max(max, Math.abs(w.pos)); });
    if (cfg.ask || (cfg.askAt && cfg.askAt > max)) max = Math.max(max, cfg.askAt || 8, 8);
    var SP = 300 / max;
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 60, y: 420, width: 680, height: 20, rx: 6, class: 'lab-table' }, svg);
    el('path', { d: 'M' + CX + ',' + (CY + 8) + ' L' + (CX - 46) + ',420 L' + (CX + 46) + ',420 Z', class: 'lab-pivot' }, svg);
    var arm = g(svg), ghost = g(svg);
    el('rect', { x: CX - 340, y: CY - 8, width: 680, height: 16, rx: 6, class: 'lab-plank' }, arm);
    for (var i = -max; i <= max; i++) {
      if (!i) continue;
      el('line', { x1: CX + i * SP, y1: CY - 8, x2: CX + i * SP, y2: CY + 8, class: 'lab-peg' }, arm);
      txt(arm, CX + i * SP, CY + 34, String(Math.abs(i)), 'lab-t small');
      var hit = el('rect', { x: CX + i * SP - SP / 2, y: CY - 160, width: SP, height: 200, fill: 'transparent', class: 'lab-peghit' }, arm);
      (function (pos) { hit.addEventListener('click', function () { if (opts.onPeg) opts.onPeg(pos); }); })(i);
    }
    var wg = g(arm), ang = 0, weights = [];
    function draw() {
      wg.innerHTML = '';
      var stack = {};
      weights.forEach(function (w, idx) {
        var bw = 34 + w.kg * 5, bh = 24 + w.kg * 5, base = stack[w.pos] || 0;
        var gg = g(wg, { class: 'lab-wgt' + (w.lock ? ' locked' : ''), transform: 'translate(' + (CX + w.pos * SP) + ',' + (CY - 8 - base) + ')' });
        el('rect', { x: -bw / 2, y: -bh, width: bw, height: bh, rx: 5, class: 'lab-weight' }, gg);
        txt(gg, 0, -bh / 2 + 6, w.kg + ' kg', 'lab-t wlabel');
        gg.addEventListener('click', function (ev) { ev.stopPropagation(); if (opts.onWeight) opts.onWeight(idx); });
        stack[w.pos] = base + bh + 2;
      });
      arm.setAttribute('transform', 'rotate(' + ang + ',' + CX + ',' + CY + ')');
    }
    function showGhost() {
      ghost.innerHTML = '';
      if (cfg.ask) { var gg = g(ghost, { transform: 'translate(' + (CX + SP * max * 0.55) + ',' + (CY - 8) + ')' }); el('rect', { x: -40, y: -50, width: 80, height: 50, rx: 5, class: 'lab-weight ghost' }, gg); txt(gg, 0, -18, cfg.ask + ' kg', 'lab-t wlabel'); txt(gg, 0, -62, '? m', 'lab-t big'); }
      if (cfg.askAt) { var p = CX + cfg.askAt * SP, g2 = g(ghost, { transform: 'translate(' + p + ',' + (CY - 8) + ')' }); el('rect', { x: -40, y: -50, width: 80, height: 50, rx: 5, class: 'lab-weight ghost' }, g2); txt(g2, 0, -18, '? kg', 'lab-t wlabel'); }
    }
    weights = (cfg.weights || []).map(function (w) { return Object.assign({}, w); });
    draw(); showGhost();
    return {
      weights: function () { return weights; },
      setWeights: function (ws) { weights = ws; draw(); },
      tilt: function (done) {
        var r = Sim.lever(weights), target = r.tilt === 'left' ? -10 : r.tilt === 'right' ? 10 : 0, a0 = ang;
        tween(800, function (e) { ang = a0 + (target - a0) * e; draw(); }, function () { done && done(r); });
      },
      level: function () { ang = 0; draw(); }
    };
  }

  /* ================= GEARS ================= */
  function gearPath(teeth, r) {
    var d = '', ro = r + 6, ri = r - 6, n = teeth * 2;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, rr = i % 2 === 0 ? ro : ri;
      d += (i ? 'L' : 'M') + (Math.cos(a0) * rr).toFixed(1) + ',' + (Math.sin(a0) * rr).toFixed(1) + 'L' + (Math.cos(a1) * rr).toFixed(1) + ',' + (Math.sin(a1) * rr).toFixed(1);
    }
    return d + 'Z';
  }
  function gears(host, cfg) {
    var svg = svgRoot(host, 'Tandhjul'), teeth = cfg.teeth;
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    var radii = teeth.map(function (t) { return t * 2.6 + 4; }), total = 0;
    radii.forEach(function (r, i) { total += 2 * r - (i ? 0 : 0); }); total -= (radii.length - 1) * 6;
    var sc = Math.min(1.7, 700 / total, 300 / (2 * Math.max.apply(null, radii) + 12)), x = 400 - total * sc / 2, nodes = [], colors = ['#E0A526', '#3E8FC4', '#D9463B', '#3F8A3A'];
    var root2 = g(svg, { transform: 'translate(0,' + 240 + ') scale(' + sc + ')' });
    x = x / sc;
    radii.forEach(function (r, i) {
      if (i) x += radii[i - 1] + r - 6; else x += r;
      var gg = g(root2, { transform: 'translate(' + x + ',0)' }), rot = g(gg);
      el('path', { d: gearPath(teeth[i], r), fill: colors[i % 4], class: 'lab-gear' }, rot);
      el('circle', { r: Math.max(8, r * 0.18), class: 'lab-axle' }, rot);
      el('line', { x1: 0, y1: 0, x2: 0, y2: -r + 14, class: 'lab-spoke' }, rot);
      var lt = txt(gg, 0, i % 2 ? -r - 30 : r + 40, (cfg.labels ? cfg.labels[i] + ': ' : '') + teeth[i] + ' tænder', 'lab-t small'); lt.setAttribute('transform', 'scale(' + (1 / sc) + ')'); lt.setAttribute('y', (i % 2 ? -r - 30 : r + 40) * sc);
      nodes.push({ rot: rot, phase: i % 2 ? 180 / teeth[i] : 0 });
    });
    // direction arrow on the first gear
    var r0 = radii[0], arrow = g(root2, { transform: 'translate(' + (400 / sc - total / 2 + r0) + ',0)' });
    if (cfg.dir) el('path', { d: cfg.dir > 0 ? 'M' + (-r0 * 0.6) + ',' + (-r0 - 22) + ' A' + (r0 + 22) + ',' + (r0 + 22) + ' 0 0 1 ' + (r0 * 0.6) + ',' + (-r0 - 22) : 'M' + (r0 * 0.6) + ',' + (-r0 - 22) + ' A' + (r0 + 22) + ',' + (r0 + 22) + ' 0 0 0 ' + (-r0 * 0.6) + ',' + (-r0 - 22), class: 'lab-arrow', 'marker-end': 'url(#lab-ah)' }, arrow);
    var defs = el('defs', {}, svg); var mk = el('marker', { id: 'lab-ah', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 Z', fill: INK }, mk);
    function set(a0) { nodes.forEach(function (n, i) { var sp = Sim.gears(teeth)[i]; n.rot.setAttribute('transform', 'rotate(' + (n.phase + (cfg.dir || 1) * sp.dir * sp.turns * a0) + ')'); }); }
    set(0);
    return { run: function (done) { tween(3200, function (e, k) { set(k * 360); }, done); } };
  }

  /* ================= THERMOMETER / POT ================= */
  function thermo(host, cfg) {
    var svg = svgRoot(host, 'Gryde'), t = cfg.start;
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 180, y: 400, width: 360, height: 40, rx: 8, class: 'lab-stove' }, svg);
    var flame = g(svg, { transform: 'translate(360,400)' });
    var pot = g(svg);
    el('path', { d: 'M220,230 L500,230 L486,396 L234,396 Z', class: 'lab-pot' }, pot);
    el('path', { d: 'M200,236 L220,236 M500,236 L520,236', class: 'lab-pot-handle' }, pot);
    var content = g(svg), steam = g(svg);
    el('rect', { x: 640, y: 70, width: 40, height: 330, rx: 20, class: 'lab-thermo' }, svg);
    el('circle', { cx: 660, cy: 410, r: 30, class: 'lab-thermo-bulb' }, svg);
    var col = el('rect', { x: 650, y: 100, width: 20, height: 300, rx: 10, class: 'lab-thermo-col' }, svg);
    [-20, 0, 20, 40, 60, 80, 100, 120].forEach(function (v) { var y = yOf(v); el('line', { x1: 682, y1: y, x2: 696, y2: y, class: 'lab-tick' }, svg); txt(svg, 702, y + 5, v + '°', 'lab-t tiny', 'start'); });
    var tl = txt(svg, 360, 60, '', 'lab-t big');
    function yOf(v) { return 390 - (v + 30) / 160 * 290; }
    var bubbleT = 0;
    function draw() {
      var st = Sim.waterState(t);
      col.setAttribute('y', yOf(t)); col.setAttribute('height', Math.max(10, 420 - yOf(t)));
      tl.textContent = String(t).replace('-', '−') + ' °C · ' + S.states[st];
      content.innerHTML = '';
      if (st === 'fast') { [[260, 330], [330, 345], [400, 332], [300, 290], [370, 300]].forEach(function (p) { el('rect', { x: p[0], y: p[1], width: 56, height: 50, rx: 10, class: 'lab-ice' }, content); }); }
      else {
        el('path', { d: 'M232,280 L488,280 L486,396 L234,396 Z', class: 'lab-water' }, content);
        if (st === 'gas' || t >= 100) for (var i = 0; i < 9; i++) el('circle', { cx: 250 + (i * 31 + bubbleT * 7) % 230, cy: 380 - ((i * 37 + bubbleT * 13) % 90), r: 5 + (i % 3), class: 'lab-bubble' }, content);
      }
      steam.innerHTML = '';
      if (t >= 100) for (var j = 0; j < 4; j++) el('path', { d: 'M' + (280 + j * 50) + ',220 q-14,-30 0,-60 q14,-30 0,-60', class: 'lab-steam', opacity: 0.4 + 0.15 * ((bubbleT + j) % 3) }, steam);
      flame.innerHTML = '';
      if (t > 20) { var fs = Math.min(1.4, 0.5 + (t - 20) / 100); [-80, 0, 80].forEach(function (dx) { el('path', { d: 'M' + dx + ',0 q-14,-' + 30 * fs + ' 0,-' + 50 * fs + ' q14,' + 20 * fs + ' 0,' + 50 * fs, class: 'lab-flame' }, flame); }); }
    }
    draw();
    var anim = null;
    return {
      set: function (v) { t = v; draw(); },
      run: function (to, done) {
        var from = t; if (anim) anim.stop = true;
        anim = tween(Math.min(2400, 400 + Math.abs(to - from) * 14), function (e, k) { t = Math.round(from + (to - from) * e); bubbleT = Math.floor(k * 40); draw(); }, function () { done && done(Sim.waterState(t)); });
      }
    };
  }

  /* ================= BEAKER + INDICATOR ================= */
  var clearTint = { citron: '#FFF6C8', eddike: '#F7F7F2', cola: '#6B3A1E', danskvand: '#F3FAFF', maelk: '#FBFBF7', vand: '#EEF8FF', natron: '#F7F7F7', salmiak: '#F2F7F7', afloeb: '#F5F3E8' };
  function beaker(host, cfg) {
    var svg = svgRoot(host, 'Bægerglas');
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 150, y: 420, width: 500, height: 20, rx: 6, class: 'lab-table' }, svg);
    var liq = el('path', { d: 'M302,250 L498,250 L490,410 L310,410 Z', fill: cfg.ph !== undefined ? Sim.indicatorColor(cfg.ind, cfg.ph) : (clearTint[cfg.sub] || '#EEF8FF'), class: 'lab-liq2' }, svg);
    el('path', { d: 'M290,160 L290,412 Q290,420 300,420 L500,420 Q510,420 510,412 L510,160', class: 'lab-glass' }, svg);
    var dropper = g(svg, { transform: 'translate(400,40)' });
    dropper.innerHTML = '<g stroke="' + INK + '" stroke-width="3"><rect x="-14" y="0" width="28" height="36" rx="10" fill="#D9463B"/><path d="M-8,36 L-8,110 L0,126 L8,110 L8,36 Z" fill="#fff" fill-opacity=".7"/></g>';
    var drop = el('circle', { cx: 400, cy: 170, r: 7, fill: Sim.indicatorColor(cfg.ind, cfg.ind === 'btb' ? 7 : 6.5), opacity: 0 }, svg);
    var label = txt(svg, 400, 462, cfg.sub ? L.substances[cfg.sub].name : '', 'lab-t');
    var phl = txt(svg, 640, 300, '', 'lab-t big');
    function setColor(c) { liq.setAttribute('fill', c); }
    return {
      run: function (done) {
        var ph = L.substances[cfg.sub].pH, target = Sim.indicatorColor(cfg.ind, ph), n = 0;
        (function one() {
          tween(420, function (e) { drop.setAttribute('cy', 170 + e * 90); drop.setAttribute('opacity', 1 - e * 0.3); }, function () {
            drop.setAttribute('opacity', 0); n++;
            if (n < 3) one(); else tween(700, function () {}, function () { setColor(target); phl.textContent = S.phIs.replace('{ph}', String(ph).replace('.', ',')); done && done(); });
          });
        })();
      },
      show: function (sub, ind) { cfg.sub = sub; cfg.ind = ind; label.textContent = L.substances[sub].name; var ph = L.substances[sub].pH; setColor(Sim.indicatorColor(ind, ph)); phl.textContent = S.phIs.replace('{ph}', String(ph).replace('.', ',')); }
    };
  }

  /* ================= TITRATION ================= */
  function titration(host, cfg) {
    var svg = svgRoot(host, 'Titrering');
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 150, y: 420, width: 500, height: 20, rx: 6, class: 'lab-table' }, svg);
    el('rect', { x: 520, y: 30, width: 10, height: 390, class: 'lab-stand' }, svg);
    var maxV = Math.max(50, Math.ceil(cfg.target * 1.6 / 10) * 10);
    el('rect', { x: 382, y: 20, width: 36, height: 200, rx: 6, class: 'lab-burette' }, svg);
    var bLiq = el('rect', { x: 386, y: 24, width: 28, height: 192, class: 'lab-burette-liq' }, svg);
    for (var i = 0; i <= 10; i++) el('line', { x1: 382, y1: 24 + i * 19.2, x2: 392, y2: 24 + i * 19.2, class: 'lab-tick' }, svg);
    el('path', { d: 'M394,220 L406,220 L402,250 L398,250 Z', class: 'lab-tap' }, svg);
    el('path', { d: 'M418,120 L520,120', class: 'lab-clamp' }, svg);
    var liq = el('path', { d: '', class: 'lab-liq2' }, svg);
    el('path', { d: 'M310,270 L310,412 Q310,420 320,420 L480,420 Q490,420 490,412 L490,270', class: 'lab-glass' }, svg);
    var info = txt(svg, 640, 300, '', 'lab-t');
    var phT = txt(svg, 640, 334, '', 'lab-t big');
    function set(vb) {
      var ph = Sim.titration(cfg.ca, cfg.va, cfg.cb, vb), total = cfg.va + vb, h = 40 + total / (cfg.va + maxV) * 100;
      liq.setAttribute('d', 'M314,' + (418 - h) + ' L486,' + (418 - h) + ' L486,416 L314,416 Z');
      liq.setAttribute('fill', Sim.indicatorColor('btb', ph));
      var left = Math.max(0, 1 - vb / maxV); bLiq.setAttribute('y', 24 + 192 * (1 - left)); bLiq.setAttribute('height', 192 * left);
      info.textContent = S.added.replace('{ml}', num(vb));
      phT.textContent = S.phIs.replace('{ph}', num(Math.round(ph * 10) / 10));
      return ph;
    }
    set(0);
    return { set: set };
  }

  /* ================= FIZZ (eddike + natron) ================= */
  function fizz(host) {
    var svg = svgRoot(host, 'Flaske med ballon');
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 150, y: 420, width: 500, height: 20, rx: 6, class: 'lab-table' }, svg);
    var balloon = el('ellipse', { cx: 400, cy: 150, rx: 26, ry: 22, class: 'lab-balloon' }, svg);
    var liq = el('path', { d: 'M332,380 L468,380 L468,414 L332,414 Z', class: 'lab-vinegar' }, svg);
    var foam = g(svg);
    el('path', { d: 'M372,170 L372,240 Q326,256 326,300 L326,410 Q326,420 336,420 L464,420 Q474,420 474,410 L474,300 Q474,256 428,240 L428,170', class: 'lab-glass' }, svg);
    el('rect', { x: 340, y: 396, width: 120, height: 18, rx: 4, fill: '#fff', stroke: '#ccc' }, svg);
    return {
      run: function (done) {
        tween(2600, function (e, k) {
          var h = 34 + e * 60; liq.setAttribute('d', 'M332,' + (414 - h) + ' L468,' + (414 - h) + ' L468,414 L332,414 Z');
          foam.innerHTML = ''; for (var i = 0; i < 14; i++) el('circle', { cx: 340 + (i * 37 + k * 300) % 120, cy: 410 - h - ((i * 23 + k * 500) % 40), r: 5, class: 'lab-bubble' }, foam);
          balloon.setAttribute('ry', 22 + e * 70); balloon.setAttribute('rx', 26 + e * 60); balloon.setAttribute('cy', 150 - e * 60);
        }, done);
      }
    };
  }

  /* ================= POPULATION CHART ================= */
  function pop(host, cfg) {
    var svg = svgRoot(host, 'Diagram over harer og ræve');
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    var X0 = 90, X1 = 740, Y0 = 400, Y1 = 50;
    el('path', { d: 'M' + X0 + ',' + Y1 + ' L' + X0 + ',' + Y0 + ' L' + X1 + ',' + Y0, class: 'lab-axis' }, svg);
    txt(svg, (X0 + X1) / 2, 450, S.time + ' →', 'lab-t small');
    var gl = g(svg), hareL = el('path', { class: 'lab-line hare' }, svg), foxL = el('path', { class: 'lab-line fox' }, svg);
    var leg = g(svg, { transform: 'translate(' + (X0 + 20) + ',' + (Y1 + 6) + ')' });
    el('rect', { x: 0, y: -10, width: 22, height: 8, rx: 3, class: 'lab-key hare' }, leg); txt(leg, 30, 0, S.hares, 'lab-t small', 'start');
    el('rect', { x: 120, y: -10, width: 22, height: 8, rx: 3, class: 'lab-key fox' }, leg); txt(leg, 150, 0, S.foxes, 'lab-t small', 'start');
    var steps = 40, cut = cfg.remove ? 10 : -1, data = [];
    function simulate(h0, f0) {
      data = Sim.populations({ hares: h0, foxes: f0 }, cut > 0 ? cut : steps);
      if (cut > 0) {
        var last = data[data.length - 1], next = Sim.populations({ hares: cfg.remove === 'hares' ? 0 : last.H, foxes: cfg.remove === 'foxes' ? 0 : last.F }, steps - cut);
        data = data.concat(next.slice(1));
      }
    }
    simulate(cfg.hares, cfg.foxes);
    function path(key, upto) {
      var ymax = 220, d = '';
      for (var i = 0; i <= upto && i < data.length; i++) { var x = X0 + (X1 - X0) * i / steps, y = Y0 - (Y0 - Y1) * Math.min(1, data[i][key] / ymax); d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); }
      return d;
    }
    function draw(upto) {
      hareL.setAttribute('d', path('H', upto)); foxL.setAttribute('d', path('F', upto));
      gl.innerHTML = '';
      if (cut > 0 && upto >= cut) { var x = X0 + (X1 - X0) * cut / steps; el('line', { x1: x, y1: Y1 + 20, x2: x, y2: Y0, class: 'lab-cut' }, gl); txt(gl, x + 8, Y1 + 40, cfg.remove === 'foxes' ? S.removeFoxes : S.removeHares, 'lab-t small', 'start'); }
    }
    draw(cut > 0 ? cut : 0);
    return {
      run: function (done) { tween(2600, function (e, k) { draw(Math.round(k * steps)); }, done); },
      restart: function (h0, f0, remove, done) { cfg.remove = remove; cut = remove ? 10 : -1; simulate(h0, f0); this.run(done); }
    };
  }

  /* ================= CHAIN VIEW (fødenet) ================= */
  function chainview(host, cfg) {
    var svg = svgRoot(host, 'Fødekæde');
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    var n = cfg.ids.length, cards = [], step = 680 / n;
    cfg.ids.forEach(function (id, i) {
      var x = 60 + step * i + step / 2, gg = g(svg, { transform: 'translate(' + x + ',240)' });
      el('rect', { x: -70, y: -40, width: 140, height: 80, rx: 16, class: 'lab-card role-' + L.organisms[id].role.replace('æ', 'ae') }, gg);
      txt(gg, 0, 8, L.organisms[id].name, 'lab-t');
      if (i < n - 1) { el('path', { d: 'M' + (x + 74) + ',240 L' + (x + step - 74) + ',240', class: 'lab-chainarrow', 'marker-end': 'url(#lab-ah2)' }, svg); }
      cards.push({ g: gg, x: x, id: id });
    });
    var defs = el('defs', {}, svg); var mk = el('marker', { id: 'lab-ah2', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 Z', fill: INK }, mk);
    txt(svg, 400, 150, S.eats + ' →', 'lab-t small');
    return {
      run: function (done) {
        var idx = cfg.ids.indexOf(cfg.remove), seq = [];
        for (var i = idx - 1, up = true; i >= 0; i--, up = !up) seq.push({ i: i, up: up });
        var c = cards[idx]; el('path', { d: 'M-60,-34 L60,34 M60,-34 L-60,34', class: 'lab-cross' }, c.g);
        var k = 0;
        (function next() {
          if (k >= seq.length) return done && done();
          var s = seq[k++], cc = cards[s.i];
          var t = txt(svg, cc.x, 330, s.up ? '▲ flere' : '▼ færre', 'lab-t big ' + (s.up ? 'up' : 'down'));
          tween(700, function (e) { t.setAttribute('opacity', e); }, next);
        })();
      }
    };
  }

  /* ================= SMALL STATIC SCENES ================= */
  function scale(host, cfg) {
    var svg = svgRoot(host, 'Vægt');
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 250, y: 330, width: 300, height: 70, rx: 14, class: 'lab-scale' }, svg);
    el('rect', { x: 330, y: 346, width: 140, height: 40, rx: 6, class: 'lab-display' }, svg);
    txt(svg, 400, 376, LAB_NUM(cfg.m) + ' g', 'lab-t display');
    el('rect', { x: 340, y: 210, width: 120, height: 120, rx: 6, class: 'lab-block' }, svg);
    txt(svg, 400, 276, cfg.V + ' cm³', 'lab-t');
    return {};
  }
  function LAB_NUM(x) { return num(x); }
  function meter(host, cfg) {
    var svg = svgRoot(host, 'Strømkreds');
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('rect', { x: 170, y: 100, width: 460, height: 280, rx: 10, class: 'lab-loop' }, svg);
    var b = g(svg, { transform: 'translate(170,240) rotate(90)' }); el('rect', { x: -36, y: -22, width: 72, height: 44, rx: 6, class: 'lab-batt' }, b);
    txt(svg, 120, 246, num(cfg.U) + ' V', 'lab-t', 'end');
    var bu = g(svg, { transform: 'translate(630,240)' }); el('circle', { r: 30, class: 'lab-bulb on' }, bu); el('path', { d: 'M-12,8 Q-6,-12 0,8 Q6,-12 12,8', class: 'lab-filament' }, bu);
    txt(svg, 680, 246, cfg.R !== undefined ? cfg.R + ' Ω' : '? Ω', 'lab-t', 'start');
    var m = g(svg, { transform: 'translate(400,100)' }); el('circle', { r: 34, class: 'lab-ammeter' }, m); txt(m, 0, 8, 'A', 'lab-t big');
    txt(svg, 400, 60, cfg.I !== undefined ? num(cfg.I) + ' A' : '? A', 'lab-t');
    return {};
  }
  function pyramid(host, cfg) {
    var svg = svgRoot(host, 'Energipyramide'), n = cfg.ids.length;
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    cfg.ids.forEach(function (id, i) {
      var w = 600 - i * (440 / Math.max(1, n - 1 || 1)), y = 400 - i * 80;
      el('rect', { x: 400 - w / 2, y: y - 64, width: w, height: 70, rx: 10, class: 'lab-card role-' + L.organisms[id].role.replace('æ', 'ae') }, svg);
      txt(svg, 400, y - 22, L.organisms[id].name + (i === n - 1 ? ': ? kJ' : ''), 'lab-t');
    });
    return {};
  }
  function column(host) {
    var svg = svgRoot(host, 'Glas med væsker');
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'lab-bg' }, svg);
    el('path', { d: 'M320,120 L320,412 Q320,420 330,420 L470,420 Q480,420 480,412 L480,120', class: 'lab-glass' }, svg);
    return {};
  }

  /* ---------- station icons (for the menu) ---------- */
  var icons = {
    tank: '<svg viewBox="0 0 64 64"><rect x="8" y="14" width="48" height="42" rx="4" fill="#E6F4FC" stroke="#4A2C17" stroke-width="3"/><rect x="11" y="28" width="42" height="25" fill="#6BB8E0"/><rect x="24" y="20" width="16" height="14" rx="3" fill="#E2B270" stroke="#4A2C17" stroke-width="2.5"/></svg>',
    board: '<svg viewBox="0 0 64 64"><circle cx="32" cy="26" r="16" fill="#FCE7A8" stroke="#4A2C17" stroke-width="3"/><path d="M26 30 Q29 20 32 30 Q35 20 38 30" fill="none" stroke="#4A2C17" stroke-width="2.5"/><rect x="25" y="42" width="14" height="12" rx="3" fill="#A7A9AC" stroke="#4A2C17" stroke-width="3"/></svg>',
    lever: '<svg viewBox="0 0 64 64"><path d="M32 40 L22 56 L42 56 Z" fill="#8A5A3B" stroke="#4A2C17" stroke-width="3" stroke-linejoin="round"/><rect x="6" y="34" width="52" height="6" rx="3" fill="#E2B270" stroke="#4A2C17" stroke-width="2.5" transform="rotate(-10 32 37)"/><rect x="8" y="22" width="12" height="12" rx="2" fill="#7D7B74" stroke="#4A2C17" stroke-width="2.5"/></svg>',
    kitchen: '<svg viewBox="0 0 64 64"><path d="M26 8 L38 8 M28 8 L28 26 L12 52 Q10 57 16 57 L48 57 Q54 57 52 52 L36 26 L36 8" fill="#fff" stroke="#4A2C17" stroke-width="3" stroke-linejoin="round"/><path d="M18 44 L46 44 L51 53 Q52 55 49 55 L15 55 Q12 55 13 53 Z" fill="#C2407F"/></svg>',
    eco: '<svg viewBox="0 0 64 64"><path d="M32 58 L32 30" stroke="#4A2C17" stroke-width="3"/><path d="M32 34 C14 34 10 18 12 8 C26 8 34 18 32 34 Z" fill="#6FB57E" stroke="#4A2C17" stroke-width="3"/><path d="M32 40 C46 40 54 30 54 20 C42 20 34 28 32 40 Z" fill="#9BD08A" stroke="#4A2C17" stroke-width="3"/></svg>'
  };

  var kinds = { tank: tank, boat: boat, ship: ship, board: board, lever: lever, gears: gears, thermo: thermo, beaker: beaker, titration: titration, fizz: fizz, pop: pop, chainview: chainview, scale: scale, meter: meter, pyramid: pyramid, column: column };
  root.LabScenes = {
    create: function (kind, host, cfg, opts) { return kinds[kind] ? kinds[kind](host, cfg || {}, opts || {}) : null; },
    has: function (kind) { return !!kinds[kind]; },
    objShape: objShape, icons: icons, stopAll: stopAll
  };
})(window);
