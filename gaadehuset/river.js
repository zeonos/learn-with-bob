/*
 * »Over floden« – river crossings. Each puzzle is written by hand with its own story and a solution where every trip
 * is explained. A breadth-first search over the states proves the fewest trips and gives tips from any state.
 * Danish texts for the puzzles are here; the buttons are in strings-da.js.
 *
 * item: { id, type, name (»geden«), w (kg, optional), rows (can row the boat) }
 * rules: { k: 'eats', a, b, guard }: a eats b when they are on a bank without guard
 *        { k: 'outnumber', pred, prey }: on a bank with prey, there must not be more pred than prey
 * A state is { at: { id: 0 | 1 }, boat: 0 | 1 } (0 = this bank, 1 = the other bank).
 */
(function (root) {
  'use strict';
  var PUZZLES = [
    { id: 'boern', b: 'M', level: 1, title: 'Far og børnene',
      story: 'Far og hans to børn skal over floden. Båden kan højst bære 60 kg. Far vejer 60 kg, og børnene vejer 30 kg hver. Alle kan ro.',
      boat: { cap: 2, maxW: 60 },
      items: [{ id: 'far', type: 'far', name: 'far', w: 60, rows: true }, { id: 'pige', type: 'pige', name: 'pigen', w: 30, rows: true }, { id: 'dreng', type: 'dreng', name: 'drengen', w: 30, rows: true }],
      rules: [],
      solution: [
        [['pige', 'dreng'], 'Begge børn sejler over. Tilsammen vejer de 60 kg, så de kan godt være i båden sammen.'],
        [['pige'], 'Pigen sejler båden tilbage, så far kan få den.'],
        [['far'], 'Far sejler over alene. Han vejer 60 kg, så der er ikke plads til andre.'],
        [['dreng'], 'Drengen sejler båden tilbage og henter sin søster.'],
        [['pige', 'dreng'], 'Til sidst sejler begge børn over sammen.']
      ] },
    { id: 'ulv', b: 'M', level: 2, title: 'Ulven, geden og kålen',
      story: 'En bonde skal have en ulv, en ged og et kålhoved over floden. Der er kun plads til bonden og én ting mere i båden, og det er kun bonden, der kan ro. Hvis bonden ikke er der, spiser ulven geden, og geden spiser kålen.',
      boat: { cap: 2 },
      items: [{ id: 'bonde', type: 'bonde', name: 'bonden', rows: true }, { id: 'ulv', type: 'ulv', name: 'ulven' }, { id: 'ged', type: 'ged', name: 'geden' }, { id: 'kaal', type: 'kaal', name: 'kålen' }],
      rules: [{ k: 'eats', a: 'ulv', b: 'ged', guard: 'bonde', msg: 'Ulven spiste geden, mens bonden var væk.' }, { k: 'eats', a: 'ged', b: 'kaal', guard: 'bonde', msg: 'Geden spiste kålen, mens bonden var væk.' }],
      solution: [
        [['bonde', 'ged'], 'Bonden tager geden med først. Ulven spiser ikke kål, så de to kan godt være alene.'],
        [['bonde'], 'Bonden sejler tilbage alene.'],
        [['bonde', 'ulv'], 'Bonden tager ulven med over.'],
        [['bonde', 'ged'], 'Ulven og geden må ikke være alene, så bonden tager geden med tilbage.'],
        [['bonde', 'kaal'], 'Bonden lader geden blive og tager kålen med over. Ulven og kålen kan godt være sammen.'],
        [['bonde'], 'Bonden sejler tilbage alene.'],
        [['bonde', 'ged'], 'Til sidst henter bonden geden.']
      ] },
    { id: 'familie', b: 'M', level: 3, title: 'Familien på tur',
      story: 'Mor, far og to børn skal over floden. Båden kan højst bære 80 kg. Mor og far vejer 80 kg hver, og børnene vejer 40 kg hver. Alle kan ro.',
      boat: { cap: 2, maxW: 80 },
      items: [{ id: 'mor', type: 'mor', name: 'mor', w: 80, rows: true }, { id: 'far', type: 'far', name: 'far', w: 80, rows: true }, { id: 'pige', type: 'pige', name: 'pigen', w: 40, rows: true }, { id: 'dreng', type: 'dreng', name: 'drengen', w: 40, rows: true }],
      rules: [],
      solution: [
        [['pige', 'dreng'], 'Børnene sejler over sammen. De vejer 80 kg tilsammen.'],
        [['pige'], 'Pigen sejler tilbage med båden.'],
        [['mor'], 'Mor sejler over alene.'],
        [['dreng'], 'Drengen sejler båden tilbage.'],
        [['pige', 'dreng'], 'Børnene sejler over sammen igen.'],
        [['pige'], 'Pigen sejler tilbage.'],
        [['far'], 'Far sejler over alene.'],
        [['dreng'], 'Drengen henter sin søster.'],
        [['pige', 'dreng'], 'Til sidst sejler børnene over sammen.']
      ] },
    { id: 'ulv-u', b: 'U', level: 1, title: 'Ulven, geden og kålen',
      story: 'En bonde skal have en ulv, en ged og et kålhoved over floden. Der er kun plads til bonden og én ting mere i båden, og det er kun bonden, der kan ro. Hvis bonden ikke er der, spiser ulven geden, og geden spiser kålen.',
      same: 'ulv' },
    { id: 'faar', b: 'U', level: 3, title: 'Får og ulve',
      story: 'Tre får og tre ulve skal over floden. Båden kan have to dyr, og alle kan ro. Hvis der på en bred er flere ulve end får, spiser ulvene fårene. Dyrene i båden tæller med på den bred, de lægger til ved.',
      boat: { cap: 2 },
      items: [{ id: 'f1', type: 'faar', name: 'et får', rows: true }, { id: 'f2', type: 'faar', name: 'et får', rows: true }, { id: 'f3', type: 'faar', name: 'et får', rows: true },
        { id: 'u1', type: 'ulv', name: 'en ulv', rows: true }, { id: 'u2', type: 'ulv', name: 'en ulv', rows: true }, { id: 'u3', type: 'ulv', name: 'en ulv', rows: true }],
      rules: [{ k: 'outnumber', pred: 'ulv', prey: 'faar', msg: 'Der var flere ulve end får på den ene bred.' }],
      solution: [
        [['u1', 'u2'], 'To ulve sejler over. Der er ingen får på den anden bred, så det går fint.'],
        [['u1'], 'Den ene ulv sejler tilbage.'],
        [['u1', 'u3'], 'To ulve sejler over igen. Nu er alle tre ulve ovre.'],
        [['u1'], 'En ulv sejler tilbage. Nu er der to ulve ovre.'],
        [['f1', 'f2'], 'To får sejler over. På hver bred er der nu lige mange får og ulve.'],
        [['f1', 'u2'], 'Et får og en ulv sejler tilbage, så fårene ikke er i undertal.'],
        [['f1', 'f3'], 'To får sejler over. Nu er alle tre får ovre sammen med én ulv.'],
        [['u3'], 'Ulven sejler tilbage. Den kan ikke spise nogen, for der er ingen får tilbage på den bred.'],
        [['u1', 'u3'], 'To ulve sejler over.'],
        [['u1'], 'En ulv sejler tilbage efter den sidste.'],
        [['u1', 'u2'], 'Til sidst sejler de to sidste ulve over.']
      ] },
    { id: 'tung', b: 'U', level: 2, title: 'Den tunge familie',
      story: 'Far vejer 90 kg, mor vejer 60 kg, Ida vejer 40 kg, og Bo vejer 30 kg. Båden kan højst bære 100 kg, og alle kan ro.',
      boat: { cap: 3, maxW: 100 },
      items: [{ id: 'far', type: 'far', name: 'far', w: 90, rows: true }, { id: 'mor', type: 'mor', name: 'mor', w: 60, rows: true }, { id: 'pige', type: 'pige', name: 'Ida', w: 40, rows: true }, { id: 'dreng', type: 'dreng', name: 'Bo', w: 30, rows: true }],
      rules: [],
      solution: [
        [['mor', 'dreng'], 'Mor og Bo sejler over. De vejer 90 kg tilsammen.'],
        [['dreng'], 'Bo sejler tilbage. Han er den letteste.'],
        [['pige', 'dreng'], 'Ida og Bo sejler over sammen. De vejer 70 kg.'],
        [['dreng'], 'Bo sejler tilbage igen.'],
        [['far'], 'Far sejler over alene. Han vejer 90 kg, så ingen andre kan komme med.'],
        [['pige'], 'Ida sejler tilbage og henter Bo.'],
        [['pige', 'dreng'], 'Til sidst sejler Ida og Bo over sammen.']
      ] }
  ];
  PUZZLES.forEach(function (p) { if (p.same) { var o = PUZZLES.filter(function (x) { return x.id === p.same; })[0]; ['boat', 'items', 'rules', 'solution'].forEach(function (k) { p[k] = o[k]; }); } });

  function puzzle(id) { return PUZZLES.filter(function (p) { return p.id === id; })[0]; }
  function start(p) { var at = {}; p.items.forEach(function (it) { at[it.id] = 0; }); return { at: at, boat: 0 }; }
  function item(p, id) { return p.items.filter(function (it) { return it.id === id; })[0]; }
  function done(p, s) { return p.items.every(function (it) { return s.at[it.id] === 1; }); }
  // can these sail now? returns null or a reason: 'empty' | 'full' | 'heavy' | 'rower' | 'side'
  function canSail(p, s, ids) {
    if (!ids.length) return 'empty';
    if (ids.some(function (id) { return s.at[id] !== s.boat; })) return 'side';
    if (ids.length > p.boat.cap) return 'full';
    if (p.boat.maxW && weight(p, ids) > p.boat.maxW) return 'heavy';
    if (!ids.some(function (id) { return item(p, id).rows; })) return 'rower';
    return null;
  }
  function weight(p, ids) { return ids.reduce(function (a, id) { return a + (item(p, id).w || 0); }, 0); }
  function sail(p, s, ids) { var at = {}; for (var k in s.at) at[k] = s.at[k]; ids.forEach(function (id) { at[id] = 1 - s.boat; }); return { at: at, boat: 1 - s.boat }; }
  // which rule breaks in this state, or null
  function broken(p, s) {
    for (var i = 0; i < p.rules.length; i++) {
      var r = p.rules[i];
      for (var bank = 0; bank < 2; bank++) {
        var here = p.items.filter(function (it) { return s.at[it.id] === bank; }), has = function (id) { return here.some(function (it) { return it.id === id; }); };
        if (r.k === 'eats' && has(r.a) && has(r.b) && !has(r.guard)) return r;
        if (r.k === 'outnumber') {
          var prey = here.filter(function (it) { return it.type === r.prey; }).length, pred = here.filter(function (it) { return it.type === r.pred; }).length;
          if (prey > 0 && pred > prey) return r;
        }
      }
    }
    return null;
  }
  function key(p, s) { // items of the same type are alike, so count them
    var types = {}; p.items.forEach(function (it) { types[it.type] = (types[it.type] || 0) + s.at[it.id]; });
    return s.boat + ':' + Object.keys(types).sort().map(function (t) { return t + types[t]; }).join(',');
  }
  function subsets(list, max) {
    var out = [];
    (function rec(i, cur) { if (cur.length) out.push(cur.slice()); if (cur.length === max) return; for (var j = i; j < list.length; j++) { cur.push(list[j]); rec(j + 1, cur); cur.pop(); } })(0, []);
    return out;
  }
  // fewest trips from s to the goal: { n, path:[ids…] } or null
  function bfs(p, s0) {
    var q = [{ s: s0, path: [] }], seen = {}; seen[key(p, s0)] = 1;
    while (q.length) {
      var cur = q.shift();
      if (done(p, cur.s)) return { n: cur.path.length, path: cur.path };
      var here = p.items.filter(function (it) { return cur.s.at[it.id] === cur.s.boat; }).map(function (it) { return it.id; });
      var subs = subsets(here, p.boat.cap);
      for (var i = 0; i < subs.length; i++) {
        if (canSail(p, cur.s, subs[i])) continue;
        var ns = sail(p, cur.s, subs[i]);
        if (broken(p, ns)) continue;
        var k = key(p, ns); if (seen[k]) continue; seen[k] = 1;
        q.push({ s: ns, path: cur.path.concat([subs[i]]) });
      }
    }
    return null;
  }
  function best(p) { return bfs(p, start(p)).n; }

  var api = { PUZZLES: PUZZLES, puzzle: puzzle, start: start, item: item, done: done, canSail: canSail, weight: weight, sail: sail, broken: broken, bfs: bfs, best: best };
  root.RIVER = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
