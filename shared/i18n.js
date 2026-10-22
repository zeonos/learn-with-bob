/*
 * I18N – hvilket sprog siden vises på. Indlæses lige efter shared/strings-da.js og før alt andet.
 *
 * Sproget bestemmes én gang, når siden åbner (spillene læser deres tekster, når de indlæses):
 *   1. ?lang=en i adressen (til at dele et link og til at se en engelsk version, før den er færdig),
 *   2. det sprog, der sidst blev valgt på denne enhed,
 *   3. browserens sprog: står dansk blandt browserens sprog, bliver det dansk; ellers engelsk, hvis den er klar.
 * At skifte sprog gemmer valget og genindlæser siden. Spilleren husker også sit sprog (Core.createProfile).
 *
 * Tekster: hvert spil har strings-da.js (STR.<præfiks>). En engelsk fil, strings-en.js, kalder
 *   I18N.add('en', '<præfiks>', { …kun de nøgler, der er oversat… })
 * og lægger dem oven på de danske, når siden er på engelsk. Lister erstattes helt, objekter flettes.
 * tools/test-i18n.js tjekker, at de engelske nøgler og {pladsholdere} passer til de danske.
 */
(function (root) {
  'use strict';
  // ready: the language can be chosen in the picker. Until then it can only be seen with ?lang=xx (a preview).
  var LANGS = {
    da: { name: 'Dansk', html: 'da', locale: 'da-DK', voice: 'da', ready: true },
    en: { name: 'English', html: 'en-US', locale: 'en-US', voice: 'en-US', ready: false,
      previewNote: 'English preview: not finished yet, so some texts are still in Danish.' }
  };
  var KEY = 'bobspil.lang';

  function known(code) { return Object.prototype.hasOwnProperty.call(LANGS, code) ? code : null; }
  function fromUrl(search) { var m = /[?&]lang=([a-z]{2})\b/.exec(search || ''); return m ? known(m[1]) : null; }
  // Danish anywhere in the browser's list wins (many Danish families use English-language devices); otherwise English if it is ready.
  function guess(list) {
    list = (list || []).map(function (x) { return String(x || '').toLowerCase(); });
    if (list.some(function (x) { return x.slice(0, 2) === 'da'; })) return 'da';
    if (list.length && list[0].slice(0, 2) === 'en' && LANGS.en.ready) return 'en';
    return 'da';
  }
  function choose(urlLang, storedLang, browserList) { return urlLang || storedLang || guess(browserList); }
  // the address without ?lang=xx (so a shared link does not keep overriding the child's own choice)
  function withoutLang(search) {
    var s = String(search || '').replace(/([?&])lang=[a-z]{2}(&|$)/, function (m, a, b) { return b ? a : ''; });
    return s === '?' ? '' : s;
  }
  // Deep merge: objects are merged key by key, everything else (strings, numbers, arrays) is replaced.
  function merge(into, from) {
    if (!into || typeof into !== 'object' || Array.isArray(into)) return from;
    for (var k in from) {
      if (!Object.prototype.hasOwnProperty.call(from, k)) continue;
      var v = from[k];
      into[k] = v && typeof v === 'object' && !Array.isArray(v) && into[k] && typeof into[k] === 'object' && !Array.isArray(into[k]) ? merge(into[k], v) : v;
    }
    return into;
  }

  var pure = { LANGS: LANGS, fromUrl: fromUrl, guess: guess, choose: choose, merge: merge, withoutLang: withoutLang };
  if (typeof module !== 'undefined' && module.exports) { module.exports = pure; return; }

  /* ---------- in the browser ---------- */
  function readStored() { try { return known(root.localStorage.getItem(KEY)); } catch (e) { return null; } }
  function store(code) { try { root.localStorage.setItem(KEY, code); return root.localStorage.getItem(KEY) === code; } catch (e) { return false; } }
  var url = fromUrl(root.location && root.location.search);
  if (url) store(url);
  var lang = choose(url, readStored(), root.navigator ? (root.navigator.languages && root.navigator.languages.length ? root.navigator.languages : [root.navigator.language]) : []);
  if (root.document && root.document.documentElement) root.document.documentElement.lang = LANGS[lang].html;

  root.I18N = {
    lang: lang,
    info: function (code) { return LANGS[code || lang]; },
    // the languages the picker offers: the ready ones, plus the one in use (so a preview can switch back)
    available: function () { return Object.keys(LANGS).filter(function (c) { return LANGS[c].ready || c === lang; }); },
    preview: !LANGS[lang].ready,
    viaLink: !!url, // the language came from a ?lang= link
    // switch language: remember it and load the page again (the games read their texts when they load)
    set: function (code, hash) {
      if (!known(code)) return;
      var loc = root.location, search = withoutLang(loc.search), h2 = hash !== undefined ? hash : loc.hash;
      // without storage (some private windows) the choice rides along in the address instead
      if (!store(code)) { loc.replace(loc.pathname + (search ? search + '&' : '?') + 'lang=' + code + h2); return; }
      if (code === lang && search === loc.search) { if (h2 !== loc.hash) loc.hash = h2; return; }
      if (search === loc.search) { loc.hash = h2; loc.reload(); }
      else loc.replace(loc.pathname + search + h2);
    },
    // a strings-xx.js file adds its texts; they only count when the page is in that language
    add: function (code, prefix, texts) {
      if (code !== lang || code === 'da') return;
      root.STR = root.STR || {};
      root.STR[prefix] = merge(root.STR[prefix] || {}, texts);
    },
    merge: merge
  };
})(typeof window !== 'undefined' ? window : this);
