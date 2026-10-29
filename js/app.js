// クリックトリップ本体
(function () {
  'use strict';

  const SAVE_KEY = 'clicktrip.save.v1';
  const TOKYO_STATION = { lat: 35.6812, lon: 139.7671 };
  // 日本の外にいるとき（とデモモード）に選ぶ出発地。日本の玄関口になる駅・空港
  const GATEWAYS = [
    { key: 'sapporo', lat: 43.0687, lon: 141.3508 },
    { key: 'sendai', lat: 38.2601, lon: 140.8822 },
    { key: 'tokyo', ...TOKYO_STATION },
    { key: 'nagoya', lat: 35.1709, lon: 136.8815 },
    { key: 'kyoto', lat: 34.9858, lon: 135.7588 },
    { key: 'osaka', lat: 34.7025, lon: 135.4959 },
    { key: 'hiroshima', lat: 34.3972, lon: 132.4753 },
    { key: 'fukuoka', lat: 33.5902, lon: 130.4207 },
    { key: 'naha', lat: 26.2069, lon: 127.6469 },
  ];
  const ABROAD_KM = 100; // いちばん近い観光地がこれより遠ければ「日本の外」とみなす
  const RANGES = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  const t = I18N.t;
  const KIND_KEYS = ['temple', 'shrine', 'castle', 'onsen', 'mountain', 'highland', 'waterfall', 'gorge', 'lake', 'coast',
    'island', 'cave', 'garden', 'museum', 'town', 'ruins', 'festival', 'food', 'nature', 'park'];
  const kindLabel = (s) => (KIND_KEYS.includes(s.kind) ? t('kind.' + s.kind) : s.cat || t('arr.kindDefault'));
  const PREFS = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];

  const $ = (id) => document.getElementById(id);
  // Android / iOS アプリ（Capacitor）で動いているか。Web 版では Capacitor がないので何もしない
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const plugin = (name) => (NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let SPOTS = [];
  let BY_ID = {};
  let BY_CELL = {};
  let S = null; // セーブデータ

  // ------------------------------------------------------------------
  // セーブデータ
  // ------------------------------------------------------------------
  function newSave(mode, pos) {
    return {
      v: 1, mode, startedAt: Date.now(), pos, gps: null, tank: 0,
      stats: { real: 0, game: 0, moves: 0, measures: 0 },
      visited: {}, path: [[pos.lat, pos.lon]], range: 'auto',
    };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.v === 1 && s.pos) return s;
    } catch (e) { /* 壊れたデータは無視して新規 */ }
    return null;
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { toast(t('save.fail')); }
  }

  // ------------------------------------------------------------------
  // 位置情報
  // ------------------------------------------------------------------
  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error(t('gps.none')));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy || 50, t: Date.now() }),
        (e) => reject(new Error(t(e.code === 1 ? 'gps.denied' : 'gps.fail'))),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    });
  }

  async function measure() {
    const btn = $('measure');
    btn.disabled = true;
    btn.textContent = t('measuring');
    Sound.se('click');
    hideRetry();
    const scanning = setInterval(() => Sound.se('scan'), 380);
    const before = S.tank;
    try {
      if (S.mode === 'demo') {
        await new Promise((r) => setTimeout(r, 500));
        // 散歩〜電車移動くらいの幅で距離がたまる
        const d = Math.round(Math.exp(Math.log(0.3) + Math.random() * (Math.log(40) - Math.log(0.3))) * 1000) / 1000;
        S.tank += d; S.stats.real += d; S.stats.measures++;
        clearInterval(scanning);
        Sound.se('coin');
        toast(t('m.demo', { km: Geo.fmtKm(d) }));
      } else {
        const now = await getPosition();
        S.stats.measures++;
        if (!S.gps) {
          S.gps = now;
          clearInterval(scanning);
          Sound.se('mark');
          toast(t('m.origin'));
        } else {
          const d = Geo.distance(S.gps, now);
          // GPS の誤差（両地点の精度）より小さい移動は数えない。起点も据え置く
          const noise = Math.max(0.02, (S.gps.acc + now.acc) / 2000);
          clearInterval(scanning);
          if (d < noise) {
            Sound.se('buzz');
            toast(t('m.noise', { km: Geo.fmtKm(d), noise: Geo.fmtKm(noise) }));
          } else {
            S.tank += d; S.stats.real += d; S.gps = now;
            Sound.se('coin');
            toast(t('m.moved', { km: Geo.fmtKm(d) }));
          }
        }
      }
      save();
      refresh();
      if (S.tank > before) countUp(before, S.tank);
    } catch (e) {
      Sound.se('buzz');
      toast(t('gps.tryDemo', { msg: e.message }));
    } finally {
      clearInterval(scanning);
      btn.disabled = false;
      btn.textContent = t('measure');
    }
  }

  /** 桃鉄の所持金のように、たまった距離をチッチッと数え上げる */
  function countUp(from, to) {
    const t0 = performance.now(), dur = 900;
    let lastTick = 0;
    const el = $('tank');
    el.classList.add('counting');
    const f = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Geo.fmtKm(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (t - lastTick > 55 && k < 1) { lastTick = t; Sound.se('tick', k); }
      if (k < 1 && !animating) requestAnimationFrame(f);
      else { el.classList.remove('counting'); updateTank(); }
    };
    requestAnimationFrame(f);
  }

  // ------------------------------------------------------------------
  // 移動
  // ------------------------------------------------------------------
  let animating = false;
  let lastMove = null;     // はずれたときに広告を見てやり直すための、直前の移動
  let freshArrival = false; // 新しい観光地に着いて到着画面を開いているか
  function travel(brg) {
    if (animating) return;
    if (S.tank <= 0) { Sound.se('buzz'); toast(t('m.needTank')); return; }
    const from = { ...S.pos };
    const dist = S.tank;
    const to = Geo.destination(from, brg, dist);
    hideRetry();
    lastMove = { from, dist, pathLen: S.path.length };
    animating = true;
    const t0 = performance.now();
    const dur = Math.min(1600, 500 + Math.sqrt(dist) * 60);
    Sound.se('depart');
    let steps = 0, lastStep = t0 + 250;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      if (t - lastStep > 85 && k < 1) { lastStep = t; Sound.se('step', steps++); }
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      S.pos = Geo.destination(from, brg, dist * e);
      S.tank = dist * (1 - e);
      invalidate();
      updateTank();
      if (k < 1) return requestAnimationFrame(step);
      S.pos = to; S.tank = 0;
      S.stats.game += dist; S.stats.moves++;
      S.path.push([+to.lat.toFixed(5), +to.lon.toFixed(5)]);
      if (S.path.length > 1000) S.path.splice(1, S.path.length - 1000);
      animating = false;
      Sound.se('land');
      land();
    };
    requestAnimationFrame(step);
  }

  function land() {
    const cell = Geo.cellOf(S.pos);
    const here = BY_CELL[cell.key] || [];
    save();
    refresh();
    if (here.length) {
      const revisit = here.every((s) => S.visited[s.id]);
      here.forEach((s) => { if (!S.visited[s.id]) S.visited[s.id] = Date.now(); });
      save();
      refresh();
      Sound.jingle(revisit ? 'revisit' : 'arrive', 'diary');
      freshArrival = !revisit;
      openArrival(here[0], here, revisit ? 'arr.again' : 'arr.new');
    } else {
      Sound.jingle('miss', 'field');
      const n = nearest(S.pos, 1)[0];
      toast(n ? t('m.miss', { dir: n.dirName, km: Geo.fmtKm(n.d), name: I18N.spot.name(n.s) }) : t('m.missNone'));
      if (Ads.rewardAvailable && lastMove) $('retry').hidden = false;
    }
  }

  function hideRetry() { $('retry').hidden = true; }

  /** リワード広告を最後まで見たら、はずれた移動を取り消して、移動前の場所と距離に戻す */
  async function retryWithAd() {
    if (!lastMove || animating) return;
    Sound.se('ok');
    const btn = $('retry-btn');
    btn.disabled = true;
    const result = await Ads.showRewarded();
    btn.disabled = false;
    if (result === 'rewarded') {
      S.pos = lastMove.from;
      S.tank += lastMove.dist;
      S.stats.game -= lastMove.dist; S.stats.moves--;
      S.path.length = lastMove.pathLen;
      lastMove = null;
      hideRetry();
      save(); refresh();
      Sound.jingle('start', 'field');
      toast(t('m.retried'));
    } else if (result === 'unavailable') {
      Sound.se('buzz');
      toast(t('m.adFail'));
    } else {
      toast(t('m.adSkip'));
    }
  }

  function nearest(p, n) {
    const arr = SPOTS.map((s) => ({ s, d: Geo.distance(p, s) }));
    arr.sort((a, b) => a.d - b.d);
    return arr.slice(0, n).map((x) => ({ ...x, b: Geo.bearing(p, x.s), dirName: Geo.dirName(Geo.bearing(p, x.s)) }));
  }

  // ------------------------------------------------------------------
  // レーダースコープ
  // ------------------------------------------------------------------
  const cv = $('scope');
  const ctx = cv.getContext('2d');
  let size = 0, dpr = 1;
  let blips = []; // {x, y, s, visited, d}
  let blipKey = '';
  let aimBrg = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = cv.clientWidth;
    cv.width = size * dpr; cv.height = size * dpr;
    blipKey = '';
  }

  let thirdCache = { key: '', v: null };
  function currentRange() {
    if (S.range !== 'auto') return S.range;
    const key = S.pos.lat.toFixed(4) + ',' + S.pos.lon.toFixed(4);
    if (thirdCache.key !== key) thirdCache = { key, v: nearest(S.pos, 3)[2] };
    const third = thirdCache.v;
    const want = Math.max(S.tank * 1.15, third ? Math.min(third.d * 1.15, 2000) : 10, 10);
    return RANGES.find((r) => r >= want) || RANGES[RANGES.length - 1];
  }

  function invalidate() { blipKey = ''; }

  function computeBlips(range) {
    const key = S.pos.lat.toFixed(5) + ',' + S.pos.lon.toFixed(5) + ',' + range + ',' + size;
    if (key === blipKey) return;
    blipKey = key;
    const R = size / 2 - 6;
    blips = [];
    for (const s of SPOTS) {
      const d = Geo.distance(S.pos, s);
      if (d > range * 1.02) continue;
      const b = (Geo.bearing(S.pos, s) * Math.PI) / 180;
      const cb = Geo.cellBounds(Geo.cellOf(s));
      const cc = { lat: (cb.s + cb.n) / 2, lon: (cb.w + cb.e) / 2 };
      const cd = Geo.distance(S.pos, cc), ca = (Geo.bearing(S.pos, cc) * Math.PI) / 180;
      blips.push({
        x: Math.sin(b) * (d / range) * R, y: -Math.cos(b) * (d / range) * R,
        cx: Math.sin(ca) * (cd / range) * R, cy: -Math.cos(ca) * (cd / range) * R,
        s, d, a: b, visited: !!S.visited[s.id],
      });
    }
  }

  let sweep = 0;
  let lastPing = 0;
  function draw(ts) {
    if (!size) resize();
    if (size < 40) { requestAnimationFrame(draw); return; } // レーダーが非表示のタブでは描かない
    const range = currentRange();
    computeBlips(range);
    $('range-label').textContent = t('radar.range', { km: Geo.fmtKm(range).replace('.00', '') });
    const c = ctx;
    const R = size / 2 - 6;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    c.save();
    c.translate(size / 2, size / 2);

    // 盤面
    const bg = c.createRadialGradient(0, 0, 0, 0, 0, R);
    bg.addColorStop(0, '#06301f'); bg.addColorStop(1, '#021208');
    c.fillStyle = bg;
    c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(67,245,154,.25)'; c.lineWidth = 1;
    for (let i = 1; i <= 4; i++) { c.beginPath(); c.arc(0, 0, (R * i) / 4, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(-R, 0); c.lineTo(R, 0); c.moveTo(0, -R); c.lineTo(0, R); c.stroke();
    for (let a = 0; a < 360; a += 10) {
      const r1 = a % 90 === 0 ? R - 12 : a % 30 === 0 ? R - 8 : R - 4;
      const ar = (a * Math.PI) / 180;
      c.beginPath(); c.moveTo(Math.sin(ar) * r1, -Math.cos(ar) * r1); c.lineTo(Math.sin(ar) * R, -Math.cos(ar) * R); c.stroke();
    }
    c.fillStyle = 'rgba(67,245,154,.85)';
    c.font = 'bold 13px "Courier New", monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([l, a]) => {
      const ar = (a * Math.PI) / 180;
      c.fillText(l, Math.sin(ar) * (R - 22), -Math.cos(ar) * (R - 22));
    });
    c.font = '10px "Courier New", monospace';
    c.fillStyle = 'rgba(67,245,154,.5)';
    for (let i = 1; i <= 3; i++) c.fillText(Geo.fmtKm((range * i) / 4), 4 + (R * i) / 4 * 0.7071 + 10, -(R * i) / 4 * 0.7071 - 4);

    // スイープ
    const prevSweep = sweep;
    sweep = ((ts || 0) / 2600) % 1 * Math.PI * 2;
    const grad = c.createConicGradient ? c.createConicGradient(sweep - Math.PI / 2 - 0.9, 0, 0) : null;
    if (grad) {
      grad.addColorStop(0, 'rgba(67,245,154,0)');
      grad.addColorStop(0.143, 'rgba(67,245,154,.28)');
      grad.addColorStop(0.1432, 'rgba(67,245,154,0)');
      grad.addColorStop(1, 'rgba(67,245,154,0)');
      c.fillStyle = grad;
      c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = 'rgba(120,255,180,.8)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(sweep) * R, -Math.cos(sweep) * R); c.stroke();

    // 観光地: 着地の判定に使う 2km マスそのものを描く（小さすぎるときは点）
    const cellPx = (Geo.CELL_KM / range) * R;
    const labelMax = range <= 20 ? 14 : range <= 50 ? 8 : range <= 100 ? 4 : 0;
    const sorted = blips.slice().sort((a, b) => a.d - b.d);
    // スイープが近くの観光地を通過したらソナー音
    if (!animating && aimBrg === null) {
      for (const bl of sorted.slice(0, 4)) {
        const crossed = prevSweep <= sweep ? bl.a > prevSweep && bl.a <= sweep : bl.a > prevSweep || bl.a <= sweep;
        if (crossed && (ts || 0) - lastPing > 150) { lastPing = ts || 0; Sound.se('ping', Math.min(1, bl.d / range)); }
      }
    }
    const placed = [];
    c.font = '11px sans-serif'; c.textAlign = 'left';
    sorted.forEach((bl, i) => {
      const since = (sweep - bl.a + Math.PI * 4) % (Math.PI * 2);
      const glow = Math.max(0.4, 1 - since / (Math.PI * 1.6));
      const col = bl.visited ? '#ffd25a' : bl.s.major ? '#8dffc6' : '#43f59a';
      c.globalAlpha = glow;
      c.fillStyle = col; c.strokeStyle = col;
      if (cellPx >= 9) {
        c.globalAlpha = 0.22 * glow + 0.08;
        c.fillRect(bl.cx - cellPx / 2, bl.cy - cellPx / 2, cellPx, cellPx);
        c.globalAlpha = glow; c.lineWidth = 1;
        c.strokeRect(bl.cx - cellPx / 2, bl.cy - cellPx / 2, cellPx, cellPx);
        c.beginPath(); c.arc(bl.x, bl.y, 2.5, 0, Math.PI * 2); c.fill();
      } else {
        const w = Math.max(3.5, cellPx);
        c.shadowColor = col; c.shadowBlur = 8 * glow;
        c.fillRect(bl.cx - w / 2, bl.cy - w / 2, w, w);
        c.shadowBlur = 0;
      }
      if (placed.length < labelMax) {
        const nm = I18N.spot.name(bl.s), max = I18N.lang === 'en' ? 22 : 12;
        const text = nm.length > max ? nm.slice(0, max - 1) + '…' : nm;
        const tw = c.measureText(text).width;
        const lx = bl.cx + Math.max(cellPx, 4) / 2 + 3, ly = bl.cy;
        const box = [lx, ly - 7, lx + tw, ly + 7];
        const hit = placed.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]));
        if (!hit && Math.hypot(lx + tw, ly) < R) {
          placed.push(box);
          c.globalAlpha = 1;
          c.fillStyle = bl.visited ? '#ffe7a0' : '#c9ffe4';
          c.fillText(text, lx, ly);
        }
      }
    });
    c.globalAlpha = 1;

    // 照準（スワイプ中）
    if (aimBrg !== null) {
      const ar = (aimBrg * Math.PI) / 180;
      const L = Math.min(R, (S.tank / range) * R);
      c.strokeStyle = '#ffd25a'; c.lineWidth = 2.5; c.setLineDash([6, 4]);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(ar) * L, -Math.cos(ar) * L); c.stroke();
      c.setLineDash([]);
      if (S.tank / range <= 1) {
        // 着地するマスを枠で示す
        const cb = Geo.cellBounds(Geo.cellOf(Geo.destination(S.pos, aimBrg, S.tank)));
        const cc = { lat: (cb.s + cb.n) / 2, lon: (cb.w + cb.e) / 2 };
        const cd = (Geo.distance(S.pos, cc) / range) * R, ca = (Geo.bearing(S.pos, cc) * Math.PI) / 180;
        const w = Math.max(cellPx, 6) + 4;
        c.strokeStyle = '#ffd25a'; c.lineWidth = 2;
        c.strokeRect(Math.sin(ca) * cd - w / 2, -Math.cos(ca) * cd - w / 2, w, w);
      }
    }

    // 自分
    c.fillStyle = '#ff5a5a';
    c.shadowColor = '#ff5a5a'; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(0, 3); c.lineTo(-6, 6); c.closePath(); c.fill();
    c.shadowBlur = 0;
    c.restore();
    requestAnimationFrame(draw);
  }

  // スワイプ操作
  let drag = null;
  function onDown(e) {
    if (animating) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    cv.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) < 18) { aimBrg = null; $('aim').hidden = true; return; }
    const prev = aimBrg;
    aimBrg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    if (prev === null) Sound.se('aimStart');
    else if (Math.floor(prev / 5) !== Math.floor(aimBrg / 5)) Sound.se('aimTick', aimBrg % 90 < 5 ? 1 : 0);
    const aim = $('aim');
    aim.hidden = false;
    aim.textContent = S.tank > 0 ? t('aim.go', { dir: Geo.dirName(aimBrg), deg: aimBrg.toFixed(0), km: Geo.fmtKm(S.tank) }) : t('aim.empty');
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const brg = aimBrg;
    drag = null; aimBrg = null; $('aim').hidden = true;
    if (brg !== null) travel(brg);
  }

  // ------------------------------------------------------------------
  // 画面更新
  // ------------------------------------------------------------------
  function updateTank() {
    $('tank').textContent = Geo.fmtKm(S.tank);
    $('tank-sub').textContent = S.mode === 'demo' ? t('tank.demo') : S.gps ? t('tank.since', { time: new Date(S.gps.t).toLocaleString(I18N.locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }) : t('tank.noOrigin');
  }

  function refresh() {
    invalidate();
    updateTank();
    const near = nearest(S.pos, 8);
    const n0 = near[0];
    $('where').innerHTML = `${n0 ? esc(t('where.near', { pref: I18N.spot.pref(n0.s) })) : ''}<br>${S.pos.lat.toFixed(4)}, ${S.pos.lon.toFixed(4)}`;
    $('nearby').innerHTML = near.map((n) => `
      <li class="${S.visited[n.s.id] ? 'visited' : ''}" data-id="${esc(n.s.id)}">
        <span class="arrow" style="transform:rotate(${n.b.toFixed(0)}deg)">↑</span>
        <span class="nm">${esc(I18N.spot.name(n.s))}<small>${esc(I18N.spot.pref(n.s))} ${esc(kindLabel(n.s))}</small></span>
        <span class="d">${Geo.fmtKm(n.d)}<small>${n.dirName} ${n.b.toFixed(0)}°</small></span>
      </li>`).join('');
    const hit = BY_CELL[Geo.cellOf(S.pos).key];
    $('hint').textContent = hit ? t('hint.inCell', { name: I18N.spot.name(hit[0]) }) : t('hint.swipe');
    if ($('view-log').classList.contains('active')) renderLog();
    if ($('view-map').classList.contains('active')) renderMap();
  }

  function renderLog() {
    const ids = Object.keys(S.visited).sort((a, b) => S.visited[b] - S.visited[a]);
    const days = Math.max(1, Math.ceil((Date.now() - S.startedAt) / 86400000));
    $('stats').innerHTML = [
      [t('stat.visited'), `${ids.length}<small style="font-size:13px"> / ${SPOTS.length}</small>`],
      [t('stat.real'), Geo.fmtKm(S.stats.real)],
      [t('stat.game'), Geo.fmtKm(S.stats.game)],
      [t('stat.moves'), t('stat.movesV', { moves: S.stats.moves, days })],
    ].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
    $('visited').innerHTML = ids.length ? ids.slice(0, 300).map((id) => {
      const s = BY_ID[id];
      if (!s) return '';
      return `<li data-id="${esc(id)}"><div class="thumb">${Art.render(s)}</div><div class="t">${esc(I18N.spot.name(s))}<small>${esc(I18N.spot.pref(s))} ・ ${new Date(S.visited[id]).toLocaleDateString(I18N.locale)}</small></div></li>`;
    }).join('') : `<li class="empty">${t('log.empty')}</li>`;
    const tot = {}, vis = {};
    SPOTS.forEach((s) => { tot[s.pref] = (tot[s.pref] || 0) + 1; if (S.visited[s.id]) vis[s.pref] = (vis[s.pref] || 0) + 1; });
    $('prefs').innerHTML = PREFS.map((p) => `<div class="pref"><b>${esc(I18N.prefName(p))}</b>${vis[p] || 0} / ${tot[p] || 0}<div class="bar"><i style="width:${((vis[p] || 0) / (tot[p] || 1)) * 100}%"></i></div></div>`).join('');
  }

  function proj(lat, lon) { return [((lon - 122.5) * 0.809 * 51.5).toFixed(1), ((46 - lat) * 51.5).toFixed(1)]; }
  function renderMap() {
    let o = '';
    for (const s of SPOTS) {
      const [x, y] = proj(s.lat, s.lon);
      o += S.visited[s.id] ? '' : `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" fill="#2fcf7d" opacity=".55"/>`;
    }
    for (const s of SPOTS) {
      if (!S.visited[s.id]) continue;
      const [x, y] = proj(s.lat, s.lon);
      o += `<circle cx="${x}" cy="${y}" r="5" fill="#ffd25a"/>`;
    }
    const pts = S.path.map(([la, lo]) => proj(la, lo).join(',')).join(' ');
    o += `<polyline points="${pts}" fill="none" stroke="#ff8a8a" stroke-width="2" stroke-dasharray="5 4" opacity=".8"/>`;
    const [px, py] = proj(S.pos.lat, S.pos.lon);
    o += `<circle cx="${px}" cy="${py}" r="9" fill="#ff5a5a"/><circle cx="${px}" cy="${py}" r="18" fill="none" stroke="#ff5a5a" stroke-width="2" opacity=".6"/>`;
    $('japan').innerHTML = o;
  }

  // ------------------------------------------------------------------
  // 到着画面
  // ------------------------------------------------------------------
  let current = null;
  let arrivalBannerKey = 'arr.new';
  let arrivalGroup = [];
  function openArrival(s, group, banner) {
    current = s;
    arrivalGroup = group || [];
    if (banner) arrivalBannerKey = banner;
    $('arr-banner').textContent = t(arrivalBannerKey);
    $('arr-art').innerHTML = Art.render(s, t('art.label', { name: I18N.spot.name(s) }));
    $('arr-kind').textContent = kindLabel(s);
    $('arr-place').textContent = I18N.spot.place(s);
    $('arr-name').textContent = I18N.spot.name(s);
    $('arr-desc').textContent = I18N.spot.desc(s) || t('arr.descDefault', { place: I18N.spot.place(s) });
    $('arr-quiz').textContent = I18N.spot.quiz(s) || t('arr.quizDefault', { name: I18N.spot.name(s) });
    const others = (group || []).filter((x) => x.id !== s.id);
    $('arr-others').innerHTML = others.length ? esc(t('arr.others')) + others.map((x) => `<button data-id="${esc(x.id)}">${esc(I18N.spot.name(x))}</button>`).join('') : '';
    $('arrival').hidden = false;
    $('arrival').querySelector('.sheet').scrollTop = 0;
  }

  async function closeArrival() {
    Sound.se('back');
    $('arrival').hidden = true;
    // 新しい観光地に着いたあとは毎回全画面広告を出す
    if (freshArrival && Ads.interstitialAvailable) await Ads.showInterstitial();
    freshArrival = false;
    Sound.bgm($('view-radar').classList.contains('active') ? 'field' : 'diary');
  }

  function shareText(s) {
    return t('share.text', { name: I18N.spot.name(s), pref: I18N.spot.pref(s), quiz: I18N.spot.quiz(s) || t('arr.quizDefault', { name: I18N.spot.name(s) }) });
  }
  // 共有するのはゲームの紹介記事（遊び方とゲームへの入口がある）
  const SHARE_URL = 'https://techgym.jp/column/claude-code-game-click-trip/';
  const pageUrl = () => SHARE_URL;

  // ------------------------------------------------------------------
  // その他 UI
  // ------------------------------------------------------------------
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
  }

  function showView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === name));
    if (name === 'log') renderLog();
    if (name === 'map') renderMap();
    if (name === 'radar') { resize(); }
    Sound.bgm(name === 'radar' ? 'field' : 'diary');
    window.scrollTo(0, 0);
  }

  async function startGps() {
    Sound.se('ok');
    $('start-gps').disabled = true;
    $('start-gps').textContent = t('intro.gpsWait');
    try {
      const p = await getPosition();
      const n = nearest(p, 1)[0];
      if (!n || n.d > ABROAD_KM) {
        // 日本の外にいる: 出発地は日本の玄関口から選んでもらい、測定の起点はいまいる場所にする
        showGateways('gps', p);
      } else {
        begin('gps', { lat: p.lat, lon: p.lon }, p, null);
      }
    } catch (e) {
      Sound.se('buzz');
      toast(t('gps.tryDemo2', { msg: e.message }));
    } finally {
      $('start-gps').disabled = false;
      $('start-gps').textContent = t('intro.gps');
    }
  }

  function startDemo() {
    Sound.se('ok');
    showGateways('demo', null);
  }

  /** 出発地を選ぶ画面（はじめの画面の中で切り替える） */
  let pendingStart = null;
  function showGateways(mode, gps) {
    pendingStart = { mode, gps };
    $('gate-lead').textContent = t(mode === 'demo' ? 'gate.demo' : 'gate.abroad');
    $('gate-list').innerHTML = GATEWAYS.map((g) => `<button data-gate="${g.key}">${esc(t('gate.' + g.key))}</button>`).join('');
    $('intro-main').hidden = true;
    $('gateways').hidden = false;
  }

  function hideGateways() {
    $('gateways').hidden = true;
    $('intro-main').hidden = false;
    pendingStart = null;
  }

  function begin(mode, pos, gps, gateKey) {
    S = newSave(mode, { lat: pos.lat, lon: pos.lon });
    S.gps = gps;
    save();
    hideGateways();
    $('intro').hidden = true;
    refresh();
    Sound.jingle('start', 'field');
    if (gateKey) toast(t(mode === 'demo' ? 'm.startDemoFrom' : 'm.startFrom', { place: t('gate.' + gateKey) }));
    else toast(t('m.start'));
  }

  /** アプリだけの設定: 戻るボタン（Android）、共有ボタン、バージョン表示、広告の設定 */
  function setupNative() {
    if (window.APP_VERSION && window.APP_VERSION !== 'dev') $('build-info').textContent = window.APP_VERSION;
    Ads.initDone.then(() => { if (Ads.privacyOptionsRequired) $('ad-privacy').hidden = false; });
    $('ad-privacy').addEventListener('click', (e) => { e.preventDefault(); Ads.showPrivacyOptions(); });
    // ストアへのリンクは Web 版だけ。iPhone・iPad のブラウザでは Android 向けのリンクを出さない
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!NATIVE && !apple) document.querySelectorAll('[data-web-only]').forEach((el) => { el.hidden = false; });
    // 到着画面・はじめの画面を開いている間はバナーを隠す（画面下のボタンに重ならないように）
    const modals = [$('intro'), $('arrival')];
    const syncBanner = () => Ads.setBannerVisible(modals.every((m) => m.hidden));
    modals.forEach((m) => new MutationObserver(syncBanner).observe(m, { attributes: true, attributeFilter: ['hidden'] }));
    syncBanner();
    if (!NATIVE) return;
    // X・LINE への直接リンクの代わりに、端末の共有メニューを 1 つのボタンで出す
    $('share-x').hidden = true;
    $('share-line').hidden = true;
    $('share-more').dataset.i18n = 'arr.shareNative';
    $('share-more').textContent = t('arr.shareNative');
    const App = plugin('App');
    if (App) {
      // 戻るボタン（Android だけ。iOS では呼ばれない）: 到着画面を閉じる → レーダーに戻る → アプリを終了
      App.addListener('backButton', () => {
        if (!$('arrival').hidden) return closeArrival();
        if (!$('intro').hidden && !$('gateways').hidden) { Sound.se('back'); return hideGateways(); }
        if (!$('view-radar').classList.contains('active')) { Sound.se('back'); return showView('radar'); }
        App.exitApp();
      });
    }
  }

  function bind() {
    $('measure').addEventListener('click', measure);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', () => { drag = null; aimBrg = null; $('aim').hidden = true; });
    window.addEventListener('resize', resize);

    const setRange = (r) => { S.range = r; $('zoom-auto').classList.toggle('on', r === 'auto'); save(); invalidate(); };
    $('zoom-in').addEventListener('click', () => { Sound.se('zoomIn'); const r = currentRange(); setRange(RANGES[Math.max(0, RANGES.indexOf(r) - 1)]); });
    $('zoom-out').addEventListener('click', () => { Sound.se('zoomOut'); const r = currentRange(); setRange(RANGES[Math.min(RANGES.length - 1, RANGES.indexOf(r) + 1)]); });
    $('zoom-auto').addEventListener('click', () => { Sound.se('click'); setRange('auto'); });

    document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { Sound.se('cursor'); showView(b.dataset.view); }));

    $('nearby').addEventListener('click', (e) => {
      const li = e.target.closest('li'); if (!li) return;
      const s = BY_ID[li.dataset.id];
      Sound.se(S.visited[s.id] ? 'ok' : 'cursor');
      if (S.visited[s.id]) openArrival(s, [s], 'arr.visited');
      else toast(t('m.notVisited', { name: I18N.spot.name(s) }));
    });
    $('visited').addEventListener('click', (e) => {
      const li = e.target.closest('li[data-id]'); if (!li) return;
      Sound.se('ok');
      openArrival(BY_ID[li.dataset.id], [], 'arr.visited');
    });
    $('arr-others').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-id]'); if (!b) return;
      const s = BY_ID[b.dataset.id];
      Sound.se('cursor');
      openArrival(s, BY_CELL[Geo.cellOf(s).key], null);
    });
    $('arr-close').addEventListener('click', closeArrival);

    $('share-x').addEventListener('click', () => {
      Sound.se('share');
      window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText(current)) + '&url=' + encodeURIComponent(pageUrl()), '_blank', 'noopener');
    });
    $('share-line').addEventListener('click', () => {
      Sound.se('share');
      window.open('https://line.me/R/share?text=' + encodeURIComponent(shareText(current) + '\n' + pageUrl()), '_blank', 'noopener');
    });
    $('share-more').addEventListener('click', async () => {
      Sound.se('share');
      const text = shareText(current);
      const nativeShare = plugin('Share');
      if (nativeShare) {
        // アプリでは Android の共有メニューから X や LINE などを選んでもらう
        try { await nativeShare.share({ title: t('share.title'), text, url: pageUrl(), dialogTitle: t('share.dialog') }); } catch (e) { /* キャンセル */ }
      } else if (navigator.share) {
        try { await navigator.share({ title: t('share.title'), text, url: pageUrl() }); } catch (e) { /* キャンセル */ }
      } else {
        try { await navigator.clipboard.writeText(text + '\n' + pageUrl()); toast(t('share.copied')); } catch (e) { toast(t('share.copyFail')); }
      }
    });

    $('start-gps').addEventListener('click', startGps);
    document.querySelectorAll('[data-lang]').forEach((el) => el.addEventListener('click', () => { Sound.se('cursor'); I18N.setLang(el.dataset.lang); }));
    I18N.onChange(() => {
      refresh();
      if (pendingStart) showGateways(pendingStart.mode, pendingStart.gps);
      if (!$('arrival').hidden && current) openArrival(current, [current, ...arrivalGroup.filter((x) => x.id !== current.id)], null);
    });
    $('retry-btn').addEventListener('click', retryWithAd);
    setupNative();
    $('sound').addEventListener('click', () => {
      const on = !(Sound.pref().bgm || Sound.pref().se);
      Sound.setPref('bgm', on); Sound.setPref('se', on);
      syncSettings();
      Sound.se('ok');
    });
    $('opt-bgm').addEventListener('change', (e) => { Sound.setPref('bgm', e.target.checked); syncSettings(); Sound.se('click'); });
    $('opt-se').addEventListener('change', (e) => { Sound.setPref('se', e.target.checked); syncSettings(); Sound.se('click'); });
    $('start-demo').addEventListener('click', startDemo);
    $('gate-list').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-gate]');
      if (!b || !pendingStart) return;
      const g = GATEWAYS.find((x) => x.key === b.dataset.gate);
      Sound.se('ok');
      begin(pendingStart.mode, g, pendingStart.gps, g.key);
    });
    $('gate-back').addEventListener('click', () => { Sound.se('back'); hideGateways(); });

    $('demo').addEventListener('change', (e) => {
      Sound.se('click');
      S.mode = e.target.checked ? 'demo' : 'gps';
      if (S.mode === 'gps') S.gps = null; // 次のボタンで起点を取り直す
      save(); refresh();
      toast(t(S.mode === 'demo' ? 'm.demoOn' : 'm.demoOff'));
    });
    $('export').addEventListener('click', async () => {
      Sound.se('save');
      const nativeShare = plugin('Share');
      if (nativeShare) {
        // アプリではファイルを直接保存できないので、セーブデータの文字列を共有メニューで渡す（メモや Drive などに保存）
        try { await nativeShare.share({ title: t('save.title'), text: JSON.stringify(S), dialogTitle: t('save.dialog') }); } catch (e) { /* キャンセル */ }
        return;
      }
      const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `clicktrip-save-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('import').addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = async () => {
        try {
          const s = JSON.parse(await inp.files[0].text());
          if (!s || s.v !== 1 || !s.pos) throw new Error();
          S = s; save(); refresh(); syncSettings();
          Sound.se('save');
          toast(t('save.loaded'));
        } catch (e) { Sound.se('buzz'); toast(t('save.bad')); }
      };
      inp.click();
    });
    $('reset').addEventListener('click', () => {
      Sound.se('buzz');
      if (!confirm(t('save.resetConfirm'))) return;
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    });
  }

  function syncSettings() {
    $('demo').checked = S.mode === 'demo';
    const sp = Sound.pref();
    $('opt-bgm').checked = sp.bgm; $('opt-se').checked = sp.se;
    $('sound').textContent = sp.bgm || sp.se ? '♪ ON' : '♪ OFF';
    $('sound').classList.toggle('off', !(sp.bgm || sp.se));
    $('zoom-auto').classList.toggle('on', S.range === 'auto');
  }

  async function init() {
    I18N.apply();
    bind();
    try {
      const res = await fetch('data/spots.json');
      SPOTS = await res.json();
    } catch (e) {
      toast(t('m.dataFail'));
      SPOTS = [];
    }
    SPOTS.forEach((s) => {
      BY_ID[s.id] = s;
      (BY_CELL[Geo.cellOf(s).key] = BY_CELL[Geo.cellOf(s).key] || []).push(s);
    });
    S = load();
    if (!S) {
      S = newSave('demo', { ...TOKYO_STATION }); // 背景表示用の仮データ（保存しない）
      $('intro').hidden = false;
      Sound.bgm('title');
    } else {
      Sound.bgm('field');
    }
    syncSettings();
    refresh();
    resize();
    requestAnimationFrame(draw);
  }

  init();
})();
