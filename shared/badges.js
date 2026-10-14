/*
 * Bobs mærker: ca. 50 mærker for at øve sig, være nysgerrig og komme igen – aldrig for hastighed.
 * Mærkerne regnes ud fra det fremskridt, spillene allerede gemmer, så gammelt fremskridt tæller med.
 * Et fundet mærke beholdes. Hvert mærke giver Bob noget nyt at tage på (vælges på mærkesiden).
 * evaluate() er ren og testes med node tools/test-badges-daily.js.
 */
(function (root) {
  'use strict';
  var GAME_IDS = ['regnestorm', 'byggepladsen', 'lommepenge', 'ordjaegeren', 'ordbroen', 'laboratoriet', 'verdensrejsen', 'tidsmaskinen', 'robotkoden', 'netdetektiven', 'taktslaget', 'tankespind', 'gaadehuset', 'labyrinten', 'raketbanen', 'museet',
    'talforsvaret', 'bigaarden', 'bogstavkampen', 'energioeen', 'rygsaekrejsen', 'spilmageren', 'berlin', 'tegneserien', 'opfinder']; // the order fixes each game's rewards – only add at the end
  var SANDBOXES = ['laboratoriet:sandbox', 'robotkoden:sandbox', 'byggepladsen:sandbox', 'taktslaget:sandbox', 'gaadehuset:sandbox', 'labyrinten:sandbox', 'raketbanen:sandbox',
    'talforsvaret:sandbox', 'energioeen:sandbox', 'spilmageren:sandbox', 'tegneserien:sandbox', 'opfinder:sandbox'];
  var BOWS = ['rod', 'groen', 'lilla', 'orange', 'lyseroed', 'guld', 'moerkeblaa', 'turkis', 'stribet', 'prikket', 'ternet', 'stjernehimmel', 'skak', 'smaragd', 'galakse', 'perlemor', 'zebra', 'honning', 'blomstret', 'havblaa', 'regnbue', 'pixel', 'jordbaer', 'hjerter', 'kobber'];
  var WINGS = ['lyseroed', 'mint', 'lavendel', 'guld', 'prikker', 'striber', 'hjerter', 'stjerner', 'regnbue', 'glimmer', 'solnedgang', 'soelv', 'nattehimmel', 'krystal', 'flamme', 'mosaik', 'kobber', 'blade', 'regndraaber', 'nordlys', 'boelger', 'pixel', 'sommerfugl', 'konfetti', 'honning'];
  var HATS = ['festhat', 'kasket', 'baret', 'hue', 'pandebaand', 'blomsterkrans', 'kokkehue', 'sloejfe', 'studenterhue', 'hoejhat', 'krone', 'troldmandshat', 'vikingehjelm', 'pandelampe', 'rumhjelm', 'laurbaerkrans', 'ridderhjelm', 'straahat', 'fjerhat', 'propelkasket', 'safarihat', 'pixelkrone', 'bowlerhat', 'tankeboble', 'tandhjulshat'];
  var OTHER = [ // id, group, reward
    ['alsidig', 'more', ['extra', 'medalje']], ['opdager', 'more', ['extra', 'solbriller']], ['komigen', 'more', ['tip', 'regnbue']],
    ['oevelse', 'more', ['extra', 'briller']], ['logbog', 'more', ['extra', 'bog']], ['pas', 'more', ['extra', 'ballon']],
    ['dagbog', 'more', ['extra', 'toerklaede']], ['sagsmappe', 'more', ['extra', 'fregner']],
    ['staedig', 'more', ['extra', 'pokal']], ['gaademager', 'more', ['extra', 'puslebrik']],
    ['foerste', 'daily', ['tip', 'hjerte']], ['streak3', 'daily', ['tip', 'stjerne']], ['streak7', 'daily', ['tip', 'blomst']],
    ['streak30', 'daily', ['tip', 'diamant']], ['maaned', 'daily', ['tip', 'maane']]
  ];
  // ids = the games that exist in this version (in the browser: those in shared/games.js). Games that are planned
  // but not built yet keep their place (and rewards) in GAME_IDS, but their badges are not shown or counted.
  function defs(ids) {
    var out = [];
    GAME_IDS.forEach(function (g, i) {
      if (ids && ids.indexOf(g) < 0) return;
      out.push({ id: g + '-1', group: 'games', game: g, level: 1, reward: ['bow', BOWS[i]] });
      out.push({ id: g + '-2', group: 'games', game: g, level: 2, reward: ['wings', WINGS[i]] });
      out.push({ id: g + '-3', group: 'games', game: g, level: 3, reward: ['hat', HATS[i]] });
    });
    OTHER.forEach(function (o) { out.push({ id: o[0], group: o[1], reward: o[2] }); });
    return out;
  }
  function full(c) { return !!c && c.max > 0 && c.n >= c.max; }
  // st = { games: { id: { progress: {plays, bands:{M:[],U:[]}}, collection: {n,max} } }, visits: {}, practiceCleared: n,
  //        komIgen: bool, daily: { days: n, best: n, bestMonth: n } }   -> { badgeId: true }
  function evaluate(st, ids) {
    var won = {}, games = st.games || {}, list = ids ? GAME_IDS.filter(function (g) { return ids.indexOf(g) >= 0; }) : GAME_IDS;
    var boxes = SANDBOXES.filter(function (k) { return list.indexOf(k.split(':')[0]) >= 0; });
    list.forEach(function (g) {
      var pr = (games[g] || {}).progress; if (!pr) return;
      if (pr.plays > 0) won[g + '-1'] = true;
      ['M', 'U'].forEach(function (b) {
        var list = pr.bands[b] || []; if (!list.length) return;
        if (list.filter(function (s) { return s > 0; }).length >= Math.ceil(list.length / 2)) won[g + '-2'] = true;
        if (list.every(function (s) { return s >= 3; })) won[g + '-3'] = true;
      });
    });
    if (list.every(function (g) { var pr = (games[g] || {}).progress; return pr && ['M', 'U'].some(function (b) { return (pr.bands[b] || []).some(function (s) { return s > 0; }); }); })) won.alsidig = true;
    var v = st.visits || {};
    if (list.concat(boxes).every(function (k) { return v[k] || (k.indexOf(':') < 0 && ((games[k] || {}).progress || {}).plays > 0); })) won.opdager = true;
    if (st.komIgen) won.komigen = true;
    if (v.staedig) won.staedig = true;      // solved a puzzle after three tries or more, without the solution
    if (v.gaademager) won.gaademager = true; // made a puzzle of their own that can be solved
    if ((st.practiceCleared || 0) >= 25) won.oevelse = true;
    if (full((games.laboratoriet || {}).collection)) won.logbog = true;
    if (full((games.verdensrejsen || {}).collection)) won.pas = true;
    if (full((games.tidsmaskinen || {}).collection)) won.dagbog = true;
    if (full((games.netdetektiven || {}).collection)) won.sagsmappe = true;
    var d = st.daily || {};
    if (d.days >= 1) won.foerste = true;
    if (d.best >= 3) won.streak3 = true;
    if (d.best >= 7) won.streak7 = true;
    if (d.best >= 30) won.streak30 = true;
    if (d.bestMonth >= 20) won.maaned = true;
    return won;
  }
  var pure = { defs: function (ids) { return defs(ids); }, evaluate: evaluate, GAME_IDS: GAME_IDS, SANDBOXES: SANDBOXES };
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
  if (typeof document === 'undefined') return;

  /* ---------- in the browser ---------- */
  var Core = root.Core, S = root.STR.core, h = Core.h, t = Core.t;
  var LEVEL_COL = ['#C98446', '#AEB6BF', '#E8B923'];
  function avail() { return (root.GAMES || []).map(function (m) { return m.id; }); }
  var defsAll = defs; defs = function () { return defsAll(avail()); };
  function gameTitle(id) { return (S.games.filter(function (g) { return g.id === id; })[0] || {}).title || id; }
  function outfitOf(id) { return (S.games.filter(function (g) { return g.id === id; })[0] || {}).outfit; }
  function nameOf(b) { return b.game ? t(S.badgeGameName, { name: S.gameBadgeNames[b.game], level: S.badgeLevels[b.level - 1] }) : S.badges[b.id][0]; }
  function howOf(b) { return b.game ? t(S.badgeHow[b.level - 1], { game: gameTitle(b.game) }) : S.badges[b.id][1]; }
  function rewardName(b) { return S.looks[b.reward[0]][b.reward[1]]; }

  // Gathers what the loaded games know. Badges for games that are not loaded yet simply wait.
  function gather(p) {
    var st = { games: {}, visits: p.visits || {}, komIgen: !!(p.flags || {}).komIgen, practiceCleared: 0, daily: {} };
    GAME_IDS.forEach(function (g) {
      var game = Core.games[g]; if (!game) return;
      var d = Core.gameData(g, p.id);
      st.games[g] = { progress: game.progress ? game.progress(d) : null, collection: game.collection ? game.collection(d) : null };
      st.practiceCleared += d.practiceCleared || 0;
    });
    if (root.Daily) { var ds = root.Daily.stats(p); st.daily = { days: ds.days, best: ds.best, bestMonth: ds.bestMonth }; }
    return st;
  }
  // Stores newly earned badges. silent = earned from old progress (no fanfare). Returns the new badge definitions.
  function sync(silent) {
    var p = Core.profile(); if (!p) return [];
    var first = !p.badges; p.badges = p.badges || {};
    var won = evaluate(gather(p), avail()), fresh = [], date = root.Daily ? root.Daily.dateKey() : new Date().toISOString().slice(0, 10);
    defs().forEach(function (b) { if (won[b.id] && !p.badges[b.id]) { p.badges[b.id] = date; fresh.push(b); } });
    if (fresh.length) Core.save();
    return silent || first ? [] : fresh;
  }
  function medal(b, size, locked) {
    size = size || 64;
    var col = b.game ? LEVEL_COL[b.level - 1] : b.group === 'daily' ? '#6BB8E0' : '#B48CDE', inner;
    if (b.game) inner = root.Bob.svg({ expression: 'happy', outfit: outfitOf(b.game), size: size * 0.62, crop: 'head' });
    else inner = '<svg viewBox="0 0 40 40" width="' + Math.round(size * 0.55) + '" height="' + Math.round(size * 0.55) + '" aria-hidden="true">' + ICONS[b.id] + '</svg>';
    return h('span', { class: 'medal' + (locked ? ' locked' : ''), style: '--mc:' + col + ';width:' + size + 'px;height:' + size + 'px', 'aria-hidden': 'true', html: inner });
  }
  var I = 'fill="none" stroke="#4A2C17" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    alsidig: '<path d="M20 4l4.6 9.6 10.4 1.4-7.6 7.2 1.9 10.3L20 27.6 10.7 32.5l1.9-10.3L5 15l10.4-1.4z" fill="#F7C548" stroke="#4A2C17" stroke-width="2.5" stroke-linejoin="round"/>',
    opdager: '<circle cx="20" cy="20" r="14" ' + I + '/><path d="M26 14l-4 10-8 2 4-10z" fill="#D9463B" stroke="#4A2C17" stroke-width="2.5" stroke-linejoin="round"/>',
    komigen: '<path d="M30 14a12 12 0 1 0 2 10" ' + I + '/><path d="M31 6v9h-9" ' + I + '/>',
    oevelse: '<path d="M8 21l8 8 16-17" fill="none" stroke="#3F8A3A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
    logbog: '<path d="M8 8h11a3 3 0 0 1 3 3v22a3 3 0 0 0-3-3H8zM32 8H25a3 3 0 0 0-3 3v22a3 3 0 0 1 3-3h7z" fill="#E6F4FC" stroke="#4A2C17" stroke-width="2.5" stroke-linejoin="round"/>',
    pas: '<rect x="9" y="5" width="22" height="30" rx="3" fill="#9B2D3F" stroke="#4A2C17" stroke-width="2.5"/><circle cx="20" cy="18" r="6" fill="none" stroke="#F2C94C" stroke-width="2.5"/>',
    dagbog: '<path d="M12 5h16M12 35h16M13 5c0 10 14 10 14 15S13 25 13 35M27 5c0 10-14 10-14 15s14 5 14 15" ' + I + '/>',
    sagsmappe: '<circle cx="17" cy="17" r="10" fill="#CFE8F5" stroke="#4A2C17" stroke-width="3"/><path d="M24 24l10 10" ' + I + ' stroke-width="4"/>',
    staedig: '<path d="M4 34 L16 14 L22 22 L27 16 L36 34 Z" fill="#9FC98A" stroke="#4A2C17" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 14 V4" ' + I + '/><path d="M16 4 h10 l-3 3 l3 3 h-10" fill="#D9463B" stroke="#4A2C17" stroke-width="2" stroke-linejoin="round"/>',
    gaademager: '<path d="M8 10 h8 a4 4 0 1 1 8 0 h8 v8 a4 4 0 1 1 0 8 v8 h-8 a4 4 0 1 0 -8 0 h-8 v-8 a4 4 0 1 0 0 -8 Z" fill="#6BB8E0" stroke="#4A2C17" stroke-width="2.5" stroke-linejoin="round"/>',
    foerste: '<text x="20" y="29" text-anchor="middle" font-size="26" font-weight="800" fill="#4A2C17" font-family="system-ui,sans-serif">1</text>',
    streak3: '<text x="20" y="29" text-anchor="middle" font-size="26" font-weight="800" fill="#4A2C17" font-family="system-ui,sans-serif">3</text>',
    streak7: '<text x="20" y="29" text-anchor="middle" font-size="26" font-weight="800" fill="#4A2C17" font-family="system-ui,sans-serif">7</text>',
    streak30: '<text x="20" y="28" text-anchor="middle" font-size="21" font-weight="800" fill="#4A2C17" font-family="system-ui,sans-serif">30</text>',
    maaned: '<rect x="6" y="9" width="28" height="25" rx="3" fill="#FFFFFF" stroke="#4A2C17" stroke-width="2.5"/><path d="M6 16h28M13 6v6M27 6v6" ' + I + ' stroke-width="2.5"/><path d="M12 22h4M18 22h4M24 22h4M12 28h4M18 28h4" stroke="#6BB8E0" stroke-width="3"/>'
  };
  // A card for the result dialog (or the daily challenge) listing new badges
  function newCard(list) {
    if (!list || !list.length) return null;
    return h('div', { class: 'badge-new', role: 'status' }, [
      h('strong', { class: 'badge-new-title' }, list.length > 1 ? S.badgesNew : S.badgeNew),
      list.map(function (b) { return h('div', { class: 'badge-new-row' }, [medal(b, 54), h('span', {}, [h('b', {}, nameOf(b)), h('small', {}, t(S.badgeUnlocks, { item: rewardName(b) }))])]); })
    ]);
  }
  function afterRound(gameId, routeId, before, after) {
    var p = Core.profile(); if (!p) return null;
    if (before !== null && before !== undefined && before <= 1 && after > before) { p.flags = p.flags || {}; p.flags.komIgen = true; }
    return newCard(sync(false));
  }
  function afterDaily() { return newCard(sync(false)); }
  function hubButton() {
    var p = Core.profile(), n = Object.keys((p && p.badges) || {}).length;
    return h('a', { class: 'chip badges-chip', href: '#/maerker' }, [h('span', { class: 'ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24"><circle cx="12" cy="14" r="7" fill="#F7C548" stroke="currentColor" stroke-width="2"/><path d="M8 3l4 5 4-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' }), S.badgesButton + (n ? ' (' + n + ')' : '')]);
  }

  /* ---------- the badge page with Bob's wardrobe ---------- */
  function showPage(app) {
    app.innerHTML = '';
    var wait = h('main', { class: 'screen center loading-screen' }, h('p', { class: 'lead' }, S.dailyLoading));
    app.appendChild(wait);
    Core.loadAll().then(function () { if (wait.isConnected) { sync(true); render(app); } });
  }
  function render(app) {
    var p = Core.profile(), got = p.badges || {}, all = defs();
    p.bob = p.bob || {};
    var preview = h('div', { class: 'bob dress-bob' });
    function drawPreview() { preview.innerHTML = root.Bob.svg({ expression: 'cheering', size: 190, look: p.bob }); }
    drawPreview();
    var unlocked = {}, offered = {}; all.forEach(function (b) { offered[b.reward[0] + ':' + b.reward[1]] = true; if (got[b.id]) unlocked[b.reward[0] + ':' + b.reward[1]] = true; });
    var wardrobe = Object.keys(S.lookCats).map(function (cat) {
      var row = h('div', { class: 'dress-row' });
      function draw() {
        row.innerHTML = '';
        [null].concat(root.Bob.looks[cat].filter(function (id) { return offered[cat + ':' + id]; })).forEach(function (id) {
          var open = id === null || unlocked[cat + ':' + id], sel = (p.bob[cat] || null) === id;
          var look = {}; look[cat] = id;
          row.appendChild(h('button', { type: 'button', class: 'dress-item' + (sel ? ' sel' : '') + (open ? '' : ' locked'), disabled: !open, 'aria-pressed': sel ? 'true' : 'false',
            title: id === null ? (cat === 'hat' || cat === 'extra' ? S.dressNone : S.dressDefault) : S.looks[cat][id] + (open ? '' : ' (' + S.dressLocked + ')'),
            onclick: function () { p.bob[cat] = id; if (id === null) delete p.bob[cat]; Core.save(); root.Bob.setLook(p.bob); Core.play('click'); drawPreview(); draw(); } }, [
            h('span', { class: 'dress-art', html: open ? root.Bob.svg({ expression: 'default', size: 64, look: look, crop: cat === 'bow' || cat === 'wings' || cat === 'extra' ? 'full' : 'head' }) : '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect x="6" y="11" width="12" height="9" rx="2" fill="currentColor"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }),
            h('small', {}, id === null ? (cat === 'hat' || cat === 'extra' ? S.dressNone : S.dressDefault) : S.looks[cat][id])
          ]));
        });
      }
      draw();
      return h('div', { class: 'dress-cat' }, [h('h3', {}, S.lookCats[cat]), row]);
    });
    function group(gid) {
      return h('section', { class: 'card' }, [h('h2', {}, S.badgeGroups[gid]), h('ul', { class: 'badge-wall' }, all.filter(function (b) { return b.group === gid; }).map(function (b) {
        var on = !!got[b.id];
        return h('li', { class: 'badge' + (on ? '' : ' locked') }, [medal(b, 64, !on), h('div', {}, [h('strong', {}, nameOf(b)), h('span', {}, howOf(b)),
          h('small', {}, on ? t(S.badgeUnlocks, { item: rewardName(b) }) : S.badgeLocked)])]);
      }))]);
    }
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen badges-page' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + S.back), h('h1', {}, S.badgesTitle)]),
      h('p', { class: 'lead' }, S.badgesIntro), h('p', { class: 'badge-count' }, t(S.badgesCount, { n: Object.keys(got).filter(function (k) { return all.some(function (b) { return b.id === k; }); }).length, max: all.length })),
      h('section', { class: 'card dress' }, [h('h2', {}, S.dressTitle), h('p', { class: 'muted' }, S.dressIntro), h('div', { class: 'dress-wrap' }, [preview, h('div', { class: 'dress-cats' }, wardrobe)])]),
      group('games'), group('more'), group('daily')
    ]));
  }
  // For the parent page
  function summaryFor(p) { var all = defs(); return { n: all.filter(function (b) { return (p.badges || {})[b.id]; }).length, max: all.length, list: all.filter(function (b) { return (p.badges || {})[b.id]; }).map(nameOf) }; }

  pure.sync = sync; pure.afterRound = afterRound; pure.afterDaily = afterDaily; pure.hubButton = hubButton; pure.showPage = showPage; pure.summaryFor = summaryFor; pure.medal = medal;
  root.Badges = pure;
})(typeof window !== 'undefined' ? window : this);
