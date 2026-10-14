// Danish spell check of all player-visible text with hunspell (da_DK, Stavekontrolden).
// Requires: hunspell + hunspell-da.  Run: node tools/spellcheck.js
'use strict';
var execFileSync = require('child_process').execFileSync;
var texts = require('./collect-texts.js')(150);

// Names and terms that are correct but not in the dictionary
// (game names, the mascot, and "kr", which is always written "kr." in the games)
var ALLOW = ['Regnestorm', 'Ordjægeren', 'Laboratoriet', 'Verdensrejsen', 'Robotkoden', 'Bob', 'Bobs', 'JavaScript', 'kr', 'ig', 'aj', 'hv', 'Hv', 'Ali', 'Max',
  // landmarks in Verdensrejsen's clues (proper names; place names themselves are checked in test-verdensrejsen.js)
  'Fuji', 'Giza', 'Taj', 'Mahal', 'Machu', 'Picchu', 'Chichén', 'Itzá', 'Akropolis', 'Sagrada', 'Família', 'Brandenburger', 'Tor', 'Ringenes', 'Big', 'Ben', 'Lex', 'Natural', 'Earth', 'GeoNames', 'mio', 'mia', 'ca',
  // units and chemistry in Laboratoriet
  'BTB', 'kJ', 'cm', 'ml', 'mol', 'pH', 'Ohms', 'ohm', 'papirclips', 'Papirclips', 'Papirclipsen', 'bromthymolblåt', 'Bromthymolblåt',
  // Fase 2: game names, English examples in Ordbroen's Danish texts, names, invented brands and net terms
  'Ordbroen', 'Tidsmaskinen', 'Netdetektiven', 'shirt', 'pommes', 'frites', 'Fluffy', 'are', 'went', 'gone', 'broke', 'broken', 'does', 'there', 'their', 'your', 'its', 'than',
  'Raining', 'cats', 'dogs', 'Read', 'answer', 'Kheops', 'kumler', 'feedet', 'kl', 'Kh', 'Kvidrs', 'Bumlebanken', 'bumleb', 'nken', 'Bumlecentret', 'Haha', 'qwerty',
  'totrinsbekræftelse', 'SuperSovn', 'aux', 'deepfake', 'deepfakes', 'kodeordsmanager', 'Kodeordsmaskinen',
  // Fase 3: abbreviations (stk., md.), game names and a music term
  'stk', 'md', 'tonetrinet', 'Byggepladsen', 'Lommepenge', 'Taktslaget',
  // Fase 3: Tankespind
  'Tankespind', 'IQ', 'tankegangen',
  // Fase 3: Gådehuset (names in the puzzles, and the game's own words)
  'Gådehuset', 'Gådehusets', 'Hanois', 'sandsigere', 'sandsiger', 'Sandsiger', 'Frej', 'Gry', 'Liva', 'Gådemager', 'Gådemester', 'Viskelæder',
  // Fase 3: Labyrinten
  'Labyrinten', 'Glatis', 'Kassekløveren', 'Envejsgader', 'Huleforsker',
  // Fase 4: Mysteriet på museet (names, abbreviations and the runic inscription on Guldhornet)
  'kl', 'Kl', 'pm', 'Mr', 'ca', 'Gallehus', 'ek', 'hlewagastiR', 'holtijaR', 'horna', 'tawido', 'Lægæst', 'Heidenreich', 'Oehlenschläger', 'Exeter', 'Koelbjergmanden', 'Hjortspringbåden',
  // Fase 5: Opfinderværkstedet (Napa Valley, where Peter L. Jensen showed his loudspeaker)
  'Napa',
  // Fase 4–5: Bob's new looks (a correct compound the dictionary lacks)
  'Konfettivinger'];

var words = {}, where = {};
texts.forEach(function (t) {
  if (/\.(id|outfit)$/.test(t.source) || /device-width/.test(t.text)) return; // ids and technical meta, not shown
  (t.text.replace(/\u00ad/g, '').replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉéáíóúäÄ]+/g) || []).forEach(function (w) {
    if (w.length < 2 || ALLOW.indexOf(w) >= 0) return;
    words[w] = (words[w] || 0) + 1;
    if (!where[w]) where[w] = t.source + ': "' + t.text.slice(0, 90) + '"';
  });
});
var list = Object.keys(words);
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' })
  .split('\n').filter(Boolean);
bad = Array.from(new Set(bad));
console.log(list.length + ' distinct words checked from ' + texts.length + ' texts.');
if (!bad.length) { console.log('No unknown words.'); process.exit(0); }
console.log('Unknown words (' + bad.length + '):');
bad.forEach(function (w) {
  var sug = execFileSync('hunspell', ['-d', 'da_DK', '-a', '-i', 'utf-8'], { input: w, encoding: 'utf8' }).split('\n')[1] || '';
  console.log(' - ' + w + ' (' + words[w] + '×)  ' + where[w] + '   ' + sug.replace(/^[&#]\s*\S+\s*\d*\s*\d*:?\s*/, 'forslag: '));
});
process.exit(1);
