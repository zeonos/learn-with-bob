// End-to-end test of Raketbanen through the real UI: levels of every world in both bands are hit with the keyboard,
// the sliders, the −/+ buttons and by dragging back from the rocket (values from the level's known solution), with
// 3 stars and the next level opening; »Vis et skud« after 3 misses, »Vis løsningen« after 6, the Rumlogbog card when a
// world is done, and the sandbox (build, check, code, play, load). Also: no sideways scroll and no console errors.
// NODE_PATH=$(npm root -g) node tools/e2e-raketbanen.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/rb-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SIZES = [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]].filter(s => SIZE === 'all' || s[0] === SIZE);
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of SIZES) {
    const tag = name, full = name === 'desktop';
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
    await p.goto(URL);
    await p.fill('#pname', 'Sofie'); await p.click('button[type=submit]');
    await p.click('a[href="#/spil/raketbanen"]');
    await p.waitForSelector('.rb-world');
    const G = 'Core.games.raketbanen';
    const cur = () => p.evaluate(() => { const s = Core.games.raketbanen._state(); return s && s.cur ? { w: s.w, level: s.level, angle: s.cur.angle, power: s.cur.power, shots: s.cur.shots, misses: s.cur.misses, flying: s.cur.flying, done: s.cur.done, space: !!s.lv.planets, sol: Core.games.raketbanen._sol() } : null; });
    const overflow = async (what) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); check(o <= 1, `${tag} ${what}: no sideways scroll (${o}px)`); };
    const blur = () => p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    async function waitShot() { // until the rocket has landed: a result, or the fire button is back
      await p.waitForFunction(() => { const s = Core.games.raketbanen._state(); return !s || !s.cur || s.cur.done || (!s.cur.flying && !document.querySelector('.rb-fire').disabled); }, null, { timeout: 15000 });
    }
    // set angle and power with the arrow keys (Shift = 5 at a time)
    async function byKeys(a, pw) {
      await blur();
      for (let guard = 0; guard < 200; guard++) {
        const c = await cur(); let d = a - c.angle;
        if (c.space) { d = ((d % 360) + 540) % 360 - 180; }
        if (!d) break;
        await p.keyboard.press((Math.abs(d) >= 5 ? 'Shift+' : '') + (d > 0 ? 'ArrowRight' : 'ArrowLeft'));
      }
      for (let guard = 0; guard < 200; guard++) {
        const c = await cur(), d = pw - c.power; if (!d) break;
        await p.keyboard.press((Math.abs(d) >= 5 ? 'Shift+' : '') + (d > 0 ? 'ArrowUp' : 'ArrowDown'));
      }
    }
    async function bySliders(a, pw) {
      await p.fill('.rb-angle .rb-range', String(a)); await p.dispatchEvent('.rb-angle .rb-range', 'input');
      await p.fill('.rb-power .rb-range', String(pw)); await p.dispatchEvent('.rb-power .rb-range', 'input');
    }
    async function byButtons(a, pw) { // the slider gets close, the −/+ buttons do the last steps
      await bySliders(a - 3 < 0 ? a + 3 : a - 3, pw + 4 > 100 ? pw - 4 : pw + 4);
      for (let k = 0; k < 12; k++) { const c = await cur(); if (c.angle === a) break; await p.click(c.angle < a ? '.rb-angle .rb-step >> nth=1' : '.rb-angle .rb-step >> nth=0'); }
      for (let k = 0; k < 12; k++) { const c = await cur(); if (c.power === pw) break; await p.click(c.power < pw ? '.rb-power .rb-step >> nth=1' : '.rb-power .rb-step >> nth=0'); }
    }
    async function byDrag(a, pw) { // pull back from the rocket like a slingshot
      const info = await p.evaluate(() => {
        const s = Core.games.raketbanen._state(), el = Core.games.raketbanen._el(), r = el.svg.getBoundingClientRect(), lv = s.lv, k = 1000 / lv.W;
        let base;
        if (lv.planets) { const hp = lv.planets[lv.home || 0]; base = [hp.x * k, 600 - hp.y * k, hp.r * k]; }
        else { const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(el.rocket.getAttribute('transform')); base = [+m[1], +m[2], 0]; }
        return { left: r.left, top: r.top, scale: r.width / 1000, base };
      });
      const len = pw * 3 + info.base[2] + 1, rad = a * Math.PI / 180;
      const sx = info.left + info.base[0] * info.scale, sy = info.top + info.base[1] * info.scale;
      const ex = info.left + (info.base[0] - Math.cos(rad) * len) * info.scale, ey = info.top + (info.base[1] + Math.sin(rad) * len) * info.scale;
      await p.mouse.move(sx + (ex - sx) * 0.2, sy + (ey - sy) * 0.2); await p.mouse.down();
      await p.mouse.move(sx + (ex - sx) * 0.6, sy + (ey - sy) * 0.6, { steps: 4 }); await p.mouse.move(ex, ey, { steps: 4 }); await p.mouse.up();
      const c = await cur(), da = Math.abs(((c.angle - a) % 360 + 540) % 360 - 180);
      check(da <= 2 && Math.abs(c.power - pw) <= 3, `${tag} drag aims: wanted ${a}°/${pw}, got ${c.angle}°/${c.power}`);
      await byKeys(a, pw); // fine-tune with the keys
    }
    async function fireWith(how) {
      if (how === 'keys') { await blur(); await p.keyboard.press(Math.random() < 0.5 ? 'Space' : 'Enter'); }
      else await p.click('.rb-fire');
    }
    async function hitNow(how) {
      const c = await cur(), s = c.sol;
      if (how === 'keys') await byKeys(s[0], s[1]); else if (how === 'sliders') await bySliders(s[0], s[1]); else if (how === 'drag') await byDrag(s[0], s[1]); else await byButtons(s[0], s[1]);
      const c2 = await cur(); check(c2.angle === s[0] && c2.power === s[1], `${tag} ${c.w} ${c.level}: values set by ${how} (${c2.angle}/${c2.power} vs ${s})`);
      await fireWith(how === 'keys' || how === 'drag' ? 'keys' : 'click');
    }
    async function miss() { await bySliders(45, 1); await p.click('.rb-fire'); await waitShot(); }
    async function result() {
      await p.waitForSelector('.rb-result', { timeout: 15000 }); await p.waitForTimeout(1500);
      return { stars: await p.$$eval('.rs-result-stars .star.on', x => x.length), text: await p.textContent('.rb-result') };
    }
    async function playLevel(how, mode, shotTag) {
      await p.waitForSelector('.rb-svg');
      const c = await cur();
      if (shotTag) { await p.screenshot({ path: `${OUT}/${tag}-${shotTag}-start.png`, fullPage: true }); await overflow(shotTag); }
      if (mode === 'shot') {
        for (let k = 0; k < 3; k++) { check(await p.locator('.rb-toolrow .btn:has-text("Vis et skud")').isDisabled(), `${tag} ${c.w}: »Vis et skud« waits for 3 misses`); await miss(); }
        const b = p.locator('.rb-toolrow .btn:has-text("Vis et skud")');
        check(await b.isEnabled(), `${tag} ${c.w} ${c.level}: »Vis et skud« lights up after 3 misses`);
        await b.click(); await p.waitForTimeout(200);
        const c2 = await cur(); check(c2.angle === c.sol[0] && c2.power === c.sol[1], `${tag} ${c.w}: »Vis et skud« sets the sliders (${c2.angle}/${c2.power})`);
        check((await p.getAttribute('.rb-svg polyline[id$="ghost"]', 'points')).length > 20, `${tag} ${c.w}: the green path is drawn`);
        await p.screenshot({ path: `${OUT}/${tag}-${c.w}-showshot.png`, fullPage: true });
        await p.click('.rb-fire');
      } else if (mode === 'solution') {
        for (let k = 0; k < 6; k++) await miss();
        const b = p.locator('.rb-toolrow .btn:has-text("Vis løsningen")');
        check(await b.isEnabled(), `${tag} ${c.w} ${c.level}: »Vis løsningen« lights up after 6 misses`);
        await b.click(); await p.waitForTimeout(400);
        check(await p.locator('.rb-why').count() === 1, `${tag} ${c.w}: the solution explains why`);
        await p.screenshot({ path: `${OUT}/${tag}-${c.w}-solution.png`, fullPage: true });
      } else await hitNow(how);
      const r = await result();
      if (shotTag) await p.screenshot({ path: `${OUT}/${tag}-${shotTag}-result.png` });
      const want = mode === 'shot' ? 2 : mode === 'solution' ? 1 : 3;
      check(r.stars === want, `${tag} ${c.w} level ${c.level} (${mode || how}): ${r.stars} stars, wanted ${want}`);
      if (c.level < 6) check(r.text.indexOf('bane ' + (c.level + 1) + ' af 6') >= 0, `${tag} ${c.w} ${c.level}: the next level opens`);
      return r;
    }
    const hows = ['keys', 'sliders', 'buttons'];
    await p.evaluate(G + '._speed(1)');
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band); await p.waitForSelector('.rb-world');
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map0.png`, fullPage: true }); await overflow('map');
      const ids = await p.$$eval('.rb-world', x => x.map(e => e.getAttribute('data-world')));
      check(ids.length === 3, `${tag} three worlds per band (${ids})`);
      for (let wi = 0; wi < ids.length; wi++) {
        const wid = ids[wi];
        await p.click(`.rb-world[data-world="${wid}"]`);
        const levels = full ? 6 : 2;
        for (let lvl = 1; lvl <= levels; lvl++) {
          const mode = lvl === 2 && wid === 'maanen' ? 'shot' : lvl === 2 && (wid === 'mars' || (wid === 'solsystemet' && full)) ? 'solution' : null;
          const how = lvl === 2 && wid === 'jupiter' ? 'drag' : hows[(wi + lvl) % 3];
          await playLevel(how, mode, lvl <= 1 || (lvl === 2 && mode) ? `${wid}${lvl}` : null);
          if (band === 0 && wi === 0 && lvl === 1) await p.evaluate(G + '._speed(4)'); // the first shot flew at normal speed
          if (lvl < levels) await p.click('.rb-result .btn.primary:has-text("Næste bane")');
        }
        if (full) { // the world is done: a fact card for the Rumlogbog
          check(await p.locator('.rb-result .rb-newcard').count() === 1, `${tag} ${wid}: a new card after the last level`);
          await p.click('.rb-result .btn.primary:has-text("Se kortet")'); await p.waitForSelector('.rb-carddlg'); await p.waitForTimeout(400);
          await p.screenshot({ path: `${OUT}/${tag}-${wid}-card.png` }); await overflow('card');
          await p.click('.rb-carddlg .btn.ghost');
        } else await p.click('.rb-result .btn.ghost');
        await p.waitForSelector('.rb-world');
        const lv = await p.textContent(`.rb-world[data-world="${wid}"] .rb-level`);
        check(full ? lv === 'Alle baner klaret' : lv === 'Bane 3 af 6', `${tag} ${wid}: the card shows the progress (${lv})`);
      }
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map.png`, fullPage: true });
    }
    // the level picker: replay level 1 of Jorden
    await p.click('.seg >> nth=0'); await p.click('.rb-world[data-world="jorden"]'); await p.waitForSelector('.rb-pick'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${tag}-picker.png` });
    await p.click('.rb-pick-btn[data-level="1"]'); await p.waitForSelector('.rb-svg');
    check((await cur()).level === 1, `${tag} the picker starts the chosen level`);
    // backwards: a shot at 150° flies the wrong way, and Bob says so
    await bySliders(150, 50); await p.click('.rb-fire'); await waitShot();
    check(/forkerte vej/.test(await p.textContent('.rb-say')), `${tag} Bob explains a backwards shot`);
    await p.screenshot({ path: `${OUT}/${tag}-miss.png`, fullPage: true });
    await p.click('.rs-iconbtn >> nth=0'); await p.click('.rs-overlay .btn.ghost'); await p.waitForSelector('.rb-world');
    // Rumlogbog
    await p.click('.rb-logbtn'); await p.waitForSelector('.rb-cards');
    const nCards = await p.locator('.rb-card:not(.locked)').count(), col = await p.evaluate(() => Core.games.raketbanen.collection(Core.gameData('raketbanen')));
    check(nCards === col.n && col.max === 6 && (full ? col.n === 6 : col.n === 0), `${tag} Rumlogbog shows ${nCards} cards (${JSON.stringify(col)})`);
    await p.screenshot({ path: `${OUT}/${tag}-logbook.png`, fullPage: true }); await overflow('logbook');
    await p.click('.rb-logbook .btn.ghost'); await p.waitForSelector('.rb-world');
    // sandbox: build on Mars, check, get a code, play it, load a bad and a good code
    await p.click('text=Byg en bane'); await p.waitForSelector('.rb-sb-stage svg');
    check(await p.evaluate(() => !!(Core.profile().visits || {})['raketbanen:sandbox']), `${tag} the sandbox counts as visited`);
    await p.click('.rb-sb-worlds .seg >> nth=2'); await p.waitForSelector('.rb-sb-stage svg');
    const cell = (c, r) => `.rb-sb-stage .rb-cell[data-c="${c}"][data-r="${r}"]`;
    await p.click('.rb-sb-tool[data-tool="station"]'); await p.click(cell(6, 1));
    await p.click('.rb-sb-tool[data-tool="wall"]'); await p.click(cell(4, 2));
    await p.click('.rb-sb-tool[data-tool="rock"]'); await p.click(cell(2, 3)); await p.click(cell(5, 3));
    await p.click('.rb-sb-tool[data-tool="erase"]'); await p.click(cell(5, 3));
    await p.click('.rb-sb-tool[data-tool="pad"]'); await p.click(cell(1, 0));
    const sbs = await p.evaluate(() => JSON.stringify(Core.games.raketbanen._sandbox().s));
    check(sbs === JSON.stringify({ w: 2, pad: 1, st: [6, 1], obs: [['m', 4, 2], ['s', 2, 3]] }), `${tag} sandbox state after the taps: ${sbs}`);
    await p.click('.rb-sb-test'); await p.waitForSelector('.rb-sb-result .rb-sb-code', { timeout: 15000 });
    const code = await p.inputValue('.rb-sb-result .rb-sb-code');
    check(code === 'R1-2161M42S23', `${tag} sandbox code: ${code}`);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${tag}-sandbox.png`, fullPage: true }); await overflow('sandbox');
    await p.click('.rb-sb-play'); await p.waitForSelector('.rb-svg');
    await p.screenshot({ path: `${OUT}/${tag}-custom.png`, fullPage: true });
    await hitNow('sliders'); await p.waitForSelector('.rs-overlay .btn.primary:has-text("Byg videre")', { timeout: 15000 });
    await p.click('.rs-overlay .btn.primary'); await p.waitForSelector('.rb-sb-load');
    // a level that cannot be reached is refused
    await p.click('.rb-sb-worlds .seg >> nth=3'); await p.click('.rb-sb-tool[data-tool="station"]'); await p.click(cell(7, 0));
    await p.click('.rb-sb-tool[data-tool="wall"]'); await p.click(cell(4, 4));
    await p.click('.rb-sb-test'); await p.waitForSelector('.rb-sb-result .oj-rule.final', { timeout: 30000 });
    check(/kan ikke nå/.test(await p.textContent('.rb-sb-result')), `${tag} an impossible level is refused`);
    for (const bad of ['R1-<script>', 'R1-0182M12', 'hej']) {
      await p.fill('.rb-sb-load .rb-sb-code', bad); await p.click('.rb-sb-load .btn'); await p.waitForTimeout(150);
      check((await p.textContent('.rb-sb-loadmsg')) !== '' && await p.locator('.rb-sb-load').count() === 1, `${tag} a bad code is refused: ${bad}`);
    }
    await p.fill('.rb-sb-load .rb-sb-code', code.toLowerCase()); await p.click('.rb-sb-load .btn'); await p.waitForSelector('.rb-svg');
    check((await p.textContent('.rs-hud-title strong')) === 'En vens bane', `${tag} a friend's level loads`);
    await hitNow('keys'); await p.waitForSelector('.rs-overlay .btn.ghost:has-text("Til kortet")', { timeout: 15000 });
    await p.click('.rs-overlay .btn.ghost'); await p.waitForSelector('.rb-world');
    const badges = await p.evaluate(() => Object.keys(Core.profile().badges || {}));
    check(badges.indexOf('raketbanen-1') >= 0 && badges.indexOf('gaademager') >= 0 && badges.indexOf('staedig') >= 0, `${tag} badges: ${badges.join(',')}`);
    if (full) check(badges.indexOf('raketbanen-2') >= 0, `${tag} silver badge after every world`);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Raketbanen e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
