// End-to-end test of Taktslaget through the real UI (Playwright, headless Chromium).
// NODE_PATH=$(npm root -g) node tools/e2e-taktslaget.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/taktslaget-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SIZES = [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]].filter(s => SIZE === 'all' || s[0] === SIZE);
const errors = [];
let checks = 0;
function check(c, m) { checks++; if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of SIZES) {
    const tag = name;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
    await p.goto(URL);
    await p.fill('#pname', 'Sofie'); await p.click('button[type=submit]');
    await p.click('a[href="#/spil/taktslaget"]');
    await p.waitForSelector('.ts-route');
    const noScroll = async (where) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); check(o <= 1, `${tag} no horizontal scroll on ${where} (${o}px)`); };
    const gd = () => p.evaluate(() => Core.gameData('taktslaget'));
    await p.screenshot({ path: `${OUT}/${tag}-map.png`, fullPage: true });
    await noScroll('map');

    const cur = () => p.evaluate(() => {
      const s = Core.games.taktslaget._state(), t = s && s.tasks[s.i];
      if (!t) return null;
      return { kind: t.kind, answer: t.answer, options: t.options, i: s.i, n: s.tasks.length, locked: s.locked, attempt: s.attempt, chord: t.chord };
    });
    // the child's turn in a rhythm task: start, then tap exactly on the beats (plus the calibrated delay) through the test hook
    async function rhythmTurn(shift, realPad) {
      await p.click('.ts-go');
      await p.waitForFunction(() => { const r = Core.games.taktslaget._rt(); return r && (r.phase === 'countin' || r.phase === 'record'); });
      if (realPad) { // a real tap on the drum is registered (during the count-in, so it does not count)
        const before = (await p.evaluate(() => Core.games.taktslaget._rt().taps));
        await p.locator('.ts-pad').dispatchEvent('pointerdown');
        const after = (await p.evaluate(() => Core.games.taktslaget._rt().taps));
        check(after === before + 1, `${tag} a tap on the drum pad is recorded`);
      }
      await p.evaluate((shift) => { const g = Core.games.taktslaget, r = g._rt(); r.expected.forEach(e => g._tapAt(e + (r.offset || 0) + shift)); g._judgeNow(); }, shift);
    }
    async function solve(tk, wrong) {
      if (tk.kind === 'beat' || tk.kind === 'rhythm') return rhythmTurn(wrong ? 330 : 0, false);
      if (tk.kind === 'noteKey' || tk.kind === 'noteName') {
        const v = wrong ? (await p.$$eval('.ts-wk', (ks, a) => ks.map(k => k.getAttribute('data-v')).find(x => x !== a), tk.answer)) : tk.answer;
        await p.click(`.ts-wk[data-v="${v}"]`); return;
      }
      if (tk.kind === 'build') {
        const pcs = tk.answer.split(',').map(Number), keys = [];
        for (const pc of (wrong ? [pcs[0], (pcs[1] + 1) % 12 === 1 ? 2 : pcs[1] + 1, pcs[2]] : pcs)) { const m = [60, 62, 64, 65, 67, 69, 71].find(x => x % 12 === pc) || 72; keys.push(m); }
        for (const m of keys) await p.click(`.ts-wk[data-m="${m}"]`);
        await p.click('.ts-check'); return;
      }
      const v = wrong ? tk.options.find(o => o !== tk.answer) : tk.answer;
      await p.click(`.oj-opt[data-v="${v.replace(/"/g, '\\"')}"]`);
    }
    async function calibrateIfAsked(expectOffset) {
      if (!(await p.$('.ts-cal'))) return false;
      await p.screenshot({ path: `${OUT}/${tag}-calibration.png` });
      await noScroll('calibration');
      await p.click('.ts-cal-go');
      await p.waitForFunction(() => { const r = Core.games.taktslaget._rt(); return r && r.phase === 'calib'; });
      await p.evaluate(() => { const g = Core.games.taktslaget; g._rt().expected.forEach(e => g._tapAt(e + 40)); g._judgeNow(); });
      await p.waitForSelector('.ts-cal-next');
      const d = await gd();
      check(d.offset === expectOffset, `${tag} calibration stored the offset (${d.offset})`);
      await p.screenshot({ path: `${OUT}/${tag}-calibration-done.png` });
      await p.click('.ts-cal-next');
      return true;
    }
    async function playRound(routeIdx, rtag, opts) {
      opts = opts || {};
      await p.click(`.ts-route >> nth=${routeIdx}`);
      await p.waitForSelector('.oj-task, .ts-cal');
      await calibrateIfAsked(40);
      await p.waitForSelector('.oj-task .oj-body');
      if (opts.quiet) { await p.click('.ts-soundbtn'); await p.waitForTimeout(150); check(await p.evaluate(() => Core.setting('sound') === false), `${tag} the sound button turns sound off`); }
      let shot = 0, wrongDone = false;
      for (let guard = 0; guard < 300; guard++) {
        const tk = await cur();
        if (!tk) break;
        const cont = p.locator('.oj-feedback .ts-next');
        if (tk.locked) { if (await cont.count() && await cont.first().isVisible()) await cont.first().click(); else await p.waitForTimeout(200); continue; }
        if (opts.wrongOn === tk.i && !wrongDone && tk.attempt === 0) {
          wrongDone = true;
          await solve(tk, true); await p.waitForTimeout(500);
          const hint = await p.$eval('.oj-feedback', e => e.textContent).catch(() => '');
          check(hint.length > 20, `${tag} ${rtag}: a hint is shown after the first wrong answer (${hint.slice(0, 60)})`);
          if (tk.kind === 'rhythm') { const stx = await p.$eval('.ts-rstatus', e => e.textContent); check(/af/.test(stx), `${tag} rhythm result text (${stx})`); }
          await p.screenshot({ path: `${OUT}/${tag}-${rtag}-wrong.png` });
          continue;
        }
        if (opts.realPad && tk.i === 0 && (tk.kind === 'rhythm' || tk.kind === 'beat')) await rhythmTurn(0, true);
        else await solve(tk, false);
        await p.waitForTimeout(250);
        if (shot < 2 && (tk.i < 2 || opts.shotAll)) { shot++; await p.screenshot({ path: `${OUT}/${tag}-${rtag}-t${tk.i}.png` }); if (shot === 1) await noScroll(rtag + ' task'); }
      }
      await p.waitForSelector('.rs-overlay', { timeout: 10000 });
      await p.waitForTimeout(1700);
      await p.screenshot({ path: `${OUT}/${tag}-${rtag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length);
      if (opts.quiet) await p.evaluate(() => Core.setting('sound', true));
      await p.click('.rs-overlay .btn.ghost');
      await p.waitForSelector('.ts-route');
      return stars;
    }
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band); await p.waitForTimeout(150);
      const ids = await p.$$eval('.ts-route', x => x.map(b => b.getAttribute('data-route')));
      check(ids.length === 6, `${tag} six routes in band ${band}`);
      for (let r = 0; r < ids.length; r++) {
        const id = ids[r], rtag = id;
        const opts = {};
        if (id === 'm-noder') opts.wrongOn = 1;          // one wrong answer: the hint is shown
        if (id === 'm-rytme') { opts.wrongOn = 2; opts.realPad = true; } // one rhythm tapped too late
        if (id === 'm-hoejdyb' || id === 'u-akkord') opts.quiet = true; // played with the sound off
        const stars = await playRound(r, rtag, opts);
        check(stars === 3, `${tag} ${id}: ${stars} stars`);
      }
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map-done.png`, fullPage: true });
      const done = await p.$$eval('.ts-route .star.on', x => x.length);
      check(done === 18, `${tag} map shows the stars (${done})`);
    }
    const d1 = await gd();
    check(Object.keys(d1.routes).length === 12 && Object.values(d1.routes).every(r => r.stars === 3 && r.plays === 1), `${tag} all routes saved with 3 stars`);
    // hub API in the page
    const api = await p.evaluate(() => { const g = Core.games.taktslaget, d = Core.gameData('taktslaget'); return { s: g.summary(d), c: g.collection(d), pr: g.progress(d), q: Core.seeded(7, () => g.quickTask('U', d)), q2: Core.seeded(7, () => g.quickTask('U', d)), rep: g.parentReport(d) }; });
    check(api.s.stars === 18 && api.s.max === 18 && api.c.n === 12 && api.pr.plays === 12 && api.rep.rows.length === 12, `${tag} hub API (${JSON.stringify(api.s)}, ${JSON.stringify(api.c)})`);
    check(api.q.options.indexOf(api.q.answer) >= 0 && JSON.stringify(api.q) === JSON.stringify(api.q2), `${tag} quickTask in the page`);

    // the band (collection)
    await p.click('.ts-bandbtn'); await p.waitForSelector('.ts-member');
    check(await p.$$eval('.ts-member.on', x => x.length) === 12, `${tag} all twelve musicians have joined`);
    await p.screenshot({ path: `${OUT}/${tag}-band.png`, fullPage: true });
    await noScroll('band');
    await p.click('main .topbar .btn.ghost'); await p.waitForSelector('.ts-route');

    // recalibration from the map: skip keeps the old offset
    await p.click('.ts-calbtn'); await p.waitForSelector('.ts-cal');
    await p.click('.ts-cal-skip'); await p.waitForSelector('.ts-route');
    check((await gd()).offset === 40, `${tag} skip keeps the calibration`);

    // sandbox
    await p.click('.ts-sandbtn'); await p.waitForSelector('.ts-seq');
    const visited = await p.evaluate(() => !!(Core.profile().visits || {})['taktslaget:sandbox']);
    check(visited, `${tag} the sandbox visit is recorded`);
    await p.click('.ts-clearall');
    check(await p.$$eval('.ts-cell.on', x => x.length) === 0, `${tag} clear empties the grid`);
    await p.click('.r-kick .ts-cell[data-i="0"]'); await p.click('.r-snare .ts-cell[data-i="2"]'); await p.click('.ts-pen[data-p="5"]'); await p.click('.r-mel .ts-cell[data-i="1"]');
    check(await p.$$eval('.ts-cell.on', x => x.length) === 3, `${tag} cells can be switched on`);
    check((await p.$eval('.r-mel .ts-cell[data-i="1"]', e => e.textContent)) === 'g', `${tag} the melody cell shows the note name`);
    await p.click('.ts-playbtn'); await p.waitForTimeout(700);
    check(await p.$$eval('.ts-cell.now', x => x.length) > 0, `${tag} the playhead moves`);
    await p.click('.ts-faster'); await p.click('.ts-playbtn');
    check((await gd()).song.tempo === 110, `${tag} tempo saved`);
    await p.click('.ts-share');
    const code = await p.$eval('.ts-code', e => e.value);
    check(/^TAKT1:110-8000-2000-0000-0500000000000000-[0-9A-Z]$/.test(code), `${tag} share code (${code})`);
    await p.screenshot({ path: `${OUT}/${tag}-sandbox.png`, fullPage: true });
    await noScroll('sandbox');
    await p.click('.ts-import');
    await p.fill('.ts-import-code', 'TAKT1:100-FFFF-0000-0000-1111111111111111-Q'); await p.click('.ts-import-go');
    check((await p.$eval('.ts-sharebox .error', e => e.textContent)).length > 5, `${tag} a bad code is rejected`);
    const jakob = await p.evaluate(() => TS_MUSIC.encodeSong(TS_MUSIC.preset('jakob')));
    await p.fill('.ts-import-code', jakob); await p.click('.ts-import-go');
    check(await p.$eval('.ts-sbmsg', e => e.textContent.length > 3), `${tag} a good code is loaded`);
    check((await p.$$eval('.r-mel .ts-cell', x => x.map(e => e.textContent).join(''))) === 'cdecc' + 'dece' + 'fg' + 'efg', `${tag} the imported melody is shown`);
    await p.click('.ts-preset[data-preset="bob"]');
    check(await p.$$eval('.r-hat .ts-cell.on', x => x.length) === 16, `${tag} preset loads`);
    // progress and the song survive a reload
    await p.reload(); await p.waitForTimeout(500);
    const d2 = await gd();
    check(d2.song && d2.song.hat.every(x => x) && d2.routes['u-cdur'].stars === 3, `${tag} progress and song saved`);
    // sound off: the sandbox says so and listening tasks show notes instead
    await p.evaluate(() => Core.setting('sound', false));
    await p.goto(URL + '#/spil/taktslaget'); await p.waitForSelector('.ts-route');
    await p.click('.ts-sandbtn'); await p.waitForSelector('.ts-sbquiet');
    await p.click('.ts-sbquiet .btn'); await p.waitForSelector('.ts-seq');
    check(await p.evaluate(() => Core.setting('sound') === true), `${tag} the sandbox can switch the sound on`);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Taktslaget e2e: all ' + checks + ' checks passed (' + SIZES.map(s => s[0]).join(', ') + ')');
  process.exit(errors.length ? 1 : 0);
})();
