// End-to-end test of Mysteriet på museet through the real UI: all six rooms in both bands are played by tapping the
// things in the room (in the picture and in the »Se på« row), opening the notebook and striking a suspect, and solving
// every lock with its own controls (keypad, timeline cards, letter keys, options, scale weights, suspect cards).
// _step() is only used to know the answer. Clean rooms give 3 stars, »Tip« gives 2, three wrong tries and
// »Vis løsningen« give 1, three wrong tries and then the right answer give »Stædig«. A reload in the middle keeps the
// progress. Also: the ending, the collection, the badges, no sideways scroll and no page errors.
// NODE_PATH=$(npm root -g) node tools/e2e-museet.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/mu-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SIZES = [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]].filter(s => SIZE === 'all' || s[0] === SIZE);
const ROOMS = ['hallen', 'oldtiden', 'vikingetiden', 'middelalderen', 'renaessancen', 'loftet'];
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }
// how each room is played: tip = »Tip« (2 stars), show = 3 wrong + »Vis løsningen« (1 star), stubborn = 3 wrong + right (3 stars)
const PLAN = { M: { oldtiden: 'tip', middelalderen: 'show' }, U: { hallen: 'stubborn', vikingetiden: 'tip', renaessancen: 'show' } };

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
    await p.click('a[href="#/spil/museet"]');
    await p.waitForSelector('.mu-storydlg'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${tag}-story.png` });
    check((await p.textContent('.mu-storydlg')).indexOf('Guldhornene') >= 0, `${tag} the story starts`);
    await p.click('.mu-storydlg .btn.primary');
    await p.waitForSelector('.mu-room');
    const overflow = async (what) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); check(o <= 1, `${tag} ${what}: no sideways scroll (${o}px)`); };
    const step = () => p.evaluate(() => Core.games.museet._step());
    const state = () => p.evaluate(() => { const s = Core.games.museet._state(); return s ? { room: s.room, band: s.band, si: s.si, wrong: s.wrong, hinted: s.hinted, shown: s.shown, solved: s.solved } : null; });
    const gd = () => p.evaluate(() => JSON.parse(JSON.stringify(Core.gameData('museet'))));
    const clickText = async (sel, txt) => { const loc = p.locator(sel).filter({ hasText: txt }); const n = await loc.count(); for (let i = 0; i < n; i++) { if ((await loc.nth(i).textContent()).trim() === txt) { await loc.nth(i).click(); return true; } } return false; };

    // ---- the controls: one right answer, or one wrong try
    async function solveStep(s) {
      if (s.kind === 'code') {
        for (let i = 0; i < s.answer.length; i++) { await p.click(`.mu-field[data-f="${i}"]`); for (const c of String(s.answer[i])) await p.click(`.mu-key[data-key="${c}"]`); }
        await p.click('.mu-try');
      } else if (s.kind === 'timeline') {
        for (const id of s.answer) await p.click(`.mu-pool .mu-find[data-find="${id}"]`);
        await p.click('.mu-checkorder');
      } else if (s.kind === 'runes') {
        for (const c of s.answer) await p.click(`.mu-abc-key[data-letter="${c}"]`);
        await p.click('.mu-checkword');
      } else if (s.kind === 'strike') {
        const struck = (await gd()).nb[await p.evaluate(() => Core.games.museet._state().band)].struck || {};
        for (const id of ['vagt', 'inspektor', 'smith', 'urmager']) { const want = s.answer.indexOf(id) >= 0; if (!!struck[id] !== want) await p.click(`.mu-panel .mu-suspect[data-suspect="${id}"]`); }
        await p.click('.mu-checkstrike');
      } else if (s.kind === 'scale') {
        check(await clickText('.mu-weights .mu-weight', s.answer), `${tag} scale option found`);
      } else {
        check(await clickText('.mu-opts .mu-opt', s.answer), `${tag} option found: ${s.answer}`);
      }
      await p.waitForTimeout(120);
    }
    async function wrongStep(s) {
      if (s.kind === 'code') {
        for (let i = 0; i < s.answer.length; i++) { await p.click(`.mu-field[data-f="${i}"]`); for (let k = 0; k < 4; k++) await p.click('.mu-key-del'); }
        for (let i = 0; i < s.answer.length; i++) { await p.click(`.mu-field[data-f="${i}"]`); const v = String((s.answer[i] + 1) % (i === 0 ? 10 : 60)); for (const c of v) await p.click(`.mu-key[data-key="${c}"]`); }
        await p.click('.mu-try');
        for (let i = 0; i < s.answer.length; i++) { await p.click(`.mu-field[data-f="${i}"]`); for (let k = 0; k < 4; k++) await p.click('.mu-key-del'); }
      } else if (s.kind === 'scale') {
        const opts = await p.$$eval('.mu-weights .mu-weight:not([disabled])', x => x.map(e => e.textContent.trim()));
        await clickText('.mu-weights .mu-weight', opts.filter(o => o !== s.answer)[0]);
      } else if (s.kind === 'mc') {
        const opts = await p.$$eval('.mu-opts .mu-opt:not([disabled])', x => x.map(e => e.textContent.trim()));
        await clickText('.mu-opts .mu-opt', opts.filter(o => o !== s.answer)[0]);
      } else throw new Error('no wrong move for ' + s.kind);
      await p.waitForTimeout(120);
    }
    // tap every thing in the room: in the picture (the chip row on a phone, if a spot is covered) and check the Bob line
    async function lookAround(room) {
      const spots = await p.$$eval('.mu-stage .mu-spot:not(.lock)', x => x.map(e => e.getAttribute('data-spot')));
      check(spots.length >= 2, `${tag} ${room}: things to look at (${spots.length})`);
      for (const [k, id] of spots.entries()) {
        const before = await p.textContent('.mu-say');
        if (k % 2 === 0 || name === 'desktop') { try { await p.click(`.mu-stage .mu-spot[data-spot="${id}"]`, { timeout: 2500 }); } catch (e) { await p.click(`.mu-chips .mu-chip[data-spot="${id}"]`); } }
        else await p.click(`.mu-chips .mu-chip[data-spot="${id}"]`);
        await p.waitForTimeout(80);
        const after = await p.textContent('.mu-say');
        check(after !== before || k === 0, `${tag} ${room}: Bob tells about ${id}`);
        check(await p.locator(`.mu-chips .mu-chip.seen[data-spot="${id}"]`).count() === 1, `${tag} ${room}: ${id} is marked as seen`);
      }
    }
    async function playRoom(band, room) {
      const mode = (PLAN[band] || {})[room] || 'clean';
      await p.click(`.mu-room[data-room="${room}"]`); await p.waitForSelector('.mu-stage svg');
      await p.waitForTimeout(150);
      check(await p.locator('.mu-stage .mu-spot').count() >= 3, `${tag} ${band} ${room}: 3–5 hotspots`);
      const sizes = await p.$$eval('.mu-stage .mu-spot, .mu-chip, .mu-key, .mu-opt, .btn', x => x.filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height, e.className]; }));
      check(sizes.every(s => s[0] >= 43.5 && s[1] >= 43.5), `${tag} ${band} ${room}: touch targets ≥ 44px (${JSON.stringify(sizes.filter(s => s[0] < 43.5 || s[1] < 43.5).slice(0, 3))})`);
      await lookAround(`${band} ${room}`);
      const clues0 = Object.keys(((await gd()).nb[band] || {}).clues || {}).length;
      if (room === 'hallen') { // the notebook: a clue, and strike a suspect (and take her back)
        check(clues0 >= 1, `${tag} ${band}: the guest book clue is in the notebook`);
        await p.click('.mu-nbicon'); await p.waitForSelector('.mu-nb');
        check(await p.locator('.mu-nb .mu-cluelist li').count() >= 1, `${tag} ${band}: the notebook lists the clue`);
        await p.click('.mu-nb .mu-suspect[data-suspect="smith"]'); await p.click('.mu-nb .mu-suspect[data-suspect="inspektor"]'); await p.click('.mu-nb .mu-suspect[data-suspect="inspektor"]');
        await p.waitForTimeout(100);
        if (band === 'M') await p.screenshot({ path: `${OUT}/${tag}-notebook.png` });
        await overflow('notebook');
        const st = (await gd()).nb[band].struck;
        check(st.smith && !st.inspektor, `${tag} ${band}: striking a suspect is saved (${JSON.stringify(st)})`);
        await p.click('.mu-nb .btn.primary');
      }
      await p.click('.mu-stage .mu-spot.lock >> nth=0'); await p.waitForSelector('.mu-panel .mu-q');
      await p.waitForTimeout(400);
      await p.screenshot({ path: `${OUT}/${tag}-${band}-${room}.png`, fullPage: true }); await overflow(`${band} ${room}`);
      let s = await step();
      if (mode === 'tip') {
        await p.click('.mu-tip'); await p.waitForSelector('.mu-tipbox');
        const t1 = await p.textContent('.mu-tipbox'); await p.click('.mu-tip'); const t2 = await p.textContent('.mu-tipbox');
        check(t1 !== t2 && /Tip 2/.test(t2), `${tag} ${band} ${room}: the second tip is a new one`);
        check(await p.locator('.mu-tip').isDisabled(), `${tag} ${band} ${room}: no more than two tips`);
        await p.screenshot({ path: `${OUT}/${tag}-${band}-${room}-tip.png`, fullPage: true });
      }
      if (mode === 'show' || mode === 'stubborn') {
        for (let k = 0; k < 3; k++) { check(await p.locator('.mu-solve').isDisabled(), `${tag} ${band} ${room}: »Vis løsningen« waits for 3 wrong tries`); await wrongStep(s); }
        check((await state()).wrong === 3, `${tag} ${band} ${room}: three wrong tries counted`);
        check(await p.locator('.mu-solve').isEnabled(), `${tag} ${band} ${room}: »Vis løsningen« after 3 wrong tries`);
        if (mode === 'show') { await p.click('.mu-solve'); await p.waitForSelector('.mu-solution'); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${tag}-${band}-${room}-solution.png`, fullPage: true }); }
      }
      for (let guard = 0; guard < 8 && !(await state()).solved; guard++) { s = await step(); await solveStep(s); }
      check((await state()).solved, `${tag} ${band} ${room}: solved`);
      await p.waitForSelector('.mu-lesson');
      check(/Sådan virker det/.test(await p.textContent('.mu-lesson')), `${tag} ${band} ${room}: »Sådan virker det«`);
      const n = (await gd()).nb[band];
      check(Object.keys(n.clues).length > clues0 || room !== 'hallen', `${tag} ${band} ${room}: a new clue when the lock opens`);
      if (room === 'hallen' || room === 'loftet') { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${tag}-${band}-${room}-solved.png`, fullPage: true }); }
      await p.click('.mu-lesson .mu-continue');
      if (room === 'loftet') {
        await p.waitForSelector('.mu-ending');
        const txt = await p.textContent('.mu-ending');
        check(/1802/.test(txt) && /Heidenreich/.test(txt) && /Exeter/.test(txt) && txt.indexOf(n.vars.T) >= 0, `${tag} ${band}: the ending tells the true story (and the clock time ${n.vars.T})`);
        await p.screenshot({ path: `${OUT}/${tag}-${band}-ending.png`, fullPage: true }); await overflow('ending');
        await p.click('.mu-ending .mu-continue');
      }
      await p.waitForSelector('.mu-result'); await p.waitForTimeout(1500);
      const stars = await p.$$eval('.mu-result .rs-result-stars .star.on', x => x.length), want = mode === 'tip' ? 2 : mode === 'show' ? 1 : 3;
      check(stars === want, `${tag} ${band} ${room} (${mode}): ${stars} stars, wanted ${want}`);
      check(await p.locator('.mu-result .mu-card').count() === 1, `${tag} ${band} ${room}: a new exhibit for the collection`);
      if (room === 'hallen' || room === 'loftet' || mode !== 'clean') await p.screenshot({ path: `${OUT}/${tag}-${band}-${room}-result.png` });
      await overflow('result');
      const rs = (await gd()).rooms[band][room];
      check(rs && rs.best === want && rs.plays === 1, `${tag} ${band} ${room}: saved ${JSON.stringify(rs)}`);
    }

    for (const band of ['M', 'U']) {
      await p.click('.seg >> nth=' + (band === 'M' ? 0 : 1)); await p.waitForSelector('.mu-room');
      await p.screenshot({ path: `${OUT}/${tag}-${band}-map0.png`, fullPage: true }); await overflow('map');
      check(await p.locator('.mu-room[disabled]').count() === 5, `${tag} ${band}: five rooms locked at the start`);
      check(await p.locator('.mu-room.next[data-room="hallen"]').count() === 1, `${tag} ${band}: the hall is next`);
      for (const room of ROOMS) {
        await playRoom(band, room);
        if (band === 'M' && room === 'vikingetiden') { // reload in the middle of the game: nothing is lost
          await p.reload(); await p.waitForSelector('.mu-room');
          check(await p.locator('.mu-room.next[data-room="middelalderen"]').count() === 1 && await p.locator('.mu-room[disabled]').count() === 2, `${tag} reload: three rooms solved, the fourth is next`);
          check((await p.$$eval('.mu-room[data-room="vikingetiden"] .star.on', x => x.length)) === 3, `${tag} reload: the stars are kept`);
          check(Object.keys((await gd()).nb.M.clues).length >= 4, `${tag} reload: the notebook is kept`);
          continue;
        }
        if (room === 'loftet') await p.click('.mu-result .btn.primary'); // »Se samlingen«
        else if (room === 'oldtiden' || room === 'renaessancen') { await p.click('.mu-result .btn.ghost'); await p.waitForSelector('.mu-room'); }
        else { await p.click('.mu-result .btn.primary'); await p.waitForSelector('.mu-stage svg'); await p.click('.rs-hud .rs-iconbtn >> nth=0'); await p.click('.mu-leave .btn.ghost'); await p.waitForSelector('.mu-room'); }
      }
      await p.waitForSelector('.mu-collection');
      const col = await p.evaluate(() => Core.games.museet.collection(Core.gameData('museet')));
      check(col.n === (band === 'M' ? 6 : 12) && col.max === 12, `${tag} ${band}: collection ${JSON.stringify(col)}`);
      check(await p.locator('.mu-card:not(.locked)').count() === col.n, `${tag} ${band}: the collection shows the cards`);
      await p.screenshot({ path: `${OUT}/${tag}-${band}-collection.png`, fullPage: true }); await overflow('collection');
      await p.click('.mu-collection .btn.ghost'); await p.waitForSelector('.mu-room');
      await p.screenshot({ path: `${OUT}/${tag}-${band}-map.png`, fullPage: true });
      check(await p.locator('.mu-room[disabled]').count() === 0, `${tag} ${band}: all rooms open`);
    }
    const sum = await p.evaluate(() => Core.games.museet.summary(Core.gameData('museet')));
    check(sum.max === 18 && sum.stars === 18 - 3, `${tag} summary for Udskoling ${JSON.stringify(sum)}`);
    const badges = await p.evaluate(() => Object.keys(Core.profile().badges || {}));
    check(badges.indexOf('museet-1') >= 0 && badges.indexOf('museet-2') >= 0 && badges.indexOf('staedig') >= 0, `${tag} badges: ${badges.join(',')}`);
    // the daily challenge's task renders in the hub format
    const q = await p.evaluate(() => Core.seeded(3, () => Core.games.museet.quickTask('M', {})));
    check(q && q.options.indexOf(q.answer) >= 0, `${tag} quickTask works in the browser`);
    console.log(`${tag}: done in ${Math.round((Date.now() - t0) / 1000)} s`);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Museet e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
