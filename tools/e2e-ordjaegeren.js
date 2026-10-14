// End-to-end test of Ordjægeren through the real UI: node tools/e2e-ordjaegeren.js [url] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../index.html');
const OUT = process.argv[3] || '/tmp/claude-0/oj-shots';
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(name + ' console: ' + m.text()); });
    await p.goto(URL);
    await p.fill('#pname', 'Sofie'); await p.click('button[type=submit]');
    await p.click('a[href="#/spil/ordjaegeren"]');
    await p.waitForSelector('.oj-route');
    const cur = () => p.evaluate(() => { const s = Core.games.ordjaegeren._state(); const t = s && s.tasks[s.i]; return t ? { type: t.type, answer: t.answer, options: t.options, i: s.i, n: s.tasks.length, locked: s.locked } : null; });

    async function solve(tk, wrongFirst) {
      if (wrongFirst) {
        if (tk.type === 'lyt') { await p.fill('.oj-input', 'xyz'); await p.click('button:has-text("Tjek")'); }
        else if (tk.type === 'sorter') { const other = ['navneord', 'udsagnsord', 'tillaegsord'].find(x => x !== tk.answer); await p.click('.bin-' + other); }
        else if (tk.type === 'komma') { await p.click(`.oj-kgap >> nth=${tk.answer === 0 ? 1 : 0}`); }
        else { const wrong = tk.options.find(o => o !== tk.answer); await p.locator('.oj-opt').filter({ hasText: new RegExp('^' + wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click({ force: true }); } // exact text: a wrong option can be part of the right one
        await p.waitForTimeout(300);
      }
      if (tk.type === 'lyt') { await p.fill('.oj-input', tk.answer); await p.click('button:has-text("Tjek")'); }
      else if (tk.type === 'sorter') await p.click('.bin-' + tk.answer);
      else if (tk.type === 'komma') await p.click(`.oj-kgap >> nth=${tk.answer}`);
      else await p.locator('.oj-opt').filter({ hasText: new RegExp('^' + tk.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click({ force: true });
    }
    async function playRound(routeIdx, tag, wrongOn) {
      await p.click(`.oj-route >> nth=${routeIdx}`);
      await p.waitForSelector('.oj-task .oj-body');
      for (let guard = 0; guard < 40; guard++) {
        const tk = await cur();
        if (!tk) break;
        if (tk.locked) { await p.waitForTimeout(250); continue; }
        if (tk.type === 'lyt') await p.waitForTimeout(3000); // the word is shown, then hidden (no Danish voice in the test browser)
        await solve(tk, wrongOn === tk.i);
        if (wrongOn === tk.i) await p.screenshot({ path: `${OUT}/${name}-${tag}-rule.png` });
        await p.waitForTimeout(1700);
      }
      await p.waitForSelector('.rs-overlay', { timeout: 8000 });
      await p.waitForTimeout(1600);
      await p.screenshot({ path: `${OUT}/${name}-${tag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length);
      await p.click('text=Til kortet');
      return stars;
    }
    // Mellemtrin: spelling round with one mistake (second try), sorting, gap
    check(await playRound(0, 'fang', 2) === 3, name + ' fang round: 3 stars with one second-try answer');
    check(await playRound(3, 'sorter') === 3, name + ' sorter round 3 stars');
    check(await playRound(4, 'gap') === 3, name + ' gap round 3 stars');
    check(await playRound(7, 'lyt') === 3, name + ' lyt round 3 stars');
    // practice list appears after a mistake
    check(await p.isVisible('.oj-practice'), name + ' practice list offered');
    await p.screenshot({ path: `${OUT}/${name}-map.png`, fullPage: true });
    // notebook shows found words
    await p.click('button:has-text("Feltbog")');
    const nb = await p.$$eval('.oj-chip', x => x.length);
    check(nb >= 15, name + ' notebook has words (' + nb + ')');
    await p.click('.oj-chip >> nth=0');
    await p.screenshot({ path: `${OUT}/${name}-notebook.png`, fullPage: true });
    await p.click('button:has-text("Tilbage")');
    // Udskoling: comma and idioms
    await p.click('.seg >> nth=1');
    check(await playRound(6, 'komma') === 3, name + ' komma round 3 stars');
    check(await playRound(7, 'udtryk') === 3, name + ' udtryk round 3 stars');
    // a wrong answer twice shows the answer and the rule
    await p.click('.oj-route >> nth=3'); await p.waitForSelector('.oj-opt');
    let tk = await cur(); const wrong = tk.options.find(o => o !== tk.answer);
    await p.locator('.oj-opt').filter({ hasText: new RegExp('^' + wrong + '$') }).first().click({ force: true }); await p.waitForTimeout(250);
    check(await p.isVisible('.oj-rule'), name + ' rule shown after first mistake');
    // second wrong: the remaining wrong option is disabled after the first try, so test via a second distinct wrong only if available
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'ORDJÆGEREN E2E OK – no errors');
  process.exit(errors.length ? 1 : 0);
})();
