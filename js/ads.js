// Google AdMob 広告（Android アプリのときだけ動く。Web 版では何もしない）
const Ads = (() => {
  const UNITS = {
    // Google 公式のテスト用広告ユニット
    test: {
      banner: 'ca-app-pub-3940256099942544/9214589741',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
      rewarded: 'ca-app-pub-3940256099942544/5224354917',
    },
    // AdMob でクリックトリップ用の広告ユニットを作ったら、ここに ID を入れる。
    // 空の種類は本番ビルドでも出さない（JET STRIKE の ID を誤って使わないため）
    production: {
      banner: '',
      interstitial: 'ca-app-pub-6411535997477460/4418804225',
      rewarded: '',
    },
  };
  const RETRY_MS = 20000;      // 読み込みに失敗したら少し待って再挑戦する
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const testing = window.AD_MODE !== 'production';
  const ids = testing ? UNITS.test : UNITS.production;
  // ID が入っている種類だけ使う。1 つも無ければ AdMob 自体を動かさない
  const use = { banner: !!ids.banner, inter: !!ids.interstitial, reward: !!ids.rewarded };
  const AdMob = native && cap.Plugins && (use.banner || use.inter || use.reward) ? cap.Plugins.AdMob : null;

  let ready = false;           // 広告をリクエストしてよい状態（初期化と同意確認が済んだ）
  let showing = false;
  let privacyRequired = false; // 「広告の設定」を利用者が開けるようにする必要があるか（EU など）
  let bannerWanted = true;     // 画面の都合でバナーを出してよいか（到着画面などの全画面表示中は隠す）
  let bannerState = 'none';    // 'none'（未表示）/ 'shown' / 'hidden'
  const waiters = {};          // 表示中の広告が閉じたときに呼ぶ処理

  // 広告の種類ごとの読み込み状態
  const slots = {
    inter: { loaded: false, pending: null, load: () => AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: testing }) },
    reward: { loaded: false, pending: null, load: () => AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: testing }) },
  };

  // 読み込みを始め、読み込めたら true で resolve する Promise を返す（読み込み中なら同じ Promise）
  function prepare(kind) {
    const s = slots[kind];
    if (!ready) return Promise.resolve(false);
    if (s.loaded) return Promise.resolve(true);
    if (!s.pending) {
      s.pending = s.load()
        .then(() => { s.loaded = true; return true; })
        .catch(() => { setTimeout(() => prepare(kind), RETRY_MS); return false; })
        .finally(() => { s.pending = null; });
    }
    return s.pending;
  }

  // 読み込み済みでなければ、最大 timeout ミリ秒だけ読み込みを待つ
  function ensureLoaded(kind, timeout) {
    if (slots[kind].loaded) return Promise.resolve(true);
    return Promise.race([prepare(kind), new Promise(r => setTimeout(() => r(false), timeout))]);
  }

  function finish(kind, result) {
    showing = false;
    Sound.resume();
    const w = waiters[kind];
    waiters[kind] = null;
    if (w) w(result);
  }

  async function init() {
    try {
      await AdMob.initialize({ initializeForTesting: testing });
    } catch (e) {
      return;
    }
    // EU・英国などで必要な広告の同意確認（必要な地域でだけフォームが出る）。
    // 確認自体が失敗した場合（AdMob 側でメッセージ未設定など）は、同意不要の地域とみなして続ける
    try {
      let consent = await AdMob.requestConsentInfo();
      if (consent.status === 'REQUIRED' && consent.isConsentFormAvailable) consent = await AdMob.showConsentForm();
      ready = consent.canRequestAds !== false;
      privacyRequired = consent.privacyOptionsRequirementStatus === 'REQUIRED';
    } catch (e) {
      ready = true;
    }
    let rewarded = false;
    AdMob.addListener('interstitialAdDismissed', () => finish('inter'));
    AdMob.addListener('interstitialAdFailedToShow', () => finish('inter'));
    AdMob.addListener('onRewardedVideoAdShowed', () => { rewarded = false; });
    AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
    AdMob.addListener('onRewardedVideoAdDismissed', () => finish('reward', rewarded));
    AdMob.addListener('onRewardedVideoAdFailedToShow', () => finish('reward', false));
    // バナーの高さぶん画面下のタブを持ち上げる（高さは dp ＝ WebView の CSS px）
    AdMob.addListener('bannerAdSizeChanged', (size) => {
      document.documentElement.style.setProperty('--ad-h', `${(size && size.height) || 0}px`);
    });
    AdMob.addListener('bannerAdFailedToLoad', () => {
      bannerState = 'none';
      document.documentElement.style.setProperty('--ad-h', '0px');
      setTimeout(updateBanner, RETRY_MS);
    });
    if (use.inter) prepare('inter');
    if (use.reward) prepare('reward');
    updateBanner();
  }

  // 画面下のバナー。全画面の画面（到着・はじめに）を開いている間は隠し、閉じたら戻す
  function updateBanner() {
    if (!AdMob || !use.banner || !ready) return;
    if (bannerWanted && bannerState === 'none') {
      bannerState = 'shown';
      AdMob.showBanner({ adId: ids.banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: testing })
        .catch(() => { bannerState = 'none'; });
    } else if (bannerWanted && bannerState === 'hidden') {
      bannerState = 'shown';
      AdMob.resumeBanner().catch(() => {});
    } else if (!bannerWanted && bannerState === 'shown') {
      bannerState = 'hidden';
      AdMob.hideBanner().catch(() => {});
    }
  }

  function setBannerVisible(v) {
    bannerWanted = v;
    updateBanner();
  }

  // 全画面広告を表示し、閉じられたら resolve する（読み込めていないときは出さずにすぐ resolve）
  function showInterstitial() {
    if (!AdMob || !use.inter || !ready || !slots.inter.loaded || showing) return Promise.resolve();
    showing = true; slots.inter.loaded = false;
    Sound.suspend();
    return new Promise(resolve => {
      waiters.inter = () => { prepare('inter'); resolve(); };
      AdMob.showInterstitial().catch(() => finish('inter'));
    });
  }

  // リワード広告を表示する。結果は 'rewarded'（最後まで見た）/ 'skipped'（途中で閉じた）/ 'unavailable'（読み込めなかった）
  async function showRewarded() {
    if (!AdMob || !use.reward || showing) return 'unavailable';
    await initDone;
    if (!ready || !(await ensureLoaded('reward', 8000))) return 'unavailable';
    showing = true; slots.reward.loaded = false;
    Sound.suspend();
    return new Promise(resolve => {
      waiters.reward = ok => { prepare('reward'); resolve(ok ? 'rewarded' : 'skipped'); };
      AdMob.showRewardVideoAd().catch(() => finish('reward', false));
    });
  }

  // 同意した内容をあとから変更するための Google のフォームを開く
  function showPrivacyOptions() {
    if (!AdMob) return Promise.resolve();
    return AdMob.showPrivacyOptionsForm().catch(() => {});
  }

  const initDone = AdMob ? init() : Promise.resolve();

  return {
    get available() { return !!AdMob; },
    get interstitialAvailable() { return !!AdMob && use.inter; },
    get rewardAvailable() { return !!AdMob && use.reward; },
    get showing() { return showing; },
    get privacyOptionsRequired() { return privacyRequired; },
    initDone,
    showInterstitial,
    showRewarded,
    showPrivacyOptions,
    setBannerVisible,
  };
})();
