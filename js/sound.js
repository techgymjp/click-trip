// レトロ電子音: Web Audio API だけで鳴らすファミコン風の BGM と効果音（曲はすべてオリジナル）
(function (global) {
  'use strict';

  const PREF_KEY = 'clicktrip.sound.v1';
  let pref = { bgm: true, se: true };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); } catch (e) { /* 既定値のまま */ }

  let ctx = null, master, bgmBus, seBus, noiseBuf;
  const waves = {};

  function ensure() {
    if (ctx) return ctx;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    bgmBus = ctx.createGain(); bgmBus.gain.value = pref.bgm ? 0.55 : 0; bgmBus.connect(master);
    seBus = ctx.createGain(); seBus.gain.value = pref.se ? 0.8 : 0; seBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    // ファミコンの短周期ノイズ風に、同じ値を数サンプル続ける
    let v = 0;
    for (let i = 0; i < d.length; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; d[i] = v; }
    return ctx;
  }

  /** デューティ比つき矩形波（12.5% / 25% / 50%）。ファミコンらしい音色の素 */
  function pulse(duty) {
    if (waves[duty]) return waves[duty];
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    waves[duty] = ctx.createPeriodicWave(re, im);
    return waves[duty];
  }

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(name) {
    const m = /^([A-G])([#b]?)(\d)$/.exec(name);
    if (!m) return 0;
    const midi = 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** 1 音鳴らす。type: 'p12' 'p25' 'p50' 'tri' 'noise' */
  function tone(bus, type, f, t, len, vol, opt = {}) {
    if (!ctx) return;
    const g = ctx.createGain();
    const a = opt.attack || 0.004, rel = opt.release == null ? 0.04 : opt.release;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (opt.decay) g.gain.setTargetAtTime(vol * (opt.sustain == null ? 0.5 : opt.sustain), t + a, opt.decay);
    g.gain.setValueAtTime(opt.decay ? vol * (opt.sustain == null ? 0.5 : opt.sustain) : vol, t + Math.max(a, len - rel));
    g.gain.linearRampToValueAtTime(0, t + len);
    g.connect(bus);
    let src;
    if (type === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      if (opt.rate) src.playbackRate.value = opt.rate;
      const flt = ctx.createBiquadFilter();
      flt.type = opt.filter || 'highpass'; flt.frequency.value = f || 6000;
      src.connect(flt); flt.connect(g);
    } else {
      src = ctx.createOscillator();
      if (type === 'tri') src.type = 'triangle';
      else src.setPeriodicWave(pulse(type === 'p12' ? 0.125 : type === 'p25' ? 0.25 : 0.5));
      src.frequency.setValueAtTime(f, t);
      if (opt.slide) src.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t + len);
      if (opt.vibrato) {
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 6; lg.gain.value = f * 0.012;
        lfo.connect(lg); lg.connect(src.frequency);
        lfo.start(t + Math.min(0.15, len / 2)); lfo.stop(t + len + 0.05);
      }
      src.connect(g);
    }
    src.start(t); src.stop(t + len + 0.05);
  }

  // =====================================================================
  // BGM（オリジナル曲）
  // 記法: "音名:長さ"（長さは 16 分音符の数）、R は休符。ドラムは K=キック S=スネア H=ハイハット O=オープンハイハット
  // =====================================================================
  const SONGS = {
    // フィールド: 旅のはじまりの軽快なマーチ（レーダー画面）
    field: {
      bpm: 138,
      tracks: [
        { type: 'p25', vol: 0.16, vibrato: true, notes:
          'C5:2 E5:2 G5:2 E5:2 F5:2 A5:2 G5:4 E5:2 C5:2 D5:2 E5:2 D5:6 R:2 ' +
          'C5:2 E5:2 G5:2 C6:2 B5:2 A5:2 G5:4 A5:2 F5:2 E5:2 D5:2 C5:6 R:2 ' +
          'F5:3 F5:1 A5:2 F5:2 E5:3 E5:1 G5:2 E5:2 D5:2 E5:2 F5:2 G5:2 A5:6 R:2 ' +
          'G5:2 A5:2 B5:2 C6:2 D6:2 C6:2 B5:2 G5:2 C6:4 G5:2 E5:2 C5:4 R:4 ' +
          'E5:1 F5:1 G5:2 G5:2 A5:2 G5:2 E5:2 C5:4 D5:1 E5:1 F5:2 F5:2 G5:2 F5:2 D5:2 B4:4 ' +
          'C5:2 E5:2 A5:2 G5:2 F5:2 E5:2 D5:2 C5:2 D5:2 G5:2 F5:2 D5:2 G5:8 ' },
        { type: 'p12', vol: 0.07, notes:
          'E4:2 G4:2 C5:2 G4:2 A4:2 C5:2 B4:4 C5:2 G4:2 B4:2 C5:2 B4:6 R:2 ' +
          'E4:2 G4:2 C5:2 E5:2 D5:2 C5:2 B4:4 C5:2 A4:2 G4:2 F4:2 E4:6 R:2 ' +
          'A4:3 A4:1 C5:2 A4:2 G4:3 G4:1 C5:2 G4:2 F4:2 G4:2 A4:2 B4:2 C5:6 R:2 ' +
          'B4:2 C5:2 D5:2 E5:2 F5:2 E5:2 D5:2 B4:2 E5:4 C5:2 G4:2 E4:4 R:4 ' +
          'C5:2 C5:2 E5:2 E5:2 C5:2 E5:2 C5:2 G4:2 B4:2 B4:2 D5:2 D5:2 B4:2 D5:2 B4:2 G4:2 ' +
          'A4:2 C5:2 E5:2 C5:2 A4:2 C5:2 F4:2 A4:2 B4:2 D5:2 B4:2 G4:2 B4:8 ' },
        { type: 'tri', vol: 0.22, notes:
          'C3:2 C4:2 C3:2 C4:2 F3:2 F4:2 G3:2 G4:2 C3:2 C4:2 G2:2 G3:2 G2:2 G3:2 G2:2 B2:2 ' +
          'C3:2 C4:2 C3:2 C4:2 G3:2 G4:2 E3:2 E4:2 F3:2 F4:2 G3:2 G4:2 C3:2 C4:2 C3:2 R:2 ' +
          'F2:2 F3:2 F2:2 F3:2 C3:2 C4:2 C3:2 C4:2 D3:2 D4:2 G2:2 G3:2 F3:2 F4:2 F3:2 F4:2 ' +
          'G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 C3:2 C4:2 G2:2 G3:2 C3:4 R:4 ' +
          'C3:2 C4:2 C3:2 C4:2 A2:2 A3:2 A2:2 A3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 B2:2 B3:2 ' +
          'A2:2 A3:2 A2:2 A3:2 F2:2 F3:2 F2:2 F3:2 G2:2 G3:2 G2:2 G3:2 G2:2 A2:2 B2:2 D3:2 ' },
        { type: 'drum', vol: 0.5, loopNotes: 'K:2 H:2 S:2 H:2 K:2 K:2 S:2 H:2 ' },
      ],
    },

    // タイトル: 旅立ちのファンファーレ → ゆったりした前奏のループ
    title: {
      bpm: 112,
      tracks: [
        { type: 'p25', vol: 0.16, vibrato: true, notes:
          'G4:1 G4:1 G4:1 R:1 C5:6 G4:2 C5:2 E5:2 G5:8 R:4 A5:2 G5:2 F5:2 E5:2 D5:4 E5:2 F5:2 E5:12 R:4 ' +
          'C5:4 D5:4 E5:4 G5:4 F5:6 E5:2 D5:8 E5:4 F5:4 G5:4 A5:4 G5:16 ' },
        { type: 'p12', vol: 0.07, notes:
          'E4:1 E4:1 E4:1 R:1 E4:6 E4:2 G4:2 C5:2 E5:8 R:4 F5:2 E5:2 D5:2 C5:2 B4:4 C5:2 D5:2 C5:12 R:4 ' +
          'E4:4 G4:4 C5:4 E5:4 C5:6 C5:2 B4:8 C5:4 D5:4 E5:4 F5:4 E5:4 D5:4 C5:4 B4:4 ' },
        { type: 'tri', vol: 0.22, notes:
          'C3:4 C3:6 R:2 C3:4 E3:4 G3:4 C4:4 F3:4 F3:4 G3:4 G3:4 C3:16 ' +
          'C3:8 E3:8 F3:8 G3:8 A3:8 F3:8 G3:16 ' },
      ],
    },

    // 旅日記: 宿場町のようなのどかな 3 拍子（記録・地図・到着画面）
    diary: {
      bpm: 96,
      tracks: [
        { type: 'p50', vol: 0.12, vibrato: true, notes:
          'F5:4 A5:2 C6:2 A5:4 Bb5:4 G5:2 E5:2 C5:4 A5:4 F5:2 G5:2 A5:4 G5:12 ' +
          'F5:4 A5:2 C6:2 A5:4 D6:4 C6:2 Bb5:2 G5:4 A5:4 G5:2 E5:2 G5:4 F5:12 ' +
          'A5:4 C6:4 D6:4 C6:6 A5:2 F5:4 Bb5:4 A5:4 G5:4 A5:12 ' +
          'D5:4 F5:4 Bb5:4 A5:4 G5:4 F5:4 E5:4 G5:4 C6:4 F5:12 ' },
        { type: 'tri', vol: 0.2, notes:
          'F3:4 C4:4 C4:4 C3:4 G3:4 G3:4 F3:4 C4:4 C4:4 C3:4 E3:4 G3:4 ' +
          'F3:4 C4:4 C4:4 Bb2:4 F3:4 F3:4 C3:4 G3:4 G3:4 F3:4 C3:4 F2:4 ' +
          'F3:4 A3:4 A3:4 F3:4 A3:4 C4:4 Bb2:4 D3:4 F3:4 F3:4 C4:4 F3:4 ' +
          'Bb2:4 D3:4 F3:4 D3:4 F3:4 A3:4 C3:4 E3:4 G3:4 F3:12 ' },
        { type: 'p12', vol: 0.05, notes:
          'R:4 A4:4 A4:4 R:4 E4:4 E4:4 R:4 A4:4 A4:4 R:4 Bb4:4 Bb4:4 ' +
          'R:4 A4:4 A4:4 R:4 D5:4 D5:4 R:4 E4:4 E4:4 R:4 A4:4 A4:4 ' +
          'R:4 C5:4 C5:4 R:4 C5:4 C5:4 R:4 D5:4 D5:4 R:4 E5:4 E5:4 ' +
          'R:4 F4:4 F4:4 R:4 C5:4 C5:4 R:4 Bb4:4 Bb4:4 A4:12 ' },
      ],
    },
  };

  // 単発のジングル（BGM を一時停止して鳴らす）
  const JINGLES = {
    // 観光地に到着！ のファンファーレ
    arrive: { bpm: 150, tracks: [
      { type: 'p25', vol: 0.18, notes: 'C5:1 E5:1 G5:1 C6:1 R:1 G5:1 C6:6 R:2 A5:2 B5:2 C6:2 D6:2 E6:10 ' },
      { type: 'p25', vol: 0.09, notes: 'G4:1 C5:1 E5:1 G5:1 R:1 E5:1 E5:6 R:2 F5:2 G5:2 A5:2 B5:2 C6:10 ' },
      { type: 'tri', vol: 0.24, notes: 'C3:4 R:2 C3:6 R:2 F3:2 G3:2 A3:2 B3:2 C4:10 ' },
      { type: 'drum', vol: 0.5, notes: 'S:1 S:1 S:1 S:1 R:2 K:6 R:2 S:2 S:2 S:2 S:2 O:10 ' },
    ] },
    // ふたたび到着（短め）
    revisit: { bpm: 150, tracks: [
      { type: 'p25', vol: 0.16, notes: 'G5:2 E5:2 G5:2 C6:8 ' },
      { type: 'tri', vol: 0.22, notes: 'C3:2 G3:2 E3:2 C3:8 ' },
    ] },
    // はずれ（ププー）
    miss: { bpm: 140, tracks: [
      { type: 'p50', vol: 0.14, notes: 'E5:2 R:1 C5:2 R:1 G4:8 ' },
      { type: 'tri', vol: 0.2, notes: 'C4:2 R:1 A3:2 R:1 Eb3:8 ' },
    ] },
    // 旅のはじまり
    start: { bpm: 160, tracks: [
      { type: 'p25', vol: 0.16, notes: 'C5:1 D5:1 E5:1 F5:1 G5:2 E5:2 C6:8 ' },
      { type: 'tri', vol: 0.22, notes: 'C3:2 E3:2 G3:2 C4:2 C3:8 ' },
    ] },
  };

  function parse(str) {
    const ev = [];
    let step = 0;
    for (const tok of str.trim().split(/\s+/)) {
      const [n, l] = tok.split(':');
      const len = +l || 1;
      if (n !== 'R') ev.push({ step, len, n });
      step += len;
    }
    return { ev, steps: step };
  }

  function prepare(song) {
    if (song._p) return song._p;
    const tr = song.tracks.map((t) => ({ ...t, ...parse(t.notes || t.loopNotes) }));
    const steps = Math.max(...tr.filter((t) => t.notes).map((t) => t.steps), 1);
    song._p = { tr, steps };
    return song._p;
  }

  function drum(bus, n, t, vol) {
    if (n === 'K') tone(bus, 'p50', 150, t, 0.12, vol * 0.6, { slide: 40, release: 0.06 });
    else if (n === 'S') tone(bus, 'noise', 1800, t, 0.1, vol * 0.45, { release: 0.08 });
    else if (n === 'H') tone(bus, 'noise', 8000, t, 0.03, vol * 0.25, { release: 0.02 });
    else if (n === 'O') tone(bus, 'noise', 7000, t, 0.4, vol * 0.25, { release: 0.35 });
  }

  function scheduleEvent(bus, t, ev, at, spb) {
    const len = ev.len * spb;
    if (t.type === 'drum') return drum(bus, ev.n, at, t.vol);
    const f = freq(ev.n);
    if (f) tone(bus, t.type, f, at, len * 0.92, t.vol, { vibrato: t.vibrato && len > 0.3, decay: t.type === 'tri' ? 0 : 0.18, sustain: 0.6 });
  }

  // ---- BGM の再生（先読みスケジューラ） ----
  let cur = null; // { name, song, start, nextStep, gain }
  let timer = 0;

  function playBgm(name) {
    if (!ensure()) return;
    if (cur && cur.name === name) return;
    stopBgm();
    const song = SONGS[name];
    if (!song) return;
    const p = prepare(song);
    const gain = ctx.createGain(); gain.gain.value = 1; gain.connect(bgmBus);
    cur = { name, song, p, gain, start: ctx.currentTime + 0.08, nextStep: 0 };
    if (!timer) timer = setInterval(pump, 30);
    pump();
  }

  function pump() {
    if (!cur || !ctx) return;
    const spb = 60 / cur.song.bpm / 4; // 16 分音符の秒数
    const until = ctx.currentTime + 0.2;
    while (cur.start + cur.nextStep * spb < until) {
      const s = cur.nextStep;
      const loopPos = s % cur.p.steps;
      const at = cur.start + s * spb;
      for (const t of cur.p.tr) {
        const pos = t.loopNotes ? s % t.steps : loopPos;
        for (const ev of t.ev) if (ev.step === pos) scheduleEvent(cur.gain, t, ev, at, spb);
      }
      cur.nextStep++;
    }
  }

  function stopBgm() {
    if (!cur) return;
    const g = cur.gain;
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    setTimeout(() => g.disconnect(), 400);
    cur = null;
  }

  let bgmWanted = null;
  let jingleUntil = 0;
  function bgm(name) {
    bgmWanted = name;
    if (!ctx || ctx.state !== 'running') return; // 最初の操作まで待つ
    if (performance.now() < jingleUntil) return;
    playBgm(name);
  }

  function jingle(name, then) {
    if (!ensure() || ctx.state !== 'running') return;
    const song = JINGLES[name];
    const p = prepare(song);
    const spb = 60 / song.bpm / 4;
    stopBgm();
    const t0 = ctx.currentTime + 0.05;
    for (const t of p.tr) for (const ev of t.ev) scheduleEvent(seBus, t, ev, t0 + ev.step * spb, spb);
    const dur = p.steps * spb * 1000 + 350;
    jingleUntil = performance.now() + dur;
    if (then) bgmWanted = then;
    setTimeout(() => { if (performance.now() >= jingleUntil - 5 && bgmWanted) playBgm(bgmWanted); }, dur);
  }

  // =====================================================================
  // 効果音
  // =====================================================================
  const SE = {
    // ボタン「ピッ」
    click: (t) => tone(seBus, 'p25', 1318, t, 0.05, 0.12, { release: 0.03 }),
    // カーソル移動「ポッ」
    cursor: (t) => { tone(seBus, 'p50', 880, t, 0.04, 0.1); tone(seBus, 'p50', 1175, t + 0.035, 0.05, 0.1); },
    // 決定「ピロッ」
    ok: (t) => { tone(seBus, 'p25', 988, t, 0.06, 0.13); tone(seBus, 'p25', 1319, t + 0.06, 0.1, 0.13); },
    // キャンセル・閉じる
    back: (t) => { tone(seBus, 'p25', 784, t, 0.05, 0.11); tone(seBus, 'p25', 523, t + 0.05, 0.08, 0.11); },
    // ズーム
    zoomIn: (t) => tone(seBus, 'p12', 600, t, 0.12, 0.1, { slide: 1400 }),
    zoomOut: (t) => tone(seBus, 'p12', 1400, t, 0.12, 0.1, { slide: 600 }),
    // GPS 測定中「ピピピ…」（1 回分）
    scan: (t) => { for (let i = 0; i < 3; i++) tone(seBus, 'p12', 1760 + i * 220, t + i * 0.09, 0.05, 0.08); },
    // 距離がたまった「チャリーン」
    coin: (t) => { tone(seBus, 'p25', 988, t, 0.07, 0.14); tone(seBus, 'p25', 1319, t + 0.07, 0.35, 0.14, { decay: 0.1, sustain: 0.3 }); },
    // カウントアップの「チッ」
    tick: (t, k = 0) => tone(seBus, 'p12', 1600 + k * 400, t, 0.025, 0.07, { release: 0.015 }),
    // 誤差範囲・エラー「ブブー」
    buzz: (t) => { tone(seBus, 'p50', 140, t, 0.16, 0.13); tone(seBus, 'p50', 120, t + 0.18, 0.24, 0.13); },
    // スワイプ開始・照準
    aimStart: (t) => tone(seBus, 'p12', 440, t, 0.08, 0.09, { slide: 880 }),
    aimTick: (t, k = 0) => tone(seBus, 'p12', 700 + k * 900, t, 0.02, 0.06, { release: 0.01 }),
    // 出発「シュイーン」
    depart: (t) => { tone(seBus, 'p25', 220, t, 0.35, 0.12, { slide: 1760 }); tone(seBus, 'noise', 3000, t, 0.3, 0.05, { release: 0.25 }); },
    // 移動中の足音「ピッピッ」
    step: (t, k = 0) => tone(seBus, k % 2 ? 'p25' : 'p12', 523 * Math.pow(2, (k % 8) / 12) * (k % 2 ? 1.5 : 1), t, 0.04, 0.08, { release: 0.02 }),
    // 着地「ドスン」
    land: (t) => { tone(seBus, 'p50', 200, t, 0.2, 0.15, { slide: 50 }); tone(seBus, 'noise', 400, t, 0.18, 0.12, { filter: 'lowpass', release: 0.15 }); },
    // レーダーのソナー「ポーン」（遠いほど小さく低く）
    ping: (t, k = 0) => tone(seBus, 'tri', 1568 - k * 500, t, 0.25, 0.09 * (1 - k * 0.6), { decay: 0.06, sustain: 0.1 }),
    // 通知
    pop: (t) => { tone(seBus, 'p12', 1047, t, 0.04, 0.06); tone(seBus, 'p12', 1568, t + 0.04, 0.06, 0.06); },
    // 共有
    share: (t) => { [784, 988, 1175, 1568].forEach((f, i) => tone(seBus, 'p25', f, t + i * 0.05, 0.06, 0.1)); },
    // セーブ
    save: (t) => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(seBus, 'p25', f, t + i * 0.07, 0.08, 0.11)); },
    // 起点を記録「ピコーン」
    mark: (t) => { tone(seBus, 'p25', 1047, t, 0.06, 0.13); tone(seBus, 'p25', 2093, t + 0.06, 0.25, 0.12, { decay: 0.08, sustain: 0.2 }); },
  };

  function se(name, k) {
    if (!pref.se || !ensure() || ctx.state !== 'running') return;
    const f = SE[name];
    if (f) f(ctx.currentTime + 0.01, k);
  }

  // ---- 自動再生の制限: 最初の操作で音を有効にする ----
  function unlock() {
    if (!ensure()) return;
    const go = () => { if (!cur && bgmWanted && performance.now() >= jingleUntil) playBgm(bgmWanted); };
    if (ctx.state !== 'running') ctx.resume().then(go); else go();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => global.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  function setPref(k, v) {
    pref[k] = v;
    try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch (e) { /* 保存できなくても鳴らし分けは効く */ }
    if (!ctx) return;
    if (k === 'bgm') bgmBus.gain.setTargetAtTime(v ? 0.55 : 0, ctx.currentTime, 0.05);
    if (k === 'se') seBus.gain.setTargetAtTime(v ? 0.8 : 0, ctx.currentTime, 0.02);
  }

  global.Sound = { bgm, jingle, se, setPref, pref: () => ({ ...pref }) };
})(window);
