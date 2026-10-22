/* Service worker: gør spillene klar til brug uden internet (kun over https eller localhost).
 * Hæv VERSION, når du lægger nye filer op, så alle får den nye udgave. */
var VERSION = 'bobspil-v22';
var FILES = [
  './', './index.html', './manifest.webmanifest', './shared/ui.css', './shared/strings-da.js', './shared/i18n.js', './shared/strings-en.js',
  './shared/games.js', './shared/core.js', './shared/daily.js', './shared/badges.js', './shared/hub.js', './shared/start.js',
  './shared/mascot/bob.js', './shared/icons/icon-192.png', './shared/icons/icon-512.png', './shared/icons/icon-180.png', './regnestorm/regnestorm.css',
  './regnestorm/strings-da.js', './regnestorm/problems.js', './regnestorm/game.js', './ordjaegeren/ordjaegeren.css', './byggepladsen/byggepladsen.css',
  './byggepladsen/strings-da.js', './byggepladsen/geometry.js', './byggepladsen/game.js', './lommepenge/lommepenge.css', './lommepenge/strings-da.js',
  './lommepenge/money.js', './lommepenge/game.js', './ordjaegeren/strings-da.js', './ordjaegeren/words.js', './ordjaegeren/game.js',
  './ordbroen/ordbroen.css', './ordbroen/strings-da.js', './ordbroen/words.js', './ordbroen/game.js', './laboratoriet/laboratoriet.css',
  './laboratoriet/strings-da.js', './laboratoriet/sim.js', './laboratoriet/content.js', './laboratoriet/scenes.js', './laboratoriet/game.js',
  './verdensrejsen/verdensrejsen.css', './verdensrejsen/strings-da.js', './verdensrejsen/places.js', './verdensrejsen/maps.js', './verdensrejsen/game.js',
  './tidsmaskinen/tidsmaskinen.css', './tidsmaskinen/strings-da.js', './tidsmaskinen/events.js', './tidsmaskinen/game.js', './robotkoden/robotkoden.css',
  './robotkoden/strings-da.js', './robotkoden/engine.js', './robotkoden/levels.js', './robotkoden/game.js', './netdetektiven/netdetektiven.css',
  './netdetektiven/strings-da.js', './netdetektiven/cases.js', './netdetektiven/game.js', './taktslaget/taktslaget.css', './taktslaget/strings-da.js',
  './taktslaget/music.js', './taktslaget/game.js', './tankespind/tankespind.css', './tankespind/strings-da.js', './tankespind/puzzles.js',
  './tankespind/game.js', './gaadehuset/gaadehuset.css', './gaadehuset/strings-da.js', './gaadehuset/pictures.js', './gaadehuset/nonogram.js',
  './gaadehuset/sudoku.js', './gaadehuset/logic.js', './gaadehuset/river.js', './gaadehuset/hanoi.js', './gaadehuset/truth.js', './gaadehuset/kinds.js', './gaadehuset/game.js', './labyrinten/labyrinten.css', './labyrinten/strings-da.js',
  './labyrinten/mazes.js', './labyrinten/game.js',
  './raketbanen/raketbanen.css', './raketbanen/strings-da.js', './raketbanen/physics.js', './raketbanen/levels.js', './raketbanen/game.js',
  './museet/museet.css', './museet/strings-da.js', './museet/story.js', './museet/puzzles.js', './museet/game.js',
  './opfinder/opfinder.css', './opfinder/strings-da.js', './opfinder/parts.js', './opfinder/physics.js', './opfinder/machines.js', './opfinder/game.js'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Hent altid den nyeste udgave, når der er internet, og gem en kopi. Uden internet bruges kopien.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return fetch(e.request).then(function (res) {
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(function () {
      return cache.match(e.request, { ignoreSearch: true });
    });
  }));
});
