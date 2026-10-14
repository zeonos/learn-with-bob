// End-to-end test of Ordbroen, Tidsmaskinen and Netdetektiven through the real UI.
// node tools/e2e-fase2.js <game|all> [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const GAME = process.argv[2] || 'all', SIZE = process.argv[3] || 'all', OUT = process.argv[4] || '/tmp/claude-0/fase2-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SIZES = [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]].filter(s => SIZE === 'all' || s[0] === SIZE);
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }
const rx = s => new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');

const GAMES = {
  ordbroen: { rc: '.ob-route', book: 'Ordbog' },
  tidsmaskinen: { rc: '.tm-route', book: 'Rejsedagbog' },
  netdetektiven: { rc: '.nd-route', book: 'Sagsmappen' }
};

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of SIZES) for (const g of Object.keys(GAMES).filter(x => GAME === 'all' || x === GAME)) {
    const G = GAMES[g], tag = name + '-' + g;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
    await p.goto(URL);
    await p.fill('#pname', 'Sofie'); await p.click('button[type=submit]');
    await p.click(`a[href="#/spil/${g}"]`);
    await p.waitForSelector(G.rc);
    const cur = () => p.evaluate((g) => {
      const s = Core.games[g]._state(), t = s && s.tasks[s.i];
      if (!t) return null;
      const o = { type: t.type, kind: t.kind, answer: t.answer, options: t.options, i: s.i, n: s.tasks.length, locked: s.locked };
      if (g === 'tidsmaskinen' && t.type === 'order') o.order = t.items.map(id => TM_DATA.events.find(e => e.id === id).t);
      if (g === 'ordbroen' && t.type === 'spell') o.us = t.us;
      if (g === 'netdetektiven' && t.type === 'build') { o.good = t.cards.filter(c => !c.personal).map(c => c.w).slice(0, t.n); o.bad = t.cards.find(c => c.personal).w; o.n = t.n; }
      return o;
    }, g);
    const clickOpt = async (tk, v) => {
      if (g === 'netdetektiven') await p.click(`.oj-opt[data-v="${v.replace(/"/g, '\\"')}"]`, { force: true });
      else await p.locator('.oj-opt').filter({ hasText: rx(v) }).first().click({ force: true });
    };
    async function solve(tk, wrong) {
      if (g === 'ordbroen' && tk.type === 'spell') { await p.fill('.oj-input', wrong ? 'xyzzy' : (tk.us && tk.i % 2 ? tk.us : tk.answer)); await p.press('.oj-input', 'Enter'); return; }
      if (g === 'ordbroen' && tk.type === 'build') {
        const words = wrong ? tk.answer.split(' ').reverse() : tk.answer.split(' ');
        for (const wd of words) await p.locator('.ob-cards .ob-card').filter({ hasText: rx(wd) }).first().click();
        return;
      }
      if (g === 'tidsmaskinen' && tk.type === 'order') {
        const seq = wrong ? tk.order.slice().reverse() : tk.order;
        for (const t of seq) await p.locator('.tm-pool .tm-ev').filter({ hasText: rx(t) }).first().click();
        return;
      }
      if (g === 'netdetektiven' && tk.type === 'build') {
        const seq = wrong ? [tk.bad].concat(tk.good.slice(0, tk.n - 1)) : tk.good;
        for (const wd of seq) await p.locator('.nd-word').filter({ hasText: rx(wd) }).first().click();
        await p.click('.nd-body .btn.primary');
        return;
      }
      if (g === 'netdetektiven' && tk.kind === 'mail' && !wrong) { const n = await p.$$eval('.nd-chip', x => x.length); for (let k = 0; k < n; k++) await p.click(`.nd-chip >> nth=${k}`); }
      await clickOpt(tk, wrong ? tk.options.find(o => o !== tk.answer) : tk.answer);
    }
    async function playRound(routeIdx, rtag, wrongOn) {
      await p.click(`${G.rc} >> nth=${routeIdx}`);
      await p.waitForSelector('.oj-task .oj-body');
      let shot = false;
      for (let guard = 0; guard < 400; guard++) {
        const tk = await cur();
        if (!tk) break;
        const cont = p.locator('.oj-feedback .btn.primary');
        if (tk.locked) { if (await cont.count() && await cont.first().isVisible() && await cont.first().isEnabled()) await cont.first().click(); else await p.waitForTimeout(250); continue; }
        if (wrongOn === tk.i && !shot) {
          shot = true;
          await solve(tk, true); await p.waitForTimeout(1000);
          await p.screenshot({ path: `${OUT}/${tag}-${rtag}-wrong.png` });
          continue;
        }
        await solve(tk, false);
        await p.waitForTimeout(350);
        if (rtag && guard < 2) await p.screenshot({ path: `${OUT}/${tag}-${rtag}-ok${guard}.png` });
      }
      await p.waitForSelector('.rs-overlay', { timeout: 8000 });
      await p.waitForTimeout(1600);
      await p.screenshot({ path: `${OUT}/${tag}-${rtag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length);
      await p.click('.rs-overlay .btn.ghost');
      await p.waitForSelector(G.rc);
      return stars;
    }
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band); await p.waitForTimeout(200);
      const n = await p.$$eval(G.rc, x => x.length);
      for (let r = 0; r < n; r++) {
        const wrongOn = r === 0 ? 1 : -1; // one second-try answer in the first route
        const stars = await playRound(r, (band ? 'U' : 'M') + r, wrongOn);
        check(stars >= (wrongOn >= 0 ? 2 : 3), `${tag} ${band ? 'U' : 'M'} route ${r}: ${stars} stars`);
      }
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map.png`, fullPage: true });
      const done = await p.$$eval(G.rc + ' .star.on', x => x.length);
      check(done >= n * 3 - 1, `${tag} map shows the stars (${done})`);
    }
    // collection screen
    await p.click(`button:has-text("${G.book}")`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${tag}-book.png`, fullPage: true });
    const items = await p.evaluate(() => document.querySelectorAll('main li, .oj-chip').length);
    check(items >= 8, `${tag} collection has entries (${items})`);
    // progress survives a reload
    await p.reload(); await p.waitForTimeout(400);
    const kept = await p.evaluate((g) => { const d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /bob/i.test(k)) || '{}')); return JSON.stringify(d).indexOf(g) >= 0; }, g);
    check(kept, `${tag} progress saved`);
    // horizontal scroll check on the play screen
    await p.goto(URL + `#/spil/${g}`); await p.waitForSelector(G.rc);
    await p.click(`${G.rc} >> nth=0`); await p.waitForSelector('.oj-task .oj-body');
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 1, `${tag} no horizontal scroll (${overflow}px)`);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Fase 2 e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
