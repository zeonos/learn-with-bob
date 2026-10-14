/*
 * Taktslaget – musikteori, indhold og opgavegeneratorer. Ingen DOM; bruges både af spillet og af node-testene.
 * Danske tonenavne: c d e f g a h (h, ikke b). c1 (enstreget c, MIDI 60) er c'et midt på klaveret, a1 = 440 Hz.
 * Alt dansk indhold (navne på noder, instrumenter, intervaller, akkorder og spørgsmål om bandet) står her.
 * Tjekkes med node tools/test-taktslaget.js.
 */
(function (root) {
  'use strict';

  /* ================= 1. Toner ================= */
  var LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'h'];
  var NAT_PC = [0, 2, 4, 5, 7, 9, 11];
  var CHROMA = ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'ais', 'h']; // kun med kryds, så der aldrig står »b«
  function pc(m) { return ((m % 12) + 12) % 12; }
  function isNatural(m) { return NAT_PC.indexOf(pc(m)) >= 0; }
  function name(m) { return CHROMA[pc(m)]; }
  function octave(m) { return Math.floor(m / 12) - 4; } // dansk oktav: c1 = 60 → 1, lille oktav → 0
  function fullName(m) { var o = octave(m), n = name(m); return o >= 1 ? n + o : o === 0 ? n : n.charAt(0).toUpperCase() + n.slice(1); }
  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function diatonic(m) { return isNatural(m) ? octave(m) * 7 + NAT_PC.indexOf(pc(m)) : null; }
  function fromDiatonic(d) { var o = Math.floor(d / 7); return (o + 4) * 12 + NAT_PC[d - o * 7]; }
  // Plads i nodesystemet med G-nøgle: 0 = nederste linje (e1), 1 = første mellemrum (f1) … 8 = øverste linje (f2)
  function staffPos(m) { return diatonic(m) - diatonic(64); }
  function onLine(pos) { return ((pos % 2) + 2) % 2 === 0; }
  function ledgers(pos) { var out = [], p; for (p = -2; p >= pos; p -= 2) out.push(p); for (p = 10; p <= pos; p += 2) out.push(p); return out; }
  function naturals(lo, hi) { var out = []; for (var m = lo; m <= hi; m++) if (isNatural(m)) out.push(m); return out; }

  var INTERVALS = ['prim', 'sekund', 'terts', 'kvart', 'kvint', 'sekst', 'septim', 'oktav'];
  function intervalNumber(a, b) { return Math.abs(diatonic(b) - diatonic(a)) + 1; }
  function intervalName(a, b) { return INTERVALS[intervalNumber(a, b) - 1]; }
  function thirdQuality(a, b) { var s = Math.abs(b - a); return s === 4 ? 'stor' : s === 3 ? 'lille' : null; }
  function triad(root, type) { return [root, root + (type === 'dur' ? 4 : 3), root + 7]; }
  var CHORDS = [
    { id: 'C', root: 60, type: 'dur', name: 'C-dur' }, { id: 'F', root: 65, type: 'dur', name: 'F-dur' }, { id: 'G', root: 67, type: 'dur', name: 'G-dur' },
    { id: 'Am', root: 69, type: 'mol', name: 'a-mol' }, { id: 'Dm', root: 62, type: 'mol', name: 'd-mol' }, { id: 'Em', root: 64, type: 'mol', name: 'e-mol' }
  ];
  function chord(id) { return CHORDS.filter(function (c) { return c.id === id; })[0]; }
  function chordNotes(id) { var c = chord(id); return triad(c.root, c.type); }
  function chordLabel(id) { var c = chord(id); return c.name + ' (' + c.id + ')'; }
  var MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1];
  function majorScale(root) { var out = [root]; MAJOR_STEPS.forEach(function (s) { out.push(out[out.length - 1] + s); }); return out; }
  var C_DUR = majorScale(60);
  function seq(ms) { return ms.map(name).join(' – '); }

  /* ================= 2. Nodeværdier ================= */
  // u = varighed i sekstendedele. I 4/4, 3/4 og 2/4 er et slag en fjerdedel (4 sekstendedele).
  var DUR = {
    hel: { u: 16, name: 'helnode' }, halv: { u: 8, name: 'halvnode' }, fjerdedel: { u: 4, name: 'fjerdedelsnode' },
    ottendedel: { u: 2, name: 'ottendedelsnode' }, sekstendedel: { u: 1, name: 'sekstendedelsnode' },
    phalv: { u: 12, dot: true, name: 'punkteret halvnode' }, pfjerdedel: { u: 6, dot: true, name: 'punkteret fjerdedelsnode' },
    rhel: { u: 16, rest: true, name: 'helnodepause' }, rhalv: { u: 8, rest: true, name: 'halvnodepause' },
    rfjerdedel: { u: 4, rest: true, name: 'fjerdedelspause' }, rottendedel: { u: 2, rest: true, name: 'ottendedelspause' }
  };
  var TIME = { '4/4': 16, '3/4': 12, '2/4': 8 };
  function beatsText(u) { // 2 → '½', 6 → '1½'
    var whole = Math.floor(u / 4), rest = u % 4, frac = ['', '¼', '½', '¾'][rest];
    return (whole ? String(whole) : '') + frac || '0';
  }
  function sumU(ids) { return ids.reduce(function (a, id) { return a + DUR[id].u; }, 0); }

  /* ================= 3. Dynamik og instrumenter ================= */
  var DYNAMICS = [
    { sign: 'pp', name: 'pianissimo', meaning: 'meget svagt' }, { sign: 'p', name: 'piano', meaning: 'svagt' },
    { sign: 'f', name: 'forte', meaning: 'kraftigt' }, { sign: 'ff', name: 'fortissimo', meaning: 'meget kraftigt' },
    { sign: '<', name: 'crescendo', meaning: 'gradvist kraftigere' }, { sign: '>', name: 'diminuendo', meaning: 'gradvist svagere' }
  ];
  var FAMILIES = [
    { id: 'streng', name: 'Strengeinstrumenter', def: 'strengeinstrumenterne', how: 'Man stryger, knipser eller slår på strenge.' },
    { id: 'blaes', name: 'Blæseinstrumenter', def: 'blæseinstrumenterne', how: 'Man blæser luft ind i instrumentet.' },
    { id: 'slag', name: 'Slagtøj', def: 'slagtøjet', how: 'Man slår, ryster eller skraber på instrumentet.' },
    { id: 'tangent', name: 'Tangentinstrumenter', def: 'tangentinstrumenterne', how: 'Man trykker på tangenter.' }
  ];
  var WIND = { trae: 'træblæser', messing: 'messingblæser' };
  // look: instrumenter, der ligner hinanden på tegningen, blandes ikke i billedopgaver. size: større = dybere (inden for samme look).
  var INSTRUMENTS = [
    { id: 'violin', name: 'violin', fam: 'streng', look: 'bue', size: 1, desc: 'Den har fire strenge og spilles med en bue. Man holder den under hagen.' },
    { id: 'cello', name: 'cello', fam: 'streng', look: 'bue', size: 2, desc: 'Den har fire strenge og spilles med en bue. Man sidder ned og holder den mellem knæene.' },
    { id: 'kontrabas', name: 'kontrabas', fam: 'streng', look: 'bue', size: 3, desc: 'Det største og dybeste strygeinstrument. Man står op eller sidder på en høj stol, når man spiller.' },
    { id: 'guitar', name: 'guitar', fam: 'streng', look: 'guitar', size: 1, desc: 'Den har seks strenge og et rundt lydhul. Man knipser eller slår på strengene med fingrene.' },
    { id: 'elguitar', name: 'elguitar', fam: 'streng', look: 'guitar', size: 1, desc: 'Den har seks strenge og skal sluttes til en forstærker for at lyde rigtig kraftigt.' },
    { id: 'elbas', name: 'elbas', fam: 'streng', look: 'guitar', size: 2, desc: 'Den har som regel fire tykke strenge og spiller de dybe toner i et band.' },
    { id: 'tvaerfloejte', name: 'tværfløjte', fam: 'blaes', wind: 'trae', look: 'pibe', desc: 'Man holder den ud til siden og blæser hen over et hul. Den er af metal, men hører til træblæserne.' },
    { id: 'blokfloejte', name: 'blokfløjte', fam: 'blaes', wind: 'trae', look: 'pibe', desc: 'Man holder den lige ud foran sig og dækker hullerne med fingrene. Mange lærer at spille på den i skolen.' },
    { id: 'klarinet', name: 'klarinet', fam: 'blaes', wind: 'trae', look: 'pibe', desc: 'Den er sort og har et rørblad i mundstykket, som sitrer, når man blæser.' },
    { id: 'saxofon', name: 'saxofon', fam: 'blaes', wind: 'trae', look: 'sax', desc: 'Den er af metal og bøjet som et stort J. Den har et rørblad, så den hører til træblæserne.' },
    { id: 'trompet', name: 'trompet', fam: 'blaes', wind: 'messing', look: 'messing', size: 1, desc: 'Den har tre ventiler, som man trykker på. Man summer med læberne i mundstykket.' },
    { id: 'basun', name: 'basun', fam: 'blaes', wind: 'messing', look: 'messing', size: 2, desc: 'Den har et træk i stedet for ventiler. Man skubber trækket frem og tilbage for at skifte tone.' },
    { id: 'tuba', name: 'tuba', fam: 'blaes', wind: 'messing', look: 'messing', size: 3, desc: 'Det største og dybeste messinginstrument. Man holder den foran sig med tragten opad.' },
    { id: 'trommesaet', et: true, name: 'trommesæt', fam: 'slag', look: 'tromme', desc: 'Det består af flere trommer og bækkener. Man spiller med stikker og en fodpedal.' },
    { id: 'xylofon', name: 'xylofon', fam: 'slag', look: 'xylofon', desc: 'Den har stave af træ i forskellige længder. Man slår på dem med køller og kan spille melodier.' },
    { id: 'baekken', et: true, name: 'bækken', fam: 'slag', look: 'baekken', desc: 'En rund plade af metal. Man slår på den med en stik, eller man slår to sammen.' },
    { id: 'klaver', et: true, name: 'klaver', fam: 'tangent', look: 'klaver', desc: 'Det har 88 tangenter. Når man trykker på en tangent, slår en lille hammer på en streng indeni.' },
    { id: 'keyboard', et: true, name: 'keyboard', fam: 'tangent', look: 'klaver', desc: 'Det har tangenter ligesom et klaver, men lyden laves elektronisk. Det kan lyde som mange forskellige instrumenter.' }
  ];
  function instrument(id) { return INSTRUMENTS.filter(function (x) { return x.id === id; })[0]; }
  function family(id) { return FAMILIES.filter(function (x) { return x.id === id; })[0]; }
  // [spørgsmål, rigtigt svar, [forkerte], forklaring]
  var BAND_QUIZ = [
    ['Hvem holder takten i et band?', 'Trommeslageren', ['Sangeren', 'Guitaristen'], 'Trommeslageren holder takten, så alle i bandet kan spille sammen.'],
    ['Hvilket instrument spiller de dybe toner i et band?', 'Elbassen', ['Elguitaren', 'Bækkenet'], 'Elbassen spiller de dybe toner og hjælper trommerne med at holde rytmen.'],
    ['Hvad skal en elguitar sluttes til for at lyde kraftigt?', 'En forstærker', ['En bue', 'Et mundstykke'], 'En elguitar laver kun en svag lyd selv. Forstærkeren gør lyden kraftig.'],
    ['Hvilke instrumenter kan spille flere toner på én gang?', 'Guitar og klaver', ['Trompet og tværfløjte', 'Lilletromme og bækken'], 'Flere toner på én gang kaldes en akkord. En trompet eller en fløjte spiller kun én tone ad gangen.'],
    ['Hvordan får man lyd i en trompet?', 'Man summer med læberne i mundstykket', ['Man stryger med en bue', 'Man slår på den med køller'], 'Læberne sitrer i mundstykket, og trompeten gør lyden kraftig.'],
    ['Hvorfor kan en tuba spille dybere end en trompet?', 'Den er større og har et længere rør', ['Den er lavet af træ', 'Den har flere strenge'], 'Jo længere rør eller streng et instrument har, jo dybere toner kan det spille.'],
    ['Hvad bruger man til at spille på en violin?', 'En bue', ['Et mundstykke', 'En fodpedal'], 'Buen har hår, som man stryger hen over strengene.'],
    ['Hvordan spiller man en melodi på en xylofon?', 'Man slår på stave af forskellig længde', ['Man blæser i den', 'Man trykker på tangenter'], 'Korte stave giver høje toner, og lange stave giver dybe toner.'],
    ['Hvilken streng giver den højeste tone?', 'En kort og tynd streng', ['En lang og tyk streng', 'De giver den samme tone'], 'Korte og tynde strenge svinger hurtigt og giver høje toner.'],
    ['Hvad hedder pladerne af metal på et trommesæt?', 'Bækkener', ['Tangenter', 'Ventiler'], 'Bækkener er runde plader af metal. Trommeslageren slår på dem med stikkerne.']
  ];

  /* ================= 4. Ruter ================= */
  var ROUTES = [
    { id: 'm-takt', b: 'M', kind: 'beat', name: 'Hold takten', desc: 'Tryk med på slaget, også når bandet holder pause', musician: 'trommesaet' },
    { id: 'm-rytme', b: 'M', kind: 'rhythm', name: 'Rytmeboksen', desc: 'Lyt til rytmen, og tryk den efter', musician: 'xylofon' },
    { id: 'm-noder', b: 'M', kind: 'values', name: 'Nodeværdier', desc: 'Hvor mange slag varer noden?', musician: 'elbas' },
    { id: 'm-nodejagt', b: 'M', kind: 'notes', name: 'Nodejagten', desc: 'Find tonen på klaveret', musician: 'klaver' },
    { id: 'm-hoejdyb', b: 'M', kind: 'pitch', name: 'Højt eller dybt', desc: 'Høje og dybe toner, forte og piano', musician: 'tvaerfloejte' },
    { id: 'm-instr', b: 'M', kind: 'instr', name: 'Instru­menterne', desc: 'Instrumentfamilier og bandets instrumenter', musician: 'elguitar' },
    { id: 'u-rytme', b: 'U', kind: 'rhythm', name: 'Rytmeboksen', desc: 'Synkoper, punkterede noder og pauser', musician: 'saxofon' },
    { id: 'u-noder', b: 'U', kind: 'values', name: 'Takter og taktarter', desc: '4/4, 3/4 og 2/4 med punkterede noder', musician: 'trompet' },
    { id: 'u-nodejagt', b: 'U', kind: 'notes', name: 'Nodejagten', desc: 'Toner med hjælpelinjer', musician: 'violin' },
    { id: 'u-akkord', b: 'U', kind: 'chords', name: 'Akkord\u00ADværkstedet', desc: 'Byg akkorder, og hør dur og mol', musician: 'keyboard' },
    { id: 'u-interval', b: 'U', kind: 'intervals', name: 'Intervaller', desc: 'Fra prim til oktav, stor og lille terts', musician: 'cello' },
    { id: 'u-cdur', b: 'U', kind: 'scale', name: 'C-dur og melodier', desc: 'C-dur-skalaen, og læs en kort melodi', musician: 'basun' }
  ];
  function route(id) { return ROUTES.filter(function (r) { return r.id === id; })[0]; }

  /* ================= 5. Hjælpere ================= */
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  // the answer plus n-1 different wrong options, shuffled
  function options(answer, pool, n) {
    var wrong = shuffle(pool.filter(function (x, i) { return x !== answer && pool.indexOf(x) === i; })).slice(0, n - 1);
    return shuffle([answer].concat(wrong));
  }

  /* ================= 6. Takter og rytmer ================= */
  function fits(id, pos, left, total) {
    var d = DUR[id], u = d.u;
    if (u > left) return false;
    if (id === 'hel' || id === 'rhel' || id === 'phalv') return pos === 0;
    if (id === 'halv' || id === 'rhalv') return total === 16 ? pos % 8 === 0 : pos % 4 === 0;
    if (u >= 4) return pos % 4 === 0;
    if (u === 2) return pos % 2 === 0;
    return true;
  }
  // A bar that adds up exactly to the time signature (every value starts where it can be read easily)
  function genBar(ts, band, minItems) {
    var total = TIME[ts], ids = band === 'M' ? ['hel', 'halv', 'fjerdedel', 'ottendedel', 'rfjerdedel'] : ['halv', 'fjerdedel', 'ottendedel', 'sekstendedel', 'phalv', 'pfjerdedel', 'rhalv', 'rfjerdedel', 'rottendedel'];
    var weight = { hel: 1, halv: 3, fjerdedel: 5, ottendedel: 4, sekstendedel: 1, phalv: 1, pfjerdedel: 2, rhalv: 1, rfjerdedel: 2, rottendedel: 1 };
    for (var tries = 0; tries < 200; tries++) {
      var bar = [], pos = 0, lastRest = false;
      while (pos < total) {
        var ok = ids.filter(function (id) { return fits(id, pos, total - pos, total) && !(lastRest && DUR[id].rest); });
        if (pos % 2) ok = ok.filter(function (id) { return DUR[id].u === 1; }); // finish the beat after a sixteenth
        if (!ok.length) ok = ['sekstendedel'];
        var bag = []; ok.forEach(function (id) { for (var k = 0; k < weight[id]; k++) bag.push(id); });
        var id = pick(bag);
        if (id === 'sekstendedel' && pos % 2 === 0 && total - pos >= 2) { bar.push(id, id); pos += 2; lastRest = false; continue; }
        bar.push(id); pos += DUR[id].u; lastRest = !!DUR[id].rest;
      }
      var notes = bar.filter(function (id) { return !DUR[id].rest; }).length;
      if (bar.length >= (minItems || 2) && bar.length <= 8 && notes >= 2 && sumU(bar) === total) return bar;
    }
    return ts === '4/4' ? ['fjerdedel', 'fjerdedel', 'halv'] : ts === '3/4' ? ['fjerdedel', 'fjerdedel', 'fjerdedel'] : ['fjerdedel', 'fjerdedel'];
  }
  // Rhythm patterns are built from one- to three-beat blocks, like the ones children clap in school.
  var BLOCKS = {
    q: { beats: 1, ids: ['fjerdedel'] }, ee: { beats: 1, ids: ['ottendedel', 'ottendedel'] }, h: { beats: 2, ids: ['halv'], on: [0, 2] },
    r: { beats: 1, ids: ['rfjerdedel'] }, de: { beats: 2, ids: ['pfjerdedel', 'ottendedel'], on: [0, 2] },
    syn: { beats: 2, ids: ['ottendedel', 'fjerdedel', 'ottendedel'], on: [0, 2] }, re: { beats: 1, ids: ['rottendedel', 'ottendedel'] }, dh: { beats: 3, ids: ['phalv'], on: [0] }
  };
  function rhythmBlocks(band, level) {
    if (band === 'M') return level === 0 ? ['q', 'q', 'h'] : level === 1 ? ['q', 'ee', 'h', 'q', 'ee'] : ['q', 'ee', 'h', 'r', 'ee'];
    return level === 0 ? ['q', 'ee', 'de', 'r', 'h'] : ['q', 'ee', 'de', 'syn', 're', 'dh', 'r'];
  }
  function genRhythm(band, level, bars) {
    bars = bars || 1;
    for (var tries = 0; tries < 300; tries++) {
      var ids = [], blocks = [], rests = 0;
      for (var b = 0; b < bars; b++) {
        var beat = 0;
        while (beat < 4) {
          var ok = rhythmBlocks(band, level).filter(function (k) { var bl = BLOCKS[k]; return beat + bl.beats <= 4 && (!bl.on || bl.on.indexOf(beat) >= 0) && !(beat === 0 && b === 0 && /^r/.test(k)); });
          var k = pick(ok);
          blocks.push(k); ids = ids.concat(BLOCKS[k].ids); beat += BLOCKS[k].beats;
          if (/^r/.test(k)) rests++;
        }
      }
      var on = onsets(ids);
      if (on.length < 3 * bars || rests > bars) continue;
      if (level > 0 && blocks.every(function (k) { return k === 'q'; })) continue;
      if (sumU(ids) !== 16 * bars) continue;
      return { ids: ids, onsets: on, bars: bars, minGap: minGap(on) };
    }
    return { ids: ['fjerdedel', 'fjerdedel', 'halv'], onsets: [0, 1, 2], bars: 1, minGap: 1 };
  }
  function onsets(ids) { var out = [], pos = 0; ids.forEach(function (id) { if (!DUR[id].rest) out.push(pos / 4); pos += DUR[id].u; }); return out; }
  function minGap(on) { var g = 4; for (var i = 1; i < on.length; i++) g = Math.min(g, on[i] - on[i - 1]); return g; }

  /* ================= 7. Rytmebedømmelse ================= */
  // Margin (ms) on each side of a beat. Generous, but always less than half the shortest gap, so taps can't be mixed up.
  function margin(beatMs, minGapBeats) { return Math.round(Math.min(200, Math.max(90, beatMs * (minGapBeats || 1) * 0.45))); }
  // expected and taps are absolute times in ms (performance.now()). offset = the player's calibrated delay; it is subtracted from every tap.
  function judgeRhythm(expected, taps, o) {
    o = o || {};
    var m = o.margin || 150, off = o.offset || 0, allowMiss = o.allowMiss || 0, allowExtra = o.allowExtra || 0;
    // only taps inside the listening window count (o.from / o.to, after the offset is subtracted)
    var t = taps.map(function (x) { return x - off; }).filter(function (x) { return (o.from === undefined || x >= o.from) && (o.to === undefined || x <= o.to); })
      .sort(function (a, b) { return a - b; }), used = t.map(function () { return false; });
    var hits = 0, errs = [], matched = [];
    expected.forEach(function (e) {
      var best = -1;
      for (var i = 0; i < t.length; i++) if (!used[i] && Math.abs(t[i] - e) <= m && (best < 0 || Math.abs(t[i] - e) < Math.abs(t[best] - e))) best = i;
      if (best >= 0) { used[best] = true; hits++; errs.push(t[best] - e); matched.push(true); } else matched.push(false);
    });
    // a second tap right after a hit (a bouncy finger) does not count as extra
    var extra = 0;
    t.forEach(function (x, i) {
      if (used[i]) return;
      var bounce = t.some(function (y, j) { return used[j] && x > y && x - y < 90; });
      if (!bounce) extra++;
    });
    var miss = expected.length - hits, mean = errs.length ? errs.reduce(function (a, b) { return a + b; }, 0) / errs.length : 0;
    return { ok: miss <= allowMiss && extra <= allowExtra, hits: hits, miss: miss, extra: extra, mean: Math.round(mean), errs: errs, matched: matched };
  }
  // Calibration: the median distance from each tap to its nearest beat. null if there were too few useful taps.
  function calibrate(beats, taps, beatMs) {
    var d = [];
    taps.forEach(function (x) {
      var best = null;
      beats.forEach(function (b) { if (best === null || Math.abs(x - b) < Math.abs(best)) best = x - b; });
      if (best !== null && Math.abs(best) < beatMs * 0.4) d.push(best);
    });
    if (d.length < 4) return null;
    d.sort(function (a, b) { return a - b; });
    var med = d.length % 2 ? d[(d.length - 1) / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2;
    return Math.round(Math.max(-150, Math.min(300, med)));
  }

  /* ================= 8. Komponisten: delekode ================= */
  // TAKT1:<tempo>-<stortromme>-<lilletromme>-<hihat>-<melodi>-<tjek>
  // tromme-rækker: 16 trin som 4 hex-cifre (trin 1 = højeste bit); melodi: 16 cifre 0–8 (0 = ingen tone, 1–8 = c1 … c2)
  var SEQ = { steps: 16, rows: ['kick', 'snare', 'hat'], tempoMin: 60, tempoMax: 160, melody: [60, 62, 64, 65, 67, 69, 71, 72] };
  function check36(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x + s.charCodeAt(i) * (i + 1)) % 36; return x.toString(36).toUpperCase(); }
  function bits(arr) { var n = 0; for (var i = 0; i < 16; i++) if (arr[i]) n |= 1 << (15 - i); return ('0000' + n.toString(16).toUpperCase()).slice(-4); }
  function unbits(hx) { var n = parseInt(hx, 16), out = []; for (var i = 0; i < 16; i++) out.push(!!(n & (1 << (15 - i)))); return out; }
  function blankSong() { return { tempo: 100, kick: unbits('0000'), snare: unbits('0000'), hat: unbits('0000'), mel: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }; }
  function validSong(s) {
    return !!s && typeof s.tempo === 'number' && s.tempo >= SEQ.tempoMin && s.tempo <= SEQ.tempoMax && s.tempo % 1 === 0 &&
      SEQ.rows.every(function (r) { return Array.isArray(s[r]) && s[r].length === 16; }) &&
      Array.isArray(s.mel) && s.mel.length === 16 && s.mel.every(function (v) { return v % 1 === 0 && v >= 0 && v <= 8; });
  }
  function encodeSong(s) {
    var body = s.tempo + '-' + bits(s.kick) + '-' + bits(s.snare) + '-' + bits(s.hat) + '-' + s.mel.join('');
    return 'TAKT1:' + body + '-' + check36(body);
  }
  function decodeSong(code) {
    var c = String(code || '').replace(/\s+/g, '').toUpperCase();
    var m = /^TAKT1:(\d{2,3})-([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-F]{4})-([0-8]{16})-([0-9A-Z])$/.exec(c);
    if (!m) return null;
    var body = m[1] + '-' + m[2] + '-' + m[3] + '-' + m[4] + '-' + m[5];
    if (check36(body) !== m[6]) return null;
    var s = { tempo: parseInt(m[1], 10), kick: unbits(m[2]), snare: unbits(m[3]), hat: unbits(m[4]), mel: m[5].split('').map(Number) };
    return validSong(s) ? s : null;
  }
  // Examples: »Mester Jakob« is a traditional tune (public domain); »Bobs beat« is written for the game.
  var PRESETS = [
    { id: 'jakob', name: 'Mester Jakob', code: { tempo: 70, kick: '8888', snare: '2222', hat: '0000', mel: '1231123134503450' } },
    { id: 'bob', name: 'Bobs beat', code: { tempo: 100, kick: '8888', snare: '2222', hat: 'FFFF', mel: '1030503040605030' } },
    { id: 'rock', name: 'Rocktrommer', code: { tempo: 120, kick: '88A8', snare: '2222', hat: 'AAAA', mel: '0000000000000000' } }
  ];
  function preset(id) { var p = PRESETS.filter(function (x) { return x.id === id; })[0].code; return { tempo: p.tempo, kick: unbits(p.kick), snare: unbits(p.snare), hat: unbits(p.hat), mel: p.mel.split('').map(Number) }; }

  /* ================= 9. Opgavegeneratorer ================= */
  // Every task: { kind, answer (string), options (strings) or keys, + what is needed to show it }. Answers are recomputed independently in the tests.
  var M_RANGE = naturals(60, 72), U_RANGE = naturals(57, 84), LOW_HIGH = naturals(55, 79);
  var gen = {
    /* --- rhythm --- */
    beat: function (band, i) {
      var tempos = [72, 80, 88, 96, 76, 84, 92, 100];
      return { kind: 'beat', bpm: tempos[i % tempos.length] + rnd(3) * 2, beats: 8, stopAt: i < 4 ? 8 : 4, answer: 'ok' };
    },
    rhythm: function (band, i) {
      var level = band === 'M' ? (i < 2 ? 0 : i < 5 ? 1 : 2) : (i < 3 ? 0 : 1), bars = band === 'U' && i >= 5 ? 2 : 1;
      var r = genRhythm(band, level, bars);
      return { kind: 'rhythm', ids: r.ids, onsets: r.onsets, bars: r.bars, minGap: r.minGap, bpm: band === 'M' ? 76 + rnd(3) * 4 : 84 + rnd(4) * 4, answer: 'ok' };
    },
    /* --- note values --- */
    valueBeats: function (band) {
      var ids = band === 'M' ? ['hel', 'halv', 'fjerdedel', 'ottendedel', 'rfjerdedel', 'rhalv'] : ['phalv', 'pfjerdedel', 'sekstendedel', 'halv', 'ottendedel', 'rhalv', 'rottendedel'];
      var id = pick(ids), pool = band === 'M' ? ['½', '1', '2', '4'] : ['¼', '½', '1', '1½', '2', '3', '4'];
      return { kind: 'valueBeats', dur: id, answer: beatsText(DUR[id].u), options: options(beatsText(DUR[id].u), pool, 4) };
    },
    valueName: function (band) {
      var ids = band === 'M' ? ['hel', 'halv', 'fjerdedel', 'ottendedel', 'rfjerdedel'] : ['phalv', 'pfjerdedel', 'sekstendedel', 'rhalv', 'rottendedel', 'rfjerdedel'];
      var id = pick(ids), pool = (band === 'M' ? ['hel', 'halv', 'fjerdedel', 'ottendedel', 'rfjerdedel', 'rhalv'] : Object.keys(DUR)).map(function (k) { return DUR[k].name; });
      return { kind: 'valueName', dur: id, answer: DUR[id].name, options: options(DUR[id].name, pool, band === 'M' ? 3 : 4) };
    },
    fill: function (band) {
      var ts = band === 'M' ? '4/4' : pick(['4/4', '3/4', '3/4', '2/4']), bar = genBar(ts, band, 3), miss = rnd(bar.length), id = bar[miss];
      var same = Object.keys(DUR).filter(function (k) { return !!DUR[k].rest === !!DUR[id].rest && (band === 'U' || ['hel', 'halv', 'fjerdedel', 'ottendedel', 'rfjerdedel', 'rhalv', 'rhel'].indexOf(k) >= 0); });
      var byU = {}; same.forEach(function (k) { if (k !== id && DUR[k].u !== DUR[id].u && !byU[DUR[k].u]) byU[DUR[k].u] = k; });
      var wrong = shuffle(Object.keys(byU).map(function (u) { return byU[u]; })).slice(0, 3);
      return { kind: 'fill', ts: ts, bar: bar, miss: miss, answer: id, options: shuffle([id].concat(wrong)) };
    },
    sum: function (band) {
      var n = 2 + rnd(3), ids = [], pool = band === 'M' ? ['halv', 'fjerdedel', 'ottendedel', 'hel'] : ['phalv', 'pfjerdedel', 'halv', 'fjerdedel', 'ottendedel'];
      for (var i = 0; i < n; i++) ids.push(pick(pool));
      var ans = beatsText(sumU(ids)), u = sumU(ids), near = [u - 4, u + 4, u - 2, u + 2, u + 8].filter(function (x) { return x > 0; }).map(beatsText);
      return { kind: 'sum', ids: ids, answer: ans, options: options(ans, near, 3) };
    },
    timeSig: function (band) {
      var ts = pick(['2/4', '3/4', '4/4']), bar = genBar(ts, band, 2);
      return { kind: 'timeSig', bar: bar, answer: ts, options: ['2/4', '3/4', '4/4'] };
    },
    whichBar: function (band) {
      var ts = pick(['4/4', '3/4']), bars = [genBar(ts, band, 3)];
      while (bars.length < 3) {
        var b = genBar(ts, band, 3).slice(), k = rnd(b.length), alt = Object.keys(DUR).filter(function (x) { return !!DUR[x].rest === !!DUR[b[k]].rest && DUR[x].u !== DUR[b[k]].u && DUR[x].u <= 8 && DUR[x].u >= 2; });
        b[k] = pick(alt);
        if (sumU(b) !== TIME[ts]) bars.push(b);
      }
      var order = shuffle([0, 1, 2]);
      return { kind: 'whichBar', ts: ts, bars: order.map(function (i) { return bars[i]; }), answer: String(order.indexOf(0)), options: ['0', '1', '2'] };
    },
    /* --- reading notes --- */
    noteKey: function () { var m = pick(M_RANGE); return { kind: 'noteKey', m: m, answer: String(m), keys: M_RANGE.map(String) }; },
    noteName: function () { var m = pick(U_RANGE); return { kind: 'noteName', m: m, answer: name(m), keys: LETTERS.slice() }; },
    noteFind: function (band) {
      var range = band === 'M' ? M_RANGE : U_RANGE, notes = [];
      shuffle(range).forEach(function (m) { if (notes.length < 3 && notes.every(function (x) { return name(x) !== name(m); })) notes.push(m); });
      var k = rnd(3);
      return { kind: 'noteFind', letter: name(notes[k]), notes: notes, answer: String(k), options: ['0', '1', '2'] };
    },
    /* --- high and low, loud and quiet --- */
    higher: function () {
      var a = pick(LOW_HIGH), b = a;
      if (rnd(6)) while (Math.abs(staffPos(b) - staffPos(a)) < 2) b = pick(LOW_HIGH);
      return { kind: 'higher', notes: [a, b], answer: a === b ? 'same' : b > a ? 'second' : 'first', options: ['first', 'second', 'same'] };
    },
    step: function () {
      var big = rnd(2) === 1, a = pick(naturals(60, 72)), d = big ? 4 + rnd(4) : 1, up = rnd(2) === 1, b = fromDiatonic(diatonic(a) + (up ? d : -d));
      if (b < 57 || b > 81) b = fromDiatonic(diatonic(a) + (up ? -d : d)); // keep it near the staff
      return { kind: 'step', notes: [a, b], answer: big ? 'big' : 'small', options: ['small', 'big'] };
    },
    direction: function () {
      var dir = pick(['up', 'down', 'same']), start = pick(naturals(60, 67)), d = diatonic(start), notes = [];
      if (dir === 'down') d += 4;
      for (var i = 0; i < 4; i++) { notes.push(fromDiatonic(d)); if (dir !== 'same') d += (dir === 'up' ? 1 : -1) * (1 + (rnd(3) === 0 ? 1 : 0)); }
      return { kind: 'direction', notes: notes, answer: dir, options: ['up', 'down', 'same'] };
    },
    dyn: function () {
      var loudFirst = rnd(2) === 1, notes = shuffle(naturals(60, 72)).slice(0, 3).sort(function (a, b) { return a - b; });
      return { kind: 'dyn', notes: notes, levels: loudFirst ? ['f', 'p'] : ['p', 'f'], answer: loudFirst ? 'first' : 'second', options: ['first', 'second'] };
    },
    dynSign: function () {
      var d = pick(DYNAMICS);
      return { kind: 'dynSign', sign: d.sign, answer: d.meaning, options: options(d.meaning, DYNAMICS.map(function (x) { return x.meaning; }), 3) };
    },
    /* --- instruments --- */
    instrPic: function () {
      var x = pick(INSTRUMENTS), pool = INSTRUMENTS.filter(function (y) { return y.look !== x.look; }).map(function (y) { return y.name; });
      return { kind: 'instrPic', inst: x.id, answer: x.name, options: options(x.name, pool, 3) };
    },
    instrFamily: function () {
      var x = pick(INSTRUMENTS);
      return { kind: 'instrFamily', inst: x.id, answer: family(x.fam).name, options: FAMILIES.map(function (f) { return f.name; }) };
    },
    instrDesc: function () {
      var x = pick(INSTRUMENTS), pool = INSTRUMENTS.filter(function (y) { return y.fam !== x.fam || y.look !== x.look; }).map(function (y) { return y.name; });
      return { kind: 'instrDesc', inst: x.id, answer: x.name, options: options(x.name, pool, 3) };
    },
    instrLow: function () {
      var look = pick(['bue', 'messing', 'guitar']), set = INSTRUMENTS.filter(function (y) { return y.look === look && y.size; });
      if (look === 'guitar') set = set.filter(function (y) { return y.id !== 'elguitar'; });
      var low = set.reduce(function (a, b) { return b.size > a.size ? b : a; });
      return { kind: 'instrLow', insts: shuffle(set.map(function (y) { return y.id; })), answer: low.name, options: shuffle(set.map(function (y) { return y.name; })) };
    },
    windType: function () {
      var x = pick(INSTRUMENTS.filter(function (y) { return y.wind; }));
      return { kind: 'windType', inst: x.id, answer: WIND[x.wind], options: [WIND.trae, WIND.messing] };
    },
    bandQuiz: function () {
      var q = pick(BAND_QUIZ);
      return { kind: 'bandQuiz', q: q[0], answer: q[1], options: shuffle([q[1]].concat(q[2])), explain: q[3] };
    },
    /* --- chords --- */
    build: function () { var c = pick(CHORDS); return { kind: 'build', chord: c.id, answer: chordNotes(c.id).map(pc).sort(function (a, b) { return a - b; }).join(','), keys: M_RANGE.map(String) }; },
    chordName: function () { var c = pick(CHORDS); return { kind: 'chordName', chord: c.id, answer: chordLabel(c.id), options: options(chordLabel(c.id), CHORDS.map(function (x) { return chordLabel(x.id); }), 4) }; },
    durmol: function () { var type = pick(['dur', 'mol']), root = 60 + rnd(12); return { kind: 'durmol', notes: triad(root, type), answer: type, options: ['dur', 'mol'] }; },
    chordNotes: function () {
      var c = pick(CHORDS), right = chordNotes(c.id), wrong = [];
      for (var k = 0; k < 40 && wrong.length < 2; k++) {
        var w = right.slice(), j = 1 + rnd(2), d = diatonic(w[j]) + (rnd(2) ? 1 : -1);
        w[j] = fromDiatonic(d);
        var s = seq(w);
        if (s !== seq(right) && wrong.indexOf(s) < 0) wrong.push(s);
      }
      return { kind: 'chordNotes', chord: c.id, answer: seq(right), options: shuffle([seq(right)].concat(wrong)) };
    },
    /* --- intervals --- */
    intervalName: function () {
      var a = pick(naturals(60, 71)), n = 1 + rnd(7), b = fromDiatonic(diatonic(a) + n), nm = INTERVALS[n];
      var near = INTERVALS.filter(function (x, i) { return Math.abs(i - n) <= 3; });
      return { kind: 'intervalName', notes: [a, b], answer: nm, options: options(nm, near, 4) };
    },
    third: function () { var a = pick(naturals(60, 71)), b = fromDiatonic(diatonic(a) + 2); return { kind: 'third', notes: [a, b], answer: thirdQuality(a, b), options: ['stor', 'lille'] }; },
    semis: function () {
      var a = pick(naturals(60, 71)), n = 1 + rnd(4), b = fromDiatonic(diatonic(a) + n), s = String(b - a);
      return { kind: 'semis', notes: [a, b], answer: s, options: options(s, ['1', '2', '3', '4', '5', '6', '7'], 4) };
    },
    intervalFromName: function () {
      var a = pick(naturals(60, 71)), n = 2 + rnd(6), b = fromDiatonic(diatonic(a) + n), nm = INTERVALS[n];
      return { kind: 'intervalFromName', notes: [a, b], answer: nm, options: options(nm, INTERVALS.slice(1), 4) };
    },
    /* --- C major and melodies --- */
    scaleMissing: function () { var k = 1 + rnd(6), m = C_DUR[k]; return { kind: 'scaleMissing', miss: k, answer: name(m), options: options(name(m), LETTERS, 4) }; },
    degree: function () { var k = rnd(7), m = C_DUR[k]; return { kind: 'degree', n: k + 1, answer: name(m), options: options(name(m), LETTERS, 4) }; },
    halfsteps: function () { var k = rnd(7), a = C_DUR[k], b = C_DUR[k + 1]; return { kind: 'halfsteps', notes: [a, b], answer: b - a === 1 ? 'halv' : 'hel', options: ['hel', 'halv'] }; },
    readMelody: function () {
      var notes = melody(), right = seq(notes), wrong = [];
      for (var k = 0; k < 40 && wrong.length < 2; k++) {
        var w = notes.slice(), j = rnd(w.length); w[j] = fromDiatonic(diatonic(w[j]) + (rnd(2) ? 1 : -1));
        if (w[j] < 60 || w[j] > 72) continue;
        var s = seq(w); if (s !== right && wrong.indexOf(s) < 0) wrong.push(s);
      }
      return { kind: 'readMelody', notes: notes, answer: right, options: shuffle([right].concat(wrong)) };
    },
    hearMelody: function () {
      var a = melody(), list = [a];
      for (var k = 0; k < 60 && list.length < 3; k++) {
        var w = a.slice(), j = 1 + rnd(w.length - 1); w[j] = fromDiatonic(diatonic(w[j]) + (rnd(2) ? 1 : -1) * (1 + rnd(2)));
        if (w[j] < 60 || w[j] > 72) continue;
        if (list.every(function (x) { return seq(x) !== seq(w); })) list.push(w);
      }
      var order = shuffle([0, 1, 2]);
      return { kind: 'hearMelody', melodies: order.map(function (i) { return list[i]; }), answer: String(order.indexOf(0)), options: ['0', '1', '2'] };
    }
  };
  // a short stepwise melody in C major (c1–c2), 4 or 5 notes
  function melody() {
    var n = 4 + rnd(2), d = diatonic(pick(naturals(60, 69))), out = [];
    for (var i = 0; i < n; i++) {
      out.push(fromDiatonic(d));
      var step = pick([-2, -1, -1, 1, 1, 2, 0]);
      if (diatonic(72) < d + step || diatonic(60) > d + step) step = -step;
      d += step;
    }
    return out;
  }

  // Which tasks make up a round of each route kind
  var PLAN = {
    beat: { M: ['beat', 'beat', 'beat', 'beat', 'beat', 'beat', 'beat', 'beat'] },
    rhythm: { M: ['rhythm', 'rhythm', 'rhythm', 'rhythm', 'rhythm', 'rhythm', 'rhythm', 'rhythm'], U: ['rhythm', 'rhythm', 'rhythm', 'rhythm', 'rhythm', 'rhythm', 'rhythm', 'rhythm'] },
    values: { M: ['valueBeats', 'valueName', 'valueBeats', 'sum', 'fill', 'valueName', 'valueBeats', 'fill', 'sum', 'fill'], U: ['valueBeats', 'fill', 'timeSig', 'fill', 'valueBeats', 'whichBar', 'fill', 'timeSig', 'whichBar', 'fill'] },
    notes: { M: ['noteKey', 'noteKey', 'noteKey', 'noteFind', 'noteKey', 'noteKey', 'noteFind', 'noteKey', 'noteKey', 'noteFind'], U: ['noteName', 'noteName', 'noteName', 'noteFind', 'noteName', 'noteName', 'noteName', 'noteFind', 'noteName', 'noteName'] },
    pitch: { M: ['higher', 'higher', 'step', 'dynSign', 'direction', 'higher', 'dyn', 'step', 'direction', 'dynSign'] },
    instr: { M: ['instrPic', 'instrFamily', 'instrPic', 'instrDesc', 'bandQuiz', 'windType', 'instrFamily', 'instrLow', 'instrDesc', 'bandQuiz'] },
    chords: { U: ['chordNotes', 'build', 'durmol', 'chordName', 'build', 'chordNotes', 'durmol', 'chordName', 'build', 'chordNotes'] },
    intervals: { U: ['intervalName', 'semis', 'intervalName', 'third', 'intervalFromName', 'intervalName', 'semis', 'third', 'intervalFromName', 'intervalName'] },
    scale: { U: ['degree', 'scaleMissing', 'halfsteps', 'readMelody', 'hearMelody', 'degree', 'halfsteps', 'scaleMissing', 'readMelody', 'hearMelody'] }
  };
  function taskKey(tk) { var c = {}; for (var k in tk) if (k !== 'options' && k !== 'melodies' && k !== 'bars') c[k] = tk[k]; return JSON.stringify(c); }
  function buildRound(routeId) {
    var r = route(routeId), plan = PLAN[r.kind][r.b], seen = {}, out = [];
    plan.forEach(function (kind, i) {
      var tk;
      for (var k = 0; k < 60; k++) { tk = gen[kind](r.b, i); if (!seen[taskKey(tk)] || kind === 'beat' || kind === 'rhythm') break; }
      seen[taskKey(tk)] = 1; out.push(tk);
    });
    return out;
  }
  // quick tasks for the hub's daily challenge: route kind → generator kinds that need no sound or timing
  var QUICK = { beat: ['valueBeats'], rhythm: ['valueBeats', 'sum'], values: ['valueBeats', 'valueName'], notes: ['noteFind'], pitch: ['dynSign'], instr: ['instrFamily', 'bandQuiz', 'windType'],
    chords: ['chordNotes'], intervals: ['intervalFromName'], scale: ['degree', 'scaleMissing'] };

  var api = {
    LETTERS: LETTERS, CHROMA: CHROMA, INTERVALS: INTERVALS, CHORDS: CHORDS, C_DUR: C_DUR, DUR: DUR, TIME: TIME, DYNAMICS: DYNAMICS, FAMILIES: FAMILIES, WIND: WIND,
    INSTRUMENTS: INSTRUMENTS, BAND_QUIZ: BAND_QUIZ, ROUTES: ROUTES, PLAN: PLAN, QUICK: QUICK, SEQ: SEQ, PRESETS: PRESETS, BLOCKS: BLOCKS,
    pc: pc, isNatural: isNatural, name: name, octave: octave, fullName: fullName, freq: freq, diatonic: diatonic, fromDiatonic: fromDiatonic, staffPos: staffPos, onLine: onLine, ledgers: ledgers, naturals: naturals,
    intervalNumber: intervalNumber, intervalName: intervalName, thirdQuality: thirdQuality, triad: triad, chord: chord, chordNotes: chordNotes, chordLabel: chordLabel, majorScale: majorScale, seq: seq,
    beatsText: beatsText, sumU: sumU, instrument: instrument, family: family, route: route,
    genBar: genBar, genRhythm: genRhythm, onsets: onsets, minGap: minGap, margin: margin, judgeRhythm: judgeRhythm, calibrate: calibrate,
    encodeSong: encodeSong, decodeSong: decodeSong, validSong: validSong, blankSong: blankSong, preset: preset,
    gen: gen, buildRound: buildRound, options: options, shuffle: shuffle, pick: pick
  };
  root.TS_MUSIC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
