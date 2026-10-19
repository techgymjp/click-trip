// 観光地イラスト: art 指定 {time, season, motifs, accent} から SVG の風景画を合成する
(function (global) {
  'use strict';

  const W = 400, H = 260, HY = 165; // HY = 地平線
  const GROUND_Y = 205; // 主役を立たせる地面の高さ

  // ---- 乱数 (観光地 id ごとに同じ絵になるよう固定シード) ----
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- 色ユーティリティ ----
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  const P = (pts) => pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const poly = (pts, fill, extra = '') => `<polygon points="${P(pts)}" fill="${fill}" ${extra}/>`;
  const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" ${extra}/>`;
  const circ = (x, y, r, fill, extra = '') => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" ${extra}/>`;
  const ell = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}" ${extra}/>`;
  const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const g = (inner, tr) => `<g transform="${tr}">${inner}</g>`;

  const SKY = {
    morning: ['#9fd0f5', '#ffe2b8', '#fff6e6'],
    day: ['#5fb0ef', '#a9d8fa', '#e8f6ff'],
    evening: ['#3a3f7a', '#e9785a', '#ffd08a'],
    night: ['#060b26', '#15225a', '#2e3f7d'],
  };
  const GROUND = { spring: '#9bcf68', summer: '#4f9f47', autumn: '#c89a45', winter: '#eef3f8' };
  const FOLIAGE = { spring: '#6fae4a', summer: '#3d8a3d', autumn: '#c2552d', winter: '#5f7f6a' };
  const WATER = { morning: '#6fb3df', day: '#2f8fd0', evening: '#7a6a9e', night: '#1c2c63' };

  // =====================================================================
  // 背景系
  // =====================================================================
  const BG = {};

  BG.mountains = (c) => {
    const r = c.r;
    let s = '';
    const layers = [[HY - 45, shade('#7b93b8', c.night ? -0.5 : 0)], [HY - 25, shade('#5f7fa3', c.night ? -0.55 : -0.05)], [HY - 8, shade(FOLIAGE[c.season], c.night ? -0.6 : -0.25)]];
    layers.forEach(([top, col], li) => {
      const pts = [[0, HY + 10]];
      let x = 0;
      while (x <= W) {
        pts.push([x, top + r() * 30 - li * 3]);
        x += 30 + r() * 50;
      }
      pts.push([W, top + r() * 20], [W, HY + 10]);
      s += poly(pts, col);
      if (c.season === 'winter' && li < 2) s += poly(pts.slice(1, -1).map((p) => [p[0], p[1]]).concat(pts.slice(1, -1).reverse().map((p) => [p[0], p[1] + 8])), '#ffffff', 'opacity="0.75"');
    });
    return s;
  };

  BG.snowpeak = (c) => {
    const r = c.r;
    let s = '';
    const peaks = [[90 + r() * 40, HY - 85 - r() * 15, 120], [250 + r() * 50, HY - 100 - r() * 20, 150], [360, HY - 60, 90]];
    peaks.forEach(([x, top, hw], i) => {
      const base = shade('#6a7fa6', c.night ? -0.55 : -i * 0.05);
      s += poly([[x - hw, HY + 5], [x, top], [x + hw, HY + 5]], base);
      s += poly([[x, top], [x + hw, HY + 5], [x + hw * 0.2, HY + 5]], shade(base, -0.15), 'opacity="0.7"');
      const sy = top + (HY - top) * 0.32, sx = hw * 0.32;
      s += poly([[x - sx, sy], [x - sx * 0.5, sy + 8], [x - sx * 0.1, sy - 2], [x + sx * 0.3, sy + 9], [x + sx, sy], [x, top]], c.night ? '#c8d2ea' : '#ffffff');
    });
    return s;
  };

  BG.fuji = (c, hero) => {
    const x = hero ? 200 : 110 + c.r() * 180;
    const top = hero ? 38 : 70;
    const hw = hero ? 230 : 150;
    const base = c.night ? '#2a3870' : c.time === 'evening' ? '#5b4f8a' : '#4f72b0';
    const tw = 14 * (hw / 150);
    let s = poly([[x - hw, HY + 8], [x - tw, top], [x + tw, top], [x + hw, HY + 8]], base);
    s += poly([[x + tw, top], [x + hw, HY + 8], [x + hw * 0.15, HY + 8]], shade(base, -0.2), 'opacity="0.6"');
    if (c.season !== 'summer' || hero) {
      const sy = top + (HY - top) * (c.season === 'winter' ? 0.55 : 0.35);
      const k = (sy - top) / (HY + 8 - top);
      const lx = x - tw - (hw - tw) * k, rx = x + tw + (hw - tw) * k;
      const pts = [[x - tw, top], [x + tw, top], [rx, sy]];
      const n = 7;
      for (let i = 1; i < n; i++) {
        const px = rx - (rx - lx) * (i / n);
        pts.push([px, sy + (i % 2 ? 12 + c.r() * 10 : -2)]);
      }
      pts.push([lx, sy]);
      s += poly(pts, c.night ? '#d6def2' : '#ffffff');
    }
    return s;
  };

  BG.volcano = (c) => {
    const x = 120 + c.r() * 160, top = HY - 95;
    const base = c.night ? '#2c2c44' : '#6d6273';
    let s = poly([[x - 160, HY + 8], [x - 28, top], [x + 26, top + 4], [x + 170, HY + 8]], base);
    s += poly([[x + 26, top + 4], [x + 170, HY + 8], [x + 30, HY + 8]], shade(base, -0.2), 'opacity="0.6"');
    for (let i = 0; i < 6; i++) {
      s += circ(x - 6 + i * 9 + c.r() * 10, top - 12 - i * 13, 12 + i * 3.5, '#f2f2f2', `opacity="${0.85 - i * 0.11}"`);
    }
    return s;
  };

  BG.city = (c) => {
    let s = '';
    let x = 0;
    while (x < W) {
      const w = 14 + c.r() * 22, h = 22 + c.r() * 60;
      const col = c.night ? '#1e2747' : shade('#8aa0bf', -c.r() * 0.25);
      s += rect(x, HY + 6 - h, w, h, col);
      const lit = c.night || c.time === 'evening';
      for (let wy = HY + 10 - h; wy < HY - 2; wy += 7) {
        for (let wx = x + 3; wx < x + w - 4; wx += 6) {
          if (c.r() < 0.55) s += rect(wx, wy, 3, 3.5, lit ? '#ffd76a' : '#d8e6f5', lit ? '' : 'opacity="0.6"');
        }
      }
      x += w + 1 + c.r() * 4;
    }
    return s;
  };

  BG.forest = (c) => {
    let s = '';
    const col = shade(FOLIAGE[c.season], c.night ? -0.6 : -0.15);
    for (let row = 0; row < 2; row++) {
      for (let x = -10; x < W + 10; x += 12 + c.r() * 8) {
        const h = 22 + c.r() * 20 - row * 4;
        const y = HY + 8 + row * 8;
        if (c.r() < 0.5) s += poly([[x - 9, y], [x, y - h], [x + 9, y]], shade(col, row * 0.08));
        else s += circ(x, y - h * 0.45, h * 0.45, shade(col, row * 0.08 + 0.05));
      }
    }
    return s;
  };

  BG.sea = (c) => {
    const w = WATER[c.time];
    let s = `<rect x="0" y="${HY}" width="${W}" height="${H - HY}" fill="url(#sea-${c.uid})"/>`;
    for (let i = 0; i < 26; i++) {
      const y = HY + 6 + c.r() * (H - HY - 10);
      const x = c.r() * W, len = 8 + (y - HY) * 0.25;
      s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(len / 2).toFixed(1)} -3 ${len.toFixed(1)} 0" stroke="${shade(w, 0.45)}" stroke-width="1.4" fill="none" opacity="0.7"/>`;
    }
    if (c.time === 'evening' || c.time === 'morning') s += rect(c.sunX - 18, HY + 2, 36, 60, '#ffd27a', 'opacity="0.35"');
    if (c.time === 'night') s += rect(c.sunX - 10, HY + 2, 20, 60, '#f6f1c8', 'opacity="0.25"');
    return s;
  };

  BG.lake = (c) => {
    const w = WATER[c.time];
    let s = ell(200, HY + 22, 230, 30, shade(w, 0.1));
    s += ell(200, HY + 18, 190, 18, shade(w, 0.3), 'opacity="0.5"');
    for (let i = 0; i < 8; i++) s += rect(60 + c.r() * 280, HY + 12 + c.r() * 25, 14 + c.r() * 20, 1.2, '#ffffff', 'opacity="0.55"');
    return s;
  };

  BG.island = (c) => {
    let s = '';
    const n = 2 + Math.floor(c.r() * 2);
    for (let i = 0; i < n; i++) {
      const x = 40 + c.r() * 320, w = 30 + c.r() * 50, h = 10 + c.r() * 18;
      const col = shade(FOLIAGE[c.season], c.night ? -0.6 : -0.2 - i * 0.05);
      s += path(`M${x - w} ${HY + 3} Q${x - w * 0.3} ${HY - h} ${x} ${HY - h} T${x + w} ${HY + 3}Z`, col);
    }
    return s;
  };

  BG.beach = (c) => {
    return path(`M0 ${H - 40} Q120 ${H - 62} 220 ${H - 50} T${W} ${H - 58} L${W} ${H} L0 ${H}Z`, c.night ? '#7d7a6a' : '#f1dfa8') +
      path(`M0 ${H - 40} Q120 ${H - 62} 220 ${H - 50} T${W} ${H - 58}`, 'none', 'stroke="#ffffff" stroke-width="3" opacity="0.8"');
  };

  BG.cliff = (c) => {
    const col = c.night ? '#3a3540' : '#8a7563';
    let s = poly([[0, 95], [55, 100], [80, 130], [95, 175], [110, H], [0, H]], col);
    s += poly([[0, 95], [55, 100], [62, 110], [0, 108]], shade(FOLIAGE[c.season], -0.1));
    s += poly([[55, 100], [80, 130], [95, 175], [110, H], [96, H], [82, 170], [68, 128]], shade(col, -0.25));
    return s;
  };

  BG.river = (c) => {
    const w = WATER[c.time];
    const x0 = 160 + c.r() * 80;
    return path(`M${x0} ${HY + 2} C${x0 - 60} ${HY + 30} ${x0 + 120} ${HY + 50} ${x0 - 40} ${H} L${x0 + 60} ${H} C${x0 + 190} ${HY + 50} ${x0} ${HY + 30} ${x0 + 12} ${HY + 2}Z`, shade(w, 0.15)) +
      path(`M${x0 + 4} ${HY + 8} C${x0 - 30} ${HY + 34} ${x0 + 120} ${HY + 54} ${x0 + 5} ${H - 10}`, 'none', 'stroke="#ffffff" stroke-width="1.5" opacity="0.6"');
  };

  BG.ricefield = (c) => {
    const col = c.season === 'autumn' ? '#e1b84a' : c.season === 'winter' ? '#dfe5ea' : c.season === 'spring' ? '#8fc6d8' : '#6fbf4a';
    let s = '';
    for (let i = 0; i < 7; i++) {
      const y = HY + 12 + i * i * 2.2;
      s += path(`M0 ${y} L${W} ${y - 4} L${W} ${y + 4 + i * 2} L0 ${y + 6 + i * 2}Z`, shade(col, (i % 2) * 0.12 - 0.05));
    }
    return s;
  };

  BG.wetland = (c) => {
    let s = '';
    for (let i = 0; i < 6; i++) s += ell(30 + c.r() * 340, HY + 18 + c.r() * 50, 30 + c.r() * 40, 4 + c.r() * 5, shade(WATER[c.time], 0.25), 'opacity="0.9"');
    for (let i = 0; i < 40; i++) {
      const x = c.r() * W, y = HY + 15 + c.r() * 80;
      s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l-2 -${(6 + c.r() * 8).toFixed(0)}" stroke="${shade(FOLIAGE[c.season], -0.2)}" stroke-width="1.2"/>`;
    }
    return s;
  };

  // =====================================================================
  // 主役・前景の構造物（cx: 中心 x, by: 接地 y, s: 倍率）
  // =====================================================================
  const FG = {};
  const ROOF = '#3c3f4a';
  const WOOD = '#8a5a3a';
  const VERM = '#d4462f';

  FG.temple = (c, cx, by, s) => {
    let o = rect(-78, -14, 156, 14, '#c9bfae') + rect(-62, -58, 124, 44, '#f1e6d0');
    for (let i = -54; i <= 54; i += 18) o += rect(i - 3, -58, 6, 44, WOOD);
    o += rect(-18, -46, 36, 32, '#5a3a28');
    // 入母屋の大屋根（反りのある軒）
    o += path('M-108 -50 Q-80 -56 -70 -66 L-48 -104 L48 -104 L70 -66 Q80 -56 108 -50 Q60 -60 0 -60 Q-60 -60 -108 -50Z', ROOF);
    o += path('M-48 -104 L-28 -128 L28 -128 L48 -104Z', shade(ROOF, -0.15));
    o += poly([[-20, -104], [0, -126], [20, -104]], '#d8c9a8');
    o += rect(-34, -132, 68, 5, shade(ROOF, -0.3));
    o += path('M-108 -50 Q-60 -60 0 -60 Q60 -60 108 -50', 'none', `stroke="${shade(ROOF, 0.3)}" stroke-width="1.5"`);
    o += circ(-34, -132, 3, c.accent || '#c9a646') + circ(34, -132, 3, c.accent || '#c9a646');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.pagoda = (c, cx, by, s) => {
    let o = rect(-30, -10, 60, 10, '#c9bfae');
    let y = -10;
    for (let i = 0; i < 5; i++) {
      const w = 26 - i * 2.6, rw = 46 - i * 4.5;
      o += rect(-w, y - 22, w * 2, 22, i % 2 ? '#e9dcc4' : WOOD);
      o += path(`M${-rw} ${y - 20} Q${-w} ${y - 24} ${-w + 4} ${y - 32} L${w - 4} ${y - 32} Q${w} ${y - 24} ${rw} ${y - 20} L${rw - 6} ${y - 26} L${-rw + 6} ${y - 26}Z`, ROOF);
      y -= 30;
    }
    o += rect(-1.8, y - 40, 3.6, 42, '#c9a646');
    for (let i = 0; i < 6; i++) o += ell(0, y - 6 - i * 5.5, 5, 1.6, '#c9a646');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.shrine = (c, cx, by, s) => {
    let o = rect(-62, -10, 124, 10, '#bdb4a3') + rect(-48, -52, 96, 42, '#f4ead6');
    for (let i = -44; i <= 44; i += 22) o += rect(i - 2.5, -52, 5, 42, VERM);
    o += rect(-48, -56, 96, 6, VERM);
    o += poly([[-72, -52], [0, -96], [72, -52], [64, -48], [0, -86], [-64, -48]], '#4a6b5a');
    o += poly([[-62, -58], [0, -94], [62, -58]], '#5d7f6c');
    o += `<path d="M-14 -88 L-26 -114 M-6 -92 L-18 -116 M14 -88 L26 -114 M6 -92 L18 -116" stroke="${shade('#4a6b5a', -0.2)}" stroke-width="3"/>`;
    for (let i = -30; i <= 30; i += 15) o += rect(i - 4, -100, 8, 4, '#c9a646');
    o += `<path d="M-20 -50 Q0 -40 20 -50" stroke="#e8d9a5" stroke-width="3" fill="none"/>`;
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.torii = (c, cx, by, s) => {
    const col = c.accent && c.accent !== '#000000' ? c.accent : VERM;
    let o = rect(-44, -96, 9, 96, col) + rect(35, -96, 9, 96, col);
    o += rect(-52, -82, 104, 7, col);
    o += path('M-68 -100 Q0 -92 68 -100 L64 -110 Q0 -104 -64 -110Z', '#2d2a2a');
    o += rect(-58, -104, 116, 6, col);
    o += rect(-4, -98, 8, 18, col);
    if (c.has('sea') || c.has('lake')) o += ell(0, 2, 70, 5, '#ffffff', 'opacity="0.25"');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.castle = (c, cx, by, s) => {
    let o = poly([[-80, 0], [-62, -40], [62, -40], [80, 0]], '#9b968c');
    for (let y = -34; y < 0; y += 8) o += `<path d="M${-78 + (y + 40) * -0.4} ${y} L${78 - (y + 40) * -0.4} ${y}" stroke="#7d786f" stroke-width="0.8"/>`;
    const tiers = [[-56, -40, 112, 30], [-42, -82, 84, 26], [-30, -118, 60, 22]];
    tiers.forEach(([x, y, w, h], i) => {
      o += rect(x, y - h, w, h, '#fbfaf6');
      for (let k = x + 8; k < x + w - 8; k += 14) o += rect(k, y - h + 8, 6, 8, '#34363d');
      const rw = w / 2 + 16, top = y - h;
      o += path(`M${-rw} ${top + 4} Q${-rw + 10} ${top} ${-w / 2 + 2} ${top - 10} L${w / 2 - 2} ${top - 10} Q${rw - 10} ${top} ${rw} ${top + 4} L${rw - 4} ${top - 2} L${-rw + 4} ${top - 2}Z`, '#3d4450');
      if (i < 2) o += poly([[-12, top - 10], [0, top - 26], [12, top - 10]], '#3d4450') + poly([[-7, top - 12], [0, top - 21], [7, top - 12]], '#fbfaf6');
    });
    o += path('M-34 -150 Q-20 -152 -16 -164 L16 -164 Q20 -152 34 -150Z', '#3d4450');
    o += path('M-16 -164 Q0 -178 16 -164Z', '#3d4450');
    o += path('M-18 -166 q-6 -10 2 -14 z M18 -166 q6 -10 -2 -14 z', '#d9b44a');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.castle_wall = (c, cx, by, s) => {
    let o = poly([[-110, 0], [-86, -62], [86, -62], [110, 0]], '#a39d92');
    for (let y = -56; y < 0; y += 9) {
      const off = (y / 9) % 2 ? 0 : 9;
      const half = 86 + (y + 62) * 24 / 62;
      for (let x = -half + off; x < half; x += 18) o += rect(x, y, 16, 7.5, shade('#a39d92', (Math.sin(x * y) * 0.1)), 'rx="1.5"');
    }
    o += rect(-86, -70, 172, 8, '#7e8a72');
    o += FG.pine(c, 60, -66, 0.7, true);
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.onsen = (c, cx, by, s) => {
    let o = ell(0, -10, 90, 20, '#7f7568');
    o += ell(0, -12, 76, 14, shade(WATER.day, 0.35));
    o += ell(-20, -14, 30, 4, '#ffffff', 'opacity="0.5"');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      o += ell(Math.cos(a) * 82, -10 + Math.sin(a) * 18, 14, 9, shade('#8c8274', (i % 3) * 0.1));
    }
    for (let i = -2; i <= 2; i++) {
      o += `<path d="M${i * 22} -24 c-12 -14 12 -24 0 -40 c-12 -16 12 -26 0 -42" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round" opacity="${0.55 - Math.abs(i) * 0.08}"/>`;
    }
    o += `<text x="64" y="-60" font-size="34" fill="${c.accent || '#d4462f'}" font-weight="bold" text-anchor="middle">♨</text>`;
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.waterfall = (c, cx, by, s) => {
    const rock = c.night ? '#3a3a48' : '#6b6560';
    let o = poly([[-110, 0], [-100, -150], [-40, -165], [-26, -150], [26, -150], [40, -168], [104, -150], [112, 0]], rock);
    o += poly([[-110, 0], [-100, -150], [-60, -158], [-70, 0]], shade(rock, -0.2));
    o += poly([[-30, -150], [30, -150], [30, -110], [-30, -110]], shade(FOLIAGE[c.season], -0.1));
    o += `<path d="M-24 -150 L24 -150 L30 -6 L-30 -6Z" fill="url(#fall-${c.uid})"/>`;
    for (let i = -20; i <= 20; i += 8) o += `<path d="M${i} -148 L${i * 1.25} -10" stroke="#ffffff" stroke-width="2" opacity="0.7"/>`;
    o += ell(0, -4, 70, 12, shade(WATER.day, 0.35));
    for (let i = 0; i < 9; i++) o += circ(-40 + i * 10, -10 - (i % 3) * 5, 10 + (i % 2) * 4, '#ffffff', 'opacity="0.75"');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.bridge = (c, cx, by, s) => {
    const col = c.accent || VERM;
    let o = ell(0, 0, 120, 10, shade(WATER[c.time], 0.25));
    o += `<path d="M-110 0 Q0 -70 110 0" stroke="${col}" stroke-width="10" fill="none"/>`;
    o += `<path d="M-110 -18 Q0 -86 110 -18" stroke="${col}" stroke-width="4" fill="none"/>`;
    for (let x = -90; x <= 90; x += 20) {
      const y1 = -((1 - (x / 110) ** 2) * 35) - 3, y2 = -((1 - (x / 110) ** 2) * 43) - 14;
      o += `<path d="M${x} ${y1.toFixed(1)} L${x} ${y2.toFixed(1)}" stroke="${col}" stroke-width="3"/>`;
    }
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.lighthouse = (c, cx, by, s) => {
    let o = poly([[-40, 0], [-30, -20], [34, -20], [44, 0]], '#8a8278');
    o += poly([[-16, -20], [-10, -130], [10, -130], [16, -20]], '#ffffff');
    o += poly([[-14, -60], [-12, -82], [12, -82], [14, -60]], c.accent || '#d4462f');
    o += rect(-13, -150, 26, 20, '#2f3a4a') + rect(-9, -146, 18, 12, '#ffe58a');
    o += path('M-15 -150 Q0 -166 15 -150Z', '#2f3a4a');
    if (c.night || c.time === 'evening') o += poly([[0, -140], [-200, -175], [-200, -110]], '#fff3b0', 'opacity="0.35"');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.tower = (c, cx, by, s) => {
    const col = c.accent || '#d4462f';
    let o = `<path d="M-40 0 Q-12 -60 -6 -170 L6 -170 Q12 -60 40 0" stroke="${col}" stroke-width="5" fill="none"/>`;
    for (let y = -20; y > -160; y -= 18) {
      const hw = 6 + 34 * Math.pow((y + 170) / 170, 2.2);
      o += `<path d="M${-hw} ${y} L${hw} ${y - 18} M${hw} ${y} L${-hw} ${y - 18}" stroke="${col}" stroke-width="1.6"/>`;
    }
    o += rect(-18, -110, 36, 10, '#f7f7f7') + rect(-12, -150, 24, 8, '#f7f7f7');
    o += rect(-1.5, -200, 3, 32, '#bbbbbb');
    if (c.night) o += circ(0, -200, 3, '#ff5a5a');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.house = (c, cx, by, s) => {
    let o = rect(-46, -36, 92, 36, '#e9dcc2');
    o += rect(-40, -30, 16, 30, WOOD) + rect(-6, -30, 30, 18, '#5a3a28');
    o += poly([[-62, -32], [-30, -78], [30, -78], [62, -32]], '#b3955f');
    o += poly([[-30, -78], [30, -78], [24, -84], [-24, -84]], '#6d5a3a');
    for (let i = 0; i < 6; i++) o += `<path d="M${-54 + i * 4} ${-38 - i * 7} L${54 - i * 4} ${-38 - i * 7}" stroke="#8f7648" stroke-width="1"/>`;
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.gassho = (c, cx, by, s) => {
    let o = '';
    [[-70, 0.7], [70, 0.75], [0, 1]].forEach(([x, k]) => {
      let h = rect(-34, -34, 68, 34, '#d8c8a8');
      for (let i = -28; i <= 28; i += 14) h += rect(i - 4, -26, 8, 10, '#5a4030');
      h += poly([[-48, -30], [0, -120], [48, -30]], c.season === 'winter' ? '#ffffff' : '#9c7f4c');
      h += poly([[0, -120], [48, -30], [30, -30]], c.season === 'winter' ? '#dfe7f0' : '#7f6538');
      h += rect(-10, -80, 20, 12, '#5a4030');
      o += g(h, `translate(${x},0) scale(${k})`);
    });
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.kura = (c, cx, by, s) => {
    let o = '';
    for (let i = 0; i < 3; i++) {
      const x = -96 + i * 64;
      let h = rect(0, -54, 58, 54, '#fbf8f0');
      for (let ny = -22; ny < 0; ny += 7) for (let nx = 0; nx < 58; nx += 7) h += rect(nx + 1, ny + 1, 5, 5, '#3a3d45', 'transform="rotate(0)"');
      h += rect(20, -46, 16, 14, '#3a3d45');
      h += poly([[-6, -52], [29, -80], [64, -52]], '#3a3d45');
      o += g(h, `translate(${x},0)`);
    }
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.museum = (c, cx, by, s) => {
    const wall = '#f3eee4';
    let o = rect(-90, -10, 180, 10, '#c9c2b4') + rect(-80, -70, 160, 60, wall);
    for (let x = -66; x <= 66; x += 22) o += rect(x - 4, -66, 8, 56, '#e2dccf') + rect(x - 6, -70, 12, 4, '#d3ccbe');
    o += poly([[-92, -70], [0, -108], [92, -70]], shade(wall, -0.08)) + poly([[-74, -74], [0, -102], [74, -74]], '#e6dfd1');
    o += rect(-14, -40, 28, 30, '#5b6a7c');
    o += path('M-26 -108 Q0 -150 26 -108Z', c.accent || '#6f9a8f');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.gate = (c, cx, by, s) => {
    const col = c.accent && c.accent !== '#000000' ? c.accent : VERM;
    let o = rect(-60, -70, 120, 70, '#efe4cc');
    for (let x = -54; x <= 54; x += 27) o += rect(x - 4, -70, 8, 70, col);
    o += rect(-20, -60, 40, 60, '#4a2f20');
    o += path('M-90 -66 Q-60 -72 -54 -90 L54 -90 Q60 -72 90 -66Z', ROOF);
    o += rect(-48, -112, 96, 22, col) + rect(-40, -108, 80, 14, '#efe4cc');
    o += path('M-80 -110 Q-50 -116 -44 -134 L44 -134 Q50 -116 80 -110Z', ROOF);
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.kofun = (c, cx, by, s) => {
    const green = shade(FOLIAGE[c.season === 'winter' ? 'summer' : c.season], -0.05);
    let o = ell(0, -6, 150, 24, shade(WATER[c.time], 0.2));
    o += path('M-120 -8 Q-120 -50 -60 -52 L-10 -40 Q30 -72 70 -66 Q120 -58 118 -10 Z', green);
    for (let i = 0; i < 14; i++) o += circ(-100 + i * 15, -40 - Math.sin(i / 2.2) * 16, 9, shade(green, -0.15));
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.stone = (c, cx, by, s) => {
    const col = c.night ? '#4a4a55' : '#9a9184';
    let o = path('M-90 0 L-80 -60 Q-70 -96 -40 -100 Q-20 -60 -24 0Z', col);
    o += path('M-30 0 Q-34 -80 4 -132 Q36 -110 40 -60 L44 0Z', shade(col, 0.1));
    o += path('M40 0 L48 -46 Q66 -70 90 -50 L96 0Z', shade(col, -0.1));
    o += `<path d="M4 -132 Q20 -90 18 0 M-60 -96 Q-50 -40 -54 0" stroke="${shade(col, -0.3)}" stroke-width="2" fill="none"/>`;
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.cave = (c, cx, by, s) => {
    const col = c.night ? '#3e3a42' : '#857a6c';
    let o = path('M-120 0 Q-118 -120 0 -130 Q118 -120 120 0Z', col);
    o += path('M-50 0 Q-52 -78 0 -84 Q52 -78 50 0Z', '#1d1a1e');
    for (let i = 0; i < 4; i++) o += poly([[-30 + i * 20, -78 + Math.abs(i - 1.5) * 4], [-27 + i * 20, -64 + Math.abs(i - 1.5) * 4], [-24 + i * 20, -78 + Math.abs(i - 1.5) * 4]], shade(col, -0.2));
    o += ell(0, -6, 30, 5, '#5f8fae', 'opacity="0.5"');
    o += `<path d="M-90 -40 Q-70 -60 -80 -100 M80 -30 Q96 -70 70 -104" stroke="${shade(col, -0.25)}" stroke-width="3" fill="none"/>`;
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.garden = (c, cx, by, s) => {
    let o = ell(0, -8, 120, 18, shade(WATER[c.time], 0.25));
    o += ell(-60, -10, 18, 6, '#8a8278') + ell(50, -12, 22, 7, '#8a8278');
    // 石灯籠
    o += rect(-92, -14, 16, 6, '#9c958a') + rect(-88, -40, 8, 26, '#a8a196') + rect(-98, -54, 28, 14, '#a8a196');
    o += rect(-92, -50, 16, 6, '#ffe58a', 'opacity="0.8"') + poly([[-104, -54], [-84, -68], [-64, -54]], '#8f887d');
    o += `<path d="M-20 -14 Q10 -40 40 -14" stroke="${VERM}" stroke-width="5" fill="none"/>`;
    o += FG.pine(c, 80, -14, 0.8, true);
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.lanterns = (c, cx, by, s) => {
    let o = `<path d="M-160 -150 Q0 -110 160 -150" stroke="#3a2a20" stroke-width="1.5" fill="none"/>`;
    for (let i = -7; i <= 7; i++) {
      const x = i * 21, y = -150 + 40 * (1 - (x / 160) ** 2);
      o += ell(x, y + 10, 8, 11, i % 2 ? '#e5452e' : '#f2b135') + rect(x - 5, y - 2, 10, 3, '#2a2020') + rect(x - 5, y + 19, 10, 3, '#2a2020');
      if (c.night || c.time === 'evening') o += circ(x, y + 10, 14, '#ffcf70', 'opacity="0.25"');
    }
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.mikoshi = (c, cx, by, s) => {
    const gold = '#d6ac3c';
    let o = circ(-40, -12, 14, '#4a3020') + circ(40, -12, 14, '#4a3020') + circ(-40, -12, 5, gold) + circ(40, -12, 5, gold);
    o += rect(-60, -40, 120, 18, WOOD) + rect(-44, -96, 88, 56, c.accent || '#c23b2b');
    o += rect(-36, -88, 72, 40, '#f1d9a0', 'opacity="0.5"');
    o += path('M-68 -92 Q-40 -100 -30 -126 L30 -126 Q40 -100 68 -92Z', '#2d2a2a');
    o += rect(-3, -160, 6, 34, gold) + poly([[-14, -150], [0, -170], [14, -150]], gold);
    for (let x = -40; x <= 40; x += 16) o += `<path d="M${x} -40 l0 -6" stroke="${gold}" stroke-width="3"/>`;
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.dancers = (c, cx, by, s) => {
    let o = '';
    const cols = ['#2f4a8a', '#c23b2b', '#2f7a5a', '#8a3a7a'];
    for (let i = 0; i < 4; i++) {
      const x = -75 + i * 50, flip = i % 2 ? -1 : 1;
      let d = rect(-9, -50, 18, 46, cols[i]) + circ(0, -60, 9, '#f2d0b0');
      d += path('M-22 -66 Q0 -88 22 -66Z', '#e9d9a8');
      d += `<path d="M-9 -44 L${-26 * flip} -70 M9 -44 L${24 * flip} -60 M-6 -4 L-12 4 M6 -4 L14 2" stroke="${cols[i]}" stroke-width="6" stroke-linecap="round"/>`;
      o += g(d, `translate(${x},0)`);
    }
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.food = (c, cx, by, s) => {
    const acc = c.accent || '#c23b2b';
    let o = rect(-130, -6, 260, 20, '#9a6a42') + ell(0, -12, 74, 10, '#1e1a1a', 'opacity="0.25"');
    o += path('M-70 -46 Q-66 -6 0 -6 Q66 -6 70 -46Z', acc);
    o += ell(0, -46, 70, 12, '#2a1d1a') + ell(0, -48, 62, 9, '#e9c27a');
    o += circ(-24, -52, 10, '#f4f0e6') + circ(18, -52, 9, '#d97a5a') + ell(0, -56, 16, 6, '#7aa84a') + circ(36, -50, 7, '#f2d24a');
    o += `<path d="M60 -110 L10 -56 M74 -104 L22 -54" stroke="#6b4a2f" stroke-width="4" stroke-linecap="round"/>`;
    for (let i = -1; i <= 1; i++) o += `<path d="M${i * 22} -64 c-8 -10 8 -18 0 -30 c-8 -12 8 -20 0 -30" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.6" stroke-linecap="round"/>`;
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.boat = (c, cx, by, s) => {
    let o = path('M-60 -14 L60 -14 L44 4 L-48 4Z', '#7a4a2a') + rect(-30, -34, 40, 20, '#f3ead8') + path('M-36 -34 L16 -34 L10 -44 L-30 -44Z', '#3d4450');
    o += `<path d="M-70 8 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7"/>`;
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.ropeway = (c, cx, by, s) => {
    let o = `<path d="M-200 -40 L200 -190" stroke="#3a3a3a" stroke-width="1.5"/><path d="M-200 -34 L200 -184" stroke="#3a3a3a" stroke-width="1"/>`;
    o += `<path d="M10 -118 l0 14" stroke="#3a3a3a" stroke-width="2"/>`;
    o += rect(-12, -104, 44, 30, c.accent || '#d4462f', 'rx="6"') + rect(-6, -98, 14, 12, '#cfe6f7') + rect(12, -98, 14, 12, '#cfe6f7');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.train = (c, cx, by, s) => {
    const col = c.accent || '#2f6fb0';
    let o = rect(-200, -2, 400, 4, '#5a5048');
    for (let x = -196; x < 200; x += 14) o += rect(x, 0, 8, 5, '#7a6a58');
    for (let k = 0; k < 2; k++) {
      const x = -120 + k * 104;
      o += rect(x, -40, 100, 36, col, 'rx="6"') + rect(x, -18, 100, 5, '#f4f0e6');
      for (let w = 8; w < 92; w += 22) o += rect(x + w, -34, 16, 12, '#d8ecf8');
      o += circ(x + 20, -2, 6, '#333') + circ(x + 80, -2, 6, '#333');
    }
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.statue = (c, cx, by, s) => {
    const bronze = c.accent && c.accent !== '#000000' ? c.accent : '#5f7f6f';
    let o = rect(-70, -16, 140, 16, '#9c958a') + ell(0, -26, 66, 16, shade(bronze, -0.1));
    o += path('M-56 -26 Q-60 -90 -30 -100 L30 -100 Q60 -90 56 -26Z', bronze);
    o += path('M-20 -40 Q0 -54 20 -40 Q0 -30 -20 -40Z', shade(bronze, -0.2));
    o += ell(0, -122, 22, 26, bronze) + circ(0, -150, 13, shade(bronze, -0.08));
    o += path('M-12 -124 q4 3 8 0 M4 -124 q4 3 8 0', 'none', `stroke="${shade(bronze, -0.4)}" stroke-width="1.5"`);
    o += ell(0, -110, 70, 70, '#f6e7b0', 'opacity="0.18"');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.windmill = (c, cx, by, s) => {
    let o = '';
    [[-70, 0.7], [0, 1], [80, 0.8]].forEach(([x, k], i) => {
      let m = poly([[-3, 0], [-1.5, -130], [1.5, -130], [3, 0]], '#f2f4f6');
      const a0 = i * 37;
      for (let b = 0; b < 3; b++) m += g(poly([[0, 0], [-4, -10], [0, -66], [3, -10]], '#ffffff', 'stroke="#c8cdd3" stroke-width="0.6"'), `translate(0,-130) rotate(${a0 + b * 120})`);
      m += circ(0, -130, 4, '#dfe3e8');
      o += g(m, `translate(${x},0) scale(${k})`);
    });
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  FG.ski = (c, cx, by, s) => {
    let o = path('M-200 0 L-40 -150 Q0 -170 40 -150 L200 0Z', '#ffffff') + path('M-40 -150 Q0 -170 40 -150 L-10 0 L-60 0Z', '#e6edf5');
    o += `<path d="M-160 -10 L60 -150" stroke="#555" stroke-width="1.2"/>`;
    for (let i = 0; i < 4; i++) o += `<path d="M${-130 + i * 50} ${-30 - i * 32} l0 10" stroke="#555" stroke-width="1"/>` + rect(-136 + i * 50, -20 - i * 32, 12, 7, '#d4462f');
    o += g(circ(0, -14, 4, '#2f4a8a') + `<path d="M0 -10 l6 10 M-10 4 l26 -6" stroke="#2f4a8a" stroke-width="2.5"/>`, 'translate(60,-60)');
    return g(o, `translate(${cx},${by}) scale(${s})`);
  };

  // ---- 植物 ----
  FG.sakura = (c, x, y, s) => {
    let o = `<path d="M0 0 L0 -26 M0 -18 L-10 -30 M0 -22 L9 -32" stroke="#6b4a3a" stroke-width="4"/>`;
    o += circ(-10, -36, 15, '#f6c3d3') + circ(10, -38, 15, '#f3b1c7') + circ(0, -48, 15, '#f9d3df') + circ(-2, -34, 12, '#f6c3d3');
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.maple = (c, x, y, s) => {
    let o = `<path d="M0 0 L0 -24" stroke="#6b4a3a" stroke-width="4"/>`;
    o += circ(-10, -34, 14, '#d9472b') + circ(10, -36, 14, '#e8762f') + circ(0, -46, 14, '#c9341f') + circ(4, -30, 10, '#f0a33a');
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.pine = (c, x, y, s, raw) => {
    const col = c.night ? '#1f3a2e' : '#2f5d3f';
    let o = `<path d="M0 0 Q-4 -20 6 -40 Q12 -52 2 -64" stroke="#5a3e2e" stroke-width="5" fill="none"/>`;
    o += ell(-14, -40, 22, 7, col) + ell(16, -52, 20, 6, col) + ell(-2, -66, 16, 6, col) + ell(20, -32, 14, 5, col);
    const out = g(o, `translate(${x},${y}) scale(${s})`);
    return raw ? out : out;
  };
  FG.bamboo = (c, x, y, s) => {
    let o = '';
    for (let i = 0; i < 4; i++) {
      const bx = -15 + i * 10;
      o += rect(bx, -110 - i * 6, 4, 110 + i * 6, i % 2 ? '#6aa84a' : '#5a9a3e');
      for (let k = -100; k < 0; k += 22) o += rect(bx - 1, k - i * 3, 6, 2, '#3f7a2e');
      o += path(`M${bx + 2} ${-80 - i * 8} q14 -6 22 2 q-12 2 -22 -2Z`, '#7cbf5a');
    }
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.flowers = (c, x, y, s) => {
    const cols = c.season === 'autumn' ? ['#e8762f', '#f0a33a', '#d9472b'] : c.season === 'summer' ? ['#f6d23a', '#ff9a3a', '#ffffff'] : ['#f38bb2', '#b18be8', '#ffd55a', '#ffffff'];
    let o = '';
    for (let i = 0; i < 26; i++) o += circ(-50 + c.r() * 100, -c.r() * 16, 2.2 + c.r() * 2, cols[i % cols.length]);
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.hydrangea = (c, x, y, s) => {
    let o = ell(0, -10, 30, 14, '#3f7a3e');
    const cols = ['#7b8fe0', '#9f7be0', '#6fb0e8', '#d68bd0'];
    for (let i = 0; i < 5; i++) o += circ(-22 + i * 11, -20 - (i % 2) * 6, 10, cols[i % 4]);
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  // ---- 生き物 ----
  FG.deer = (c, x, y, s) => {
    const col = '#a8703f';
    let o = ell(0, -26, 20, 9, col) + rect(-14, -22, 3, 22, col) + rect(-6, -22, 3, 22, col) + rect(8, -22, 3, 22, col) + rect(14, -22, 3, 22, col);
    o += poly([[14, -30], [22, -48], [28, -46], [22, -28]], col) + ell(28, -48, 7, 4, col);
    o += `<path d="M24 -52 l-2 -10 l-4 -2 M24 -58 l4 -4" stroke="#6b4a2f" stroke-width="1.6" fill="none"/>`;
    for (let i = 0; i < 5; i++) o += circ(-12 + i * 6, -28, 1.4, '#f2e6d0');
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.crane = (c, x, y, s) => {
    let o = ell(0, -30, 18, 9, '#ffffff') + path('M-14 -30 L-26 -22 L-12 -26Z', '#2a2a2a');
    o += `<path d="M14 -34 Q22 -50 18 -66" stroke="#ffffff" stroke-width="4" fill="none"/><path d="M-2 -22 L-4 0 M4 -22 L6 0" stroke="#2a2a2a" stroke-width="2"/>`;
    o += circ(18, -68, 4, '#ffffff') + circ(18, -71, 2, '#d4462f') + poly([[21, -68], [30, -66], [21, -66]], '#7a6a4a');
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.monkey = (c, x, y, s) => {
    const col = '#9a7a5a';
    let o = ell(0, -18, 16, 14, col) + circ(0, -40, 11, col) + ell(0, -38, 7, 6, '#e9a090') + circ(-3, -40, 1.3, '#222') + circ(3, -40, 1.3, '#222');
    if (c.season === 'winter') o += circ(0, -52, 8, '#ffffff', 'opacity="0.8"');
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.horse = (c, x, y, s) => {
    const col = '#7a4f2f';
    let o = ell(0, -34, 26, 11, col);
    for (const lx of [-18, -10, 12, 20]) o += rect(lx, -28, 4, 28, col);
    o += poly([[18, -40], [32, -66], [40, -62], [28, -34]], col) + ell(40, -64, 9, 5, col);
    o += `<path d="M18 -42 Q24 -62 32 -66" stroke="#3a2618" stroke-width="3" fill="none"/><path d="M-26 -36 q-12 6 -10 22" stroke="#3a2618" stroke-width="3" fill="none"/>`;
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.bird = (c, x, y, s) => {
    let o = '';
    for (let i = 0; i < 4; i++) o += `<path d="M${i * 22 - 30} ${i * 7 % 13 - 6} q6 -6 10 0 q4 -6 10 0" stroke="${c.night ? '#d8def0' : '#333'}" stroke-width="1.6" fill="none"/>`;
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.whale = (c, x, y, s) => {
    let o = path('M-30 0 Q-10 -18 10 -6 Q16 -34 34 -40 Q28 -26 40 -24 Q22 -16 18 0Z', '#3a4a66');
    o += `<path d="M-40 4 q20 -8 40 0 t40 0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.8"/>`;
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.dolphin = (c, x, y, s) => {
    let o = path('M-30 6 Q-20 -30 20 -24 Q34 -20 36 -10 Q22 -14 10 -12 Q-10 -10 -22 10Z', '#6f8fae') + poly([[0, -22], [6, -34], [10, -22]], '#6f8fae');
    o += `<path d="M-40 10 q20 -8 40 0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.8"/>`;
    return g(o, `translate(${x},${y}) scale(${s})`);
  };
  FG.fish = (c, x, y, s) => {
    let o = path('M-20 0 Q0 -14 20 0 Q0 14 -20 0Z', c.accent || '#c9d6e6') + poly([[-20, 0], [-32, -9], [-32, 9]], c.accent || '#c9d6e6') + circ(12, -2, 1.8, '#222');
    return g(o, `translate(${x},${y}) rotate(-20) scale(${s})`);
  };

  // 花火は空に描く
  function fireworks(c) {
    let o = '';
    const cols = ['#ff6a6a', '#ffd76a', '#7ae0ff', '#c58bff', '#8bff9a'];
    for (let k = 0; k < 3; k++) {
      const x = 70 + k * 130 + c.r() * 30, y = 45 + c.r() * 40, r = 26 + c.r() * 16, col = cols[(k + Math.floor(c.r() * 5)) % 5];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        o += `<path d="M${(x + Math.cos(a) * r * 0.3).toFixed(1)} ${(y + Math.sin(a) * r * 0.3).toFixed(1)} L${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)}" stroke="${col}" stroke-width="2" stroke-linecap="round"/>`;
        o += circ(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6, '#ffffff');
      }
    }
    return o;
  }

  // ---- 種別ごとの既定モチーフ（art 指定が無いとき）----
  const KIND_DEFAULT = {
    temple: ['temple', 'pagoda', 'pine'], shrine: ['shrine', 'torii', 'forest'], castle: ['castle', 'castle_wall', 'sakura'],
    onsen: ['onsen', 'mountains', 'maple'], mountain: ['snowpeak', 'mountains', 'forest'], highland: ['flowers', 'mountains', 'horse'],
    waterfall: ['waterfall', 'forest', 'maple'], gorge: ['river', 'mountains', 'maple'], lake: ['lake', 'mountains', 'boat'],
    coast: ['sea', 'cliff', 'lighthouse'], island: ['sea', 'island', 'boat'], cave: ['cave', 'forest'], garden: ['garden', 'sakura', 'pine'],
    museum: ['museum', 'city'], town: ['kura', 'house', 'mountains'], ruins: ['castle_wall', 'kofun', 'ricefield'],
    festival: ['mikoshi', 'lanterns', 'dancers'], food: ['food', 'house'], nature: ['forest', 'mountains', 'flowers'], park: ['tower', 'flowers', 'city'],
  };

  const BG_KEYS = ['fuji', 'mountains', 'snowpeak', 'volcano', 'sea', 'lake', 'river', 'ricefield', 'wetland', 'beach', 'cliff', 'island', 'city', 'forest'];
  const BIG = ['temple', 'pagoda', 'shrine', 'torii', 'castle', 'castle_wall', 'onsen', 'waterfall', 'bridge', 'lighthouse', 'tower', 'house', 'gassho', 'kura', 'museum', 'gate', 'kofun', 'stone', 'cave', 'garden', 'lanterns', 'mikoshi', 'dancers', 'food', 'boat', 'ropeway', 'train', 'statue', 'windmill', 'ski'];
  const PLANTS = ['sakura', 'maple', 'pine', 'bamboo', 'flowers', 'hydrangea'];
  const ANIMALS = ['deer', 'crane', 'bird', 'whale', 'dolphin', 'monkey', 'horse', 'fish'];
  const WATERY = ['sea', 'lake', 'river'];

  let uidSeq = 0;

  function render(spot) {
    const art = spot.art || {};
    const r = rng(hash(spot.id || spot.name || 'x'));
    const time = SKY[art.time] ? art.time : 'day';
    const season = GROUND[art.season] ? art.season : 'spring';
    let motifs = (Array.isArray(art.motifs) && art.motifs.length ? art.motifs : KIND_DEFAULT[spot.kind] || ['mountains', 'forest']).slice(0, 6);
    motifs = motifs.filter((m) => BG_KEYS.includes(m) || BIG.includes(m) || PLANTS.includes(m) || ANIMALS.includes(m) || m === 'fireworks');
    if (!motifs.length) motifs = ['mountains'];
    const uid = 'a' + (uidSeq++);
    const c = {
      r, time, season, uid, accent: /^#[0-9a-f]{6}$/i.test(art.accent || '') ? art.accent : null,
      night: time === 'night', has: (m) => motifs.includes(m),
      sunX: 60 + r() * 280,
    };
    const hero = motifs[0];
    const heroIsBg = BG_KEYS.includes(hero);

    let o = '';
    // 空
    const sk = SKY[time];
    o += `<defs>
      <linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sk[0]}"/><stop offset="0.65" stop-color="${sk[1]}"/><stop offset="1" stop-color="${sk[2]}"/></linearGradient>
      <linearGradient id="sea-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(WATER[time], 0.25)}"/><stop offset="1" stop-color="${shade(WATER[time], -0.25)}"/></linearGradient>
      <linearGradient id="fall-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f4ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
      <radialGradient id="vig-${uid}" cx="0.5" cy="0.5" r="0.75"><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></radialGradient>
    </defs>`;
    o += `<rect width="${W}" height="${H}" fill="url(#sky-${uid})"/>`;
    if (time === 'night') {
      for (let i = 0; i < 50; i++) o += circ(r() * W, r() * HY * 0.8, r() * 1.2 + 0.3, '#ffffff', `opacity="${(0.4 + r() * 0.6).toFixed(2)}"`);
      o += circ(c.sunX, 42, 16, '#f6f1c8') + circ(c.sunX + 7, 37, 14, sk[0]);
    } else {
      const sy = time === 'day' ? 38 : HY - 30;
      o += circ(c.sunX, sy, time === 'day' ? 18 : 24, time === 'evening' ? '#ffb15a' : '#fff2b0', 'opacity="0.95"');
      o += circ(c.sunX, sy, 36, '#fff6d0', 'opacity="0.25"');
      for (let i = 0; i < 3; i++) {
        const x = r() * W, y = 20 + r() * 60;
        o += ell(x, y, 30 + r() * 20, 8, '#ffffff', 'opacity="0.8"') + ell(x + 14, y - 6, 18, 9, '#ffffff', 'opacity="0.8"');
      }
    }
    if (c.has('fireworks')) o += fireworks(c);
    if (c.has('bird')) o += FG.bird(c, 80 + r() * 240, 40 + r() * 30, 1);

    // 遠景
    ['snowpeak', 'mountains', 'fuji', 'volcano'].forEach((k) => { if (c.has(k)) o += BG[k](c, hero === k); });
    if (c.has('city')) o += BG.city(c);
    if (c.has('forest')) o += BG.forest(c);

    // 水面と地面
    const sea = c.has('sea') || c.has('beach') || c.has('island') || c.has('whale') || c.has('dolphin');
    if (sea) o += BG.sea(c);
    if (c.has('island')) o += BG.island(c);
    const groundCol = shade(GROUND[season], c.night ? -0.55 : time === 'evening' ? -0.2 : 0);
    if (!sea) {
      o += path(`M0 ${HY + 4} Q100 ${HY - 6} 200 ${HY + 2} T${W} ${HY} L${W} ${H} L0 ${H}Z`, groundCol);
      o += path(`M0 ${H - 40} Q140 ${H - 70} 260 ${H - 50} T${W} ${H - 60} L${W} ${H} L0 ${H}Z`, shade(groundCol, -0.08));
    } else if (!c.has('beach')) {
      o += path(`M0 ${H - 22} Q120 ${H - 40} 240 ${H - 28} T${W} ${H - 34} L${W} ${H} L0 ${H}Z`, groundCol);
    }
    if (c.has('lake')) o += BG.lake(c);
    if (c.has('ricefield')) o += BG.ricefield(c);
    if (c.has('wetland')) o += BG.wetland(c);
    if (c.has('river')) o += BG.river(c);
    if (c.has('beach')) o += BG.beach(c);
    if (c.has('cliff')) o += BG.cliff(c);

    // 主役と脇役の構造物
    const bigs = motifs.filter((m) => BIG.includes(m));
    const slots = heroIsBg ? [[200, GROUND_Y + 15, 0.6], [310, GROUND_Y + 25, 0.4], [85, GROUND_Y + 28, 0.4]] : [[200, GROUND_Y + 22, 1], [330, GROUND_Y + 30, 0.42], [70, GROUND_Y + 32, 0.42]];
    // 脇役を先に描いて主役を手前に
    for (let i = Math.min(bigs.length, slots.length) - 1; i >= 0; i--) {
      const m = bigs[i];
      let [x, y, s] = slots[i];
      if (sea && ['torii', 'boat', 'lighthouse'].includes(m) && i === 0) y = GROUND_Y + 10;
      if (['lanterns'].includes(m)) { x = 200; y = GROUND_Y + 15; s = i === 0 ? 1 : 0.8; }
      if (['ropeway', 'ski'].includes(m)) { x = 200; y = H - 10; s = i === 0 ? 1 : 0.7; }
      if (m === 'train') { x = 200; y = H - 14; s = i === 0 ? 0.9 : 0.6; }
      o += FG[m](c, x, y, s);
    }

    // 植物
    const plants = motifs.filter((m) => PLANTS.includes(m));
    const spots = heroIsBg ? [30, 370, 110, 290] : [26, 374, 92, 308];
    plants.forEach((m, i) => {
      if (m === 'flowers') { o += FG.flowers(c, 70, H - 8, 1) + FG.flowers(c, 330, H - 8, 1); return; }
      const n = m === 'bamboo' ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const x = spots[(i * 2 + k) % spots.length] + (r() - 0.5) * 16;
        o += FG[m](c, x, H - 14 + r() * 6, (k ? 0.8 : 1.05) + r() * 0.25);
      }
    });
    // 生き物
    motifs.filter((m) => ANIMALS.includes(m) && m !== 'bird').forEach((m, i) => {
      const water = ['whale', 'dolphin', 'fish'].includes(m);
      const x = i % 2 ? 300 : 105;
      o += FG[m](c, x + (r() - 0.5) * 20, water ? HY + 30 + r() * 20 : H - 14, water ? 0.9 : 0.9);
    });

    // 時間帯の色かぶりと周辺減光
    if (time === 'evening') o += rect(0, 0, W, H, '#ff7a3a', 'opacity="0.10"');
    if (time === 'night') o += rect(0, 0, W, H, '#0a1440', 'opacity="0.22"');
    if (time === 'morning') o += rect(0, 0, W, H, '#ffe0b0', 'opacity="0.08"');
    o += `<rect width="${W}" height="${H}" fill="url(#vig-${uid})"/>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${(spot.name || '').replace(/"/g, '')}のイラスト">${o}</svg>`;
  }

  global.Art = { render, KIND_DEFAULT };
})(window);
