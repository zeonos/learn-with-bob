/*
 * Raketbanen – Bob flyver en lille raket. Barnet vælger vinkel og kraft og prøver at ramme rumstationen.
 * Seks verdener (tre for mellemtrinnet, tre for udskolingen) med seks håndlavede baner hver (levels.js).
 * Fysikken står i physics.js og er helt forudsigelig: samme vinkel og kraft giver altid samme bane.
 * Ingen tid og ingen fart-point. Sporene fra tidligere skud bliver stående, så barnet kan lære af dem.
 * Hjælp: »Vis et skud« efter 3 forbiskud (højst 2 stjerner); »Vis løsningen« efter 6 (1 stjerne).
 * Når alle baner i en verden er klaret, får barnet et kort med rigtige fakta til sin Rumlogbog.
 */
(function (root) {
  'use strict';
  var Core = root.Core, Bob = root.Bob, S = root.STR.rb, SC = root.STR.core, RK = root.ROCKET;
  var h = Core.h, t = Core.t;
  var ID = 'raketbanen', OUTFIT = 'astronaut', SHOW_AFTER = 3, SOLVE_AFTER = 6, NLEV = 6;
  var VW = 1000, VH = 600;
  var app = null, st = null, el = {}, clock = 0, timers = [], keyHandler = null, raf = 0, speedK = 1, uidN = 0, TS = 1; // TS: bigger text in the picture on small screens
  var WORLDS = RK.worlds;

  function worldById(id) { return WORLDS.filter(function (w) { return w.id === id; })[0]; }
  function nameOf(id) { return (S.worlds[id] || [S.sbFriend])[0]; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function f1(n) { return Math.round(n * 10) / 10; }

  /* ---------- data and hub API ---------- */
  // d.w[world] = { best: [stars per level], plays }, d.lv[world] = the furthest level reached (1–6), d.cards[world] = 1
  function data() { var d = Core.gameData(ID); d.w = d.w || {}; d.lv = d.lv || {}; d.cards = d.cards || {}; if (!d.band) d.band = (Core.profile() || {}).band || 'M'; return d; }
  function wState(d, id) { var x = d.w[id] || (d.w[id] = { best: [0, 0, 0, 0, 0, 0], plays: 0 }); if (!Array.isArray(x.best)) x.best = [0, 0, 0, 0, 0, 0]; return x; }
  function bestOf(d, id) { var x = (d.w || {})[id]; return x && Array.isArray(x.best) ? x.best : [0, 0, 0, 0, 0, 0]; }
  // a world's stars: the average of its six levels' best stars, rounded down (unplayed levels count 0)
  function worldStars(d, id) { var b = bestOf(d, id), s = 0; for (var i = 0; i < NLEV; i++) s += Math.max(0, Math.min(3, Number(b[i]) || 0)); return Math.floor(s / NLEV); }
  function levelOf(d, id) { var l = Number((d.lv || {})[id]) || 1; return clamp(l, 1, NLEV); }
  function levelsDone(d, id) { return bestOf(d, id).filter(function (s) { return s > 0; }).length; }
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = WORLDS.filter(function (w) { return w.b === band; });
    list.forEach(function (w) { n += worldStars(d, w.id); });
    return { stars: n, max: list.length * 3 };
  }
  function progress(d) {
    var out = { plays: 0, bands: { M: [], U: [] } };
    WORLDS.forEach(function (w) { out.plays += ((d.w || {})[w.id] || {}).plays || 0; out.bands[w.b].push(worldStars(d, w.id)); });
    return out;
  }
  function parentReport(d) {
    var rows = [];
    WORLDS.forEach(function (w) { var x = (d.w || {})[w.id]; if (x && x.plays) rows.push([nameOf(w.id) + ' (' + w.b + ')', worldStars(d, w.id) + '/3', levelsDone(d, w.id) + '/' + NLEV]); });
    return { head: S.reportHead, rows: rows };
  }
  function collection(d) { return { n: WORLDS.filter(function (w) { return (d.cards || {})[w.id]; }).length, max: WORLDS.length }; }
  function starsFor(shots, helped, shown) { return shown ? 1 : shots <= 3 && !helped ? 3 : shots <= 6 || helped ? 2 : 1; }

  /* ================= DRAWING (pure SVG strings, also used by the proof sheet) ================= */
  var LOOK = {
    jorden: { sky: ['#8FD0F0', '#E4F5FC'], ground: ['#7CC46A', '#4E9A3E'], edge: '#3C7A2E', wall: '#E2956A', wallEdge: '#7A3E1E', windows: true, rock: ['#B5BAC2', '#7E848E'], trail: '#2D2016', dark: false },
    maanen: { sky: ['#0D1330', '#26315C'], ground: ['#C9CDD5', '#8F95A1'], edge: '#EEF0F4', wall: '#9AA0AA', wallEdge: '#4C525C', rock: ['#A7ACB6', '#6A707B'], trail: '#FFFFFF', dark: true, stars: 70, earth: true },
    mars: { sky: ['#E8A473', '#F9DFC6'], ground: ['#C85C33', '#983A1D'], edge: '#6E2812', wall: '#9C4429', wallEdge: '#561E0D', rock: ['#A86A50', '#6E3A26'], trail: '#2E140A', dark: false },
    jupiter: { sky: ['#F4DCB6', '#E3B987'], ground: ['#A9693C', '#7A4626'], edge: '#55301A', wall: '#7E62A6', wallEdge: '#3E2B63', rock: ['#9C8C7C', '#665848'], trail: '#2E1B0C', dark: false, bands: true },
    space: { sky: ['#090E22', '#172049'], rock: ['#9A8F84', '#5E554C'], trail: '#FFFFFF', dark: true, stars: 110 }
  };
  var BODY = {
    jorden: ['#5DB2EA', '#21609C'], maanen: ['#DADDE3', '#8C93A0'], maaneA: ['#E3DCCF', '#978C79'], maaneB: ['#D3DCE6', '#7B8A9C'],
    mars: ['#EC8058', '#A23B1E'], jupiter: ['#EFCB98', '#B57A48'], saturn: ['#F1DCA4', '#B4945A'], solen: ['#FFE680', '#F29A0F']
  };
  function lookOf(lv) { return RK.isSpace(lv) ? LOOK.space : LOOK[lv.world] || LOOK.jorden; }
  function hashStr(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function lcg(seed) { var a = seed >>> 0; return function () { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; }
  function kx(lv, x) { return f1(x * VW / lv.W); }
  function ky(lv, y) { return f1(VH - y * VW / lv.W); }
  function txt(x, y, s, size, dark, anchor, weight) {
    size = Math.round(size * TS);
    return '<text x="' + f1(x) + '" y="' + f1(y) + '" font-size="' + size + '" text-anchor="' + (anchor || 'middle') + '" font-weight="' + (weight || 800) + '" fill="' + (dark ? '#FFFFFF' : '#2B1D10') +
      '" stroke="' + (dark ? '#0B1026' : '#FFFFFF') + '" stroke-width="' + Math.max(3, size / 5) + '" paint-order="stroke" stroke-linejoin="round" font-family="system-ui,Segoe UI,sans-serif">' + esc(s) + '</text>';
  }
  function launchPx(lv, angle) {
    if (RK.isSpace(lv)) { var hp = lv.planets[lv.home || 0], cs = RK.trig(angle), rr = hp.r + RK.LIFT; return [kx(lv, hp.x + cs[0] * rr), ky(lv, hp.y + cs[1] * rr)]; }
    var p = RK.padPoint(lv); return [kx(lv, p[0]), ky(lv, p[1])];
  }
  function rocketSvg(cls) {
    return '<g class="' + cls + '"' + (TS > 1 ? ' transform="scale(1.3)"' : '') + '><path class="rb-flame" d="M-17,-5 L-36,0 L-17,5 Z" fill="#FF9F1C" stroke="#E8463B" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M-16,-8 L-26,-17 L-6,-8 Z M-16,8 L-26,17 L-6,8 Z" fill="#E8463B" stroke="#2B2B3A" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M-18,-8 L10,-8 Q24,-7 30,0 Q24,7 10,8 L-18,8 Z" fill="#F4F6F8" stroke="#2B2B3A" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M14,-7.4 Q24,-6 30,0 Q24,6 14,7.4 Z" fill="#E8463B"/>' +
      '<circle cx="2" cy="0" r="4.6" fill="#6BB8E0" stroke="#2B2B3A" stroke-width="2"/></g>';
  }
  function stationSvg(lv, uid) {
    var s = lv.station, cx = kx(lv, s[0]), cy = ky(lv, s[1]), r = s[2] * VW / lv.W, k = Math.min(1, r / 40);
    var glow = lookOf(lv).dark ? '.08' : '.2';
    return '<g class="rb-station" id="' + uid + 'st"><circle cx="' + cx + '" cy="' + cy + '" r="' + f1(r) + '" fill="#FFE15C" fill-opacity="' + glow + '"/>' +
      '<circle class="rb-ring" cx="' + cx + '" cy="' + cy + '" r="' + f1(r) + '" fill="none" stroke="#FFD43B" stroke-width="7"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + f1(r) + '" fill="none" stroke="#7A5A00" stroke-width="1.6" stroke-dasharray="4 7"/>' +
      '<g transform="translate(' + cx + ',' + cy + ') scale(' + f1(k * 10) / 10 + ')"><rect x="-34" y="-5" width="18" height="10" rx="1.5" fill="#3E7CC0" stroke="#1F3550" stroke-width="2"/><rect x="16" y="-5" width="18" height="10" rx="1.5" fill="#3E7CC0" stroke="#1F3550" stroke-width="2"/>' +
      '<rect x="-14" y="-9" width="28" height="18" rx="5" fill="#EEF2F7" stroke="#2B3A4C" stroke-width="2.5"/><circle cx="0" cy="0" r="4" fill="#FFD43B" stroke="#2B3A4C" stroke-width="1.5"/></g></g>';
  }
  function starsBg(lv, n, seed) {
    var R = lcg(seed), o = '';
    for (var i = 0; i < n; i++) { var x = R() * VW, y = R() * VH * (RK.isSpace(lv) ? 1 : 0.8), r = R() < 0.15 ? 2.4 : 1.3; o += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + r + '" fill="#FFFFFF" fill-opacity="' + f1(0.45 + R() * 0.5) + '"/>'; }
    return o;
  }
  function planetSvg(lv, p, uid, i) {
    var cx = kx(lv, p.x), cy = ky(lv, p.y), r = f1(p.r * VW / lv.W), c = BODY[p.name] || BODY.maanen, gid = uid + 'p' + i, o = '';
    o += '<defs><radialGradient id="' + gid + '" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></radialGradient>' +
      '<clipPath id="' + gid + 'c"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/></clipPath></defs>';
    if (p.name === 'solen') o += '<defs><radialGradient id="' + gid + 'g"><stop offset=".55" stop-color="#FFE680" stop-opacity=".55"/><stop offset="1" stop-color="#FFB020" stop-opacity="0"/></radialGradient></defs><circle cx="' + cx + '" cy="' + cy + '" r="' + f1(r * 1.6) + '" fill="url(#' + gid + 'g)"/>';
    if (p.name === 'saturn') o += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + f1(r * 1.9) + '" ry="' + f1(r * 0.45) + '" fill="none" stroke="#D9C089" stroke-width="' + f1(r * 0.22) + '" transform="rotate(-14 ' + cx + ' ' + cy + ')"/>';
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + gid + ')"/>';
    var g = '<g clip-path="url(#' + gid + 'c)">';
    if (p.name === 'jorden') g += '<path d="M' + f1(cx - r * 0.6) + ',' + f1(cy - r * 0.3) + ' q' + f1(r * 0.4) + ',-' + f1(r * 0.5) + ' ' + f1(r * 0.7) + ',-' + f1(r * 0.1) + ' t' + f1(r * 0.2) + ',' + f1(r * 0.6) + ' q-' + f1(r * 0.5) + ',' + f1(r * 0.3) + ' -' + f1(r * 0.9) + ',-' + f1(r * 0.5) + 'z" fill="#6CC35A"/><path d="M' + f1(cx + r * 0.1) + ',' + f1(cy + r * 0.35) + ' q' + f1(r * 0.4) + ',-' + f1(r * 0.2) + ' ' + f1(r * 0.6) + ',' + f1(r * 0.2) + ' q-' + f1(r * 0.3) + ',' + f1(r * 0.4) + ' -' + f1(r * 0.6) + ',-' + f1(r * 0.2) + 'z" fill="#6CC35A"/>';
    if (p.name === 'jupiter' || p.name === 'saturn') [-0.55, -0.2, 0.15, 0.5].forEach(function (b, k) { g += '<rect x="' + f1(cx - r) + '" y="' + f1(cy + b * r) + '" width="' + f1(2 * r) + '" height="' + f1(r * (k % 2 ? 0.12 : 0.18)) + '" fill="' + (p.name === 'jupiter' ? '#B0683A' : '#C9A764') + '" fill-opacity=".7"/>'; });
    if (p.name === 'jupiter') g += '<ellipse cx="' + f1(cx + r * 0.35) + '" cy="' + f1(cy + r * 0.3) + '" rx="' + f1(r * 0.22) + '" ry="' + f1(r * 0.12) + '" fill="#C8553D"/>';
    if (/^maane/.test(p.name)) [[-0.3, -0.25, 0.2], [0.3, 0.2, 0.15], [-0.1, 0.4, 0.12]].forEach(function (q) { g += '<circle cx="' + f1(cx + q[0] * r) + '" cy="' + f1(cy + q[1] * r) + '" r="' + f1(q[2] * r) + '" fill="#000" fill-opacity=".14"/>'; });
    if (p.name === 'mars') g += '<ellipse cx="' + cx + '" cy="' + f1(cy - r * 0.9) + '" rx="' + f1(r * 0.45) + '" ry="' + f1(r * 0.18) + '" fill="#FFFFFF" fill-opacity=".85"/>';
    o += g + '</g><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/>';
    if (p.name === 'saturn') o += '<path d="M' + f1(cx - r * 1.84) + ',' + f1(cy + r * 0.33) + ' A' + f1(r * 1.9) + ',' + f1(r * 0.45) + ' 0 0 0 ' + f1(cx + r * 1.84) + ',' + f1(cy - r * 0.33) + '" fill="none" stroke="#D9C089" stroke-width="' + f1(r * 0.22) + '" transform="rotate(-14 ' + cx + ' ' + cy + ')" />';
    var name = (S.bodies || {})[p.name];
    if (name) {
      if (Number(r) >= 46) o += txt(cx, Math.max(cy - Number(r) + 34, Math.min(cy + 9 * Math.min(TS, 1.25), VH - 16)), name, (Number(r) >= 70 ? 28 : 24) * Math.min(TS, 1.25) / TS, true);
      else { var ly = cy + Number(r) + 8 + 22 * TS; if (ly > VH - 6) ly = cy - Number(r) - 12; o += txt(clamp(cx, 60, VW - 60), ly, name, 26, true); }
    }
    return o;
  }
  function rockSvg(lv, r, i, uid) {
    var L = lookOf(lv), cx = kx(lv, r[0]), cy = ky(lv, r[1]), rr = f1(r[2] * VW / lv.W), gid = uid + 'r' + i, R = lcg(hashStr(lv.id + 'rock' + i));
    var o = '<defs><radialGradient id="' + gid + '" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="' + L.rock[0] + '"/><stop offset="1" stop-color="' + L.rock[1] + '"/></radialGradient></defs>';
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="url(#' + gid + ')" stroke="#2B2B3A" stroke-opacity=".55" stroke-width="2.5"/>';
    for (var k = 0; k < 3; k++) { var a = R() * 6.28, d = R() * 0.5, cr = 0.12 + R() * 0.12; o += '<circle cx="' + f1(cx + Math.cos(a) * d * rr) + '" cy="' + f1(cy + Math.sin(a) * d * rr) + '" r="' + f1(cr * rr) + '" fill="#000" fill-opacity=".16"/>'; }
    return o;
  }
  function wallSvg(lv, w) {
    var L = lookOf(lv), x = kx(lv, w[0]), y = ky(lv, w[3]), ww = f1((w[2] - w[0]) * VW / lv.W), hh = f1((w[3] - w[1]) * VW / lv.W), o;
    o = '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + hh + '" rx="5" fill="' + L.wall + '" stroke="' + L.wallEdge + '" stroke-width="3"/>';
    if (L.windows && ww >= 30) { for (var yy = y + 14; yy < y + hh - 30; yy += 34) for (var xx = x + 9; xx + 12 < x + Number(ww) - 6; xx += 22) o += '<rect x="' + f1(xx) + '" y="' + f1(yy) + '" width="12" height="16" rx="2" fill="#FFF2B3" stroke="' + L.wallEdge + '" stroke-width="1.5"/>'; }
    else o += '<rect x="' + f1(x + 4) + '" y="' + f1(y + 4) + '" width="' + f1(Math.max(2, ww * 0.25)) + '" height="' + f1(Math.max(2, hh - 8)) + '" rx="3" fill="#FFFFFF" fill-opacity=".18"/>';
    return o;
  }
  function protractorSvg(lv, uid) {
    var dark = lookOf(lv).dark, o = '', i, a, cs;
    var line = dark ? '#E6ECF5' : '#2F3B4C', fill = dark ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.55)';
    if (RK.isSpace(lv)) {
      var hp = lv.planets[lv.home || 0], cx = kx(lv, hp.x), cy = ky(lv, hp.y), R = hp.r * VW / lv.W + 34;
      o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + f1(R) + '" fill="none" stroke="' + line + '" stroke-opacity=".55" stroke-width="2"/>';
      for (i = 0; i < 360; i += 15) { cs = RK.trig(i); var big = i % 90 === 0, r1 = R - (big ? 12 : 6); o += '<line x1="' + f1(cx + cs[0] * r1) + '" y1="' + f1(cy - cs[1] * r1) + '" x2="' + f1(cx + cs[0] * R) + '" y2="' + f1(cy - cs[1] * R) + '" stroke="' + line + '" stroke-width="' + (big ? 3 : 1.5) + '"/>'; }
      [0, 90, 180, 270].forEach(function (d) { var c = RK.trig(d), lx = cx + c[0] * (R + 14 + 16 * TS), ly = cy - c[1] * (R + 14 + 14 * TS) + 9 * TS; if (lx < 34 || lx > VW - 34 || ly < 26 || ly > VH - 6) return; o += '<g class="rb-deg" data-deg="' + d + '">' + txt(lx, ly, d + '°', 26, dark) + '</g>'; });
      o += '<path id="' + uid + 'wedge" d="" fill="none" stroke="#FFD43B" stroke-width="6" stroke-linecap="round"/>';
      return '<g class="rb-protractor">' + o + '</g>';
    }
    var L = launchPx(lv, 0), x0 = L[0], y0 = L[1], Rp = 84;
    o += '<path d="M' + f1(x0 + Rp) + ',' + y0 + ' A' + Rp + ',' + Rp + ' 0 0 0 ' + f1(x0 - Rp) + ',' + y0 + ' Z" fill="' + fill + '" stroke="' + line + '" stroke-width="2"/>';
    o += '<path id="' + uid + 'wedge" d="" fill="#FFD43B" fill-opacity=".55" stroke="#C99A00" stroke-width="2"/>';
    for (i = 0; i <= 180; i += 15) { cs = RK.trig(i); a = i % 45 === 0; var ri = Rp - (a ? 16 : 8); o += '<line x1="' + f1(x0 + cs[0] * ri) + '" y1="' + f1(y0 - cs[1] * ri) + '" x2="' + f1(x0 + cs[0] * Rp) + '" y2="' + f1(y0 - cs[1] * Rp) + '" stroke="' + line + '" stroke-width="' + (a ? 3 : 1.5) + '"/>'; }
    [0, 45, 90, 135, 180].forEach(function (d) { var c = RK.trig(d), lx = x0 + c[0] * (Rp + 10 + 18 * TS); if (lx < 20 + 12 * TS || lx > VW - 20 - 12 * TS) return; o += '<g class="rb-deg" data-deg="' + d + '">' + txt(lx, y0 - c[1] * (Rp + 10 + 14 * TS) + 9 * TS, d + '°', 25, dark) + '</g>'; });
    return '<g class="rb-protractor">' + o + '</g>';
  }
  function windSvg(lv) {
    var w = lv.wind || 0; if (!w) return '';
    var dir = w > 0 ? 1 : -1, n = Math.abs(w) < 0.7 ? 0 : Math.abs(w) < 1.1 ? 1 : 2, px = dir > 0 ? 840 : 960, py = 28, len = 54 + n * 22, droop = [20, 9, 0][n], tip = px + dir * len, o = '';
    o += '<line x1="' + px + '" y1="' + py + '" x2="' + px + '" y2="' + (py + 118) + '" stroke="#4A3626" stroke-width="5" stroke-linecap="round"/>';
    o += '<path d="M' + px + ',' + (py + 4) + ' L' + px + ',' + (py + 36) + ' L' + tip + ',' + (py + 20 + droop + 7) + ' L' + tip + ',' + (py + 20 + droop - 7) + ' Z" fill="#F25C3B" stroke="#7A2A12" stroke-width="2.5" stroke-linejoin="round"/>';
    [0.33, 0.66].forEach(function (k) { var x = px + dir * len * k, hh = 16 - 8 * k; o += '<line x1="' + f1(x) + '" y1="' + f1(py + 20 + droop * k - hh) + '" x2="' + f1(x) + '" y2="' + f1(py + 20 + droop * k + hh) + '" stroke="#FFFFFF" stroke-width="7"/>'; });
    var cx = TS > 1 ? 860 : 900, ay;
    o += txt(cx, py + 128 + 22 * TS, S.windLabel + ': ' + S.windPower[n], 26, false);
    ay = py + 150 + 30 * TS;
    o += '<line x1="' + (cx - 34) + '" y1="' + ay + '" x2="' + (cx + 34) + '" y2="' + ay + '" stroke="#2B1D10" stroke-width="5" stroke-linecap="round"/><path d="M' + (cx + dir * 46) + ',' + ay + ' l' + (-dir * 16) + ',-10 v20 z" fill="#2B1D10"/>';
    return '<g class="rb-wind" aria-hidden="true">' + o + '</g>';
  }
  function scaleBar(lv) {
    if (RK.isSpace(lv)) return '';
    var m = lv.W >= 200 ? 50 : lv.W >= 100 ? 20 : 10, len = m * VW / lv.W, dark = lookOf(lv).dark;
    var col = dark ? '#FFFFFF' : '#2B1D10';
    return '<g class="rb-scale" aria-hidden="true"><path d="M24,36 v14 h' + f1(len) + ' v-14" fill="none" stroke="' + col + '" stroke-width="4" stroke-linejoin="round"/>' + txt(24 + len + 10, 42 + 10 * TS, t(S.scale, { n: m }), 26, dark, 'start') + '</g>';
  }
  function pts(lv, path) { return path.map(function (p) { return kx(lv, p[0]) + ',' + ky(lv, p[1]); }).join(' '); }
  // The whole scene. o = { uid, trails: [path…], ghost: path, angle, power, aim: bool, grid: bool, label }
  function sceneSvg(lv, o) {
    o = o || {};
    var uid = o.uid || ('rb' + (++uidN) + '-'), L = lookOf(lv), sp = RK.isSpace(lv), out = '';
    TS = o.ts || 1;
    out += '<defs><linearGradient id="' + uid + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + L.sky[0] + '"/><stop offset="1" stop-color="' + L.sky[1] + '"/></linearGradient>' +
      (L.ground ? '<linearGradient id="' + uid + 'gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + L.ground[0] + '"/><stop offset="1" stop-color="' + L.ground[1] + '"/></linearGradient>' : '') + '</defs>';
    out += '<rect width="' + VW + '" height="' + VH + '" fill="url(#' + uid + 'sky)"/>';
    if (L.stars) out += starsBg(lv, L.stars, hashStr(String(lv.id)));
    if (lv.world === 'jorden') out += '<circle cx="880" cy="80" r="44" fill="#FFE27A" stroke="#F5B935" stroke-width="4"/><g fill="#FFFFFF" fill-opacity=".9"><ellipse cx="300" cy="90" rx="62" ry="20"/><ellipse cx="340" cy="74" rx="40" ry="22"/><ellipse cx="620" cy="140" rx="54" ry="16"/><ellipse cx="650" cy="128" rx="32" ry="18"/></g>';
    if (L.earth) out += '<circle cx="870" cy="80" r="30" fill="#4FA3E0"/><path d="M852,70 q10,-12 22,-4 t8,16 q-14,6 -30,-12z" fill="#6CC35A"/><circle cx="870" cy="80" r="30" fill="none" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="2"/>';
    if (lv.world === 'mars') out += '<circle cx="640" cy="80" r="26" fill="#FFF3D6" fill-opacity=".85"/>';
    if (L.bands) out += '<g fill="#C98B55" fill-opacity=".22"><rect y="60" width="1000" height="34"/><rect y="150" width="1000" height="20"/><rect y="230" width="1000" height="44"/></g><ellipse cx="820" cy="250" rx="70" ry="30" fill="#C8553D" fill-opacity=".45"/>';
    if (!sp) {
      out += scaleBar(lv);
      (lv.walls || []).forEach(function (w) { out += wallSvg(lv, w); });
      out += '<polygon points="0,' + VH + ' ' + lv.terrain.map(function (p) { return kx(lv, p[0]) + ',' + ky(lv, p[1]); }).join(' ') + ' ' + VW + ',' + VH + '" fill="url(#' + uid + 'gr)"/>';
      out += '<polyline points="' + lv.terrain.map(function (p) { return kx(lv, p[0]) + ',' + ky(lv, p[1]); }).join(' ') + '" fill="none" stroke="' + L.edge + '" stroke-width="4" stroke-linejoin="round"/>';
      if (lv.world === 'maanen') { var R2 = lcg(hashStr(lv.id + 'dust')); for (var k = 0; k < 26; k++) { var dx = R2() * VW, gy = ky(lv, RK.groundY(lv, dx * lv.W / VW)); out += '<circle cx="' + f1(dx) + '" cy="' + f1(gy + 10 + R2() * 40) + '" r="' + f1(2 + R2() * 4) + '" fill="#000" fill-opacity=".12"/>'; } }
      out += windSvg(lv);
    } else lv.planets.forEach(function (p, i) { out += planetSvg(lv, p, uid, i); });
    (lv.rocks || []).forEach(function (r, i) { out += rockSvg(lv, r, i, uid); });
    out += stationSvg(lv, uid);
    if (!sp) { var P = launchPx(lv, 0); out += '<g class="rb-pad"><rect x="' + f1(P[0] - 30) + '" y="' + f1(P[1] + 14) + '" width="60" height="' + f1(Math.max(10, ky(lv, RK.groundY(lv, lv.pad)) - P[1] - 12)) + '" fill="#55606E" stroke="#2B2B3A" stroke-width="2.5"/><path d="M' + f1(P[0] - 24) + ',' + f1(P[1] + 16) + ' l10,8 M' + f1(P[0] - 6) + ',' + f1(P[1] + 16) + ' l10,8 M' + f1(P[0] + 12) + ',' + f1(P[1] + 16) + ' l10,8" stroke="#FFD43B" stroke-width="4"/></g>'; }
    if (o.aim !== false) out += protractorSvg(lv, uid);
    // the shots so far: faint dotted trails, the last one a bit stronger
    var tc = L.trail, tr = o.trails || [];
    out += '<g class="rb-trails" id="' + uid + 'trails">';
    tr.forEach(function (p, i) { out += '<polyline points="' + pts(lv, p) + '" fill="none" stroke="' + tc + '" stroke-opacity="' + (i === tr.length - 1 ? 0.75 : 0.35) + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 12"/>'; });
    out += '</g>';
    out += '<polyline id="' + uid + 'ghost" points="' + (o.ghost ? pts(lv, o.ghost) : '') + '" fill="none" stroke="#21A34A" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 10"/>';
    out += '<polyline id="' + uid + 'live" points="" fill="none" stroke="' + tc + '" stroke-opacity=".8" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 12"/>';
    if (o.grid) out += gridSvg(lv);
    if (o.pose !== undefined) { var Q = launchPx(lv, o.pose); out += '<g transform="translate(' + Q[0] + ',' + Q[1] + ') rotate(' + (-o.pose) + ')">' + rocketSvg('rb-rocket') + '</g>'; }
    if (o.aim !== false) {
      out += '<g id="' + uid + 'aim" class="rb-aim"><line x1="0" y1="0" x2="100" y2="0" stroke="#E8463B" stroke-width="6" stroke-linecap="round"/><path d="M100,-11 L120,0 L100,11 Z" fill="#E8463B"/></g>';
      out += '<line id="' + uid + 'band" x1="0" y1="0" x2="0" y2="0" stroke="#2B2B3A" stroke-opacity="0" stroke-width="3" stroke-dasharray="6 6"/>';
      out += '<g id="' + uid + 'rocket">' + rocketSvg('rb-rocket') + '</g>';
      out += '<g id="' + uid + 'boom" opacity="0"></g><path id="' + uid + 'mark" d="" fill="#E8463B" stroke="#FFFFFF" stroke-width="2"/>';
    }
    return '<svg class="rb-svg" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="' + esc(o.label || S.scene) + '" xmlns="http://www.w3.org/2000/svg">' + out + '</svg>';
  }
  function gridSvg(lv) {
    var SBX = RK.sandbox, cw = VW / SBX.COLS, chh = VH / SBX.ROWS, o = '<g class="rb-grid">';
    for (var c = 0; c < SBX.COLS; c++) for (var r = 0; r < SBX.ROWS; r++) o += '<rect class="rb-cell" data-c="' + c + '" data-r="' + r + '" x="' + f1(c * cw) + '" y="' + f1(VH - (r + 1) * chh) + '" width="' + f1(cw) + '" height="' + f1(chh) + '" fill="#FFFFFF" fill-opacity="0" stroke="' + (lookOf(lv).dark ? '#FFFFFF' : '#2B1D10') + '" stroke-opacity=".22" stroke-width="1.5"/>';
    return o + '</g>';
  }

  /* ---------- the daily challenge ---------- */
  function flatLevel(g) { return { world: g, g: g, W: 100, id: 'q', terrain: [[0, 0], [100, 0]], pad: 0, station: [-500, -500, 1] }; }
  function pathsPicture(bodies, letters) {
    var list = bodies.map(function (b) { return RK.simulate(flatLevel(b), 45, 20, { path: true, every: 4 }).path; });
    var maxX = 0, maxY = 0; list.forEach(function (p) { p.forEach(function (q) { maxX = Math.max(maxX, q[0]); maxY = Math.max(maxY, q[1]); }); });
    var Wp = 320, Hp = 130, k = Math.min((Wp - 40) / maxX, (Hp - 34) / maxY), cols = ['#C2410C', '#1D4ED8', '#15803D'], o = '';
    o += '<rect width="' + Wp + '" height="' + Hp + '" rx="10" fill="#EAF6FC"/><rect y="' + (Hp - 14) + '" width="' + Wp + '" height="14" fill="#B7C3A0"/>';
    list.forEach(function (p, i) {
      o += '<polyline points="' + p.map(function (q) { return f1(14 + q[0] * k) + ',' + f1(Hp - 14 - q[1] * k); }).join(' ') + '" fill="none" stroke="' + cols[i] + '" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0 7"/>';
      var end = p[p.length - 1];
      o += '<text x="' + f1(Math.min(Wp - 10, 14 + end[0] * k)) + '" y="' + (Hp - 20) + '" font-size="16" font-weight="800" text-anchor="middle" fill="' + cols[i] + '" stroke="#FFFFFF" stroke-width="4" paint-order="stroke" font-family="system-ui,sans-serif">' + letters[i] + '</text>';
    });
    o += '<rect x="8" y="' + (Hp - 22) + '" width="12" height="8" fill="#55606E"/>';
    return '<svg viewBox="0 0 ' + Wp + ' ' + Hp + '" width="' + Wp + '" height="' + Hp + '" role="img" aria-label="' + esc(letters.join(', ')) + '">' + o + '</svg>';
  }
  function quickTask(band, d) {
    var kinds = band === 'U' ? ['paths', 'same', 'moon', 'float', 'times', 'strong'] : ['angle', 'up', 'strong', 'weak', 'paths'];
    var k = pick(kinds), B = S.bodies;
    if (k === 'angle') { var o = shuffle(['15°', '30°', '45°', '60°', '75°']).slice(0, 3); if (o.indexOf('45°') < 0) o[0] = '45°'; return { q: S.qAngle, options: o.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); }), answer: '45°', hint: S.qAngleHint, explain: S.qAngleExplain }; }
    if (k === 'up') return { q: S.qUp, options: ['0°', '45°', '90°', '180°'], answer: '90°', hint: S.qUpHint, explain: S.qUpExplain };
    if (k === 'strong') return { q: S.qStrong, options: shuffle([B.jorden, B.maanen, B.mars, B.jupiter]), answer: B.jupiter, hint: S.qStrongHint, explain: S.qStrongExplain };
    if (k === 'weak') return { q: S.qWeak, options: shuffle([B.jorden, B.maanen, B.mars, B.jupiter]), answer: B.maanen, hint: S.qWeakHint, explain: S.qWeakExplain };
    if (k === 'same') return { q: S.qSame, options: S.qSameOpts.slice(), answer: S.qSameOpts[0], hint: S.qSameHint, explain: S.qSameExplain };
    if (k === 'moon') return { q: S.qMoon, options: S.qMoonOpts.slice(), answer: S.qMoonOpts[2], hint: S.qMoonHint, explain: S.qMoonExplain };
    if (k === 'float') return { q: S.qFloat, options: shuffle(S.qFloatOpts), answer: S.qFloatOpts[1], hint: S.qFloatHint, explain: S.qFloatExplain };
    if (k === 'times') return { q: S.qTimes, options: S.qTimesOpts.slice(), answer: S.qTimesOpts[1], hint: S.qTimesHint, explain: S.qTimesExplain };
    // three dotted paths: which one belongs to …?
    var trio = band === 'U' ? ['jupiter', 'jorden', 'mars'] : ['jorden', 'mars', 'maanen'];
    var order = shuffle(trio), letters = ['A', 'B', 'C'];
    var ask = Math.random() < 0.5 ? trio[0] : trio[2]; // the strongest or the weakest of the three
    var li = letters[order.indexOf(ask)], g = RK.G;
    var strongest = trio.reduce(function (a, b) { return g[b] > g[a] ? b : a; });
    return { q: t(S.qPaths, { a: B[trio[0]], b: B[trio[1]], c: B[trio[2]], ask: B[ask] }), html: '<div class="rb-daily">' + pathsPicture(order, letters) + '</div>', options: letters.slice(), answer: li,
      hint: S.qPathsHint, explain: t(ask === strongest ? S.qPathsShort : S.qPathsLong, { l: li, body: B[ask] }) };
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearAll(); clearInterval(clock); dropKeys(); Core.stopSpeaking(); st = null; el = {}; Core.save(); }
  function dropKeys() { if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; } }
  function closeOverlays() { [].forEach.call(document.querySelectorAll('.rb-overlay'), function (o) { o.remove(); }); }

  /* ================= MAP ================= */
  function textScale() { var w = (app && app.clientWidth) || root.innerWidth || 1000; return w < 560 ? 1.6 : w < 800 ? 1.25 : 1; }
  function planetIcon(id, size) {
    var c = { jorden: BODY.jorden, maanen: BODY.maanen, mars: BODY.mars, jupiter: BODY.jupiter, kredsloeb: BODY.maanen, solsystemet: BODY.solen }[id] || BODY.maanen, gid = 'rbi' + (++uidN), o = '';
    o += '<defs><radialGradient id="' + gid + '" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></radialGradient></defs>';
    if (id === 'kredsloeb') o += '<circle cx="24" cy="24" r="10" fill="#5DB2EA" stroke="#21609C" stroke-width="2"/><ellipse cx="24" cy="24" rx="20" ry="9" fill="none" stroke="#8C93A0" stroke-width="2" stroke-dasharray="3 3"/><circle cx="43" cy="22" r="4.5" fill="url(#' + gid + ')" stroke="#555" stroke-width="1"/>';
    else if (id === 'solsystemet') o += '<circle cx="18" cy="24" r="12" fill="url(#' + gid + ')"/><circle cx="36" cy="14" r="4" fill="#EC8058"/><circle cx="40" cy="34" r="6" fill="#EFCB98" stroke="#B57A48" stroke-width="1.5"/>';
    else { o += '<circle cx="24" cy="24" r="19" fill="url(#' + gid + ')" stroke="#000" stroke-opacity=".25" stroke-width="2"/>'; if (id === 'jupiter') o += '<path d="M7,18 h34 M6,27 h36" stroke="#B0683A" stroke-width="3" stroke-opacity=".7"/>'; if (id === 'jorden') o += '<path d="M14,16 q8,-6 14,0 t6,10 q-10,4 -20,-10z" fill="#6CC35A"/>'; if (id === 'maanen') o += '<circle cx="18" cy="18" r="4" fill="#000" fill-opacity=".15"/><circle cx="29" cy="30" r="3" fill="#000" fill-opacity=".15"/>'; }
    return '<svg viewBox="0 0 48 48" width="' + size + '" height="' + size + '" aria-hidden="true">' + o + '</svg>';
  }
  function howSvg() {
    // a small drawing for the map: a protractor (0° and 90°), the aim at 45° and two dotted shots – 45° lands furthest
    var o = '<rect width="220" height="120" rx="12" fill="#E6F4FC"/><rect y="104" width="220" height="16" fill="#9CCB86"/>';
    o += '<path d="M74,104 A44,44 0 0 0 -14,104 Z" transform="translate(0 0)" fill="#FFFFFF" fill-opacity=".85" stroke="#2F3B4C" stroke-width="1.5"/>';
    o += '<path d="M30,104 Q115,19 200,104" fill="none" stroke="#15803D" stroke-width="3.5" stroke-dasharray="0 7" stroke-linecap="round"/>';
    o += '<path d="M30,104 Q84.5,-46 139,104" fill="none" stroke="#1D4ED8" stroke-width="3" stroke-dasharray="0 7" stroke-linecap="round"/>';
    o += '<line x1="30" y1="104" x2="58" y2="76" stroke="#E8463B" stroke-width="4" stroke-linecap="round"/>';
    function l(x, y, s, c) { return '<text x="' + x + '" y="' + y + '" font-size="13" font-weight="800" text-anchor="middle" fill="' + c + '" stroke="#FFFFFF" stroke-width="3" paint-order="stroke" font-family="system-ui,sans-serif">' + s + '</text>'; }
    o += l(84, 101, '0°', '#2B1D10') + l(30, 54, '90°', '#2B1D10') + l(200, 98, '45°', '#15803D') + l(139, 98, '70°', '#1D4ED8');
    return '<svg viewBox="0 0 220 120" width="220" height="120" aria-hidden="true">' + o + '</svg>';
  }
  function showMap() {
    clearAll(); dropKeys(); closeOverlays(); Core.stopSpeaking(); st = null; el = {};
    var d = data(), list = WORLDS.filter(function (w) { return w.b === d.band; }), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (levelsDone(d, list[i].id) < NLEV) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    var col = collection(d);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen rb-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back), h('button', { type: 'button', class: 'btn secondary rb-logbtn', onclick: function () { Core.play('click'); showLogbook(); } }, S.logbook + ' (' + col.n + ')')]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('section', { class: 'card rb-how' }, [h('div', { class: 'rb-how-pic', html: howSvg() }), h('div', {}, [h('h2', {}, S.howTitle), h('p', {}, S.howTo), h('p', {}, h('strong', {}, S.how45)), d.band === 'U' ? h('p', { class: 'muted' }, S.howSpace) : null])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseWorld),
      h('div', { class: 'rs-worlds rb-worlds' }, list.map(function (w, i) {
        var done = levelsDone(d, w.id), stars = worldStars(d, w.id);
        return h('button', { type: 'button', class: 'rs-world rb-world w-' + w.id + (done ? ' lit' : '') + (i === nextIdx ? ' next' : ''), 'data-world': w.id, onclick: function () { Core.play('click'); chooseLevel(w); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, nameOf(w.id)), h('span', { class: 'rs-world-desc' }, S.worlds[w.id][1]),
          h('span', { class: 'rb-level' }, done >= NLEV ? S.allDone : t(S.level, { n: levelOf(d, w.id), max: NLEV })),
          h('span', { class: 'rs-world-foot' }, [h('span', { html: Core.starIcons(stars, 3) }), h('span', { class: 'rb-planet', html: planetIcon(w.id, 44) })])
        ]);
      })),
      h('div', { class: 'row center rb-extra' }, [h('button', { type: 'button', class: 'btn', onclick: function () { Core.play('click'); showSandbox(); } }, S.sandbox)])
    ]));
  }
  // the world card: straight into the next level, or a small picker when more levels are open
  function chooseLevel(w) {
    var d = data(), cur = levelOf(d, w.id), best = bestOf(d, w.id);
    if (cur === 1 && !best[0]) { startLevel(w.id, 1); return; }
    var o = h('div', { class: 'rs-overlay rb-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': S.pickLevel }, h('div', { class: 'card rs-dialog rb-pick' }, [
      h('h2', {}, nameOf(w.id) + ': ' + S.pickLevel), h('p', { class: 'muted' }, S.pickLevelText),
      h('div', { class: 'rb-pick-grid' }, w.levels.map(function (lv, i) {
        var n = i + 1, open = n <= cur;
        return h('button', { type: 'button', class: 'rb-pick-btn' + (n === cur ? ' cur' : ''), disabled: !open, 'data-level': n, onclick: function () { o.remove(); startLevel(w.id, n); } },
          [h('strong', {}, t(S.levelBtn, { n: n })), open ? h('span', { html: Core.starIcons(best[i] || 0, 3, 'small') }) : h('span', { class: 'muted' }, S.locked)]);
      })),
      h('div', { class: 'row center' }, h('button', { type: 'button', class: 'btn ghost', onclick: function () { o.remove(); } }, S.close))
    ]));
    app.appendChild(o);
    var c = o.querySelector('.rb-pick-btn.cur') || o.querySelector('.rb-pick-btn'); if (c) c.focus();
  }

  /* ================= PLAY ================= */
  function startLevel(wid, n) {
    var w = worldById(wid), lv = w.levels[n - 1];
    st = { w: wid, level: n, lv: lv, custom: false };
    showLevel();
  }
  function startCustom(lv, sbs, own) { st = { w: lv.world, level: 0, lv: lv, custom: true, sb: sbs, own: !!own }; showLevel(); }
  function shell(title, sub) {
    clearAll(); dropKeys(); closeOverlays(); Core.stopSpeaking();
    app.innerHTML = ''; el = {};
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, title), h('span', { class: 'rs-wave' }, sub || '')]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        onclick: function () { Core.speak([el.say && el.say.textContent, el.intro && el.intro.textContent].filter(Boolean).join(' ')); } }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.bob = h('div', { class: 'rb-bobface' }); el.say = h('p', { class: 'rb-say', role: 'status', 'aria-live': 'polite' });
    el.intro = h('p', { class: 'rb-intro' });
    el.stage = h('div', { class: 'rb-stage' }); el.panel = h('div', { class: 'rb-panel' }); el.tools = h('div', { class: 'rb-tools' }); el.explain = h('div', { class: 'rb-explain', 'aria-live': 'polite' });
    app.appendChild(h('main', { class: 'rb-play w-' + (st.lv.world || '') }, [hud, h('div', { class: 'rb-inner' }, [h('div', { class: 'rb-bobline' }, [el.bob, el.say]), el.intro, el.stage, el.panel, el.tools, el.explain])]));
  }
  function setBob(expr, text) {
    if (!el.bob) return;
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: OUTFIT, size: 120, crop: 'head' });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text !== undefined && text !== null) el.say.textContent = text;
  }
  function showLevel() {
    var lv = st.lv, sp = RK.isSpace(lv), ar = RK.angleRange(lv);
    shell(st.custom ? (st.own ? S.sbTitle : S.sbFriend) : nameOf(st.w), st.custom ? nameOf(lv.world) : t(S.level, { n: st.level, max: NLEV }));
    st.cur = { angle: 45, power: 50, shots: 0, misses: 0, helped: false, shown: false, done: false, flying: false, trails: [], ghost: null };
    el.intro.textContent = S.intro[st.custom ? 'custom' : st.w];
    setBob('hello', pick(S.bobStart));
    el.uid = 'rbs' + (++uidN) + '-';
    el.stage.innerHTML = sceneSvg(lv, { uid: el.uid, ts: textScale() });
    el.svg = el.stage.querySelector('svg');
    function q(id) { return el.svg.querySelector('#' + el.uid.replace(/([^\w-])/g, '\\$1') + id); }
    el.rocket = q('rocket'); el.aim = q('aim'); el.wedge = q('wedge'); el.trails = q('trails'); el.ghost = q('ghost'); el.live = q('live'); el.band = q('band'); el.boom = q('boom'); el.mark = q('mark'); el.ring = el.svg.querySelector('.rb-ring');
    // controls
    function control(kind, min, max) {
      var val = h('label', { class: 'rb-val', for: el.uid + kind });
      var range = h('input', { type: 'range', class: 'rb-range', id: el.uid + kind, min: String(min), max: String(max), step: '1', value: String(st.cur[kind]) });
      range.addEventListener('input', function () { setAim(kind === 'angle' ? +range.value : null, kind === 'power' ? +range.value : null); });
      var less = h('button', { type: 'button', class: 'rb-step', 'aria-label': kind === 'angle' ? S.lessAngle : S.lessPower, title: kind === 'angle' ? S.lessAngle : S.lessPower, onclick: function () { nudge(kind, -1); } }, '−');
      var more = h('button', { type: 'button', class: 'rb-step', 'aria-label': kind === 'angle' ? S.moreAngle : S.morePower, title: kind === 'angle' ? S.moreAngle : S.morePower, onclick: function () { nudge(kind, 1); } }, '+');
      el[kind] = { val: val, range: range };
      return h('div', { class: 'rb-ctl rb-' + kind }, [val, h('div', { class: 'rb-ctlrow' }, [less, range, more])]);
    }
    el.fire = h('button', { type: 'button', class: 'btn primary rb-fire', onclick: fire }, S.fire);
    el.shots = h('span', { class: 'rb-shots' });
    el.panel.appendChild(h('div', { class: 'rb-ctls' }, [control('angle', ar[0], ar[1]), control('power', RK.POW[0], RK.POW[1]), h('div', { class: 'rb-firebox' }, [el.fire, el.shots])]));
    el.panel.appendChild(h('p', { class: 'rb-keys' }, [h('span', { class: 'rb-keyhelp' }, S.keys + ' '), S.dragTip]));
    setAim(st.cur.angle, st.cur.power);
    drawTools();
    bindPointer(); bindKeys();
  }
  function nudge(kind, d) { var c = st && st.cur; if (!c || c.flying || c.done) return; Core.play('click'); if (kind === 'angle') setAim(c.angle + d, null); else setAim(null, c.power + d); }
  function setAim(a, p) {
    var c = st.cur, lv = st.lv, ar = RK.angleRange(lv);
    if (a !== null && a !== undefined) { a = Math.round(a); if (RK.isSpace(lv)) a = ((a % 360) + 360) % 360; else a = clamp(a, ar[0], ar[1]); c.angle = a; }
    if (p !== null && p !== undefined) c.power = clamp(Math.round(p), RK.POW[0], RK.POW[1]);
    el.angle.range.value = String(c.angle); el.power.range.value = String(c.power);
    el.angle.val.textContent = t(S.angleVal, { n: c.angle }); el.power.val.textContent = t(S.powerVal, { n: c.power });
    el.angle.range.setAttribute('aria-valuetext', t(S.angleText, { n: c.angle }));
    if (!c.flying) placeRocket();
  }
  function placeRocket() {
    var c = st.cur, lv = st.lv, L = launchPx(lv, c.angle), cs = RK.trig(c.angle);
    el.rocket.setAttribute('transform', 'translate(' + L[0] + ',' + L[1] + ') rotate(' + (-c.angle) + ')');
    el.rocket.classList.remove('flying');
    var len = 40 + c.power * 1.1;
    el.aim.setAttribute('transform', 'translate(' + f1(L[0] + cs[0] * 34) + ',' + f1(L[1] - cs[1] * 34) + ') rotate(' + (-c.angle) + ') scale(' + f1(len / 120 * 10) / 10 + ',1)');
    el.aim.style.display = c.done ? 'none' : '';
    [].forEach.call(el.svg.querySelectorAll('.rb-deg'), function (g) { var d = +g.getAttribute('data-deg'), diff = Math.abs(((c.angle - d) % 360 + 540) % 360 - 180); g.style.display = diff < 16 ? 'none' : ''; });
    // the angle on the protractor
    if (RK.isSpace(lv)) {
      var hp = lv.planets[lv.home || 0], cx = kx(lv, hp.x), cy = ky(lv, hp.y), R = hp.r * VW / lv.W + 34, e = RK.trig(c.angle);
      el.wedge.setAttribute('d', c.angle === 0 ? '' : 'M' + f1(cx + R) + ',' + cy + ' A' + f1(R) + ',' + f1(R) + ' 0 ' + (c.angle > 180 ? 1 : 0) + ' 0 ' + f1(cx + e[0] * R) + ',' + f1(cy - e[1] * R));
    } else {
      var P = launchPx(lv, 0), Rw = 64;
      el.wedge.setAttribute('d', c.angle === 0 ? '' : 'M' + P[0] + ',' + P[1] + ' L' + f1(P[0] + Rw) + ',' + P[1] + ' A' + Rw + ',' + Rw + ' 0 0 0 ' + f1(P[0] + cs[0] * Rw) + ',' + f1(P[1] - cs[1] * Rw) + ' Z');
    }
  }
  function bindPointer() {
    var svg = el.svg, drag = null;
    function toVB(e) { var r = svg.getBoundingClientRect(); return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VH / r.height]; }
    svg.addEventListener('pointerdown', function (e) {
      var c = st && st.cur; if (!c || c.flying || c.done) return;
      drag = { id: e.pointerId }; try { svg.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
      e.preventDefault(); move(e);
    });
    function move(e) {
      if (!drag) return;
      var lv = st.lv, L = launchPx(lv, st.cur.angle), p = toVB(e), base = RK.isSpace(lv) ? [kx(lv, lv.planets[lv.home || 0].x), ky(lv, lv.planets[lv.home || 0].y)] : L;
      var dx = base[0] - p[0], dy = -(base[1] - p[1]), dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 12) return;
      var a = Math.atan2(dy, dx) * 180 / Math.PI;
      if (!RK.isSpace(lv)) { if (a < 0) a = a < -90 ? 180 : 0; }
      var extra = RK.isSpace(lv) ? lv.planets[lv.home || 0].r * VW / lv.W : 0;
      setAim(Math.round(a), Math.round((dist - extra) / 3));
      el.band.setAttribute('x1', f1(base[0])); el.band.setAttribute('y1', f1(base[1])); el.band.setAttribute('x2', f1(p[0])); el.band.setAttribute('y2', f1(p[1])); el.band.setAttribute('stroke-opacity', '.6');
    }
    svg.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { svg.addEventListener(ev, function () { if (drag) { drag = null; el.band.setAttribute('stroke-opacity', '0'); } }); });
  }
  function bindKeys() {
    keyHandler = function (e) {
      if (!st || !st.cur || !el.svg || !el.svg.isConnected || document.querySelector('.rs-overlay')) return;
      var tg = e.target, tag = (tg && tg.tagName) || '';
      if (tag === 'INPUT' && tg.type !== 'range') return;
      var step = e.shiftKey ? 5 : 1, c = st.cur;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); if (c.flying || c.done) return;
        if (e.key === 'ArrowLeft') setAim(c.angle - step, null); else if (e.key === 'ArrowRight') setAim(c.angle + step, null);
        else if (e.key === 'ArrowUp') setAim(null, c.power + step); else setAim(null, c.power - step);
        return;
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
        if (tag === 'BUTTON' || tag === 'A' || tag === 'SELECT' || tag === 'TEXTAREA') return; // let the focused button do its own thing
        e.preventDefault(); fire();
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  /* ---------- a shot ---------- */
  function fire() {
    var c = st && st.cur; if (!c || c.flying || c.done) return;
    var lv = st.lv, res = RK.simulate(lv, c.angle, c.power, { path: true, every: 1 });
    c.flying = true; c.shots++; c.last = { a: c.angle, p: c.power, res: res };
    Core.play('zap');
    el.fire.disabled = true; el.fire.textContent = S.flying; el.aim.style.display = 'none';
    [].forEach.call(el.panel.querySelectorAll('button, input'), function (b) { if (b !== el.fire) b.disabled = true; });
    drawTools();
    el.mark.setAttribute('d', ''); el.boom.setAttribute('opacity', '0');
    el.rocket.classList.add('flying');
    var path = res.path, n = path.length, dur = clamp(1.25 * Math.sqrt(res.t), 1.5, 4.5) * 1000 / speedK, t0 = null;
    function frame(now) {
      if (!st || st.cur !== c) return;
      if (t0 === null) t0 = now;
      var f = Math.min(1, (now - t0) / dur), i = Math.min(n - 1, Math.floor(f * (n - 1))), p = path[i], q = path[Math.min(n - 1, i + 2)], r = path[Math.max(0, i - 2)];
      var dx = q[0] - r[0], dy = q[1] - r[1], ang = dx || dy ? Math.atan2(dy, dx) * 180 / Math.PI : c.angle;
      el.rocket.setAttribute('transform', 'translate(' + kx(lv, p[0]) + ',' + ky(lv, p[1]) + ') rotate(' + f1(-ang) + ')');
      if (i % 3 === 0 || f >= 1) el.live.setAttribute('points', pts(lv, path.slice(0, i + 1).filter(function (x, k) { return k % 3 === 0 || k === i; })));
      offscreen(lv, p);
      if (f < 1) { raf = requestAnimationFrame(frame); return; }
      raf = 0; landed(res);
    }
    raf = requestAnimationFrame(frame);
  }
  // a little arrow at the edge when the rocket is above (or beside) the picture
  function offscreen(lv, p) {
    var x = kx(lv, p[0]), y = ky(lv, p[1]);
    if (x >= 0 && x <= VW && y >= 0 && y <= VH) { el.mark.setAttribute('d', ''); return; }
    var cx = clamp(x, 18, VW - 18), cy = clamp(y, 18, VH - 18), d;
    if (y < 0) d = 'M' + f1(cx) + ',4 l-14,22 h28 z'; else if (y > VH) d = 'M' + f1(cx) + ',' + (VH - 4) + ' l-14,-22 h28 z';
    else if (x < 0) d = 'M4,' + f1(cy) + ' l22,-14 v28 z'; else d = 'M' + (VW - 4) + ',' + f1(cy) + ' l-22,-14 v28 z';
    el.mark.setAttribute('d', d);
  }
  function landed(res) {
    var c = st.cur, lv = st.lv;
    c.flying = false; el.mark.setAttribute('d', '');
    el.rocket.classList.remove('flying');
    // keep the shot as a faint trail
    c.trails.push(res.path.filter(function (x, k) { return k % 3 === 0; }).concat([res.path[res.path.length - 1]]));
    if (c.trails.length > 12) c.trails.shift();
    drawTrails(); el.live.setAttribute('points', '');
    if (res.hit) { hit(); return; }
    c.misses++;
    boom(res.at);
    Core.play('bump');
    setBob(c.misses >= 3 ? 'encouraging' : 'thinking', feedback(lv, res, c.last.a, c.last.p, c.misses));
    later(function () { if (st && st.cur === c && !c.done) { enable(); placeRocket(); } }, 450);
    drawTools();
  }
  function enable() { el.fire.disabled = false; el.fire.textContent = S.fire; [].forEach.call(el.panel.querySelectorAll('button, input'), function (b) { b.disabled = false; }); el.aim.style.display = ''; }
  function boom(at) {
    var lv = st.lv, x = kx(lv, at[0]), y = ky(lv, at[1]), o = '';
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; o += '<line x1="' + f1(x + Math.cos(a) * 10) + '" y1="' + f1(y + Math.sin(a) * 10) + '" x2="' + f1(x + Math.cos(a) * 24) + '" y2="' + f1(y + Math.sin(a) * 24) + '" stroke="#FF9F1C" stroke-width="5" stroke-linecap="round"/>'; }
    el.boom.innerHTML = o + '<circle cx="' + x + '" cy="' + y + '" r="9" fill="#FFD43B"/>';
    el.boom.setAttribute('opacity', '1');
    later(function () { if (el.boom) el.boom.setAttribute('opacity', '0'); }, 900);
  }
  function drawTrails() {
    var lv = st.lv, tc = lookOf(lv).trail, tr = st.cur.trails, o = '';
    tr.forEach(function (p, i) { o += '<polyline points="' + pts(lv, p) + '" fill="none" stroke="' + tc + '" stroke-opacity="' + (i === tr.length - 1 ? 0.75 : 0.35) + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 12"/>'; });
    el.trails.innerHTML = o;
  }

  /* ---------- Bob's feedback after a miss ---------- */
  function feedback(lv, res, a, p, misses) {
    if (RK.isSpace(lv)) return spaceFeedback(lv, res, a, p);
    var s = lv.station, L = RK.padPoint(lv), dir = s[0] >= L[0] ? 1 : -1, msg;
    var endX = res.at[0], fwd = (endX - L[0]) * dir;
    if (res.end === 'wall') { var w = lv.walls[res.which], wx = (w[0] + w[2]) / 2; msg = (wx - s[0]) * dir > 0 ? S.wallFar : S.wall; }
    else if (res.end === 'rock') msg = S.rock;
    else if (fwd < -lv.W * 0.02 || (fwd < lv.W * 0.05 && RK.trig(a)[0] * dir < -0.05)) msg = S.backwards;
    else if (res.crossY !== null && (res.at[0] - s[0]) * dir > 0) {
      var above = res.crossY - s[1];
      if (above > 0) msg = above < s[2] * 3 ? S.closeLong : lv.world === 'maanen' ? S.longMoon : res.end === 'out' ? S.edge : S.over;
      else msg = S.under;
    } else {
      var gap = Math.abs(s[0] - endX), aim = dir > 0 ? 45 : 135;
      msg = gap < s[2] * 3 ? S.closeShort : lv.world === 'jupiter' ? S.shortJupiter : Math.abs(a - aim) > 15 ? S.short45 : S.shortMore;
    }
    if (lv.wind && misses % 3 === 1) msg += ' ' + t(S.windNote, { dir: lv.wind > 0 ? S.windDir.right : S.windDir.left });
    return msg;
  }
  function spaceFeedback(lv, res, a, p) {
    var home = lv.home || 0, body = res.which >= 0 && lv.planets[res.which] ? S.bodies[lv.planets[res.which].name] : '', msg;
    if (res.end === 'planet' && res.which === home) return t(S.fellBack, { body: body });
    msg = res.end === 'planet' ? t(S.crash, { body: body }) : res.end === 'rock' ? S.asteroid : res.end === 'out' ? S.lost : S.orbit;
    if (res.minD < lv.station[2] * 1.5) msg += ' ' + S.nearStation;
    // try small changes and suggest the one that comes closest to the station
    var tries = [[a + 3, p, S.tryAngleUp], [a - 3, p, S.tryAngleDown], [a, p + 3, S.tryPowerUp], [a, p - 3, S.tryPowerDown]], best = null, bd = res.minD - 0.3;
    tries.forEach(function (x) { var pp = clamp(x[1], RK.POW[0], RK.POW[1]); if (pp === p && x[0] === a) return; var r = RK.simulate(lv, (x[0] + 360) % 360, pp); var dd = r.hit ? -1 : r.minD; if (dd < bd) { bd = dd; best = x[2]; } });
    return msg + ' ' + (best || S.tryOther);
  }

  /* ---------- help ---------- */
  function drawTools() {
    if (!el.tools || !st || !st.cur) return;
    var c = st.cur;
    el.tools.innerHTML = '';
    el.shots.textContent = t(S.shots, { n: c.shots });
    if (c.done) return;
    el.tools.appendChild(h('div', { class: 'rb-toolrow' }, [
      h('button', { type: 'button', class: 'btn' + (c.misses >= SHOW_AFTER && !c.helped ? ' secondary' : ''), disabled: c.misses < SHOW_AFTER || c.flying, onclick: showShot }, S.showShot),
      h('button', { type: 'button', class: 'btn' + (c.misses >= SOLVE_AFTER ? ' secondary' : ''), disabled: c.misses < SOLVE_AFTER || c.flying, onclick: showSolution }, S.showSolution)
    ]));
    el.tools.appendChild(h('p', { class: 'rb-note' }, [c.misses ? h('b', {}, t(S.misses, { n: c.misses }) + ' · ') : null, S.helpNote]));
  }
  function solution() { return st.custom ? (st.shot || (st.shot = RK.findShot(st.lv))) : st.lv.sol; }
  function showGhost(sol) { var r = RK.simulate(st.lv, sol[0], sol[1], { path: true, every: 3 }); st.cur.ghost = r.path; el.ghost.setAttribute('points', pts(st.lv, r.path)); }
  function showShot() {
    var c = st.cur; if (c.misses < SHOW_AFTER || c.flying || c.done) return;
    var sol = solution(); if (!sol) return;
    c.helped = true; Core.play('star');
    setAim(sol[0], sol[1]); showGhost(sol);
    setBob('happy', S.shotShown);
    el.fire.focus();
  }
  function showSolution() {
    var c = st.cur; if (c.misses < SOLVE_AFTER || c.flying || c.done) return;
    var sol = solution(); if (!sol) return;
    c.shown = true;
    setAim(sol[0], sol[1]); showGhost(sol);
    var fact = st.custom ? '' : worldById(st.w).fact;
    el.explain.innerHTML = '';
    el.explain.appendChild(h('div', { class: 'oj-rule rb-why' }, [h('p', { class: 'rb-stephead' }, S.solutionHead), st.custom ? null : h('p', {}, st.lv.why), fact ? h('p', { class: 'muted' }, fact) : null]));
    setBob('thinking', S.solutionGo);
    later(fire, 1300 / speedK);
  }

  /* ---------- a hit ---------- */
  function hit() {
    var c = st.cur; c.done = true;
    Core.play('win');
    el.ring.classList.add('lit'); el.aim.style.display = 'none';
    el.svg.querySelector('.rb-station').classList.add('hit');
    c.stars = starsFor(c.shots, c.helped, c.shown);
    if (!c.shown && c.misses >= 3) Core.visit('staedig');
    setBob('cheering', c.shots === 1 ? S.hitFirst : pick(S.hit));
    drawTools();
    later(st.custom ? customDone : finish, 1300 / speedK);
  }
  function customDone() {
    var c = st.cur;
    var o = h('div', { class: 'rs-overlay rb-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: 'cheering', outfit: OUTFIT, size: 140 }) }),
      h('h2', {}, S.sbDone), h('p', {}, c.shots === 1 ? S.hitIn1 : t(S.hitIn, { n: c.shots })),
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), h('button', { type: 'button', class: 'btn primary', onclick: showSandbox }, S.sbBack)])
    ]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }
  function finish() {
    clearAll(); dropKeys();
    var d = data(), c = st.cur, wid = st.w, lvl = st.level, w = worldById(wid), ws = wState(d, wid), stars = c.stars;
    var before = worldStars(d, wid), prevBest = ws.best[lvl - 1] || 0, newBest = prevBest > 0 && stars > prevBest;
    ws.best[lvl - 1] = Math.max(ws.best[lvl - 1] || 0, stars); ws.plays++;
    d.lv[wid] = Math.max(levelOf(d, wid), Math.min(NLEV, lvl + 1));
    var after = worldStars(d, wid), complete = levelsDone(d, wid) >= NLEV, newCard = complete && !d.cards[wid];
    if (newCard) d.cards[wid] = 1;
    var why = st.lv.why, shots = c.shots;
    Core.save();
    var badgeNode = Core.roundDone(ID, wid, ws.plays > 1 ? before : null, after);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var primary = lvl < NLEV ? h('button', { type: 'button', class: 'btn primary', onclick: function () { startLevel(wid, lvl + 1); } }, S.nextLevel)
      : newCard ? h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); showCard(wid, true); } }, S.seeCard)
      : h('button', { type: 'button', class: 'btn primary', onclick: function () { startLevel(wid, lvl); } }, S.playAgain);
    var o = h('div', { class: 'rs-overlay rb-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog rb-result' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : 'happy', outfit: OUTFIT, size: 130 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', { class: 'rb-shotmsg' }, shots === 1 ? S.hitIn1 : t(S.hitIn, { n: shots })),
      h('div', { class: 'rb-whybox' }, [h('strong', {}, S.whyHead), h('p', {}, why)]),
      complete ? h('p', { class: 'rb-lvlmsg' }, t(S.worldDone, { world: nameOf(wid) })) : h('p', { class: 'muted' }, t(S.nextLevelMsg, { n: Math.min(NLEV, lvl + 1), max: NLEV })),
      newCard ? h('p', { class: 'rs-newbest rb-newcard' }, S.newCard) : null,
      badgeNode,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), primary])
    ]));
    app.appendChild(o);
    var se = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) { later(function () { se[i].classList.remove('off'); se[i].classList.add('on', 'pop'); Core.play('star'); }, 450 + i * 380); })(i);
    primary.focus();
    st = null;
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay rb-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ), h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: function () { if (st && st.custom) showSandbox(); else showMap(); } }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }

  /* ================= RUMLOGBOG ================= */
  function cardNode(wid, isNew) {
    var c = S.cards[wid];
    return h('article', { class: 'rb-card w-' + wid }, [
      h('div', { class: 'rb-card-head' }, [h('span', { html: planetIcon(wid, 56) }), h('div', {}, [isNew ? h('span', { class: 'rb-card-new' }, S.newCard) : null, h('h3', {}, c.title), c.title !== nameOf(wid) ? h('span', { class: 'muted' }, nameOf(wid)) : null])]),
      h('dl', { class: 'rb-facts' }, c.rows.map(function (r) { return h('div', {}, [h('dt', {}, r[0]), h('dd', {}, r[1])]); })),
      h('p', { class: 'rb-fun' }, [h('strong', {}, S.cardFun + ' '), c.fun])
    ]);
  }
  function showCard(wid, isNew) {
    var o = h('div', { class: 'rs-overlay rb-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': S.cards[wid].title }, h('div', { class: 'card rs-dialog rb-carddlg' }, [
      cardNode(wid, isNew),
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); showLogbook(); } }, S.logbook)])
    ]));
    app.appendChild(o); Core.play('level');
    o.querySelector('.btn.primary').focus();
  }
  function showLogbook() {
    clearAll(); dropKeys(); closeOverlays(); st = null;
    var d = data(), col = collection(d);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen rb-logbook' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + S.toMap), h('h1', {}, S.logbookTitle)]),
      h('p', { class: 'lead' }, col.n ? t(S.logbookCount, col) : S.logbookEmpty), col.n ? h('p', { class: 'muted' }, S.logbookIntro) : null,
      h('div', { class: 'rb-cards' }, WORLDS.map(function (w) {
        if (d.cards[w.id]) return cardNode(w.id);
        return h('article', { class: 'rb-card locked' }, [h('div', { class: 'rb-card-head' }, [h('span', { class: 'rb-q', 'aria-hidden': 'true' }, '?'), h('div', {}, [h('h3', {}, nameOf(w.id)), h('span', { class: 'muted' }, t(S.levelsDone, { n: levelsDone(d, w.id), max: NLEV }))])]), h('p', {}, t(S.cardLocked, { world: nameOf(w.id) }))]);
      }))
    ]));
  }

  /* ================= SANDBOX ================= */
  var SBX = RK.sandbox, sb = { tool: 'station', s: null };
  function blankSb(w) { return { w: w || 0, pad: 1, st: [8, 2], obs: [] }; }
  function showSandbox() {
    clearAll(); dropKeys(); closeOverlays(); st = null; el = {};
    Core.visit(ID + ':sandbox');
    if (!sb.s) sb.s = blankSb(0);
    app.innerHTML = '';
    var result = h('div', { class: 'rb-sb-result', 'aria-live': 'polite' }), count = h('p', { class: 'rb-sb-count' }), stage = h('div', { class: 'rb-stage rb-sb-stage' });
    function draw() {
      var lv = SBX.build(sb.s);
      stage.innerHTML = sceneSvg(lv, { uid: 'rbsb-', grid: true, aim: false, pose: 45, label: S.sbTitle, ts: textScale() });
      var svg = stage.querySelector('svg');
      count.textContent = t(S.sbCount, { n: sb.s.obs.length, max: SBX.MAX });
      [].forEach.call(svg.querySelectorAll('.rb-cell'), function (r) { r.setAttribute('tabindex', '0'); r.setAttribute('role', 'button'); r.setAttribute('aria-label', t(S.sbGrid, { c: +r.getAttribute('data-c') + 1, r: +r.getAttribute('data-r') + 1 })); });
    }
    stage.addEventListener('click', function (e) { var c = e.target.closest && e.target.closest('.rb-cell'); if (c) tap(+c.getAttribute('data-c'), +c.getAttribute('data-r')); });
    stage.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('rb-cell')) { e.preventDefault(); var c = +e.target.getAttribute('data-c'), r = +e.target.getAttribute('data-r'); tap(c, r); var again = stage.querySelector('.rb-cell[data-c="' + c + '"][data-r="' + r + '"]'); if (again) again.focus(); } });
    function tap(c, r) {
      var s = sb.s, i, ok = true;
      if (sb.tool === 'pad') { s.pad = c; s.obs = s.obs.filter(function (o) { return !(o[1] === c && (o[0] === 'm' || o[2] <= 1)); }); }
      else if (sb.tool === 'station') { s.st = [c, r]; s.obs = s.obs.filter(function (o) { return !(o[1] === c && (o[0] === 'm' ? o[2] >= r : o[2] === r)); }); }
      else if (sb.tool === 'wall') {
        i = SBX.wallAt(s, c);
        if (c === s.pad || (c === s.st[0] && r >= s.st[1])) ok = false;
        else if (i >= 0) { if (s.obs[i][2] === r) s.obs.splice(i, 1); else s.obs[i][2] = r; }
        else if (s.obs.length >= SBX.MAX) { result.innerHTML = ''; result.appendChild(h('div', { class: 'oj-rule final' }, h('p', {}, S.sbFull))); Core.play('wrong'); return; }
        else s.obs.push(['m', c, r]);
        if (ok) s.obs = s.obs.filter(function (o) { return !(o[0] === 's' && o[1] === c && o[2] <= r && SBX.wallAt(s, c) >= 0); });
      } else if (sb.tool === 'rock') {
        i = SBX.rockAt(s, c, r); var wi = SBX.wallAt(s, c);
        if (i >= 0) s.obs.splice(i, 1);
        else if ((c === s.pad && r <= 1) || (c === s.st[0] && r === s.st[1]) || (wi >= 0 && s.obs[wi][2] >= r)) ok = false;
        else if (s.obs.length >= SBX.MAX) { result.innerHTML = ''; result.appendChild(h('div', { class: 'oj-rule final' }, h('p', {}, S.sbFull))); Core.play('wrong'); return; }
        else s.obs.push(['s', c, r]);
      } else { // erase
        i = SBX.rockAt(s, c, r); if (i >= 0) s.obs.splice(i, 1); else { i = SBX.wallAt(s, c); if (i >= 0 && s.obs[i][2] >= r) s.obs.splice(i, 1); else ok = false; }
      }
      Core.play(ok ? 'click' : 'bump');
      result.innerHTML = '';
      draw();
    }
    var tools = h('div', { class: 'rb-sb-tools', role: 'group', 'aria-label': S.sbTitle }, ['pad', 'station', 'wall', 'rock', 'erase'].map(function (k) {
      return h('button', { type: 'button', class: 'rb-sb-tool' + (sb.tool === k ? ' sel' : ''), 'data-tool': k, 'aria-pressed': sb.tool === k ? 'true' : 'false', onclick: function () { sb.tool = k; [].forEach.call(tools.children, function (b) { var on = b.getAttribute('data-tool') === k; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); } },
        [h('span', { class: 'rb-sb-swatch s-' + k, 'aria-hidden': 'true' }), S.sbTools[k]]);
    }));
    var worldsRow = h('div', { class: 'segmented rb-sb-worlds', role: 'group', 'aria-label': S.sbWorld }, SBX.WORLDS.map(function (wid, i) {
      return h('button', { type: 'button', class: 'seg' + (sb.s.w === i ? ' sel' : ''), 'aria-pressed': sb.s.w === i ? 'true' : 'false', onclick: function () { sb.s.w = i; Core.play('click'); showSandbox(); } }, nameOf(wid));
    }));
    var codeIn = h('input', { class: 'rb-sb-code', type: 'text', 'aria-label': S.sbLoadTitle, maxlength: '40', autocomplete: 'off', spellcheck: 'false' }), loadMsg = h('p', { class: 'muted rb-sb-loadmsg', 'aria-live': 'polite' });
    app.appendChild(h('main', { class: 'screen rb-sandbox' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + S.toMap), h('h1', {}, S.sbTitle)]),
      h('p', { class: 'lead' }, S.sbIntro),
      h('div', { class: 'rb-sb-row' }, [h('strong', {}, S.sbWorld + ':'), worldsRow]),
      tools, stage, count,
      h('div', { class: 'row center' }, [
        h('button', { type: 'button', class: 'btn ghost', onclick: function () { sb.s = blankSb(sb.s.w); showSandbox(); } }, S.sbClear),
        h('button', { type: 'button', class: 'btn primary rb-sb-test', onclick: function () { testLevel(result); } }, S.sbTest)
      ]),
      result,
      h('section', { class: 'card rb-sb-load' }, [h('h2', {}, S.sbLoadTitle), h('div', { class: 'row' }, [codeIn, h('button', { type: 'button', class: 'btn', onclick: function () {
        var got = SBX.fromCode(codeIn.value);
        if (!got) { loadMsg.textContent = S.sbBadCode; Core.play('wrong'); return; }
        startCustom(got.lv, got.sb);
      } }, S.sbLoad)]), loadMsg])
    ]));
    draw();
  }
  function testLevel(result) {
    result.innerHTML = '';
    result.appendChild(h('p', { class: 'muted' }, S.sbTesting));
    later(function () {
      var s = JSON.parse(JSON.stringify(sb.s)), lv = SBX.build(s), shot = SBX.valid(s) ? RK.findShot(lv) : null;
      result.innerHTML = '';
      if (!shot) { result.appendChild(h('div', { class: 'oj-rule final' }, h('p', {}, S.sbBad))); Core.play('wrong'); return; }
      Core.play('correct');
      Core.visit('gaademager');
      var badge = Core.roundDone(ID, 'sandbox', null, 0), code = SBX.toCode(s);
      var inp = h('input', { class: 'rb-sb-code', type: 'text', readonly: true, value: code, 'aria-label': S.sbCode }), copied = h('span', { class: 'muted' });
      result.appendChild(h('div', { class: 'oj-rule' }, [h('p', {}, h('strong', {}, S.sbGood)), h('p', {}, S.sbCode), h('div', { class: 'row' }, [inp,
        h('button', { type: 'button', class: 'btn', onclick: function () { inp.select(); try { navigator.clipboard.writeText(code).then(function () { copied.textContent = S.sbCopied; }, function () { document.execCommand('copy'); copied.textContent = S.sbCopied; }); } catch (e) { document.execCommand('copy'); copied.textContent = S.sbCopied; } } }, S.sbCopy), copied]),
        h('button', { type: 'button', class: 'btn primary rb-sb-play', onclick: function () { startCustom(lv, s, true); st.shot = shot; } }, S.sbPlay), badge]));
    }, 30);
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport, progress: progress, quickTask: quickTask, collection: collection,
    // test hooks
    _state: function () { return st; }, _worlds: WORLDS, _sol: function () { return st ? solution() : null; }, _speed: function (k) { speedK = k || 1; }, _sceneSvg: sceneSvg,
    _starsFor: starsFor, _worldStars: worldStars, _feedback: feedback, _sandbox: function () { return sb; }, _el: function () { return el; } });
})(window);
