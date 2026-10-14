/*
 * Core – fælles funktioner for alle spil:
 * lagring og profiler, lyd, oplæsning, navigation, små UI-hjælpere.
 * Ingen server, ingen sporing. Alt gemmes i browserens localStorage.
 */
(function (root) {
  'use strict';

  var KEY = 'bobspil.v1';
  var storageOk = true;
  var data = load();

  function blank() { return { version: 1, profiles: [], current: null, progress: {} }; }
  function valid(d) { return d && Array.isArray(d.profiles) && typeof d.progress === 'object'; }
  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (!raw) return blank();
      var d = JSON.parse(raw);
      return valid(d) ? d : blank();
    } catch (e) { storageOk = false; return blank(); }
  }
  function save() {
    try { root.localStorage.setItem(KEY, JSON.stringify(data)); storageOk = true; }
    catch (e) { storageOk = false; }
  }
  var saveTimer = null;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 500); }

  /* ---------- profiles ---------- */
  function profiles() { return data.profiles; }
  function profile(id) {
    id = id || data.current;
    for (var i = 0; i < data.profiles.length; i++) if (data.profiles[i].id === id) return data.profiles[i];
    return null;
  }
  function createProfile(name, color, band) {
    var p = {
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name, color: color, band: band || 'M', created: Date.now(),
      settings: { sound: true, speechAuto: false }, time: {}
    };
    data.profiles.push(p);
    data.progress[p.id] = {};
    data.current = p.id;
    save();
    return p;
  }
  function selectProfile(id) { data.current = id; save(); }
  function signOut() { data.current = null; save(); }
  function resetProfile(id) {
    data.progress[id] = {};
    var p = profile(id); if (p) p.time = {};
    save();
  }
  function deleteProfile(id) {
    data.profiles = data.profiles.filter(function (p) { return p.id !== id; });
    delete data.progress[id];
    if (data.current === id) data.current = null;
    save();
  }
  function gameData(gameId, profileId) {
    var pid = profileId || data.current;
    if (!pid) return {};
    var pr = data.progress[pid] || (data.progress[pid] = {});
    return pr[gameId] || (pr[gameId] = {});
  }
  function addTime(gameId, seconds) {
    var p = profile(); if (!p) return;
    p.time = p.time || {};
    p.time[gameId] = (p.time[gameId] || 0) + seconds;
    saveSoon();
  }
  function setting(key, value) {
    var p = profile(); if (!p) return undefined;
    p.settings = p.settings || {};
    if (value === undefined) return p.settings[key];
    p.settings[key] = value; save();
    return value;
  }

  /* ---------- export / import ---------- */
  function b64enc(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64dec(b64) {
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function exportCode() { return 'BOB1:' + b64enc(JSON.stringify(data)); }
  // A progress code may come from somewhere else, so it is treated as untrusted: today's daily tasks are dropped (they are
  // made again from the date), and no saved text may contain HTML characters. The games only save plain text and numbers.
  function clean(d) {
    (d.profiles || []).forEach(function (p) { if (p && p.daily) delete p.daily.today; });
    return (function walk(x) {
      if (typeof x === 'string') return x.replace(/[<>"'`]/g, '');
      if (Array.isArray(x)) return x.map(walk);
      if (x && typeof x === 'object') { var o = {}; for (var k in x) if (Object.prototype.hasOwnProperty.call(x, k) && !/^__proto__$|^constructor$|^prototype$/.test(k)) o[walk(k)] = walk(x[k]); return o; }
      return typeof x === 'number' || typeof x === 'boolean' || x === null ? x : null;
    })(d);
  }
  function importCode(code) {
    try {
      var s = String(code || '').replace(/\s+/g, '');
      if (s.indexOf('BOB1:') !== 0) return false;
      var d = JSON.parse(b64dec(s.slice(5)));
      if (!valid(d)) return false;
      data = clean(d); save();
      return true;
    } catch (e) { return false; }
  }

  /* ---------- sound (synthesised, no files) ---------- */
  var actx = null;
  function audio() {
    if (!actx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try { actx = new AC(); } catch (e) { return null; }
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(c, f, t0, dur, type, vol, f2) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(c, t0, dur, vol, freq) {
    var len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq || 1500; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol || 0.2, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t0); src.stop(t0 + dur);
  }
  var SOUNDS = {
    click: function (c, t) { tone(c, 700, t, 0.06, 'triangle', 0.06); },
    correct: function (c, t) { [523, 659, 784].forEach(function (f, i) { tone(c, f, t + i * 0.08, 0.16, 'triangle', 0.14); }); },
    wrong: function (c, t) { tone(c, 392, t, 0.16, 'sine', 0.1); tone(c, 330, t + 0.16, 0.22, 'sine', 0.1); },
    zap: function (c, t) { noise(c, t, 0.28, 0.25, 2800); tone(c, 1400, t, 0.25, 'sawtooth', 0.05, 180); },
    rain: function (c, t) { noise(c, t, 1.4, 0.1, 900); },
    level: function (c, t) { [659, 784, 988, 1319].forEach(function (f, i) { tone(c, f, t + i * 0.07, 0.14, 'square', 0.05); }); },
    win: function (c, t) { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(c, f, t + i * 0.12, 0.22, 'triangle', 0.13); }); },
    star: function (c, t) { tone(c, 1047, t, 0.18, 'triangle', 0.12); tone(c, 1568, t + 0.06, 0.2, 'sine', 0.08); },
    step: function (c, t) { tone(c, 520, t, 0.05, 'square', 0.03); },
    turn: function (c, t) { tone(c, 440, t, 0.09, 'triangle', 0.05, 620); },
    bump: function (c, t) { tone(c, 140, t, 0.22, 'sine', 0.22, 70); noise(c, t, 0.12, 0.08, 400); },
    battery: function (c, t) { tone(c, 880, t, 0.08, 'square', 0.05); tone(c, 1320, t + 0.07, 0.12, 'square', 0.05); }
  };
  function play(name) {
    if (setting('sound') === false) return;
    var c = audio(); if (!c || !SOUNDS[name]) return;
    try { SOUNDS[name](c, c.currentTime + 0.01); } catch (e) { /* ignore */ }
  }

  /* ---------- speech (the browser's own voices: Danish by default, English for Ordbroen) ---------- */
  var voices = { da: null, en: null };
  function findVoice() {
    if (!('speechSynthesis' in root)) return null;
    var all = root.speechSynthesis.getVoices();
    // voices that run on the device are preferred, so the read-aloud text is not sent to an online speech service
    function best(list) { return list.filter(function (v) { return v.localService; })[0] || list[0] || null; }
    voices.da = best(all.filter(function (v) { return /^da/i.test(v.lang); }));
    // English: prefer British, then any English voice
    voices.en = best(all.filter(function (v) { return /^en[-_]GB/i.test(v.lang); })) || best(all.filter(function (v) { return /^en/i.test(v.lang); }));
    return voices.da;
  }
  if ('speechSynthesis' in root) {
    findVoice();
    root.speechSynthesis.addEventListener && root.speechSynthesis.addEventListener('voiceschanged', findVoice);
  }
  function canSpeak(lang) { lang = lang || 'da'; if (!voices[lang]) findVoice(); return !!voices[lang]; }
  function speak(text, lang) {
    lang = lang || 'da';
    if (!canSpeak(lang) || !text) return false;
    root.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? (voices.en.lang || 'en-GB') : 'da-DK'; u.voice = voices[lang]; u.rate = lang === 'en' ? 0.85 : 0.92;
    root.speechSynthesis.speak(u);
    return true;
  }
  function stopSpeaking() { if ('speechSynthesis' in root) root.speechSynthesis.cancel(); }

  /* ---------- DOM helpers ---------- */
  function h(tag, props, children) {
    var el = document.createElement(tag);
    props = props || {};
    for (var k in props) {
      var v = props[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    (function add(c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) { c.forEach(add); return; }
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    })(children);
    return el;
  }
  function t(str, vars) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] !== undefined ? vars[k] : m; }); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function starIcons(n, max, cls) {
    n = Math.max(0, Math.round(Number(n)) || 0); max = Math.max(1, Math.round(Number(max)) || 3);
    var s = '';
    for (var i = 0; i < (max || 3); i++) {
      s += '<svg class="star ' + (i < n ? 'on' : 'off') + ' ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
    }
    return '<span class="stars" role="img" aria-label="' + n + ' af ' + (max || 3) + ' stjerner">' + s + '</span>';
  }
  function download(filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = h('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- loading games on demand (shared/games.js lists the files) ---------- */
  var loading = {};
  function manifest(id) { return (root.GAMES || []).filter(function (g) { return g.id === id; })[0]; }
  function loadCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    document.head.appendChild(h('link', { rel: 'stylesheet', href: href }));
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = resolve; s.onerror = function () { s.remove(); reject(new Error('Kunne ikke hente ' + src)); };
      document.body.appendChild(s);
    });
  }
  function loadGame(id) {
    if (games[id]) return Promise.resolve(games[id]);
    if (loading[id]) return loading[id];
    var m = manifest(id);
    if (!m) return Promise.reject(new Error('Ukendt spil ' + id));
    (m.css || []).forEach(loadCss);
    loading[id] = (m.js || []).reduce(function (p, src) { return p.then(function () { return loadScript(src); }); }, Promise.resolve())
      .then(function () { if (!games[id]) throw new Error(id + ' registrerede sig ikke'); return games[id]; })
      .catch(function (e) { delete loading[id]; throw e; });
    return loading[id];
  }
  // Loads every game one after another (for stars, badges and the daily challenge). Games that fail are skipped.
  var allPromise = null;
  function loadAll() {
    if (allPromise) return allPromise;
    allPromise = (root.GAMES || []).reduce(function (p, g) {
      return p.then(function () { return loadGame(g.id).catch(function (e) { console.warn(e.message); }); });
    }, Promise.resolve()).then(function () { return games; });
    return allPromise;
  }

  /* ---------- small hooks the games call ---------- */
  // Runs fn with Math.random replaced by a seeded generator, so the same seed gives the same task.
  function hashStr(str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed));
    return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  function seeded(seed, fn) {
    var keep = Math.random; Math.random = rng(seed);
    try { return fn(); } finally { Math.random = keep; }
  }
  // Picks one of the routes with the fewest stars (ties broken by Math.random, which the daily challenge seeds).
  function weakest(ids, routes) {
    routes = routes || {};
    function st(id) { return Number((routes[id] || {}).stars) || 0; }
    var min = Math.min.apply(null, ids.map(st));
    var low = ids.filter(function (id) { return st(id) === min; });
    return low[Math.floor(Math.random() * low.length)];
  }
  // progress() helper for games that keep { stars, plays } per route in d[key]
  function routeProgress(d, routes, key) {
    var store = d[key || 'routes'] || {}, out = { plays: 0, bands: { M: [], U: [] } };
    routes.forEach(function (r) { var rs = store[r.id] || {}; out.plays += rs.plays || 0; out.bands[r.b === 'U' ? 'U' : 'M'].push(rs.stars || 0); });
    return out;
  }
  // Remembers that a game or a sandbox has been opened (for the badge "Opdageren").
  function visit(key) {
    var p = profile(); if (!p) return;
    p.visits = p.visits || {};
    if (!p.visits[key]) { p.visits[key] = 1; saveSoon(); }
  }
  // Called by every game when a round ends, after the result is saved. Returns a DOM node with any new badges
  // (to show in the result dialog) or null.
  function roundDone(gameId, routeId, before, after) {
    return root.Badges ? root.Badges.afterRound(gameId, routeId, before, after) : null;
  }

  /* ---------- games and navigation ---------- */
  var games = {}, mounted = null;
  function registerGame(g) { games[g.id] = g; }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    stopSpeaking();
    if (mounted && mounted.unmount) { try { mounted.unmount(); } catch (e) { console.error(e); } }
    mounted = null;
    var app = document.getElementById('app');
    app.innerHTML = '';
    app.className = '';
    var hash = location.hash || '';
    var Hub = root.Hub;
    if (root.Bob && root.Bob.setLook) root.Bob.setLook((profile() || {}).bob || {}); // the child's chosen bow, wings and tips
    if (!profile()) { Hub.showProfiles(app); }
    else if (hash.indexOf('#/spil/') === 0) {
      var id = hash.slice(7);
      if (games[id]) mountGame(app, games[id]);
      else if (manifest(id)) {
        Hub.showLoading(app);
        loadGame(id).then(function (g) { if (location.hash === hash && !mounted) { app.innerHTML = ''; mountGame(app, g); } })
          .catch(function (e) { console.error(e); if (location.hash === hash) Hub.showLoadError(app); });
      }
      else Hub.showHub(app);
    }
    else if (hash === '#/voksne') Hub.showParents(app);
    else if (hash === '#/maerker' && root.Badges) root.Badges.showPage(app);
    else if (hash === '#/kalender' && root.Daily) Core.loadAll().then(function () { if (location.hash === '#/kalender') root.Daily.showCalendar(app); });
    else if (hash === '#/spillere') Hub.showProfiles(app);
    else Hub.showHub(app);
    root.scrollTo(0, 0);
  }
  function mountGame(app, g) { mounted = g; app.className = 'game-' + g.id; visit(g.id); g.mount(app); }
  function start() {
    root.addEventListener('hashchange', route);
    // first tap unlocks audio on iOS/Safari
    root.addEventListener('pointerdown', function once() { audio(); root.removeEventListener('pointerdown', once); });
    route();
    var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || (location.protocol === 'http:' && local))) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline mode is optional */ });
    }
  }

  root.Core = {
    // data
    profiles: profiles, profile: profile, createProfile: createProfile, selectProfile: selectProfile, signOut: signOut,
    resetProfile: resetProfile, deleteProfile: deleteProfile, gameData: gameData, addTime: addTime, setting: setting,
    save: save, saveSoon: saveSoon, storageOk: function () { return storageOk; },
    exportCode: exportCode, importCode: importCode,
    // media
    play: play, audio: audio, speak: speak, canSpeak: canSpeak, stopSpeaking: stopSpeaking,
    // ui
    h: h, t: t, pick: pick, starIcons: starIcons, download: download,
    // nav
    registerGame: registerGame, games: games, go: go, start: start, loadGame: loadGame, loadAll: loadAll,
    // hooks for badges and the daily challenge
    seeded: seeded, rng: rng, hashStr: hashStr, visit: visit, roundDone: roundDone, weakest: weakest, routeProgress: routeProgress
  };
})(window);
