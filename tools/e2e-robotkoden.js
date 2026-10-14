// End-to-end test of Robotkoden through the real UI: node tools/e2e-robotkoden.js [url] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../index.html');
const OUT = process.argv[3] || '/tmp/claude-0/rk-shots';
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
    await p.fill('#pname', 'Theo'); await p.click('button[type=submit]');
    await p.waitForSelector('a[href="#/spil/robotkoden"]');
    await p.click('a[href="#/spil/robotkoden"]');
    await p.waitForSelector('.rk-lvl');
    const st = () => p.evaluate(() => { const s = Core.games.robotkoden._state(); return s && { blocks: RK.countProgram(s.prog), running: s.running, lvl: s.lvl.id }; });
    const level = id => p.evaluate(id => Core.games.robotkoden._start(id), id);
    const pal = t => p.click(`.rk-pal[data-type=${t}]`);
    async function runAndWait() {
      await p.click('.rk-run');
      await p.waitForFunction(() => !Core.games.robotkoden._state().running, null, { timeout: 30000 });
      await p.waitForTimeout(900);
    }
    async function resultStars() { const o = await p.$('.rs-overlay'); if (!o) return 0; return p.$$eval('.rs-result-stars .star.on', x => x.length); }
    async function closeOverlay() { const o = await p.$('.rs-overlay'); if (o) await p.evaluate(() => document.querySelector('.rs-overlay').remove()); }

    // turn on fast mode
    await p.click('.rk-lvl >> nth=0');
    await p.click('text=Rolig');
    // 1-1 by tapping
    for (let i = 0; i < 4; i++) await pal('frem');
    await runAndWait(); await p.waitForTimeout(1200);
    check(await resultStars() === 3, name + ' 1-1 three stars');
    await p.screenshot({ path: `${OUT}/${name}-1-1-result.png` });
    await p.click('text=Næste bane');
    // 1-2 drag and drop from the palette
    const from = await p.$('.rk-pal[data-type=frem]'), to = await p.$('.rk-slot.end');
    const a = await from.boundingBox(), b = await to.boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
    await p.mouse.move(a.x + 40, a.y + 60, { steps: 5 }); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await p.screenshot({ path: `${OUT}/${name}-drag.png` });
    await p.mouse.up();
    check((await st()).blocks === 1, name + ' drag from palette inserts a block (got ' + (await st()).blocks + ')');
    // drag the block back onto the palette to delete it
    const grip = await p.$('.rk-block .rk-grip'), g = await grip.boundingBox(), pb = await (await p.$('.rk-palette')).boundingBox();
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down();
    await p.mouse.move(g.x + 30, g.y - 30, { steps: 4 }); await p.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2, { steps: 8 }); await p.mouse.up();
    check((await st()).blocks === 0, name + ' drag to palette deletes');
    // 2-1 loop through the UI: Gentag puts the cursor inside, then Frem; count 3 → 8
    await level('2-1');
    await pal('gentag'); await pal('frem');
    for (let i = 0; i < 5; i++) await p.click('[aria-label="Flere"]');
    await pal('frem'); await pal('frem'); // third is allowed (limit 3), fourth is refused
    check((await st()).blocks === 3, name + ' limit refuses the 4th block (got ' + (await st()).blocks + ')');
    await p.click('.rk-block.t-frem >> nth=1'); await p.click('[aria-label="Fjern blok"]');
    await runAndWait(); await p.waitForTimeout(1000);
    check(await resultStars() === 3, name + ' 2-1 loop solution three stars');
    await closeOverlay();
    // 4-2 conditions: Gentag indtil → Hvis → Frem, ellers → Drej højre
    await level('4-2');
    await pal('indtil'); await pal('hvis'); await pal('frem');
    await p.click('.rk-slot[data-path$=".ellers"]'); await pal('hojre');
    await p.screenshot({ path: `${OUT}/${name}-4-2-program.png` });
    await runAndWait(); await p.waitForTimeout(1000);
    check(await resultStars() === 3, name + ' 4-2 condition solution three stars');
    await p.screenshot({ path: `${OUT}/${name}-4-2-result.png` });
    await closeOverlay();
    // code view
    await p.click('text=Vis som kode');
    const code = await p.textContent('.rk-code');
    check(/while \(!vedMålet\(\)\)/.test(code) && /if \(vejFrem\(\)\)/.test(code), name + ' code view shows while/if');
    await p.screenshot({ path: `${OUT}/${name}-code.png` });
    await p.click('text=Vis blokke');
    // 5-3 function
    await level('5-3');
    await p.click('.rk-slot[data-path="f"]');
    for (const t of ['frem', 'frem', 'hojre', 'frem', 'frem', 'venstre']) await pal(t);
    await p.click('.rk-slot[data-path="main"]');
    for (const t of ['kald', 'hojre', 'kald']) await pal(t);
    await p.screenshot({ path: `${OUT}/${name}-5-3-program.png` });
    await runAndWait(); await p.waitForTimeout(1000);
    check(await resultStars() === 3, name + ' 5-3 function solution three stars');
    await closeOverlay();
    // debugging level starts with the buggy program
    await level('3-1');
    check((await st()).blocks === 5, name + ' 3-1 starts with 5 blocks');
    // three failures → Bob offers his solution → 1 star
    await level('1-3');
    await pal('frem');
    for (let i = 0; i < 3; i++) await runAndWait();
    check(await p.isVisible('.rk-help-btn'), name + ' solution offered after 3 failed runs');
    await p.screenshot({ path: `${OUT}/${name}-help.png` });
    await p.click('.rk-help-btn');
    await runAndWait(); await p.waitForTimeout(800);
    check(await resultStars() === 1, name + ' solution reveal gives one star');
    await closeOverlay();
    // level builder + share code
    await p.evaluate(() => { location.hash = '#/hjem'; }); await p.waitForTimeout(200);
    await p.evaluate(() => { location.hash = '#/spil/robotkoden'; }); await p.waitForSelector('.rk-lvl');
    await p.screenshot({ path: `${OUT}/${name}-map.png`, fullPage: true });
    await p.click('text=Byg din egen bane');
    await p.click('.rk-board.editor .rk-tile >> nth=19'); // a wall in the middle (row 2, col 3)
    await p.screenshot({ path: `${OUT}/${name}-editor.png`, fullPage: true });
    await p.click('text=Del banen');
    const shared = await p.inputValue('.rk-share textarea');
    check(/^RK1-/.test(shared), name + ' share code created');
    await p.click('text=Prøv banen');
    for (let i = 0; i < 5; i++) await pal('frem');
    await runAndWait(); await p.waitForTimeout(800);
    check(await resultStars() >= 1, name + ' home-made level playable');
    await p.click('text=Tilbage til byggeren');
    await p.click('button:has-text("Tilbage")');
    await p.click('text=Spil en delt bane');
    await p.fill('textarea', shared); await p.click('button:has-text("Spil")');
    check((await st()).lvl === 'egen', name + ' shared level loads');
    // parent page lists Robotkoden
    await p.goto(URL.split('#')[0] + '#/voksne');
    const q = await p.textContent('label[for=gate]'), m = q.match(/(\d+) · (\d+)/);
    await p.fill('#gate', String(m[1] * m[2])); await p.keyboard.press('Enter');
    await p.waitForSelector('table');
    check((await p.textContent('main')).includes('Robotkoden'), name + ' parent page shows Robotkoden');
    await p.screenshot({ path: `${OUT}/${name}-parents.png`, fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'ROBOTKODEN E2E OK – no errors');
  process.exit(errors.length ? 1 : 0);
})();
