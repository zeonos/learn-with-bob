/*
 * Hub – vælg spiller, vælg spil, forældreside.
 */
(function (root) {
  'use strict';
  var S = root.STR.core, Core = root.Core, h = Core.h, t = Core.t;
  var COLORS = ['#F7C548', '#6BB8E0', '#8DB36A', '#F2A28F', '#B48CDE', '#F39C4A'];
  var COLOR_NAMES = ['Gul', 'Blå', 'Grøn', 'Lyserød', 'Lilla', 'Orange'];

  function avatar(p, size) {
    return h('span', { class: 'avatar', style: 'background:' + p.color + ';width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.45) + 'px', 'aria-hidden': 'true' },
      (p.name || '?').trim().charAt(0).toUpperCase());
  }
  function bandLabel(b) { return b === 'U' ? S.bandU + ' (' + S.bandUAge + ')' : S.bandM + ' (' + S.bandMAge + ')'; }
  function bob(expression, outfit, size) { return h('div', { class: 'bob', html: root.Bob.svg({ expression: expression, outfit: outfit, size: size }) }); }
  function storageWarning() { return Core.storageOk() ? null : h('p', { class: 'notice', role: 'status' }, S.storageWarn); }

  /* ---------- choose player ---------- */
  function showProfiles(app) {
    var list = Core.profiles();
    if (!list.length) return showNewProfile(app, false);
    var wrap = h('main', { class: 'screen center' }, [
      h('div', { class: 'hero' }, [bob('hello', 'bag', 170), h('div', {}, [h('h1', {}, S.appName), h('p', { class: 'lead' }, S.whoPlays)])]),
      storageWarning(),
      h('div', { class: 'profile-list' }, list.map(function (p) {
        return h('button', { class: 'profile-card', type: 'button', onclick: function () { Core.play('click'); Core.selectProfile(p.id); Core.go('#/hjem'); } },
          [avatar(p, 56), h('span', { class: 'pc-text' }, [h('strong', {}, p.name), h('small', {}, p.band === 'U' ? S.bandU : S.bandM)])]);
      })),
      h('button', { class: 'btn secondary', type: 'button', onclick: function () { showNewProfile(app, true); } }, '+ ' + S.newPlayer)
    ]);
    app.innerHTML = ''; app.appendChild(wrap);
  }

  function showNewProfile(app, canCancel) {
    var color = COLORS[Core.profiles().length % COLORS.length], band = 'M';
    var nameInput = h('input', { id: 'pname', type: 'text', maxlength: '20', autocomplete: 'off', placeholder: S.namePlaceholder });
    var err = h('p', { class: 'error', role: 'alert' });
    var swatches = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': S.chooseColor }, COLORS.map(function (c) {
      var b = h('button', { type: 'button', class: 'swatch' + (c === color ? ' sel' : ''), style: 'background:' + c, role: 'radio', 'aria-checked': c === color ? 'true' : 'false', 'aria-label': COLOR_NAMES[COLORS.indexOf(c)],
        onclick: function () { color = c; [].forEach.call(swatches.children, function (x) { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); }); b.classList.add('sel'); b.setAttribute('aria-checked', 'true'); } });
      return b;
    }));
    function bandBtn(code, label, age) {
      var b = h('button', { type: 'button', class: 'band-card' + (band === code ? ' sel' : ''), role: 'radio', 'aria-checked': band === code ? 'true' : 'false',
        onclick: function () { band = code; [].forEach.call(bands.children, function (x) { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); }); b.classList.add('sel'); b.setAttribute('aria-checked', 'true'); } },
        [h('strong', {}, label), h('small', {}, age)]);
      return b;
    }
    var bands = h('div', { class: 'bands', role: 'radiogroup', 'aria-label': S.chooseBand }, [bandBtn('M', S.bandM, S.bandMAge), bandBtn('U', S.bandU, S.bandUAge)]);
    var form = h('form', { class: 'card form', onsubmit: function (e) {
      e.preventDefault();
      var name = nameInput.value.trim();
      if (!name) { err.textContent = S.nameMissing; nameInput.focus(); return; }
      Core.play('correct');
      Core.createProfile(name, color, band);
      Core.go('#/hjem');
    } }, [
      h('label', { for: 'pname' }, S.name), nameInput,
      h('p', { class: 'label' }, S.chooseColor), swatches,
      h('p', { class: 'label' }, S.chooseBand), bands,
      err,
      h('div', { class: 'row' }, [
        canCancel ? h('button', { type: 'button', class: 'btn ghost', onclick: function () { showProfiles(app); } }, S.cancel) : null,
        h('button', { type: 'submit', class: 'btn primary' }, S.create)
      ])
    ]);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen center' }, [
      h('div', { class: 'hero' }, [bob('happy', 'none', 150), h('div', {}, [h('h1', {}, S.appName), h('p', { class: 'lead' }, S.newPlayer)])]),
      storageWarning(), form
    ]));
    nameInput.focus();
  }

  /* ---------- game menu ---------- */
  function soundToggle() {
    var on = Core.setting('sound') !== false;
    var b = h('button', { type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', onclick: function () {
      on = !on; Core.setting('sound', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.lastChild.textContent = S.sound + ': ' + (on ? S.on : S.off); if (on) Core.play('click');
    } }, [h('span', { 'aria-hidden': 'true', class: 'ico', html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' }), S.sound + ': ' + (on ? S.on : S.off)]);
    return b;
  }

  function gameCard(g) {
    var meta = h('span', { class: 'gc-meta' }, '\u00a0');
    var inner = [h('div', { class: 'gc-art', html: root.Bob.svg({ expression: 'hello', outfit: g.outfit, size: 163, trim: true }) }),
      h('span', { class: 'gc-title', lang: 'da' }, g.titleBreak || g.title), h('span', { class: 'gc-subject' }, g.subject), meta];
    var card = h('a', { class: 'game-card', href: '#/spil/' + g.id, 'data-game': g.id, onclick: function () { Core.play('click'); } }, inner);
    card._meta = meta;
    return card;
  }
  function fillStars(cards) {
    var p = Core.profile();
    cards.forEach(function (c) {
      var game = Core.games[c.getAttribute('data-game')];
      if (!game || !game.summary) return;
      var sm = game.summary(Core.gameData(game.id), p);
      c._meta.innerHTML = Core.starIcons(1, 1, 'small') + ' ' + t(S.starsOf, { n: sm.stars, max: sm.max });
    });
  }
  function showHub(app) {
    var p = Core.profile(), cards = [];
    var groups = Object.keys(S.groups).map(function (gid) {
      var list = (root.GAMES || []).filter(function (m) { return m.group === gid; }).map(function (m) { return S.games.filter(function (g) { return g.id === m.id; })[0]; }).filter(Boolean);
      var row = list.map(gameCard); cards = cards.concat(row);
      return h('section', { class: 'game-group' }, [h('h2', { class: 'group-title' }, S.groups[gid]), h('div', { class: 'game-grid' }, row)]);
    });
    var daily = h('div', { class: 'daily-slot' }), extra = h('div', { class: 'hub-extra' });
    var main = h('main', { class: 'screen hub' }, [
      h('header', { class: 'topbar' }, [
        h('div', { class: 'who' }, [avatar(p, 44), h('strong', {}, t(S.hello, { name: p.name }))]),
        h('div', { class: 'row' }, [extra, soundToggle(), h('button', { type: 'button', class: 'chip', onclick: function () { Core.signOut(); Core.go('#/spillere'); } }, S.switchPlayer)])
      ]),
      storageWarning(),
      h('div', { class: 'hub-intro' }, [h('div', { class: 'bob hub-bob', html: root.Bob.svg({ expression: 'hello', outfit: 'none', size: 120, look: lookOf(p) }) }), h('p', { class: 'bubble' }, S.pickGame)]),
      daily,
      groups,
      h('footer', { class: 'footer' }, h('a', { href: '#/voksne', class: 'link' }, S.forGrownups))
    ]);
    app.appendChild(main);
    if (root.Badges) extra.appendChild(root.Badges.hubButton());
    Core.loadAll().then(function () {
      if (!main.isConnected) return;
      fillStars(cards);
      if (root.Badges) root.Badges.sync(true); // badges earned from existing progress, without fanfare
      if (root.Daily) root.Daily.banner(daily);
    });
  }
  function lookOf(p) { return (p && p.bob) || {}; }
  function showLoading(app) {
    app.appendChild(h('main', { class: 'screen center loading-screen' }, [h('div', { class: 'bob', html: root.Bob.svg({ expression: 'waiting', size: 150 }) }), h('p', { class: 'lead', role: 'status' }, S.loading)]));
  }
  function showLoadError(app) {
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen center loading-screen' }, [h('div', { class: 'bob', html: root.Bob.svg({ expression: 'encouraging', size: 150 }) }), h('p', { class: 'lead', role: 'alert' }, S.loadError),
      h('div', { class: 'row center' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, S.back), h('button', { type: 'button', class: 'btn primary', onclick: function () { location.reload(); } }, S.tryAgain)])]));
  }

  /* ---------- parents ---------- */
  function showParents(app) {
    var a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
    var inp = h('input', { id: 'gate', type: 'text', inputmode: 'numeric', autocomplete: 'off', maxlength: '3' });
    var err = h('p', { class: 'error', role: 'alert' });
    app.appendChild(h('main', { class: 'screen center' }, [
      h('form', { class: 'card form narrow', onsubmit: function (e) {
        e.preventDefault();
        if (parseInt(inp.value, 10) === a * b) showParentPage(app);
        else { err.textContent = S.gateWrong; inp.value = ''; inp.focus(); }
      } }, [
        h('h1', {}, S.gateTitle), h('p', {}, S.gateText),
        h('label', { for: 'gate' }, t(S.gateQuestion, { a: a, b: b })), inp, err,
        h('div', { class: 'row' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, S.back), h('button', { class: 'btn primary', type: 'submit' }, S.open)])
      ])
    ]));
    inp.focus();
  }

  function confirmButton(label, cls, action) {
    var armed = false, timer;
    var b = h('button', { type: 'button', class: 'btn ' + cls, onclick: function () {
      if (!armed) { armed = true; b.textContent = S.confirmAgain; timer = setTimeout(function () { armed = false; b.textContent = label; }, 4000); return; }
      clearTimeout(timer); action();
    } }, label);
    return b;
  }

  function toggle(label, checked, onchange) {
    var id = 'tg' + Math.random().toString(36).slice(2, 7);
    return h('label', { class: 'switch', for: id }, [
      h('input', { id: id, type: 'checkbox', checked: checked, onchange: function (e) { onchange(e.target.checked); } }),
      h('span', { class: 'track', 'aria-hidden': 'true' }), label
    ]);
  }

  function profileSection(app, p) {
    var total = 0; for (var k in (p.time || {})) total += p.time[k];
    var reports = [];
    S.games.forEach(function (g) {
      var game = Core.games[g.id];
      if (!game || !game.parentReport) return;
      var rep = game.parentReport(Core.gameData(g.id, p.id), p);
      var mins = Math.round(((p.time || {})[g.id] || 0) / 60);
      reports.push(h('h3', {}, g.title + ' · ' + t(S.minutes, { n: mins })));
      if (!rep.rows.length) { reports.push(h('p', { class: 'muted' }, S.noData)); return; }
      reports.push(h('div', { class: 'table-wrap' }, h('table', {}, [
        h('thead', {}, h('tr', {}, rep.head.map(function (c) { return h('th', { scope: 'col' }, c); }))),
        h('tbody', {}, rep.rows.map(function (r) { return h('tr', {}, r.map(function (c) { return h('td', {}, String(c)); })); }))
      ])));
    });
    var bandSel = h('select', { 'aria-label': S.band, onchange: function (e) { p.band = e.target.value; Core.save(); } }, [
      h('option', { value: 'M', selected: p.band !== 'U' }, bandLabel('M')), h('option', { value: 'U', selected: p.band === 'U' }, bandLabel('U'))
    ]);
    p.settings = p.settings || {};
    var extras = [];
    if (root.Badges) {
      var bs = root.Badges.summaryFor(p);
      extras.push(h('p', {}, [h('strong', {}, t(S.parentBadges, { n: bs.n, max: bs.max })), bs.list.length ? ': ' + bs.list.join(', ') : '']));
    }
    if (root.Daily) { var ds = root.Daily.stats(p); extras.push(h('p', {}, t(S.parentStreak, { days: ds.days, streak: ds.current }))); }
    return h('section', { class: 'card' }, [
      h('div', { class: 'who' }, [avatar(p, 44), h('div', {}, [h('h2', {}, p.name), h('p', { class: 'muted' }, S.timePlayed + ': ' + t(S.minutes, { n: Math.round(total / 60) }))])]),
      h('div', { class: 'settings' }, [
        h('label', { class: 'inline' }, [S.band + ' ', bandSel]),
        toggle(S.sound, p.settings.sound !== false, function (v) { p.settings.sound = v; Core.save(); }),
        toggle(S.readAloudAuto, !!p.settings.speechAuto, function (v) { p.settings.speechAuto = v; Core.save(); })
      ]),
      Core.canSpeak() ? null : h('p', { class: 'muted small' }, S.noVoice),
      extras,
      reports,
      h('div', { class: 'row' }, [
        confirmButton(S.resetPlayer, 'ghost', function () { Core.resetProfile(p.id); showParentPage(app); }),
        confirmButton(S.deletePlayer, 'danger', function () { Core.deleteProfile(p.id); if (Core.profiles().length) showParentPage(app); else Core.go('#/spillere'); })
      ])
    ]);
  }

  function showParentPage(app) {
    app.innerHTML = '';
    showLoading(app);
    Core.loadAll().then(function () { app.innerHTML = ''; renderParentPage(app); });
  }
  function renderParentPage(app) {
    var code = Core.exportCode();
    var out = h('textarea', { readonly: true, rows: '3', 'aria-label': S.saveProgress, class: 'code' }, code);
    var copyBtn = h('button', { type: 'button', class: 'btn secondary', onclick: function () {
      function ok() { copyBtn.textContent = S.copied; setTimeout(function () { copyBtn.textContent = S.copy; }, 2000); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, function () { out.select(); document.execCommand('copy'); ok(); });
      else { out.select(); document.execCommand('copy'); ok(); }
    } }, S.copy);
    var today = new Date().toISOString().slice(0, 10);
    var inBox = h('textarea', { rows: '3', placeholder: S.pasteCode, 'aria-label': S.pasteCode, class: 'code' });
    var msg = h('p', { role: 'status', class: 'muted' });
    var file = h('input', { type: 'file', accept: '.txt,text/plain', class: 'visually-hidden', id: 'loadfile', onchange: function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () { inBox.value = String(r.result); }; r.readAsText(f);
    } });
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + S.back), h('h1', {}, S.parentTitle)]),
      h('p', { class: 'lead' }, S.parentIntro),
      storageWarning(),
      h('h2', {}, S.players),
      Core.profiles().map(function (p) { return profileSection(app, p); }),
      h('section', { class: 'card' }, [h('h2', {}, S.saveProgress), h('p', {}, S.saveHelp), out,
        h('div', { class: 'row' }, [copyBtn, h('button', { type: 'button', class: 'btn secondary', onclick: function () { Core.download('bobspil-fremskridt-' + today + '.txt', code); } }, S.downloadFile)])]),
      h('section', { class: 'card' }, [h('h2', {}, S.loadProgress), h('p', {}, S.loadHelp), inBox, file,
        h('div', { class: 'row' }, [
          h('label', { class: 'btn secondary', for: 'loadfile' }, S.chooseFile),
          h('button', { type: 'button', class: 'btn primary', onclick: function () {
            if (Core.importCode(inBox.value)) { msg.textContent = S.loadOk; setTimeout(function () { if (Core.profile()) showParentPage(app); else Core.go('#/spillere'); }, 800); }
            else msg.textContent = S.loadFail;
          } }, S.load)
        ]), msg])
    ]));
  }

  root.Hub = { showProfiles: showProfiles, showHub: showHub, showParents: showParents, showLoading: showLoading, showLoadError: showLoadError, avatar: avatar };
})(window);
