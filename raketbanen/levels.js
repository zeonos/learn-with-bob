/*
 * Raketbanen – de 36 håndlavede baner (6 verdener × 6 baner) og en sandkasse-bane med delekode.
 * Alle mål er i meter (rummet: i spillets egne enheder). y går opad. Banen er W bred og 0,6·W høj.
 *
 * På en planet:
 *   terrain: jorden som punkter [x, y] fra x = 0 til x = W
 *   pad:     x for affyringsrampen (raketten starter lidt over jorden)
 *   walls:   mure og huse som [x0, y0, x1, y1]
 *   rocks:   sten som [x, y, radius]
 *   wind:    vandret acceleration i m/s² (+ = mod højre), kun på Mars
 * I rummet:
 *   planets: { x, y, r, gm, name } – gm er, hvor hårdt planeten trækker; name er en nøgle i STR.rb.bodies
 *   home:    den planet, raketten starter på
 * Begge:
 *   station: rumstationen som [x, y, radius] – raketten skal ind i ringen
 *   sol:     et skud, der virker [vinkel, kraft] (»Vis et skud« og »Vis løsningen«; testen tjekker det)
 *   why:     en kort forklaring på, hvorfor skuddet virker (vises i »Vis løsningen« og efter banen)
 * tools/test-raketbanen.js prøver alle vinkler og al kraft på hver bane og tjekker, at banerne kan klares,
 * at de bliver sværere (færre skud rammer), og at hvert »sol« rammer.
 */
(function (root) {
  'use strict';
  var R = root.ROCKET || (typeof require === 'function' ? require('./physics.js') : null);

  // flat ground with a few soft dents (craters) – [x, depth, half width]
  function craters(W, y0, list) {
    var pts = [[0, y0]];
    list.forEach(function (c) { pts.push([c[0] - c[2], y0], [c[0] - c[2] * 0.85, y0 + c[1] * 0.25], [c[0] - c[2] * 0.5, y0 - c[1]], [c[0] + c[2] * 0.5, y0 - c[1]], [c[0] + c[2] * 0.85, y0 + c[1] * 0.25], [c[0] + c[2], y0]); });
    pts.push([W, y0]);
    return pts;
  }

  var worlds = [
    /* ================= JORDEN (mellemtrin) ================= */
    { id: 'jorden', b: 'M', g: 'jorden', W: 120,
      fact: 'På Jorden trækker tyngdekraften med 9,8 m/s². Det er den, vi kender, så Jorden er målestokken for de andre verdener.',
      levels: [
        { terrain: [[0, 4], [120, 4]], pad: 12, station: [86, 12, 7], sol: [45, 54],
          why: 'På flad jord flyver raketten længst, når vinklen er 45°. Så skal kraften bare passe til afstanden.' },
        { terrain: [[0, 4], [32, 4], [46, 13], [62, 13], [76, 4], [120, 4]], pad: 10, station: [100, 15, 5.5], sol: [45, 62],
          why: 'Bakken er lav, så en almindelig bue på 45° går over den. Stationen er langt væk, så kraften skal op.' },
        { terrain: [[0, 4], [70, 4], [78, 24], [106, 24], [112, 4], [120, 4]], pad: 10, station: [92, 31, 5], sol: [45, 68],
          why: 'Stationen står oppe på et bjerg, så raketten skal både langt og højt. En bue på 45° med godt med kraft når derop.' },
        { terrain: [[0, 4], [120, 4]], pad: 12, walls: [[56, 0, 61, 32]], station: [92, 11, 5], sol: [65, 65],
          why: 'Muren er høj, så buen skal være stejl. En vinkel over 45° løfter raketten over muren.' },
        { terrain: [[0, 4], [120, 4]], pad: 10, walls: [[44, 0, 54, 30], [96, 0, 106, 44]], station: [76, 12, 4.5], sol: [60, 56],
          why: 'Stationen ligger mellem to huse. En stejl bue går over det første hus og falder ned, før den rammer det andet.' },
        { terrain: [[0, 4], [120, 4]], pad: 12, walls: [[62, 0, 68, 40]], rocks: [[40, 40, 7]], station: [78, 10, 4.5], sol: [80, 88],
          why: 'Stationen gemmer sig lige bag det høje hus. Raketten skal næsten lodret op og falde ned bag huset – og uden om stenen.' }
      ] },

    /* ================= MÅNEN (mellemtrin) ================= */
    { id: 'maanen', b: 'M', g: 'maanen', W: 240,
      fact: 'Månen trækker kun med 1,6 m/s² – ca. en sjettedel af Jordens tyngdekraft. Derfor flyver alt meget længere.',
      levels: [
        { terrain: craters(240, 8, [[80, 4, 12], [140, 3, 9]]), pad: 20, station: [170, 20, 13], sol: [45, 31],
          why: 'Månen trækker kun 1/6 så meget som Jorden, så raketten flyver meget længere. Derfor skal kraften være lav.' },
        { terrain: [[0, 8], [130, 8], [160, 58], [200, 58], [222, 8], [240, 8]], pad: 16, station: [182, 72, 8], sol: [35, 48],
          why: 'Stationen står på toppen af et bjerg. En flad bue på ca. 35° når derop, fordi Månen trækker så svagt.' },
        { terrain: craters(240, 8, [[170, 22, 30]]), pad: 18, station: [170, 2, 10], sol: [52, 32],
          why: 'Stationen ligger nede i et krater. Raketten skal lande i hullet, så buen må ikke være for lang.' },
        { terrain: craters(240, 8, [[60, 3, 10], [200, 4, 12]]), pad: 18, rocks: [[110, 24, 16]], station: [196, 16, 10], sol: [35, 36],
          why: 'En stor sten ligger midt på vejen. Raketten skal over den, og den svage tyngdekraft bærer den langt – derfor skal kraften stadig være lav.' },
        { terrain: craters(240, 8, [[70, 5, 12], [190, 6, 14]]), pad: 16, rocks: [[110, 62, 16], [110, 14, 14], [168, 40, 8]], station: [205, 22, 8], sol: [20, 46],
          why: 'Raketten kan flyve fladt gennem hullet mellem stenene eller i en høj bue over dem. En flad bue på ca. 20° går lige igennem hullet.' },
        { terrain: [[0, 8], [100, 8], [118, 50], [126, 50], [140, 8], [240, 8]], pad: 18, station: [168, 18, 9], sol: [70, 39],
          why: 'Kraterkanten er høj, og stationen står lige bag den. En stejl bue kommer over kanten og falder ned på den anden side.' }
      ] },

    /* ================= MARS (mellemtrin) ================= */
    { id: 'mars', b: 'M', g: 'mars', W: 200,
      fact: 'Mars trækker med 3,7 m/s² – lidt over en tredjedel af Jordens. Og så blæser det: vinden skubber raketten til siden.',
      levels: [
        { terrain: [[0, 6], [200, 6]], pad: 18, wind: 0.4, station: [150, 18, 10], sol: [45, 44],
          why: 'Vinden blæser samme vej, som raketten flyver, og giver den et lille skub. Så skal kraften være lidt mindre.' },
        { terrain: [[0, 6], [200, 6]], pad: 18, wind: -0.8, station: [165, 16, 8.5], sol: [45, 54],
          why: 'Nu blæser vinden imod. Den bremser raketten, så den skal have mere kraft end uden vind.' },
        { terrain: [[0, 6], [90, 6], [100, 30], [130, 30], [140, 6], [200, 6]], pad: 16, wind: -1.2, station: [126, 40, 6.5], sol: [35, 56],
          why: 'Stærk modvind! Raketten skal op på bjerget, og vinden bremser den hele vejen. Giv den lidt ekstra kraft.' },
        { terrain: [[0, 6], [200, 6]], pad: 16, wind: 0.6, walls: [[90, 0, 98, 52]], station: [160, 16, 8], sol: [70, 49],
          why: 'Muren kræver en stejl bue, og vinden skubber raketten fremad, mens den er i luften.' },
        { terrain: [[0, 6], [200, 6]], pad: 14, wind: 1.0, rocks: [[80, 48, 12], [130, 22, 10]], station: [176, 16, 7], sol: [65, 45],
          why: 'Stenene spærrer for en flad bue. En stejl bue går over dem begge, og medvinden bærer raketten hen til stationen.' },
        { terrain: [[0, 6], [200, 6]], pad: 14, wind: -1.4, walls: [[70, 0, 78, 40], [150, 0, 158, 70]], station: [126, 14, 7], sol: [50, 56],
          why: 'Stærk modvind og to mure. Raketten skal over den første mur og falde ned, før vinden og den høje mur stopper den.' }
      ] },

    /* ================= JUPITER (udskoling) ================= */
    { id: 'jupiter', b: 'U', g: 'jupiter', W: 80,
      fact: 'Jupiter trækker med 24,8 m/s² – ca. 2,5 gange så meget som Jorden. Raketten skal have meget kraft for at komme bare et lille stykke.',
      levels: [
        { terrain: [[0, 3], [80, 3]], pad: 8, station: [64, 7, 4.6], sol: [45, 76],
          why: 'Jupiter trækker 2,5 gange så meget som Jorden, så selv et kort skud kræver meget kraft.' },
        { terrain: [[0, 3], [80, 3]], pad: 56, walls: [[62, 0, 66, 30]], station: [18, 8, 2.3], sol: [135, 64],
          why: 'Stationen er bag raketten. Vinkler over 90° peger bagud – 135° er 45° den anden vej.' },
        { terrain: [[0, 3], [80, 3]], pad: 8, walls: [[36, 0, 40, 22]], station: [62, 7, 3.2], sol: [62, 80],
          why: 'Høj mur og stærk tyngdekraft: buen skal være stejl, og raketten skal have næsten fuld kraft.' },
        { terrain: [[0, 3], [80, 3]], pad: 6, walls: [[30, 0, 34, 26], [60, 0, 64, 34]], station: [47, 7, 3], sol: [70, 81],
          why: 'Stationen står mellem to høje mure. Raketten skal stejlt op og falde lige ned mellem murene.' },
        { terrain: [[0, 3], [44, 3], [50, 20], [80, 20]], pad: 6, walls: [[36, 0, 40, 30]], station: [64, 26, 2.8], sol: [60, 92],
          why: 'Stationen er højt oppe bag en mur. Det kræver både en stejl vinkel og næsten al den kraft, raketten har.' },
        { terrain: [[0, 3], [80, 3]], pad: 6, walls: [[52, 0, 56, 18]], rocks: [[30, 30, 5]], station: [68, 7, 2.8], sol: [65, 91],
          why: 'Raketten kan gå under stenen eller over den. Over stenen er sikrest: en stejl bue med næsten fuld kraft, der falder ned bag muren.' }
      ] },
    /* ================= KREDSLØB (udskoling) ================= */
    { id: 'kredsloeb', b: 'U', space: true, W: 100,
      fact: 'Tyngdekraften fra en planet eller en måne bøjer rakettens bane. Kommer raketten tæt forbi, kan den blive slynget rundt og kastet videre.',
      levels: [
        { planets: [{ x: 12, y: 30, r: 6, gm: 300, name: 'jorden' }, { x: 55, y: 50, r: 3, gm: 150, name: 'maanen' }], home: 0, station: [86, 26, 6], sol: [355, 41],
          why: 'Stationen er næsten lige ud. Jorden trækker raketten tilbage i starten, så den skal have nok kraft til at slippe fri.' },
        { planets: [{ x: 12, y: 30, r: 6, gm: 300, name: 'jorden' }, { x: 50, y: 30, r: 5, gm: 600, name: 'maanen' }], home: 0, station: [88, 30, 5.5], sol: [15, 58],
          why: 'Månen står i vejen. Raketten flyver op over Månen, og Månens tyngdekraft trækker den ned igen mod stationen.' },
        { planets: [{ x: 12, y: 12, r: 6, gm: 300, name: 'jorden' }, { x: 62, y: 32, r: 8, gm: 1600, name: 'jupiter' }], home: 0, station: [86, 52, 4.5], sol: [45, 54],
          why: 'Jupiter står i vejen for den lige vej. Raketten flyver over Jupiter, og Jupiters store tyngdekraft bøjer banen ned mod stationen.' },
        { planets: [{ x: 10, y: 34, r: 5, gm: 250, name: 'jorden' }, { x: 45, y: 16, r: 4, gm: 1200, name: 'maaneA' }, { x: 72, y: 51, r: 4, gm: 1700, name: 'maaneB' }], home: 0, rocks: [[36, 38, 3], [71, 15, 3]], station: [84, 9, 4.5], sol: [306, 50],
          why: 'Raketten flyver ned mod Måne A, som trækker i den og bøjer banen hen mod stationen. Pas på stenene.' },
        { planets: [{ x: 12, y: 30, r: 6, gm: 300, name: 'jorden' }, { x: 48, y: 50, r: 4, gm: 900, name: 'maaneA' }, { x: 52, y: 10, r: 4, gm: 500, name: 'maaneB' }], home: 0, rocks: [[50, 30, 4]], station: [86, 24, 5], sol: [320, 47],
          why: 'En sten spærrer midten. Raketten flyver ned under Måne B, og månens tyngdekraft bøjer banen op mod stationen.' },
        { planets: [{ x: 12, y: 44, r: 6, gm: 300, name: 'jorden' }, { x: 62, y: 40, r: 4, gm: 1500, name: 'maanen' }], home: 0, rocks: [[30, 33, 4], [39, 27, 4], [48, 21, 4], [22, 38, 3], [54, 14, 4], [52, 5, 4]], station: [67, 12, 5.2], sol: [10, 45],
          why: 'Stenene spærrer vejen. Raketten flyver ud til Månen, svinger rundt om den og bliver kastet ned mod stationen.' }
      ] },

    /* ================= SOLSYSTEMET (udskoling) ================= */
    { id: 'solsystemet', b: 'U', space: true, W: 100,
      fact: 'Rumsonder bruger planeternes tyngdekraft til at skifte retning og få mere fart. Det kaldes et gravitationsslyng.',
      levels: [
        { planets: [{ x: 10, y: 40, r: 5, gm: 250, name: 'jorden' }, { x: 50, y: -8, r: 14, gm: 3000, name: 'solen' }, { x: 90, y: 46, r: 4, gm: 200, name: 'mars' }], home: 0, station: [76, 50, 5], sol: [15, 53],
          why: 'Solen trækker alt ned mod sig. Raketten skal sigte højere end stationen, for Solen bøjer banen nedad.' },
        { planets: [{ x: 10, y: 30, r: 5, gm: 250, name: 'jorden' }, { x: 50, y: 30, r: 12, gm: 3500, name: 'solen' }], home: 0, station: [90, 30, 4.5], sol: [26, 76],
          why: 'Solen står lige i vejen. Raketten flyver i en bue uden om Solen, og Solens tyngdekraft fører den om på den anden side.' },
        { planets: [{ x: 10, y: 30, r: 5, gm: 250, name: 'jorden' }, { x: 50, y: 47, r: 7, gm: 1400, name: 'saturn' }, { x: 54, y: 13, r: 9, gm: 2200, name: 'jupiter' }], home: 0, station: [92, 40, 4.5], sol: [6, 98],
          why: 'Raketten skal mellem Saturn og Jupiter. Jupiter trækker mere end Saturn, så raketten skal sigte lidt mod Saturn.' },
        { planets: [{ x: 10, y: 30, r: 5, gm: 250, name: 'jorden' }, { x: 50, y: -10, r: 14, gm: 2500, name: 'solen' }, { x: 92, y: 40, r: 4, gm: 200, name: 'mars' }], home: 0, rocks: [[50, 56, 4], [50, 47, 4], [50, 30, 4], [50, 22, 4]], station: [80, 34, 4.5], sol: [15, 48],
          why: 'Asteroidebæltet har huller. Find et hul, og husk, at Solen trækker raketten nedad, mens den flyver.' },
        { planets: [{ x: 8, y: 50, r: 5, gm: 250, name: 'jorden' }, { x: 40, y: 28, r: 6, gm: 900, name: 'mars' }, { x: 76, y: 40, r: 9, gm: 2200, name: 'jupiter' }], home: 0, rocks: [[60, 14, 4], [66, 22, 3], [22, 30, 4]], station: [88, 12, 5.5], sol: [20, 46],
          why: 'En lang rejse: raketten flyver i en stor bue over planeterne, og Jupiter trækker den rundt om sig og ned til stationen.' },
        { planets: [{ x: 10, y: 10, r: 5, gm: 250, name: 'jorden' }, { x: 55, y: 31, r: 9, gm: 3500, name: 'jupiter' }], home: 0, rocks: [[4, 26, 4], [12, 26, 4], [20, 25, 4], [28, 22, 4], [-4, 26, 4]], station: [16, 51, 5], sol: [344, 37],
          why: 'Raketten bruger Jupiter til at vende. Med lidt kraft driver den hen til Jupiter, som slynger den rundt, og så går turen tilbage til stationen.' }
      ] }
  ];

  // every level gets its world, gravity, width and id
  worlds.forEach(function (w) { w.levels.forEach(function (lv, i) { lv.world = w.id; lv.g = w.g || null; lv.W = w.W; lv.id = w.id + '-' + (i + 1); lv.no = i + 1; }); });

  /* ---------- the sandbox: »Byg en bane« ----------
   * A grid of 8 × 5 squares over a flat world. sb = { w: 0–3, pad: column, st: [column, row], obs: [['m'|'s', column, row], …] }
   * (m = mur: a wall from the ground up to the top of the row; s = sten: a rock in the square). Row 0 is at the bottom.
   * Share code: R1-<world><pad column><station column><station row>{M|S<column><row>}×0–6, e.g. R1-0162M42S33.
   */
  var SB_WORLDS = ['jorden', 'maanen', 'mars', 'jupiter'], COLS = 8, ROWS = 5, MAX_OBS = 6;
  function sbWorld(i) { return worlds.filter(function (w) { return w.id === SB_WORLDS[i]; })[0]; }
  function wallAt(sb, c) { for (var i = 0; i < sb.obs.length; i++) if (sb.obs[i][0] === 'm' && sb.obs[i][1] === c) return i; return -1; }
  function rockAt(sb, c, r) { for (var i = 0; i < sb.obs.length; i++) if (sb.obs[i][0] === 's' && sb.obs[i][1] === c && sb.obs[i][2] === r) return i; return -1; }
  // the rules a built level must keep: nothing on top of the rocket or the station, one wall per column
  function sbValid(sb) {
    if (!sb || SB_WORLDS[sb.w] === undefined || !(sb.pad >= 0 && sb.pad < COLS) || !sb.st || !(sb.st[0] >= 0 && sb.st[0] < COLS) || !(sb.st[1] >= 0 && sb.st[1] < ROWS)) return false;
    if (!Array.isArray(sb.obs) || sb.obs.length > MAX_OBS) return false;
    var seen = {};
    for (var i = 0; i < sb.obs.length; i++) {
      var o = sb.obs[i], c = o[1], r = o[2];
      if ((o[0] !== 'm' && o[0] !== 's') || !(c >= 0 && c < COLS) || !(r >= 0 && r < ROWS)) return false;
      var key = o[0] === 'm' ? 'm' + c : 's' + c + ',' + r;
      if (seen[key]) return false; seen[key] = 1;
      if (o[0] === 'm' && (c === sb.pad || (c === sb.st[0] && r >= sb.st[1]))) return false;
      if (o[0] === 's' && ((c === sb.pad && r <= 1) || (c === sb.st[0] && r === sb.st[1]))) return false;
    }
    for (i = 0; i < sb.obs.length; i++) { var q = sb.obs[i]; if (q[0] === 's') { var wi = wallAt(sb, q[1]); if (wi >= 0 && sb.obs[wi][2] >= q[2]) return false; } }
    return true;
  }
  function sbBuild(sb) {
    var w = sbWorld(sb.w), W = w.W, cell = W / COLS, ch = W * 0.6 / ROWS, y0 = W * 0.04, sr = W * 0.042;
    var lv = { world: w.id, g: w.g, W: W, id: 'sandbox', no: 0, custom: true, terrain: [[0, y0], [W, y0]], pad: (sb.pad + 0.5) * cell,
      station: [(sb.st[0] + 0.5) * cell, Math.max((sb.st[1] + 0.5) * ch, y0 + sr + W * 0.01), sr], walls: [], rocks: [], wind: w.id === 'mars' ? 0.8 : 0 };
    sb.obs.forEach(function (o) {
      if (o[0] === 'm') lv.walls.push([(o[1] + 0.3) * cell, 0, (o[1] + 0.7) * cell, (o[2] + 1) * ch]);
      else lv.rocks.push([(o[1] + 0.5) * cell, (o[2] + 0.5) * ch, ch * 0.4]);
    });
    return lv;
  }
  function sbCode(sb) { return 'R1-' + sb.w + sb.pad + sb.st[0] + sb.st[1] + sb.obs.map(function (o) { return (o[0] === 'm' ? 'M' : 'S') + o[1] + o[2]; }).join(''); }
  // Reads a share code strictly. Returns { sb, lv, shot } or null for anything that is not a valid, solvable level.
  function sbFromCode(code) {
    var s = String(code === undefined || code === null ? '' : code).replace(/\s+/g, '').toUpperCase();
    if (s.length > 40) return null;
    var m = /^R1-([0-3])([0-7])([0-7])([0-4])((?:[MS][0-7][0-4]){0,6})$/.exec(s);
    if (!m) return null;
    var sb = { w: +m[1], pad: +m[2], st: [+m[3], +m[4]], obs: [] };
    (m[5].match(/[MS][0-7][0-4]/g) || []).forEach(function (x) { sb.obs.push([x[0] === 'M' ? 'm' : 's', +x[1], +x[2]]); });
    if (!sbValid(sb)) return null;
    var lv = sbBuild(sb), shot = R.findShot(lv);
    return shot ? { sb: sb, lv: lv, shot: shot } : null;
  }
  R.sandbox = { WORLDS: SB_WORLDS, COLS: COLS, ROWS: ROWS, MAX: MAX_OBS, valid: sbValid, build: sbBuild, toCode: sbCode, fromCode: sbFromCode, wallAt: wallAt, rockAt: rockAt };

  R.worlds = worlds;
  if (typeof module !== 'undefined' && module.exports) module.exports = worlds;
})(typeof window !== 'undefined' ? window : this);
