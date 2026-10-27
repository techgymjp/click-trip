// ストア用のスクリーンショットと App Store のヘッダ画像を撮る（開発用）
// 使い方: npm run build のあと、リポジトリのルートで python3 -m http.server 8765 を起動してから
//   node tools/store-screenshots.js play ja-JP ja   … Google Play 用（1080 × 1920）→ docs/store/
//   node tools/store-screenshots.js ios  en-US en   … App Store 用（1206 × 2622）→ docs/store/ios/6.3inch/
//   node tools/store-screenshots.js art             … App Store のヘッダ・検索結果 → docs/store/ios/
// ※ Playwright（Chromium）と Python の Pillow が必要。Playwright の場所は環境変数 PLAYWRIGHT で指定できる
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const ROOT = path.join(__dirname, '..');
const BASE = 'http://localhost:8765';
const [target, locale = 'ja-JP', lang = 'ja'] = process.argv.slice(2);

async function shots() {
  const ios = target === 'ios';
  const OUT = path.join(ROOT, ios ? 'docs/store/ios/6.3inch' : 'docs/store');
  fs.mkdirSync(OUT, { recursive: true });
  const name = (play, app) => path.join(OUT, `${lang}-${ios ? app : play}.png`);
  const b = await chromium.launch();
  const ctx = await b.newContext(ios
    ? { viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale }
    : { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, locale });
  const p = await ctx.newPage();
  // アプリと同じ見た目（共有ボタンが 1 つ）にするため、Capacitor があるふりをする
  await p.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, Plugins: { Share: { share: async () => {} }, App: { addListener() {}, exitApp() {} } } };
  });
  await p.goto(BASE + '/www/');
  await p.waitForTimeout(600);
  if (!ios) await p.screenshot({ path: name('1-start') });

  // 京都を旅している途中のセーブデータを作る
  const spots = await p.evaluate(() => fetch('data/spots.json').then((r) => r.json()));
  const kin = spots.find((s) => s.name.includes('金閣'));
  const visited = {};
  for (const s of spots.filter((s) => s.pref === '京都府' && !/金閣|大徳寺/.test(s.name)).slice(0, 9)) visited[s.id] = Date.now() - 86400000 * 3;
  for (const s of spots.filter((s) => ['北海道', '長野県', '広島県', '沖縄県', '熊本県', '青森県'].includes(s.pref)).filter((_, i) => i % 9 === 0)) visited[s.id] = Date.now() - 86400000 * 20;
  const route = [[35.68, 139.77], [35.36, 138.73], [35.17, 136.9], [35.01, 135.77], [34.39, 132.45], [33.59, 130.4]];
  const pos = { lat: kin.lat - 3.1 / 111.2, lon: kin.lon + 0.004 };
  const save = { v: 1, mode: 'gps', startedAt: Date.now() - 86400000 * 30, pos, gps: { ...pos, acc: 10, t: Date.now() }, tank: 3.1,
    stats: { real: 842.5, game: 1630.2, moves: 57, measures: 120 }, visited, path: route, range: 'auto' };
  await p.evaluate((s) => localStorage.setItem('clicktrip.save.v1', JSON.stringify(s)), save);
  await p.reload();
  await p.waitForTimeout(900);

  // レーダーで金閣寺のマスに照準を合わせる
  const box = await p.locator('#scope').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await p.mouse.move(cx, cy + 20);
  await p.mouse.down();
  await p.mouse.move(cx - 8, cy - 70, { steps: 5 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: name('2-radar', '1-radar') });
  await p.mouse.up();
  await p.waitForTimeout(2600);

  // 到着画面
  await p.evaluate(() => { document.querySelector('#arrival .sheet').scrollTop = 0; });
  await p.screenshot({ path: name('3-arrival', '2-arrival') });
  if (!ios) {
    // 縦に短い Google Play 用はクイズの部分も撮る（iPhone の画面では到着画面に収まっている）
    await p.evaluate(() => document.querySelector('#arrival .quiz').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(200);
    await p.screenshot({ path: name('4-quiz') });
  }
  await p.click('#arr-close');
  await p.waitForTimeout(300);

  await p.click('.tabs button[data-view=map]');
  await p.waitForTimeout(400);
  await p.screenshot({ path: name('5-map', '4-map') });
  await p.click('.tabs button[data-view=log]');
  await p.waitForTimeout(400);
  await p.screenshot({ path: name('6-log', '3-log') });
  await b.close();
}

// App Store のヘッダ（3840 × 1646）と検索結果（3840 × 2560）。文字は入れない（App Store がアプリ名を重ねる）
async function art() {
  const OUT = path.join(ROOT, 'docs/store/ios');
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const [mode, h, file, outH] of [['header', 549, 'appstore-header-3840x1646.png', 1646], ['search', 854, 'appstore-search-3840x2560.png', 2560]]) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: h }, deviceScaleFactor: 3 })).newPage();
    await p.goto(BASE + '/tools/store-compose.html');
    await p.evaluate((m) => window.compose(m), mode);
    await p.waitForTimeout(400);
    const raw = path.join(OUT, '_raw.png');
    await p.screenshot({ path: raw });
    // 撮った画像（3840 × 1647 / 2562）の中央を切り出す
    execFileSync('python3', ['-c', [
      'import sys',
      'from PIL import Image',
      'im = Image.open(sys.argv[1]).convert("RGB")',
      'h = int(sys.argv[3]); t = (im.size[1] - h) // 2',
      'im.crop((0, t, 3840, t + h)).save(sys.argv[2])',
    ].join('\n'), raw, path.join(OUT, file), String(outH)]);
    fs.unlinkSync(raw);
  }
  await b.close();
}

(target === 'art' ? art() : shots()).catch((e) => { console.error(e); process.exit(1); });
