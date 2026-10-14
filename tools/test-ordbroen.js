// Ordbroen: checks the English word bank. Run: node tools/test-ordbroen.js  (needs hunspell with en_GB, en_US and da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../ordbroen/strings-da.js');
var D = require('../ordbroen/words.js'), S = window.STR.ob, execFileSync = require('child_process').execFileSync;
var fails = 0, checks = 0;
function check(ok, msg) { checks++; if (!ok) { fails++; console.log('FAIL', msg); } }
function tokens(s) { return String(s).replace(/\u00ad/g, '').replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉé']+/g) || []; }
var en = [], enUS = [], da = [];
function unknown(dict, words) {
  var list = Array.from(new Set(words.map(function (w) { return w.replace(/^'+|'+$/g, ''); }).filter(Boolean)));
  if (!list.length) return [];
  return execFileSync('hunspell', ['-d', dict, '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
}
// themes
var seenEn = {};
D.themes.forEach(function (th) {
  check(th.b === 'M' || th.b === 'U', th.id + ' band');
  check(th.words.length >= 4, th.id + ' needs at least 4 words for the choices');
  var das = {};
  th.words.forEach(function (w) {
    check(w[0] && w[1], th.id + ' word fields');
    check(!seenEn[w[0]], 'duplicate English word ' + w[0]); seenEn[w[0]] = 1;
    check(!das[w[1]], th.id + ': two words share the Danish translation ' + w[1] + ' (choices would be ambiguous)'); das[w[1]] = 1;
    en = en.concat(tokens(w[0])); da = da.concat(tokens(w[1]));
    if (w[2]) { enUS = enUS.concat(tokens(w[2])); check(w[2] !== w[0], 'US spelling differs for ' + w[0]); }
  });
});
// sentences
D.sentences.forEach(function (s) {
  check(/^[A-Z]/.test(s.en) && /[.?!]$/.test(s.en) && /[.?!]$/.test(s.da), 'sentence form: ' + s.en);
  var words = s.en.split(' ');
  check(words.length >= 3 && words.length <= 9, 'sentence length: ' + s.en);
  (s.alts || []).forEach(function (a) { check(a.split(' ').sort().join(' ') === words.slice().sort().join(' '), 'alt uses the same cards: ' + a); });
  en = en.concat(tokens(s.en)); da = da.concat(tokens(s.da));
});
// gaps
D.gaps.forEach(function (g) {
  check(D.rules[g.r], 'gap rule ' + g.r);
  check(g.s.split('___').length === 2, 'one gap: ' + g.s);
  check(g.x.indexOf(g.a) < 0 && new Set(g.x).size === g.x.length, 'gap options unique: ' + g.s);
  en = en.concat(tokens(g.s.replace('___', g.a)));
});
// irregular verbs: all forms are real English words, and the Danish infinitive is Danish
var seenV = {};
D.verbs.forEach(function (v) {
  check(!seenV[v[0]], 'duplicate verb ' + v[0]); seenV[v[0]] = 1;
  check(v[1] !== v[0] + 'ed', v[0] + ' is not irregular');
  en = en.concat([v[0], v[1], v[2]]); da = da.concat(tokens(v[3])); if (v[4]) enUS.push(v[4]);
});
// verb options: 4 different, the right one included, and every -ed form offered is NOT a real word
var eds = [];
D.verbs.forEach(function (v) { [1, 2].forEach(function (f) {
  var o = D.verbOptions(v, f);
  check(o.length === 4 && new Set(o).size === 4 && o[0] === v[f], 'verb options ' + v[0] + ' form ' + f + ': ' + o.join(', '));
  if (v[0] === 'be') check(o.indexOf('were') < 0, 'were is also right and must not be a wrong option');
  o.slice(1).forEach(function (x) { if (/ed$/.test(x) && x !== v[1] && x !== v[2]) eds.push(x); });
}); });
eds = Array.from(new Set(eds));
var realEds = eds.filter(function (w) { return unknown('en_GB', [w]).length === 0 || unknown('en_US', [w]).length === 0; });
check(!realEds.length, 'wrong -ed options that are real words (would be confusing): ' + realEds.join(', '));
// false friends and idioms
D.falseFriends.forEach(function (f) {
  var opts = [f[1], f[2]].concat(f[4]);
  check(new Set(opts).size === 4, 'false friend options unique: ' + f[0]);
  en = en.concat(tokens(f[0]), tokens(f[3]).filter(function (w) { return w !== 'eller'; })); da = da.concat(tokens(f[1]), tokens(f[2]), f[4].reduce(function (a, x) { return a.concat(tokens(x)); }, []));
});
D.idioms.forEach(function (i) { check(new Set([i[1]].concat(i[2])).size === 3, 'idiom options: ' + i[0]); en = en.concat(tokens(i[0])); da = da.concat(tokens(i[1]), i[2].reduce(function (a, x) { return a.concat(tokens(x)); }, [])); });
// reading texts: M asks in Danish, U in English; one right answer listed once
D.texts.forEach(function (tx) {
  en = en.concat(tokens(tx.text)); if (tx.b === 'U') en = en.concat(tokens(tx.title));
  tx.qs.forEach(function (q) {
    check(new Set([q[1]].concat(q[2])).size === 3, 'text options unique: ' + q[0]);
    var all = tokens(q[0]).concat(tokens(q[1]), q[2].reduce(function (a, x) { return a.concat(tokens(x)); }, []));
    if (tx.b === 'U') en = en.concat(all); else da = da.concat(all);
  });
  if (tx.b === 'M') da = da.concat(tokens(tx.title));
});
en = en.concat(D.praise.reduce(function (a, x) { return a.concat(tokens(x)); }, []), D.startLines.reduce(function (a, x) { return a.concat(tokens(x)); }, []));
// routes
D.routes.forEach(function (r) { (r.themes || []).forEach(function (tid) { check(D.themes.some(function (x) { return x.id === tid; }), r.id + ' theme ' + tid); }); (r.rules || []).forEach(function (rid) { check(D.rules[rid], r.id + ' rule ' + rid); check(D.gaps.some(function (g) { return g.r === rid && g.b === r.b; }), r.id + ': gaps for ' + rid + ' in band ' + r.b); }); });
['M', 'U'].forEach(function (b) { check(D.routes.filter(function (r) { return r.b === b; }).length >= 8, 'routes in band ' + b); });
// Danish strings and rules
Object.keys(D.rules).forEach(function (k) { da = da.concat(tokens(D.rules[k].name), tokens(D.rules[k].text)); });
D.routes.forEach(function (r) { da = da.concat(tokens(r.name), tokens(r.desc)); });
D.themes.forEach(function (th) { da = da.concat(tokens(th.name)); });
(function walk(o) { if (typeof o === 'string') da = da.concat(tokens(o)); else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { walk(o[k]); }); })(S);
// English words that appear inside Danish rule texts (examples) are checked as English
var EN_IN_DA = ['an', 'apple', 'hour', 'a', 'dog', 'uniform', 'is', 'are', 'am', 'the', 'dogs', 'I', 'you', 'he', 'she', 'it', 'plays', 'likes', 'eats', 'has', 'have', 'we', 'they', 'do', 'does', 'Does', 'like', 'not', 'know', 'He', 'yesterday', 'last', 'week', 'played', 'went', 'saw', 'ate', 'There', 'there', 'their', 'They\'re', 'they\'re', 'house', 'Their', 'your', 'You\'re', 'you\'re', 'bag', 'Your', 'its', 'It\'s', 'it\'s', 'wagged', 'tail', 'or', 'two', 'too', 'to', 'Two', 'Too', 'To', 'hot', 'school', 'than', 'then', 'Than', 'Then', 'bigger', 'many', 'much', 'apples', 'water', 'Many', 'Much', 'big', 'biggest', 'more', 'most', 'beautiful', 'good', 'better', 'best', 'bad', 'worse', 'worst', 'Yesterday', 'always', 'never', 'usually', 'She', 'drinks', 'tea', 'play', 'go', 'gone', 'ed', 'er', 'est', 'raining', 'cats', 'and', 'Raining', 's', 'with', 'by', 'English', 'Bob', 'Its', 'break', 'broke', 'broken', 'Read', 'answer', 'shirt', 'T', 'pommes', 'frites', 'Fluffy'];
var daOnly = da.filter(function (w) { return EN_IN_DA.indexOf(w) < 0 && w.length > 1; });
var uEn = unknown('en_GB', en.filter(function (w) { return w.length > 1 && ['Freya', 'Emma', 'Tom', 'Fluffy', 'Ali', 'Sara', 'Oliver', 'Max', 'Bob', 'B'].indexOf(w) < 0; }));
check(!uEn.length, 'unknown British English words: ' + uEn.join(', '));
var uUS = unknown('en_US', enUS); check(!uUS.length, 'unknown American words: ' + uUS.join(', '));
var uDa = unknown('da_DK', daOnly.filter(function (w) { return ['Ordbroen', 'Bob', 'Bobs', 'Nordsøen'].indexOf(w) < 0; }));
check(!uDa.length, 'unknown Danish words: ' + uDa.join(', '));
var nWords = 0; D.themes.forEach(function (th) { nWords += th.words.length; });
console.log(fails ? fails + ' FAILURES (' + checks + ' checks)' : 'Ordbroen: all ' + checks + ' checks passed (' + nWords + ' words, ' + D.sentences.length + ' sentences, ' + D.gaps.length + ' gaps, ' + D.verbs.length + ' verbs, ' + D.falseFriends.length + ' false friends, ' + D.idioms.length + ' idioms, ' + D.texts.length + ' texts)');
process.exit(fails ? 1 : 0);
