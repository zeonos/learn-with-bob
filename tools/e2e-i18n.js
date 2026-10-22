// End-to-end test of the language groundwork (Phase 6) in a real browser:
// Danish by default (also on an English browser while English is not ready), ?lang=en as a preview, players keep their
// language, switching player or language opens the page in the right language, and the parent page can change it.
// node tools/e2e-i18n.js [outdir]
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '/tmp/claude-0/i18n-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  async function page(locale) {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 }, locale });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(locale + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/i.test(m.text())) errors.push(locale + ' console: ' + m.text()); });
    return { ctx, p };
  }
  const lang = p => p.evaluate(() => document.documentElement.lang);
  async function newPlayer(p, name) {
    await p.waitForSelector('#pname');
    await p.fill('#pname', name); await p.click('button[type=submit]'); await p.waitForSelector('.game-card');
  }

  // 1. A Danish browser: Danish, no picker, no preview note, the player is Danish
  {
    const { ctx, p } = await page('da-DK');
    await p.goto(URL);
    check(await lang(p) === 'da', 'Danish browser: <html lang="da">');
    check(await p.locator('.lang-pick').count() === 0, 'Danish browser: no language picker while English is not ready');
    check(await p.locator('.lang-preview').count() === 0, 'Danish browser: no preview note');
    await newPlayer(p, 'Sofie');
    check(await p.evaluate(() => Core.profile().lang) === 'da', 'a new player on a Danish page is Danish');
    check(await p.evaluate(() => Core.fmt.num(1234.5)) === '1.234,5', 'Danish numbers');
    await ctx.close();
  }
  // 2. An English browser gets Danish too, until English is ready
  {
    const { ctx, p } = await page('en-US');
    await p.goto(URL);
    const ready = await p.evaluate(() => I18N.info('en').ready);
    check(await lang(p) === (ready ? 'en-US' : 'da'), 'English browser: English only when it is ready');
    await ctx.close();
  }
  // 3. The preview link, two players with different languages, switching, and the parent page
  {
    const { ctx, p } = await page('da-DK');
    await p.goto(URL);
    await newPlayer(p, 'Sofie'); // Danish
    await p.goto(URL + '?lang=en#/spillere');
    check(await lang(p) === 'en-US', '?lang=en opens the English preview');
    check(await p.locator('.lang-preview').count() === 1, 'the preview note is shown');
    await p.screenshot({ path: `${OUT}/preview-players.png` });
    check(await p.locator('.lang-pick .seg').count() === 2, 'the picker offers Dansk and English in the preview');
    check(await p.locator('.lang-pick .seg.sel').textContent() === 'English', 'English is selected');
    await p.click('text=+ ');
    await newPlayer(p, 'Mia');
    check(await p.evaluate(() => Core.profile().lang) === 'en', 'a new player on an English page is English');
    check(await p.evaluate(() => [Core.fmt.num(1234.5), Core.fmt.money(4.5), Core.lang()].join('|')) === '1,234.5|$4.50|en', 'English numbers and money');
    check(await p.evaluate(() => Core.sources({ js: ['g/strings-da.js', 'g/game.js'], langs: ['da', 'en'] }).join()) === 'g/strings-da.js,g/strings-en.js,g/game.js', 'English games load strings-en.js');
    // reload without the link: Mia's language (English) stays
    await p.goto(URL + '#/hjem'); await p.waitForSelector('.game-card');
    check(await lang(p) === 'en-US', 'reloading keeps the English player in English');
    // a game still opens (its texts are Danish until it is translated)
    await p.click('a[href="#/spil/labyrinten"]'); await p.waitForSelector('.lb-route');
    check(true, 'a game opens in the English preview');
    // choosing the Danish player from the list opens the page in Danish
    await p.goto(URL + '#/spillere'); await p.waitForSelector('.profile-card');
    await Promise.all([p.waitForNavigation(), p.click('.profile-card:has-text("Sofie")')]);
    await p.waitForSelector('.game-card');
    check(await lang(p) === 'da' && await p.evaluate(() => Core.profile().name) === 'Sofie', 'choosing the Danish player switches to Danish');
    check(await p.locator('.lang-preview').count() === 0, 'no preview note in Danish');
    // and back to Mia: English again
    await p.goto(URL + '#/spillere'); await p.waitForSelector('.profile-card');
    await Promise.all([p.waitForNavigation(), p.click('.profile-card:has-text("Mia")')]);
    await p.waitForSelector('.game-card');
    check(await lang(p) === 'en-US' && await p.evaluate(() => Core.profile().name) === 'Mia', 'choosing the English player switches to English');
    // the parent page: a language setting per player; changing Mia to Danish opens the page in Danish
    await p.goto(URL + '#/voksne');
    await p.waitForSelector('#gate'); const q = await p.textContent('label[for=gate]'); const m = q.match(/(\d+)\D+(\d+)/);
    await p.fill('#gate', String(m[1] * m[2])); await p.click('button[type=submit]');
    await p.waitForSelector('.settings select');
    check(await p.locator('.settings select[aria-label]').count() >= 4, 'each player has a language setting (and a track setting)');
    await p.screenshot({ path: `${OUT}/preview-parents.png`, fullPage: true });
    const sel = p.locator('section.card:has(h2:text-is("Mia")) select').nth(1);
    await Promise.all([p.waitForNavigation(), sel.selectOption('da')]);
    await p.waitForTimeout(300);
    check(await lang(p) === 'da' && await p.evaluate(() => Core.profile().lang) === 'da', 'the parent page changes a player to Danish and the page follows');
    // the picker on the player screen switches the device language when the list is shown
    await p.goto(URL + '?lang=en#/spillere'); await p.waitForSelector('.lang-pick');
    await Promise.all([p.waitForNavigation(), p.click('.lang-pick .seg:has-text("Dansk")')]);
    await p.waitForSelector('.profile-card');
    check(await lang(p) === 'da' && (await p.evaluate(() => location.search)) === '', 'Dansk in the picker goes back to Danish and drops ?lang=');
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'i18n e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
