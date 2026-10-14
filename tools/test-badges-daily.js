// Bobs mærker and Dagens udfordring: pure rules. Run: node tools/test-badges-daily.js
'use strict';
global.window = global;
var D = require('../shared/daily.js'), B = require('../shared/badges.js');
var fails = 0, checks = 0;
function check(ok, msg) { checks++; if (!ok) { fails++; console.log('FAIL', msg); } }
function days(list) { var o = {}; list.forEach(function (k) { o[k] = { n: 3 }; }); return o; }
function range(from, n, skip) { var out = []; for (var i = 0; i < n; i++) { var k = D.addDays(from, i); if (!(skip || []).some(function (s) { return s === k; })) out.push(k); } return out; }

// ---------- dates ----------
check(D.addDays('2026-12-31', 1) === '2027-01-01', 'year change');
check(D.addDays('2026-03-28', 2) === '2026-03-30', 'across summer time');
check(D.addDays('2026-10-24', 3) === '2026-10-27', 'across winter time');
check(D.weekKey('2026-10-11') === '2026-10-05' && D.weekKey('2026-10-12') === '2026-10-12', 'weeks start on Monday');
check(D.addDays('2028-02-28', 1) === '2028-02-29', 'leap day');

// ---------- streaks ----------
var s;
s = D.streak({}, '2026-10-10'); check(s.current === 0 && s.best === 0, 'nothing played');
s = D.streak(days(range('2026-10-01', 10)), '2026-10-10'); check(s.current === 10 && s.best === 10, 'ten days in a row: ' + JSON.stringify(s));
s = D.streak(days(range('2026-10-01', 9)), '2026-10-10'); check(s.current === 9, 'today not played yet keeps the streak');
// one missed day in a week is a rest day and counts
s = D.streak(days(range('2026-10-05', 7, ['2026-10-07'])), '2026-10-11'); check(s.current === 7 && s.rest['2026-10-07'], 'one rest day counts: ' + JSON.stringify(s));
// two missed days in the same week break the streak
s = D.streak(days(range('2026-10-05', 7, ['2026-10-07', '2026-10-09'])), '2026-10-11'); check(s.current === 2, 'second missed day in a week breaks: ' + JSON.stringify(s));
check(s.best === 4, 'best before the break (Mon, Tue, rest day, Thu): ' + s.best);
// two missed days in a row in the same week break
s = D.streak(days(['2026-10-05', '2026-10-06', '2026-10-09']), '2026-10-09'); check(s.current === 1, 'two missed days in a row break');
// yesterday missed: streak alive through the rest day, even before today is played
s = D.streak(days(['2026-10-05', '2026-10-06', '2026-10-07']), '2026-10-09'); check(s.current === 4 && s.rest['2026-10-08'], 'yesterday is a rest day: ' + JSON.stringify(s));
// a rest day cannot start a streak
s = D.streak(days(['2026-10-07']), '2026-10-07'); check(s.current === 1 && !Object.keys(s.rest).length, 'no rest before the first day');
// simulated year: play every day except Wednesdays -> never breaks
var all = range('2026-01-05', 364).filter(function (k) { return D.parseKey(k).getDay() !== 3; });
s = D.streak(days(all), D.addDays('2026-01-05', 363)); check(s.current === 364 && s.best === 364, 'a year with one rest day every week: ' + s.current);
// simulated year: miss Tuesday and Thursday -> breaks every week, best stays small
all = range('2026-01-05', 364).filter(function (k) { var d = D.parseKey(k).getDay(); return d !== 2 && d !== 4; });
s = D.streak(days(all), D.addDays('2026-01-05', 363)); check(s.best <= 6 && s.best >= 3, 'two misses a week keep breaking: best ' + s.best);
// month count
check(D.bestMonth(days(range('2026-10-01', 20))) === 20 && D.bestMonth(days(range('2026-10-20', 20))) === 12, 'days per calendar month');

// ---------- answers ----------
check(D.sameAnswer('3,5', '3,5') && D.sameAnswer('3.5', '3,5') && D.sameAnswer(' -4 ', '−4') && D.sameAnswer('1.250', '1250') && !D.sameAnswer('35', '3,5'), 'numbers compared by value');
check(D.sameAnswer('Hund', 'hund') && !D.sameAnswer('hun', 'hund'), 'words compared without case');

// ---------- daily game choice is deterministic ----------
var rng = function (seed) { var a = 0; String(seed).split('').forEach(function (c) { a = (a * 31 + c.charCodeAt(0)) >>> 0; }); return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
var a = D.chooseGames(['a', 'b', 'c', 'd'], ['e', 'f'], 'p1:2026-10-10', rng), b = D.chooseGames(['a', 'b', 'c', 'd'], ['e', 'f'], 'p1:2026-10-10', rng);
check(a.join() === b.join(), 'same profile and date give the same games');
check(a.slice(0, 4).sort().join() === 'a,b,c,d', 'played games come first');
var differ = 0; for (var i = 1; i < 30; i++) if (D.chooseGames(['a', 'b', 'c', 'd', 'e'], [], 'p1:2026-10-' + (i < 10 ? '0' : '') + i, rng).slice(0, 3).join() !== a.slice(0, 3).join()) differ++;
check(differ > 15, 'different days give different games (' + differ + '/29)');

// ---------- badges ----------
var defs = B.defs();
check(defs.length === 90, '90 badges for all 25 planned games (' + defs.length + ')');
check(B.GAME_IDS.length === 25, '25 games in the badge list');
// only the games that exist (shared/games.js) give badges; the planned ones keep their rewards for later
var AV = require('../shared/games.js').map(function (m) { return m.id; });
check(AV.every(function (g) { return B.GAME_IDS.indexOf(g) >= 0; }), 'every game in games.js has badges');
var defsAv = B.defs(AV);
check(defsAv.length === 15 + 3 * AV.length, (15 + 3 * AV.length) + ' badges for the ' + AV.length + ' games that exist (' + defsAv.length + ')');
check(!defsAv.some(function (x) { return x.game && AV.indexOf(x.game) < 0; }), 'no badges for games that are not built yet');
(function () { // Alsidig and Opdageren only ask for the games that exist
  var st = { games: {}, visits: {} };
  AV.forEach(function (g) { st.games[g] = { progress: { plays: 1, bands: { M: [1], U: [] } } }; st.visits[g] = 1; });
  B.SANDBOXES.forEach(function (k) { if (AV.indexOf(k.split(':')[0]) >= 0) st.visits[k] = 1; });
  var w = B.evaluate(st, AV); check(w.alsidig && w.opdager, 'Alsidig and Opdageren can be won with only the games that exist');
  check(!B.evaluate(st).alsidig, 'with every planned game counted, Alsidig would need them all');
})();
check(new Set(defs.map(function (x) { return x.id; })).size === defs.length, 'unique badge ids');
check(new Set(defs.map(function (x) { return x.reward.join(':'); })).size === defs.length, 'every badge has its own reward');
global.STR = undefined; require('../shared/strings-da.js'); var SC = global.window.STR.core;
global.Bob = require('../shared/mascot/bob.js');
defs.forEach(function (x) {
  check(Bob.looks[x.reward[0]] && Bob.looks[x.reward[0]].indexOf(x.reward[1]) >= 0, 'reward exists in bob.js: ' + x.reward.join(':'));
  check(SC.looks[x.reward[0]][x.reward[1]], 'reward has a Danish name: ' + x.reward.join(':'));
  check(x.game ? SC.gameBadgeNames[x.game] : SC.badges[x.id], 'badge has a Danish name: ' + x.id);
});
Object.keys(Bob.looks).forEach(function (c) { Bob.looks[c].forEach(function (id) { check(defs.some(function (x) { return x.reward[0] === c && x.reward[1] === id; }), 'every look can be unlocked: ' + c + ':' + id); }); });
// nothing at the start
check(Object.keys(B.evaluate({})).length === 0, 'no badges for a new player');
// a full state reaches every badge
function prog(stars) { return { plays: 5, bands: { M: [stars, stars, stars], U: [0, 0] } }; }
var full = { games: {}, visits: {}, komIgen: true, practiceCleared: 25, daily: { days: 40, best: 30, bestMonth: 20 } };
B.GAME_IDS.forEach(function (g) { full.games[g] = { progress: prog(3), collection: { n: 10, max: 10 } }; full.visits[g] = 1; });
B.SANDBOXES.forEach(function (k) { full.visits[k] = 1; }); full.visits.staedig = 1; full.visits.gaademager = 1;
var won = B.evaluate(full);
defs.forEach(function (x) { check(won[x.id], 'reachable: ' + x.id); });
// levels
var one = { games: { regnestorm: { progress: { plays: 1, bands: { M: [1, 0, 0, 0, 0, 0], U: [0, 0, 0, 0, 0, 0] } } } } };
won = B.evaluate(one); check(won['regnestorm-1'] && !won['regnestorm-2'] && !won['regnestorm-3'], 'bronze after one round');
one.games.regnestorm.progress.bands.M = [1, 2, 1, 0, 0, 0]; won = B.evaluate(one); check(won['regnestorm-2'] && !won['regnestorm-3'], 'silver at half the routes');
one.games.regnestorm.progress.bands.U = [3, 3, 3, 3, 3, 3]; won = B.evaluate(one); check(won['regnestorm-3'], 'gold in one band');
check(!won.alsidig, 'alsidig needs every game');
won = B.evaluate({ daily: { days: 1, best: 2, bestMonth: 1 } }); check(won.foerste && !won.streak3, 'first daily');
won = B.evaluate({ daily: { days: 9, best: 7, bestMonth: 9 } }); check(won.streak3 && won.streak7 && !won.streak30 && !won.maaned, 'streak badges');
won = B.evaluate({ practiceCleared: 24 }); check(!won.oevelse, '24 practice words is not enough');
var noSand = JSON.parse(JSON.stringify(full)); delete noSand.visits['taktslaget:sandbox']; check(!B.evaluate(noSand).opdager, 'opdager needs every sandbox');
var played = JSON.parse(JSON.stringify(full)); B.GAME_IDS.forEach(function (g) { delete played.visits[g]; }); check(B.evaluate(played).opdager, 'games with progress count as opened');

console.log(fails ? 'Badges and daily: ' + fails + ' of ' + checks + ' checks FAILED' : 'Badges and daily: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
