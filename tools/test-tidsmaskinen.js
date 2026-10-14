// Tidsmaskinen: checks events, periods and the task generators. Run: node tools/test-tidsmaskinen.js  (needs hunspell da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../tidsmaskinen/strings-da.js');
var D = require('../tidsmaskinen/events.js'), execFileSync = require('child_process').execFileSync;
var game = null;
window.TM_DATA = D; window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s) { return s; }, registerGame: function (g) { game = g; } };
require('../tidsmaskinen/game.js');
var fails = 0, checks = 0;
function check(ok, msg) { checks++; if (!ok) { fails++; console.log('FAIL', msg); } }

// periods: contiguous, ordered
D.periods.forEach(function (p, i) {
  check(p.id && p.name && p.yt && p.color, 'period fields ' + p.id);
  check(p.to > p.from, 'period span ' + p.id);
  if (i) check(D.periods[i - 1].to === p.from || D.periods[i - 1].to + 1 === p.from, 'periods contiguous ' + D.periods[i - 1].id + ' → ' + p.id);
});
// events
var ids = {};
D.events.forEach(function (e) {
  check(e.id && typeof e.y === 'number' && e.yt && e.t && e.d && (e.b === 'M' || e.b === 'U'), 'event fields ' + e.id);
  check(!ids[e.id], 'duplicate event ' + e.id); ids[e.id] = 1;
  check(/[.!?]$/.test(e.d), 'event description ends with punctuation ' + e.id);
  check(e.y <= 2026, 'event not in the future ' + e.id);
});
check(D.events.filter(function (e) { return e.canon; }).length >= 29, 'covers the canon');
check(D.events.filter(function (e) { return e.world; }).length >= 15, 'enough world events');
// periodOf
D.periods.forEach(function (p) { check(game._periodOf(p.from) === p, 'periodOf(' + p.from + ') = ' + p.id); });
// things
D.things.forEach(function (th) { check(D.periods.some(function (p) { return p.id === th[1]; }), 'thing period ' + th[0]); });
// sources
D.sources.forEach(function (s) {
  check(s.title && s.text && s.kind && s.qs.length >= 2, 'source fields ' + s.title);
  s.qs.forEach(function (q) { var o = [q[1]].concat(q[2]); check(o.length === 3 && new Set(o).size === 3, 'source options unique: ' + q[0]); });
});
// generators: answer among unique options, many runs because they are random
var ev = function (id) { return D.events.filter(function (e) { return e.id === id; })[0]; };
for (var run = 0; run < 25; run++) ['M', 'U'].forEach(function (band) {
  ['period', 'life', 'first', 'world', 'year', 'source'].forEach(function (k) {
    var list = game._gen[k](band);
    check(list.length >= 10, k + ' ' + band + ' has enough tasks (' + list.length + ')');
    list.forEach(function (tk) {
      check(tk.options.indexOf(tk.answer) >= 0 && new Set(tk.options).size === tk.options.length, k + ' options ' + (tk.q || tk.answer));
      if (k === 'first') { var a = ev(tk.evs[0]), b = ev(tk.evs[1]); check((a.y < b.y ? a : b).t === tk.answer, 'first: ' + tk.answer); }
      if (k === 'year') check(tk.options.length === 4, 'year has four options ' + tk.q);
      if (k === 'period') check(game._periodOf(ev(tk.ev).y).name === tk.answer, 'period answer ' + tk.q);
      if (k === 'world') { var dk = ev(tk.evs[0]), w = ev(tk.evs[1]); check(Math.abs(dk.y - w.y) <= 60, 'world near ' + tk.q); }
    });
  });
  var ord = game._gen.order(band);
  check(ord.length >= 10, 'order ' + band + ' has tasks');
  ord.forEach(function (tk) { var ys = tk.items.map(function (id) { return ev(id).y; }); check(ys.every(function (y, i) { return !i || y > ys[i - 1]; }), 'order sorted ' + tk.items.join()); check(tk.items.length === (band === 'M' ? 3 : 4), 'order length'); });
  var cy = game._gen.year(band, 'canon');
  check(cy.every(function (tk) { return ev(tk.ev).canon; }), 'canon filter');
});
// routes
D.routes.forEach(function (r) { check(game._gen[r.kind], 'route kind ' + r.id); check(r.b === 'M' || r.b === 'U', 'route band ' + r.id); });

// Danish spelling of all event and source texts
var words = [];
function tok(s) { return String(s).replace(/\u00ad/g, '').replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉéü]+/g) || []; }
D.events.forEach(function (e) { words = words.concat(tok(e.t), tok(e.d)); });
D.things.forEach(function (th) { words = words.concat(tok(th[0])); });
D.sources.forEach(function (s) { words = words.concat(tok(s.title), tok(s.text), tok(s.kind)); s.qs.forEach(function (q) { words = words.concat(tok(q[0]), tok(q[1]), tok(q[2].join(' '))); }); });
D.periods.forEach(function (p) { words = words.concat(tok(p.name)); });
D.routes.forEach(function (r) { words = words.concat(tok(r.name), tok(r.desc)); });
Object.keys(window.STR.tm).forEach(function (k) { words = words.concat(tok([].concat(window.STR.tm[k]).join(' '))); });
var OK = ['ca', 'kumler']; // ca. is fine; kumler is the old word on the real Jelling stone
var list = Array.from(new Set(words)).filter(function (w) { return !/^[A-ZÆØÅ]/.test(w) && OK.indexOf(w) < 0; }); // names are checked by hand in the korrektur sheet
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));

console.log(fails ? 'Tidsmaskinen: ' + fails + ' of ' + checks + ' checks FAILED' : 'Tidsmaskinen: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
