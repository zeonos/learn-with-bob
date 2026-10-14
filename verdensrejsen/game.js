/*
 * Verdensrejsen – geografispil.
 * Bob flyver rundt i verden. Børnene finder byer, øer, lande, have, floder og bjerge på kortet,
 * svarer på hovedstæder og kompasretninger og gætter lande ud fra spor. Hver rejse giver et stempel i passet.
 */
(function (root) {
  'use strict';
  var Core = root.Core, M = root.VR_MAPS, P = root.VR_PLACES, Bob = root.Bob, S = root.STR.vr, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'verdensrejsen', STEPS = 10, NS = 'http://www.w3.org/2000/svg';
  var app = null, st = null, timers = [], clock = 0, el = {}, map = null;

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {}; d.visited = d.visited || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0, date: null }); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ---------- Danish helpers ---------- */
  function gen(name) { // genitive: Danmarks, Schweiz', USA's
    if (/^[A-ZÆØÅ]+$/.test(name)) return name + "'s";
    if (/[sxz]$/i.test(name)) return name + "'";
    return name + 's';
  }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function popText(pop) {
    if (pop >= 1e9) return t(S.mia, { n: String(Math.round(pop / 1e8) / 10).replace('.', ',') });
    if (pop >= 1e6) { var m = pop / 1e6; return t(S.mio, { n: m >= 10 ? Math.round(m) : String(Math.round(m * 10) / 10).replace('.', ',') }); }
    if (pop >= 10000) return thousands(Math.round(pop / 1000) * 1000);
    return thousands(Math.round(pop / 100) * 100);
  }
  function countryName(id) { return (P.world[id] || P.europe[id] || P.norden[id] || {}).da; }
  function capitalName(id) { return (P.world[id] || P.europe[id] || P.norden[id] || {}).cap; }
  function placeName(layer, id) {
    if (layer === 'island') return (P.islands.filter(function (x) { return x.id === id; })[0] || {}).da;
    if (layer === 'continent') return (P.continents.filter(function (x) { return x.id === id; })[0] || {}).da;
    if (layer === 'sea') return (P.seas.filter(function (x) { return x.id === id; })[0] || {}).da;
    if (layer === 'range') return (P.ranges.filter(function (x) { return x.id === id; })[0] || {}).da;
    if (layer === 'river') return (P.rivers.filter(function (x) { return x.id === id; })[0] || {}).da;
    if (layer === 'town') return (P.towns.filter(function (x) { return x.id === id; })[0] || {}).da;
    return countryName(id);
  }

  /* ---------- geometry ---------- */
  function ringsPath(rs, closed) {
    return rs.map(function (f) { var d = 'M' + f[0] + ' ' + f[1]; for (var i = 2; i < f.length; i += 2) d += 'L' + f[i] + ' ' + f[i + 1]; return d + (closed ? 'Z' : ''); }).join('');
  }
  function pointIn(pt, rs) {
    var inside = false;
    rs.forEach(function (f) {
      for (var i = 0, j = f.length - 2; i < f.length; j = i, i += 2) {
        var xi = f[i], yi = f[i + 1], xj = f[j], yj = f[j + 1];
        if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
      }
    });
    return inside;
  }
  function segDist(p, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, u = l ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l)) : 0;
    var x = ax + u * dx - p[0], y = ay + u * dy - p[1]; return Math.sqrt(x * x + y * y);
  }
  function distToRings(p, rs, closed) {
    var best = Infinity;
    rs.forEach(function (f) {
      for (var i = 0; i + 2 < f.length; i += 2) best = Math.min(best, segDist(p, f[i], f[i + 1], f[i + 2], f[i + 3]));
      if (closed && f.length >= 4) best = Math.min(best, segDist(p, f[f.length - 2], f[f.length - 1], f[0], f[1]));
    });
    return best;
  }
  function unproject(m, x, y) { var pr = m.proj; return { lon: x / (pr.k * pr.s) + pr.lon0, lat: pr.lat1 - y / pr.s }; }
  function km(a, b) {
    var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function sector(dx, dy) { var a = Math.atan2(dx, -dy) * 180 / Math.PI; if (a < 0) a += 360; return { s: Math.round(a / 45) % 8, a: a }; }

  /* ---------- interactive SVG map with pan & zoom ---------- */
  function createMap(container, key, opts) {
    var m = M[key], W = m.W, H = m.H, vb = { x: 0, y: 0, w: W, h: H };
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'vr-svg'); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Kort');
    function node(tag, attrs, parent) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); (parent || svg).appendChild(n); return n; }
    node('rect', { x: -W, y: -H, width: 3 * W, height: 3 * H, class: 'vr-water' });
    var gBg = node('g', { class: 'vr-bg' }), gLand = node('g', { class: 'vr-land' }), gNat = node('g', { class: 'vr-nature' }), gMarks = node('g', { class: 'vr-marks' });
    (m.bg || []).forEach(function (rs) { node('path', { d: ringsPath(rs, true) }, gBg); });
    var landEls = {};
    m.land.forEach(function (l) { landEls[l.id] = node('path', { d: ringsPath(l.r, true), 'data-id': l.id }, gLand); });
    var natEls = {};
    if (opts.nature) {
      (m.ranges || []).forEach(function (l) {
        var kind = (P.ranges.filter(function (x) { return x.id === l.id; })[0] || {}).kind;
        natEls[l.id] = node('path', { d: ringsPath(l.r, true), class: kind === 'ørken' ? 'vr-desert' : 'vr-range' }, gNat);
      });
      (m.rivers || []).forEach(function (l) { natEls[l.id] = node('path', { d: ringsPath(l.r, false), class: 'vr-river' }, gNat); });
    }
    var plane = node('g', { class: 'vr-plane', opacity: 0 }, gMarks);
    plane.innerHTML = '<g class="vr-plane-rot"><path d="M0,-14 L3,-4 L14,2 L14,5 L3,2 L2,10 L6,13 L6,15 L0,13 L-6,15 L-6,13 L-2,10 L-3,2 L-14,5 L-14,2 L-3,-4 Z" fill="#fff" stroke="#2B4A6B" stroke-width="1.6" stroke-linejoin="round"/></g>';
    container.appendChild(svg);

    function apply() {
      svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
      var sc = vb.w / W; svg.style.setProperty('--z', sc);
      svg.querySelectorAll('.vr-mark').forEach(function (n) { n.setAttribute('transform', 'translate(' + n._x + ',' + n._y + ') scale(' + unit() + ')'); });
      plane.setAttribute('transform', 'translate(' + (plane._x || 0) + ',' + (plane._y || 0) + ') scale(' + unit() * 1.2 + ')');
    }
    function unit() { var r = svg.getBoundingClientRect(); return r.width ? Math.max(vb.w / r.width, vb.h / r.height) : vb.w / 600; } // svg units per screen pixel
    function clamp() {
      vb.w = Math.max(W / 8, Math.min(W, vb.w)); vb.h = vb.w * H / W;
      vb.x = Math.max(-vb.w * 0.25, Math.min(W - vb.w * 0.75, vb.x)); vb.y = Math.max(-vb.h * 0.25, Math.min(H - vb.h * 0.75, vb.y));
    }
    function zoomAt(f, cx, cy) {
      var nx = cx - (cx - vb.x) / f, ny = cy - (cy - vb.y) / f;
      vb.w /= f; vb.h /= f; vb.x = nx; vb.y = ny; clamp(); apply();
    }
    function toMap(clientX, clientY) {
      var pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
      var p = pt.matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y];
    }
    // pointer handling: tap, drag to pan, pinch to zoom
    var ptrs = {}, start = null, moved = false, pinch = null;
    svg.addEventListener('pointerdown', function (e) {
      svg.setPointerCapture(e.pointerId); ptrs[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(ptrs);
      if (ids.length === 1) { start = { x: e.clientX, y: e.clientY, vb: { x: vb.x, y: vb.y } }; moved = false; }
      if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: vb.w }; moved = true; }
    });
    svg.addEventListener('pointermove', function (e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(ptrs);
      if (ids.length === 2 && pinch) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        var c = toMap((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        zoomAt(vb.w / (pinch.w * pinch.d / d), c[0], c[1]);
      } else if (ids.length === 1 && start) {
        var dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!moved && Math.abs(dx) + Math.abs(dy) > 8 && vb.w < W * 0.999) moved = true;
        if (moved) { var u = unit(); vb.x = start.vb.x - dx * u; vb.y = start.vb.y - dy * u; clamp(); apply(); }
      }
    });
    function up(e) {
      var was = ptrs[e.pointerId]; delete ptrs[e.pointerId];
      if (Object.keys(ptrs).length < 2) pinch = null;
      if (!was || Object.keys(ptrs).length) return;
      if (!moved && start && opts.onTap) opts.onTap(toMap(e.clientX, e.clientY), unit());
      start = null;
    }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', function (e) { delete ptrs[e.pointerId]; start = null; pinch = null; });
    svg.addEventListener('wheel', function (e) { e.preventDefault(); var c = toMap(e.clientX, e.clientY); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, c[0], c[1]); }, { passive: false });

    var api = {
      m: m, svg: svg, landEls: landEls, natEls: natEls, unit: unit, toMap: toMap,
      zoomIn: function () { zoomAt(1.5, vb.x + vb.w / 2, vb.y + vb.h / 2); },
      zoomOut: function () { zoomAt(1 / 1.5, vb.x + vb.w / 2, vb.y + vb.h / 2); },
      reset: function () { vb = { x: 0, y: 0, w: W, h: H }; apply(); },
      mark: function (x, y, cls, label) {
        var g = node('g', { class: 'vr-mark ' + (cls || '') }, gMarks); g._x = x; g._y = y;
        var txt = label ? '<text y="' + (cls === 'flag' ? -32 : -13) + '" text-anchor="middle" class="vr-label">' + esc(label) + '</text>' : '';
        if (cls === 'flag') g.innerHTML = '<path d="M0,0 V-26" stroke="#4A2C17" stroke-width="2.5"/><path d="M0,-26 L16,-21 L0,-15 Z" fill="#D9463B" stroke="#4A2C17" stroke-width="1.5"/><circle r="3.5" fill="#4A2C17"/>' + txt;
        else if (cls === 'start') g.innerHTML = '<circle r="8" fill="#F7C548" stroke="#4A2C17" stroke-width="2.5"/>' + txt;
        else g.innerHTML = '<circle r="7" class="vr-dot"/>' + txt;
        gMarks.insertBefore(g, plane);
        apply(); return g;
      },
      line: function (x1, y1, x2, y2) { var l = node('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'vr-line' }, gMarks); gMarks.insertBefore(l, gMarks.firstChild); return l; },
      clearMarks: function () { [].slice.call(gMarks.childNodes).forEach(function (n) { if (n !== plane) n.remove(); }); },
      highlight: function (layerEls, id, cls) { var n = layerEls[id]; if (n) n.classList.add(cls); },
      clearHighlights: function () { svg.querySelectorAll('.hl-ok,.hl-bad,.hl-ask').forEach(function (n) { n.classList.remove('hl-ok', 'hl-bad', 'hl-ask'); }); },
      flyTo: function (x, y, done, keep) {
        var x0 = plane._x === undefined ? x : plane._x, y0 = plane._y === undefined ? y + 60 : plane._y, t0 = performance.now(), dur = 900;
        var ang = Math.atan2(x - x0, -(y - y0)) * 180 / Math.PI;
        plane.querySelector('.vr-plane-rot').setAttribute('transform', 'rotate(' + ang + ')');
        clearTimeout(plane._fade); plane.setAttribute('opacity', 1);
        (function step(now) {
          var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          plane._x = x0 + (x - x0) * e; plane._y = y0 + (y - y0) * e - Math.sin(k * Math.PI) * 30 * unit(); apply();
          if (k < 1) requestAnimationFrame(step); else { if (!keep) plane._fade = setTimeout(function () { plane.setAttribute('opacity', 0); }, 900); if (done) done(); }
        })(t0);
      },
      show: function (x, y) { // pan so that (x, y) is inside the visible part of the map
        if (vb.w >= W * 0.999) return; // whole map visible
        var mx = vb.w * 0.12, my = vb.h * 0.12;
        if (x > vb.x + mx && x < vb.x + vb.w - mx && y > vb.y + my && y < vb.y + vb.h - my) return;
        vb.x = x - vb.w / 2; vb.y = y - vb.h / 2; clamp(); apply();
      },
      focus: function (x, y) { // zoom towards a point when the map is very small on screen
        var r = svg.getBoundingClientRect(); if (r.width > 520) return;
        vb.w = W / 2; vb.h = H / 2; vb.x = x - vb.w / 2; vb.y = y - vb.h / 2; clamp(); apply();
      }
    };
    apply();
    root.addEventListener('resize', apply);
    api.destroy = function () { root.removeEventListener('resize', apply); };
    return api;
  }

  /* ---------- tasks ---------- */
  function townPt(id) { return M.dk.points.filter(function (p) { return p.id === id; })[0]; }
  function capPt(key, id) { return M[key].points.filter(function (p) { return p.id === 'cap-' + id; })[0]; }
  function buildTasks(route) {
    var out = [];
    if (route.kind === 'town') shuffle(P.towns).slice(0, STEPS).forEach(function (tw) {
      out.push({ type: 'point', map: 'dk', name: tw.da, sub: S.kinds.by, pt: townPt(tw.id), tolKm: 15, key: 'town:' + tw.id });
    });
    if (route.kind === 'island') shuffle(P.islands).slice(0, STEPS).forEach(function (is) {
      out.push({ type: 'poly', map: 'dk', layer: 'island', id: is.id, name: is.da, sub: is.id === 'jylland' ? S.kinds.halvoe : S.kinds.oe, key: 'island:' + is.id });
    });
    if (route.kind === 'norden') {
      var ids = shuffle(P.nordenIds);
      ids.slice(0, 5).forEach(function (id) { out.push({ type: 'poly', map: 'norden', layer: 'country', id: id, name: P.norden[id].da, key: 'country:' + id }); });
      ids.slice(3).concat(ids.slice(0, 3)).slice(0, 5).forEach(function (id) {
        out.push({ type: 'point', map: 'norden', cap: true, name: P.norden[id].cap, sub: t(S.capitalOf, { land: gen(P.norden[id].da) }), pt: capPt('norden', id), tolKm: 80, key: 'country:' + id });
      });
    }
    if (route.kind === 'world') {
      shuffle(P.continents).slice(0, 5).forEach(function (c) { out.push({ type: 'continent', map: 'world', id: c.id, name: c.da, key: 'continent:' + c.id }); });
      shuffle(P.seas).slice(0, 5).forEach(function (s) { out.push({ type: 'sea', map: 'world', id: s.id, name: s.da, key: 'sea:' + s.id }); });
    }
    if (route.kind === 'compass') {
      var guard = 0;
      while (out.length < STEPS && guard++ < 2000) {
        var a = pick(P.towns), b = pick(P.towns); if (a === b) continue;
        var pa = townPt(a.id), pb = townPt(b.id), dx = pb.x - pa.x, dy = pb.y - pa.y;
        if (Math.hypot(dx, dy) < 130) continue; // ca. 60 km
        var sc = sector(dx, dy); if (Math.abs(sc.a - sc.s * 45) > 12 && Math.abs(sc.a - 360) > 12) continue;
        if (out.some(function (o) { return o.a === a || o.b === b; })) continue;
        out.push({ type: 'compass', map: 'dk', a: a, b: b, pa: pa, pb: pb, answer: sc.s, key: 'compass' });
      }
    }
    if (route.kind === 'country') {
      var src = route.map === 'europe' ? P.europe : P.world;
      shuffle(Object.keys(src).filter(function (id) { return src[id].quiz !== false; })).slice(0, STEPS).forEach(function (id) {
        out.push({ type: 'poly', map: route.map, layer: 'country', id: id, name: src[id].da, key: 'country:' + id });
      });
    }
    if (route.kind === 'capital') {
      var src2 = route.map === 'europe' ? P.europe : P.world;
      var pool = Object.keys(src2).filter(function (id) { return src2[id].cap && src2[id].quiz !== false; });
      shuffle(pool).slice(0, STEPS).forEach(function (id) {
        var others = shuffle(pool.filter(function (x) { return x !== id; })).slice(0, 3).map(function (x) { return src2[x].cap; });
        out.push({ type: 'mc', map: route.map, id: id, q: t(S.capitalQ, { land: gen(src2[id].da) }), answer: src2[id].cap, options: shuffle(others.concat([src2[id].cap])), pt: capPt(route.map, id), key: 'country:' + id });
      });
    }
    if (route.kind === 'nature') {
      var items = P.ranges.map(function (r) { return { layer: 'range', id: r.id, name: r.da, sub: r.kind === 'ørken' ? S.kinds['ørken'] : S.kinds.bjerge }; })
        .concat(P.rivers.map(function (r) { return { layer: 'river', id: r.id, name: r.da, sub: S.kinds.flod }; }));
      shuffle(items).slice(0, STEPS).forEach(function (it) { out.push({ type: 'nature', map: 'world', layer: it.layer, id: it.id, name: it.name, sub: it.sub, key: 'nature:' + it.id }); });
    }
    if (route.kind === 'clues') {
      var ids2 = Object.keys(P.clues).filter(function (id) { return M.facts[id] && P.world[id]; });
      shuffle(ids2).slice(0, STEPS).forEach(function (id) {
        var f = M.facts[id], others = shuffle(ids2.filter(function (x) { return x !== id; })).slice(0, 3);
        out.push({ type: 'clues', map: 'world', id: id, answer: id, options: shuffle(others.concat([id])), key: 'country:' + id,
          clues: [t(S.clueContinent, { c: S.continents[f.cont] || f.cont, pop: popText(f.pop) }), P.clues[id], t(S.clueCapital, { cap: P.world[id].cap })] });
      });
    }
    return out;
  }

  /* ---------- hub API ---------- */
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = P.routes.filter(function (r) { return r.b === band; });
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    P.routes.forEach(function (r) { var rs = (d.routes || {})[r.id]; if (rs && rs.plays) rows.push([r.name + ' (' + r.b + ')', rs.stars + '/3', rs.best + ' %']); });
    return { head: S.reportHead, rows: rows };
  }

  function progress(d) { return Core.routeProgress(d, P.routes); }
  // The passport: one stamp per route with at least one star
  function collection(d) { return { n: P.routes.filter(function (r) { return ((d.routes || {})[r.id] || {}).stars > 0; }).length, max: P.routes.length }; }
  // Daily challenge: Mellemtrin gets a Nordic capital or a continent, Udskoling a capital or a clue hunt.
  function quickTask(band) {
    function capQ(src) {
      var pool = Object.keys(src).filter(function (id) { return src[id].cap && src[id].quiz !== false; }), id = pick(pool);
      var others = shuffle(pool.filter(function (x) { return x !== id; })).slice(0, 3).map(function (x) { return src[x].cap; });
      return { q: t(S.capitalQ, { land: gen(src[id].da) }), options: shuffle(others.concat([src[id].cap])), answer: src[id].cap, hint: S.quickHintCapital, explain: t(S.clueCapital, { cap: src[id].cap }) };
    }
    var ids = Object.keys(P.world).filter(function (id) { return M.facts[id] && P.world[id].quiz !== false; });
    if (band !== 'U') {
      if (Math.random() < 0.5) return capQ(P.norden);
      var id = pick(ids), cont = S.continents[M.facts[id].cont];
      var wrong = shuffle(['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'].map(function (c) { return S.continents[c]; }).filter(function (c) { return c !== cont; })).slice(0, 3);
      return { q: t(S.quickContinentQ, { land: P.world[id].da }), options: shuffle(wrong.concat([cont])), answer: cont, hint: S.quickHintContinent };
    }
    var r = Math.random();
    if (r < 0.35) return capQ(P.europe);
    if (r < 0.6) return capQ(P.world);
    var cl = Object.keys(P.clues).filter(function (x) { return M.facts[x] && P.world[x]; }), c = pick(cl), f = M.facts[c];
    var opts = shuffle(cl.filter(function (x) { return x !== c; })).slice(0, 3).concat([c]).map(function (x) { return P.world[x].da; });
    return { q: S.quickClueQ, big: t(S.clueContinent, { c: S.continents[f.cont] || f.cont, pop: popText(f.pop) }) + ' ' + P.clues[c], options: shuffle(opts), answer: P.world[c].da,
      hint: t(S.clueCapital, { cap: P.world[c].cap }) };
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearTimers(); clearInterval(clock); if (map) map.destroy(); map = null; st = null; el = {}; Core.save(); }

  /* ================= ROUTE LIST ================= */
  function showMap() {
    clearTimers(); if (map) { map.destroy(); map = null; } st = null; el = {};
    var d = data(), list = P.routes.filter(function (r) { return r.b === d.band; }), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (routeState(list[i].id).stars < 3) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    var stamps = P.routes.filter(function (r) { return (d.routes[r.id] || {}).stars > 0; }).length;
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen vr-list' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back), h('button', { type: 'button', class: 'btn secondary', onclick: showPassport }, S.passport + ' (' + stamps + ')')]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: 'pilot', size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id);
        return h('button', { type: 'button', class: 'rs-world vr-route' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, r.name), h('span', { class: 'rs-world-desc' }, r.desc), h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      }))
    ]));
  }

  /* ================= PASSPORT ================= */
  function factLines(key) {
    var p = key.split(':'), kind = p[0], id = p[1];
    if (kind === 'country' || kind === 'capital') {
      var f = M.facts[id] || {}, cap = capitalName(id), lines = [];
      if (cap) lines.push(t(S.factCapital, { cap: cap }));
      if (f.cont) lines.push(t(S.factContinent, { c: S.continents[f.cont] || f.cont }));
      if (f.pop) lines.push(t(S.factPop, { pop: popText(f.pop), year: f.year }));
      return { name: countryName(id), lines: lines };
    }
    if (kind === 'town') return { name: placeName('town', id), lines: [S.kinds.by] };
    if (kind === 'island') return { name: placeName('island', id), lines: [id === 'jylland' ? S.kinds.halvoe : S.kinds.oe] };
    if (kind === 'continent') return { name: placeName('continent', id), lines: [S.kinds.verdensdel] };
    if (kind === 'sea') return { name: placeName('sea', id), lines: [['atlanterhavet', 'stillehavet', 'indiske'].indexOf(id) >= 0 ? S.kinds.ocean : S.kinds.hav] };
    if (kind === 'nature') { var r = P.ranges.filter(function (x) { return x.id === id; })[0]; return { name: r ? r.da : placeName('river', id), lines: [r ? (r.kind === 'ørken' ? S.kinds['ørken'] : S.kinds.bjerge) : S.kinds.flod] }; }
    return { name: key, lines: [] };
  }
  function showPassport() {
    var d = data(), keys = Object.keys(d.visited);
    var detail = h('div', { class: 'vr-fact', role: 'status' }, keys.length ? S.passportTap : '');
    var pages = P.routes.filter(function (r) { return (d.routes[r.id] || {}).stars > 0; }).map(function (r, i) {
      var rs = d.routes[r.id];
      return h('div', { class: 'vr-stamp s' + (i % 5), html: '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="6 4"/><circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }, [
        h('strong', {}, r.name), h('span', { html: Core.starIcons(rs.stars, 3, 'small') }), rs.date ? h('small', {}, rs.date) : null]);
    });
    var seenName = {};
    var places = keys.map(function (k) { return { k: k.replace(/^capital:/, 'country:'), f: factLines(k) }; })
      .filter(function (x) { if (!x.f.name || seenName[x.f.name]) return false; seenName[x.f.name] = 1; return true; })
      .sort(function (a, b) { return a.f.name.localeCompare(b.f.name, 'da'); });
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.passportTitle)]),
      pages.length ? h('div', { class: 'vr-stamps' }, pages) : h('p', { class: 'lead' }, S.passportEmpty),
      places.length ? h('h2', {}, t(S.passportPlaces, { n: places.length })) : null,
      places.length ? detail : null,
      h('div', { class: 'vr-chips' }, places.map(function (x) {
        return h('button', { type: 'button', class: 'vr-chip', onclick: function () { detail.innerHTML = ''; detail.appendChild(h('strong', {}, x.f.name)); x.f.lines.forEach(function (l) { detail.appendChild(h('span', {}, l)); }); } }, x.f.name);
      })),
      places.length ? h('p', { class: 'muted small' }, S.source) : null
    ]));
  }

  /* ================= ROUND ================= */
  function startRound(route) {
    clearTimers(); if (map) { map.destroy(); map = null; }
    st = { route: route, tasks: buildTasks(route), i: 0, results: [], attempt: 0, locked: false };
    app.innerHTML = '';
    el.step = h('span', { class: 'rs-wave' });
    el.prompt = h('div', { class: 'vr-prompt', 'aria-live': 'polite' });
    el.mapBox = h('div', { class: 'vr-map' });
    el.bob = h('div', { class: 'vr-bob' }); el.bubble = h('div', { class: 'vr-bubble', role: 'status', 'aria-live': 'polite' });
    el.zoom = h('div', { class: 'vr-zoom' }, [
      h('button', { type: 'button', 'aria-label': S.zoomIn, title: S.zoomIn, onclick: function () { map && map.zoomIn(); } }, '+'),
      h('button', { type: 'button', 'aria-label': S.zoomOut, title: S.zoomOut, onclick: function () { map && map.zoomOut(); } }, '−'),
      h('button', { type: 'button', 'aria-label': S.zoomReset, title: S.zoomReset, onclick: function () { map && map.reset(); }, html: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>' })
    ]);
    el.panel = h('div', { class: 'vr-panel' });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, onclick: askLeave, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, route.name), el.step]), h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.north = h('div', { class: 'vr-north', 'aria-hidden': 'true', html: '<svg viewBox="0 0 40 52"><path d="M20 14 L28 40 L20 34 L12 40 Z" fill="#D9463B" stroke="#4A2C17" stroke-width="2" stroke-linejoin="round"/><text x="20" y="11" text-anchor="middle">N</text></svg>' });
    el.root = h('div', { class: 'vr-play' }, [hud, h('div', { class: 'vr-stage' }, [el.mapBox, el.zoom, el.north]),
      h('aside', { class: 'vr-side' }, [h('div', { class: 'vr-bobrow' }, [el.bob, el.bubble]), el.prompt, el.panel])]);
    app.appendChild(el.root);
    showTask();
    setBob('hello', pick(S.bobStart));
  }
  function setBob(expr, text) {
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: 'pilot', size: 160 });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    el.bubble.textContent = text || ''; el.bubble.classList.toggle('show', !!text);
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ), h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }
  function task() { return st.tasks[st.i]; }

  function ensureMap(tk) {
    var needNature = tk.type === 'nature';
    if (map && map.key === tk.map && map.nature === needNature) { map.clearMarks(); map.clearHighlights(); return; }
    if (map) map.destroy();
    el.mapBox.innerHTML = '';
    map = createMap(el.mapBox, tk.map, { nature: needNature, onTap: onTap });
    map.key = tk.map; map.nature = needNature;
    el.mapBox.className = 'vr-map map-' + tk.map;
  }

  function showTask() {
    clearTimers();
    var tk = task(); if (!tk) return finish();
    st.attempt = 0; st.locked = false; st.clue = 0;
    if (st.i > 0) setBob('default', null);
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    ensureMap(tk);
    el.panel.innerHTML = ''; el.prompt.innerHTML = '';
    var tapTask = tk.type === 'point' || tk.type === 'poly' || tk.type === 'continent' || tk.type === 'sea' || tk.type === 'nature';
    el.root.classList.toggle('tapmode', tapTask);
    if (tapTask) {
      var q = tk.type === 'continent' ? t(S.findContinent, { name: tk.name }) : tk.type === 'sea' ? t(S.findSea, { name: tk.name }) : tk.cap ? t(S.findCapital, { cap: tk.name }) : t(S.find, { name: tk.name });
      el.prompt.appendChild(h('strong', {}, q));
      if (tk.sub) el.prompt.appendChild(h('span', {}, tk.sub));
      el.panel.appendChild(h('p', { class: 'muted small vr-taphint' }, S.tapHint));
    } else if (tk.type === 'compass') {
      el.prompt.appendChild(h('strong', {}, t(S.compassQ, { a: tk.a.da, b: tk.b.da })));
      map.mark(tk.pa.x, tk.pa.y, 'start', tk.a.da); map.mark(tk.pb.x, tk.pb.y, 'flag', tk.b.da);
      map.flyTo(tk.pa.x, tk.pa.y, null, true);
      var rose = h('div', { class: 'vr-rose' });
      [7, 0, 1, 6, -1, 2, 5, 4, 3].forEach(function (s) {
        if (s < 0) { rose.appendChild(h('span', { class: 'vr-rose-c', 'aria-hidden': 'true' }, '✈')); return; }
        var b = h('button', { type: 'button', class: 'vr-dir', 'aria-label': S.dirsLong[s], onclick: function () { answerChoice(s, b); } }, [h('strong', {}, S.dirsShort[s]), h('small', {}, S.dirsLong[s])]);
        rose.appendChild(b);
      });
      el.panel.appendChild(rose);
    } else if (tk.type === 'mc') {
      el.prompt.appendChild(h('strong', {}, tk.q));
      highlightCountry(tk.id, 'hl-ask');
      var lc = map.m.land.filter(function (x) { return x.id === tk.id; })[0]; if (lc) map.show(lc.c[0], lc.c[1]);
      el.panel.appendChild(h('div', { class: 'vr-options' }, tk.options.map(function (o) { var b = h('button', { type: 'button', class: 'vr-opt', onclick: function () { answerChoice(o, b); } }, o); return b; })));
    } else if (tk.type === 'clues') {
      el.prompt.appendChild(h('strong', {}, S.cluesQ));
      el.clueList = h('ol', { class: 'vr-clues' });
      el.panel.appendChild(el.clueList);
      addClue(tk);
      el.panel.appendChild(h('div', { class: 'vr-options' }, tk.options.map(function (id) { var b = h('button', { type: 'button', class: 'vr-opt', onclick: function () { answerChoice(id, b); } }, P.world[id].da); return b; })));
    }
    el.panel.appendChild(el.feedback = h('div', { class: 'vr-feedback' }));
  }
  function addClue(tk) { el.clueList.appendChild(h('li', { class: 'enter' }, [h('span', { class: 'vr-clue-no' }, t(S.clue, { n: st.clue + 1 })), tk.clues[st.clue]])); st.clue++; }
  function highlightCountry(id, cls) { map.highlight(map.landEls, id, cls); }

  /* ---------- tapping the map ---------- */
  function targetXY(tk) {
    var m = map.m;
    if (tk.type === 'point') return [tk.pt.x, tk.pt.y];
    if (tk.type === 'poly') { var l = m.land.filter(function (x) { return x.id === tk.id; })[0]; return l.c; }
    if (tk.type === 'continent') return m.continents.filter(function (x) { return x.id === tk.id; })[0].c;
    if (tk.type === 'sea') return m.seas.filter(function (x) { return x.id === tk.id; })[0].c;
    if (tk.type === 'nature') return (tk.layer === 'river' ? m.rivers : m.ranges).filter(function (x) { return x.id === tk.id; })[0].c;
    return [0, 0];
  }
  function landAt(p) { var m = map.m; for (var i = 0; i < m.land.length; i++) if (pointIn(p, m.land[i].r)) return m.land[i].id; return null; }
  function onTap(p, unit) {
    var tk = task(); if (!tk || st.locked) return;
    if (['point', 'poly', 'continent', 'sea', 'nature'].indexOf(tk.type) < 0) return;
    var m = map.m, ok = false, tol = 16 * unit, miss = null, tgt = targetXY(tk);
    if (tk.type === 'point') {
      var d = km(unproject(m, p[0], p[1]), { lat: tk.pt.lat, lon: tk.pt.lon });
      ok = d <= tk.tolKm || Math.hypot(tgt[0] - p[0], tgt[1] - p[1]) <= tol; // generous on small screens
      if (!ok) miss = t(S.missKm, { km: Math.round(d), name: tk.name, dir: S.dirs[sector(tgt[0] - p[0], tgt[1] - p[1]).s] });
    } else if (tk.type === 'poly') {
      var l = m.land.filter(function (x) { return x.id === tk.id; })[0];
      ok = pointIn(p, l.r) || distToRings(p, l.r, true) <= tol;
      if (!ok) {
        var other = landAt(p), dir = S.dirs[sector(tgt[0] - p[0], tgt[1] - p[1]).s], oname = other ? placeName(tk.layer, other) : null;
        miss = !other ? t(S.missWater, { dir: dir }) : oname ? t(S.missLand, { name: oname, dir: dir }) : t(S.missOther, { dir: dir });
      }
    } else if (tk.type === 'continent') {
      var c = P.continents.filter(function (x) { return x.id === tk.id; })[0], cr = m.continents.filter(function (x) { return x.id === tk.id; })[0];
      var land = landAt(p), meta = land ? m.meta[land] : null, transcont = ['RUS', 'TUR', 'KAZ', 'EGY', 'AZE', 'GEO'];
      ok = pointIn(p, cr.r) || distToRings(p, cr.r, true) <= tol * 0.6 || (meta && meta.cont === c.cont && transcont.indexOf(land) < 0);
      if (!ok) {
        var hit = null; m.continents.forEach(function (x) { if (!hit && pointIn(p, x.r)) hit = x.id; });
        if (!hit && meta) P.continents.forEach(function (x) { if (x.cont === meta.cont) hit = x.id; });
        var dir2 = S.dirs[sector(tgt[0] - p[0], tgt[1] - p[1]).s];
        miss = hit ? t(S.missLand, { name: placeName('continent', hit), dir: dir2 }) : t(S.missWater, { dir: dir2 });
      }
    } else if (tk.type === 'sea') {
      var sr = m.seas.filter(function (x) { return x.id === tk.id; })[0], onLand = landAt(p);
      ok = !onLand && (pointIn(p, sr.r) || distToRings(p, sr.r, true) <= tol * 2);
      if (!ok) {
        var other2 = null; if (!onLand) m.seas.forEach(function (x) { if (!other2 && pointIn(p, x.r)) other2 = x.id; });
        var dir3 = S.dirs[sector(tgt[0] - p[0], tgt[1] - p[1]).s];
        miss = onLand ? t(S.missOther, { dir: dir3 }) : other2 ? t(S.missLand, { name: placeName('sea', other2), dir: dir3 }) : t(S.missOther, { dir: dir3 });
      }
    } else if (tk.type === 'nature') {
      var g = (tk.layer === 'river' ? m.rivers : m.ranges).filter(function (x) { return x.id === tk.id; })[0];
      ok = tk.layer === 'river' ? distToRings(p, g.r, false) <= tol * 1.2 : (pointIn(p, g.r) || distToRings(p, g.r, true) <= tol);
      if (!ok) miss = t(S.missOther, { dir: S.dirs[sector(tgt[0] - p[0], tgt[1] - p[1]).s] });
    }
    var mark = map.mark(p[0], p[1], ok ? 'ok' : 'bad');
    if (ok) return correct(tk);
    wrong(tk, miss, mark);
  }

  /* ---------- answers ---------- */
  function revealTarget(tk) {
    var xy = targetXY(tk);
    if (tk.type === 'poly' || tk.type === 'mc' || tk.type === 'clues') highlightCountry(tk.id, 'hl-ok');
    if (tk.type === 'nature' && map.natEls[tk.id]) map.natEls[tk.id].classList.add('hl-ok');
    if (tk.type === 'mc' && tk.pt) xy = [tk.pt.x, tk.pt.y];
    if (tk.type === 'clues') { var l = map.m.land.filter(function (x) { return x.id === tk.id; })[0]; if (l) xy = l.c; }
    if (tk.type === 'compass') xy = [tk.pb.x, tk.pb.y];
    map.show(xy[0], xy[1]);
    if (tk.type === 'point' || tk.type === 'mc') map.mark(xy[0], xy[1], 'target', tk.type === 'mc' ? tk.answer : tk.name);
    if (tk.type === 'continent' || tk.type === 'sea') map.mark(xy[0], xy[1], 'target', tk.name);
    map.flyTo(xy[0], xy[1]);
  }
  function correct(tk) {
    st.locked = true;
    var first = st.attempt === 0, score = first ? 1 : 0.5;
    if (tk.type === 'clues') score = st.clue <= 2 ? 1 : 0.5; // solved with one or two clues = full point
    st.results.push(score);
    if (tk.key && tk.key !== 'compass') data().visited[tk.key] = 1;
    Core.saveSoon();
    Core.play('correct');
    setBob(score === 1 ? 'happy' : 'encouraging', pick(score === 1 ? S.correct : S.correctSecond));
    revealTarget(tk);
    el.feedback.innerHTML = '';
    if (tk.type === 'mc' || tk.type === 'clues') {
      var f = factLines('country:' + tk.id);
      el.feedback.appendChild(h('div', { class: 'vr-factcard' }, [h('strong', {}, f.name)].concat(f.lines.map(function (l) { return h('span', {}, l); }))));
    }
    el.feedback.appendChild(h('button', { type: 'button', class: 'btn primary vr-next', onclick: nextTask }, S.continue));
    later(function () { var b = el.feedback.querySelector('.vr-next'); if (b) b.focus(); }, 50);
  }
  function wrong(tk, msg, node) {
    st.attempt++;
    Core.play('wrong');
    if (tk.type === 'clues' && st.clue < 3) { addClue(tk); setBob('thinking', S.wrongClue); if (node) node.disabled = true; return; }
    if (st.attempt === 1 && tk.type !== 'clues') {
      setBob('thinking', msg || S.wrongChoice);
      if (node && node.tagName === 'BUTTON') { node.disabled = true; node.classList.add('wrong'); }
      return;
    }
    // second miss: show the answer
    st.locked = true; st.results.push(0);
    revealTarget(tk);
    if (node && node.tagName === 'BUTTON') node.classList.add('wrong');
    var answerText = tk.type === 'compass' ? t(S.answerIs, { a: S.dirsLong[tk.answer].toLowerCase() }) : tk.type === 'mc' ? t(S.answerIs, { a: tk.answer }) : tk.type === 'clues' ? t(S.answerIs, { a: P.world[tk.id].da }) : t(S.answerWas, { name: tk.name });
    setBob('encouraging', answerText);
    el.feedback.innerHTML = '';
    el.feedback.appendChild(h('button', { type: 'button', class: 'btn primary vr-next', onclick: nextTask }, S.continue));
    el.feedback.querySelector('.vr-next').focus();
  }
  function answerChoice(value, node) {
    var tk = task(); if (!tk || st.locked) return;
    var ok = value === tk.answer;
    [].forEach.call(el.panel.querySelectorAll('.vr-opt, .vr-dir'), function (b) { b.classList.remove('wrong'); });
    if (ok) { node.classList.add('right'); [].forEach.call(el.panel.querySelectorAll('.vr-opt, .vr-dir'), function (b) { b.disabled = true; }); return correct(tk); }
    node.classList.add('wrong'); node.disabled = true;
    wrong(tk, S.wrongChoice, node);
    if (st.locked) [].forEach.call(el.panel.querySelectorAll('.vr-opt, .vr-dir'), function (b) {
      b.disabled = true;
      var txt = b.getAttribute('aria-label') || b.textContent;
      if (tk.type === 'mc' && b.textContent === tk.answer) b.classList.add('right');
      if (tk.type === 'clues' && b.textContent === P.world[tk.id].da) b.classList.add('right');
      if (tk.type === 'compass' && txt === S.dirsLong[tk.answer]) b.classList.add('right');
    });
  }
  function nextTask() { Core.play('click'); st.i++; showTask(); }

  /* ---------- finish ---------- */
  function finish() {
    clearTimers();
    var total = st.results.length || 1, sum = st.results.reduce(function (a, b) { return a + b; }, 0), acc = sum / total;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0, first = st.results.filter(function (r) { return r === 1; }).length;
    var rs = routeState(st.route.id), newStamp = stars > 0 && !rs.stars, newBest = stars > rs.stars;
    var before = rs.stars;
    rs.stars = Math.max(rs.stars, stars); rs.best = Math.max(rs.best, Math.round(100 * first / total)); rs.plays++;
    if (stars > 0 && !rs.date) rs.date = new Date().toLocaleDateString('da-DK');
    Core.save();
    var badgeNode = Core.roundDone(ID, st.route.id, rs.plays > 1 ? before : null, rs.stars);
    var route = st.route, starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: 'pilot', size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newStamp ? h('p', { class: 'rs-newbest' }, S.stamp) : newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { correct: first, total: st.results.length })),
      stars === 0 ? h('p', { class: 'muted' }, S.resultTip) : null,
      badgeNode,
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
    _state: function () { return st; }, _map: function () { return map; }, _target: function () { return st && task() ? targetXY(task()) : null; } }); // test hooks
})(window);
