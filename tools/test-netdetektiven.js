// Netdetektiven: checks the cases and the task generators. Run: node tools/test-netdetektiven.js  (needs hunspell da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../netdetektiven/strings-da.js');
var D = require('../netdetektiven/cases.js'), S = window.STR.nd, execFileSync = require('child_process').execFileSync;
var game = null;
window.ND_DATA = D; window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k]; }); }, registerGame: function (g) { game = g; } };
require('../netdetektiven/game.js');
var fails = 0, checks = 0;
function check(ok, msg) { checks++; if (!ok) { fails++; console.log('FAIL', msg); } }
function uniq(a) { return new Set(a).size === a.length; }

// messages
var ids = {};
D.mails.forEach(function (m) {
  check(m.id && m.from && m.subject && m.body && m.signs && typeof m.safe === 'boolean' && (m.b === 'M' || m.b === 'U'), 'mail fields ' + m.id);
  check(!ids[m.id], 'duplicate mail ' + m.id); ids[m.id] = 1;
  check(m.parts.length >= 2 && m.parts.every(function (p) { return p[0] && p[1]; }), 'mail parts ' + m.id);
});
['M', 'U'].forEach(function (b) {
  var ms = D.mails.filter(function (m) { return m.b === b; });
  check(ms.length >= 8, b + ' has enough mails');
  var safe = ms.filter(function (m) { return m.safe; }).length;
  check(safe >= 3 && ms.length - safe >= 3, b + ' mails mix safe and scam (' + safe + ' safe)');
});
// passwords: the strong one really is longer and is rated stronger
D.passwordPairs.forEach(function (p) { check(p[0].length > p[1].length + 8 && p[2], 'password pair ' + p[0]); });
check(D.passwordCards.filter(function (c) { return !c.personal; }).length >= 6 && D.passwordCards.filter(function (c) { return c.personal; }).length >= 2, 'password cards');
check(game._strength(['giraf', 'kanelsnegl', 'trampolin', 'regnvejr']) === 3 && game._strength(['giraf']) < 2, 'strength meter');
// share
var bins = D.shareBins.map(function (b) { return b.id; });
D.shareItems.forEach(function (s) { check(bins.indexOf(s[1]) >= 0, 'share bin ' + s[0]); });
bins.forEach(function (b) { check(D.shareItems.filter(function (s) { return s[1] === b; }).length >= 3, 'share bin used ' + b); check(S.shareWhy[b], 'share why ' + b); });
// scenarios, images, data: three unique options
D.scenarios.forEach(function (s) { check((s[0] === 'M' || s[0] === 'U') && s[4] && uniq([s[2]].concat(s[3])) && s[3].length === 2, 'scenario ' + s[1]); });
D.imageCases.concat(D.dataQuiz).forEach(function (c) { check(c[3] && uniq([c[1]].concat(c[2])) && c[2].length === 2, 'quiz ' + c[0]); });
// bullying and AI images only in the udskoling
var SENSITIVE = /mobb|nøgen|deepfake|\bAI\b|falsk profil|gjort til grin/i;
D.scenarios.filter(function (s) { return s[0] === 'M'; }).forEach(function (s) { check(!SENSITIVE.test(s.join(' ')), 'mellemtrin scenario must not touch bullying/AI: ' + s[1]); });
D.mails.filter(function (m) { return m.b === 'M'; }).forEach(function (m) { check(!SENSITIVE.test(JSON.stringify(m)), 'mellemtrin mail sensitive: ' + m.id); });
D.routes.filter(function (r) { return r.b === 'M'; }).forEach(function (r) { check(['images', 'data', 'sources'].indexOf(r.kind) < 0, 'udskoling-only kind in M: ' + r.id); });
// sources
D.sourceSets.forEach(function (s) { check(s.pages.length === 3 && s.best >= 0 && s.best < 3 && uniq(s.pages.map(function (p) { return p[0]; })) && uniq([s.why[0]].concat(s.why[1])), 'source set ' + s.claim); });
// no real brands, apps or domains
var REAL = /google|gmail|facebook|instagram|tiktok|snapchat|youtube|roblox|fortnite|minecraft|discord|whatsapp|messenger|apple|microsoft|mitid|nemid|postnord|gls|dao|danske bank|nordea|mobilepay|netflix|amazon|steam|playstation|xbox|nintendo/i;
var everything = JSON.stringify(D) + JSON.stringify(S);
var hit = everything.match(new RegExp(REAL.source, 'gi'));
check(!hit, 'real brand names: ' + (hit || []).join(', '));
// generators: answer among unique options, many runs because they are random
for (var run = 0; run < 30; run++) D.routes.forEach(function (r) {
  var tasks = game._buildRound(r);
  check(tasks.length >= 6 && tasks.length <= 10, r.id + ' round length ' + tasks.length);
  var keys = tasks.map(function (tk) { return tk.kind + ':' + (tk.mail || tk.q || tk.answer || Math.random()); });
  check(uniq(keys), r.id + ' no repeated tasks');
  tasks.forEach(function (tk) {
    if (tk.type === 'build') { check(tk.cards.length === tk.n + 4 && tk.cards.filter(function (c) { return !c.personal; }).length >= tk.n, 'build cards'); return; }
    check(tk.options.indexOf(tk.answer) >= 0 && uniq(tk.options), r.id + ' options for ' + (tk.q || tk.mail));
    if (tk.kind === 'mail') check(D.mails.filter(function (m) { return m.id === tk.mail; })[0].b === r.b, 'mail band ' + tk.mail);
  });
  if (r.kind === 'sources') tasks.forEach(function (tk, i) { if (tk.kind === 'sourceWhy') check(tasks[i - 1].kind === 'sourcePick' && tasks[i - 1].set === tk.set, 'why follows its pick'); });
});

// Danish spelling
function tok(s) { return String(s).replace(/\u00ad/g, '').replace(/\{\w+\}/g, ' ').replace(/[\w.-]+@[\w.-]+|\b[\w-]+\.(dk|com|net|info|biz|click|ru)(\/\w*)?/g, ' ').match(/[A-Za-zÆØÅæøåÉé]+/g) || []; }
var words = [];
(function walk(x, key) {
  if (typeof x === 'string') { if (['id', 'b', 'kind', 'answer'].indexOf(key) < 0 || key === 'answer') words = words.concat(tok(x)); return; }
  if (Array.isArray(x)) return x.forEach(function (v) { walk(v, key); });
  if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k], k); });
})([D, S]);
var OK = ['qwerty', 'kodeord', 'skins', 'feed', 'feedet', 'filterboble', 'deepfake', 'deepfakes', 'retoucheret', 'datafirma', 'kortoplysningerne', 'kodeordsmanager', 'pakkeboksen', 'liket', 'likes', 'influencer', 'totrinsbekræftelse', 'gaming', 'phishing', 'kvidr', 'kl', 'kr', 'aux', 'billedsøg', 'bumlebanken', 'bumleb', 'nken', 'spoerg'];
var list = Array.from(new Set(words)).filter(function (w) { return !/^[A-ZÆØÅ]/.test(w) && OK.indexOf(w.toLowerCase()) < 0; });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));

console.log(fails ? 'Netdetektiven: ' + fails + ' of ' + checks + ' checks FAILED' : 'Netdetektiven: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
