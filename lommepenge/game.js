/*
 * Lommepenge – penge og økonomi.
 * Bob åbner en lille butik (mellemtrin) og flytter senere i sin første lejlighed (udskoling). Barnet tæller penge, giver byttepenge,
 * holder budgettet, finder det bedste køb, sparer op og regner på rabat, moms, renter, lån og ÅOP.
 * Opgaverne laves af money.js. Her er kun tegninger (SVG) og skærmene. Nåede sparemål samles i sparebøssen.
 */
(function (root) {
  'use strict';
  var Core = root.Core, M = root.LP_MONEY, Bob = root.Bob, S = root.STR.lp, SC = root.STR.core;
  var h = Core.h, t = function (s, v) { return M.fill(s, v); }; // like Core.t, and avoids »kr..« at the end of a sentence
  var ID = 'lommepenge', OUTFIT = 'shop';
  var app = null, st = null, timers = [], clock = 0, el = {};
  var INK = '#4A2C17';

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {}; d.goals = d.goals || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0 }); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rname(r) { return S.routes[r.id].name; }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ================= DRAWINGS (strings with inline styles, also used by quickTask) ================= */
  var METAL = { copper: ['#D58C52', '#8E4D22', '#F3C196', '#5C2E10'], silver: ['#D9DEE3', '#7D8790', '#FAFBFC', '#3E474F'], gold: ['#E9C24F', '#9C7615', '#FAE6A6', '#5E4508'] };
  function moneyName(v) { return S.denomIndef[v]; }
  function coinSvg(v, s) {
    var d = M.denom(v), c = METAL[d.metal], size = Math.round(d.mm * (s || 2.4)), big = v >= 100 ? String(v / 100) : '50';
    var disk = 'M2,50 a48,48 0 1,0 96,0 a48,48 0 1,0 -96,0 Z' + (d.hole ? ' M35,50 a15,15 0 1,0 30,0 a15,15 0 1,0 -30,0 Z' : '');
    var out = '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(moneyName(v)) + '" style="display:block;flex:none;overflow:visible">' +
      '<path d="' + disk + '" fill-rule="evenodd" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="3"/>' +
      '<circle cx="50" cy="50" r="41" fill="none" stroke="' + c[1] + '" stroke-width="1.6" stroke-dasharray="1.5 3.2"/>' +
      '<path d="M18,34 a36,36 0 0 1 22,-20" fill="none" stroke="' + c[2] + '" stroke-width="5" stroke-linecap="round" opacity=".9"/>';
    if (d.hole) out += '<text x="50" y="31" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="27" fill="' + c[3] + '">' + big + '</text>' +
      '<text x="50" y="83" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="15" fill="' + c[3] + '">' + S.coinKr + '</text>';
    else out += '<text x="50" y="61" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="40" fill="' + c[3] + '">' + big + '</text>' +
      '<text x="50" y="80" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="13" fill="' + c[3] + '">' + (v === 50 ? S.coinOre : S.coinKr) + '</text>';
    return out + '</svg>';
  }
  function noteSvg(v, hpx) {
    var d = M.denom(v), H = hpx || 52, W = H * 2;
    return '<svg viewBox="0 0 200 100" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(moneyName(v)) + '" style="display:block;flex:none">' +
      '<rect x="2" y="2" width="196" height="96" rx="10" fill="' + d.color + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="10" y="10" width="180" height="80" rx="6" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>' +
      '<circle cx="52" cy="50" r="27" fill="#fff" fill-opacity=".22"/><circle cx="52" cy="50" r="17" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>' +
      '<path d="M20,80 q12,-10 24,0 t24,0 t24,0" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>' +
      '<text x="140" y="60" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="46" fill="#fff">' + (v / 100) + '</text>' +
      '<text x="140" y="82" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="13" letter-spacing="2" fill="#fff">' + S.noteKr + '</text></svg>';
  }
  function moneySvg(v, scale) { return M.denom(v).coin ? coinSvg(v, scale) : noteSvg(v, scale ? scale * 22 : 52); }
  function row(items, gap) { return '<div style="display:flex;flex-wrap:wrap;gap:' + (gap || 10) + 'px;justify-content:center;align-items:center">' + items.join('') + '</div>'; }
  var CARD = 'background:#fff;border:3px solid ' + INK + ';border-radius:14px;padding:8px 12px;box-shadow:0 3px 0 ' + INK + ';text-align:center;';
  function tagHtml(f) {
    return '<div style="display:inline-flex;flex-direction:column;align-items:center;position:relative;background:#FFF6D8;border:3px solid ' + INK + ';border-radius:14px 14px 14px 4px;padding:8px 18px;box-shadow:0 3px 0 ' + INK + '">' +
      '<span style="font-weight:700;font-size:16px">' + esc(f.name) + '</span>' +
      (f.old ? '<s style="color:#7A5A3E;font-size:16px">' + M.kr(f.old) + '</s>' : '') +
      '<strong style="font-size:26px;color:' + (f.old ? '#C23B30' : INK) + '">' + M.kr(f.price) + '</strong>' +
      (f.note ? '<span style="font-size:14px;color:#7A5A3E;font-weight:700">' + esc(f.note) + '</span>' : '') +
      (f.badge ? '<span style="position:absolute;top:-14px;right:-16px;background:#C23B30;color:#fff;font-weight:800;font-size:15px;border-radius:999px;padding:4px 8px;border:2px solid ' + INK + '">' + esc(f.badge) + '</span>' : '') + '</div>';
  }
  function tableHtml(head, rows, compact, foot) {
    var pad = compact ? '2px 6px' : '6px 10px', fs = compact ? '14px' : '16px';
    var th = function (c, i) { return '<th style="text-align:' + (i ? 'right' : 'left') + ';padding:' + pad + ';border-bottom:2px solid ' + INK + '">' + esc(c) + '</th>'; };
    var td = function (c, i) { return '<td style="text-align:' + (i ? 'right' : 'left') + ';padding:' + pad + ';border-bottom:1px solid #F0DDB0;white-space:nowrap">' + esc(c) + '</td>'; };
    return '<div style="overflow-x:auto;max-width:100%"><table style="border-collapse:collapse;margin:0 auto;background:#fff;font-size:' + fs + ';border:2px solid ' + INK + ';border-radius:10px">' +
      (head ? '<tr style="background:#FFF3D6">' + head.map(th).join('') + '</tr>' : '') + rows.map(function (r) { return '<tr' + (r.style ? ' style="' + r.style + '"' : '') + '>' + r.map(td).join('') + '</tr>'; }).join('') +
      (foot || '') + '</table></div>';
  }
  function packIcon(unit) {
    if (unit === 'l') return '<svg viewBox="0 0 40 60" width="30" height="45" aria-hidden="true"><path d="M14 4h12v8l6 8v34a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V20l6-8z" fill="#BFE0F5" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><rect x="12" y="28" width="16" height="14" rx="2" fill="#fff" stroke="' + INK + '" stroke-width="2"/></svg>';
    if (unit === 'stk') return '<svg viewBox="0 0 60 44" width="42" height="31" aria-hidden="true"><rect x="3" y="12" width="54" height="29" rx="5" fill="#F6D58E" stroke="' + INK + '" stroke-width="3"/><circle cx="17" cy="12" r="8" fill="#E9A85A" stroke="' + INK + '" stroke-width="2.5"/><circle cx="30" cy="12" r="8" fill="#E9A85A" stroke="' + INK + '" stroke-width="2.5"/><circle cx="43" cy="12" r="8" fill="#E9A85A" stroke="' + INK + '" stroke-width="2.5"/></svg>';
    return '<svg viewBox="0 0 44 56" width="33" height="42" aria-hidden="true"><path d="M8 8h28l4 44a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#F6D58E" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M8 8l-2-5h32l-2 5" fill="#E9A85A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><rect x="12" y="24" width="20" height="14" rx="2" fill="#fff" stroke="' + INK + '" stroke-width="2"/></svg>';
  }
  // f.t: coins | tag | pay | receipt | shops | packs | table | budget
  function figHtml(f, compact) {
    if (!f) return '';
    switch (f.t) {
      case 'coins': return row(f.list.map(function (v) { return moneySvg(v, compact ? 2 : 2.4); }));
      case 'tag': return row([tagHtml(f)]);
      case 'pay': return row([tagHtml({ name: S.priceLabel, price: f.price }), '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-weight:700;font-size:15px;color:#7A5A3E">' + esc(S.customerPays) + '</span>' + moneySvg(f.paid, compact ? 2.1 : 2.6) + '</div>'], 22);
      case 'receipt': return tableHtml(S.receiptHead, f.lines.map(function (l) { return [l[0], String(l[1]), M.kr(l[2])]; }), compact);
      case 'shops': return row(f.shops.map(function (s) {
        return '<div style="' + CARD + 'min-width:128px;flex:1 1 128px;max-width:200px"><div style="font-weight:800;font-size:16px">' + esc(s.name) + '</div><div style="font-size:15px;color:#7A5A3E">' + esc(s.item) + '</div>' +
          '<div style="margin:6px auto;display:inline-block;background:#C23B30;color:#fff;font-weight:800;border-radius:8px;padding:2px 10px;font-size:17px">' + esc(s.offer) + '</div>' +
          '<div style="font-size:15px">' + M.kr(s.price) + ' ' + esc(S.perPiece) + '</div></div>';
      }));
      case 'packs': return row(f.packs.map(function (p) {
        return '<div style="' + CARD + 'display:flex;flex-direction:column;align-items:center;gap:2px;min-width:104px">' + packIcon(f.unit) + '<strong style="font-size:17px">' + esc(p.label) + '</strong><span style="font-size:16px">' + M.kr(p.price) + '</span></div>';
      }));
      case 'table': return tableHtml(f.head, f.rows, compact);
      case 'budget':
        var rows = [[S.income, M.krk(f.income)]];
        rows[0].style = 'background:#E9F6E5;font-weight:700';
        return tableHtml(null, rows.concat([[S.expenses, '']].concat(f.rows.map(function (r) { return ['  ' + S.budgetItems[r[0]], '−' + M.krk(r[1])]; }))), compact || f.rows.length > 7);
    }
    return '';
  }
  // Søjlediagram over en opsparing. c = { goal, start, step, n, unit: 'w'|'m', deadline }; step kan være null (tomt diagram).
  function chartSvg(c, stepAmount, anim) {
    var W = 360, H = 200, L = 46, B = 26, T = 18, n = c.n, stp = stepAmount === undefined ? c.step : stepAmount;
    var vals = []; if (stp) for (var k = 1; k <= n; k++) vals.push(c.start + stp * k);
    var top = Math.max(c.goal, vals.length ? vals[vals.length - 1] : 0) * 1.12 || 1, ph = H - B - T, slot = (W - L - 8) / n, bw = Math.max(4, slot * 0.68);
    var y = function (v) { return T + ph - ph * v / top; }, gy = y(c.goal);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:520px;height:auto;max-height:220px;display:block;margin:0 auto" role="img" aria-label="' + esc(t(S.goalLine, { x: M.krk(c.goal) })) + '">' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="12" fill="#fff"/>' +
      '<line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (W - 6) + '" y2="' + (T + ph) + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<text x="' + (L - 6) + '" y="' + (T + ph + 4) + '" text-anchor="end" font-size="12" fill="#7A5A3E" font-family="Arial,sans-serif">0</text>';
    vals.forEach(function (v, i) {
      var x = L + 4 + slot * i + (slot - bw) / 2, yy = y(v), hh = T + ph - yy;
      s += '<rect x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2" fill="' + (v >= c.goal ? '#3F8A3A' : '#2F7DB3') + '"' +
        (anim ? ' class="lp-bar" style="animation-delay:' + (i * 0.12).toFixed(2) + 's"' : '') + '/>';
    });
    for (var i = 0; i < n; i++) if (n <= 12 || i % 2 === 0 || i === n - 1) s += '<text x="' + (L + 4 + slot * i + slot / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" fill="#7A5A3E" font-family="Arial,sans-serif">' + (i + 1) + '</text>';
    s += '<text x="4" y="' + (H - 8) + '" font-size="12" fill="#7A5A3E" font-family="Arial,sans-serif">' + (c.unit === 'm' ? S.monthShort : S.weekShort) + '</text>';
    if (c.deadline) { var dx = L + 4 + slot * c.deadline; s += '<line x1="' + dx.toFixed(1) + '" y1="' + T + '" x2="' + dx.toFixed(1) + '" y2="' + (T + ph) + '" stroke="#7A5A3E" stroke-width="2" stroke-dasharray="4 4"/>'; }
    s += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - 6) + '" y2="' + gy.toFixed(1) + '" stroke="#C23B30" stroke-width="2.5" stroke-dasharray="7 5"/>' +
      '<text x="' + (L + 6) + '" y="' + (gy - 6).toFixed(1) + '" font-size="14" font-weight="700" fill="#C23B30" font-family="Arial,sans-serif">' + esc(t(S.goalLine, { x: M.krk(c.goal) })) + '</text>';
    return s + '</svg>';
  }
  // Baggrund til spillet (800 × 240). Den skaleres til scenens højde og beskæres eller udfyldes i siderne (lommepenge.css).
  function sceneSvg(band) {
    var o = '<svg viewBox="0 0 800 240" aria-hidden="true">';
    if (band === 'U') return o +
      '<rect width="800" height="200" fill="#E4EEF4"/><rect y="200" width="800" height="40" fill="#C9A47A"/><path d="M0 200h800" stroke="#9C7A52" stroke-width="4"/>' +
      '<rect x="330" y="40" width="180" height="120" rx="6" fill="#BFE3F7" stroke="#6E7F8C" stroke-width="8"/><path d="M420 40v120M330 100h180" stroke="#6E7F8C" stroke-width="6"/>' +
      '<path d="M338 156v-34h20v-16h18v26h16v-40h24v64z" fill="#9DB4C9"/><path d="M440 156v-48h18v18h14v-32h16v62z" fill="#8AA3B9"/>' +
      '<rect x="572" y="150" width="196" height="50" rx="14" fill="#5C8FBF" stroke="' + INK + '" stroke-width="4"/><rect x="582" y="126" width="176" height="36" rx="12" fill="#6FA3D1" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="604" y="58" width="96" height="56" rx="4" fill="#FFF6D8" stroke="' + INK + '" stroke-width="3"/><path d="M616 74h50M616 86h70M616 98h38" stroke="#9DB4C9" stroke-width="4"/>' +
      '<circle cx="246" cy="132" r="28" fill="#5FA555" stroke="' + INK + '" stroke-width="3"/><rect x="230" y="166" width="32" height="34" rx="4" fill="#D58C52" stroke="' + INK + '" stroke-width="3"/></svg>';
    var shelves = [96, 146].map(function (yy, k) {
      var g = '<rect x="580" y="' + yy + '" width="210" height="9" fill="#9C6B3E" stroke="' + INK + '" stroke-width="3"/>';
      ['#2F7DB3', '#F7C548', '#3F8A3A', '#C23B30', '#7B5EA7', '#D9772B'].forEach(function (col, i) { var hh = 32 - (i + k) % 2 * 6; g += '<rect x="' + (588 + i * 33) + '" y="' + (yy - hh) + '" width="25" height="' + hh + '" rx="3" fill="' + col + '" stroke="' + INK + '" stroke-width="2.5"/>'; });
      return g;
    }).join('');
    return o + '<rect width="800" height="200" fill="#FCE7C8"/><rect y="200" width="800" height="40" fill="#D9B48A"/>' +
      '<path d="M296 40h250l-12 32H308z" fill="#C23B30" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<text x="421" y="64" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="21" fill="#fff">' + esc(M.SHOPS[0]) + '</text>' + shelves +
      '<rect x="306" y="160" width="300" height="40" fill="#B9875A" stroke="' + INK + '" stroke-width="4"/><rect x="298" y="148" width="316" height="14" rx="4" fill="#8B5A2B" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="470" y="100" width="96" height="48" rx="6" fill="#56677D" stroke="' + INK + '" stroke-width="4"/><rect x="482" y="108" width="72" height="17" rx="3" fill="#9FF0B5"/><rect x="460" y="140" width="116" height="10" rx="3" fill="#3A4A5E" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="356" cy="141" r="9" fill="#E9C24F" stroke="' + INK + '" stroke-width="2.5"/><circle cx="378" cy="143" r="7" fill="#D9DEE3" stroke="' + INK + '" stroke-width="2.5"/></svg>';
  }

  /* ---------- hub API ---------- */
  function routesOf(band) { return M.ROUTES.filter(function (r) { return r.b === band; }); }
  function summary(d) {
    d = d || {};
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = routesOf(band);
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = []; d = d || {};
    M.ROUTES.forEach(function (r) { var rs = (d.routes || {})[r.id]; if (rs && rs.plays) rows.push([rname(r) + ' (' + r.b + ')', rs.stars + '/3', rs.best + ' %']); });
    return { head: S.reportHead, rows: rows };
  }
  function progress(d) {
    d = d || {}; var plays = 0, bands = { M: [], U: [] };
    M.ROUTES.forEach(function (r) { var rs = (d.routes || {})[r.id] || {}; plays += rs.plays || 0; bands[r.b].push(rs.stars || 0); });
    return { plays: plays, bands: bands };
  }
  function collection(d) {
    var g = (d && d.goals) || {};
    return { n: M.GOALS.filter(function (x) { return g[x.id]; }).length, max: M.GOALS.length };
  }
  function optLabel(tk, o) { return tk.optKind === 'money' ? moneyName(+o) : tk.optKind === 'kr' ? M.krk(+o) : o; }
  function quickTask(band, d) {
    band = band === 'U' ? 'U' : 'M'; d = d || {};
    var list = routesOf(band), stars = function (r) { return ((d.routes || {})[r.id] || {}).stars || 0; };
    var min = Math.min.apply(null, list.map(stars)), cand = list.filter(function (r) { return stars(r) === min; }), r = cand[Math.floor(Math.random() * cand.length)];
    var tk = M.gen[r.quick[Math.floor(Math.random() * r.quick.length)]]();
    var out = { q: tk.q, hint: tk.hint, explain: tk.explain, speak: tk.q, lang: 'da' }, html = figHtml(tk.fig, true);
    if (html) out.html = html;
    if (tk.type === 'choice') { out.options = tk.options.map(function (o) { return optLabel(tk, o); }); out.answer = optLabel(tk, tk.answer); }
    else {
      var a = tk.answer, simple = a < 1000 && !tk.tol && Math.abs(a * 2 - Math.round(a * 2)) < 1e-9;
      if (simple) { out.input = 'number'; out.answer = String(a).replace('.', ','); out.unit = tk.unit; }
      else { out.options = shuffle([a].concat(tk.wrong)).map(function (v) { return M.fmtAnswer(v, tk.unit); }); out.answer = M.fmtAnswer(a, tk.unit); }
    }
    return out;
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearTimers(); clearInterval(clock); Core.stopSpeaking(); st = null; el = {}; Core.save(); }

  /* ================= MAP ================= */
  function showMap() {
    clearTimers(); Core.stopSpeaking(); st = null; el = {};
    var d = data(), list = routesOf(d.band), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (routeState(list[i].id).stars < 3) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen lp-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back), h('button', { type: 'button', class: 'btn secondary', onclick: showCollection }, S.collection + ' (' + collection(d).n + ')')]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id);
        return h('button', { type: 'button', class: 'rs-world lp-route' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, rname(r)), h('span', { class: 'rs-world-desc' }, S.routes[r.id].desc), h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      })),
      h('p', { class: 'muted lp-fiction' }, S.fictional)
    ]));
  }

  /* ================= COLLECTION ================= */
  function showCollection() {
    var d = data(), c = collection(d);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.collectionTitle)]),
      h('p', { class: 'lead' }, c.n ? t(S.collectionCount, c) : S.collectionEmpty),
      h('p', { class: 'muted' }, S.collectionHint),
      h('div', { class: 'lp-jar-bar', role: 'img', 'aria-label': t(S.collectionCount, c) }, h('span', { style: 'width:' + Math.round(100 * c.n / c.max) + '%' })),
      h('ul', { class: 'lp-goals' }, M.GOALS.map(function (g) {
        var got = !!d.goals[g.id];
        return h('li', { class: 'card lp-goal' + (got ? ' got' : '') }, [
          h('span', { class: 'lp-goal-ico', 'aria-hidden': 'true', html: got ? coinSvg(2000, 1.5) : '?' }),
          h('strong', {}, got ? g.a : S.locked), got ? h('span', {}, M.krk(g.p) + ' · ' + S.reached) : null]);
      }))
    ]));
  }

  /* ================= PLAY ================= */
  function startRound(route) {
    clearTimers(); Core.stopSpeaking();
    st = { route: route, tasks: M.buildRound(route), i: 0, results: [], attempt: 0, locked: false, newGoals: [] };
    app.innerHTML = '';
    el.step = h('span', { class: 'rs-wave' });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, rname(route)), el.step]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', onclick: readTask }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.scene = h('div', { class: 'oj-scene lp-scene' + (route.b === 'U' ? ' u' : ''), html: sceneSvg(route.b) });
    el.bob = h('div', { class: 'oj-bob lp-bob' }); el.bubble = h('div', { class: 'oj-bubble', role: 'status', 'aria-live': 'polite' });
    el.scene.appendChild(el.bob); el.scene.appendChild(el.bubble);
    el.task = h('div', { class: 'oj-task lp-task' });
    el.root = h('div', { class: 'oj-play lp-play' }, [hud, el.scene, h('div', { class: 'oj-task-wrap' }, el.task)]);
    app.appendChild(el.root);
    setBob('hello', pick(route.b === 'U' ? S.bobStartU : S.bobStartM));
    showTask();
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
  function task() { return st.tasks[st.i]; }
  function readTask() {
    var tk = task(); if (!tk) return;
    Core.speak(tk.q + (tk.options ? ' ' + tk.options.map(function (o) { return optLabel(tk, o); }).join('. ') : ''));
  }
  function showTask() {
    clearTimers();
    var tk = task(); if (!tk) return finish();
    st.attempt = 0; st.locked = false;
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    el.task.innerHTML = '';
    el.task.appendChild(h('p', { class: 'lp-q' }, tk.q));
    if (tk.kind === 'plan') el.task.appendChild(h('p', { class: 'oj-prompt' }, S.q.planTip));
    if (tk.fig) el.task.appendChild(h('div', { class: 'lp-fig', html: figHtml(tk.fig) }));
    el.body = h('div', { class: 'oj-body lp-body k-' + tk.kind }); el.task.appendChild(el.body);
    el.feedback = h('div', { class: 'oj-feedback', role: 'status', 'aria-live': 'polite' }); el.task.appendChild(el.feedback);
    ({ choice: tk.kind === 'plan' ? renderPlan : renderChoice, number: renderNumber, pay: renderCash, change: renderCash, basket: renderBasket }[tk.type])(tk);
    el.task.classList.remove('enter'); void el.task.offsetWidth; el.task.classList.add('enter');
    el.root.querySelector('.oj-task-wrap').scrollTop = 0;
  }

  /* ---------- multiple choice ---------- */
  function optionButtons(tk, onPick) {
    var short = tk.options.every(function (o) { return String(optLabel(tk, o)).length <= 16; });
    var box = h('div', { class: 'oj-options ' + (tk.optKind === 'money' ? 'lp-moneyopts' : short ? 'lp-grid' : 'col') });
    tk.options.forEach(function (o) {
      var b = h('button', { type: 'button', class: 'oj-opt' + (short || tk.optKind === 'money' ? '' : ' wide'), 'data-v': o, 'aria-label': optLabel(tk, o), onclick: function () { (onPick || answer)(o, b); } },
        tk.optKind === 'money' ? h('span', { html: moneySvg(+o, 2.2) }) : optLabel(tk, o));
      box.appendChild(b);
    });
    return box;
  }
  function renderChoice(tk) { el.body.appendChild(optionButtons(tk)); }
  function renderPlan(tk) {
    el.chart = h('div', { class: 'lp-chart', html: chartSvg(tk.chart, null) });
    el.body.appendChild(el.chart);
    el.body.appendChild(optionButtons(tk, function (o, b) { if (st.locked) return; el.chart.innerHTML = chartSvg(tk.chart, +o, true); answer(o, b); }));
  }

  /* ---------- number input ---------- */
  function renderNumber(tk) {
    var inp = h('input', { type: 'text', inputmode: 'decimal', class: 'oj-input lp-input', 'aria-label': S.answerLabel, autocomplete: 'off', enterkeyhint: 'done' });
    function submit() {
      if (st.locked) return;
      var v = M.parseDa(inp.value);
      if (isNaN(v)) { el.feedback.innerHTML = ''; el.feedback.appendChild(h('div', { class: 'oj-rule' }, h('p', {}, S.needNumber))); inp.focus(); return; }
      answer(v, inp);
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    el.input = inp;
    el.body.appendChild(h('div', { class: 'lp-numrow' }, [inp, h('span', { class: 'lp-unit' }, tk.unit), h('button', { type: 'button', class: 'btn primary lp-check', onclick: submit }, S.check)]));
    if (!('ontouchstart' in root)) later(function () { try { inp.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 50);
  }

  /* ---------- pay or give change: tap coins and notes ---------- */
  function renderCash(tk) {
    var change = tk.type === 'change', placed = [];
    var counter = h('div', { class: 'lp-counter', 'aria-live': 'polite' }), btn;
    function draw() {
      counter.innerHTML = '';
      if (!placed.length) counter.appendChild(h('span', { class: 'lp-empty' }, change ? S.changeEmpty : S.payEmpty));
      placed.forEach(function (v, i) {
        counter.appendChild(h('button', { type: 'button', class: 'lp-piece', 'aria-label': t(S.remove, { x: moneyName(v) }), disabled: st.locked, html: moneySvg(v, 2),
          onclick: function () { if (st.locked) return; placed.splice(i, 1); Core.play('step'); draw(); } }));
      });
      btn.disabled = st.locked || !placed.length; clearBtn.disabled = st.locked || !placed.length;
    }
    var tray = h('div', { class: 'lp-tray' }, tk.tray.slice().sort(function (a, b) { return a - b; }).map(function (v) {
      return h('button', { type: 'button', class: 'lp-coinbtn', 'data-v': v, 'aria-label': t(S.add, { x: moneyName(v) }), html: moneySvg(v, 2.1),
        onclick: function () { if (st.locked || placed.length >= 30) return; placed.push(v); placed.sort(function (a, b) { return b - a; }); Core.play('click'); draw(); } });
    }));
    btn = h('button', { type: 'button', class: 'btn primary', onclick: function () { answer(placed.slice(), counter); } }, change ? S.changeBtn : S.payBtn);
    var clearBtn = h('button', { type: 'button', class: 'btn ghost', onclick: function () { placed = []; draw(); } }, S.clear);
    el.cash = { draw: draw, get: function () { return placed; } };
    el.body.appendChild(h('div', { class: 'lp-label' }, change ? S.changeTray : S.payTray));
    el.body.appendChild(tray);
    el.body.appendChild(h('div', { class: 'lp-label' }, change ? S.changeArea : S.payArea));
    el.body.appendChild(counter);
    el.body.appendChild(h('p', { class: 'lp-small muted' }, S.takeBack));
    el.body.appendChild(h('div', { class: 'row center lp-cashbtns' }, [clearBtn, btn]));
    draw();
  }

  /* ---------- shopping basket ---------- */
  function renderBasket(tk) {
    var chosen = tk.rows.map(function () { return -1; }), meter = h('div', { class: 'lp-meter' }), buy;
    function total() { return sum(chosen.map(function (c, i) { return c < 0 ? 0 : tk.rows[i].opts[c].price; })); }
    function draw() {
      var tot = total(), over = tot > tk.budget;
      meter.innerHTML = '';
      meter.appendChild(h('div', { class: 'lp-meter-txt' }, [h('span', {}, S.total + ': '), h('strong', {}, M.kr(tot)), h('span', {}, ' / ' + S.budget + ': ' + M.kr(tk.budget))]));
      meter.appendChild(h('div', { class: 'lp-meter-bar' + (over ? ' over' : '') }, h('span', { style: 'width:' + Math.min(100, Math.round(100 * tot / tk.budget)) + '%' })));
      meter.appendChild(h('div', { class: 'lp-meter-note' }, over ? S.overBudget : t(S.leftOver, { x: M.kr(tk.budget - tot) })));
      [].forEach.call(el.body.querySelectorAll('.lp-prod'), function (b) {
        var on = chosen[+b.getAttribute('data-r')] === +b.getAttribute('data-o');
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = st.locked;
      });
      buy.disabled = st.locked || chosen.indexOf(-1) >= 0;
    }
    tk.rows.forEach(function (r, ri) {
      el.body.appendChild(h('div', { class: 'lp-brow' }, [h('div', { class: 'lp-btitle' }, r.title), h('div', { class: 'lp-bopts' }, r.opts.map(function (o, oi) {
        return h('button', { type: 'button', class: 'lp-prod', 'data-r': ri, 'data-o': oi, 'aria-pressed': 'false', onclick: function () { chosen[ri] = oi; Core.play('click'); draw(); } },
          [h('span', {}, o.name), h('strong', {}, M.kr(o.price))]);
      }))]));
    });
    buy = h('button', { type: 'button', class: 'btn primary', onclick: function () { answer(chosen.slice(), meter); } }, S.buy);
    el.basket = { draw: draw, total: total };
    el.body.appendChild(meter);
    el.body.appendChild(h('div', { class: 'row center' }, buy));
    draw();
  }

  /* ---------- answers ---------- */
  function basketTotal(tk, v) { return sum(v.map(function (c, i) { return tk.rows[i].opts[c].price; })); }
  function isRight(tk, v) {
    if (tk.type === 'pay' || tk.type === 'change') return sum(v) === tk.answer;
    if (tk.type === 'basket') return v.indexOf(-1) < 0 && basketTotal(tk, v) <= tk.budget;
    if (tk.type === 'number') return Math.abs(v - tk.answer) <= (tk.tol || 0.005);
    return v === tk.answer;
  }
  function answer(value, node) {
    var tk = task(); if (!tk || st.locked) return;
    if (isRight(tk, value)) {
      st.locked = true;
      var first = st.attempt === 0;
      st.results.push(first ? 1 : 0.5);
      if (tk.goal) { var d = data(); if (!d.goals[tk.goal]) { d.goals[tk.goal] = 1; st.newGoals.push(tk.goal); } }
      Core.saveSoon();
      if (node && node.classList) node.classList.add('right');
      reveal(tk, true, value);
      Core.play('correct');
      var g = tk.goal && st.newGoals.indexOf(tk.goal) >= 0 ? M.GOALS.filter(function (x) { return x.id === tk.goal; })[0] : null;
      setBob(first ? 'happy' : 'encouraging', g ? t(S.newGoal, { x: g.a }) : pick(first ? S.correct : S.correctSecond));
      return;
    }
    st.attempt++;
    Core.play('wrong');
    if (node && node.classList) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake', 'wrong'); if (node.tagName === 'BUTTON') node.disabled = true; }
    var binary = tk.options && tk.options.length === 2;
    if (st.attempt === 1 && !binary) {
      setBob('thinking', S.tryAgain);
      el.feedback.innerHTML = '';
      var box = h('div', { class: 'oj-rule' });
      if (tk.type === 'pay' || tk.type === 'change') {
        var s = sum(value), diff = tk.answer - s;
        box.appendChild(h('p', {}, h('strong', {}, t(diff > 0 ? S.h.payLess : S.h.payMore, { sum: M.kr(s), diff: M.kr(Math.abs(diff)) }))));
      }
      if (tk.type === 'basket') {
        var tot = value.indexOf(-1) < 0 ? basketTotal(tk, value) : 0;
        if (tot > tk.budget) box.appendChild(h('p', {}, h('strong', {}, t(tk.hint, { over: M.kr(tot - tk.budget) }))));
      } else box.appendChild(h('p', {}, tk.hint));
      if (box.childNodes.length) { el.feedback.appendChild(box); later(function () { if (box.scrollIntoView) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60); }
      if (tk.type === 'number') later(function () { if (el.input) { el.input.classList.remove('wrong'); el.input.select(); } }, 700);
      if (node && node.classList && tk.type !== 'choice' && tk.type !== 'number') later(function () { node.classList.remove('wrong'); }, 900);
      return;
    }
    st.results.push(0); st.locked = true;
    reveal(tk, false, value);
    setBob('encouraging', binary ? S.wrongTwo : null);
  }
  function reveal(tk, ok, value) {
    [].forEach.call(el.body.querySelectorAll('.oj-opt'), function (b) { if (b.getAttribute('data-v') === tk.answer) b.classList.add('right'); b.disabled = true; });
    if (el.cash && (tk.type === 'pay' || tk.type === 'change')) el.cash.draw();
    if (el.basket && tk.type === 'basket') el.basket.draw();
    if (el.input && tk.type === 'number') { el.input.disabled = true; if (ok) el.input.classList.add('right'); }
    [].forEach.call(el.body.querySelectorAll('.lp-coinbtn, .lp-check, .lp-cashbtns .btn'), function (b) { b.disabled = true; });
    el.feedback.innerHTML = '';
    var box = h('div', { class: 'oj-rule' + (ok ? '' : ' final') });
    if (!ok) {
      if (tk.type === 'number') box.appendChild(h('p', { class: 'oj-answer' }, t(S.answerWas, { a: M.fmtAnswer(tk.answer, tk.unit) })));
      else if (tk.type === 'choice') box.appendChild(h('p', { class: 'oj-answer' }, t(S.answerWas, { a: optLabel(tk, tk.answer) })));
      else if (tk.type === 'pay' || tk.type === 'change') { box.appendChild(h('p', {}, h('strong', {}, S.showSolution))); box.appendChild(h('div', { class: 'lp-sol', html: row(tk.solution.map(function (v) { return moneySvg(v, 1.8); }), 6) })); }
    }
    if (ok && tk.type === 'change') {
      var best = value.length <= tk.minCount;
      box.appendChild(h('p', {}, h('strong', {}, best ? t(S.x.changeBest, { n: value.length }) : t(S.x.changeFewer, { combo: tk.solution.map(M.kr).join(' + '), n: tk.minCount, m: value.length }))));
      if (!best) box.appendChild(h('div', { class: 'lp-sol', html: row(tk.solution.map(function (v) { return moneySvg(v, 1.8); }), 6) }));
    }
    if (ok && tk.type === 'basket') {
      var tot = basketTotal(tk, value);
      box.appendChild(h('p', {}, h('strong', {}, t(S.x.basketOk, { sum: M.kr(tot), left: M.kr(tk.budget - tot) }))));
    }
    if (!(ok && tk.type === 'basket')) box.appendChild(h('p', {}, tk.explain));
    if (tk.chart && tk.kind !== 'plan') box.appendChild(h('div', { class: 'lp-chart', html: chartSvg(tk.chart, undefined, true) }));
    if (tk.kind === 'plan' && el.chart) el.chart.innerHTML = chartSvg(tk.chart, +tk.answer, true);
    box.appendChild(h('button', { type: 'button', class: 'btn primary', onclick: nextTask }, S.continue));
    el.feedback.appendChild(box);
    var btn = box.querySelector('.btn'); btn.focus({ preventScroll: true });
    later(function () { if (btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
  }
  function nextTask() { Core.play('step'); st.i++; el.cash = el.basket = el.input = el.chart = null; showTask(); }

  /* ---------- finish ---------- */
  function finish() {
    clearTimers();
    var total = st.results.length || 1, acc = sum(st.results) / total;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0, first = st.results.filter(function (r) { return r === 1; }).length, route = st.route;
    var rs = routeState(route.id), oldStars = rs.stars, newBest = stars > rs.stars;
    rs.stars = Math.max(rs.stars, stars); rs.best = Math.max(rs.best, Math.round(100 * first / total)); rs.plays++;
    Core.save();
    var badgeNode = Core.roundDone(ID, route.id, oldStars, rs.stars);
    setBob(stars >= 2 ? 'cheering' : 'happy', null);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: OUTFIT, size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox, badgeNode || null,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { correct: first, total: st.results.length })),
      st.newGoals.length ? h('p', {}, t(S.newGoals, { n: st.newGoals.length })) : null,
      stars === 0 ? h('p', { class: 'muted' }, S.resultTip) : null,
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
    _state: function () { return st; }, _fig: figHtml, _chart: chartSvg, _money: moneySvg }); // test hooks
})(window);
