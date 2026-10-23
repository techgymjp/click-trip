// アイコン・起動画面・ストア用画像を assets/*.svg から書き出す（開発用）
// 使い方: node tools/render-assets.js   ※ Playwright（Chromium）が必要
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const root = path.join(__dirname, '..');
const res = path.join(root, 'android/app/src/main/res');
const svg = (n) => fs.readFileSync(path.join(root, 'assets', n), 'utf8');
const FG = svg('icon-foreground.svg');
const BG = svg('icon-background.svg');
const layer = (s, scale = 1) => `<div class="l" style="transform:scale(${scale})">${s}</div>`;

const CSS = `*{margin:0;padding:0}html,body{background:transparent;overflow:hidden}
.box{position:relative;overflow:hidden}.l{position:absolute;inset:0}.l svg{width:100%;height:100%;display:block}
.splash{background:#04150f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4%;color:#43f59a;font-family:"Courier New",monospace}
.logo{font-weight:800;letter-spacing:.14em;text-shadow:0 0 .4em rgba(67,245,154,.5)}.logo b{color:#ffd25a}
.sub{color:#e6fff1;font-family:"Noto Sans CJK JP","Noto Sans JP",sans-serif;letter-spacing:.2em}`;

async function shot(page, w, h, body, file) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<style>${CSS}</style>${body}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
}

const icon = (w, radius, fgScale = 0.82) =>
  `<div class="box" style="width:${w}px;height:${w}px;border-radius:${radius}">${layer(BG)}${layer(FG, fgScale)}</div>`;

function splash(w, h) {
  const s = Math.min(w, h);
  return `<div class="box splash" style="width:${w}px;height:${h}px">
    <div style="width:${s * 0.42}px;height:${s * 0.42}px;position:relative">${layer(FG)}</div>
    <div class="logo" style="font-size:${s * 0.085}px">CLICK<b>TRIP</b></div>
    <div class="sub" style="font-size:${s * 0.04}px">歩いた距離だけ、日本を旅する。</div></div>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // ランチャーアイコン
  const DENS = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, px] of Object.entries(DENS)) {
    const dir = path.join(res, `mipmap-${d}`);
    await shot(page, px, px, icon(px, '18%'), path.join(dir, 'ic_launcher.png'));
    await shot(page, px, px, icon(px, '50%'), path.join(dir, 'ic_launcher_round.png'));
    await shot(page, px, px, `<div class="box" style="width:${px}px;height:${px}px">${layer(FG, 0.9)}</div>`, path.join(dir, 'ic_launcher_foreground.png'));
    await shot(page, px, px, `<div class="box" style="width:${px}px;height:${px}px">${layer(BG)}</div>`, path.join(dir, 'ic_launcher_background.png'));
  }
  // 起動画面（参考実装と同じファイル構成・サイズ）
  const SPL = { ldpi: [240, 320], mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
  for (const [d, [w, h]] of Object.entries(SPL)) {
    for (const night of ['', '-night']) {
      await shot(page, w, h, splash(w, h), path.join(res, `drawable-port${night}-${d}`, 'splash.png'));
      await shot(page, h, w, splash(h, w), path.join(res, `drawable-land${night}-${d}`, 'splash.png'));
    }
  }
  await shot(page, 320, 480, splash(320, 480), path.join(res, 'drawable', 'splash.png'));
  await shot(page, 320, 240, splash(320, 240), path.join(res, 'drawable-night', 'splash.png'));
  // 元画像（@capacitor/assets の形式）
  await shot(page, 1024, 1024, icon(1024, '0'), path.join(root, 'assets', 'icon-only.png'));
  await shot(page, 1024, 1024, `<div class="box" style="width:1024px;height:1024px">${layer(FG, 0.9)}</div>`, path.join(root, 'assets', 'icon-foreground.png'));
  await shot(page, 1024, 1024, `<div class="box" style="width:1024px;height:1024px">${layer(BG)}</div>`, path.join(root, 'assets', 'icon-background.png'));
  await shot(page, 2732, 2732, splash(2732, 2732), path.join(root, 'assets', 'splash.png'));
  await shot(page, 2732, 2732, splash(2732, 2732), path.join(root, 'assets', 'splash-dark.png'));
  // ストア用
  await shot(page, 512, 512, icon(512, '0'), path.join(root, 'docs/store/icon-512.png'));
  await shot(page, 1024, 500, `<div class="box splash" style="width:1024px;height:500px;flex-direction:row;gap:56px">
    <div style="width:330px;height:330px;position:relative">${layer(FG)}</div>
    <div><div class="logo" style="font-size:78px">CLICK<b>TRIP</b></div>
    <div class="sub" style="font-size:40px;margin-top:10px;font-weight:700">クリックトリップ</div>
    <div class="sub" style="font-size:24px;margin-top:22px;color:#8fb8a3">歩いた距離だけ、日本を旅する。</div></div></div>`, path.join(root, 'docs/store/feature-graphic.png'));
  // Web 版のファビコン
  fs.writeFileSync(path.join(root, 'icon.svg'), FG.replace('<defs>', '<defs><radialGradient id="bgx" cx="0.5" cy="0.4" r="0.75"><stop offset="0" stop-color="#0d3d29"/><stop offset="1" stop-color="#04150f"/></radialGradient>').replace('<circle cx="512" cy="512" r="430"', '<rect width="1024" height="1024" rx="180" fill="url(#bgx)"/><circle cx="512" cy="512" r="430"'));
  await browser.close();
  console.log('assets rendered');
})();
