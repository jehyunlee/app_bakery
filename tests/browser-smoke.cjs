const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  try {
    const response = await page.goto(process.env.BAKERY_URL || 'http://127.0.0.1:4175/');
    assert.equal(response.status(), 200);
    assert.equal(await page.title(), '엉뚱한 제과점');
    await page.waitForFunction(() => !document.querySelector('input[name="player"]').disabled);
    await page.locator('label.family-option').filter({ has: page.locator('input[value="dad"]') }).click();
    await page.locator('label.difficulty-option').filter({ has: page.locator('input[value="beginner"]') }).click();
    await page.locator('#start-button').click();
    await page.waitForFunction(() => document.querySelector('#instruction-steps').textContent.trim().length > 0);
    await page.waitForFunction(() => document.querySelector('#stage-intro').classList.contains('hidden'));
    await page.locator('[data-answer="0"]').click();
    await page.waitForFunction(() => Number(document.querySelector('#question-number').textContent) >= 2);
    await page.locator('#pause-button').click();
    await page.waitForFunction(() => !document.querySelector('#overlay').classList.contains('hidden'));
    const manifestResponse = await page.request.get(new URL('manifest.webmanifest', page.url()).href);
    assert.equal(manifestResponse.status(), 200);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.scope, './');
    assert.equal(manifest.start_url, './');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: '/tmp/bakery-published.png' });
    console.log('PASS: bakery assets, player/difficulty selection, timed rotation puzzle, answer progression, pause and install manifest.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
