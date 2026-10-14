// Collects every Danish text the player can see, for spell-checking and the korrektur-ark.
// Usage (Node): const texts = require('./collect-texts.js')();  → [{ source, text }]
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.resolve(__dirname, '..');

function loadStrings(file) {
  var ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx);
  return ctx.window.STR;
}
function flatten(obj, prefix, out) {
  if (typeof obj === 'string') out.push({ source: prefix, text: obj });
  else if (Array.isArray(obj)) obj.forEach(function (v, i) { flatten(v, prefix + '[' + i + ']', out); });
  else if (obj && typeof obj === 'object') for (var k in obj) flatten(obj[k], prefix ? prefix + '.' + k : k, out);
  return out;
}

module.exports = function collect(samplesPerLevel) {
  samplesPerLevel = samplesPerLevel || 200;
  var out = [];
  flatten(loadStrings('shared/strings-da.js').core, 'Fælles', out);
  flatten(loadStrings('regnestorm/strings-da.js').rs, 'Regnestorm', out);
  flatten(loadStrings('robotkoden/strings-da.js').rk, 'Robotkoden', out);
  var LV = require(path.join(ROOT, 'robotkoden/levels.js'));
  LV.worlds.forEach(function (w) { out.push({ source: 'Robotkoden verden ' + w.id, text: w.name + '. ' + w.desc + '. ' + w.from }); });
  LV.defs.forEach(function (d) { out.push({ source: 'Robotkoden bane ' + d.id, text: d.title }, { source: 'Robotkoden bane ' + d.id, text: d.hint }); });
  flatten(loadStrings('ordjaegeren/strings-da.js').oj, 'Ordjægeren', out);
  var OJ = require(path.join(ROOT, 'ordjaegeren/words.js'));
  Object.keys(OJ.rules).forEach(function (k) { out.push({ source: 'Ordjægeren regel', text: OJ.rules[k].name + '. ' + OJ.rules[k].text }); });
  OJ.spelling.forEach(function (x) { out.push({ source: 'Ordjægeren ord', text: x.w + '. ' + x.s }); });
  Object.keys(OJ.classes).forEach(function (k) { out.push({ source: 'Ordjægeren ordklasse', text: OJ.classNames[k] + ': ' + OJ.classes[k].join(', ') }); });
  OJ.gaps.forEach(function (g) { out.push({ source: 'Ordjægeren sætning', text: g.s.replace('___', g.a) }); });
  OJ.commas.forEach(function (c) { out.push({ source: 'Ordjægeren komma', text: c.replace('|', ',') }); });
  OJ.idioms.forEach(function (d) { out.push({ source: 'Ordjægeren udtryk', text: d.u + '. ' + d.a + '. ' + d.x.join('. ') }); });
  OJ.routes.forEach(function (r) { out.push({ source: 'Ordjægeren rute', text: r.name + '. ' + r.desc }); });
  flatten(loadStrings('verdensrejsen/strings-da.js').vr, 'Verdensrejsen', out);
  var VR = require(path.join(ROOT, 'verdensrejsen/places.js'));
  Object.keys(VR.clues).forEach(function (k) { out.push({ source: 'Verdensrejsen spor ' + k, text: VR.clues[k] }); });
  VR.routes.forEach(function (r) { out.push({ source: 'Verdensrejsen rejse', text: r.name + '. ' + r.desc }); });
  flatten(loadStrings('laboratoriet/strings-da.js').lab, 'Laboratoriet', out);
  global.window = global.window || global;
  require(path.join(ROOT, 'laboratoriet/sim.js'));
  var LAB = require(path.join(ROOT, 'laboratoriet/content.js'));
  Object.keys(LAB.facts).forEach(function (k) { out.push({ source: 'Laboratoriet opdagelse', text: LAB.facts[k].t + '. ' + LAB.facts[k].x }); });
  LAB.stations.forEach(function (st) { out.push({ source: 'Laboratoriet station', text: st.name + '. ' + st.desc }); });
  LAB.routes.forEach(function (r) {
    out.push({ source: 'Laboratoriet forsøg', text: r.name });
    for (var n = 0; n < 40; n++) LAB.buildRound(r).forEach(function (c) {
      var src = 'Laboratoriet ' + c.gen;
      [c.q, c.result, c.hint, typeof c.solution === 'string' ? c.solution : '', c.after].concat(c.options || [], c.explain ? [c.explain.q].concat(c.explain.options) : [],
        (c.items || []).map(function (x) { return x.name; }), (c.bins || []).map(function (x) { return x.name; })).forEach(function (x) { if (x) out.push({ source: src, text: x }); });
    });
  });
  // Fase 2. English text in Ordbroen is checked separately by tools/test-ordbroen.js (en_GB/en_US).
  flatten(loadStrings('ordbroen/strings-da.js').ob, 'Ordbroen', out);
  var OB = require(path.join(ROOT, 'ordbroen/words.js'));
  OB.themes.forEach(function (th) { out.push({ source: 'Ordbroen tema', text: th.name || '' }); th.words.forEach(function (w) { out.push({ source: 'Ordbroen ord ' + w[0], text: w[1] }); }); });
  OB.sentences.forEach(function (x) { out.push({ source: 'Ordbroen sætning', text: x.da }); });
  OB.verbs.forEach(function (v) { out.push({ source: 'Ordbroen udsagnsord ' + v[0], text: v[3] }); });
  OB.falseFriends.forEach(function (f) { out.push({ source: 'Ordbroen falsk ven ' + f[0], text: [f[1], f[2]].concat(f[4]).join('. ') }); });
  OB.idioms.forEach(function (i) { out.push({ source: 'Ordbroen udtryk', text: [i[1]].concat(i[2]).join('. ') }); });
  OB.texts.filter(function (x) { return x.b === 'M'; }).forEach(function (x) { x.qs.forEach(function (q) { out.push({ source: 'Ordbroen læsetekst ' + x.title, text: [q[0], q[1]].concat(q[2]).join('. ') }); }); });
  OB.routes.forEach(function (r) { out.push({ source: 'Ordbroen rute', text: r.name + '. ' + r.desc }); });
  flatten(loadStrings('tidsmaskinen/strings-da.js').tm, 'Tidsmaskinen', out);
  var TM = require(path.join(ROOT, 'tidsmaskinen/events.js'));
  TM.periods.forEach(function (x) { out.push({ source: 'Tidsmaskinen periode', text: x.name + '. ' + x.yt }); });
  TM.events.forEach(function (e) { out.push({ source: 'Tidsmaskinen ' + e.id, text: e.yt + '. ' + e.t + '. ' + e.d }); });
  TM.things.forEach(function (x) { out.push({ source: 'Tidsmaskinen ting', text: x[0] }); });
  TM.sources.forEach(function (x) { out.push({ source: 'Tidsmaskinen kilde ' + x.id, text: x.kind + '. ' + x.title + '. ' + x.text }); x.qs.forEach(function (q) { out.push({ source: 'Tidsmaskinen kilde ' + x.id, text: [q[0], q[1]].concat(q[2]).join('. ') }); }); });
  TM.routes.forEach(function (r) { out.push({ source: 'Tidsmaskinen rejse', text: r.name + '. ' + r.desc }); });
  flatten(loadStrings('netdetektiven/strings-da.js').nd, 'Netdetektiven', out);
  var ND = require(path.join(ROOT, 'netdetektiven/cases.js'));
  var noAddr = function (x) { return String(x).replace(/<[^>]*>/g, ' ').replace(/\b[\w.-]+\.(dk|com|net|info|biz|click)(\/\w*)?/g, ' '); }; // invented addresses are read by hand
  ND.mails.forEach(function (m) { [m.from, m.subject, m.body, m.signs].concat(m.parts.map(function (p) { return p[0] + ': ' + p[1]; })).forEach(function (x) { out.push({ source: 'Netdetektiven besked ' + m.id, text: noAddr(x) }); }); });
  ND.passwordPairs.forEach(function (x) { out.push({ source: 'Netdetektiven kodeord', text: x[2] }); });
  ND.passwordCards.forEach(function (x) { out.push({ source: 'Netdetektiven kort', text: x.w }); });
  ND.shareItems.forEach(function (x) { out.push({ source: 'Netdetektiven del', text: x[0] }); });
  ND.shareBins.forEach(function (x) { out.push({ source: 'Netdetektiven del', text: x.name }); });
  ND.scenarios.forEach(function (x) { out.push({ source: 'Netdetektiven hvad gør du', text: [x[1], x[2]].concat(x[3], [x[4]]).join(' ') }); });
  ND.sourceSets.forEach(function (x) { out.push({ source: 'Netdetektiven kildejagt', text: [x.claim].concat(x.pages.map(function (p) { return p.join('. '); }), [x.why[0]], x.why[1]).join(' ') }); });
  ND.imageCases.concat(ND.dataQuiz).forEach(function (x) { out.push({ source: 'Netdetektiven quiz', text: [x[0], x[1]].concat(x[2], [x[3]]).join(' ') }); });
  ND.routes.forEach(function (r) { out.push({ source: 'Netdetektiven sag', text: r.name + '. ' + r.desc }); });
  // Byggepladsen, Lommepenge, Taktslaget: buttons and messages (their generated tasks are spell-checked in their own tests)
  flatten(loadStrings('byggepladsen/strings-da.js').bp, 'Byggepladsen', out);
  flatten(loadStrings('lommepenge/strings-da.js').lp, 'Lommepenge', out);
  flatten(loadStrings('taktslaget/strings-da.js').ts, 'Taktslaget', out);
  // Tankespind: buttons, word lists, analogies and the generated hints and explanations
  var TKS = loadStrings('tankespind/strings-da.js').tk;
  flatten(TKS, 'Tankespind', out);
  global.window = global.window || global; global.window.STR = global.window.STR || {}; global.window.STR.tk = TKS;
  var TK = require(path.join(ROOT, 'tankespind/puzzles.js'));
  TK.WORDS.forEach(function (c) { out.push({ source: 'Tankespind ordgruppe ' + c.id, text: [c.name, c.one].concat(c.words).join(', ') }); });
  TK.ANALOGIES.forEach(function (a) { out.push({ source: 'Tankespind analogi', text: a.slice(1, 5).concat(a[5], [a[6]]).join(', ') }); });
  TK.ROUTES.forEach(function (r) {
    for (var L = r.min; L <= r.max; L++) for (var i = 0; i < Math.min(samplesPerLevel, 60); i++) {
      var tk = TK.make(r.kind, Math.random, L, r.b);
      out.push({ source: 'Tankespind ' + r.id + ' niveau ' + L, text: tk.hint + ' ' + tk.explain });
    }
  });
  // Gådehuset: buttons, pictures, river stories and generated steps (logic grids, truth tellers)
  var GHS = loadStrings('gaadehuset/strings-da.js').gh;
  flatten(GHS, 'Gådehuset', out);
  global.window.STR.gh = GHS;
  var GHP = require(path.join(ROOT, 'gaadehuset/pictures.js'));
  GHP.forEach(function (p) { out.push({ source: 'Gådehuset billede ' + p.id, text: p.name }); });
  var RVM = require(path.join(ROOT, 'gaadehuset/river.js'));
  RVM.PUZZLES.forEach(function (p) { out.push({ source: 'Gådehuset flod ' + p.id, text: [p.title, p.story].concat(p.solution.map(function (s) { return s[1]; }), p.rules.map(function (r) { return r.msg; }), p.items.map(function (i) { return i.name; })).join(' ') }); });
  var LGM = require(path.join(ROOT, 'gaadehuset/logic.js')), TFM = require(path.join(ROOT, 'gaadehuset/truth.js'));
  ['M', 'U'].forEach(function (b) { [1, 2, 3].forEach(function (l) { for (var i = 0; i < Math.min(samplesPerLevel, 15); i++) {
    var p = LGM.make(b, l, Math.random);
    out.push({ source: 'Gådehuset hvem ejer hvad', text: p.clues.map(function (c) { return LGM.clueText(p, c); }).concat(LGM.solve(p, p.clues).steps.map(function (s) { return LGM.stepText(p, s); }), [LGM.answerText(p)]).join(' ') });
  } }); });
  [1, 2, 3].forEach(function (l) { for (var i = 0; i < Math.min(samplesPerLevel, 15); i++) { var p = TFM.make(l, Math.random); out.push({ source: 'Gådehuset sandt eller falsk', text: p.says.map(function (s) { return TFM.said(p, s) + ' ' + TFM.fact(p, s); }).join(' ') }); } });
  // Labyrinten: buttons and the generated explanations and questions
  var LBS = loadStrings('labyrinten/strings-da.js').lb;
  flatten(LBS, 'Labyrinten', out);
  global.window.STR.lb = LBS;
  var MZ = require(path.join(ROOT, 'labyrinten/mazes.js'));
  for (var li = 0; li < Math.min(samplesPerLevel, 6); li++) {
    [MZ.makeKeys(5, 5, 2, Math.random), MZ.makeOneWay(5, 5, 5, Math.random), MZ.makeIce(7, 7, 4, 7, Math.random), MZ.makeCrates(5, 5, 1, 8, 30, Math.random)].forEach(function (lv) { out.push({ source: 'Labyrinten ' + lv.kind, text: MZ.explain(lv).map(function (s) { return s.text; }).join(' ') }); });
    var mz = MZ.makeMirrors(6, 4, 2, Math.random); out.push({ source: 'Labyrinten spejle', text: MZ.mirrorSteps(mz, mz.start).map(function (s) { return s.text; }).join(' ') });
    ['steps', 'stepsMud', 'pick', 'pickMud', 'count'].forEach(function (k) { var q = MZ.makeRouteQ(k, Math.random); out.push({ source: 'Labyrinten korteste vej', text: [q.q, q.hint, q.explain].join(' ') }); });
  }
  // Raketbanen: buttons, fact cards and every level's explanation
  flatten(loadStrings('raketbanen/strings-da.js').rb, 'Raketbanen', out);
  require(path.join(ROOT, 'raketbanen/levels.js')).forEach(function (w) {
    out.push({ source: 'Raketbanen verden ' + w.id, text: w.fact });
    w.levels.forEach(function (lv) { out.push({ source: 'Raketbanen bane ' + lv.id, text: lv.why }); });
  });
  // Opfinderværkstedet: buttons, the story line, Opfinderbogen (without the source links) and every machine's goal and »Hvorfor?«
  flatten(loadStrings('opfinder/strings-da.js').of, 'Opfinderværkstedet', []).forEach(function (x) { if (!/\.url$/.test(x.source)) out.push(x); });
  require(path.join(ROOT, 'opfinder/machines.js')).worlds.forEach(function (w) {
    w.levels.forEach(function (lv, i) { out.push({ source: 'Opfinderværkstedet ' + w.id + ' ' + (i + 1), text: lv.goal + ' ' + lv.why }); });
  });
  // Mysteriet på museet: buttons, story, things in the rooms, clues, collection cards and generated puzzle texts.
  // Mr. Smith's English letters are left out, and English quoted »…« in the letter room's texts is cut away.
  var MUS = loadStrings('museet/strings-da.js').mu, noEn = function (s) { return String(s).replace(/»[^«]*«/g, ' '); };
  flatten(MUS, 'Museet', []).forEach(function (x) {
    if (/englishItems\[\d+\]\[0\]/.test(x.source)) return; // the English sentence itself
    out.push({ source: x.source, text: /\.pz\.let|\.q\.english|lesson\.renaessancen/.test(x.source) ? noEn(x.text) : x.text });
  });
  global.window.STR.mu = MUS;
  var MST = require(path.join(ROOT, 'museet/story.js')), MPZ = require(path.join(ROOT, 'museet/puzzles.js'));
  var soft = function (s) { return String(s).replace(/­/g, ''); };
  MST.rooms.forEach(function (r) { out.push({ source: 'Museet sal ' + r.id, text: soft([r.name, r.era, r.desc.M, r.desc.U, r.intro.M, r.intro.U].join('. ')) }); });
  MST.intro.concat(MST.ending, MST.trueStory).forEach(function (p) { out.push({ source: 'Museet historien', text: p.replace('{T}', '21.40') }); });
  MST.suspects.forEach(function (s) { out.push({ source: 'Museet mistænkt', text: s.name + ', ' + s.role + '. ' + s.about }); });
  MST.clues.forEach(function (c) { out.push({ source: 'Museet spor ' + c.id, text: c.text.replace(/\{\w+\}/g, ' ') }); });
  Object.keys(MST.spots).forEach(function (r) { MST.spots[r].forEach(function (s) { out.push({ source: 'Museet ' + r + ' ' + s.id, text: s.label + '. ' + s.text }); }); });
  Object.keys(MST.items).forEach(function (k) { out.push({ source: 'Museet lomme', text: MST.items[k] }); });
  Object.keys(MST.opened).forEach(function (k) { out.push({ source: 'Museet låsen åbner', text: MST.opened[k].replace('{where}', ' ') }); });
  Object.keys(MST.finds).forEach(function (k) { var f = MST.finds[k]; out.push({ source: 'Museet fund', text: soft(f.name + '. ' + f.what + '. ' + f.when) }); });
  MST.signs.forEach(function (s) { out.push({ source: 'Museet skilt', text: s.year + ' ' + s.text }); });
  ['M', 'U'].forEach(function (b) {
    Object.keys(MST.cards[b]).forEach(function (r) { var c = MST.cards[b][r]; out.push({ source: 'Museet samling', text: c.title + '. ' + c.era + '. ' + c.fact }); });
    MPZ.ROOMS.forEach(function (r) { for (var i = 0; i < Math.min(samplesPerLevel, 20); i++) MPZ.make(r, b, Math.random).steps.forEach(function (st) {
      [st.q, st.explain].concat(st.hints, st.options || []).forEach(function (x) { out.push({ source: 'Museet ' + r + ' (' + b + ')', text: soft(r === 'renaessancen' ? noEn(x) : x) }); });
    }); });
  });
  // static text in index.html and hub.js
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  (html.match(/<title>([^<]+)<\/title>|content="([^"]+)"|<p[^>]*>([^<]+)<\/p>/g) || []).forEach(function (m) {
    out.push({ source: 'index.html', text: m.replace(/<[^>]+>|content="|"/g, '') });
  });
  ['Gul', 'Blå', 'Grøn', 'Lyserød', 'Lilla', 'Orange'].forEach(function (c) { out.push({ source: 'Farvenavne', text: c }); });
  // generated problems
  var Regn = require(path.join(ROOT, 'regnestorm/problems.js'));
  Regn.topics.forEach(function (tp) {
    out.push({ source: 'Verden: ' + tp.id, text: tp.name }, { source: 'Verden: ' + tp.id, text: tp.desc });
    for (var L = 1; L <= 5; L++) {
      var R = Regn.makeRand(42 + L);
      for (var i = 0; i < samplesPerLevel; i++) {
        var p = Regn.generate(tp.id, L, R), src = tp.name + ' · niveau ' + L;
        out.push({ source: src, text: p.text, kind: 'opgave', p: p }, { source: src, text: p.hint.text, kind: 'hjælp' },
                 { source: src, text: p.solution, kind: 'løsning' }, { source: src, text: p.speech, kind: 'oplæsning' });
      }
    }
  });
  return out;
};
