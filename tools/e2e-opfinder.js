// End-to-end test of Opfinderværkstedet through the real UI: every machine of every world in both bands is built by
// tapping the toolbox and the cells (the solution is read from _state() only to know where the parts go), turned with
// a second tap or the »Vend« button, and run; clean machines give 3 stars, »Tip« gives 2, and 3 failed runs +
// »Vis løsningen« give 1 (one level per band each). Also: pause and step during a run, a reload in the middle of a
// level keeps the build, the »staedig« path, Opfinderbogen, the sandbox (build, check, share code, run, load codes,
// refuse bad codes), the badges, no sideways scroll, no page errors and touch targets of at least 44 px.
// NODE_PATH=$(npm root -g) node tools/e2e-opfinder.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/of-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SIZES = [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]].filter(s => SIZE === 'all' || s[0] === SIZE);
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of SIZES) {
    const tag = name, t0 = Date.now();
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
    await p.goto(URL);
    await p.fill('#pname', 'Sofie'); await p.click('button[type=submit]');
    await p.click('a[href="#/spil/opfinder"]');
    await p.waitForSelector('.of-world');
    const G = 'Core.games.opfinder';
    const cur = () => p.evaluate(() => { const s = Core.games.opfinder._state(), b = Core.games.opfinder._bench(); return s ? { w: s.w, level: s.level, sol: s.lv.sol, box: s.lv.box, placed: s.placed, fails: s.fails, mode: b && b.mode, tf: b && b.tf, ticks: b && b.res ? b.res.ticks : 0 } : null; });
    const mode = () => p.evaluate(() => { const b = Core.games.opfinder._bench(); return b ? b.mode : null; });
    const overflow = async (what) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); check(o <= 1, `${tag} ${what}: no sideways scroll (${o}px)`); };
    const targets = async (what, sel) => {
      const small = await p.evaluate((sel) => [].filter.call(document.querySelectorAll(sel), b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44); }).map(b => (b.className || b.tagName) + ':' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height) + ' ' + (b.textContent || b.getAttribute('aria-label') || '').slice(0, 20)), sel);
      check(!small.length, `${tag} ${what}: touch targets ≥ 44 px (${small.join(' | ')})`);
    };
    const cell = (c, r) => `.of-cell[data-c="${c}"][data-r="${r}"]`;
    // put part i of the toolbox on (c, r) and turn it if d = -1 (a second tap on the cell, or the »Vend« button)
    async function place(so, k) {
      await p.click(`.of-item[data-i="${so.i}"]`);
      await p.click(cell(so.c, so.r));
      const s = await cur(), q = s.placed.filter(x => x.c === so.c && x.r === so.r)[0];
      check(q && q.i === so.i, `${tag} ${s.w} ${s.level}: part ${so.i} placed on ${so.c},${so.r}`);
      const turnable = ['ramp', 'spring'].indexOf(s.box[so.i].k) >= 0;
      if (turnable && (q.d || 1) !== (so.d || 1)) {
        await p.click(cell(so.c, so.r)); // select it
        if (k % 2) await p.click(cell(so.c, so.r)); else await p.click('.of-turn');
        const q2 = (await cur()).placed.filter(x => x.c === so.c && x.r === so.r)[0];
        check(q2 && q2.d === so.d, `${tag} ${s.w} ${s.level}: turned to ${so.d}`);
      }
    }
    async function waitEnd() { await p.waitForFunction(() => { const b = Core.games.opfinder._bench(); return b && b.mode === 'end'; }, null, { timeout: 60000 }); }
    async function runFail() {
      await p.click('.of-go'); await waitEnd();
      check(await p.locator('.of-goon').count() === 0, `${tag}: an empty machine does not work`);
      check((await p.textContent('.of-say')).length > 10, `${tag}: Bob says where it stopped`);
      await p.click('.of-resetbtn'); check(await mode() === 'build', `${tag}: »Prøv igen« goes back to building`);
    }
    async function result() {
      await p.waitForSelector('.of-goon', { timeout: 60000 });
      check(await p.locator('.of-explain .of-why').count() === 1, `${tag}: the »Sådan virker det« panel`);
      await p.click('.of-goon');
      await p.waitForSelector('.of-result'); await p.waitForTimeout(1400);
      return { stars: await p.$$eval('.rs-result-stars .star.on', x => x.length), text: await p.textContent('.of-result') };
    }
    async function playLevel(how, shot) {
      await p.waitForSelector('.of-svg');
      let s = await cur();
      if (process.env.OF_DEBUG) console.log(tag, s.w, s.level, how);
      if (shot) { await p.screenshot({ path: `${OUT}/${tag}-${s.w}-1.png`, fullPage: true }); await overflow('play ' + s.w); await targets('play ' + s.w, '.of-play button'); }
      if (how === 'solution') {
        for (let k = 0; k < 3; k++) { check(await p.locator('.of-solbtn').isDisabled(), `${tag} ${s.w} ${s.level}: »Vis løsningen« waits for 3 failed runs`); await runFail(); }
        check(await p.locator('.of-solbtn').isEnabled(), `${tag} ${s.w} ${s.level}: »Vis løsningen« after 3 failed runs`);
        await p.click('.of-solbtn');
        await p.waitForSelector('.of-sollist li'); await p.waitForTimeout(300);
        await p.screenshot({ path: `${OUT}/${tag}-${s.w}-solution.png`, fullPage: true });
      } else {
        if (how === 'tip') {
          await p.click('.of-tipbtn'); await p.waitForTimeout(100);
          s = await cur();
          check(s.placed.length === 1, `${tag} ${s.w} ${s.level}: »Tip« places one part`);
          await p.screenshot({ path: `${OUT}/${tag}-${s.w}-tip.png`, fullPage: true });
        }
        if (how === 'stubborn') for (let k = 0; k < 3; k++) await runFail();
        let k = 0;
        for (const so of s.sol) { const have = (await cur()).placed.some(x => x.c === so.c && x.r === so.r); if (!have) await place(so, k++); }
        if (shot) await p.screenshot({ path: `${OUT}/${tag}-${s.w}-1-built.png`, fullPage: true });
        await p.click('.of-go');
        if (shot) { // a run in progress
          await p.waitForFunction(() => { const b = Core.games.opfinder._bench(); return b && b.res && (b.tf >= b.res.ticks * 0.5 || b.mode === 'end'); }, null, { timeout: 60000 });
          await p.screenshot({ path: `${OUT}/${tag}-${s.w}-1-run.png`, fullPage: true });
        }
      }
      const r = await result();
      if (shot) await p.screenshot({ path: `${OUT}/${tag}-${s.w}-1-result.png` });
      const want = how === 'tip' ? 2 : how === 'solution' ? 1 : 3;
      check(r.stars === want, `${tag} ${s.w} level ${s.level} (${how}): ${r.stars} stars, wanted ${want}`);
      if (s.level < 6) check(r.text.indexOf('maskine ' + (s.level + 1) + ' af 6') >= 0, `${tag} ${s.w} ${s.level}: the next machine opens`);
      return r;
    }
    await p.evaluate(G + '._speed(10)');
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band); await p.waitForSelector('.of-world');
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map.png`, fullPage: true }); await overflow('map'); await targets('map', '.of-map button');
      const ids = await p.$$eval('.of-world', x => x.map(e => e.getAttribute('data-world')));
      check(ids.length === 3, `${tag} three worlds per band (${ids})`);
      for (let wi = 0; wi < ids.length; wi++) {
        const wid = ids[wi];
        await p.click(`.of-world[data-world="${wid}"]`);
        for (let lvl = 1; lvl <= 6; lvl++) {
          const how = wi === 0 && lvl === 2 ? 'tip' : wi === 0 && lvl === 3 ? 'solution' : wi === 1 && lvl === 2 ? 'stubborn' : 'clean';
          if (band === 0 && wi === 0 && lvl === 1) { // the first machine: slowly, with pause and step
            await p.evaluate(G + '._speed(1)');
            await p.waitForSelector('.of-svg');
            const s = await cur();
            for (const so of s.sol) await place(so, 1);
            await p.click('.of-go'); await p.waitForTimeout(1300);
            await p.click('.of-go'); // pause
            check(await mode() === 'pause', `${tag} pause stops the machine`);
            const a = (await cur()).tf; await p.waitForTimeout(700); const b = (await cur()).tf;
            check(Math.abs(a - b) < 1e-6, `${tag} the machine stands still while paused (${a} → ${b})`);
            await p.click('.of-stepbtn'); await p.waitForFunction(() => Core.games.opfinder._bench().mode !== 'play', null, { timeout: 5000 });
            const c = (await cur()).tf;
            check(Math.abs(c - (Math.floor(a + 1e-6) + 1)) < 1e-6, `${tag} »Et skridt« goes one step (${a} → ${c})`);
            check((await p.textContent('.of-story')).length > 3, `${tag} the story line says what happens`);
            await p.screenshot({ path: `${OUT}/${tag}-${wid}-1-run.png`, fullPage: true });
            await p.evaluate(G + '._speed(10)');
            await p.click('.of-go'); // go on
            const r = await result();
            await p.screenshot({ path: `${OUT}/${tag}-${wid}-1-result.png` });
            check(r.stars === 3, `${tag} ${wid} 1: ${r.stars} stars`);
          } else if (band === 0 && wi === 1 && lvl === 1) { // reload in the middle of a level: the build is kept
            await p.waitForSelector('.of-svg');
            const s = await cur(), so = s.sol[0];
            await place(so, 0);
            await p.reload(); await p.waitForSelector('.of-world');
            await p.click(`.of-world[data-world="${wid}"]`); await p.waitForSelector('.of-svg');
            const s2 = await cur();
            check(s2.level === 1 && s2.placed.length === 1 && s2.placed[0].c === so.c && s2.placed[0].r === so.r, `${tag} the build is kept after a reload (${JSON.stringify(s2.placed)})`);
            await p.evaluate(G + '._speed(10)');
            await playLevel('clean', true);
          } else await playLevel(how, lvl === 1);
          if (lvl < 6) await p.click('.of-result .btn.primary:has-text("Næste maskine")');
        }
        check(await p.locator('.of-result .of-newcard').count() === 1, `${tag} ${wid}: a new card after the last machine`);
        await p.click('.of-result .btn.primary:has-text("Se kortet")'); await p.waitForSelector('.of-carddlg'); await p.waitForTimeout(300);
        if (wi === 0) await p.screenshot({ path: `${OUT}/${tag}-${wid}-card.png` });
        await overflow('card');
        await p.click('.of-carddlg .btn.ghost'); await p.waitForSelector('.of-world');
        const lv = await p.textContent(`.of-world[data-world="${wid}"] .of-level`);
        check(lv === 'Alle maskiner bygget', `${tag} ${wid}: the card shows the progress (${lv})`);
      }
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map-done.png`, fullPage: true });
    }
    // the level picker
    await p.click('.seg >> nth=0'); await p.click('.of-world >> nth=0'); await p.waitForSelector('.of-pick'); await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}/${tag}-picker.png` });
    await p.click('.of-pick-btn[data-level="4"]'); await p.waitForSelector('.of-svg');
    check((await cur()).level === 4, `${tag} the picker opens the chosen machine`);
    // a wrong placement fails, and Bob says where
    await p.click('.of-item[data-i="0"]'); await p.click(cell(0, 5)); await p.click('.of-go'); await waitEnd();
    check(/stoppe|stå/.test(await p.textContent('.of-say')), `${tag} Bob explains where the machine stopped`);
    await p.screenshot({ path: `${OUT}/${tag}-fail.png`, fullPage: true });
    await p.click('.rs-iconbtn >> nth=0'); await p.click('.of-overlay .btn.ghost'); await p.waitForSelector('.of-world');
    // Opfinderbogen
    await p.click('.of-bookbtn'); await p.waitForSelector('.of-cards');
    const nCards = await p.locator('.of-card:not(.locked)').count(), col = await p.evaluate(() => Core.games.opfinder.collection(Core.gameData('opfinder')));
    check(nCards === 6 && col.n === 6 && col.max === 6, `${tag} Opfinderbogen shows ${nCards} cards (${JSON.stringify(col)})`);
    check(await p.locator('.of-card .of-src').count() === 6, `${tag} every card has a source`);
    await p.screenshot({ path: `${OUT}/${tag}-book.png`, fullPage: true }); await overflow('book');
    await p.click('.of-book .btn.ghost'); await p.waitForSelector('.of-world');
    // Fri opfindelse
    await p.click('.of-sbbtn'); await p.waitForSelector('.of-sandbox .of-svg');
    check(await p.evaluate(() => !!(Core.profile().visits || {})['opfinder:sandbox']), `${tag} the sandbox counts as visited`);
    await targets('sandbox', '.of-sandbox button:not(.of-cell)');
    const tool = async (ch) => p.click(`.of-sb-tool[data-tool="${ch}"]`);
    await tool('P'); await p.click(cell(0, 0));
    await tool('B'); await p.click(cell(1, 0));
    await tool('W'); for (const c of [0, 1, 2]) await p.click(cell(c, 1));
    await tool('R'); await p.click(cell(3, 3)); await p.click(cell(5, 5));
    await tool('erase'); await p.click(cell(5, 5));
    await tool('K'); await p.click(cell(4, 5));
    const sbl = await p.evaluate(() => JSON.stringify(Core.gameData('opfinder').sb));
    check(sbl === JSON.stringify([{ k: 'push', c: 0, r: 0, d: 1 }, { k: 'ball', c: 1, r: 0 }, { k: 'wall', c: 0, r: 1 }, { k: 'wall', c: 1, r: 1 }, { k: 'wall', c: 2, r: 1 }, { k: 'ramp', c: 3, r: 3, d: 1 }, { k: 'cup', c: 4, r: 5 }]), `${tag} sandbox after the taps: ${sbl}`);
    await p.click('.of-sb-check'); await p.waitForSelector('.of-sb-result .of-sb-code');
    const code = await p.inputValue('.of-sb-result .of-sb-code');
    check(code === 'O1-P00B10W01W11W21R33K45', `${tag} sandbox code: ${code}`);
    await p.click('.of-sandbox .of-go'); await waitEnd();
    check(/koppen|virker/i.test(await p.textContent('.of-sandbox')), `${tag} the sandbox machine runs`);
    await p.screenshot({ path: `${OUT}/${tag}-sandbox.png`, fullPage: true }); await overflow('sandbox');
    await p.click('.of-sandbox .of-resetbtn');
    for (const bad of ['O1-X00', 'hej', 'O1-P00B10', 'O1-B99K45', 'O1-B10B10K45', '<script>alert(1)</script>']) {
      await p.fill('.of-sb-load .of-sb-code', bad); await p.click('.of-sb-loadbtn'); await p.waitForTimeout(100);
      check(/virker ikke|når ikke/.test(await p.textContent('.of-sb-loadmsg')), `${tag} a bad code is refused: ${bad}`);
    }
    await p.click('.of-sb-clear');
    check(await p.evaluate(() => Core.gameData('opfinder').sb.length) === 0, `${tag} the wall is cleared`);
    await p.fill('.of-sb-load .of-sb-code', code.toLowerCase().replace('o1-', 'O1-')); await p.click('.of-sb-loadbtn'); await p.waitForTimeout(100);
    check(await p.evaluate(() => Core.gameData('opfinder').sb.length) === 7, `${tag} a friend's machine loads`);
    await p.reload(); await p.waitForSelector('.of-world'); await p.click('.of-sbbtn'); await p.waitForSelector('.of-sandbox .of-svg');
    check(await p.evaluate(() => Core.gameData('opfinder').sb.length) === 7, `${tag} the sandbox is kept after a reload`);
    await p.click('.of-sandbox .btn.ghost >> nth=0'); await p.waitForSelector('.of-world');
    const badges = await p.evaluate(() => Object.keys(Core.profile().badges || {}));
    check(badges.indexOf('opfinder-1') >= 0 && badges.indexOf('gaademager') >= 0 && badges.indexOf('staedig') >= 0, `${tag} badges: ${badges.join(',')}`);
    console.log(`${tag} done in ${Math.round((Date.now() - t0) / 1000)} s`);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Opfinder e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
