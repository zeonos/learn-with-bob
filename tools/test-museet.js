// Mysteriet på museet: checks the story (every clue exists, the clues clear exactly the innocent suspects, one culprit),
// runs every room's generator in both bands thousands of times with different seeds and re-computes every answer
// independently (time arithmetic, timeline order, rune decoding with my own rune table, the scale, the letter, the attic),
// checks that every step has exactly one right answer, the daily challenge, the hub API and the Danish spelling.
// Run: node tools/test-museet.js   (needs hunspell da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../museet/strings-da.js');
var STORY = require('../museet/story.js'), PZ = require('../museet/puzzles.js');
var S = window.STR.mu, execFileSync = require('child_process').execFileSync, game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, gameData: function () { return {}; }, profile: function () { return null; } };
require('../museet/game.js');
var fails = 0, checks = 0, seen = {}, texts = [];
function check(ok, msg) { checks++; if (!ok) { fails++; if (!seen[msg]) { seen[msg] = 1; console.log('FAIL', msg); } } }
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function uniq(a) { return new Set(a).size === a.length; }
function text(s, where) { check(typeof s === 'string' && s.length > 1 && !/\{\w+\}|undefined|NaN|null/.test(s), 'text ok: ' + where + ': ' + s); texts.push({ s: s, where: where }); }
var BANDS = ['M', 'U'], ROOMS = ['hallen', 'oldtiden', 'vikingetiden', 'middelalderen', 'renaessancen', 'loftet'];

/* ---------- the story holds together ---------- */
check(JSON.stringify(STORY.rooms.map(function (r) { return r.id; })) === JSON.stringify(ROOMS) && JSON.stringify(PZ.ROOMS) === JSON.stringify(ROOMS), 'six rooms in the right order');
var sus = {}; STORY.suspects.forEach(function (s) { sus[s.id] = s; });
check(STORY.suspects.length === 4 && STORY.suspects.filter(function (s) { return s.culprit; }).length === 1, 'four suspects, exactly one culprit');
var culprit = STORY.suspects.filter(function (s) { return s.culprit; })[0];
check(culprit.id === 'urmager', 'the clockmaker is the culprit');
BANDS.forEach(function (b) {
  var clues = STORY.clues.filter(function (c) { return !c.bands || c.bands.indexOf(b) >= 0; });
  var cleared = {}; clues.forEach(function (c) { if (c.clears) cleared[c.clears] = (cleared[c.clears] || 0) + 1; });
  check(Object.keys(cleared).sort().join() === STORY.suspects.filter(function (s) { return !s.culprit; }).map(function (s) { return s.id; }).sort().join(), b + ': the clues clear exactly the innocent suspects');
  check(!cleared[culprit.id], b + ': nothing clears the culprit');
  check(clues.filter(function (c) { return c.points === culprit.id; }).length >= 3, b + ': at least three clues point at the culprit');
  check(clues.every(function (c) { return !c.points || c.points === culprit.id; }), b + ': clues point only at the culprit');
  check(clues.filter(function (c) { return c.herring; }).length === 1, b + ': one red herring (the magpie)');
  ROOMS.forEach(function (r) {
    check(clues.filter(function (c) { return c.room === r; }).length >= 1, b + ' ' + r + ': the room gives at least one clue');
    var spots = STORY.spots[r].filter(function (s) { return !s.bands || s.bands.indexOf(b) >= 0; });
    check(spots.length >= 3 && spots.length <= 5, b + ' ' + r + ': 3–5 things to tap (' + spots.length + ')');
    check(spots.some(function (s) { return s.lock; }), b + ' ' + r + ': a lock to open');
    check(uniq(spots.map(function (s) { return s.id; })), b + ' ' + r + ': spot ids unique');
    spots.forEach(function (s) {
      if (s.clue) { var c = clues.filter(function (x) { return x.id === s.clue; })[0]; check(c && c.room === r && c.when === 'spot', b + ' ' + r + ': spot ' + s.id + ' gives an existing clue of the room'); }
      if (s.item) check(!!STORY.items[s.item], 'item exists: ' + s.item);
      check(s.x - s.w / 2 >= 0 && s.x + s.w / 2 <= 100 && s.y - s.h / 2 >= 0 && s.y + s.h / 2 <= 100, r + ' ' + s.id + ': the spot is inside the picture');
      text(s.label, r + ' spot label'); text(s.text, r + ' spot text');
    });
    clues.filter(function (c) { return c.room === r && c.when === 'spot'; }).forEach(function (c) { check(spots.some(function (s) { return s.clue === c.id; }), b + ': clue ' + c.id + ' can be found by tapping'); });
    var card = STORY.cards[b][r];
    check(card && card.title && card.fact && /^https:\/\//.test(card.src) && (!card.src2 || /^https:\/\//.test(card.src2)), b + ' ' + r + ': a collection card with a source');
  });
});
check(uniq(STORY.clues.map(function (c) { return c.id; })), 'clue ids unique');
STORY.clues.forEach(function (c) { if (c.clears) check(!!sus[c.clears], 'clue ' + c.id + ' clears an existing suspect'); if (c.points) check(!!sus[c.points], 'clue ' + c.id + ' points at an existing suspect'); });
check(new Set(BANDS.map(function (b) { return ROOMS.map(function (r) { return STORY.cards[b][r].title; }).join('|'); }).join('|').split('|')).size === 12, '12 different exhibits');
// the alibis cover every time the clock can stop: guard 21.00–22.30 in the basement, the train left 17.42, the concert
check(PZ.T_MIN >= 21 * 60 && PZ.T_MAX <= 22 * 60 + 30, 'the clock always stops while the guard is in the basement with the plumber');
check(/21\.00 til 22\.30/.test(STORY.clues.filter(function (c) { return c.id === 'logbog'; })[0].text), 'the logbook says 21.00 to 22.30');
// the timeline finds: my own table of years (lex.dk / natmus.dk)
var YEARS = { koelbjerg: -8500, solvognen: -1400, egtved: -1370, tollund: -400, hjortspring: -350, guldhorn: 400, jelling: 965 };
var PERIOD_OF = function (y) { return y < -1700 ? 'sten' : y < -500 ? 'bronze' : y < 800 ? 'jern' : 'viking'; };
PZ.FINDS.forEach(function (f) {
  check(YEARS[f.id] === f.year, 'find year: ' + f.id);
  check(PERIOD_OF(f.year) === f.period, 'find period: ' + f.id);
  var w = STORY.finds[f.id].when, n = Number(/(\d+)/.exec(w)[1]) * (/f\.Kr\./.test(w) ? -1 : 1);
  check(n === f.year, 'the shown year matches: ' + f.id + ' ' + w);
});
check(uniq(PZ.FINDS.map(function (f) { return f.year; })), 'no two finds share a year');
STORY.signs.forEach(function (s) { check(/^https:/.test(s.src) && s.year > 1000 && s.year < 2000, 'sign ' + s.year + ' has a source'); });

/* ---------- my own rune table (Viking Age, 16 runes) ---------- */
var MY = { f: 'f', u: 'uov', th: 'þ', o: 'ąo', r: 'r', k: 'kg', h: 'h', n: 'n', i: 'iej', a: 'aæ', s: 's', t: 'td', b: 'bp', m: 'm', l: 'l', R: 'ʀ' };
check(PZ.RUNES.length === 16 && uniq(PZ.RUNES.map(function (r) { return r.d; })) && uniq(PZ.RUNES.map(function (r) { return r.k; })), '16 runes with different shapes');
PZ.RUNES.forEach(function (r) { check(MY[r.k] !== undefined && r.vals.join('') === MY[r.k] && r.main === MY[r.k][0].replace('ą', 'o'), 'rune ' + r.k + ' has the right sounds'); check(/^M[\d,.VHLM ]+$/.test(r.d), 'rune ' + r.k + ' path'); });
function myFits(runes, s) {
  var w = s.toLowerCase().split(' ');
  return w.length === runes.length && w.every(function (x, i) { return x.length === runes[i].length && x.split('').every(function (c, j) { return MY[runes[i][j]].indexOf(c) >= 0; }); });
}
function myMain(runes) { return runes.map(function (w) { return w.map(function (k) { return MY[k][0]; }).join(''); }).join(' ').toUpperCase(); }

/* ---------- the generators ---------- */
function minutes(s) { var m = /^(\d+)\.(\d\d)$/.exec(s); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; }
function quarters(s) { // '2½ kg' -> 10
  var m = /^(\d*)([¼½¾]?) kg$/.exec(s); if (!m) return NaN;
  return (m[1] ? Number(m[1]) * 4 : 0) + ({ '': 0, '¼': 1, '½': 2, '¾': 3 })[m[2]];
}
var N = Number(process.env.MU_N || 3000), counts = {};
BANDS.forEach(function (b) {
  ROOMS.forEach(function (r) {
    for (var i = 0; i < N; i++) {
      var seed = 1000 * (b === 'U' ? 7 : 3) + i * 13 + r.length, R = rng(seed);
      var ctxT = i % 3 === 0 ? undefined : PZ.clockTime(b, rng(seed + 5));
      var pz = PZ.make(r, b, R, { T: ctxT }), again = PZ.make(r, b, rng(seed), { T: ctxT });
      check(JSON.stringify(pz) === JSON.stringify(again), b + ' ' + r + ': same seed, same puzzle');
      check(pz.room === r && pz.steps.length >= 1, b + ' ' + r + ': steps');
      var key = b + r; counts[key] = counts[key] || {};
      counts[key][JSON.stringify(pz.steps.map(function (s) { return s.answer; }))] = 1;
      pz.steps.forEach(function (st, si) {
        var tag = b + ' ' + r + ' step ' + si + ' (seed ' + seed + ')';
        check(PZ.check(st, st.answer), tag + ': the answer is accepted');
        check(st.hints && st.hints.length === 2, tag + ': two hints');
        if (i < 25) { text(st.q, tag + ' q'); st.hints.forEach(function (x) { text(x, tag + ' hint'); }); text(st.explain, tag + ' explain'); if (st.options) st.options.forEach(function (o) { text(o, tag + ' option'); }); }
        if (st.options) {
          check(uniq(st.options) && st.options.indexOf(st.answer) >= 0 && st.options.length >= 3 && st.options.length <= 4, tag + ': answer among 3–4 unique options');
          check(st.options.filter(function (o) { return PZ.check(st, o); }).length === 1, tag + ': exactly one option is accepted');
        }
        if (st.kind === 'code') {
          var T = st.T, from = b === 'M' ? 17 * 60 : 16 * 60 + 30;
          check(T >= 21 * 60 + 15 && T <= 22 * 60 + 10 && (b === 'U' || T % 5 === 0), tag + ': the clock stops between 21.15 and 22.10');
          check(st.from === from, tag + ': counted from the right time');
          var want = [Math.floor((T - from) / 60), (T - from) % 60];
          check(want[1] > 0, tag + ': never whole hours');
          if (b === 'U') { var ys = st.signs.map(function (s) { return s.year; }); check(st.signs.length === 3 && uniq(ys), tag + ': three signs'); want.push(Math.max.apply(null, ys) - Math.min.apply(null, ys)); check(want[2] >= 100 && want[2] <= 999, tag + ': three-digit year difference'); }
          check(JSON.stringify(st.answer) === JSON.stringify(want), tag + ': code recomputed ' + JSON.stringify(want) + ' vs ' + JSON.stringify(st.answer));
          check(st.fields.every(function (f, k) { return String(want[k]).length <= f.max; }), tag + ': the answer fits the fields');
          // exactly one code: change any field and it is wrong
          want.forEach(function (v, k) { [v + 1, v - 1, v + 10, v + 60].forEach(function (x) { var w2 = want.slice(); w2[k] = x; check(!PZ.check(st, w2), tag + ': a different code is refused'); }); });
          check(!PZ.check(st, want.map(function () { return ''; })), tag + ': empty code refused');
          check(pz.vars.T === PZ.hm(T), tag + ': the clue time is the clock time');
          var clockH = Math.floor(T / 60) - 12; check(st.explain.indexOf(clockH + '.' + (T % 60 < 10 ? '0' : '') + (T % 60)) >= 0 || b === 'U', tag + ': the explanation reads the clock as ' + clockH);
        } else if (st.kind === 'timeline') {
          var sorted = st.items.slice().sort(function (x, y) { return YEARS[x] - YEARS[y]; });
          check(JSON.stringify(sorted) === JSON.stringify(st.answer), tag + ': timeline order recomputed');
          check(st.items.join() !== st.answer.join(), tag + ': the cards do not start in the right order');
          if (b === 'M') check(st.items.length === 4 && uniq(st.items.map(function (x) { return PERIOD_OF(YEARS[x]); })), tag + ': four finds from four periods');
          else check(st.items.length >= 5 && st.items.length <= 6, tag + ': 5–6 finds');
          check(!PZ.check(st, st.answer.slice().reverse()) && !PZ.check(st, st.items), tag + ': a wrong order is refused');
        } else if (st.kind === 'runes') {
          check(myMain(st.runes) === st.answer, tag + ': runes decode to ' + st.answer);
          check(st.runes[0].every(function (k) { return MY[k].length === 1 || k === 'k' || k === 'i' || k === 'u' || k === 'a' || k === 't' || k === 'b'; }), tag + ': plain runes');
          check(st.answer.split('').every(function (c) { return st.letters.indexOf(c) >= 0; }), tag + ': every letter is on the keyboard');
          check(!PZ.check(st, st.answer.slice(1) + st.answer[0]) && !PZ.check(st, ''), tag + ': other words refused');
          check(pz.where && S.pz.places[st.answer] === pz.where, tag + ': where the key is');
        } else if (st.runes) {
          check(st.options.filter(function (o) { return myFits(st.runes, o); }).length === 1 && myFits(st.runes, st.answer), tag + ': exactly one option fits the runes');
          check(/[dgepjæ]/i.test(st.answer), tag + ': the twist: a rune stands for another sound');
          check(PZ.encode(st.answer).join('|') === st.runes.join('|'), tag + ': encoding');
        } else if (st.kind === 'scale') {
          var vals = st.options.map(quarters);
          check(vals.every(function (v) { return v > 0 && v === Math.round(v); }), tag + ': option weights read back: ' + st.options.join(', '));
          function sides(v) { if (st.mode === 'add') return [st.left.reduce(function (s, x) { return s + x; }, 0), st.right.reduce(function (s, x) { return s + x; }, 0) + v]; if (st.mode === 'sacks') return [st.n * v, st.right.reduce(function (s, x) { return s + x; }, 0)]; return [st.a * v + st.b, st.c * v + st.d]; }
          check(vals.filter(function (v) { var s2 = sides(v); return s2[0] === s2[1]; }).length === 1, tag + ': exactly one weight balances');
          var av = quarters(st.answer), s3 = sides(av); check(s3[0] === s3[1], tag + ': the answer balances');
          if (b === 'M') check(st.mode !== 'eq' && av % 1 === 0, tag + ': Mellemtrin: weights and sacks'); else { check(st.mode === 'eq' && st.a > st.c && st.c >= 1, tag + ': Udskoling: an unknown on both sides'); var m3 = /^(\d*)x(?: \+ (\d+))? = (\d*)x \+ (\d+)$/.exec(st.eq); check(m3 && Number(m3[1] || 1) === st.a && Number(m3[2] || 0) * 4 === st.b && Number(m3[3] || 1) === st.c && Number(m3[4]) * 4 === st.d, tag + ': the equation text ' + st.eq); }
          check(PZ.scaleSvg(st, null).indexOf('<svg') === 0 && PZ.scaleSvg(st, av).indexOf('<svg') === 0, tag + ': scale drawing');
        } else if (st.kind === 'strike') {
          check(st.answer.slice().sort().join() === 'inspektor,smith,vagt', tag + ': strike the three with an alibi');
          check(!PZ.check(st, ['vagt', 'smith']) && !PZ.check(st, ['vagt', 'smith', 'inspektor', 'urmager']) && PZ.check(st, ['smith', 'vagt', 'inspektor']), tag + ': only the exact set');
        }
        if (r === 'renaessancen') {
          check(pz.letter.indexOf(st.ev) >= 0, tag + ': the answer is in the letter (' + st.ev + ')');
          check(!/\{\w+\}/.test(pz.letter), tag + ': the letter is filled in');
        }
      });
      if (r === 'renaessancen') {
        var inf = pz.info, L = pz.letter;
        if (b === 'M') {
          var em = /ends at (\d+)(?:\.(\d\d))? pm/.exec(L); check(em && pz.steps[2].answer === 'kl. ' + (Number(em[1]) + 12) + '.' + (em[2] || '00'), 'M letter: pm converted: ' + (em && em[0]) + ' → ' + pz.steps[2].answer);
          var sm = /starts at (\d+) pm/.exec(L); check(sm && (Number(sm[1]) + 12) * 60 === inf.from, 'M letter: start time');
        } else {
          var words = { 'half past five': 17.5, 'six o\'clock': 18, 'half past seven': 19.5, 'eight o\'clock': 20, 'eleven': 23, 'half past eleven': 23.5, nine: 9, ten: 10 };
          var su = /after that, at ([a-z' ]+), I am playing/i.exec(L), eu = /does not finish until ([a-z ]+),/.exec(L), tr = /train leaves at ([a-z]+) in the morning/.exec(L), dn = /At ([a-z' ]+) I am having dinner/.exec(L);
          check(su && eu && tr && dn, 'U letter: times found');
          var Tm = pz.T;
          check(words[su[1]] * 60 <= Tm && Tm <= words[eu[1]] * 60, 'U letter: the clock stopped during the concert');
          check(words[dn[1]] * 60 < words[su[1]] * 60, 'U letter: dinner before the concert');
          check(pz.steps[2].answer === 'kl. ' + words[tr[1]] + '.00', 'U letter: train time ' + pz.steps[2].answer);
          check(new RegExp('More than ' + inf.n + ' people').test(L) && pz.steps[1].answer.indexOf(String(inf.n)) >= 0, 'U letter: number of people');
          if (ctxT) check(Tm === ctxT, 'U letter uses the clock time from the hall');
        }
        check(pz.steps[0].answer.indexOf(pz.vars.place) >= 0 || pz.steps[1].answer.toLowerCase() === pz.vars.place, b + ' letter: place in the answers');
      }
      if (r === 'loftet') {
        var last = pz.steps[pz.steps.length - 1];
        check(last.accuse && last.answer.indexOf(culprit.name) === 0, b + ' loft: accuse the clockmaker');
        check(pz.steps.length === (b === 'M' ? 3 : 4), b + ' loft: Udskoling has one more step');
        check(/200 gram/.test(pz.steps[0].answer) && /^Nej/.test(pz.steps[0].answer), b + ' loft: the magpie is too light');
        if (ctxT) check(pz.T === PZ.hm(ctxT), b + ' loft: the clock time from the hall');
        if (b === 'U') check(pz.steps[2].answer.indexOf(pz.T) >= 0 && /17\.00/.test(pz.steps[2].answer), 'U loft: the clue that breaks his story names the clock time');
      }
    }
  });
});
// variety: replaying gives new puzzles
Object.keys(counts).forEach(function (k) { var n = Object.keys(counts[k]).length; check(n >= (/loftet/.test(k) ? 1 : 4), 'replays give different puzzles: ' + k + ' (' + n + ')'); });
check(PZ.fq(1) === '¼' && PZ.fq(2) === '½' && PZ.fq(3) === '¾' && PZ.fq(4) === '1' && PZ.fq(10) === '2½', 'fractions written right');
check(PZ.hm(21 * 60 + 5) === '21.05' && PZ.hm(9 * 60) === '9.00', 'times written the Danish way');

/* ---------- daily challenge ---------- */
BANDS.forEach(function (b) {
  var kinds = {};
  for (var i = 0; i < 300; i++) {
    var keep = Math.random; Math.random = rng(77 + i); var q1 = game.quickTask(b, {}); Math.random = rng(77 + i); var q2 = game.quickTask(b, {}); Math.random = keep;
    check(JSON.stringify(q1) === JSON.stringify(q2), 'daily task the same for the same seed');
    check(JSON.stringify(JSON.parse(JSON.stringify(q1))) === JSON.stringify(q1), 'daily task is plain data');
    check(q1.options.indexOf(q1.answer) >= 0 && uniq(q1.options) && q1.options.length >= 3 && q1.options.length <= 4 && q1.hint && q1.explain, b + ' daily task: answer among unique options');
    kinds[q1.q.slice(0, 14)] = 1;
    if (q1.html) check(/^<div[^>]*>[\s\S]*<svg[\s\S]*<\/svg>[\s\S]*<\/div>$/.test(q1.html) && !/<script|on\w+=|class="mu-(?!scale-svg|runes-svg)/i.test(q1.html), 'daily picture is plain svg with inline styles');
    if (/runer/.test(q1.q)) { var m = /<svg class="mu-runes-svg"[\s\S]*?<\/svg>/.exec(q1.html); check(!!m, 'daily runes drawn'); var w = q1.answer, runes = PZ.encode(w); check(myMain(runes) === w && q1.options.filter(function (o) { return myMain(PZ.encode(o)) === o && PZ.encode(o).join() === runes.join(); }).length === 1, 'daily rune word decodes uniquely: ' + w); }
    if (i < 40) { text(q1.q, 'daily q'); text(q1.hint, 'daily hint'); text(q1.explain, 'daily explain'); q1.options.forEach(function (x) { text(x, 'daily option'); }); }
  }
  check(Object.keys(kinds).length >= 6, b + ': all six kinds of daily tasks (' + Object.keys(kinds).length + ')');
  // it leans towards the room with the fewest stars
  var d = { rooms: { M: {}, U: {} } }; ROOMS.forEach(function (r) { d.rooms[b][r] = { best: 3, plays: 1 }; }); d.rooms[b].middelalderen = { best: 1, plays: 1 };
  var keep2 = Math.random; Math.random = rng(5); var qq = game.quickTask(b, d); Math.random = keep2;
  check(/vejer|lod|balance/.test(qq.q), b + ': the daily task picks the weakest room (the scale)');
});

/* ---------- hub API ---------- */
var d0 = {};
check(JSON.stringify(game.progress(d0)) === JSON.stringify({ plays: 0, bands: { M: [0, 0, 0, 0, 0, 0], U: [0, 0, 0, 0, 0, 0] } }), 'progress with no data');
check(game.summary(d0).max === 18 && game.summary(d0).stars === 0 && game.collection(d0).n === 0 && game.collection(d0).max === 12 && game.parentReport(d0).rows.length === 0, 'hub API with no data');
var d1 = { band: 'U', rooms: { M: { hallen: { stars: 2, best: 3, plays: 2 } }, U: { hallen: { stars: 1, best: 1, plays: 1 }, oldtiden: { stars: 2, best: 2, plays: 1 } } }, cards: { M: { hallen: 1 }, U: { hallen: 1, oldtiden: 1 } } };
var p1 = game.progress(d1);
check(p1.plays === 4 && p1.bands.M[0] === 3 && p1.bands.U[0] === 1 && p1.bands.U[1] === 2, 'progress counts plays and best stars');
check(game.summary(d1).stars === 3 && game.collection(d1).n === 3 && game.parentReport(d1).rows.length === 3 && game.parentReport(d1).head.length === 3, 'summary, collection, report');

/* ---------- Danish spelling ---------- */
// the English letters and the English sentences quoted in the letter room's texts are left out (they are on the proof sheet)
var IDKEYS = ['id', 'icon', 'clue', 'item', 'clears', 'points', 'room', 'bands', 'lock', 'when', 'englishItems', 'src', 'src2'];
function walk(x, k) { if (typeof x === 'string') texts.push({ s: x, where: k }); else if (Array.isArray(x)) x.forEach(function (v) { walk(v, k); }); else if (x && typeof x === 'object') Object.keys(x).forEach(function (kk) { if (IDKEYS.indexOf(kk) < 0) walk(x[kk], k + '.' + kk); }); }
S.q.englishItems.forEach(function (it) { texts.push({ s: it[1], where: 'english item' }); it[2].forEach(function (x) { texts.push({ s: x, where: 'english item' }); }); });
walk(S, 'S');
var story2 = JSON.parse(JSON.stringify(STORY)); delete story2.letters; delete story2.names; delete story2.trueStorySources; delete story2.periodSources;
walk(story2, 'STORY');
var words = {}, allow = STORY.names.concat(['ca', 'kl', 'Kl', 'pm', 'f', 'Kr', 'e', 'kg', 'x', 'OK', 'Þ', 'ʀ']);
texts.forEach(function (o) {
  var s = String(o.s).replace(/­/g, '');
  if (/let|english|renaessancen|daily/i.test(o.where) || /(Tonight|concert|train|people|ends at|starts at)/.test(s)) s = s.replace(/»[^«]*«/g, ' ');
  if (/key|vals|src|ev\b/.test(o.where)) return;
  (s.replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉéÄäÖöü]+/g) || []).forEach(function (w) { words[w] = 1; });
});
var list = Object.keys(words).filter(function (w) { return allow.indexOf(w) < 0 && w.length > 1 && !/^[A-ZÆØÅ]+$/.test(w) || (/^[A-ZÆØÅ]{2,}$/.test(w) && allow.indexOf(w) < 0 && w !== w.toLowerCase()); });
list = list.map(function (w) { return /^[A-ZÆØÅ]{2,}$/.test(w) ? w.toLowerCase() : w; });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));
check(list.length > 500, 'the spelling check saw the texts (' + list.length + ' words)');

console.log(fails ? 'Museet: ' + fails + ' of ' + checks + ' checks FAILED' : 'Museet: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
