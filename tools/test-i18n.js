// Checks the language groundwork (Phase 6): choosing the language, merging texts, number/money/date formats, and every
// English text file against its Danish file: the same keys, the same {placeholders}, no Danish left, US spelling.
// node tools/test-i18n.js
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
let checks = 0, fails = 0;
function check(c, m) { checks++; if (!c) { fails++; console.log('FAIL', m); } }

/* ---------- choosing the language ---------- */
const I = require(path.join(ROOT, 'shared/i18n.js'));
check(I.fromUrl('?lang=en') === 'en' && I.fromUrl('?a=1&lang=da') === 'da' && I.fromUrl('?lang=xx') === null && I.fromUrl('') === null, 'fromUrl reads ?lang= and ignores unknown languages');
check(I.choose('en', 'da', ['da-DK']) === 'en', 'a ?lang= link wins over everything');
check(I.choose(null, 'en', ['da-DK']) === 'en', 'the choice saved on the device wins over the browser');
check(I.guess(['en-US', 'da']) === 'da', 'Danish anywhere in the browser list gives Danish');
check(I.guess(['en-US']) === (I.LANGS.en.ready ? 'en' : 'da'), 'an English browser gets English only when English is ready');
check(I.guess(['de-DE']) === 'da' && I.guess([]) === 'da', 'other browsers get Danish');
check(I.withoutLang('?lang=en') === '' && I.withoutLang('?lang=en&a=1') === '?a=1' && I.withoutLang('?a=1&lang=en') === '?a=1' && I.withoutLang('?a=1') === '?a=1', 'withoutLang removes only the lang parameter');
const merged = I.merge({ a: 'A', o: { x: 'X', y: 'Y' }, l: ['1', '2'] }, { a: 'a', o: { y: 'y' }, l: ['3'] });
check(merged.a === 'a' && merged.o.x === 'X' && merged.o.y === 'y' && merged.l.length === 1 && merged.l[0] === '3', 'merge: strings and lists are replaced, objects are merged key by key');
check(I.LANGS.da.ready === true && I.LANGS.da.html === 'da' && I.LANGS.en.html === 'en-US', 'Danish is always ready; English is marked en-US');

/* ---------- formats (Core.fmt) ---------- */
global.window = global;
global.document = undefined;
require(path.join(ROOT, 'shared/strings-da.js'));
require(path.join(ROOT, 'shared/core.js'));
const F = global.Core.fmt;
function inLang(L, fn) { const keep = global.I18N; global.I18N = { lang: L, info: () => ({ voice: L === 'en' ? 'en-US' : 'da' }) }; try { return fn(); } finally { global.I18N = keep; } }
[
  ['da', () => F.num(3.5), '3,5'], ['en', () => F.num(3.5), '3.5'],
  ['da', () => F.num(1234567), '1.234.567'], ['en', () => F.num(1234567), '1,234,567'],
  ['da', () => F.num(1234, undefined, { group: false }), '1234'], ['en', () => F.num(-1234.5), '-1,234.5'],
  ['da', () => F.num(2, 2), '2,00'], ['en', () => F.num(0.1 + 0.2), '0.3'], ['da', () => F.num(999), '999'],
  ['da', () => F.money(12), '12 kr.'], ['da', () => F.money(12.5), '12,50 kr.'], ['da', () => F.money(1500), '1.500 kr.'],
  ['en', () => F.money(12), '$12'], ['en', () => F.money(4.5), '$4.50'], ['en', () => F.money(1500.25), '$1,500.25'],
  ['da', () => F.date(new Date(2026, 9, 22)), '22. oktober 2026'],
  ['da', () => F.parse('3,5'), 3.5], ['da', () => F.parse('3.5'), 3.5], ['da', () => F.parse('1.000'), 1000], ['da', () => F.parse('1.000,5'), 1000.5],
  ['en', () => F.parse('3.5'), 3.5], ['en', () => F.parse('3,5'), 3.5], ['en', () => F.parse('1,000'), 1000], ['en', () => F.parse('1,234.5'), 1234.5],
  ['en', () => F.parse(' -7 '), -7], ['da', () => F.parse('−2,5'), -2.5]
].forEach(([L, fn, want]) => { const got = inLang(L, fn); check(got === want, `fmt (${L}): ${fn.toString().replace(/^\(\) => /, '')} → ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); });
check(isNaN(inLang('en', () => F.parse('abc'))) && isNaN(inLang('da', () => F.parse(''))), 'fmt.parse gives NaN for words and empty input');
// the English date uses the English month names from strings-en.js once they are there
check(/^\S+ 22, 2026$/.test(inLang('en', () => F.date(new Date(2026, 9, 22)))), 'fmt.date in English: Month 22, 2026');

/* ---------- which files a game loads in each language ---------- */
const fake = { js: ['g/strings-da.js', 'g/data.js', { da: 'g/money.js', en: 'g/money-en.js' }, 'g/game.js'], langs: ['da', 'en'] };
check(JSON.stringify(inLang('da', () => global.Core.sources(fake))) === JSON.stringify(['g/strings-da.js', 'g/data.js', 'g/money.js', 'g/game.js']), 'Danish loads the Danish files only');
check(JSON.stringify(inLang('en', () => global.Core.sources(fake))) === JSON.stringify(['g/strings-da.js', 'g/strings-en.js', 'g/data.js', 'g/money-en.js', 'g/game.js']), 'English loads strings-en.js after strings-da.js, and the English content file');
check(JSON.stringify(inLang('en', () => global.Core.sources({ js: ['h/strings-da.js', 'h/game.js'] }))) === JSON.stringify(['h/strings-da.js', 'h/game.js']), 'a game without English stays Danish in the English version');
const p = global.Core.createProfile('Test', '#fff', 'M', 'en');
check(p.lang === 'en' && global.Core.profileLang(p) === 'en' && global.Core.profileLang({}) === 'da', 'a player keeps a language; older players are Danish');
check(inLang('da', () => global.Core.starIcons(2, 3)).indexOf('aria-label="2 af 3 stjerner"') > 0, 'the star label comes from the texts');

/* ---------- every English text file against its Danish file ---------- */
const GAMES = require(path.join(ROOT, 'shared/games.js'));
const dirs = ['shared'].concat(GAMES.map(g => g.id));
function loadDa(dir) {
  global.window.STR = {};
  const file = path.join(ROOT, dir, 'strings-da.js');
  delete require.cache[file]; require(file);
  return global.window.STR;
}
function loadEn(dir) {
  const file = path.join(ROOT, dir, 'strings-en.js'); if (!fs.existsSync(file)) return null;
  const out = {}; global.I18N = { add: (code, prefix, texts) => { if (code === 'en') out[prefix] = texts; } };
  delete require.cache[file]; require(file); delete global.I18N;
  return out;
}
function leaves(o, pre, acc) {
  if (typeof o === 'string') acc[pre] = o;
  else if (Array.isArray(o)) o.forEach((v, i) => leaves(v, pre + '[' + i + ']', acc));
  else if (o && typeof o === 'object') for (const k in o) leaves(o[k], pre ? pre + '.' + k : k, acc);
  return acc;
}
function holes(s) { return (String(s).match(/\{\w+\}/g) || []).sort().join(','); }
function typeOf(x) { return Array.isArray(x) ? 'list' : typeof x; }
function walk(en, da, at, tag) { // every English key must exist in Danish, with the same kind of value
  if (typeOf(en) !== typeOf(da)) { check(false, `${tag}: ${at} is a ${typeOf(en)} in English but a ${typeOf(da)} in Danish`); return; }
  if (Array.isArray(en)) { check(en.length === da.length, `${tag}: ${at} has ${en.length} items, Danish has ${da.length}`); en.forEach((v, i) => da[i] !== undefined && walk(v, da[i], at + '[' + i + ']', tag)); return; }
  if (en && typeof en === 'object') { for (const k in en) { if (!(k in da)) check(false, `${tag}: ${at ? at + '.' : ''}${k} is not a Danish key (typo?)`); else walk(en[k], da[k], at ? at + '.' + k : k, tag); } return; }
  if (typeof en === 'string') check(holes(en) === holes(da), `${tag}: ${at} has {${holes(en)}} but Danish has {${holes(da)}}`);
}
const DANISH_OK = /^(Dansk|Lær med Bob|Bob)$/; // texts that may keep Danish letters on purpose
const enWords = {}, report = [];
let shownDanish = 0;
dirs.forEach(dir => {
  if (!fs.existsSync(path.join(ROOT, dir, 'strings-da.js'))) return;
  const da = loadDa(dir), en = loadEn(dir);
  const prefixes = Object.keys(da);
  let total = 0, done = 0;
  prefixes.forEach(pf => {
    const daL = leaves(da[pf], '', {}); total += Object.keys(daL).length;
    if (!en || !en[pf]) return;
    walk(en[pf], da[pf], '', dir + '/' + pf);
    const enL = leaves(en[pf], '', {});
    Object.keys(enL).forEach(k => {
      if (daL[k] !== undefined) done++;
      const s = enL[k];
      if (/[æøåÆØÅ]/.test(s) && !DANISH_OK.test(s)) { check(false, `${dir}/${pf}.${k}: Danish letters in English text: ${s.slice(0, 60)}`); }
      (s.replace(/\{\w+\}/g, ' ').replace(/­/g, '').match(/[A-Za-z][A-Za-z']*/g) || []).forEach(w => { w = w.replace(/'s$|'$/, ''); (enWords[w] = enWords[w] || []).push(dir); });
    });
  });
  const g = GAMES.find(x => x.id === dir);
  const claims = dir === 'shared' ? I.LANGS.en.ready : !!(g && (g.langs || []).indexOf('en') >= 0);
  if (claims) {
    check(done === total, `${dir}: marked as English but ${total - done} of ${total} texts are not translated`);
    check(!!en, `${dir}: marked as English but has no strings-en.js`);
  }
  if (en || claims) report.push(`${dir}: ${done}/${total} texts in English${claims ? ' (marked ready)' : ''}`);
});
// US spelling (hunspell en_US) of every English word
const ALLOW_EN = new Set(['Bob', 'Bob\'s', 'Dansk', 'Lær', 'med']);
const words = Object.keys(enWords).filter(w => !ALLOW_EN.has(w));
if (words.length) {
  const bad = cp.execSync('hunspell -d en_US -l', { input: words.join('\n') }).toString().split('\n').filter(Boolean);
  bad.forEach(w => check(false, `US spelling: »${w}« (${[...new Set(enWords[w])].join(', ')})`));
}

/* ---------- the files are wired up ---------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const pos = f => html.indexOf('src="' + f + '"');
check(pos('shared/strings-da.js') >= 0 && pos('shared/strings-da.js') < pos('shared/i18n.js') && pos('shared/i18n.js') < pos('shared/strings-en.js') && pos('shared/strings-en.js') < pos('shared/core.js'),
  'index.html loads strings-da.js, i18n.js, strings-en.js, then core.js');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const wanted = ['shared/i18n.js', 'shared/strings-en.js'];
GAMES.forEach(g => (g.js || []).forEach(src => {
  if (src && typeof src === 'object') Object.keys(src).forEach(L => wanted.push(src[L]));
  else if ((g.langs || []).indexOf('en') >= 0 && /strings-da\.js$/.test(src)) wanted.push(src.replace(/strings-da\.js$/, 'strings-en.js'));
}));
wanted.forEach(f => { check(fs.existsSync(path.join(ROOT, f)), `${f} exists`); check(sw.indexOf("'./" + f + "'") >= 0, `sw.js caches ${f} for offline play`); });
// no Danish written straight into the shared code (it belongs in strings-da.js)
['shared/core.js', 'shared/hub.js', 'shared/daily.js', 'shared/badges.js'].forEach(f => {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const lits = (code.match(/'(?:[^'\\\n]|\\.)*'/g) || []).filter(x => /[æøåÆØÅ]/.test(x));
  check(lits.length === 0, `${f}: Danish text in the code: ${lits.slice(0, 3).join(', ')}`);
});

console.log(report.join('\n') || 'No English texts yet.');
console.log(fails ? `i18n: ${fails} of ${checks} checks FAILED` : `i18n: all ${checks} checks passed`);
process.exit(fails ? 1 : 0);
