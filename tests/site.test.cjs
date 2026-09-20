const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('canonical address and install manifest remain within the new app path', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/app\.jehyunlee\.dev\/bakery\/"/);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest')));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(new URL(manifest.start_url, 'https://app.jehyunlee.dev/bakery/manifest.webmanifest').href, 'https://app.jehyunlee.dev/bakery/');
  assert.equal(new URL(manifest.scope, 'https://app.jehyunlee.dev/bakery/manifest.webmanifest').href, 'https://app.jehyunlee.dev/bakery/');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https:|data:|#)/.test(url)) continue;
    assert.equal(url.startsWith('/'), false, url);
    assert.ok(fs.existsSync(path.resolve(root, url.split('?')[0])), url);
  }
});

test('required game art is present', () => {
  for (const name of ['bakery-background.webp', 'bakery-characters.webp', 'family-characters.png', 'jeongan-happy.webp']) {
    assert.ok(fs.statSync(path.join(root, 'assets', name)).size > 1000);
  }
});

test('rotation questions, scoring and ten-stage completion still work', async () => {
  const { BakeryGame, applyInstructions, sameOrientation } = await import('../engine.js');
  const game = new BakeryGame(() => .42);
  game.setDifficulty('beginner');
  for (let stage = 1; stage <= 10; stage++) {
    game.beginStage();
    for (let count = 0; count < 20; count++) {
      const q = game.active;
      assert.ok(q);
      const answer = applyInstructions(q.initial, q.instructions);
      assert.equal(q.candidates.filter(candidate => sameOrientation(candidate, answer)).length, 1);
      assert.equal(game.choose(q.correctIndex), true);
      assert.equal(game.choose(q.correctIndex), false);
      game.tick(12);
      assert.equal(q.result, 'success');
      game.tick(1);
    }
    assert.equal(game.phase, 'tasting');
    assert.equal(game.score, 20);
    game.advance();
  }
  assert.equal(game.phase, 'complete');
});
