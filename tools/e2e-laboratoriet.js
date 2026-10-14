// End-to-end test of Laboratoriet through the real UI: node tools/e2e-laboratoriet.js [url] [outdir] [sizes]
const { chromium } = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../index.html');
const OUT = process.argv[3] || '/tmp/claude-0/lab-shots';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]]) {
    if (ONLY && ONLY.indexOf(name) < 0) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(name + ' console: ' + m.text()); });
    await p.goto(URL);
    await p.fill('#pname', 'Ida'); await p.click('button[type=submit]');
    await p.click('a[href="#/spil/laboratoriet"]');
    await p.waitForSelector('.lab-route');
    const cur = () => p.evaluate(() => {
      const s = Core.games.laboratoriet._state(), t = s && s.tasks[s.i]; if (!t) return null;
      const sc = t.scene || {};
      return { type: t.type, gen: t.gen, i: s.i, answer: t.answer, explain: t.explain && t.explain.answer, items: t.items, bins: t.bins, sol: t.solution, scene: sc, done: !!s.done };
    });
    const opt = (sel, text) => p.locator(sel).filter({ hasText: new RegExp('^' + esc(text) + '$') }).first();
    async function tapSlot(sl) { await p.locator(`[data-slot="${sl}"]`).click({ force: true }); }
    async function tapPeg(pos, max) { await p.locator('.lab-peghit').nth(pos < 0 ? pos + max : pos + max - 1).click({ force: true }); }

    async function solve(tk, wrong) {
      if (tk.type === 'poe') {
        const opts = await p.$$eval('.lab-opt', bs => bs.map(b => b.textContent));
        await opt('.lab-opt', wrong ? opts.find(o => o !== tk.answer) : tk.answer).click();
        await p.waitForSelector('.lab-stage-h >> nth=1', { timeout: 15000 });
        if (wrong) { const eo = await p.$$eval('.lab-options.col .lab-opt', bs => bs.map(b => b.textContent)); await opt('.lab-options.col .lab-opt', eo.find(o => o !== tk.explain)).click(); }
        await opt('.lab-options.col .lab-opt', tk.explain).click();
      } else if (tk.type === 'mc') {
        if (wrong) { const os = await p.$$eval('.lab-opt', bs => bs.map(b => b.textContent)); await opt('.lab-opt', os.find(o => o !== tk.answer)).click(); }
        await opt('.lab-opt', tk.answer).click();
      } else if (tk.type === 'calc') {
        if (wrong) { await p.fill('.lab-input', '999'); await p.click('.lab-calc .btn'); }
        await p.fill('.lab-input', String(tk.answer).replace('.', ',')); await p.click('.lab-calc .btn');
      } else if (tk.type === 'order') {
        if (wrong) { for (const it of tk.items.slice().reverse()) await opt('.lab-cards .lab-card-btn', it.name).click(); await p.click('.lab-test'); await p.waitForTimeout(1400); }
        for (const it of tk.items) { const inSlot = await p.locator('.lab-slots .lab-card-btn').filter({ hasText: new RegExp('^' + esc(it.name) + '$') }).count(); if (!inSlot) await opt('.lab-cards .lab-card-btn', it.name).click(); }
        await p.click('.lab-test');
      } else if (tk.type === 'sort') {
        for (let k = 0; k < tk.items.length; k++) {
          const nm = await p.$eval('.lab-sortcard strong', e => e.textContent), it = tk.items.find(x => x.name === nm);
          const bin = tk.bins.find(b => b.id === (wrong && k === 0 ? tk.bins.find(x => x.id !== it.bin).id : it.bin));
          await opt('.lab-binbtn', bin.name).click();
        }
      } else if (tk.type === 'build') {
        const sc = tk.scene;
        if (sc.kind === 'board') {
          if (wrong) { await p.click('.lab-test'); await p.waitForTimeout(300); }
          for (let k = 0; k < tk.sol.add.length; k++) {
            const ty = (tk.sol.types && tk.sol.types[k]) || tk.sol.type || 'wire';
            const label = { wire: 'Ledning', bulb: 'Pære', switch: 'Kontakt' }[ty];
            await p.locator('.lab-tool').filter({ hasText: label }).first().click();
            await tapSlot(tk.sol.add[k]);
          }
          await p.click('.lab-test');
        } else if (sc.kind === 'lever') {
          const sol = Array.isArray(tk.answer) ? tk.answer : [tk.answer];
          if (wrong) { // put everything on peg 5 first, test, then take the weights off again
            for (let k = 0; k < sc.tray.length; k++) { await p.locator('.lab-tools .lab-tool').first().click(); await tapPeg(5, 5); }
            await p.click('.lab-test'); await p.waitForTimeout(1100);
            for (let k = 0; k < sc.tray.length; k++) await p.locator('.lab-wgt:not(.locked)').first().click({ force: true });
          }
          for (let k = 0; k < sc.tray.length; k++) { await p.locator('.lab-tools .lab-tool').filter({ hasText: new RegExp('^' + sc.tray[k] + ' kg$') }).first().click(); await tapPeg(sol[k], 5); }
          await p.click('.lab-test'); await p.waitForTimeout(1000);
        } else if (sc.kind === 'boat') {
          for (let k = 0; k < tk.answer + (wrong ? 2 : 0); k++) await p.click('.lab-step >> nth=1');
          if (wrong) { await p.click('.lab-test'); await p.waitForTimeout(1900); await p.click('.lab-step >> nth=0'); await p.click('.lab-step >> nth=0'); }
          await p.click('.lab-test'); await p.waitForTimeout(1200);
        } else if (sc.kind === 'thermo') {
          const v = sc.goal === 'koge' ? 100 : sc.goal === 'smelte' ? 20 : -10;
          await p.$eval('.lab-range', (r, v) => { r.value = v; r.dispatchEvent(new Event('input')); }, v);
          await p.click('.lab-test'); await p.waitForTimeout(2600);
        } else if (sc.kind === 'titration') {
          if (wrong) { await p.click('.lab-tool >> nth=0'); await p.click('.lab-test'); }
          for (let k = 0; k < Math.floor(tk.answer / 5); k++) await p.click('.lab-tool >> nth=1');
          for (let k = 0; k < tk.answer % 5; k++) await p.click('.lab-tool >> nth=0');
          await p.click('.lab-test');
        }
      }
    }
    async function playRound(idx, tag, wrongOn) {
      let expSum = 0;
      await p.click(`.lab-route >> nth=${idx}`);
      await p.waitForSelector('.lab-play');
      for (let guard = 0; guard < 8; guard++) {
        const tk = await cur(); if (!tk) break;
        const wr = wrongOn.indexOf(tk.i) >= 0;
        expSum += !wr ? 1 : tk.type === 'poe' ? 0.25 : 0.5;
        await solve(tk, wr);
        await p.waitForSelector('.lab-next', { timeout: 15000 }).catch(() => {});
        const done = await p.$('.lab-next');
        check(done, `${name} ${tag} task ${tk.i} (${tk.gen}) did not finish`);
        if (!done) { await p.screenshot({ path: `${OUT}/${name}-${tag}-FAIL-${tk.i}.png` }); break; }
        if (guard === 0 || wrongOn.indexOf(tk.i) >= 0) await p.screenshot({ path: `${OUT}/${name}-${tag}-${tk.i}-${tk.gen}.png` });
        await p.click('.lab-next');
      }
      await p.waitForSelector('.rs-overlay', { timeout: 8000 });
      await p.waitForTimeout(1600);
      await p.screenshot({ path: `${OUT}/${name}-${tag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length), acc = expSum / 6, expectStars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0;
      check(stars === expectStars, `${name} ${tag}: ${stars} stars, expected ${expectStars}`);
      await p.click('text=Til oversigten'); await p.waitForSelector('.lab-route');
      return stars;
    }
    // every route; a mistake on one task still gives 3 stars only if the round stays ≥ 90 %
    const M = name === 'desktop' ? [[0, 'm-tank', [0], 3], [1, 'm-board', [0], 3], [2, 'm-lever', [1], 3], [3, 'm-kitchen', [], 3], [4, 'm-eco', [2], 3]] : [[0, 'm-tank', [], 3], [1, 'm-board', [], 3], [4, 'm-eco', [], 3]];
    const U = name === 'desktop' ? [[0, 'u-tank', [3], 3], [1, 'u-board', [1], 3], [2, 'u-lever', [], 3], [3, 'u-kitchen', [2], 3], [4, 'u-eco', [], 3]] : [[1, 'u-board', [], 3], [3, 'u-kitchen', [], 3]];
    // with one mistake: POE wrong guess + wrong first explanation = 0.25 → 5.25/6 = 0.875 → 2 stars; build/calc/mc/order wrong first = 0.5 → 5.5/6 → 3 stars
    for (const r of M) await playRound(...r.slice(0, 3));
    await p.click('.seg >> nth=1'); await p.waitForTimeout(200);
    for (const r of U) await playRound(...r.slice(0, 3));
    // logbook and sandbox
    await p.click('text=Logbog'); await p.waitForSelector('.lab-fact');
    check(await p.$$eval('.lab-fact', x => x.length) >= 10, name + ' logbook has discoveries');
    await p.screenshot({ path: `${OUT}/${name}-logbook.png`, fullPage: true });
    await p.click('text=Tilbage'); await p.waitForSelector('.lab-route');
    const sb = await p.$$eval('.lab-sandbtn:not(.locked)', x => x.length);
    check(sb >= (name === 'desktop' ? 5 : 3), name + ' sandbox stations unlocked: ' + sb);
    for (let k = 0; k < sb; k++) {
      await p.click(`.lab-sandbtn:not(.locked) >> nth=${k}`); await p.waitForSelector('.lab-play.sandbox');
      const nt = await p.locator('.lab-panel .lab-tool').count();
      for (let q = 0; q < Math.min(6, nt); q++) { await p.locator('.lab-panel .lab-tool').nth(q).click(); await p.waitForTimeout(150); }
      if (await p.$('.lab-slot')) { await p.locator('[data-slot="h:0:0"]').click({ force: true }); await p.locator('[data-slot="v:0:3"]').click({ force: true }); }
      if (await p.$('.lab-peghit')) { await p.locator('.lab-peghit').nth(2).click({ force: true }); }
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}/${name}-sandbox-${k}.png` });
      await p.click('.rs-hud .rs-iconbtn'); await p.waitForSelector('.lab-route');
    }
    await p.screenshot({ path: `${OUT}/${name}-menu.png`, fullPage: true });
    await p.goto(URL + '#/hjem'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${name}-hub.png` });
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'Laboratoriet e2e: all OK');
  process.exit(errors.length ? 1 : 0);
})();
