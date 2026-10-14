/*
 * Spilliste: hvilke filer hvert spil består af, og hvilken gruppe det står i på forsiden.
 * Spillene hentes først, når de skal bruges (Core.loadGame). Titler og fag står i shared/strings-da.js.
 * regnestorm.css hentes altid (index.html), fordi alle spil bruger dens knapper og dialoger.
 * Husk også at tilføje nye filer i sw.js.
 */
(typeof window !== 'undefined' ? window : global).GAMES = [
  { id: 'regnestorm', group: 'matematik', css: ['regnestorm/regnestorm.css'], js: ['regnestorm/strings-da.js', 'regnestorm/problems.js', 'regnestorm/game.js'] },
  { id: 'byggepladsen', group: 'matematik', css: ['ordjaegeren/ordjaegeren.css', 'byggepladsen/byggepladsen.css'], js: ['byggepladsen/strings-da.js', 'byggepladsen/geometry.js', 'byggepladsen/game.js'] },
  { id: 'lommepenge', group: 'matematik', css: ['ordjaegeren/ordjaegeren.css', 'lommepenge/lommepenge.css'], js: ['lommepenge/strings-da.js', 'lommepenge/money.js', 'lommepenge/game.js'] },
  { id: 'ordjaegeren', group: 'sprog', css: ['ordjaegeren/ordjaegeren.css'], js: ['ordjaegeren/strings-da.js', 'ordjaegeren/words.js', 'ordjaegeren/game.js'] },
  { id: 'ordbroen', group: 'sprog', css: ['ordjaegeren/ordjaegeren.css', 'ordbroen/ordbroen.css'], js: ['ordbroen/strings-da.js', 'ordbroen/words.js', 'ordbroen/game.js'] },
  { id: 'laboratoriet', group: 'natur', css: ['laboratoriet/laboratoriet.css'], js: ['laboratoriet/strings-da.js', 'laboratoriet/sim.js', 'laboratoriet/content.js', 'laboratoriet/scenes.js', 'laboratoriet/game.js'] },
  { id: 'verdensrejsen', group: 'natur', css: ['verdensrejsen/verdensrejsen.css'], js: ['verdensrejsen/strings-da.js', 'verdensrejsen/places.js', 'verdensrejsen/maps.js', 'verdensrejsen/game.js'] },
  { id: 'tidsmaskinen', group: 'natur', css: ['ordjaegeren/ordjaegeren.css', 'tidsmaskinen/tidsmaskinen.css'], js: ['tidsmaskinen/strings-da.js', 'tidsmaskinen/events.js', 'tidsmaskinen/game.js'] },
  { id: 'raketbanen', group: 'natur', css: ['ordjaegeren/ordjaegeren.css', 'raketbanen/raketbanen.css'], js: ['raketbanen/strings-da.js', 'raketbanen/physics.js', 'raketbanen/levels.js', 'raketbanen/game.js'] },
  { id: 'tankespind', group: 'logik', css: ['ordjaegeren/ordjaegeren.css', 'tankespind/tankespind.css'], js: ['tankespind/strings-da.js', 'tankespind/puzzles.js', 'tankespind/game.js'] },
  { id: 'gaadehuset', group: 'logik', css: ['ordjaegeren/ordjaegeren.css', 'gaadehuset/gaadehuset.css'], js: ['gaadehuset/strings-da.js', 'gaadehuset/pictures.js', 'gaadehuset/nonogram.js', 'gaadehuset/sudoku.js', 'gaadehuset/logic.js', 'gaadehuset/river.js', 'gaadehuset/hanoi.js', 'gaadehuset/truth.js', 'gaadehuset/kinds.js', 'gaadehuset/game.js'] },
  { id: 'labyrinten', group: 'logik', css: ['ordjaegeren/ordjaegeren.css', 'labyrinten/labyrinten.css'], js: ['labyrinten/strings-da.js', 'labyrinten/mazes.js', 'labyrinten/game.js'] },
  { id: 'robotkoden', group: 'logik', css: ['robotkoden/robotkoden.css'], js: ['robotkoden/strings-da.js', 'robotkoden/engine.js', 'robotkoden/levels.js', 'robotkoden/game.js'] },
  { id: 'museet', group: 'logik', css: ['ordjaegeren/ordjaegeren.css', 'museet/museet.css'], js: ['museet/strings-da.js', 'museet/story.js', 'museet/puzzles.js', 'museet/game.js'] },
  { id: 'netdetektiven', group: 'teknologi', css: ['ordjaegeren/ordjaegeren.css', 'netdetektiven/netdetektiven.css'], js: ['netdetektiven/strings-da.js', 'netdetektiven/cases.js', 'netdetektiven/game.js'] },
  { id: 'taktslaget', group: 'teknologi', css: ['ordjaegeren/ordjaegeren.css', 'taktslaget/taktslaget.css'], js: ['taktslaget/strings-da.js', 'taktslaget/music.js', 'taktslaget/game.js'] },
  { id: 'opfinder', group: 'teknologi', css: ['ordjaegeren/ordjaegeren.css', 'opfinder/opfinder.css'], js: ['opfinder/strings-da.js', 'opfinder/parts.js', 'opfinder/physics.js', 'opfinder/machines.js', 'opfinder/game.js'] }
];
if (typeof module !== 'undefined' && module.exports) module.exports = (typeof window !== 'undefined' ? window : global).GAMES;
