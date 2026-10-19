// クリックトリップ本体
(function () {
  'use strict';

  const SAVE_KEY = 'clicktrip.save.v1';
  const TOKYO_STATION = { lat: 35.6812, lon: 139.7671 };
  const RANGES = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  const KIND_LABEL = {
    temple: '寺院', shrine: '神社', castle: '城', onsen: '温泉', mountain: '山岳', highland: '高原', waterfall: '滝',
    gorge: '渓谷', lake: '湖沼', coast: '海岸', island: '島', cave: '奇岩・洞窟', garden: '庭園・公園', museum: '博物館・美術館',
    town: '街並み', ruins: '史跡', festival: '祭り・行事', food: '郷土の味', nature: '自然', park: 'レジャー',
  };
  const PREFS = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];

  const $ = (id) => document.getElementById(id);
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
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { toast('保存できませんでした（ブラウザの設定を確認してください）'); }
  }

  // ------------------------------------------------------------------
  // 位置情報
  // ------------------------------------------------------------------
  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('この端末では位置情報が使えません'));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy || 50, t: Date.now() }),
        (e) => reject(new Error(e.code === 1 ? '位置情報の利用が許可されていません' : '現在地を取得できませんでした')),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    });
  }

  async function measure() {
    const btn = $('measure');
    btn.disabled = true;
    btn.textContent = '測定中…';
    try {
      if (S.mode === 'demo') {
        await new Promise((r) => setTimeout(r, 500));
        // 散歩〜電車移動くらいの幅で距離がたまる
        const d = Math.round(Math.exp(Math.log(0.3) + Math.random() * (Math.log(40) - Math.log(0.3))) * 1000) / 1000;
        S.tank += d; S.stats.real += d; S.stats.measures++;
        toast(`デモ: ${Geo.fmtKm(d)} 移動したことにしました`);
      } else {
        const now = await getPosition();
        S.stats.measures++;
        if (!S.gps) {
          S.gps = now;
          toast('ここを測定の起点にしました。移動してからもう一度押してください');
        } else {
          const d = Geo.distance(S.gps, now);
          // GPS の誤差（両地点の精度）より小さい移動は数えない。起点も据え置く
          const noise = Math.max(0.02, (S.gps.acc + now.acc) / 2000);
          if (d < noise) {
            toast(`まだ ${Geo.fmtKm(d)}。GPSの誤差範囲（約${Geo.fmtKm(noise)}）なので、もう少し移動してから押してください`);
          } else {
            S.tank += d; S.stats.real += d; S.gps = now;
            toast(`前回から ${Geo.fmtKm(d)} 移動しました！`);
          }
        }
      }
      save();
      refresh();
    } catch (e) {
      toast(e.message + '。設定からデモモードでも遊べます');
    } finally {
      btn.disabled = false;
      btn.textContent = '移動距離を測る';
    }
  }

  // ------------------------------------------------------------------
  // 移動
  // ------------------------------------------------------------------
  let animating = false;
  function travel(brg) {
    if (animating) return;
    if (S.tank <= 0) { toast('まず「移動距離を測る」で距離をためよう'); return; }
    const from = { ...S.pos };
    const dist = S.tank;
    const to = Geo.destination(from, brg, dist);
    animating = true;
    const t0 = performance.now();
    const dur = Math.min(1600, 500 + Math.sqrt(dist) * 60);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
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
      openArrival(here[0], here, revisit ? 'ふたたび到着！' : '観光地に到着！');
    } else {
      const n = nearest(S.pos, 1)[0];
      toast(n ? `観光地のマスではありませんでした。いちばん近いのは ${n.dirName} ${Geo.fmtKm(n.d)} の「${n.s.name}」` : '観光地のマスではありませんでした');
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
  function draw(t) {
    if (!size) resize();
    const range = currentRange();
    computeBlips(range);
    $('range-label').textContent = '半径 ' + Geo.fmtKm(range).replace('.00', '');
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
    sweep = ((t || 0) / 2600) % 1 * Math.PI * 2;
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
        const text = bl.s.name.length > 12 ? bl.s.name.slice(0, 11) + '…' : bl.s.name;
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
    aimBrg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const aim = $('aim');
    aim.hidden = false;
    aim.textContent = S.tank > 0 ? `${Geo.dirName(aimBrg)} ${aimBrg.toFixed(0)}° へ ${Geo.fmtKm(S.tank)}` : '移動できる距離がありません';
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
    $('tank-sub').textContent = S.mode === 'demo' ? 'デモモード' : S.gps ? `起点: ${new Date(S.gps.t).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} に測定` : 'まずボタンで起点を記録';
  }

  function refresh() {
    invalidate();
    updateTank();
    const near = nearest(S.pos, 8);
    const n0 = near[0];
    $('where').innerHTML = `${n0 ? esc(n0.s.pref) + ' 付近' : ''}<br>${S.pos.lat.toFixed(4)}, ${S.pos.lon.toFixed(4)}`;
    $('nearby').innerHTML = near.map((n) => `
      <li class="${S.visited[n.s.id] ? 'visited' : ''}" data-id="${esc(n.s.id)}">
        <span class="arrow" style="transform:rotate(${n.b.toFixed(0)}deg)">↑</span>
        <span class="nm">${esc(n.s.name)}<small>${esc(n.s.pref)} ${esc(KIND_LABEL[n.s.kind] || '')}</small></span>
        <span class="d">${Geo.fmtKm(n.d)}<small>${n.dirName} ${n.b.toFixed(0)}°</small></span>
      </li>`).join('');
    const hit = BY_CELL[Geo.cellOf(S.pos).key];
    $('hint').textContent = hit ? `いま「${hit[0].name}」のマスにいます。` : 'スコープ上をスワイプした方角へ、移動できる距離ぶん進みます。';
    if ($('view-log').classList.contains('active')) renderLog();
    if ($('view-map').classList.contains('active')) renderMap();
  }

  function renderLog() {
    const ids = Object.keys(S.visited).sort((a, b) => S.visited[b] - S.visited[a]);
    const days = Math.max(1, Math.ceil((Date.now() - S.startedAt) / 86400000));
    $('stats').innerHTML = [
      ['訪れた観光地', `${ids.length}<small style="font-size:13px"> / ${SPOTS.length}</small>`],
      ['実際に移動した距離', Geo.fmtKm(S.stats.real)],
      ['ゲーム内の旅の距離', Geo.fmtKm(S.stats.game)],
      ['スワイプ回数 / 旅の日数', `${S.stats.moves} / ${days}日`],
    ].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
    $('visited').innerHTML = ids.length ? ids.slice(0, 300).map((id) => {
      const s = BY_ID[id];
      if (!s) return '';
      return `<li data-id="${esc(id)}"><div class="thumb">${Art.render(s)}</div><div class="t">${esc(s.name)}<small>${esc(s.pref)} ・ ${new Date(S.visited[id]).toLocaleDateString('ja-JP')}</small></div></li>`;
    }).join('') : '<li class="empty">まだどこにも到着していません。</li>';
    const tot = {}, vis = {};
    SPOTS.forEach((s) => { tot[s.pref] = (tot[s.pref] || 0) + 1; if (S.visited[s.id]) vis[s.pref] = (vis[s.pref] || 0) + 1; });
    $('prefs').innerHTML = PREFS.map((p) => `<div class="pref"><b>${p}</b>${vis[p] || 0} / ${tot[p] || 0}<div class="bar"><i style="width:${((vis[p] || 0) / (tot[p] || 1)) * 100}%"></i></div></div>`).join('');
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
  function openArrival(s, group, banner) {
    current = s;
    $('arr-banner').textContent = banner || '観光地';
    $('arr-art').innerHTML = Art.render(s);
    $('arr-kind').textContent = KIND_LABEL[s.kind] || s.cat || '観光地';
    $('arr-place').textContent = `${s.pref} ${s.addr && s.addr !== s.name ? s.addr : ''}`;
    $('arr-name').textContent = s.name;
    $('arr-desc').textContent = s.desc || `${s.pref}${s.addr ? '・' + s.addr : ''}にある観光資源です。`;
    $('arr-quiz').textContent = s.quiz || `${s.name}の見どころといえば？ あなたのおすすめを教えてください！`;
    const others = (group || []).filter((x) => x.id !== s.id);
    $('arr-others').innerHTML = others.length ? 'このマスには、ほかにも観光地があります: ' + others.map((x) => `<button data-id="${esc(x.id)}">${esc(x.name)}</button>`).join('') : '';
    $('arrival').hidden = false;
    $('arrival').querySelector('.sheet').scrollTop = 0;
  }

  function shareText(s) {
    return `【クリックトリップ】${s.name}（${s.pref}）に到着！\nQ. ${s.quiz}\n答え、知っていたらリプで教えて！ #クリックトリップ`;
  }
  const pageUrl = () => location.href.split('#')[0].split('?')[0];

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
    window.scrollTo(0, 0);
  }

  async function startGps() {
    $('start-gps').disabled = true;
    $('start-gps').textContent = '現在地を取得中…';
    try {
      const p = await getPosition();
      S = newSave('gps', { lat: p.lat, lon: p.lon });
      S.gps = p;
      save();
      $('intro').hidden = true;
      refresh();
      toast('旅のはじまり！ 移動したら「移動距離を測る」を押そう');
    } catch (e) {
      toast(e.message + '。デモモードでも遊べます');
    } finally {
      $('start-gps').disabled = false;
      $('start-gps').textContent = '現在地から旅をはじめる';
    }
  }
  function startDemo() {
    S = newSave('demo', { ...TOKYO_STATION });
    save();
    $('intro').hidden = true;
    refresh();
    toast('東京駅から出発！ ボタンを押すと距離がたまります');
  }

  function bind() {
    $('measure').addEventListener('click', measure);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', () => { drag = null; aimBrg = null; $('aim').hidden = true; });
    window.addEventListener('resize', resize);

    const setRange = (r) => { S.range = r; $('zoom-auto').classList.toggle('on', r === 'auto'); save(); invalidate(); };
    $('zoom-in').addEventListener('click', () => { const r = currentRange(); setRange(RANGES[Math.max(0, RANGES.indexOf(r) - 1)]); });
    $('zoom-out').addEventListener('click', () => { const r = currentRange(); setRange(RANGES[Math.min(RANGES.length - 1, RANGES.indexOf(r) + 1)]); });
    $('zoom-auto').addEventListener('click', () => setRange('auto'));

    document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

    $('nearby').addEventListener('click', (e) => {
      const li = e.target.closest('li'); if (!li) return;
      const s = BY_ID[li.dataset.id];
      if (S.visited[s.id]) openArrival(s, [s], '訪問済みの観光地');
      else toast(`「${s.name}」はまだ未訪問。たどり着くと解説とクイズが見られます`);
    });
    $('visited').addEventListener('click', (e) => {
      const li = e.target.closest('li[data-id]'); if (!li) return;
      openArrival(BY_ID[li.dataset.id], [], '訪問済みの観光地');
    });
    $('arr-others').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-id]'); if (!b) return;
      const s = BY_ID[b.dataset.id];
      openArrival(s, BY_CELL[Geo.cellOf(s).key], $('arr-banner').textContent);
    });
    $('arr-close').addEventListener('click', () => { $('arrival').hidden = true; });

    $('share-x').addEventListener('click', () => {
      window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText(current)) + '&url=' + encodeURIComponent(pageUrl()), '_blank', 'noopener');
    });
    $('share-line').addEventListener('click', () => {
      window.open('https://line.me/R/share?text=' + encodeURIComponent(shareText(current) + '\n' + pageUrl()), '_blank', 'noopener');
    });
    $('share-more').addEventListener('click', async () => {
      const text = shareText(current);
      if (navigator.share) {
        try { await navigator.share({ title: 'クリックトリップ', text, url: pageUrl() }); } catch (e) { /* キャンセル */ }
      } else {
        try { await navigator.clipboard.writeText(text + '\n' + pageUrl()); toast('共有用の文章をコピーしました'); } catch (e) { toast('コピーできませんでした'); }
      }
    });

    $('start-gps').addEventListener('click', startGps);
    $('start-demo').addEventListener('click', startDemo);

    $('demo').addEventListener('change', (e) => {
      S.mode = e.target.checked ? 'demo' : 'gps';
      if (S.mode === 'gps') S.gps = null; // 次のボタンで起点を取り直す
      save(); refresh();
      toast(S.mode === 'demo' ? 'デモモードにしました' : 'GPSモードにしました。次に押した場所が起点になります');
    });
    $('export').addEventListener('click', () => {
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
          toast('セーブデータを読み込みました');
        } catch (e) { toast('読み込めないファイルです'); }
      };
      inp.click();
    });
    $('reset').addEventListener('click', () => {
      if (!confirm('これまでの旅の記録をすべて消して、はじめからやり直しますか？')) return;
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    });
  }

  function syncSettings() {
    $('demo').checked = S.mode === 'demo';
    $('zoom-auto').classList.toggle('on', S.range === 'auto');
  }

  async function init() {
    bind();
    try {
      const res = await fetch('data/spots.json');
      SPOTS = await res.json();
    } catch (e) {
      toast('観光地データを読み込めませんでした');
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
    }
    syncSettings();
    refresh();
    resize();
    requestAnimationFrame(draw);
  }

  init();
})();
