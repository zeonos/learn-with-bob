/*
 * Taktslaget – musik.
 * Bob spiller i et band, der mangler musikere. Hver øvelse træner én ting: hold takten, rytmeboksen, nodeværdier,
 * nodejagten, højt eller dybt, instrumenterne (mellemtrin) og rytmer, taktarter, nodelæsning med hjælpelinjer,
 * akkorder, intervaller og C-dur (udskoling). En stjerne i en øvelse henter en ny musiker til bandet.
 * Komponisten er en trommemaskine med melodilinje, som kan deles med en kort kode (TAKT1:…).
 * Al lyd laves med Web Audio. Uden lyd vises noder og blinkende lys i stedet, så alt kan løses.
 */
(function (root) {
  'use strict';
  var Core = root.Core, M = root.TS_MUSIC, Bob = root.Bob, S = root.STR.ts, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'taktslaget', OUTFIT = 'music';
  var app = null, st = null, timers = [], rTimers = [], clock = 0, el = {}, R = null, SB = null;
  var INK = '#4A2C17', BLUE = '#2F7DB3';
  var ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    speak: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    ear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 18c0 2 4 3 5 0 1-2 4-3 4-8a6 6 0 0 0-12 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M9 10a3 3 0 0 1 6 0c0 2-2 2-2 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>'
  };

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0 }); }
  function later(fn, ms) { var x = setTimeout(fn, Math.max(0, ms)); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function rLater(fn, ms) { var x = setTimeout(fn, Math.max(0, ms)); rTimers.push(x); return x; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function now() { return root.performance ? root.performance.now() : Date.now(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function art(inst) { return inst.et ? 'et' : 'en'; }

  /* ================= SOUND (Web Audio synthesis) ================= */
  var bus = null, noiseBuf = null;
  function soundOn() { return Core.setting('sound') !== false; }
  function actx() { return soundOn() ? Core.audio() : null; }
  function out(c) {
    if (!bus || bus.context !== c) { bus = c.createGain(); bus.gain.value = 0.9; bus.connect(c.destination); }
    return bus;
  }
  function hush() { if (bus) { try { bus.disconnect(); } catch (e) { /* already gone */ } bus = null; } }
  function noise(c) {
    if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
      var len = Math.floor(c.sampleRate * 0.5); noiseBuf = c.createBuffer(1, len, c.sampleRate);
      var ch = noiseBuf.getChannelData(0); for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function env(c, t0, vol, dur, attack) {
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + (attack || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(out(c)); return g;
  }
  function osc(c, type, f, t0, dur, g, f2) {
    var o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur * 0.6);
    o.connect(g); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noiseHit(c, t0, dur, vol, type, freq) {
    var s = c.createBufferSource(), f = c.createBiquadFilter(); s.buffer = noise(c); f.type = type; f.frequency.value = freq;
    s.connect(f); f.connect(env(c, t0, vol, dur, 0.002)); s.start(t0); s.stop(t0 + dur + 0.02);
  }
  var DRUM = {
    kick: function (c, t0, v) { osc(c, 'sine', 150, t0, 0.32, env(c, t0, 0.9 * v, 0.32, 0.003), 45); },
    snare: function (c, t0, v) { noiseHit(c, t0, 0.18, 0.45 * v, 'bandpass', 1900); osc(c, 'triangle', 190, t0, 0.1, env(c, t0, 0.25 * v, 0.1, 0.002)); },
    hat: function (c, t0, v) { noiseHit(c, t0, 0.05, 0.22 * v, 'highpass', 7000); },
    clap: function (c, t0, v) { [0, 0.012, 0.024].forEach(function (d) { noiseHit(c, t0 + d, 0.09, 0.4 * v, 'bandpass', 1300); }); },
    block: function (c, t0, v) { osc(c, 'sine', 820, t0, 0.09, env(c, t0, 0.5 * v, 0.09, 0.002), 700); osc(c, 'square', 1640, t0, 0.03, env(c, t0, 0.06 * v, 0.03, 0.002)); },
    click: function (c, t0, v) { osc(c, 'square', 1000, t0, 0.04, env(c, t0, 0.12 * v, 0.04, 0.002)); },
    accent: function (c, t0, v) { osc(c, 'square', 1500, t0, 0.05, env(c, t0, 0.16 * v, 0.05, 0.002)); }
  };
  function drum(kind, t0, vol) { var c = actx(); if (!c) return; try { DRUM[kind](c, t0 === undefined ? c.currentTime + 0.005 : t0, vol || 1); } catch (e) { /* ignore */ } }
  // a soft piano-like tone
  function note(m, t0, dur, vol) {
    var c = actx(); if (!c) return;
    try {
      t0 = t0 === undefined ? c.currentTime + 0.01 : t0; vol = vol || 0.3; dur = dur || 0.8;
      var f = M.freq(m), g = env(c, t0, vol, dur, 0.01);
      osc(c, 'triangle', f, t0, dur, g); osc(c, 'sine', f * 2, t0, dur * 0.6, env(c, t0, vol * 0.25, dur * 0.6, 0.01));
    } catch (e) { /* ignore */ }
  }
  function playSeq(ms, gap, vol) { var c = actx(); if (!c) return; hush(); var t0 = c.currentTime + 0.08; ms.forEach(function (m, i) { note(m, t0 + i * gap, gap * 1.4, vol); }); }
  function playChord(ms) { var c = actx(); if (!c) return; hush(); var t0 = c.currentTime + 0.08; ms.forEach(function (m) { note(m, t0, 1.6, 0.18); }); ms.forEach(function (m, i) { note(m, t0 + 1.8 + i * 0.35, 0.6, 0.2); }); ms.forEach(function (m) { note(m, t0 + 3, 1.4, 0.16); }); }

  /* ================= DRAWINGS (SVG strings – also used in the daily challenge, so only attributes, no CSS) ================= */
  var O = ' stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"';
  function svg(w, hh, inner, label, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 ' + w + ' ' + hh + '" width="' + w + '" height="' + hh + '" role="img" aria-label="' + esc(label || '') + '" style="max-width:100%;height:auto;color:' + INK + '">' + inner + '</svg>';
  }
  // Treble clef (G-nøgle), drawn for a staff whose top line is y=0 and bottom line y=40 (the g1 line is y=30)
  var CLEF = 'M17.5 33.5C13 34 10.5 30 13 26.5C16 22.5 22.5 24 22.5 30C22.5 37 14 39.5 9 35C3.5 30 5.5 22 11 17C16 12.5 21 8 21 0C21 -6 18.5 -10 16 -10C12.5 -10 11.5 -3 12 3L15.5 48C16 54 13 56.5 10 55.5C7 54.5 7 50 10.5 49.5';
  function clef(x, yTop) { return '<path d="' + CLEF + '" transform="translate(' + x + ' ' + yTop + ')" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'; }
  function head(cx, cy, open, color) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="6.3" ry="4.4" transform="rotate(-20 ' + cx + ' ' + cy + ')" fill="' + (open ? '#fff' : color) + '" stroke="' + color + '" stroke-width="' + (open ? 2.2 : 1) + '"/>';
  }
  // cols: [{ ms: [midi…], whole: bool, color, label, q: bool }]; o: { clef (default true), colW, labels }
  function staffSVG(cols, o) {
    o = o || {};
    var colW = o.colW || 46, clefW = o.clef === false ? 6 : 36, pad = 8;
    var poss = [], hi = 10, lo = -3;
    cols.forEach(function (c) { (c.ms || []).forEach(function (m) { var p = M.staffPos(m); poss.push(p); if (!c.whole && c.ms.length === 1) { if (p < 4) hi = Math.max(hi, p + 8); else lo = Math.min(lo, p - 8); } hi = Math.max(hi, p + 2); lo = Math.min(lo, p - 2); }); });
    var labH = cols.some(function (c) { return c.label; }) ? 20 : 0;
    var w = pad + clefW + cols.length * colW + pad, top = 4, y = function (p) { return top + (hi - p) * 5; }, H = y(lo) + 4 + labH, s = '';
    for (var p = 0; p <= 8; p += 2) s += '<line x1="' + pad + '" x2="' + (w - pad) + '" y1="' + y(p) + '" y2="' + y(p) + '" stroke="currentColor" stroke-width="1.3"/>';
    s += '<line x1="' + (w - pad) + '" x2="' + (w - pad) + '" y1="' + y(8) + '" y2="' + y(0) + '" stroke="currentColor" stroke-width="1.3"/>';
    if (o.clef !== false) s += clef(pad + 4, y(8));
    cols.forEach(function (c, i) {
      var cx = pad + clefW + colW * (i + 0.5), color = c.color || INK;
      if (c.q) { s += '<rect x="' + (cx - 13) + '" y="' + (y(6) - 3) + '" width="26" height="' + (y(2) - y(6) + 6) + '" rx="6" fill="#FFF6D8" stroke="' + BLUE + '" stroke-width="2" stroke-dasharray="4 3"/><text x="' + cx + '" y="' + (y(4) + 7) + '" text-anchor="middle" font-size="20" font-weight="800" font-family="Arial, sans-serif" fill="' + BLUE + '">?</text>'; }
      (c.ms || []).forEach(function (m) {
        var p = M.staffPos(m);
        M.ledgers(p).forEach(function (lp) { s += '<line x1="' + (cx - 11) + '" x2="' + (cx + 11) + '" y1="' + y(lp) + '" y2="' + y(lp) + '" stroke="' + color + '" stroke-width="1.5"/>'; });
        s += head(cx, y(p), !!c.whole, color);
        if (!c.whole && c.ms.length === 1) s += p < 4 ? '<line x1="' + (cx + 5.8) + '" x2="' + (cx + 5.8) + '" y1="' + (y(p) - 1) + '" y2="' + (y(p) - 33) + '" stroke="' + color + '" stroke-width="1.6"/>'
          : '<line x1="' + (cx - 5.8) + '" x2="' + (cx - 5.8) + '" y1="' + (y(p) + 1) + '" y2="' + (y(p) + 33) + '" stroke="' + color + '" stroke-width="1.6"/>';
      });
      if (c.label) s += '<text x="' + cx + '" y="' + (H - 4) + '" text-anchor="middle" font-size="15" font-weight="700" font-family="Arial, sans-serif" fill="' + color + '">' + esc(c.label) + '</text>';
    });
    return svg(w, H, s, o.label || '', o.cls);
  }
  // Rhythm: ids are duration ids from M.DUR. o: { ts, miss (index shown as ?), barU, cls, noLines }
  function rhythmSVG(ids, o) {
    o = o || {};
    var y = function (p) { return 14 + (8 - p) * 5; }, HY = y(3), H = 66, x = 8, s = '', xs = [], barU = o.barU || (o.ts ? M.TIME[o.ts] : 16), pos = 0, bars = [];
    if (o.ts) {
      var tp = o.ts.split('/');
      s += '<text x="' + (x + 8) + '" y="' + (y(4) - 1) + '" text-anchor="middle" font-size="21" font-weight="900" font-family="Georgia, serif" fill="currentColor">' + tp[0] + '</text>' +
           '<text x="' + (x + 8) + '" y="' + (y(0) - 1) + '" text-anchor="middle" font-size="21" font-weight="900" font-family="Georgia, serif" fill="currentColor">' + tp[1] + '</text>';
      x += 24;
    }
    x += 6;
    ids.forEach(function (id, i) {
      var u = M.DUR[id].u, w = o.miss === i ? 40 : 22 + u * 3.2;
      xs.push(x + (o.miss === i ? 20 : 10)); x += w; pos += u;
      if (o.noBars !== true && pos % barU === 0 && i < ids.length - 1) { bars.push(x + 2); x += 10; }
    });
    var W = x + 10;
    // beamed eighth pairs (on a beat)
    var beamed = {}; pos = 0;
    ids.forEach(function (id, i) {
      if (id === 'ottendedel' && pos % 4 === 0 && ids[i + 1] === 'ottendedel' && o.miss !== i && o.miss !== i + 1) { beamed[i] = i + 1; beamed[i + 1] = -1; }
      pos += M.DUR[id].u;
    });
    if (!o.noLines) for (var p = 0; p <= 8; p += 2) s += '<line x1="4" x2="' + (W - 4) + '" y1="' + y(p) + '" y2="' + y(p) + '" stroke="currentColor" stroke-width="1.2" opacity=".55"/>';
    bars.forEach(function (bx) { s += '<line x1="' + bx + '" x2="' + bx + '" y1="' + y(8) + '" y2="' + y(0) + '" stroke="currentColor" stroke-width="1.6"/>'; });
    if (o.end !== false && !o.noLines) s += '<line x1="' + (W - 4) + '" x2="' + (W - 4) + '" y1="' + y(8) + '" y2="' + y(0) + '" stroke="currentColor" stroke-width="1.6"/>';
    ids.forEach(function (id, i) {
      var d = M.DUR[id], cx = xs[i], g = '';
      if (o.miss === i) {
        g = '<rect x="' + (cx - 15) + '" y="' + (y(8) - 4) + '" width="30" height="' + (y(0) - y(8) + 8) + '" rx="7" fill="#FFF6D8" stroke="' + BLUE + '" stroke-width="2.2" stroke-dasharray="5 3"/><text x="' + cx + '" y="' + (y(4) + 8) + '" text-anchor="middle" font-size="22" font-weight="800" font-family="Arial, sans-serif" fill="' + BLUE + '">?</text>';
      } else if (d.rest) {
        if (d.u === 16) g = '<rect x="' + (cx - 7) + '" y="' + y(6) + '" width="14" height="5.5" fill="currentColor"/>';
        else if (d.u === 8) g = '<rect x="' + (cx - 7) + '" y="' + (y(4) - 5.5) + '" width="14" height="5.5" fill="currentColor"/>';
        else if (d.u === 4) g = '<path d="M' + (cx - 3) + ' ' + y(7) + 'l6 7.5l-5 6l6 7c-4 -2 -8 0 -4 6c-6 -3 -6 -9 0 -8l-6 -7l5 -6z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>';
        else g = '<circle cx="' + (cx - 3) + '" cy="' + (y(5) + 1) + '" r="2.8" fill="currentColor"/><path d="M' + (cx - 3) + ' ' + (y(5) + 3) + 'q5 1 8 -3l-6 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      } else {
        var open = d.u >= 8 && !(d.dot && d.u === 6), sx = cx + 5.8, top = HY - 30;
        g = '<ellipse cx="' + cx + '" cy="' + HY + '" rx="6.3" ry="4.4" transform="rotate(-20 ' + cx + ' ' + HY + ')" fill="' + (open ? '#fff' : 'currentColor') + '" stroke="currentColor" stroke-width="' + (open ? 2.2 : 1) + '"/>';
        if (d.u < 16) g += '<line x1="' + sx + '" x2="' + sx + '" y1="' + (HY - 1) + '" y2="' + top + '" stroke="currentColor" stroke-width="1.7"/>';
        var flags = d.u === 2 ? 1 : d.u === 1 ? 2 : 0;
        if (flags && beamed[i] === undefined) for (var f = 0; f < flags; f++) g += '<path d="M' + sx + ' ' + (top + f * 7) + 'c1 6 10 7 8 17c4 -9 -3 -13 -8 -15" fill="currentColor" stroke="currentColor" stroke-width="1"/>';
        if (beamed[i] > 0) g += '<rect x="' + sx + '" y="' + top + '" width="' + (xs[beamed[i]] - cx) + '" height="5" fill="currentColor"/>';
        if (d.dot) g += '<circle cx="' + (cx + 11) + '" cy="' + (HY - 1) + '" r="2.3" fill="currentColor"/>';
      }
      s += '<g class="ts-n" data-i="' + i + '">' + g + '</g>';
    });
    return svg(Math.round(W), H, s, o.label || '', o.cls);
  }
  function symbolSVG(id) { return rhythmSVG([id], { noBars: true, end: false, label: M.DUR[id].name }); }
  function dynSVG(sign) {
    var inner = sign === '<' ? '<path d="M70 18L10 30L70 42" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
      : sign === '>' ? '<path d="M10 18L70 30L10 42" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
      : '<text x="40" y="44" text-anchor="middle" font-size="44" font-style="italic" font-weight="900" font-family="Georgia, \'Times New Roman\', serif" fill="currentColor">' + sign + '</text>';
    return svg(80, 60, inner, '');
  }
  /* ---------- instruments (viewBox 0 0 100 100) ---------- */
  function P(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + O + (extra || '') + '/>'; }
  var BODY = 'M50 38C36 38 32 44 34 52C35 56 40 58 40 62C40 66 33 68 33 77C33 86 42 90 50 90C58 90 67 86 67 77C67 68 60 66 60 62C60 58 65 56 66 52C68 44 64 38 50 38Z';
  function bowed(k, endpin, color) {
    return '<path d="M16 28L86 80" stroke="#7A5A3E" stroke-width="3.5" stroke-linecap="round"/><path d="M18 31L86 82" stroke="#F4E3C1" stroke-width="1.4"/>' +
      '<g transform="translate(50 54) scale(' + k + ') translate(-50 -54)">' + (endpin ? '<path d="M50 88v12" stroke="' + INK + '" stroke-width="3"/>' : '') +
      '<rect x="46.5" y="10" width="7" height="32" rx="2" fill="#3B2412"' + O + '/><circle cx="50" cy="8" r="5" fill="#8B4513"' + O + '/>' + P(BODY, color) +
      '<path d="M43 60c-2 4 2 8 0 12M57 60c2 4 -2 8 0 12" fill="none" stroke="#3B2412" stroke-width="2"/><rect x="45" y="77" width="10" height="8" rx="2" fill="#3B2412"/>' +
      '<path d="M48.5 12V80M51.5 12V80" stroke="#F4E3C1" stroke-width=".9"/></g>';
  }
  var GUITAR = 'M50 34C39 34 35 41 37 48C38 52 31 55 29 63C25 79 36 93 50 93C64 93 75 79 71 63C69 55 62 52 63 48C65 41 61 34 50 34Z';
  var INST = {
    violin: function () { return bowed(0.78, false, '#C0712C'); },
    cello: function () { return bowed(0.93, true, '#A65A22'); },
    kontrabas: function () { return bowed(1.04, true, '#8E4B1C'); },
    guitar: function () { return '<rect x="46" y="6" width="8" height="34" rx="2" fill="#5A3A22"' + O + '/><rect x="43" y="2" width="14" height="10" rx="3" fill="#3B2412"' + O + '/>' + P(GUITAR, '#E2A65A') + '<circle cx="50" cy="60" r="7" fill="#3B2412"/><rect x="42" y="76" width="16" height="4" rx="1" fill="#3B2412"/><path d="M47 8V78M49 8V78M51 8V78M53 8V78" stroke="#F4E3C1" stroke-width=".7"/>'; },
    elguitar: function () { return '<rect x="46" y="6" width="8" height="42" rx="2" fill="#5A3A22"' + O + '/><path d="M44 2h12l-2 10h-8z" fill="#2B2B2B"' + O + '/>' + P('M42 46L30 38L26 52L32 62L24 78L36 93L64 93L76 80L68 64L76 52L66 44L58 48Z', '#D9473B') + '<rect x="42" y="58" width="16" height="5" rx="1" fill="#2B2B2B"/><rect x="42" y="68" width="16" height="5" rx="1" fill="#2B2B2B"/><circle cx="64" cy="82" r="3" fill="#F4E3C1"/><circle cx="58" cy="87" r="3" fill="#F4E3C1"/><path d="M47.5 8V80M50 8V80M52.5 8V80" stroke="#F4E3C1" stroke-width=".7"/>'; },
    elbas: function () { return '<rect x="46" y="2" width="8" height="50" rx="2" fill="#5A3A22"' + O + '/><path d="M43 0h14l-2 8h-10z" fill="#2B2B2B"' + O + '/>' + P('M42 50L32 44L28 58L34 66L26 80L38 94L62 94L74 82L66 66L72 56L64 48L58 52Z', '#3D6FB6') + '<rect x="41" y="66" width="18" height="6" rx="1" fill="#2B2B2B"/><circle cx="62" cy="84" r="3" fill="#F4E3C1"/><path d="M48 4V82M52 4V82" stroke="#F4E3C1" stroke-width="1"/>'; },
    tvaerfloejte: function () { return '<g transform="rotate(-24 50 50)"><rect x="4" y="45" width="92" height="10" rx="4" fill="#D5DCE3"' + O + '/><ellipse cx="16" cy="50" rx="3" ry="2" fill="#4A2C17"/>' + [36, 44, 52, 60, 68, 76].map(function (x) { return '<circle cx="' + x + '" cy="50" r="2.8" fill="#9AA6B2" stroke="' + INK + '" stroke-width="1"/>'; }).join('') + '</g>'; },
    blokfloejte: function () { return P('M44 6h12l1 10h-14zM44 16h12l2 66 6 12h-28l6 -12z', '#C98F4E') + [30, 39, 48, 57, 66, 74].map(function (y) { return '<circle cx="50" cy="' + y + '" r="2.8" fill="#3B2412"/>'; }).join('') + '<rect x="46" y="18" width="8" height="3" fill="#3B2412"/>'; },
    klarinet: function () { return P('M46 4h8v8l2 2v62l8 16h-28l8 -16v-62l2 -2z', '#2B2B2B') + [24, 34, 44, 54, 64].map(function (y) { return '<circle cx="50" cy="' + y + '" r="2.4" fill="#D5DCE3"/><path d="M54 ' + (y + 2) + 'h5" stroke="#D5DCE3" stroke-width="2"/>'; }).join('') + '<rect x="45" y="12" width="10" height="3" fill="#D5DCE3"/>'; },
    saxofon: function () { return '<path d="M40 8l4 6v52c0 22 28 22 28 2v-10" fill="none" stroke="' + INK + '" stroke-width="14" stroke-linecap="round"/><path d="M40 8l4 6v52c0 22 28 22 28 2v-10" fill="none" stroke="#E8B33A" stroke-width="9" stroke-linecap="round"/>' + P('M62 50h20l-4 10h-12z', '#E8B33A') + [24, 34, 44, 54].map(function (y) { return '<circle cx="44" cy="' + y + '" r="2.6" fill="#FFF3C4" stroke="' + INK + '" stroke-width="1"/>'; }).join('') + '<path d="M36 6l6 -2" stroke="#2B2B2B" stroke-width="4" stroke-linecap="round"/>'; },
    trompet: function () { return '<path d="M8 50h52M20 50c0 -12 40 -12 40 0M20 50c0 12 40 12 40 0" fill="none" stroke="' + INK + '" stroke-width="8"/><path d="M8 50h52M20 50c0 -12 40 -12 40 0M20 50c0 12 40 12 40 0" fill="none" stroke="#E8B33A" stroke-width="4.5"/>' + P('M58 45L92 30V70L58 55Z', '#E8B33A') + [32, 40, 48].map(function (x) { return '<rect x="' + (x - 3) + '" y="30" width="6" height="16" rx="1.5" fill="#D59A1E"' + O + '/><circle cx="' + x + '" cy="28" r="3.2" fill="#FFF3C4" stroke="' + INK + '" stroke-width="1.2"/>'; }).join('') + '<rect x="2" y="47" width="8" height="6" rx="2" fill="#B8BEC6"' + O + '/>'; },
    basun: function () { return '<path d="M10 44h62M10 56h56M10 44c-6 0 -6 12 0 12" fill="none" stroke="' + INK + '" stroke-width="7"/><path d="M10 44h62M10 56h56M10 44c-6 0 -6 12 0 12" fill="none" stroke="#E8B33A" stroke-width="3.6"/><path d="M72 44c10 0 10 -14 0 -14h-10" fill="none" stroke="' + INK + '" stroke-width="7"/><path d="M72 44c10 0 10 -14 0 -14h-10" fill="none" stroke="#E8B33A" stroke-width="3.6"/>' + P('M64 30L34 18V48L64 36Z', '#E8B33A') + '<rect x="28" y="52" width="4" height="8" fill="#B8BEC6"/>'; },
    tuba: function () { return P('M50 40C24 40 18 60 22 74C26 90 74 90 78 74C82 60 76 40 50 40Z', '#E8B33A') + '<ellipse cx="50" cy="68" rx="14" ry="9" fill="#FFF9EC"' + O + '/>' + P('M38 42L28 6H72L62 42Z', '#F2C75C') + '<ellipse cx="50" cy="6" rx="22" ry="4" fill="#B8862A"' + O + '/>' + [64, 70, 76].map(function (x) { return '<rect x="' + (x - 2.5) + '" y="44" width="5" height="12" rx="1" fill="#D59A1E"' + O + '/>'; }).join(''); },
    trommesaet: function () { return '<path d="M82 26v66M74 92h16M20 60v32M12 92h16" stroke="' + INK + '" stroke-width="2.5"/><ellipse cx="82" cy="26" rx="15" ry="3.5" fill="#E8C35A"' + O + '/>' + '<circle cx="50" cy="66" r="25" fill="#D9473B"' + O + '/><circle cx="50" cy="66" r="18" fill="#FFF3E6"' + O + '/>' + P('M8 50h24v12c0 4 -24 4 -24 0z', '#D5DCE3') + '<ellipse cx="20" cy="50" rx="12" ry="3.5" fill="#fff"' + O + '/>' + P('M52 30h22v10c0 4 -22 4 -22 0z', '#D9473B') + '<ellipse cx="63" cy="30" rx="11" ry="3" fill="#fff"' + O + '/><path d="M30 34l14 10M36 30l12 14" stroke="#B5651D" stroke-width="3" stroke-linecap="round"/>'; },
    xylofon: function () { var c = ['#E85D5D', '#F39C4A', '#F7C548', '#8DB36A', '#6BB8E0', '#7E8CE0', '#B48CDE']; return '<path d="M10 40L90 52M10 84L90 70" stroke="#7A5A3E" stroke-width="4" stroke-linecap="round"/>' + c.map(function (col, i) { var x = 14 + i * 11, top = 36 + i * 2.2, bot = 88 - i * 2.4; return '<rect x="' + x + '" y="' + top + '" width="9" height="' + (bot - top) + '" rx="2" fill="' + col + '"' + O + '/>'; }).join('') + '<path d="M30 6l14 26M70 6l-14 26" stroke="#7A5A3E" stroke-width="3" stroke-linecap="round"/><circle cx="44" cy="32" r="5" fill="#C23B30"' + O + '/><circle cx="56" cy="32" r="5" fill="#C23B30"' + O + '/>'; },
    baekken: function () { return '<path d="M50 40v52M36 94l14 -12 14 12" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><ellipse cx="50" cy="38" rx="40" ry="11" fill="#E8C35A"' + O + '/><ellipse cx="50" cy="36" rx="10" ry="4" fill="#D4A72C"' + O + '/><path d="M24 40c8 3 44 3 52 0" fill="none" stroke="#B8862A" stroke-width="1.5"/>'; },
    klaver: function () { var k = ''; for (var i = 0; i < 10; i++) k += '<rect x="' + (14 + i * 7.2) + '" y="56" width="7.2" height="12" fill="#fff" stroke="' + INK + '" stroke-width=".8"/>'; [0, 1, 3, 4, 5, 7, 8].forEach(function (i) { k += '<rect x="' + (19 + i * 7.2) + '" y="56" width="4.4" height="7" fill="#2B2B2B"/>'; }); return P('M10 14h80v74h-80z', '#5A3A22') + '<rect x="10" y="50" width="80" height="6" fill="#3B2412"/>' + k + '<rect x="30" y="22" width="40" height="18" rx="2" fill="#F4E3C1"' + O + '/><path d="M36 28h28M36 34h20" stroke="#7A5A3E" stroke-width="1.5"/><path d="M14 88v8M86 88v8" stroke="' + INK + '" stroke-width="4"/>'; },
    keyboard: function () { var k = ''; for (var i = 0; i < 12; i++) k += '<rect x="' + (10 + i * 6.7) + '" y="50" width="6.7" height="14" fill="#fff" stroke="' + INK + '" stroke-width=".8"/>'; [0, 1, 3, 4, 5, 7, 8, 10].forEach(function (i) { k += '<rect x="' + (14.5 + i * 6.7) + '" y="50" width="4" height="8" fill="#2B2B2B"/>'; }); return '<path d="M24 70l52 26M76 70l-52 26" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' + P('M4 38h92v30h-92z', '#3F4650') + k + '<circle cx="16" cy="44" r="2.5" fill="#6BB8E0"/><circle cx="24" cy="44" r="2.5" fill="#F7C548"/><rect x="60" y="41" width="28" height="5" rx="1" fill="#9FF0B5"/>'; }
  };
  function instSVG(id, size) { var x = M.instrument(id); return '<svg viewBox="0 0 100 100" width="' + (size || 120) + '" height="' + (size || 120) + '" role="img" aria-label="' + esc(x ? x.name : id) + '">' + INST[id]() + '</svg>'; }

  /* ---------- keyboard (DOM) ---------- */
  // o: { onKey(value, btn, midi), value(midi) → string, marks: { midi: true }, cls, labels }
  function keyboard(lo, hi, o) {
    o = o || {};
    var whites = M.naturals(lo, hi), n = whites.length;
    var kb = h('div', { class: 'ts-kb' + (o.cls ? ' ' + o.cls : '') + (o.onKey ? ' play' : ''), role: o.onKey ? 'group' : 'img', 'aria-label': o.onKey ? null : whites.filter(function (m) { return o.marks && o.marks[m]; }).map(M.name).join(', ') });
    whites.forEach(function (m) {
      var v = o.value ? o.value(m) : String(m), cls = 'ts-wk' + (o.marks && o.marks[m] ? ' mark' : '');
      var lab = o.labels === false ? null : h('span', {}, M.name(m)), key;
      if (o.onKey) key = h('button', { type: 'button', class: cls, 'data-v': v, 'data-m': m, 'aria-label': M.name(m), onclick: function () { o.onKey(v, key, m); } }, lab);
      else key = h('div', { class: cls, 'data-m': m }, lab);
      kb.appendChild(key);
    });
    whites.forEach(function (m, i) {
      if (i === n - 1 || [0, 2, 5, 7, 9].indexOf(M.pc(m)) < 0) return;
      var w = 58 / n, left = (i + 1) * 100 / n - w / 2;
      kb.appendChild(h('span', { class: 'ts-bk' + (o.marks && o.marks[m + 1] ? ' mark' : ''), 'data-m': m + 1, 'aria-hidden': 'true', style: 'left:' + left + '%;width:' + w + '%' }));
    });
    return kb;
  }

  /* ================= TEXTS FOR TASKS ================= */
  function needsSound(tk) { return ['higher', 'step', 'direction', 'dyn', 'durmol', 'hearMelody'].indexOf(tk.kind) >= 0; }
  function quiet(tk) { return needsSound(tk) && !soundOn(); }
  function promptOf(tk) {
    var P2 = S.prompt, k = tk.kind;
    if (quiet(tk) && S.promptQuiet[k]) return t(S.promptQuiet[k], { notes: tk.melodies ? M.seq(tk.melodies[+tk.answer]) : '' });
    switch (k) {
      case 'beat': return tk.stopAt < tk.beats ? P2.beatStop : P2.beatAll;
      case 'valueBeats': return M.DUR[tk.dur].rest ? P2.valueBeatsRest : P2.valueBeatsNote;
      case 'fill': case 'whichBar': return t(P2[k], { ts: tk.ts });
      case 'noteFind': return t(P2.noteFind, { letter: tk.letter });
      case 'build': case 'chordNotes': return t(P2[k], { chord: M.chordLabel(tk.chord) });
      case 'semis': case 'intervalFromName': case 'halfsteps': return t(P2[k], { a: M.name(tk.notes[0]), b: M.name(tk.notes[1]) });
      case 'degree': return t(P2.degree, { n: tk.n });
      case 'bandQuiz': return tk.q;
    }
    return P2[k];
  }
  function label(tk, o) {
    if (S.labels[tk.kind]) return S.labels[tk.kind][o];
    if (tk.kind === 'valueBeats' || tk.kind === 'sum') return t(S.beats, { n: o });
    if (tk.kind === 'fill') return M.DUR[o].name;
    if (tk.kind === 'noteFind' || tk.kind === 'hearMelody') return t(S.number, { n: +o + 1 });
    if (tk.kind === 'whichBar') return t(S.barN, { n: +o + 1 });
    return o;
  }
  function whereText(m) {
    var p = M.staffPos(m), W = S.explain.where;
    if (p >= 0 && p <= 8) return p % 2 === 0 ? t(W.line, { n: p / 2 + 1 }) : t(W.space, { n: (p + 1) / 2 });
    if (p === -1) return W.below;
    if (p === 9) return W.above;
    var n = M.ledgers(p).length;
    if (p < 0) return n === 1 ? W.ledgerBelow1 : t(W.ledgerBelowN, { n: n });
    return n === 1 ? W.ledgerAbove1 : t(W.ledgerAboveN, { n: n });
  }
  function itemList(ids) { return ids.map(function (id) { return M.DUR[id].name; }).join(', '); }
  var beatNo = -1, lastBeat = '';
  function explain(tk) {
    var E = S.explain, x, n;
    switch (tk.kind) {
      case 'beat': // a new text each time, never the same twice in a row
        if (!tk._text) { var list = tk.stopAt < tk.beats ? E.beatPause : E.beat; beatNo++; tk._text = list[beatNo % list.length]; if (tk._text === lastBeat) tk._text = list[(beatNo + 1) % list.length]; lastBeat = tk._text; }
        return tk._text;
      case 'rhythm': return t(E.rhythm, { list: itemList(tk.ids) });
      case 'valueBeats': return t(E.valueBeats, { name: M.DUR[tk.dur].name, beats: M.beatsText(M.DUR[tk.dur].u) });
      case 'valueName': return t(E.valueName, { name: M.DUR[tk.dur].name, beats: M.beatsText(M.DUR[tk.dur].u) });
      case 'fill': return t(E.fill, { name: M.DUR[tk.answer].name, beats: M.beatsText(M.DUR[tk.answer].u) });
      case 'sum': return t(E.sum, { list: tk.ids.map(function (id) { return M.beatsText(M.DUR[id].u); }).join(' + '), beats: tk.answer });
      case 'timeSig': return t(E.timeSig, { beats: M.beatsText(M.sumU(tk.bar)), ts: tk.answer });
      case 'whichBar': return t(E.whichBar, { n: +tk.answer + 1, beats: M.beatsText(M.TIME[tk.ts]) });
      case 'noteKey': case 'noteName': return t(E.note, { name: M.name(tk.m), where: whereText(tk.m) });
      case 'noteFind': return t(E.noteFind, { name: tk.letter, where: whereText(tk.notes[+tk.answer]) });
      case 'higher': case 'step': case 'direction': case 'dyn': return E[tk.kind][tk.answer];
      case 'dynSign': x = M.DYNAMICS.filter(function (d) { return d.sign === tk.sign; })[0]; return t(E.dynSign, { sign: x.sign, name: x.name, meaning: x.meaning });
      case 'instrPic': x = M.instrument(tk.inst); return t(E.instrPic, { art: art(x), name: x.name, desc: x.desc });
      case 'instrFamily': x = M.instrument(tk.inst); n = M.family(x.fam); return t(E.instrFamily, { Art: cap(art(x)), name: x.name, fam: n.def, how: n.how });
      case 'instrDesc': x = M.instrument(tk.inst); return t(E.instrDesc, { art: art(x), name: x.name });
      case 'instrLow': x = M.INSTRUMENTS.filter(function (i) { return i.name === tk.answer; })[0]; return t(E.instrLow, { art: art(x), name: x.name });
      case 'windType': x = M.instrument(tk.inst); return t(E.windType, { Art: cap(art(x)), name: x.name, wind: M.WIND[x.wind] });
      case 'bandQuiz': return tk.explain;
      case 'build': return t(E.build, { chord: M.chordLabel(tk.chord), notes: M.seq(M.chordNotes(tk.chord)) });
      case 'chordName': return t(E.chordName, { root: M.name(M.chord(tk.chord).root), chord: M.chordLabel(tk.chord), notes: M.seq(M.chordNotes(tk.chord)) });
      case 'durmol': return E.durmol[tk.answer];
      case 'chordNotes': return t(E.chordNotes, { chord: M.chordLabel(tk.chord), notes: tk.answer });
      case 'intervalName': case 'intervalFromName': return t(E.interval, { a: M.name(tk.notes[0]), b: M.name(tk.notes[1]), n: M.intervalNumber(tk.notes[0], tk.notes[1]), name: tk.answer });
      case 'third': return t(E.third, { a: M.name(tk.notes[0]), b: M.name(tk.notes[1]), n: tk.notes[1] - tk.notes[0], q: tk.answer });
      case 'semis': return t(E.semis, { a: M.name(tk.notes[0]), b: M.name(tk.notes[1]), n: tk.answer });
      case 'scaleMissing': return t(E.scaleMissing, { a: tk.answer });
      case 'degree': return t(E.degree, { n: tk.n, a: tk.answer });
      case 'halfsteps': return t(E.halfsteps[tk.answer], { a: M.name(tk.notes[0]), b: M.name(tk.notes[1]) });
      case 'readMelody': return t(E.readMelody, { notes: tk.answer });
      case 'hearMelody': return t(E.hearMelody, { notes: M.seq(tk.melodies[+tk.answer]) });
    }
    return '';
  }
  function hint(tk, band) {
    var H = S.hint, q = quiet(tk);
    switch (tk.kind) {
      case 'valueBeats': return band === 'U' ? H.valueBeatsU : H.valueBeats;
      case 'noteKey': case 'noteFind': case 'noteName': return band === 'U' ? H.notesU : H.notes;
      case 'higher': return q ? H.higherQuiet : H.higher;
      case 'direction': return q ? H.directionQuiet : H.direction;
      case 'durmol': return q ? H.durmolQuiet : H.durmol;
      case 'hearMelody': return q ? H.hearMelodyQuiet : H.hearMelody;
      case 'instrPic': case 'instrFamily': case 'instrDesc': return H.instr;
      case 'intervalFromName': return H.intervalName;
      case 'scaleMissing': case 'degree': return H.scale;
    }
    return H[tk.kind] || '';
  }

  /* ================= HUB API ================= */
  function bandOf(d) { return d.band || (Core.profile() || {}).band || 'M'; }
  function summary(d) {
    var band = bandOf(d), n = 0, list = M.ROUTES.filter(function (r) { return r.b === band; });
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    M.ROUTES.forEach(function (r) { var rs = (d.routes || {})[r.id]; if (rs && rs.plays) rows.push([r.name + ' (' + r.b + ')', rs.stars + '/3', rs.best + ' %']); });
    return { head: S.reportHead, rows: rows };
  }
  function progress(d) {
    var plays = 0, bands = { M: [], U: [] };
    M.ROUTES.forEach(function (r) { var rs = (d.routes || {})[r.id] || {}; plays += rs.plays || 0; bands[r.b].push(rs.stars || 0); });
    return { plays: plays, bands: bands };
  }
  function recruited(d) { return M.ROUTES.filter(function (r) { return (((d.routes || {})[r.id]) || {}).stars > 0; }); }
  function collection(d) { return { n: recruited(d).length, max: M.ROUTES.length }; }
  // One self-contained task for the daily challenge (Math.random is seeded by the hub)
  function quickTask(band, d) {
    d = d || {}; band = band === 'U' ? 'U' : 'M';
    var list = M.ROUTES.filter(function (r) { return r.b === band; }), stars = function (r) { return (((d.routes || {})[r.id]) || {}).stars || 0; };
    var min = Math.min.apply(null, list.map(stars)), weak = list.filter(function (r) { return stars(r) === min; });
    var r = pick(weak), kind = pick(M.QUICK[r.kind]);
    return quickFrom(kind, band);
  }
  function quickFrom(kind, band) {
    var tk, q, html = '', opts, ans, x;
    if (kind === 'noteFind') { // name the note on a small staff
      var m = pick(M.naturals(band === 'M' ? 60 : 57, band === 'M' ? 72 : 84));
      tk = { kind: 'noteName', m: m, answer: M.name(m) };
      q = S.quickNote; html = staffSVG([{ ms: [m] }], { label: '' }); ans = M.name(m); opts = M.options(ans, M.LETTERS, 4);
    } else {
      tk = M.gen[kind](band, 0); ans = tk.answer; opts = tk.options.slice(); q = promptOf(tk);
      if (kind === 'valueBeats' || kind === 'sum') { ans = label(tk, tk.answer); opts = tk.options.map(function (o) { return label(tk, o); }); }
      if (kind === 'valueBeats' || kind === 'valueName') html = symbolSVG(tk.dur);
      if (kind === 'valueBeats') q = S.quickBeats;
      if (kind === 'sum') html = rhythmSVG(tk.ids, { noBars: true });
      if (kind === 'dynSign') html = dynSVG(tk.sign);
      if (kind === 'instrFamily' || kind === 'windType') { x = M.instrument(tk.inst); html = instSVG(tk.inst, 140); q = t(kind === 'windType' ? S.quickWind : S.quickFamily, { art: art(x), name: x.name }); }
      if (kind === 'scaleMissing') html = staffSVG(M.C_DUR.map(function (mm, i) { return i === tk.miss ? { q: true } : { ms: [mm], whole: true }; }), { colW: 30 });
    }
    return { q: q, html: html || undefined, options: opts, answer: ans, hint: hint(tk, band), explain: explain(tk), speak: q + ' ' + opts.join(', '), lang: 'da' };
  }

  /* ================= LIFECYCLE ================= */
  function mount(container) { app = container; clock = setInterval(function () { if ((st || SB) && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function stopAll() { clearTimers(); stopRhythm(); stopSandbox(); Core.stopSpeaking(); hush(); }
  function unmount() { stopAll(); clearInterval(clock); st = null; SB = null; el = {}; Core.save(); }

  /* ================= MAP ================= */
  function showMap() {
    stopAll(); st = null; SB = null; el = {};
    var d = data(), list = M.ROUTES.filter(function (r) { return r.b === d.band; }), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (routeState(list[i].id).stars < 3) { nextIdx = i; break; }
    function bandBtn(code, lab) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, lab);
    }
    var crew = recruited(d);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen ts-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back),
        h('div', { class: 'row' }, [h('button', { type: 'button', class: 'btn secondary ts-bandbtn', onclick: showBand }, S.bandBtn + ' (' + crew.length + ')'),
          h('button', { type: 'button', class: 'btn secondary ts-sandbtn', onclick: showSandbox }, S.sandboxBtn)])]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'ts-stage-strip', 'aria-hidden': 'true' }, list.map(function (r) {
        var on = routeState(r.id).stars > 0;
        return h('span', { class: 'ts-slot' + (on ? ' on' : ''), html: instSVG(r.musician, 44) });
      })),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)]),
        h('button', { type: 'button', class: 'btn ghost ts-calbtn', onclick: function () { showCalibration(showMap); } }, S.calibrateBtn)]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id);
        return h('button', { type: 'button', class: 'rs-world ts-route' + (i === nextIdx ? ' next' : ''), 'data-route': r.id, onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('span', { class: 'ts-route-icon' + (rs.stars ? ' on' : ''), 'aria-hidden': 'true', html: instSVG(r.musician, 40) }),
          h('strong', {}, r.name), h('span', { class: 'rs-world-desc' }, r.desc), h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      })),
      h('p', { class: 'muted ts-fiction' }, S.fictional)
    ]));
  }

  /* ================= THE BAND (collection) ================= */
  function showBand() {
    stopAll();
    var d = data(), crew = recruited(d);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen ts-bandscreen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.bandTitle)]),
      h('p', { class: 'lead' }, crew.length ? t(S.bandCount, { n: crew.length, max: M.ROUTES.length }) : S.bandEmpty),
      h('ul', { class: 'ts-band' }, M.ROUTES.map(function (r) {
        var on = crew.indexOf(r) >= 0;
        return h('li', { class: 'card ts-member' + (on ? ' on' : '') }, [
          h('span', { class: 'ts-member-art', html: instSVG(r.musician, 90) }),
          h('strong', {}, S.musicians[r.musician]), h('span', { class: 'muted small' }, on ? M.instrument(r.musician).name : S.missing),
          h('span', { class: 'muted small' }, t(S.from, { route: r.name + ' (' + (r.b === 'M' ? SC.bandM : SC.bandU) + ')' }))
        ]);
      }))
    ]));
  }

  /* ================= CALIBRATION ================= */
  function showCalibration(then) {
    stopAll();
    var beatMs = 600, status = h('p', { class: 'ts-calstatus', role: 'status', 'aria-live': 'polite' }), lamp = h('div', { class: 'ts-beatlamp big', 'aria-hidden': 'true' });
    var goBtn, pad = padButton();
    el = { lamp: lamp, pad: pad, status: status };
    function run() {
      stopRhythm(); status.textContent = ''; goBtn.disabled = true;
      var c = actx(), lead = 400, p0 = now() + lead, a0 = c ? c.currentTime + lead / 1000 : 0, beats = [];
      for (var k = 0; k < 12; k++) {
        beats.push(p0 + k * beatMs);
        (function (k) { if (c) drum(k % 4 ? 'click' : 'accent', a0 + k * beatMs / 1000); rLater(function () { flash(lamp); lamp.textContent = String(k % 4 + 1); }, p0 + k * beatMs - now()); })(k);
      }
      R = { phase: 'calib', expected: beats.slice(4), taps: [], beatMs: beatMs, done: done };
      rLater(judgeNow, p0 + 12 * beatMs - now());
    }
    function done(off) {
      goBtn.disabled = false; lamp.textContent = '';
      if (off === null) { status.textContent = S.calFail; goBtn.textContent = S.calAgain; return; }
      var d = data(); d.offset = off; Core.save(); Core.play('correct');
      status.innerHTML = ''; status.appendChild(h('strong', {}, S.calDone)); status.appendChild(h('span', { class: 'muted small' }, ' ' + t(S.calResult, { ms: off })));
      goBtn.replaceWith(h('button', { type: 'button', class: 'btn primary ts-cal-next', onclick: then }, S.calNext));
    }
    goBtn = h('button', { type: 'button', class: 'btn primary ts-cal-go', onclick: run }, S.calStart);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen center ts-cal' }, [
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'default', outfit: OUTFIT, size: 120 }) }), h('div', {}, [h('h1', {}, S.calTitle), h('p', { class: 'lead' }, S.calText)])]),
      !soundOn() ? h('p', { class: 'notice' }, S.quietRhythm) : null,
      h('div', { class: 'ts-calrow' }, [lamp, pad]), status,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost ts-cal-skip', onclick: function () { var d = data(); if (d.offset === undefined) d.offset = 0; Core.save(); then(); } }, S.calSkip), goBtn])
    ]));
  }

  /* ================= PLAY ================= */
  function startRound(route) {
    stopAll();
    if ((route.kind === 'beat' || route.kind === 'rhythm') && data().offset === undefined) return showCalibration(function () { startRound(route); });
    st = { route: route, tasks: M.buildRound(route.id), i: 0, results: [], attempt: 0, locked: false };
    app.innerHTML = '';
    el = {};
    el.step = h('span', { class: 'rs-wave' });
    el.soundBtn = h('button', { type: 'button', class: 'rs-iconbtn ts-soundbtn', onclick: toggleSound });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: ICON.back, onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, route.name), el.step]), el.soundBtn,
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: ICON.speak, onclick: readTask }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    soundBtnState();
    el.scene = h('div', { class: 'oj-scene ts-scene' });
    el.scene.innerHTML = '<div class="ts-lights" aria-hidden="true"><i></i><i></i><i></i></div><div class="ts-floor" aria-hidden="true"></div>';
    var crew = h('div', { class: 'ts-crew', 'aria-hidden': 'true' });
    M.ROUTES.filter(function (r) { return r.b === route.b && routeState(r.id).stars > 0; }).slice(0, 5).forEach(function (r) { crew.appendChild(h('span', { html: instSVG(r.musician, 60) })); });
    el.scene.appendChild(crew);
    el.bob = h('div', { class: 'oj-bob ts-bob' }); el.bubble = h('div', { class: 'oj-bubble', role: 'status', 'aria-live': 'polite' });
    el.scene.appendChild(el.bob); el.scene.appendChild(el.bubble);
    el.task = h('div', { class: 'oj-task' });
    el.root = h('div', { class: 'oj-play ts-play k-' + route.kind }, [hud, el.scene, h('div', { class: 'oj-task-wrap' }, el.task)]);
    app.appendChild(el.root);
    setBob('hello', pick(S.bobStart));
    showTask();
  }
  function soundBtnState() {
    var on = soundOn();
    el.soundBtn.innerHTML = on ? ICON.sound : ICON.mute;
    el.soundBtn.setAttribute('aria-label', on ? S.soundToggleOff : S.soundToggleOn); el.soundBtn.title = on ? S.soundToggleOff : S.soundToggleOn;
    el.soundBtn.setAttribute('aria-pressed', on ? 'false' : 'true');
  }
  function toggleSound() {
    Core.setting('sound', !soundOn());
    if (!soundOn()) hush();
    soundBtnState();
    if (st && !st.locked) renderTask();
  }
  function setBob(expr, text) {
    if (!el.bob) return;
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: OUTFIT, size: 200 });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text) { el.bubble.textContent = text; el.bubble.classList.add('show'); clearTimeout(el.bubbleTimer); el.bubbleTimer = setTimeout(function () { el.bubble && el.bubble.classList.remove('show'); }, 3800); }
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ), h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }
  function task() { return st && st.tasks[st.i]; }
  function readTask() {
    var tk = task(); if (!tk) return;
    var extra = tk.kind === 'instrDesc' ? M.instrument(tk.inst).desc + '. ' : '';
    Core.speak(promptOf(tk) + ' ' + extra + (tk.options || []).map(function (o) { return label(tk, o); }).join('. '));
  }
  function showTask() {
    clearTimers(); stopRhythm();
    var tk = task(); if (!tk) return finish();
    st.attempt = 0; st.locked = false;
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    renderTask();
    el.task.classList.remove('enter'); void el.task.offsetWidth; el.task.classList.add('enter');
  }
  function renderTask() {
    clearTimers(); stopRhythm(); hush();
    var tk = task(); if (!tk) return;
    el.task.innerHTML = '';
    el.task.appendChild(h('p', { class: 'oj-prompt' }, promptOf(tk)));
    if (quiet(tk)) el.task.appendChild(h('p', { class: 'ts-quiet small muted' }, S.quietNote));
    el.body = h('div', { class: 'oj-body ts-body k-' + tk.kind }); el.task.appendChild(el.body);
    el.feedback = h('div', { class: 'oj-feedback', role: 'status', 'aria-live': 'polite' }); el.task.appendChild(el.feedback);
    (RENDER[tk.kind] || renderChoice)(tk);
  }

  /* ---------- renderers ---------- */
  function card(content, cls) { return h('div', { class: 'ts-card' + (cls ? ' ' + cls : ''), html: typeof content === 'string' ? content : null }, typeof content === 'string' ? null : content); }
  function optionButtons(tk, cls, inner) {
    var box = h('div', { class: 'oj-options ' + (cls || '') });
    tk.options.forEach(function (o, k) {
      var b = h('button', { type: 'button', class: 'oj-opt' + (inner ? ' ts-svgopt' : ''), 'data-v': o, onclick: function () { answer(o, b); } });
      if (inner) { b.innerHTML = inner(o, k); b.appendChild(h('span', { class: 'visually-hidden' }, label(tk, o))); } else b.textContent = label(tk, o);
      box.appendChild(b);
    });
    return box;
  }
  function listenBtn(fn, auto) {
    var b = h('button', { type: 'button', class: 'btn secondary ts-listen', onclick: fn }, [h('span', { class: 'ico', html: ICON.ear }), S.listen]);
    if (auto) later(fn, 450);
    return h('div', { class: 'row center ts-listenrow' }, b);
  }
  function renderChoice(tk) { el.body.appendChild(optionButtons(tk, tk.options.length > 3 ? 'ts-grid' : '')); }
  var RENDER = {
    beat: renderRhythm, rhythm: renderRhythm,
    valueBeats: function (tk) { el.body.appendChild(card(symbolSVG(tk.dur), 'ts-symbol')); el.body.appendChild(optionButtons(tk, 'ts-grid')); },
    valueName: function (tk) { el.body.appendChild(card(symbolSVG(tk.dur), 'ts-symbol')); el.body.appendChild(optionButtons(tk, 'col')); },
    fill: function (tk) {
      el.body.appendChild(card(rhythmSVG(tk.bar, { ts: tk.ts, miss: tk.miss, cls: 'ts-bar' }), 'ts-wide'));
      el.body.appendChild(optionButtons(tk, 'ts-grid', function (o) { return symbolSVG(o); }));
    },
    sum: function (tk) { el.body.appendChild(card(rhythmSVG(tk.ids, { noBars: true, cls: 'ts-bar' }), 'ts-wide')); el.body.appendChild(optionButtons(tk)); },
    timeSig: function (tk) { el.body.appendChild(card(rhythmSVG(tk.bar, { cls: 'ts-bar' }), 'ts-wide')); el.body.appendChild(optionButtons(tk)); },
    whichBar: function (tk) {
      el.body.appendChild(card(h('strong', { class: 'ts-tsbig' }, tk.ts)));
      el.body.appendChild(optionButtons(tk, 'col ts-bars', function (o) { return '<span class="ts-optno">' + (+o + 1) + '</span>' + rhythmSVG(tk.bars[+o], { barU: M.TIME[tk.ts], cls: 'ts-bar' }); }));
    },
    noteKey: function (tk) {
      el.body.appendChild(card(staffSVG([{ ms: [tk.m] }], { cls: 'ts-staff', label: '' }), 'ts-wide'));
      el.body.appendChild(keyboard(60, 72, { onKey: keyAnswer, cls: 'ts-answerkb' }));
    },
    noteName: function (tk) {
      el.body.appendChild(card(staffSVG([{ ms: [tk.m] }], { cls: 'ts-staff', label: '' }), 'ts-wide'));
      el.body.appendChild(keyboard(60, 71, { onKey: keyAnswer, value: M.name, cls: 'ts-answerkb' }));
    },
    noteFind: function (tk) { el.body.appendChild(optionButtons(tk, 'ts-three', function (o) { return staffSVG([{ ms: [tk.notes[+o]] }], { cls: 'ts-staff', colW: 40 }); })); },
    higher: soundOrStaff, step: soundOrStaff, direction: soundOrStaff,
    dyn: function (tk) {
      if (quiet(tk)) {
        el.body.appendChild(h('div', { class: 'ts-two' }, tk.levels.map(function (lv, k) {
          return card('<span class="ts-optno">' + (k + 1) + '</span>' + staffSVG(tk.notes.map(function (m) { return { ms: [m] }; }), { colW: 34 }) + dynSVG(lv), 'ts-dyncard');
        })));
      } else el.body.appendChild(listenBtn(function () { playDyn(tk); }, true));
      el.body.appendChild(optionButtons(tk, 'ts-two'));
    },
    dynSign: function (tk) { el.body.appendChild(card(dynSVG(tk.sign), 'ts-symbol')); el.body.appendChild(optionButtons(tk, 'col')); },
    instrPic: function (tk) { el.body.appendChild(card(instSVG(tk.inst, 150), 'ts-inst')); el.body.appendChild(optionButtons(tk)); },
    instrFamily: function (tk) { el.body.appendChild(card(instSVG(tk.inst, 130) + '<strong>' + esc(cap(M.instrument(tk.inst).name)) + '</strong>', 'ts-inst')); el.body.appendChild(optionButtons(tk, 'ts-grid')); },
    instrDesc: function (tk) { el.body.appendChild(card(h('p', {}, M.instrument(tk.inst).desc), 'ts-text')); el.body.appendChild(optionButtons(tk)); },
    instrLow: function (tk) { el.body.appendChild(optionButtons(tk, 'ts-three', function (o) { var x = M.INSTRUMENTS.filter(function (i) { return i.name === o; })[0]; return instSVG(x.id, 90) + '<span class="ts-optlabel">' + esc(o) + '</span>'; })); },
    windType: function (tk) { el.body.appendChild(card(instSVG(tk.inst, 130) + '<strong>' + esc(cap(M.instrument(tk.inst).name)) + '</strong>', 'ts-inst')); el.body.appendChild(optionButtons(tk, 'ts-two')); },
    bandQuiz: function (tk) { el.body.appendChild(optionButtons(tk, 'col')); },
    build: renderBuild,
    chordName: function (tk) { el.body.appendChild(card(staffSVG([{ ms: M.chordNotes(tk.chord), whole: true }], { cls: 'ts-staff', colW: 60 }), 'ts-wide')); el.body.appendChild(optionButtons(tk, 'ts-grid')); },
    durmol: function (tk) {
      if (quiet(tk)) el.body.appendChild(keyboard(60, 79, { marks: marks(tk.notes), cls: 'ts-showkb' }));
      else el.body.appendChild(listenBtn(function () { playChord(tk.notes); }, true));
      el.body.appendChild(optionButtons(tk, 'ts-two'));
    },
    chordNotes: function (tk) { el.body.appendChild(optionButtons(tk, 'col')); },
    intervalName: function (tk) { el.body.appendChild(card(staffSVG(tk.notes.map(function (m) { return { ms: [m] }; }), { cls: 'ts-staff', colW: 56 }), 'ts-wide')); el.body.appendChild(optionButtons(tk, 'ts-grid')); },
    third: function (tk) {
      el.body.appendChild(keyboard(60, 79, { marks: marks(tk.notes), cls: 'ts-showkb' }));
      if (soundOn()) el.body.appendChild(listenBtn(function () { playSeq(tk.notes, 0.5); }, false));
      el.body.appendChild(optionButtons(tk, 'ts-two'));
    },
    semis: function (tk) { el.body.appendChild(keyboard(60, 79, { marks: marks(tk.notes), cls: 'ts-showkb' })); el.body.appendChild(optionButtons(tk, 'ts-grid')); },
    intervalFromName: function (tk) { el.body.appendChild(card(h('strong', { class: 'ts-big' }, M.name(tk.notes[0]) + ' → ' + M.name(tk.notes[1])))); el.body.appendChild(optionButtons(tk, 'ts-grid')); },
    scaleMissing: function (tk) { el.body.appendChild(card(staffSVG(M.C_DUR.map(function (m, i) { return i === tk.miss ? { q: true } : { ms: [m], whole: true }; }), { cls: 'ts-staff', colW: 34 }), 'ts-wide')); el.body.appendChild(optionButtons(tk, 'ts-grid')); },
    degree: function (tk) { el.body.appendChild(optionButtons(tk, 'ts-grid')); },
    halfsteps: function (tk) { el.body.appendChild(keyboard(60, 72, { marks: marks(tk.notes), cls: 'ts-showkb' })); el.body.appendChild(optionButtons(tk, 'ts-two')); },
    readMelody: function (tk) { el.body.appendChild(card(staffSVG(tk.notes.map(function (m) { return { ms: [m] }; }), { cls: 'ts-staff', colW: 40 }), 'ts-wide')); el.body.appendChild(optionButtons(tk, 'col')); },
    hearMelody: function (tk) {
      if (!quiet(tk)) el.body.appendChild(listenBtn(function () { playSeq(tk.melodies[+tk.answer], 0.45); }, true));
      el.body.appendChild(optionButtons(tk, 'col ts-bars', function (o) { return '<span class="ts-optno">' + (+o + 1) + '</span>' + staffSVG(tk.melodies[+o].map(function (m) { return { ms: [m] }; }), { cls: 'ts-staff', colW: 36 }); }));
    }
  };
  function marks(ms) { var o = {}; ms.forEach(function (m) { o[m] = true; }); return o; }
  function soundOrStaff(tk) {
    if (quiet(tk)) {
      var cols = tk.notes.map(function (m, k) { return { ms: [m], label: tk.kind === 'direction' ? null : String(k + 1) }; });
      el.body.appendChild(card(staffSVG(cols, { cls: 'ts-staff', colW: tk.kind === 'direction' ? 40 : 60 }), 'ts-wide'));
    } else el.body.appendChild(listenBtn(function () { playSeq(tk.notes, tk.kind === 'direction' ? 0.45 : 0.8); }, true));
    el.body.appendChild(optionButtons(tk, tk.options.length === 2 ? 'ts-two' : 'ts-three'));
  }
  function playDyn(tk) {
    var c = actx(); if (!c) return; hush();
    var t0 = c.currentTime + 0.08, vols = tk.levels.map(function (lv) { return lv === 'f' ? 0.5 : 0.045; });
    [0, 1].forEach(function (k) { tk.notes.forEach(function (m, i) { note(m, t0 + k * 1.9 + i * 0.4, 0.6, vols[k]); }); drum('kick', t0 + k * 1.9, vols[k] * 1.4); });
  }
  function keyAnswer(v, btn, m) { note(m, undefined, 0.6); answer(v, btn); }
  function renderBuild(tk) {
    var chosen = {}, checkBtn;
    var kb = keyboard(60, 72, { cls: 'ts-answerkb ts-buildkb', onKey: function (v, btn, m) {
      if (st.locked) return;
      chosen[m] = !chosen[m]; btn.classList.toggle('sel', !!chosen[m]); btn.setAttribute('aria-pressed', chosen[m] ? 'true' : 'false');
      if (chosen[m]) note(m, undefined, 0.6);
      checkBtn.disabled = Object.keys(chosen).filter(function (k) { return chosen[k]; }).length < 3;
    } });
    el.body.appendChild(h('div', { class: 'ts-chordname' }, M.chordLabel(tk.chord)));
    el.body.appendChild(kb);
    checkBtn = h('button', { type: 'button', class: 'btn primary ts-check', disabled: true, onclick: function () {
      var ms = Object.keys(chosen).filter(function (k) { return chosen[k]; }).map(Number).sort(function (a, b) { return a - b; });
      playChord2(ms); answer(ms, kb);
    } }, S.check);
    var clearBtn = h('button', { type: 'button', class: 'btn ghost ts-clear', onclick: function () { reset(); } }, S.clear);
    function reset() { chosen = {}; [].forEach.call(kb.querySelectorAll('.ts-wk'), function (b) { b.classList.remove('sel', 'wrong'); b.setAttribute('aria-pressed', 'false'); }); checkBtn.disabled = true; }
    el.build = { reset: reset };
    el.body.appendChild(h('div', { class: 'row center' }, [clearBtn, checkBtn]));
  }
  function playChord2(ms) { var c = actx(); if (!c) return; var t0 = c.currentTime + 0.05; ms.forEach(function (m) { note(m, t0, 1.4, 0.16); }); }

  /* ---------- rhythm tasks ---------- */
  function padButton() {
    var pad = h('button', { type: 'button', class: 'ts-pad', 'aria-label': S.pad, html: '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="62" rx="44" ry="30" fill="#C23B30" stroke="#4A2C17" stroke-width="3"/><path d="M6 62v-14M94 62v-14" stroke="#4A2C17" stroke-width="3"/><ellipse cx="50" cy="48" rx="44" ry="22" fill="#FFF6E8" stroke="#4A2C17" stroke-width="3"/><ellipse cx="50" cy="48" rx="30" ry="14" fill="none" stroke="#E8D9BE" stroke-width="2"/></svg><span>' + esc(S.tapHere) + '</span>' });
    function hit(e) {
      if (e.type === 'keydown') { if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return; }
      e.preventDefault();
      tapAt(now());
    }
    pad.addEventListener('pointerdown', hit);
    pad.addEventListener('keydown', hit);
    return pad;
  }
  function tapAt(ms) {
    if (R && (R.phase === 'countin' || R.phase === 'record' || R.phase === 'calib')) R.taps.push(ms);
    if (el.pad) flash(el.pad, 'hit', 110);
    drum('snare', undefined, 0.7);
  }
  function flash(node, cls, ms) { if (!node) return; cls = cls || 'on'; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); setTimeout(function () { node.classList.remove(cls); }, ms || 140); }
  function stopRhythm() { rTimers.forEach(clearTimeout); rTimers = []; if (R && R.phase !== 'judged') R.phase = 'idle'; }
  function renderRhythm(tk) {
    var isBeat = tk.kind === 'beat';
    el.count = h('div', { class: 'ts-count', 'aria-hidden': 'true' });
    el.lamp = h('div', { class: 'ts-beatlamp', 'aria-hidden': 'true' });
    el.rstatus = h('p', { class: 'ts-rstatus', role: 'status', 'aria-live': 'polite' });
    el.pad = padButton();
    if (!soundOn()) el.body.appendChild(h('p', { class: 'ts-quiet small muted' }, S.quietRhythm));
    if (isBeat) {
      el.dots = h('div', { class: 'ts-dots', 'aria-hidden': 'true' });
      for (var k = 0; k < tk.beats; k++) el.dots.appendChild(h('i', { class: k >= tk.stopAt ? 'pause' : '' }));
      el.body.appendChild(el.dots);
    } else {
      el.notation = h('div', { class: 'ts-card ts-wide ts-notation', html: rhythmSVG(tk.ids, { ts: '4/4', cls: 'ts-bar' }) });
      el.body.appendChild(el.notation);
    }
    el.body.appendChild(h('div', { class: 'ts-rhythm' }, [h('div', { class: 'ts-lampbox' }, [el.lamp, el.count]), el.pad]));
    el.body.appendChild(el.rstatus);
    var go = h('button', { type: 'button', class: 'btn primary ts-go', onclick: function () { if (!st.locked) runTurn(tk); } }, [h('span', { class: 'ico', html: ICON.play }), isBeat ? S.calStart : S.yourTurn]);
    el.body.appendChild(h('div', { class: 'row center ts-rbtns' }, [isBeat ? null : h('button', { type: 'button', class: 'btn secondary ts-listen', onclick: function () { playDemo(tk); } }, [h('span', { class: 'ico', html: ICON.ear }), S.listen]), go]));
    if (!isBeat) later(function () { playDemo(tk); }, 500);
  }
  function setCount(txt) { if (el.count) el.count.textContent = txt; }
  function setRStatus(txt) { if (el.rstatus) el.rstatus.textContent = txt || ''; }
  function hl(i) {
    if (!el.notation) return;
    [].forEach.call(el.notation.querySelectorAll('.ts-n'), function (g) { g.classList.toggle('on', +g.getAttribute('data-i') === i); });
  }
  function noteIndexOf(tk) { var out = []; tk.ids.forEach(function (id, i) { if (!M.DUR[id].rest) out.push(i); }); return out; }
  // Bob plays the rhythm: count-in, then the pattern (sound + highlighted notes + lamp)
  function playDemo(tk) {
    clearTimers(); stopRhythm(); hush();
    var beatMs = 60000 / tk.bpm, bs = beatMs / 1000, c = actx(), lead = 250, p0 = now() + lead, a0 = c ? c.currentTime + lead / 1000 : 0, idx = noteIndexOf(tk), n = tk.bars * 4;
    R = { phase: 'demo', taps: [] };
    setRStatus(S.bobPlays);
    for (var k = 0; k < 4; k++) (function (k) { if (c) drum(k ? 'click' : 'accent', a0 + k * bs, 0.8); rLater(function () { setCount(String(k + 1)); flash(el.lamp); }, p0 + k * beatMs - now()); })(k);
    var s0 = p0 + 4 * beatMs, sa = a0 + 4 * bs;
    for (k = 0; k < n; k++) (function (k) { if (c) drum('hat', sa + k * bs, 0.5); rLater(function () { flash(el.lamp); }, s0 + k * beatMs - now()); })(k);
    tk.onsets.forEach(function (b, j) {
      if (c) drum('block', sa + b * bs, 1);
      rLater(function () { setCount(''); hl(idx[j]); flash(el.pad, 'demo', 160); }, s0 + b * beatMs - now());
    });
    rLater(function () { hl(-1); setCount(''); if (R) R.phase = 'idle'; setRStatus(''); }, s0 + n * beatMs - now());
  }
  // The child's turn: count-in, then taps are recorded and judged
  function runTurn(tk) {
    clearTimers(); stopRhythm(); hush();
    var isBeat = tk.kind === 'beat', beatMs = 60000 / tk.bpm, bs = beatMs / 1000, c = actx(), lead = 300, p0 = now() + lead, a0 = c ? c.currentTime + lead / 1000 : 0;
    var s0 = p0 + 4 * beatMs, sa = a0 + 4 * bs, n = isBeat ? tk.beats : tk.bars * 4;
    var exp = isBeat ? tk.onsets || range(tk.beats) : tk.onsets;
    exp = exp.map(function (b) { return s0 + b * beatMs; });
    var mg = M.margin(beatMs, isBeat ? 1 : tk.minGap);
    R = { phase: 'countin', kind: tk.kind, expected: exp, taps: [], beatMs: beatMs, margin: mg, offset: data().offset || 0, allowMiss: isBeat ? 1 : 0, allowExtra: isBeat ? 1 : 0,
      from: exp[0] - beatMs * 0.5, to: exp[exp.length - 1] + Math.max(mg, beatMs * 0.4) };
    if (el.dots) [].forEach.call(el.dots.children, function (d) { d.classList.remove('now', 'hit', 'miss'); });
    if (el.notation) [].forEach.call(el.notation.querySelectorAll('.ts-n'), function (g) { g.classList.remove('hit', 'miss', 'on'); });
    setRStatus(S.getReady);
    for (var k = 0; k < 4; k++) (function (k) { if (c) drum(k ? 'click' : 'accent', a0 + k * bs, 0.8); rLater(function () { setCount(String(k + 1)); flash(el.lamp); }, p0 + k * beatMs - now()); })(k);
    rLater(function () { if (R) R.phase = 'record'; setCount(''); setRStatus(S.tapNow); }, s0 - beatMs * 0.5 - now());
    for (k = 0; k < n; k++) (function (k) {
      var band = !isBeat || k < tk.stopAt;
      if (c && band) {
        if (isBeat) { drum(k % 2 ? 'snare' : 'kick', sa + k * bs, 0.8); drum('hat', sa + k * bs, 0.5); drum('hat', sa + (k + 0.5) * bs, 0.3); }
        else drum('hat', sa + k * bs, 0.45);
      }
      rLater(function () {
        if (band) flash(el.lamp);
        if (el.dots && band) { var d = el.dots.children[k]; d.classList.add('now'); }
        if (isBeat && k === tk.stopAt) setRStatus(S.bandStops);
      }, s0 + k * beatMs - now());
    })(k);
    rLater(judgeNow, R.to + 120 - now());
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function judgeNow() {
    if (!R) return;
    if (R.phase === 'calib') {
      rTimers.forEach(clearTimeout); rTimers = [];
      R.phase = 'judged';
      var taps = R.taps.filter(function (x) { return x >= R.expected[0] - R.beatMs * 0.4; });
      R.done(M.calibrate(R.expected, taps, R.beatMs));
      return;
    }
    if (R.phase !== 'countin' && R.phase !== 'record') return;
    rTimers.forEach(clearTimeout); rTimers = [];
    R.phase = 'judged';
    var res = M.judgeRhythm(R.expected, R.taps, { margin: R.margin, offset: R.offset, allowMiss: R.allowMiss, allowExtra: R.allowExtra, from: R.from, to: R.to });
    R.result = res; setCount('');
    var tk = task();
    if (el.dots) [].forEach.call(el.dots.children, function (d, k) { d.classList.remove('now'); d.classList.add(res.matched[k] ? 'hit' : 'miss'); });
    if (el.notation && tk) { var idx = noteIndexOf(tk); res.matched.forEach(function (ok, j) { var g = el.notation.querySelector('.ts-n[data-i="' + idx[j] + '"]'); if (g) g.classList.add(ok ? 'hit' : 'miss'); }); }
    var msg = t(S.hitCount, { hits: res.hits, n: R.expected.length });
    if (!res.ok) {
      if (res.miss && res.hits && Math.abs(res.mean) > R.margin * 0.35) msg += ' ' + (res.mean < 0 ? S.tooEarly : S.tooLate);
      else if (res.miss) msg += ' ' + S.tooFew;
      if (res.extra > R.allowExtra) msg += ' ' + S.tooMany;
    }
    setRStatus(msg);
    answer(res, el.pad);
  }

  /* ---------- answers ---------- */
  function isRight(tk, value) {
    if (tk.kind === 'beat' || tk.kind === 'rhythm') return !!value.ok;
    if (tk.kind === 'build') return value.map(M.pc).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(function (a, b) { return a - b; }).join(',') === tk.answer;
    return value === tk.answer;
  }
  function answer(value, node) {
    var tk = task(); if (!tk || st.locked) return;
    var rhythm = tk.kind === 'beat' || tk.kind === 'rhythm';
    if (isRight(tk, value)) {
      st.locked = true;
      var first = st.attempt === 0;
      st.results.push(first ? 1 : 0.5);
      reveal(tk, true);
      Core.play('correct');
      setBob(first ? 'cheering' : 'happy', pick(first ? (rhythm ? S.correctRhythm : S.correct) : S.correctSecond));
      if (['noteKey', 'noteName'].indexOf(tk.kind) >= 0 && first) later(nextTask, 1300);
      else { el.feedback.appendChild(h('button', { type: 'button', class: 'btn primary ts-next', onclick: nextTask }, S.continue)); el.feedback.querySelector('.ts-next').focus(); }
      return;
    }
    st.attempt++;
    Core.play('wrong');
    if (node && !rhythm && tk.kind !== 'build') { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake', 'wrong'); if (node.tagName === 'BUTTON') node.disabled = true; }
    if (tk.kind === 'build') { [].forEach.call(node.querySelectorAll('.ts-wk.sel'), function (b) { b.classList.add('wrong'); }); }
    var binary = tk.options && tk.options.length === 2;
    if (st.attempt === 1 && !binary) {
      setBob('thinking', S.tryAgain);
      el.feedback.innerHTML = '';
      el.feedback.appendChild(h('div', { class: 'oj-rule' }, h('p', {}, hint(tk, st.route.b))));
      if (tk.kind === 'build') later(function () { el.build && el.build.reset(); }, 900);
      return;
    }
    st.results.push(0); st.locked = true;
    reveal(tk, false);
    setBob('encouraging', binary ? S.wrongTwo : null);
    el.feedback.appendChild(h('button', { type: 'button', class: 'btn primary ts-next', onclick: nextTask }, S.continue));
    el.feedback.querySelector('.ts-next').focus();
  }
  function reveal(tk, ok) {
    [].forEach.call(el.body.querySelectorAll('.oj-opt, .ts-wk'), function (b) {
      var v = b.getAttribute('data-v');
      if (v === tk.answer) b.classList.add('right');
      if (tk.kind === 'build' && M.chordNotes(tk.chord).map(M.pc).indexOf(M.pc(+b.getAttribute('data-m'))) >= 0) b.classList.add('right');
      if (b.tagName === 'BUTTON') b.disabled = true;
    });
    [].forEach.call(el.body.querySelectorAll('.ts-go, .ts-check, .ts-clear'), function (b) { b.disabled = true; });
    el.feedback.innerHTML = '';
    var box = h('div', { class: 'oj-rule' + (ok ? '' : ' final') });
    if (!ok && tk.options) box.appendChild(h('p', { class: 'oj-answer' }, t(S.answerWas, { a: label(tk, tk.answer) })));
    box.appendChild(h('p', {}, explain(tk)));
    el.feedback.appendChild(box);
    if (!ok && tk.kind === 'rhythm') later(function () { playDemo(tk); }, 600);
    if (!ok && tk.kind === 'noteKey' || !ok && tk.kind === 'noteName') note(tk.m, undefined, 0.8);
  }
  function nextTask() { if (!st) return; Core.play('step'); st.i++; showTask(); }

  /* ---------- finish ---------- */
  function finish() {
    clearTimers(); stopRhythm();
    var total = st.results.length || 1, sum = st.results.reduce(function (a, b) { return a + b; }, 0), acc = sum / total;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0, first = st.results.filter(function (r) { return r === 1; }).length, route = st.route;
    var rs = routeState(route.id), oldStars = rs.stars, newBest = stars > rs.stars;
    rs.stars = Math.max(rs.stars, stars); rs.best = Math.max(rs.best, Math.round(100 * first / total)); rs.plays++;
    Core.save();
    var badgeNode = Core.roundDone(ID, route.id, oldStars, rs.stars);
    var joined = oldStars === 0 && rs.stars > 0;
    setBob(stars >= 2 ? 'cheering' : 'happy', null);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: OUTFIT, size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox, badgeNode,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { correct: first, total: st.results.length })),
      joined ? h('div', { class: 'ts-joined' }, [h('span', { html: instSVG(route.musician, 56) }), h('strong', {}, t(S.newMusician, { name: S.musicians[route.musician] }))]) : null,
      stars === 0 ? h('p', { class: 'muted' }, S.resultTip) : null,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), h('button', { type: 'button', class: 'btn primary', onclick: function () { startRound(route); } }, S.playAgain)])
    ]));
    app.appendChild(o);
    Core.play(stars ? 'win' : 'click');
    var se = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) { later(function () { se[i].classList.remove('off'); se[i].classList.add('on', 'pop'); Core.play('star'); }, 450 + i * 380); })(i);
    o.querySelector('.btn.primary').focus();
  }

  /* ================= SANDBOX: KOMPONISTEN ================= */
  function loadSong() { var d = data(); return d.song && M.validSong(d.song) ? d.song : M.preset('bob'); }
  function saveSong() { var d = data(); d.song = SB.song; Core.save(); }
  function stopSandbox() { if (SB) { clearInterval(SB.timer); SB.timer = null; SB.playing = false; if (SB.timeouts) SB.timeouts.forEach(clearTimeout); SB.timeouts = []; } }
  function showSandbox() {
    stopAll(); st = null;
    Core.visit(ID + ':sandbox');
    SB = { song: JSON.parse(JSON.stringify(loadSong())), pen: 1, playing: false, timer: null, timeouts: [] };
    app.innerHTML = '';
    var grid = h('div', { class: 'ts-seq' }), tempoVal = h('strong', { class: 'ts-tempo-val' }), msg = h('p', { class: 'ts-sbmsg', role: 'status', 'aria-live': 'polite' });
    var playBtn = h('button', { type: 'button', class: 'btn primary ts-playbtn', onclick: function () { if (SB.playing) stopPlay(); else startPlay(); } });
    function drawPlay() { playBtn.innerHTML = ''; playBtn.appendChild(h('span', { class: 'ico', html: SB.playing ? ICON.stop : ICON.play })); playBtn.appendChild(document.createTextNode(SB.playing ? S.stop : S.play)); }
    function cellText(row, i) { return row === 'mel' ? (SB.song.mel[i] ? M.name(M.SEQ.melody[SB.song.mel[i] - 1]) + (SB.song.mel[i] === 8 ? '²' : '') : '') : ''; }
    function drawGrid() {
      grid.innerHTML = '';
      ['kick', 'snare', 'hat', 'mel'].forEach(function (row) {
        var r = h('div', { class: 'ts-seqrow r-' + row, role: 'group', 'aria-label': S.rows[row] }, h('span', { class: 'ts-rowlabel' }, S.rows[row]));
        for (var i = 0; i < 16; i++) (function (i) {
          var on = row === 'mel' ? SB.song.mel[i] > 0 : SB.song[row][i];
          var b = h('button', { type: 'button', class: 'ts-cell' + (on ? ' on' : '') + (i % 2 === 0 ? ' beat' : '') + (i % 8 === 0 ? ' bar' : '') + (row === 'mel' && on ? ' ts-p' + SB.song.mel[i] : ''), 'data-row': row, 'data-i': i,
            'aria-pressed': on ? 'true' : 'false', 'aria-label': S.rows[row] + ', ' + t(S.stepLabel, { n: i + 1 }) + (row === 'mel' && on ? ', ' + cellText(row, i) : ''),
            onclick: function () { toggleCell(row, i); } }, cellText(row, i));
          r.appendChild(b);
        })(i);
        grid.appendChild(r);
      });
    }
    function toggleCell(row, i) {
      if (row === 'mel') {
        var v = SB.song.mel[i] === SB.pen ? 0 : SB.pen; SB.song.mel[i] = v;
        if (v) note(M.SEQ.melody[v - 1], undefined, 0.4, 0.25);
      } else { SB.song[row][i] = !SB.song[row][i]; if (SB.song[row][i]) drum(row, undefined, 0.8); }
      saveSong(); drawGrid();
    }
    var pens = h('div', { class: 'ts-pens', role: 'group', 'aria-label': S.pens });
    function drawPens() {
      pens.innerHTML = '';
      pens.appendChild(h('span', { class: 'ts-rowlabel' }, S.pens));
      M.SEQ.melody.forEach(function (m, k) {
        var b = h('button', { type: 'button', class: 'ts-pen ts-p' + (k + 1) + (SB.pen === k + 1 ? ' sel' : ''), 'aria-pressed': SB.pen === k + 1 ? 'true' : 'false', 'data-p': k + 1,
          onclick: function () { SB.pen = k + 1; note(m, undefined, 0.4, 0.25); drawPens(); } }, M.name(m) + (k === 7 ? '²' : ''));
        pens.appendChild(b);
      });
      pens.appendChild(h('button', { type: 'button', class: 'ts-pen erase' + (SB.pen === 0 ? ' sel' : ''), 'aria-pressed': SB.pen === 0 ? 'true' : 'false', 'data-p': 0, onclick: function () { SB.pen = 0; drawPens(); } }, S.erase));
    }
    function setTempo(dt) { SB.song.tempo = Math.max(M.SEQ.tempoMin, Math.min(M.SEQ.tempoMax, SB.song.tempo + dt)); tempoVal.textContent = SB.song.tempo; saveSong(); if (SB.playing) { stopPlay(); startPlay(); } }
    function startPlay() {
      stopSandbox(); hush(); SB.playing = true; drawPlay();
      var stepMs = 30000 / SB.song.tempo, c = actx(), p0 = now() + 120, a0 = c ? c.currentTime + 0.12 : 0, k = 0;
      SB.timer = setInterval(function () {
        while (p0 + k * stepMs < now() + 150) {
          var i = k % 16, at = a0 + k * stepMs / 1000;
          if (c) {
            if (SB.song.kick[i]) drum('kick', at, 0.9); if (SB.song.snare[i]) drum('snare', at, 0.8); if (SB.song.hat[i]) drum('hat', at, 0.6);
            if (SB.song.mel[i]) note(M.SEQ.melody[SB.song.mel[i] - 1], at, stepMs / 1000 * 0.95, 0.22);
          }
          (function (i) { SB.timeouts.push(setTimeout(function () { [].forEach.call(grid.querySelectorAll('.ts-cell'), function (b) { b.classList.toggle('now', +b.getAttribute('data-i') === i); }); }, Math.max(0, p0 + k * stepMs - now()))); })(i);
          k++;
        }
        if (SB.timeouts.length > 200) SB.timeouts = SB.timeouts.slice(-40);
      }, 30);
    }
    function stopPlay() { stopSandbox(); hush(); drawPlay(); [].forEach.call(grid.querySelectorAll('.ts-cell.now'), function (b) { b.classList.remove('now'); }); }
    var shareBox = h('div', { class: 'ts-sharebox' });
    function showShare() {
      shareBox.innerHTML = '';
      var code = M.encodeSong(SB.song), ta = h('textarea', { class: 'code ts-code', readonly: true, rows: '2', 'aria-label': S.share }, code);
      var copyBtn = h('button', { type: 'button', class: 'btn secondary', onclick: function () {
        ta.select();
        var ok = function () { copyBtn.textContent = S.copied; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, function () { try { document.execCommand('copy'); ok(); } catch (e) { /* the code is selected */ } });
        else { try { document.execCommand('copy'); ok(); } catch (e) { /* the code is selected */ } }
      } }, S.copy);
      shareBox.appendChild(h('div', { class: 'card' }, [h('h3', {}, S.share), h('p', { class: 'small' }, S.shareHelp), ta, h('div', { class: 'row' }, copyBtn)]));
    }
    function showImport() {
      shareBox.innerHTML = '';
      var ta = h('textarea', { class: 'code ts-import-code', rows: '2', 'aria-label': S.importHelp, placeholder: 'TAKT1:…' }), err = h('p', { class: 'error', role: 'alert' });
      shareBox.appendChild(h('div', { class: 'card' }, [h('h3', {}, S.importTitle), h('p', { class: 'small' }, S.importHelp), ta, err, h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary ts-import-go', onclick: function () {
        var s = M.decodeSong(ta.value);
        if (!s) { err.textContent = S.importFail; return; }
        if (SB.playing) stopPlay();
        SB.song = s; saveSong(); drawGrid(); tempoVal.textContent = s.tempo; shareBox.innerHTML = ''; msg.textContent = S.importOk; Core.play('correct');
      } }, S.importBtn))]));
      ta.focus();
    }
    app.appendChild(h('main', { class: 'screen ts-sandbox' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.sbTitle)]),
      h('div', { class: 'ts-sbhead' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'happy', outfit: OUTFIT, size: 100 }) }), h('p', { class: 'lead' }, S.sbIntro)]),
      !soundOn() ? h('p', { class: 'notice ts-sbquiet' }, [S.sbSoundOff + ' ', h('button', { type: 'button', class: 'btn secondary', onclick: function () { Core.setting('sound', true); showSandbox(); } }, S.turnSoundOn)]) : null,
      h('div', { class: 'ts-sbcontrols row' }, [playBtn,
        h('div', { class: 'ts-tempo' }, [h('span', {}, S.tempo), h('button', { type: 'button', class: 'btn ghost ts-slower', 'aria-label': S.slower, onclick: function () { setTempo(-10); } }, '−'), tempoVal, h('button', { type: 'button', class: 'btn ghost ts-faster', 'aria-label': S.faster, onclick: function () { setTempo(10); } }, '+')])]),
      pens, grid,
      h('div', { class: 'ts-sbtools' }, [
        h('div', { class: 'row' }, [h('span', { class: 'ts-rowlabel' }, S.examples)].concat(M.PRESETS.map(function (p) {
          return h('button', { type: 'button', class: 'chip ts-preset', 'data-preset': p.id, onclick: function () { if (SB.playing) stopPlay(); SB.song = M.preset(p.id); saveSong(); drawGrid(); tempoVal.textContent = SB.song.tempo; } }, p.name);
        }))),
        h('div', { class: 'row' }, [
          h('button', { type: 'button', class: 'btn secondary ts-share', onclick: showShare }, S.share),
          h('button', { type: 'button', class: 'btn secondary ts-import', onclick: showImport }, S.importTitle),
          h('button', { type: 'button', class: 'btn ghost ts-clearall', onclick: function () { if (SB.playing) stopPlay(); var tp = SB.song.tempo; SB.song = M.blankSong(); SB.song.tempo = tp; saveSong(); drawGrid(); } }, S.clearAll)])
      ]),
      msg, shareBox
    ]));
    drawPlay(); drawPens(); drawGrid(); tempoVal.textContent = SB.song.tempo;
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport, progress: progress, quickTask: quickTask, collection: collection,
    // test hooks
    _state: function () { return st; },
    _rt: function () { return R ? { phase: R.phase, expected: (R.expected || []).slice(), beatMs: R.beatMs, margin: R.margin, offset: R.offset, taps: R.taps.length } : null; },
    _tapAt: function (ms) { tapAt(ms); }, _judgeNow: function () { judgeNow(); },
    _setTask: function (tk) { if (st) { st.tasks[st.i] = tk; st.attempt = 0; st.locked = false; renderTask(); } },
    _sandbox: function () { return SB; }, _quickFrom: quickFrom, _explain: explain, _hint: hint, _prompt: promptOf, _label: label,
    _svg: { staff: staffSVG, rhythm: rhythmSVG, inst: instSVG, dyn: dynSVG }
  });
})(window);
