/*
 * Bob – maskot for spilsamlingen.
 * Layered SVG, built in code so expressions and outfits can be combined freely.
 * Works from file:// and from a web server (classic script, no modules).
 *
 * Usage:
 *   Bob.svg({ expression: 'happy', outfit: 'lab', size: 160 })  -> SVG string
 *   Bob.mount(element, { expression: 'cheering', outfit: 'cape' })
 *
 * expression: default | happy | hello | thinking | cheering | surprised | encouraging | waiting
 * outfit:     none | bag | cape (Regnestorm) | explorer (Ordjægeren) | lab (Laboratoriet)
 *             | pilot (Verdensrejsen) | tools (Robotkoden) | schoolbag (Ordbroen) | timetravel (Tidsmaskinen)
 *             | detective (Netdetektiven) | builder (Byggepladsen) | shop (Lommepenge) | music (Taktslaget) | thinker (Tankespind) | puzzler (Gådehuset) | caver (Labyrinten) | astronaut (Raketbanen) | museum (Mysteriet på museet)
 * crop:       'full' (default) | 'head' (for icons and speech bubbles)
 * sidekick:   true/false – shows the robot; defaults to true for outfit 'tools'
 * trim:       true – crops the empty margin when the robot is shown (used on the hub cards)
 * look:       { bow, wings, tip, hat, extra } – Bob's unlockable details (see Bob.looks). Bob.setLook() sets the
 *             bow, wings and tips for every drawing; hat and extra show only when look is passed and outfit is none.
 */
(function (root) {
  'use strict';

  var C = {
    out: '#4A2C17', yellow: '#F7C548', cap: '#B07A3A', stripe: '#6B4426',
    blue: '#6BB8E0', blueDark: '#3E8FC2', wing: '#E6F4FC', wingLine: '#86C5E8',
    pink: '#F2A28F', mouth: '#9E3B32', tongue: '#F07D7D', white: '#FFFFFF', pupil: '#1E1410',
    leather: '#8B5A2B', leatherDark: '#5C3A1C', khaki: '#EFE6C8', band: '#8DB36A',
    wood: '#A0703A', robot: '#A9D8F2', screen: '#E3F3FB', bolt: '#FFE14D', red: '#D9463B'
  };
  var SW = 3.5; // outline width
  var uid = 0;

  function a(attrs) {
    var s = '';
    for (var k in attrs) if (attrs[k] !== undefined) s += ' ' + k + '="' + attrs[k] + '"';
    return s;
  }
  function el(tag, attrs) { return '<' + tag + a(attrs) + '/>'; }
  function path(d, fill, extra) {
    var o = { d: d, fill: fill || 'none', stroke: C.out, 'stroke-width': SW, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    for (var k in extra || {}) o[k] = extra[k];
    return el('path', o);
  }
  // A rounded limb with outline: dark wide stroke under a coloured narrower stroke.
  function limb(d, w, color) {
    var base = { d: d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    return el('path', Object.assign({}, base, { stroke: C.out, 'stroke-width': w + 7 })) +
           el('path', Object.assign({}, base, { stroke: color || C.yellow, 'stroke-width': w }));
  }
  function line(d, color, w) {
    return el('path', { d: d, fill: 'none', stroke: color || C.out, 'stroke-width': w || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  }

  /* ---------- face parts ---------- */
  var EYE_L = 96, EYE_R = 144, EYE_Y = 110;

  function eye(cx, cy, r, pr, dx, dy) {
    return el('circle', { cx: cx, cy: cy, r: r, fill: C.white, stroke: C.out, 'stroke-width': SW }) +
           el('circle', { cx: cx + dx, cy: cy + dy, r: pr, fill: C.pupil }) +
           el('circle', { cx: cx + dx - pr * 0.35, cy: cy + dy - pr * 0.42, r: pr * 0.33, fill: C.white });
  }
  function eyes(r, pr, dx, dy) { return eye(EYE_L, EYE_Y, r, pr, dx, dy) + eye(EYE_R, EYE_Y, r, pr, dx, dy); }
  function happyEye(cx) { return line('M' + (cx - 11) + ',' + (EYE_Y + 3) + ' Q' + cx + ',' + (EYE_Y - 11) + ' ' + (cx + 11) + ',' + (EYE_Y + 3), C.out, 4.5); }
  function sleepyEye(cx) {
    return line('M' + (cx - 12) + ',' + (EYE_Y + 1) + ' Q' + cx + ',' + (EYE_Y + 10) + ' ' + (cx + 12) + ',' + (EYE_Y + 1), C.out, 4.5);
  }
  function cheeks() {
    return el('ellipse', { cx: 79, cy: 131, rx: 10, ry: 5.5, fill: C.pink, opacity: 0.85 }) +
           el('ellipse', { cx: 161, cy: 131, rx: 10, ry: 5.5, fill: C.pink, opacity: 0.85 });
  }
  function brows(ly, ry, lTilt, rTilt) {
    lTilt = lTilt || 0; rTilt = rTilt || 0;
    return line('M' + (EYE_L - 8) + ',' + (ly + lTilt) + ' Q' + EYE_L + ',' + (ly - 4) + ' ' + (EYE_L + 8) + ',' + (ly - lTilt), C.out, 3) +
           line('M' + (EYE_R - 8) + ',' + (ry - rTilt) + ' Q' + EYE_R + ',' + (ry - 4) + ' ' + (EYE_R + 8) + ',' + (ry + rTilt), C.out, 3);
  }
  var MOUTH = {
    smile: function () { return line('M110,135 Q120,145 130,135', C.out, SW); },
    wide: function () { return line('M106,134 Q120,149 134,134', C.out, SW); },
    soft: function () { return line('M113,138 Q120,143 127,138', C.out, SW); },
    hmm: function () { return line('M113,141 Q121,137 129,140', C.out, SW); },
    open: function () {
      return path('M106,133 Q120,155 134,133 Q120,137 106,133 Z', C.mouth) +
             el('path', { d: 'M113,145 Q120,140 127,145 Q120,151 113,145 Z', fill: C.tongue });
    },
    big: function () {
      return path('M101,130 Q120,164 139,130 Q120,135 101,130 Z', C.mouth) +
             el('path', { d: 'M109,148 Q120,140 131,148 Q120,157 109,148 Z', fill: C.tongue });
    },
    o: function () { return el('ellipse', { cx: 120, cy: 141, rx: 5.5, ry: 6.5, fill: C.mouth, stroke: C.out, 'stroke-width': 3 }); }
  };
  function sparkle(x, y, s) {
    return path('M' + x + ',' + (y - s) + ' Q' + x + ',' + y + ' ' + (x + s) + ',' + y + ' Q' + x + ',' + y + ' ' + x + ',' + (y + s) +
                ' Q' + x + ',' + y + ' ' + (x - s) + ',' + y + ' Q' + x + ',' + y + ' ' + x + ',' + (y - s) + ' Z', C.bolt, { 'stroke-width': 2 });
  }
  function zzz() {
    return line('M184,50 h9 l-9,10 h9', C.blueDark, 2.6) + line('M198,30 h12 l-12,13 h12', C.blueDark, 3);
  }

  /* ---------- expressions: face + arm pose ---------- */
  var EXPRESSIONS = {
    'default':   { face: function () { return eyes(20, 13, 0, 1) + brows(81, 81) + cheeks() + MOUTH.smile(); }, arms: ['down', 'down'] },
    happy:       { face: function () { return eyes(20, 13, 0, 0) + brows(79, 79) + cheeks() + MOUTH.open(); }, arms: ['down', 'down'] },
    hello:       { face: function () { return eyes(20, 13, 1, 0) + brows(80, 80) + cheeks() + MOUTH.wide(); }, arms: ['down', 'wave'] },
    thinking:    { face: function () { return eyes(20, 12, 6, -5) + line('M86,84 L106,82', C.out, 3) + line('M133,77 Q143,69 154,74', C.out, 3) + cheeks() + MOUTH.hmm(); }, arms: ['down', 'chin'] },
    cheering:    { face: function () { return happyEye(EYE_L) + happyEye(EYE_R) + cheeks() + MOUTH.big() + sparkle(50, 72, 8) + sparkle(190, 72, 8); }, arms: ['up', 'up'] },
    surprised:   { face: function () { return eyes(22, 9, 0, 0) + brows(74, 74) + cheeks() + MOUTH.o(); }, arms: ['out', 'out'] },
    encouraging: { face: function () { return eyes(20, 13, 2, 0) + brows(81, 81, 1, 1) + cheeks() + MOUTH.wide(); }, arms: ['down', 'thumb'] },
    waiting:     { face: function () { return sleepyEye(EYE_L) + sleepyEye(EYE_R) + cheeks() + MOUTH.soft() + zzz(); }, arms: ['fold', 'fold'] }
  };

  var ARMS_L = {
    down: 'M84,186 Q72,208 74,230', up: 'M82,186 Q62,162 56,128',
    out: 'M82,188 Q66,186 54,170', fold: 'M84,188 Q88,220 118,216'
  };
  var ARMS_R = {
    down: 'M156,186 Q168,208 166,230', up: 'M158,186 Q178,162 184,128',
    out: 'M158,188 Q174,186 186,170', wave: 'M158,188 Q184,186 186,154',
    chin: 'M156,192 Q154,168 138,156', thumb: 'M156,188 Q178,194 182,174',
    fold: 'M156,188 Q152,224 124,222'
  };
  function arms(pose) {
    var s = limb(ARMS_L[pose[0]] || ARMS_L.down, 13) + limb(ARMS_R[pose[1]] || ARMS_R.down, 13);
    if (pose[1] === 'thumb') s += limb('M183,170 L184,158', 5);
    return s;
  }

  /* ---------- body parts ---------- */
  function wings(look, id) {
    var st = WINGS[look] || null, fill = C.wing, stroke = C.wingLine, defs = '';
    if (st) { var r = st(id); fill = r.fill; stroke = r.stroke; defs = r.defs || ''; }
    var w = { fill: fill, stroke: stroke, 'stroke-width': 3, opacity: 0.95 };
    return defs + el('ellipse', Object.assign({ cx: 62, cy: 170, rx: 32, ry: 20, transform: 'rotate(-22 62 170)' }, w)) +
           el('ellipse', Object.assign({ cx: 70, cy: 200, rx: 21, ry: 13, transform: 'rotate(14 70 200)' }, w)) +
           el('ellipse', Object.assign({ cx: 178, cy: 170, rx: 32, ry: 20, transform: 'rotate(22 178 170)' }, w)) +
           el('ellipse', Object.assign({ cx: 170, cy: 200, rx: 21, ry: 13, transform: 'rotate(-14 170 200)' }, w));
  }
  function antennae(tip, id) {
    var t = TIPS[tip];
    return limb('M104,50 Q96,28 86,14', 5) + limb('M136,50 Q144,28 154,14', 5) +
           (t ? t(85, 11, id + 'l') + t(155, 11, id + 'r') :
           el('circle', { cx: 85, cy: 11, r: 9, fill: C.blue, stroke: C.out, 'stroke-width': SW }) +
           el('circle', { cx: 155, cy: 11, r: 9, fill: C.blue, stroke: C.out, 'stroke-width': SW }));
  }
  function legs() {
    return limb('M107,252 L104,280', 14) + limb('M133,252 L136,280', 14) +
           el('ellipse', { cx: 100, cy: 285, rx: 14, ry: 7.5, fill: C.yellow, stroke: C.out, 'stroke-width': SW }) +
           el('ellipse', { cx: 140, cy: 285, rx: 14, ry: 7.5, fill: C.yellow, stroke: C.out, 'stroke-width': SW });
  }
  function body(id) {
    return '<defs><clipPath id="' + id + 'b"><ellipse cx="120" cy="214" rx="44" ry="49"/></clipPath></defs>' +
      el('ellipse', { cx: 120, cy: 214, rx: 44, ry: 49, fill: C.yellow }) +
      '<g clip-path="url(#' + id + 'b)" fill="' + C.stripe + '">' +
        el('rect', { x: 60, y: 182, width: 120, height: 16 }) +
        el('rect', { x: 60, y: 214, width: 120, height: 16 }) +
        el('rect', { x: 60, y: 246, width: 120, height: 16 }) +
      '</g>' +
      el('ellipse', { cx: 120, cy: 214, rx: 44, ry: 49, fill: 'none', stroke: C.out, 'stroke-width': SW });
  }
  function collar(bow, id) {
    var f = BOWS[bow], fill = C.blue, defs = '';
    if (typeof f === 'string') fill = f;
    else if (f) { defs = f(id); fill = 'url(#' + id + 'bw)'; }
    return defs + path('M82,154 Q120,170 158,154 L156,174 Q140,183 122,172 L120,170 L118,172 Q100,183 84,174 Z', fill);
  }
  function head(id) {
    return '<defs><clipPath id="' + id + 'h"><ellipse cx="120" cy="98" rx="64" ry="60"/></clipPath></defs>' +
      el('ellipse', { cx: 120, cy: 98, rx: 64, ry: 60, fill: C.yellow }) +
      '<g clip-path="url(#' + id + 'h)">' +
        el('path', { d: 'M40,20 H200 V80 C178,60 150,58 132,68 L120,80 L108,68 C90,58 62,60 40,80 Z', fill: C.cap }) +
      '</g>' +
      el('ellipse', { cx: 120, cy: 98, rx: 64, ry: 60, fill: 'none', stroke: C.out, 'stroke-width': SW });
  }

  /* ---------- Bob's looks (unlocked with badges, chosen on the badge page) ---------- */
  function pat(id, w, hgt, body, tr) {
    return '<defs><pattern id="' + id + '" width="' + w + '" height="' + hgt + '" patternUnits="userSpaceOnUse"' + (tr ? ' patternTransform="' + tr + '"' : '') + '>' + body + '</pattern></defs>';
  }
  function grad(id, stops, vertical) {
    return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vertical ? 0 : 1) + '" y2="' + (vertical ? 1 : 0) + '">' +
      stops.map(function (c, i) { return '<stop offset="' + Math.round(100 * i / (stops.length - 1)) + '%" stop-color="' + c + '"/>'; }).join('') + '</linearGradient></defs>';
  }
  function heartPath(x, y, s) { return 'M' + x + ',' + (y + s * 0.9) + ' C' + (x - s * 1.6) + ',' + (y - s * 0.2) + ' ' + (x - s * 0.7) + ',' + (y - s * 1.3) + ' ' + x + ',' + (y - s * 0.4) +
    ' C' + (x + s * 0.7) + ',' + (y - s * 1.3) + ' ' + (x + s * 1.6) + ',' + (y - s * 0.2) + ' ' + x + ',' + (y + s * 0.9) + ' Z'; }
  function starPath(x, y, r) {
    var d = '';
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1); }
    return d + 'Z';
  }
  function gearPath(x, y, r, n) { // a cog with n flat teeth; draw a hub circle on top
    var d = '', st = 2 * Math.PI / n, ri = r * 0.74;
    for (var i = 0; i < n; i++) {
      var b = i * st;
      [[b - st * 0.5, ri], [b - st * 0.2, ri], [b - st * 0.13, r], [b + st * 0.13, r], [b + st * 0.2, ri]].forEach(function (q, j) {
        d += (i || j ? 'L' : 'M') + (x + q[1] * Math.cos(q[0])).toFixed(1) + ',' + (y + q[1] * Math.sin(q[0])).toFixed(1);
      });
    }
    return d + 'Z';
  }
  function gear(x, y, r, n, fill, sw) {
    return path(gearPath(x, y, r, n), fill, { 'stroke-width': sw || 2.5 }) + el('circle', { cx: x, cy: y, r: (r * 0.3).toFixed(1), fill: '#FFF3C4', stroke: C.out, 'stroke-width': sw || 2.5 });
  }
  function hexPath(x, y, r) { // flat-topped hexagon
    var d = '';
    for (var i = 0; i < 6; i++) d += (i ? 'L' : 'M') + (x + r * Math.cos(i * Math.PI / 3)).toFixed(2) + ',' + (y + r * Math.sin(i * Math.PI / 3)).toFixed(2);
    return d + 'Z';
  }
  function honeycomb(id, r, fill, line) { // a seamless honeycomb pattern
    var h = Math.sqrt(3) * r, w = 3 * r, cells = '';
    [[0, 0], [0, h], [w, 0], [w, h], [1.5 * r, h / 2]].forEach(function (q) { cells += '<path d="' + hexPath(q[0], q[1], r * 0.86) + '" fill="' + fill + '"/>'; });
    return pat(id, w.toFixed(2), h.toFixed(2), '<rect width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '" fill="' + line + '"/>' + cells);
  }
  function txt(x, y, s, size, fill, extra) {
    return '<text' + a(Object.assign({ x: x, y: y, 'text-anchor': 'middle', 'font-size': size, 'font-weight': 800, fill: fill, 'font-family': 'system-ui,sans-serif' }, extra || {})) + '>' + s + '</text>';
  }
  function tile(x, y, s, letter, num, rot) { // a word-game letter tile, s = side length
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + (rot || 0) + ')">' +
      el('rect', { x: -s / 2, y: -s / 2, width: s, height: s, rx: s * 0.18, fill: '#F6E3B4', stroke: C.out, 'stroke-width': s > 24 ? 3 : 2.2 }) +
      txt(-s * 0.06, s * 0.25, letter, (s * 0.66).toFixed(1), C.out) + txt(s * 0.3, s * 0.38, num, (s * 0.26).toFixed(1), C.out) + '</g>';
  }
  function cloudPath(x, y, w, h) { // a puffy cloud centred on x,y
    var rx = w / 2, ry = h / 2;
    return 'M' + (x - rx * 0.7) + ',' + (y + ry * 0.75) +
      ' A' + (ry * 0.6) + ',' + (ry * 0.6) + ' 0 0 1 ' + (x - rx) + ',' + (y + ry * 0.05) +
      ' A' + (ry * 0.6) + ',' + (ry * 0.6) + ' 0 0 1 ' + (x - rx * 0.62) + ',' + (y - ry * 0.7) +
      ' A' + (ry * 0.7) + ',' + (ry * 0.7) + ' 0 0 1 ' + (x + rx * 0.05) + ',' + (y - ry * 0.95) +
      ' A' + (ry * 0.7) + ',' + (ry * 0.7) + ' 0 0 1 ' + (x + rx * 0.72) + ',' + (y - ry * 0.55) +
      ' A' + (ry * 0.6) + ',' + (ry * 0.6) + ' 0 0 1 ' + (x + rx) + ',' + (y + ry * 0.25) +
      ' A' + (ry * 0.6) + ',' + (ry * 0.6) + ' 0 0 1 ' + (x + rx * 0.6) + ',' + (y + ry * 0.8) +
      ' A' + (ry * 0.9) + ',' + (ry * 0.5) + ' 0 0 1 ' + (x - rx * 0.7) + ',' + (y + ry * 0.75) + ' Z';
  }
  var BOWS = {
    rod: '#D9463B', groen: '#6FB04A', lilla: '#9B6FD0', orange: '#F28C28', lyseroed: '#F4A7C3', guld: '#E8C35A', moerkeblaa: '#2F5D9E', turkis: '#3CC2B4',
    stribet: function (id) { return pat(id + 'bw', 10, 10, '<rect width="10" height="10" fill="#FFFFFF"/><rect width="5" height="10" fill="#D9463B"/>', 'rotate(45)'); },
    prikket: function (id) { return pat(id + 'bw', 10, 10, '<rect width="10" height="10" fill="#3E8FC2"/><circle cx="5" cy="5" r="2.2" fill="#FFFFFF"/>'); },
    ternet: function (id) { return pat(id + 'bw', 12, 12, '<rect width="12" height="12" fill="#FFFFFF"/><rect width="6" height="6" fill="#6FB04A"/><rect x="6" y="6" width="6" height="6" fill="#6FB04A"/>'); },
    smaragd: '#1E9E6E',
    galakse: function (id) { return pat(id + 'bw', 14, 14, '<rect width="14" height="14" fill="#3B2A6E"/><circle cx="3" cy="4" r="1.2" fill="#FFFFFF"/><circle cx="10" cy="9" r="1.6" fill="#F4A7C3"/><circle cx="7" cy="13" r="0.8" fill="#9FE3F2"/>'); },
    perlemor: function (id) { return grad(id + 'bw', ['#F7F1FF', '#D9F2EE', '#F9E3EE', '#E6ECFA']); },
    skak: function (id) { return pat(id + 'bw', 12, 12, '<rect width="12" height="12" fill="#FFFFFF"/><rect width="6" height="6" fill="#2B2B33"/><rect x="6" y="6" width="6" height="6" fill="#2B2B33"/>'); },
    stjernehimmel: function (id) { return pat(id + 'bw', 14, 14, '<rect width="14" height="14" fill="#24346B"/><path d="' + starPath(4, 4, 2.8) + '" fill="#F7C548"/><circle cx="10.5" cy="10" r="1.3" fill="#FFFFFF"/>'); },
    zebra: function (id) { return pat(id + 'bw', 12, 12, '<rect width="12" height="12" fill="#FFFFFF"/><path d="M0,0 Q3,3 0,6 Q-2,9 0,12 H5 Q3,9 5,6 Q8,3 5,0 Z" fill="#2B2B33"/>', 'rotate(20)'); },
    honning: function (id) { return honeycomb(id + 'bw', 4.2, '#F7C548', '#C98A1B'); },
    blomstret: function (id) { var f = ''; for (var i = 0; i < 5; i++) { var t = i * 2 * Math.PI / 5; f += '<circle cx="' + (5 + 2.4 * Math.cos(t)).toFixed(2) + '" cy="' + (5 + 2.4 * Math.sin(t)).toFixed(2) + '" r="1.8" fill="#F4A7C3"/>'; }
      return pat(id + 'bw', 15, 15, '<rect width="15" height="15" fill="#E4F4D8"/>' + f + '<circle cx="5" cy="5" r="1.3" fill="#F2B51F"/><circle cx="12" cy="12" r="1.5" fill="#FFFFFF"/><circle cx="12" cy="12" r="0.6" fill="#F2B51F"/>'); },
    havblaa: function (id) { return pat(id + 'bw', 16, 8, '<rect width="16" height="8" fill="#2E7FC0"/><path d="M0,5 Q4,1 8,5 T16,5" fill="none" stroke="#9FDCF2" stroke-width="1.8"/>'); },
    regnbue: function (id) { return grad(id + 'bw', ['#E8483B', '#F28C28', '#F7C548', '#6FB04A', '#3E8FC2', '#8E62C9']); },
    pixel: function (id) { return pat(id + 'bw', 12, 12, '<rect width="12" height="12" fill="#5B3F9E"/><rect width="4" height="4" fill="#3CC2B4"/><rect x="8" y="4" width="4" height="4" fill="#F4A7C3"/><rect x="4" y="8" width="4" height="4" fill="#F7C548"/><rect x="4" y="0" width="4" height="4" fill="#7A5FC0"/>'); },
    jordbaer: function (id) { return pat(id + 'bw', 9, 9, '<rect width="9" height="9" fill="#E0393E"/><ellipse cx="2.2" cy="2.4" rx="0.8" ry="1.2" fill="#FCE38A"/><ellipse cx="6.7" cy="6.9" rx="0.8" ry="1.2" fill="#FCE38A"/>'); },
    hjerter: function (id) { return pat(id + 'bw', 12, 12, '<rect width="12" height="12" fill="#E85C7A"/><path d="' + heartPath(6, 6, 2.8) + '" fill="#FFFFFF"/>'); },
    kobber: function (id) { return grad(id + 'bw', ['#F6C29A', '#C8703C', '#E89A66', '#9A4F26'], true); }
  };
  function plainWing(fill, stroke) { return function () { return { fill: fill, stroke: stroke }; }; }
  function patWing(body, w, stroke) { return function (id) { return { defs: pat(id + 'wp', w, w, body), fill: 'url(#' + id + 'wp)', stroke: stroke }; }; }
  var WINGS = {
    lyseroed: plainWing('#FBE0EC', '#E79AB8'), mint: plainWing('#DDF5EA', '#7CC9A4'), lavendel: plainWing('#ECE4FA', '#A98ED8'), guld: plainWing('#FFF3C4', '#E2B93B'),
    prikker: patWing('<rect width="12" height="12" fill="#E6F4FC"/><circle cx="6" cy="6" r="2.4" fill="#86C5E8"/>', 12, '#86C5E8'),
    striber: patWing('<rect width="10" height="10" fill="#E6F4FC"/><rect width="10" height="4" fill="#BFE0F2"/>', 10, '#86C5E8'),
    hjerter: patWing('<rect width="16" height="16" fill="#FBE9F0"/><path d="' + heartPath(8, 8, 3.2) + '" fill="#E87CA2"/>', 16, '#E79AB8'),
    stjerner: patWing('<rect width="16" height="16" fill="#EAF0FB"/><path d="' + starPath(8, 8, 4) + '" fill="#F2C94C"/>', 16, '#8FA7D8'),
    regnbue: function (id) { return { defs: grad(id + 'wg', ['#F7A8A8', '#FCE38A', '#B8E8A8', '#A8D8F7', '#D3B8F2']), fill: 'url(#' + id + 'wg)', stroke: '#B79BD8' }; },
    glimmer: patWing('<rect width="14" height="14" fill="#F5FAFF"/><path d="' + starPath(4, 4, 2.6) + '" fill="#C9DDF2"/><circle cx="10.5" cy="10" r="1.2" fill="#9FC3E6"/>', 14, '#9FC3E6'),
    solnedgang: function (id) { return { defs: grad(id + 'wg', ['#FFE3A3', '#FFB38A', '#F78FA7'], true), fill: 'url(#' + id + 'wg)', stroke: '#E8897D' }; },
    flamme: function (id) { return { defs: grad(id + 'wg', ['#FFE57A', '#F7A23B', '#E2553A'], true), fill: 'url(#' + id + 'wg)', stroke: '#C24A2E' }; },
    mosaik: patWing('<rect width="12" height="12" fill="#3E8FC2"/><rect width="6" height="6" fill="#F2C94C"/><rect x="6" y="6" width="6" height="6" fill="#6FB04A"/><path d="M0 0H12V12H0Z" fill="none" stroke="#FFFFFF" stroke-width="1"/>', 12, '#2F6E9E'),
    krystal: function (id) { return { defs: grad(id + 'wg', ['#F3FBFF', '#BFE6F7', '#E6D8FA', '#F3FBFF']), fill: 'url(#' + id + 'wg)', stroke: '#8FB8D8' }; },
    nattehimmel: patWing('<rect width="14" height="14" fill="#2F3E7A"/><circle cx="4" cy="4" r="1.3" fill="#FFFFFF"/><circle cx="10" cy="9" r="0.9" fill="#F7C548"/>', 14, '#1F2A55'),
    soelv: function (id) { return { defs: grad(id + 'wg', ['#FFFFFF', '#D5DCE4', '#AEB8C4', '#E9EEF3'], true), fill: 'url(#' + id + 'wg)', stroke: '#7F8B99' }; },
    kobber: function (id) { return { defs: grad(id + 'wg', ['#FCDCC2', '#EBA676', '#CD7A47', '#F3BE97'], true), fill: 'url(#' + id + 'wg)', stroke: '#9A4F26' }; },
    blade: patWing('<rect width="16" height="16" fill="#C4E8A6"/><path d="M8,0 V16 M8,9 L2,3 M8,9 L14,3" fill="none" stroke="#6FB04A" stroke-width="1.4"/>', 16, '#4E9A3A'),
    regndraaber: patWing('<rect width="14" height="14" fill="#EAF6FD"/><path d="M4,1.5 Q7,5.5 7,7 A3,3 0 0 1 1,7 Q1,5.5 4,1.5 Z" fill="#6BB8E0"/><path d="M11,8.5 Q13,11 13,12 A2,2 0 0 1 9,12 Q9,11 11,8.5 Z" fill="#9FD3EE"/>', 14, '#5AA7D6'),
    nordlys: function (id) { return { defs: grad(id + 'wg', ['#C8F7D8', '#7DE0B5', '#8FA3EC', '#C7A4F0'], true), fill: 'url(#' + id + 'wg)', stroke: '#6E62B8' }; },
    boelger: patWing('<rect width="16" height="8" fill="#DDF1FB"/><path d="M0,5 Q4,1 8,5 T16,5" fill="none" stroke="#5AA7D6" stroke-width="1.8"/>', 16, '#3E8FC2'),
    pixel: function (id) {
      var px = function (x, y, c) { return '<rect x="' + x + '" y="' + y + '" width="2" height="2" fill="' + c + '"/>'; }, h = '';
      [[1, 0], [2, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [2, 3], [3, 3], [4, 3], [3, 4]].forEach(function (q) { h += px(3 + q[0] * 2, 3 + q[1] * 2, '#E8487A'); });
      return { defs: pat(id + 'wp', 22, 22, '<rect width="22" height="22" fill="#EDF7FF"/>' + h + px(16, 16, '#3CC2B4') + px(18, 18, '#3CC2B4') + px(18, 14, '#7A5FC0') + px(2, 18, '#F7C548')), fill: 'url(#' + id + 'wp)', stroke: '#7A5FC0' };
    },
    sommerfugl: patWing('<rect width="18" height="18" fill="#FBB54A"/><circle cx="6" cy="6" r="4.2" fill="#E8487A"/><circle cx="6" cy="6" r="2" fill="#3A2A55"/><circle cx="5.4" cy="5.3" r="0.8" fill="#FFFFFF"/><circle cx="14" cy="14" r="2.6" fill="#5A9FE0"/><circle cx="14" cy="14" r="1" fill="#FFFFFF"/>', 18, '#3A2A55'),
    konfetti: patWing('<rect width="18" height="18" fill="#FFFFFF"/><rect x="2" y="3" width="4" height="2" fill="#E85C7A" transform="rotate(30 4 4)"/><circle cx="12" cy="4" r="1.6" fill="#3E8FC2"/><rect x="10" y="11" width="4" height="2" fill="#6FB04A" transform="rotate(-40 12 12)"/><circle cx="4" cy="13" r="1.5" fill="#F2B51F"/><rect x="15" y="8" width="2" height="2" fill="#9B6FD0"/>', 18, '#9B6FD0'),
    honning: function (id) { return { defs: honeycomb(id + 'wp', 6, '#FFDE7A', '#E0A42A'), fill: 'url(#' + id + 'wp)', stroke: '#C98A1B' }; }
  };
  var TIPS = {
    hjerte: function (x, y) { return path(heartPath(x, y + 1, 7.5), '#E85C7A', { 'stroke-width': 3 }); },
    stjerne: function (x, y) { return path(starPath(x, y, 11), '#F7C548', { 'stroke-width': 3 }); },
    blomst: function (x, y) { var p = ''; for (var i = 0; i < 5; i++) { var a = i * 2 * Math.PI / 5; p += el('circle', { cx: (x + 6.5 * Math.cos(a)).toFixed(1), cy: (y + 6.5 * Math.sin(a)).toFixed(1), r: 5, fill: '#F4A7C3', stroke: C.out, 'stroke-width': 2 }); } return p + el('circle', { cx: x, cy: y, r: 4, fill: '#F7C548', stroke: C.out, 'stroke-width': 2 }); },
    diamant: function (x, y) { return path('M' + (x - 9) + ',' + (y - 3) + ' L' + (x - 4) + ',' + (y - 9) + ' L' + (x + 4) + ',' + (y - 9) + ' L' + (x + 9) + ',' + (y - 3) + ' L' + x + ',' + (y + 10) + ' Z', '#9FE3F2', { 'stroke-width': 3 }) + line('M' + (x - 9) + ',' + (y - 3) + ' H' + (x + 9), C.out, 1.5); },
    maane: function (x, y) { return '<g transform="translate(' + (x - 13) + ' ' + (y - 13) + ') scale(1.1)">' + path('M21,12.8 A9,9 0 1 1 11.2,3 A7,7 0 0 0 21,12.8 Z', '#FCE38A', { 'stroke-width': 2.7 }) + '</g>'; },
    regnbue: function (x, y, id) { return grad(id + 'tg', ['#F7A8A8', '#FCE38A', '#B8E8A8', '#A8D8F7', '#D3B8F2']) + el('circle', { cx: x, cy: y, r: 9, fill: 'url(#' + id + 'tg)', stroke: C.out, 'stroke-width': SW }); }
  };
  var HATS = {
    festhat: function (id) { return pat(id + 'fh', 10, 10, '<rect width="10" height="10" fill="#6BB8E0"/><rect width="10" height="4" fill="#F4A7C3"/>', 'rotate(30)') +
      '<g transform="rotate(-8 120 44)">' + path('M98,48 L120,-6 L142,48 Q120,54 98,48 Z', 'url(#' + id + 'fh)') + el('circle', { cx: 120, cy: -8, r: 7, fill: '#F7C548', stroke: C.out, 'stroke-width': 3 }) + '</g>'; },
    krone: function () { return path('M84,52 L80,14 L100,32 L120,8 L140,32 L160,14 L156,52 Q120,60 84,52 Z', '#F2C94C') +
      el('circle', { cx: 120, cy: 40, r: 5, fill: '#D9463B', stroke: C.out, 'stroke-width': 2 }) + el('circle', { cx: 99, cy: 44, r: 4, fill: '#3E8FC2', stroke: C.out, 'stroke-width': 2 }) + el('circle', { cx: 141, cy: 44, r: 4, fill: '#6FB04A', stroke: C.out, 'stroke-width': 2 }); },
    blomsterkrans: function () { var p = line('M66,64 Q120,30 174,64', '#6FB04A', 5), cols = ['#F4A7C3', '#F7C548', '#FFFFFF', '#9B6FD0', '#F28C28', '#F4A7C3', '#F7C548'];
      for (var i = 0; i < 7; i++) { var t = i / 6, x = 66 + 108 * t, y = 64 - 68 * t * (1 - t); p += el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 8, fill: cols[i], stroke: C.out, 'stroke-width': 2.5 }) + el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 2.5, fill: '#E8B923' }); }
      return p; },
    hue: function () { return path('M60,76 C58,22 182,22 180,76 Z', '#D9463B') + path('M58,70 Q120,58 182,70 L182,84 Q120,72 58,84 Z', '#B5372E') +
      line('M80,64 L80,76 M100,60 L100,72 M120,58 L120,70 M140,60 L140,72 M160,64 L160,76', '#8F2B24', 2) + el('circle', { cx: 120, cy: 22, r: 11, fill: '#FFFFFF', stroke: C.out, 'stroke-width': 3 }); },
    kasket: function () { return path('M62,72 C60,24 180,24 178,72 Q120,62 62,72 Z', '#3E8FC2') + path('M150,66 Q196,62 214,78 Q180,84 148,76 Z', '#2F6E9E') + el('circle', { cx: 120, cy: 30, r: 4, fill: '#2F6E9E', stroke: C.out, 'stroke-width': 2 }); },
    hoejhat: function () { return el('ellipse', { cx: 120, cy: 50, rx: 50, ry: 9, fill: '#3A3A44', stroke: C.out, 'stroke-width': SW }) + path('M92,48 L94,0 Q120,-6 146,0 L148,48 Q120,54 92,48 Z', '#3A3A44') + path('M93,38 Q120,44 147,38 L147,46 Q120,52 93,46 Z', '#D9463B', { 'stroke-width': 2.5 }); },
    baret: function () { return '<g transform="rotate(-10 120 50)">' + el('ellipse', { cx: 116, cy: 46, rx: 56, ry: 16, fill: '#9B2D3F', stroke: C.out, 'stroke-width': SW }) + line('M116,30 L118,22', C.out, 4) + '</g>'; },
    pandebaand: function () { return path('M57,74 Q120,52 183,74 L183,88 Q120,66 57,88 Z', '#6FB04A') + path(starPath(120, 70, 9), '#F7C548', { 'stroke-width': 2.5 }); },
    studenterhue: function () { return path('M62,64 C60,14 180,14 178,64 Q120,52 62,64 Z', '#FFFFFF') + path('M61,62 Q120,48 179,62 L179,78 Q120,64 61,78 Z', '#B5372E') +
      path('M88,76 Q120,64 152,76 Q120,92 88,76 Z', '#2B2B33') + el('circle', { cx: 120, cy: 62, r: 5.5, fill: '#D9463B', stroke: C.out, 'stroke-width': 2 }); },
    kokkehue: function () { return path('M84,58 L84,40 C70,36 68,10 92,12 C96,-4 144,-4 148,12 C172,10 170,36 156,40 L156,58 Q120,64 84,58 Z', '#FFFFFF') + line('M86,48 Q120,54 154,48', '#D8D2C4', 2.5); },
    rumhjelm: function () { return el('ellipse', { cx: 120, cy: 92, rx: 82, ry: 80, fill: '#CFE8F5', 'fill-opacity': 0.1, stroke: '#8FB8D8', 'stroke-width': 5 }) + line('M70,48 Q84,30 104,24', '#FFFFFF', 5) + el('rect', { x: 104, y: 6, width: 32, height: 10, rx: 4, fill: '#B9BEC6', stroke: C.out, 'stroke-width': 2.5 }); },
    laurbaerkrans: function () { var p = ''; for (var i = 0; i < 6; i++) { var t = i / 5, x = 70 + 100 * t, y = 62 - 26 * Math.sin(Math.PI * t); p += el('ellipse', { cx: x.toFixed(1), cy: y.toFixed(1), rx: 11, ry: 6, fill: '#6FB04A', stroke: '#3F7F34', 'stroke-width': 2, transform: 'rotate(' + (t < 0.5 ? -35 : 35) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')' }); } return line('M66,66 Q120,24 174,66', '#3F7F34', 3) + p; },
    pandelampe: function () { return path('M60,70 Q120,52 180,70 L180,82 Q120,64 60,82 Z', '#2B2B33') + el('rect', { x: 106, y: 52, width: 28, height: 22, rx: 6, fill: '#B9BEC6', stroke: C.out, 'stroke-width': SW }) +
      el('circle', { cx: 120, cy: 63, r: 7, fill: '#FFE57A', stroke: C.out, 'stroke-width': 2 }) + path('M112,52 L96,30 L144,30 L128,52 Z', '#FFF3B0', { stroke: 'none', opacity: 0.55 }); },
    vikingehjelm: function () { return path('M62,76 C60,24 180,24 178,76 Z', '#AEB8C4') + path('M60,70 Q120,58 180,70 L180,82 Q120,70 60,82 Z', '#8B5A2B') +
      path('M116,28 L124,28 L124,72 L116,72 Z', '#7F8B99', { 'stroke-width': 2.5 }) + el('circle', { cx: 80, cy: 76, r: 3, fill: '#E8C35A', stroke: C.out, 'stroke-width': 1.5 }) + el('circle', { cx: 160, cy: 76, r: 3, fill: '#E8C35A', stroke: C.out, 'stroke-width': 1.5 }) + line('M86,44 Q120,34 154,44', '#FFFFFF', 3); },
    troldmandshat: function () { return '<g transform="rotate(-6 120 50)">' + el('ellipse', { cx: 120, cy: 56, rx: 60, ry: 11, fill: '#5B3F9E', stroke: C.out, 'stroke-width': SW }) +
      path('M84,54 Q100,30 112,4 Q118,-14 136,-22 Q128,-4 134,14 Q144,36 156,54 Q120,64 84,54 Z', '#6E50B8') +
      path(starPath(118, 30, 8), '#F7C548', { 'stroke-width': 2.5 }) + el('circle', { cx: 136, cy: 12, r: 3.5, fill: '#FFFFFF', stroke: 'none' }) + el('circle', { cx: 104, cy: 46, r: 3, fill: '#FFFFFF', stroke: 'none' }) + '</g>'; },
    sloejfe: function () { return path('M120,40 Q96,20 96,40 Q96,58 120,44 Z', '#F4A7C3') + path('M120,40 Q144,20 144,40 Q144,58 120,44 Z', '#F4A7C3') + el('circle', { cx: 120, cy: 42, r: 6, fill: '#E87CA2', stroke: C.out, 'stroke-width': 3 }); },
    ridderhjelm: function () { // a steel helmet with a bristly blue crest and cheek guards
      var crest = 'M98,32 Q96,4 120,-6 Q144,4 142,32 Z', bristles = '';
      for (var i = 0; i < 7; i++) { var t = -0.9 + i * 0.3; bristles += line('M' + (120 + 20 * Math.sin(t)).toFixed(1) + ',' + (14 - 18 * Math.cos(t)).toFixed(1) + ' L' + (120 + 9 * Math.sin(t)).toFixed(1) + ',' + (22 - 8 * Math.cos(t)).toFixed(1), '#2F6E9E', 2); }
      return path(crest, '#3E8FC2') + bristles +
        path('M59,112 Q54,64 66,44 Q90,22 120,22 Q150,22 174,44 Q186,64 181,112 Q172,108 170,96 Q170,80 164,76 Q120,64 76,76 Q70,80 70,96 Q68,108 59,112 Z', '#C9D1DA') +
        path('M62,72 Q120,58 178,72 L178,82 Q120,68 62,82 Z', '#9AA6B2', { 'stroke-width': 3 }) +
        line('M120,24 L120,64', '#9AA6B2', 3) + line('M78,50 Q92,34 110,30', '#FFFFFF', 4) +
        el('circle', { cx: 78, cy: 74, r: 3, fill: '#E8C35A', stroke: C.out, 'stroke-width': 1.5 }) + el('circle', { cx: 120, cy: 68, r: 3, fill: '#E8C35A', stroke: C.out, 'stroke-width': 1.5 }) + el('circle', { cx: 162, cy: 74, r: 3, fill: '#E8C35A', stroke: C.out, 'stroke-width': 1.5 });
    },
    straahat: function (id) { // a wide straw sun hat with a red ribbon and a daisy
      return pat(id + 'st', 6, 6, '<rect width="6" height="6" fill="#EBC86A"/><path d="M0,3 H6 M3,0 V6" stroke="#CFA445" stroke-width="1"/>', 'rotate(45)') +
        el('ellipse', { cx: 120, cy: 58, rx: 80, ry: 16, fill: 'url(#' + id + 'st)', stroke: C.out, 'stroke-width': SW }) +
        path('M80,58 C78,14 162,14 160,58 Q120,66 80,58 Z', 'url(#' + id + 'st)') +
        path('M80,46 Q120,54 160,46 L160,57 Q120,65 80,57 Z', '#D9463B', { 'stroke-width': 3 }) +
        TIPS.blomst(146, 50);
    },
    fjerhat: function () { // a green felt hat with a long red feather
      return path('M150,48 C150,22 172,0 198,-14 C192,8 180,30 160,50 Z', '#D9463B', { 'stroke-width': 3 }) +
        line('M156,50 Q172,18 196,-10', '#8F2B24', 2) + line('M168,24 L176,27 M176,13 L184,16', '#FFFFFF', 2) +
        path('M84,58 C82,30 94,18 120,20 C146,18 158,30 156,58 Z', '#4E8A3E') +
        line('M102,24 Q120,32 138,24', '#2F5E28', 2.5) +
        path('M86,46 Q120,54 154,46 L155,57 Q120,65 85,57 Z', '#2F5E28', { 'stroke-width': 3 }) +
        path('M58,72 Q64,56 86,56 Q120,64 154,56 Q176,56 182,72 Q166,64 152,66 Q120,72 88,66 Q74,64 58,72 Z', '#4E8A3E') +
        el('circle', { cx: 150, cy: 52, r: 4, fill: '#E8C35A', stroke: C.out, 'stroke-width': 2 });
    },
    propelkasket: function (id) { // a beanie in four colours with a propeller on top
      var dome = 'M64,72 C62,18 178,18 176,72 Q120,60 64,72 Z';
      return '<defs><clipPath id="' + id + 'pk"><path d="' + dome + '"/></clipPath></defs>' + path(dome, '#D9463B') +
        '<g clip-path="url(#' + id + 'pk)">' + path('M120,20 L84,80 L104,80 Z', '#F7C548', { 'stroke-width': 0 }) + path('M120,20 L136,80 L156,80 Z', '#3E8FC2', { 'stroke-width': 0 }) +
          path('M120,20 L176,40 L180,80 L156,80 Z', '#6FB04A', { 'stroke-width': 0 }) + path('M120,20 L60,40 L60,80 L84,80 Z', '#3E8FC2', { 'stroke-width': 0 }) + '</g>' + path(dome, 'none') +
        line('M120,22 L120,-4', C.out, 4) +
        path('M120,-6 Q104,-16 92,-8 Q104,0 120,-6 Z', '#F7C548', { 'stroke-width': 2.5 }) + path('M120,-6 Q136,4 148,-4 Q136,-12 120,-6 Z', '#3E8FC2', { 'stroke-width': 2.5 }) +
        el('circle', { cx: 120, cy: -6, r: 4.5, fill: '#D9463B', stroke: C.out, 'stroke-width': 2.5 }) + el('circle', { cx: 120, cy: 22, r: 4, fill: '#F7C548', stroke: C.out, 'stroke-width': 2 });
    },
    safarihat: function (id) { // a bush hat with one side of the brim pinned up and a leopard band
      return pat(id + 'sf', 12, 10, '<rect width="12" height="10" fill="#E8C27A"/><ellipse cx="3" cy="3" rx="2" ry="1.5" fill="#6B4426"/><ellipse cx="9" cy="7.5" rx="1.8" ry="1.3" fill="#6B4426"/>') +
        path('M84,58 Q60,58 52,28 Q70,34 86,46 Z', '#B39A62') +
        path('M70,62 Q120,52 170,57 Q192,60 196,70 Q166,76 120,72 Q86,72 70,68 Z', '#B39A62') +
        path('M80,60 C78,18 162,18 160,60 Q120,68 80,60 Z', '#C9B27C') +
        path('M80,48 Q120,56 160,48 L160,59 Q120,67 80,59 Z', 'url(#' + id + 'sf)', { 'stroke-width': 3 }) +
        line('M120,24 Q116,38 120,46', '#A88E57', 2.5) +
        el('circle', { cx: 72, cy: 48, r: 5, fill: '#E8C35A', stroke: C.out, 'stroke-width': 2 });
    },
    pixelkrone: function () { // a crown built from square pixels, with pixel gems
      var P = 8, x0 = 84, y0 = 22, rows = ['X...X...X', 'XX.XXX.XX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX'], fat = '', fill = '';
      var col = { '2,3': '#3E8FC2', '4,3': '#D9463B', '6,3': '#6FB04A' };
      rows.forEach(function (r, y) { r.split('').forEach(function (ch, x) {
        if (ch !== 'X') return;
        var o = { x: x0 + x * P, y: y0 + y * P, width: P, height: P };
        fat += el('rect', Object.assign({ fill: C.out, stroke: C.out, 'stroke-width': SW * 1.4, 'stroke-linejoin': 'miter' }, o));
        fill += el('rect', Object.assign({ fill: col[x + ',' + y] || (y === 0 ? '#FFE58A' : y === 4 ? '#D9A72E' : '#F2C94C'), stroke: '#C9962E', 'stroke-width': 0.8 }, o));
      }); });
      return fat + fill + el('rect', { x: x0 + 2, y: y0 + 2 * P + 2, width: 3, height: 3, fill: '#FFFFFF' });
    },
    bowlerhat: function () { // a round bowler hat, slightly tilted
      return '<g transform="rotate(8 120 56)">' +
        path('M66,58 Q64,48 76,52 Q120,62 164,52 Q176,48 174,58 Q120,74 66,58 Z', '#4B362A') +
        path('M82,56 C80,4 160,4 158,56 Q120,64 82,56 Z', '#4B362A') +
        path('M82,44 Q120,52 158,44 L158,55 Q120,63 82,55 Z', '#8A6A4E', { 'stroke-width': 3 }) +
        line('M96,36 Q101,26 111,22', '#8A6E5A', 4) + '</g>';
    },
    tankeboble: function () { // a small thought bubble with three dots
      return el('circle', { cx: 116, cy: 34, r: 3.5, fill: '#FFFFFF', stroke: C.out, 'stroke-width': 2.5 }) +
        el('circle', { cx: 110, cy: 22, r: 5, fill: '#FFFFFF', stroke: C.out, 'stroke-width': 2.5 }) +
        path(cloudPath(120, -6, 52, 30), '#FFFFFF', { 'stroke-width': 3 }) +
        el('circle', { cx: 108, cy: -4, r: 3.4, fill: C.out }) + el('circle', { cx: 120, cy: -4, r: 3.4, fill: C.out }) + el('circle', { cx: 132, cy: -4, r: 3.4, fill: C.out });
    },
    tandhjulshat: function () { // a copper headband with three gears
      return gear(92, 46, 14, 8, '#E2B13C') + gear(148, 44, 15, 8, '#C8703C') + gear(120, 26, 21, 10, '#B9BEC6', 3) +
        path('M58,74 Q120,50 182,74 L182,88 Q120,64 58,88 Z', '#9A4F26') +
        el('circle', { cx: 80, cy: 72, r: 2.5, fill: '#F6C29A' }) + el('circle', { cx: 120, cy: 64, r: 2.5, fill: '#F6C29A' }) + el('circle', { cx: 160, cy: 72, r: 2.5, fill: '#F6C29A' });
    }
  };
  var EXTRAS = { // layer: 'front' (on the body), 'face' (on the face), 'prop' (next to Bob)
    medalje: { layer: 'front', draw: function () { return path('M108,170 L114,198 L126,198 L132,170', '#3E8FC2', { 'stroke-width': 2.5 }) + el('circle', { cx: 120, cy: 206, r: 12, fill: '#F2C94C', stroke: C.out, 'stroke-width': 3 }) + path(starPath(120, 206, 6), '#FFF3C4', { 'stroke-width': 1.5 }); } },
    solbriller: { layer: 'face', draw: function () { return line('M60,104 L180,104', '#2B2B33', 5) + path('M72,96 h44 v12 q0,16 -22,16 q-22,0 -22,-16 Z', '#2B2B33', { 'stroke-width': 3 }) + path('M124,96 h44 v12 q0,16 -22,16 q-22,0 -22,-16 Z', '#2B2B33', { 'stroke-width': 3 }) + line('M80,102 Q86,99 92,100', '#FFFFFF', 2.5) + line('M132,102 Q138,99 144,100', '#FFFFFF', 2.5); } },
    briller: { layer: 'face', draw: function () { return el('circle', { cx: 96, cy: 110, r: 24, fill: 'none', stroke: '#8B5A2B', 'stroke-width': 4 }) + el('circle', { cx: 144, cy: 110, r: 24, fill: 'none', stroke: '#8B5A2B', 'stroke-width': 4 }) + line('M120,108 L120,108', '#8B5A2B', 4) + line('M58,104 L72,108 M182,104 L168,108', '#8B5A2B', 4); } },
    fregner: { layer: 'face', draw: function () { var p = ''; [[72, 124], [79, 128], [86, 123], [154, 123], [161, 128], [168, 124]].forEach(function (q) { p += el('circle', { cx: q[0], cy: q[1], r: 1.8, fill: '#B07A3A' }); }); return p; } },
    toerklaede: { layer: 'front', draw: function (id) { return pat(id + 'tk', 12, 12, '<rect width="12" height="12" fill="#D9463B"/><rect width="12" height="5" fill="#FFFFFF"/>') +
      path('M80,152 Q120,174 160,152 L160,170 Q120,190 80,170 Z', 'url(#' + id + 'tk)') + path('M138,172 L132,222 L150,224 L154,170 Z', 'url(#' + id + 'tk)'); } },
    bog: { layer: 'prop', draw: function () { return path('M30,214 L58,208 L62,246 L34,252 Z', '#3E8FC2') + line('M34,218 L58,213', '#FFFFFF', 2) + line('M58,208 L62,246', '#FFFFFF', 3); } },
    pokal: { layer: 'prop', draw: function () { return path('M170,206 h36 q0,26 -18,30 q-18,-4 -18,-30 Z', '#F2C94C') + path('M170,212 q-12,0 -10,10 q2,8 12,6 M206,212 q12,0 10,10 q-2,8 -12,6', 'none', { 'stroke-width': 3 }) +
      path('M184,236 h8 v10 h-8 Z', '#E8B923', { 'stroke-width': 2.5 }) + path('M176,246 h24 v8 h-24 Z', '#8B5A2B', { 'stroke-width': 2.5 }) + path(starPath(188, 218, 6), '#FFF3C4', { 'stroke-width': 1.5 }); } },
    puslebrik: { layer: 'front', draw: function () { return path('M104,198 h10 a6,6 0 1 1 12,0 h10 v10 a6,6 0 1 1 0,12 v10 h-10 a6,6 0 1 0 -12,0 h-10 Z', '#6BB8E0', { 'stroke-width': 3 }); } },
    ballon: { layer: 'prop', draw: function () { return line('M168,232 Q196,180 204,100', C.out, 1.8) + el('ellipse', { cx: 206, cy: 74, rx: 22, ry: 27, fill: '#D9463B', stroke: C.out, 'stroke-width': SW }) + path('M202,100 L210,100 L206,94 Z', '#D9463B', { 'stroke-width': 2 }) + line('M196,62 Q199,54 206,52', '#FFFFFF', 3); } }
  };

  /* ---------- outfits ---------- */
  var OUTFITS = {
    none: {},
    bag: {
      front: function () {
        return line('M90,168 L156,236', C.blueDark, 5) +
               path('M146,226 h28 a4,4 0 0 1 4,4 v20 a6,6 0 0 1 -6,6 h-24 a6,6 0 0 1 -6,-6 v-20 a4,4 0 0 1 4,-4 Z', C.blue) +
               path('M144,232 Q160,242 180,232', 'none', { 'stroke-width': 2.5 });
      }
    },
    cape: { // Regnestorm
      back: function () { return path('M84,160 Q54,224 58,274 Q90,262 120,270 Q150,262 182,274 Q186,224 156,160 Z', C.blueDark); },
      front: function () { return path('M124,184 L108,208 L119,208 L113,230 L133,201 L122,201 L129,184 Z', C.bolt, { 'stroke-width': 2.5 }); },
      neck: function () {
        return path('M120,172 L105,164 L105,181 Z', C.blue, { 'stroke-width': 3 }) +
               path('M120,172 L135,164 L135,181 Z', C.blue, { 'stroke-width': 3 }) +
               el('circle', { cx: 120, cy: 172, r: 5, fill: C.blueDark, stroke: C.out, 'stroke-width': 3 });
      }
    },
    explorer: { // Ordjægeren
      hideAntennae: true,
      hat: function () {
        return el('ellipse', { cx: 120, cy: 62, rx: 75, ry: 13, fill: C.khaki, stroke: C.out, 'stroke-width': SW }) +
               path('M62,59 C62,4 178,4 178,59 Q120,67 62,59 Z', C.khaki) +
               path('M63,47 Q120,39 177,47 L178,58 Q120,66 62,58 Z', C.band) +
               el('circle', { cx: 120, cy: 14, r: 4, fill: C.khaki, stroke: C.out, 'stroke-width': 3 });
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return '<defs><pattern id="' + id + 'm" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
                 '<path d="M0,0 V7 M0,0 H7" stroke="#7A5A3A" stroke-width="1.3"/></pattern></defs>' +
               limb('M160,282 L195,122', 5, C.wood) +
               el('ellipse', { cx: 203, cy: 94, rx: 21, ry: 28, transform: 'rotate(18 203 94)', fill: C.white, opacity: 0.6 }) +
               el('ellipse', { cx: 203, cy: 94, rx: 21, ry: 28, transform: 'rotate(18 203 94)', fill: 'url(#' + id + 'm)', stroke: C.wood, 'stroke-width': 4.5 });
      }
    },
    lab: { // Laboratoriet
      front: function () {
        return path('M80,170 Q64,218 74,264 Q120,274 166,264 Q176,218 160,170 Q140,162 120,184 Q100,162 80,170 Z', C.white) +
               line('M120,184 L120,270', C.out, 2.5) +
               path('M98,168 L110,200 L120,184', 'none', { 'stroke-width': 2.5 }) +
               path('M142,168 L130,200 L120,184', 'none', { 'stroke-width': 2.5 }) +
               path('M86,230 h20 v14 a3,3 0 0 1 -3,3 h-14 a3,3 0 0 1 -3,-3 Z', C.white, { 'stroke-width': 2.5 }) +
               path('M134,230 h20 v14 a3,3 0 0 1 -3,3 h-14 a3,3 0 0 1 -3,-3 Z', C.white, { 'stroke-width': 2.5 });
      },
      eyewear: function () {
        return line('M56,108 L184,108', '#5E6A73', 7) +
               el('rect', { x: 72, y: 86, width: 46, height: 44, rx: 16, fill: '#CFE8F5', 'fill-opacity': 0.45, stroke: '#6E7B85', 'stroke-width': 5 }) +
               el('rect', { x: 122, y: 86, width: 46, height: 44, rx: 16, fill: '#CFE8F5', 'fill-opacity': 0.45, stroke: '#6E7B85', 'stroke-width': 5 }) +
               line('M118,106 L122,106', '#6E7B85', 5) +
               line('M80,95 Q86,91 92,92', C.white, 2.5) + line('M130,95 Q136,91 142,92', C.white, 2.5);
      }
    },
    pilot: { // Verdensrejsen
      hat: function () {
        return path('M56,98 C52,30 188,30 184,98 L186,136 Q180,148 170,140 L168,106 Q120,82 72,106 L70,140 Q60,148 54,136 Z', C.leather) +
               line('M58,70 Q120,50 182,70', C.leatherDark, 6) +
               el('circle', { cx: 100, cy: 60, r: 14, fill: '#9FD3EE', stroke: C.leatherDark, 'stroke-width': 5 }) +
               el('circle', { cx: 140, cy: 60, r: 14, fill: '#9FD3EE', stroke: C.leatherDark, 'stroke-width': 5 }) +
               line('M93,55 Q97,51 102,51', C.white, 2.5) + line('M133,55 Q137,51 142,51', C.white, 2.5);
      },
      neck: function (id) {
        var stripes = '<defs><pattern id="' + id + 's" width="10" height="10" patternUnits="userSpaceOnUse">' +
          '<rect width="10" height="10" fill="' + C.white + '"/><rect width="5" height="10" fill="' + C.red + '"/></pattern></defs>';
        return stripes +
          path('M140,170 L148,212 L162,207 L153,167 Z', 'url(#' + id + 's)') +
          path('M82,154 Q120,170 158,154 L158,172 Q120,188 82,172 Z', 'url(#' + id + 's)');
      },
      hideCollar: true
    },
    schoolbag: { // Ordbroen
      noBackInHead: true,
      back: function () {
        return path('M50,176 q0,-12 12,-12 h22 q10,0 10,12 v62 q0,10 -10,10 h-24 q-10,0 -10,-10 Z', C.blueDark) +
               path('M54,206 h34 v22 q0,6 -6,6 h-22 q-6,0 -6,-6 Z', C.blue, { 'stroke-width': 2.5 }) +
               line('M60,186 h26', C.out, 2.5);
      },
      front: function () { return line('M88,170 Q84,210 90,246', C.blueDark, 6) + line('M152,170 Q156,210 150,246', C.blueDark, 6); },
      neck: function (id) {
        return '<defs><pattern id="' + id + 'k" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
                 '<rect width="12" height="12" fill="' + C.blue + '"/><rect width="5" height="12" fill="#F2D35E"/></pattern></defs>' +
               path('M82,156 Q120,172 158,156 L156,170 L120,212 L84,170 Z', 'url(#' + id + 'k)') +
               el('circle', { cx: 120, cy: 176, r: 7, fill: C.blue, stroke: C.out, 'stroke-width': 3 });
      },
      hideCollar: true
    },
    timetravel: { // Tidsmaskinen
      hat: function () {
        return path('M60,78 C58,22 182,22 180,78 Q120,66 60,78 Z', '#D9A441') +
               path('M54,76 Q120,62 186,76 L184,86 Q120,74 56,86 Z', '#B98325') +
               line('M120,30 L120,70', '#B98325', 3) +
               line('M62,62 Q120,46 178,62', '#7A5222', 7) +
               el('circle', { cx: 98, cy: 56, r: 15, fill: '#9FD3EE', stroke: '#8A6326', 'stroke-width': 6 }) +
               el('circle', { cx: 142, cy: 56, r: 15, fill: '#9FD3EE', stroke: '#8A6326', 'stroke-width': 6 }) +
               line('M91,51 Q95,47 100,47', C.white, 2.5) + line('M135,51 Q139,47 144,47', C.white, 2.5);
      },
      front: function () {
        var watch = 'M140,224';
        return line('M96,172 Q112,200 136,212', '#C9962E', 3) + line('M98,172 Q114,196 136,210', '#E8C35A', 1.5) +
               el('circle', { cx: 142, cy: 226, r: 17, fill: '#E8C35A', stroke: C.out, 'stroke-width': SW }) +
               el('circle', { cx: 142, cy: 226, r: 12, fill: C.white, stroke: '#B98325', 'stroke-width': 2 }) +
               line('M142,226 L142,218 M142,226 L148,229', C.out, 2) +
               el('rect', { x: 139, y: 205, width: 6, height: 5, rx: 1.5, fill: '#E8C35A', stroke: C.out, 'stroke-width': 2 });
      }
    },
    thinker: { // Tankespind: a thinking cap with a light bulb, and a pencil
      hideAntennae: true,
      hat: function () {
        return path('M60,78 C56,22 184,22 180,78 Q120,64 60,78 Z', '#7A5FC0') +
               path('M58,74 Q120,60 182,74 L182,86 Q120,72 58,86 Z', '#5B3F9E') +
               line('M84,40 Q120,26 156,40', '#9C86D8', 4) +
               path('M109,16 C109,-1 131,-1 131,16 C131,22 126,24 126,29 L114,29 C114,24 109,22 109,16 Z', '#FFE57A') +
               el('rect', { x: 113, y: 28, width: 14, height: 8, rx: 2, fill: '#B9BEC6', stroke: C.out, 'stroke-width': 3 }) +
               line('M116,15 Q120,21 124,15', '#E0A21A', 2) +
               line('M100,12 L92,10 M140,12 L148,10 M103,5 L98,1 M137,5 L142,1', '#F2B51F', 4);
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return '<g transform="rotate(18 186 200)">' + el('rect', { x: 179, y: 150, width: 14, height: 76, rx: 2, fill: '#F7C548', stroke: C.out, 'stroke-width': 3 }) +
               path('M179,226 L186,246 L193,226 Z', '#F3D9B1', { 'stroke-width': 3 }) + path('M183.5,238 L186,246 L188.5,238 Z', C.out, { 'stroke-width': 1 }) +
               el('rect', { x: 179, y: 142, width: 14, height: 10, rx: 2, fill: '#F4A7C3', stroke: C.out, 'stroke-width': 3 }) + '</g>';
      }
    },
    astronaut: { // Raketbanen: a space helmet and a white suit with a mission patch
      hideAntennae: true,
      hat: function () {
        return el('ellipse', { cx: 120, cy: 96, rx: 80, ry: 77, fill: '#DDF1FB', 'fill-opacity': 0.1, stroke: '#E8EDF2', 'stroke-width': 9 }) +
               el('ellipse', { cx: 120, cy: 96, rx: 80, ry: 77, fill: 'none', stroke: C.out, 'stroke-width': 3 }) +
               line('M66,56 Q80,36 102,28', '#FFFFFF', 6);
      },
      front: function () {
        return path('M78,170 Q66,218 76,262 Q120,272 164,262 Q174,218 162,170 Q120,186 78,170 Z', '#F2F4F7') +
               el('circle', { cx: 140, cy: 206, r: 12, fill: '#3E8FC2', stroke: C.out, 'stroke-width': 2.5 }) + path('M134,210 L140,198 L146,210 Z', '#FFFFFF', { 'stroke-width': 1.5 }) +
               line('M90,232 L108,232', '#D9463B', 5) + line('M90,242 L108,242', '#3E8FC2', 5);
      },
      hideCollar: true
    },
    museum: { // Mysteriet på museet: a flat cap and a torch
      hat: function () {
        return path('M60,74 C58,30 182,30 180,74 Q120,62 60,74 Z', '#7A6A55') + path('M150,64 Q190,62 206,76 Q178,82 148,74 Z', '#5E5040') +
               line('M74,52 Q120,40 166,52', '#8E7E68', 3) + el('circle', { cx: 120, cy: 36, r: 4, fill: '#5E5040', stroke: C.out, 'stroke-width': 2 });
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return '<g transform="rotate(35 180 228)">' + path('M180,166 L150,96 L210,96 Z', '#FFF3B0', { stroke: 'none', opacity: 0.6 }) +
               el('rect', { x: 172, y: 176, width: 16, height: 52, rx: 4, fill: '#3E8FC2', stroke: C.out, 'stroke-width': 3 }) +
               el('rect', { x: 168, y: 164, width: 24, height: 14, rx: 3, fill: '#B9BEC6', stroke: C.out, 'stroke-width': 3 }) + '</g>';
      }
    },
    caver: { // Labyrinten: a helmet with a head lamp, and a rope over the shoulder
      hideAntennae: true,
      hat: function () {
        return path('M58,78 C56,20 184,20 182,78 Z', '#E8B923') + path('M50,76 Q120,62 190,76 L188,86 Q120,74 52,86 Z', '#C9962E') +
               line('M120,26 L120,58', '#C9962E', 4) +
               el('rect', { x: 104, y: 40, width: 32, height: 24, rx: 7, fill: '#B9BEC6', stroke: C.out, 'stroke-width': SW }) +
               el('circle', { cx: 120, cy: 52, r: 8, fill: '#FFF3B0', stroke: C.out, 'stroke-width': 2.5 }) +
               line('M120,40 L120,30 M108,42 L101,34 M132,42 L139,34', '#F2B51F', 3);
      },
      front: function () {
        return path('M86,166 Q120,206 158,236', 'none', { stroke: '#B07A3A', 'stroke-width': 7, 'stroke-linecap': 'round' }) +
               el('ellipse', { cx: 154, cy: 232, rx: 15, ry: 11, fill: 'none', stroke: '#B07A3A', 'stroke-width': 6 }) +
               el('ellipse', { cx: 154, cy: 232, rx: 8, ry: 5, fill: 'none', stroke: '#8B5A2B', 'stroke-width': 3 });
      }
    },
    puzzler: { // Gådehuset: the puzzle master's cape with question marks
      back: function (id) {
        return path('M84,160 Q52,224 56,276 Q90,264 120,272 Q150,264 184,276 Q188,224 156,160 Z', '#6E50B8') +
               '<text x="64" y="270" font-size="24" font-weight="800" fill="#F7C548" font-family="system-ui,sans-serif" transform="rotate(-12 64 270)">?</text>' +
               '<text x="162" y="270" font-size="24" font-weight="800" fill="#F7C548" font-family="system-ui,sans-serif" transform="rotate(12 162 270)">?</text>';
      },
      neck: function () {
        return path('M82,154 Q120,172 158,154 L156,170 Q120,186 84,170 Z', '#5B3F9E') +
               el('circle', { cx: 120, cy: 172, r: 8, fill: '#F2C94C', stroke: C.out, 'stroke-width': 3 });
      },
      front: function () {
        return el('circle', { cx: 120, cy: 214, r: 15, fill: '#FFFFFF', stroke: C.out, 'stroke-width': 3 }) +
               '<text x="120" y="223" text-anchor="middle" font-size="24" font-weight="800" fill="#6E50B8" font-family="system-ui,sans-serif">?</text>';
      },
      hideCollar: true
    },
    detective: { // Netdetektiven
      front: function (id) {
        return '<defs><pattern id="' + id + 'p" width="12" height="12" patternUnits="userSpaceOnUse">' +
                 '<rect width="12" height="12" fill="#A47C52"/><path d="M0,6 H12 M6,0 V12" stroke="#7A5A3A" stroke-width="2"/></pattern></defs>' +
               path('M78,164 Q120,182 162,164 Q178,186 172,212 Q120,226 68,212 Q62,186 78,164 Z', 'url(#' + id + 'p)');
      },
      hat: function (id) {
        return '<defs><pattern id="' + id + 'q" width="12" height="12" patternUnits="userSpaceOnUse">' +
                 '<rect width="12" height="12" fill="#A47C52"/><path d="M0,6 H12 M6,0 V12" stroke="#7A5A3A" stroke-width="2"/></pattern></defs>' +
               path('M58,74 C54,18 186,18 182,74 Q120,62 58,74 Z', 'url(#' + id + 'q)') +
               path('M150,66 Q186,62 204,80 Q182,84 150,76 Z', 'url(#' + id + 'q)') +
               path('M90,66 Q54,62 36,80 Q58,84 90,76 Z', 'url(#' + id + 'q)') +
               path('M112,28 Q120,14 128,28 Z', '#A47C52', { 'stroke-width': 2.5 }) +
               el('circle', { cx: 120, cy: 24, r: 4.5, fill: '#7A5A3A', stroke: C.out, 'stroke-width': 2.5 });
      },
      hideAntennae: true,
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return limb('M168,232 L184,196', 6, '#8B5A2B') +
               el('circle', { cx: 194, cy: 176, r: 20, fill: '#CFE8F5', 'fill-opacity': 0.6, stroke: '#6E7B85', 'stroke-width': 6 }) +
               line('M184,168 Q190,162 198,163', C.white, 3);
      }
    },
    builder: { // Byggepladsen
      hat: function () {
        return path('M60,76 C58,20 182,20 180,76 Z', '#F7D23E') +
               path('M50,74 Q120,62 190,74 L188,84 Q120,74 52,84 Z', '#E8B923') +
               line('M120,26 L120,72', '#E8B923', 5);
      },
      front: function () {
        return path('M80,170 Q66,218 76,262 L112,264 L112,180 Q100,166 80,170 Z', '#F28C28') +
               path('M160,170 Q174,218 164,262 L128,264 L128,180 Q140,166 160,170 Z', '#F28C28') +
               line('M78,226 L112,226', '#FFE14D', 6) + line('M128,226 L162,226', '#FFE14D', 6) +
               line('M76,244 L112,244', '#FFE14D', 6) + line('M128,244 L164,244', '#FFE14D', 6);
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return path('M170,236 L178,196 L170,160 L180,128', 'none', { stroke: '#C68A3E', 'stroke-width': 9 }) +
               line('M174,214 L180,214 M175,180 L181,180 M174,146 L180,146', C.out, 1.5);
      }
    },
    shop: { // Lommepenge
      front: function () {
        return path('M84,176 L156,176 L164,262 Q120,272 76,262 Z', '#B9875A') +
               line('M84,176 Q120,150 156,176', '#8B5A2B', 4) +
               path('M104,224 h32 v18 q0,4 -4,4 h-24 q-4,0 -4,-4 Z', '#A0703F', { 'stroke-width': 2.5 });
      },
      prop: function (id, armsPose) {
        return path('M60,236 q0,-14 14,-14 h4 q14,0 14,14 q0,14 -16,14 q-16,0 -16,-14 Z', '#A0522D') +
               el('circle', { cx: 70, cy: 222, r: 3.5, fill: '#E8C35A', stroke: C.out, 'stroke-width': 2 }) +
               el('circle', { cx: 82, cy: 222, r: 3.5, fill: '#E8C35A', stroke: C.out, 'stroke-width': 2 });
      }
    },
    music: { // Taktslaget
      hat: function () {
        return path('M60,104 C56,20 184,20 180,104', 'none', { stroke: C.out, 'stroke-width': 13 }) +
               path('M60,104 C56,20 184,20 180,104', 'none', { stroke: C.blueDark, 'stroke-width': 7 }) +
               el('ellipse', { cx: 58, cy: 112, rx: 14, ry: 22, fill: C.blue, stroke: C.out, 'stroke-width': SW }) +
               el('ellipse', { cx: 182, cy: 112, rx: 14, ry: 22, fill: C.blue, stroke: C.out, 'stroke-width': SW }) +
               path('M200,40 L200,72 M200,40 L218,34 L218,66', 'none', { stroke: C.blueDark, 'stroke-width': 4 }) +
               el('ellipse', { cx: 194, cy: 74, rx: 7, ry: 5.5, fill: C.blueDark, stroke: 'none' }) +
               el('ellipse', { cx: 212, cy: 68, rx: 7, ry: 5.5, fill: C.blueDark, stroke: 'none' });
      }
    },
    tools: { // Robotkoden
      front: function () {
        return path('M74,228 Q120,240 166,228 L166,244 Q120,256 74,244 Z', C.leather) +
               path('M80,240 h18 v16 a4,4 0 0 1 -4,4 h-10 a4,4 0 0 1 -4,-4 Z', '#A86E35', { 'stroke-width': 3 }) +
               path('M142,240 h18 v16 a4,4 0 0 1 -4,4 h-10 a4,4 0 0 1 -4,-4 Z', '#A86E35', { 'stroke-width': 3 }) +
               el('rect', { x: 110, y: 233, width: 20, height: 16, rx: 3, fill: '#E2BE52', stroke: C.out, 'stroke-width': 3 }) +
               el('rect', { x: 116, y: 238, width: 8, height: 6, rx: 1, fill: C.leather });
      },
      sidekick: true
    },
    knight: { // Talforsvaret: a knight's helmet with the visor up, and a round shield with a number
      hideAntennae: true,
      hat: function () {
        return path('M114,30 C108,14 124,4 144,6 C160,8 170,16 174,30 C164,24 156,24 148,30 C144,22 134,22 126,32 Z', C.red, { 'stroke-width': 3 }) +
               line('M126,24 Q140,12 160,15', '#F07D6E', 2.5) +
               path('M59,112 Q54,64 66,44 Q90,22 120,22 Q150,22 174,44 Q186,64 181,112 Q172,108 170,96 Q170,80 164,76 Q120,64 76,76 Q70,80 70,96 Q68,108 59,112 Z', '#C9D1DA') +
               line('M80,48 Q92,36 106,32', C.white, 4) +
               path('M64,62 Q120,40 176,62 L174,76 Q120,56 66,76 Z', '#9AA6B2') +
               path('M92,61 Q120,51 148,61', 'none', { stroke: '#3A3A44', 'stroke-width': 5 }) +
               el('circle', { cx: 67, cy: 70, r: 5, fill: '#E8C35A', stroke: C.out, 'stroke-width': 2.5 }) +
               el('circle', { cx: 173, cy: 70, r: 5, fill: '#E8C35A', stroke: C.out, 'stroke-width': 2.5 });
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return el('circle', { cx: 190, cy: 226, r: 26, fill: C.blueDark, stroke: C.out, 'stroke-width': SW }) +
               el('circle', { cx: 190, cy: 226, r: 20, fill: 'none', stroke: '#E8C35A', 'stroke-width': 4 }) +
               txt(191, 237, '7', 30, '#FFF3C4', { stroke: C.out, 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round' });
      }
    },
    beekeeper: { // Bigården: a wide beekeeper's hat with the veil pushed up, and a honey pot
      hideAntennae: true,
      hat: function (id) {
        var mesh = '<defs><pattern id="' + id + 'v" width="5" height="5" patternUnits="userSpaceOnUse">' +
          '<rect width="5" height="5" fill="#8C96A0"/><path d="M0,0 H5 M0,0 V5" stroke="#3B4148" stroke-width="1.1"/></pattern></defs>';
        return mesh +
               el('ellipse', { cx: 120, cy: 64, rx: 80, ry: 15, fill: '#FBF8EE', stroke: C.out, 'stroke-width': SW }) +
               path('M80,62 C78,12 162,12 160,62 Q120,70 80,62 Z', '#FBF8EE') +
               path('M72,66 C68,54 78,46 88,50 C94,42 106,42 112,48 C118,42 130,42 136,48 C142,42 154,44 156,50 C166,48 174,56 168,66 Q120,78 72,66 Z', 'url(#' + id + 'v)', { 'stroke-width': 3 }) +
               line('M90,52 Q88,60 92,68 M112,49 Q110,60 112,71 M136,49 Q138,60 136,71 M156,52 Q158,60 154,68', '#3B4148', 1.8) +
               path(hexPath(120, 26, 7), '#F7C548', { 'stroke-width': 2.5 });
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return limb('M196,214 L206,180', 4, C.wood) +
               el('ellipse', { cx: 207, cy: 178, rx: 6, ry: 8, fill: '#E8B923', stroke: C.out, 'stroke-width': 2.5 }) +
               path('M176,214 Q166,236 178,252 Q192,260 206,252 Q218,236 208,214 Z', '#D98B2B') +
               el('rect', { x: 170, y: 206, width: 44, height: 12, rx: 5, fill: '#B86E1E', stroke: C.out, 'stroke-width': 3 }) +
               path('M172,212 Q192,208 212,212 L212,216 Q210,226 206,226 Q202,226 202,218 Q194,220 186,218 Q186,232 181,232 Q176,232 177,218 Q172,218 172,212 Z', '#F7C548', { 'stroke-width': 2 }) +
               el('ellipse', { cx: 193, cy: 238, rx: 11, ry: 8, fill: '#FFF3C4', stroke: C.out, 'stroke-width': 2 }) +
               path(hexPath(193, 238, 4.5), '#F2B51F', { 'stroke-width': 1.5 });
      }
    },
    wordsmith: { // Bogstavkampen: a sash with letter tiles, a pencil behind the ear and a big letter tile
      hat: function () {
        return '<g transform="rotate(58 182 70)">' + el('rect', { x: 158, y: 64, width: 46, height: 11, rx: 2, fill: '#F7C548', stroke: C.out, 'stroke-width': 3 }) +
               path('M204,64 L216,69.5 L204,75 Z', '#F3D9B1', { 'stroke-width': 3 }) + path('M211,67.2 L216,69.5 L211,71.8 Z', C.out, { 'stroke-width': 1 }) +
               el('rect', { x: 150, y: 64, width: 10, height: 11, rx: 2, fill: '#F4A7C3', stroke: C.out, 'stroke-width': 3 }) + '</g>' +
               tile(80, 48, 22, 'A', '1', -14);
      },
      front: function () {
        return path('M84,166 L100,160 L170,242 L158,256 Z', '#2E8B6E') +
               tile(103, 185, 20, 'B', '3', -8) + tile(124, 209, 20, 'O', '1', 4) + tile(145, 233, 20, 'B', '3', -6);
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return tile(192, 222, 40, 'Ø', '4', 10);
      }
    },
    engineer: { // Energiøen: a white hard hat with a wind-turbine sticker, and a hi-vis vest
      hideAntennae: true,
      hat: function () {
        return path('M60,76 C58,20 182,20 180,76 Z', '#F7F8FA') +
               path('M50,74 Q120,62 190,74 L188,84 Q120,74 52,84 Z', '#DCE1E7') +
               line('M120,37 L120,68', '#DCE1E7', 5) + line('M78,52 Q86,38 100,32', '#FFFFFF', 4) +
               el('circle', { cx: 148, cy: 50, r: 13, fill: '#6FB04A', stroke: C.out, 'stroke-width': 2.5 }) +
               line('M148,48 L148,61', '#FFFFFF', 2.5) +
               path('M148,47 L146,38 L149,38 Z M148,47 L155,52 L153,54 Z M148,47 L140,51 L139,49 Z', '#FFFFFF', { stroke: '#FFFFFF', 'stroke-width': 1.5 }) +
               el('circle', { cx: 148, cy: 47, r: 2, fill: '#FFFFFF' });
      },
      front: function () {
        var V = '#D7EE3C';
        return path('M80,170 Q66,218 76,262 L112,264 L112,196 L98,168 Q88,166 80,170 Z', V) +
               path('M160,170 Q174,218 164,262 L128,264 L128,196 L142,168 Q152,166 160,170 Z', V) +
               path('M74,222 L112,222 L112,232 L75,232 Z', '#D5DCE4', { 'stroke-width': 2 }) + path('M128,222 L166,222 L165,232 L128,232 Z', '#D5DCE4', { 'stroke-width': 2 }) +
               path('M75,244 L112,244 L112,254 L77,254 Z', '#D5DCE4', { 'stroke-width': 2 }) + path('M128,244 L165,244 L163,254 L128,254 Z', '#D5DCE4', { 'stroke-width': 2 }) +
               path('M140,192 Q150,180 156,196 Q146,204 140,192 Z', '#6FB04A', { 'stroke-width': 2 });
      }
    },
    backpacker: { // Rygsækrejsen: a big trekking backpack with a sleeping mat, and a bandana
      back: function () {
        return path('M46,126 H194 V146 H46 Z', '#6E50B8') + line('M66,126 V146 M174,126 V146', '#3A2A55', 3) +
               el('ellipse', { cx: 46, cy: 136, rx: 7, ry: 10, fill: '#8E70D8', stroke: C.out, 'stroke-width': 3 }) + path('M47,131 a4,4 0 1 0 1,8', 'none', { 'stroke-width': 2 }) +
               el('ellipse', { cx: 194, cy: 136, rx: 7, ry: 10, fill: '#8E70D8', stroke: C.out, 'stroke-width': 3 }) + path('M193,131 a4,4 0 1 1 -1,8', 'none', { 'stroke-width': 2 });
      },
      front: function (id) {
        return '<defs><mask id="' + id + 'bp"><rect x="0" y="0" width="240" height="300" fill="#fff"/><ellipse cx="120" cy="214" rx="45.5" ry="50.5" fill="#000"/></mask></defs>' +
               '<g mask="url(#' + id + 'bp)">' +
                 path('M64,166 Q64,146 84,146 H156 Q176,146 176,166 V238 Q176,262 152,262 H88 Q64,262 64,238 Z', '#3F8F5A') +
                 path('M64,204 h12 v30 h-12 Z M164,204 h12 v30 h-12 Z', '#2F6E44', { 'stroke-width': 2.5 }) +
               '</g>' +
               line('M94,170 Q86,206 92,246', '#2F6E44', 6) + line('M146,170 Q154,206 148,246', '#2F6E44', 6) +
               line('M90,206 L150,206', '#2F6E44', 4) + el('rect', { x: 113, y: 201, width: 14, height: 10, rx: 2, fill: '#F28C28', stroke: C.out, 'stroke-width': 2 });
      },
      hat: function (id) {
        return '<defs><pattern id="' + id + 'bd" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#D9463B"/>' +
                 '<circle cx="3" cy="3" r="1.6" fill="#FFFFFF"/><circle cx="9" cy="9" r="1.6" fill="#FFFFFF"/></pattern></defs>' +
               path('M176,64 Q190,58 196,48 Q196,64 188,72 Z', 'url(#' + id + 'bd)', { 'stroke-width': 3 }) +
               path('M178,70 Q192,74 198,88 Q186,86 178,78 Z', 'url(#' + id + 'bd)', { 'stroke-width': 3 }) +
               path('M60,80 C56,26 184,26 180,80 Q120,62 60,80 Z', 'url(#' + id + 'bd)') +
               el('circle', { cx: 180, cy: 70, r: 7, fill: '#D9463B', stroke: C.out, 'stroke-width': 3 });
      }
    },
    gamedev: { // Spilmageren: a cap worn backwards and a game controller
      hat: function () {
        return path('M74,50 Q52,34 34,44 Q42,62 70,68 Z', '#1F8A7B') +
               path('M62,74 C60,24 180,24 178,74 Q120,62 62,74 Z', '#2BB3A0') +
               line('M120,28 Q116,48 120,66', '#1F8A7B', 2.5) + line('M90,36 Q86,52 88,68 M150,36 Q154,52 152,68', '#1F8A7B', 2) +
               path('M104,68 Q104,52 120,52 Q136,52 136,68 Q120,64 104,68 Z', C.cap, { 'stroke-width': 3 }) +
               line('M106,62 L134,62', '#1F8A7B', 4) +
               el('circle', { cx: 120, cy: 28, r: 4, fill: '#F2C94C', stroke: C.out, 'stroke-width': 2 }) +
               path(heartPath(160, 52, 5), '#E8487A', { 'stroke-width': 2 });
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return '<g transform="rotate(-14 192 232)">' +
               path('M170,224 q0,-12 14,-12 h18 q14,0 14,12 l4,16 q2,12 -8,12 q-6,0 -10,-8 h-18 q-4,8 -10,8 q-10,0 -8,-12 Z', '#6E50B8') +
               path('M182,222 h4 v-4 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4 Z', '#FFFFFF', { 'stroke-width': 1.5 }) +
               el('circle', { cx: 204, cy: 220, r: 3.5, fill: '#E8487A', stroke: C.out, 'stroke-width': 1.5 }) +
               el('circle', { cx: 211, cy: 227, r: 3.5, fill: '#6FB04A', stroke: C.out, 'stroke-width': 1.5 }) + '</g>';
      }
    },
    cafe: { // Bob i Berlin: a barista apron, a paper café cap and a cup on a saucer
      hat: function () {
        return path('M76,62 L86,32 Q120,22 154,32 L164,62 Q120,52 76,62 Z', '#FFFFFF') +
               path('M78,56 Q120,46 162,56 L164,62 Q120,52 76,62 Z', '#8B5A2B', { 'stroke-width': 2.5 }) +
               el('ellipse', { cx: 120, cy: 40, rx: 6.5, ry: 9, fill: '#8B5A2B', stroke: C.out, 'stroke-width': 2.5, transform: 'rotate(20 120 40)' }) +
               line('M118,33 Q122,40 119,47', '#D9A97A', 2);
      },
      front: function () {
        return path('M98,176 H142 L146,204 Q166,214 162,256 Q120,268 78,256 Q74,214 94,204 Z', '#8B5A2B') +
               line('M94,204 Q120,210 146,204', '#D9A97A', 2.5) +
               path('M108,222 h24 v14 q0,4 -4,4 h-16 q-4,0 -4,-4 Z', '#A0703F', { 'stroke-width': 2.5 }) +
               el('ellipse', { cx: 120, cy: 190, rx: 5, ry: 7, fill: '#D9A97A', stroke: C.out, 'stroke-width': 2 }) + line('M119,185 Q122,190 119,195', '#8B5A2B', 1.5);
      },
      neck: function () { return line('M98,178 Q92,168 96,158 M142,178 Q148,168 144,158', '#8B5A2B', 4); },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return line('M186,198 q-5,-7 0,-14 q5,-7 0,-14 M198,198 q-5,-7 0,-14 q5,-7 0,-14', '#B9BEC6', 2.5) +
               path('M208,214 q12,0 10,9 q-2,7 -12,5', 'none', { 'stroke-width': 3 }) +
               path('M176,204 h34 v6 q0,22 -17,22 q-17,0 -17,-22 Z', '#FFFFFF') +
               line('M178,212 H208', '#D9463B', 3) +
               el('ellipse', { cx: 193, cy: 233, rx: 26, ry: 6, fill: '#FFFFFF', stroke: C.out, 'stroke-width': 3 });
      }
    },
    artist: { // Tegneserieværkstedet: a black beret, a speech bubble and a big ink pen
      hat: function () {
        return '<g transform="rotate(10 120 50)">' +
               path('M62,58 C56,34 92,24 122,26 C154,28 184,38 178,56 Q120,66 62,58 Z', '#2B2B33') +
               line('M120,26 L121,16', C.out, 4.5) + line('M80,44 Q96,34 114,33', '#5A5A66', 3) + '</g>' +
               path('M164,20 h32 a6,6 0 0 1 6,6 v14 a6,6 0 0 1 -6,6 h-18 l-10,10 l2,-10 h-6 a6,6 0 0 1 -6,-6 v-14 a6,6 0 0 1 6,-6 Z', '#FFFFFF', { 'stroke-width': 3 }) +
               txt(179, 39, 'HEJ!', 12, C.red);
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return '<g transform="rotate(24 176 230)">' +
               el('rect', { x: 169, y: 166, width: 14, height: 70, rx: 5, fill: '#2F3E7A', stroke: C.out, 'stroke-width': 3 }) +
               el('rect', { x: 169, y: 172, width: 14, height: 7, fill: '#E8C35A', stroke: C.out, 'stroke-width': 2.5 }) +
               path('M170,166 L176,140 L182,166 Z', '#D5DCE4', { 'stroke-width': 3 }) +
               line('M176,148 L176,160', C.out, 1.8) + '</g>' +
               path('M200,152 q4,6 4,9 a4,4 0 0 1 -8,0 q0,-3 4,-9 Z', '#2F3E7A', { 'stroke-width': 2 });
      }
    },
    inventor: { // Opfinderværkstedet: brass goggles pushed up on the forehead, a gear on the chest and a wrench
      hat: function () {
        return path('M57,72 Q120,44 183,72 L182,82 Q120,56 58,82 Z', '#5C3A1C', { 'stroke-width': 3 }) +
               el('rect', { x: 113, y: 52, width: 14, height: 8, rx: 3, fill: '#C9962E', stroke: C.out, 'stroke-width': 2.5 }) +
               el('circle', { cx: 98, cy: 58, r: 16, fill: '#F4B860', stroke: C.out, 'stroke-width': SW }) +
               el('circle', { cx: 142, cy: 58, r: 16, fill: '#F4B860', stroke: C.out, 'stroke-width': SW }) +
               el('circle', { cx: 98, cy: 58, r: 12, fill: '#FFE3A8', stroke: '#C9962E', 'stroke-width': 4 }) +
               el('circle', { cx: 142, cy: 58, r: 12, fill: '#FFE3A8', stroke: '#C9962E', 'stroke-width': 4 }) +
               el('circle', { cx: 98, cy: 58, r: 14, fill: 'none', stroke: C.out, 'stroke-width': 1.5 }) + el('circle', { cx: 142, cy: 58, r: 14, fill: 'none', stroke: C.out, 'stroke-width': 1.5 }) +
               line('M91,54 Q95,50 100,51', C.white, 2.5) + line('M135,54 Q139,50 144,51', C.white, 2.5);
      },
      front: function () {
        return gear(102, 202, 15, 8, '#E2B13C') + gear(123, 222, 9, 6, '#C8703C', 2);
      },
      prop: function (id, armsPose) {
        if (armsPose[1] !== 'down') return '';
        return '<g transform="translate(184 214) rotate(28)">' +
               path('M-5,26 L-5,-34 L-12,-41 L-12,-52 L-6,-60 L-2,-60 L-2,-50 L2,-50 L2,-60 L6,-60 L12,-52 L12,-41 L5,-34 L5,26 Q0,32 -5,26 Z', '#B9BEC6', { 'stroke-width': 3 }) +
               el('circle', { cx: 0, cy: 18, r: 2.5, fill: '#FFFFFF', stroke: C.out, 'stroke-width': 2 }) + line('M-2,-28 L-2,10', '#FFFFFF', 2) + '</g>';
      }
    }
  };

  function robot() {
    var R = C.robot;
    return '<g transform="translate(232,168)">' +
      line('M40,2 L40,-12', C.out, 3) +
      el('circle', { cx: 40, cy: -15, r: 5.5, fill: C.blue, stroke: C.out, 'stroke-width': 3 }) +
      limb('M22,52 L10,74', 7, R) + limb('M58,52 L70,74', 7, R) +
      limb('M32,86 L32,104', 9, R) + limb('M48,86 L48,104', 9, R) +
      el('rect', { x: 20, y: 44, width: 40, height: 44, rx: 11, fill: R, stroke: C.out, 'stroke-width': SW }) +
      el('rect', { x: 30, y: 55, width: 20, height: 14, rx: 3, fill: C.screen, stroke: C.out, 'stroke-width': 2.5 }) +
      el('rect', { x: 8, y: 14, width: 7, height: 13, rx: 2, fill: R, stroke: C.out, 'stroke-width': 3 }) +
      el('rect', { x: 65, y: 14, width: 7, height: 13, rx: 2, fill: R, stroke: C.out, 'stroke-width': 3 }) +
      el('rect', { x: 14, y: 0, width: 52, height: 42, rx: 13, fill: R, stroke: C.out, 'stroke-width': SW }) +
      el('rect', { x: 21, y: 7, width: 38, height: 27, rx: 8, fill: C.screen, stroke: C.out, 'stroke-width': 2.5 }) +
      el('circle', { cx: 32, cy: 18, r: 3.2, fill: C.out }) + el('circle', { cx: 48, cy: 18, r: 3.2, fill: C.out }) +
      line('M34,25 Q40,30 46,25', C.out, 2.5) +
      '</g>';
  }

  /* ---------- assemble ---------- */
  function svg(opts) {
    opts = opts || {};
    var ex = EXPRESSIONS[opts.expression] || EXPRESSIONS['default'];
    var of = OUTFITS[opts.outfit] || OUTFITS.none;
    var pose = opts.arms || ex.arms;
    var id = 'bob' + (++uid);
    var crop = opts.crop || 'full';
    var side = opts.sidekick !== undefined ? opts.sidekick : !!of.sidekick;
    if (crop === 'head') side = false;

    var tall = !!(opts.look && opts.look.hat && (!opts.outfit || opts.outfit === 'none')); // room for a tall hat
    var vb = crop === 'head' ? (tall ? '36 -24 168 202' : '36 0 168 178') : (side ? (opts.trim ? '20 0 290 300' : '0 0 320 300') : (tall ? '0 -24 240 324' : '0 0 240 300')); // trim: no empty margin around Bob and the robot
    var vw = +vb.split(' ')[2], vh = +vb.split(' ')[3];
    var size = opts.size || 200;
    var w = crop === 'head' ? size : Math.round(size * vw / vh);
    var h = crop === 'head' ? Math.round(size * vh / vw) : size;
    var label = opts.label || 'Bob bien';

    // look: bow, wings and antenna tips apply everywhere (Bob.setLook); hat and extra only when a look is passed and Bob wears no outfit
    var look = opts.look || defaultLook, own = !!opts.look && (!opts.outfit || opts.outfit === 'none');
    var extra = own && EXTRAS[look.extra] ? EXTRAS[look.extra] : null;
    var parts = [];
    if (of.back && !(crop === 'head' && of.noBackInHead)) parts.push(of.back(id));
    if (crop !== 'head') parts.push(wings(look.wings, id));
    if (!of.hideAntennae) parts.push(antennae(look.tip, id));
    if (crop !== 'head') {
      parts.push(legs());
      parts.push(body(id));
      if (of.front) parts.push(of.front(id));
    }
    if (!of.hideCollar) parts.push(collar(look.bow, id));
    if (of.neck) parts.push(of.neck(id));
    if (extra && extra.layer === 'front' && crop !== 'head') parts.push(extra.draw(id));
    parts.push(head(id));
    parts.push(ex.face());
    if (extra && extra.layer === 'face') parts.push(extra.draw(id));
    if (of.eyewear) parts.push(of.eyewear(id));
    if (of.hat) parts.push(of.hat(id));
    if (own && HATS[look.hat]) parts.push(HATS[look.hat](id));
    if (crop !== 'head') {
      if (extra && extra.layer === 'prop') parts.push(extra.draw(id));
      if (of.prop) parts.push(of.prop(id, pose));
      parts.push(arms(pose));
      if (side) parts.push(robot());
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + w + '" height="' + h +
      '" role="img" aria-label="' + label + '"><title>' + label + '</title>' + parts.join('') + '</svg>';
  }

  function mount(target, opts) {
    var node = typeof target === 'string' ? document.querySelector(target) : target;
    if (node) node.innerHTML = svg(opts);
    return node;
  }

  var defaultLook = {};
  function setLook(look) { defaultLook = look || {}; }

  root.Bob = {
    svg: svg, setLook: setLook,
    looks: { bow: Object.keys(BOWS), wings: Object.keys(WINGS), tip: Object.keys(TIPS), hat: Object.keys(HATS), extra: Object.keys(EXTRAS) },
    mount: mount,
    expressions: Object.keys(EXPRESSIONS),
    outfits: Object.keys(OUTFITS),
    colors: C
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Bob;
})(typeof window !== 'undefined' ? window : this);
