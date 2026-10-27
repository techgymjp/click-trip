# iOS 版をビルドして App Store に出す手順（Mac での作業）

クリックトリップの iOS 版は、Android 版と同じ Capacitor で作っています（`ios/` フォルダ）。構成は JET STRIKE と同じです。
コードの準備はできているので、Mac では「ビルドして App Store Connect にアップロードする」作業だけを行います。

- Bundle ID：`jp.techgym.clicktrip`（Android のパッケージ名と同じ）
- チーム：Team ID `GNM3VTX9YG`（Xcode の設定に入れてあります）。Apple Developer には**個人で登録**しています（App Store の販売元は個人名になります）
- 対応端末：iPhone（**縦画面固定**）。iPad では iPhone 用の画面で動きます
- アプリ名：日本語の端末では「クリックトリップ」、それ以外では「Click Trip」
- 位置情報：「移動距離を測る」を押したときだけ使います（アプリの使用中のみ。端末の外には送りません）。初回に許可の確認画面が出ます
- 広告：AdMob（iOS 用のアプリと広告ユニット）。起動時に「トラッキングの許可」の確認画面が出ます
- 画面の点けっぱなしはしません（歩きながらポケットに入れるゲームなので。Android 版も同じ）

---

## 0. ブラウザで先に済ませること

1. **Apple Developer**（developer.apple.com）→「Certificates, Identifiers & Profiles」→「Identifiers」→「＋」→「App IDs」→「App」
   - Description：`Click Trip`
   - Bundle ID：「Explicit」で `jp.techgym.clicktrip`
   - Capabilities：何もチェックしない（位置情報・AdMob・シェアに特別な機能は不要）
2. **App Store Connect**（appstoreconnect.apple.com）→「マイ App」→「＋」→「新規 App」
   - プラットフォーム：iOS ／ 名前：`クリックトリップ 〜歩いて日本を旅する〜`（Google Play と同じ。30 文字以内、App Store 全体で重複不可）／ プライマリ言語：日本語
   - バンドル ID：1 で登録したもの ／ SKU：`clicktrip`（あとから変更不可）／ ユーザアクセス：アクセス制限なし
3. **AdMob**
   - 「アプリを追加」→ **iOS** →「ストアに掲載されていない」で登録し、バナー・インタースティシャル・リワードの広告ユニットを作る
   - アプリ ID（`ca-app-pub-…~…`）と広告ユニット ID を Claude Code に渡す（`ios/App/App/Info.plist` と `js/ads.js` に入れます）
   - 「プライバシーとメッセージ」→「欧州の規制」のメッセージに iOS アプリも追加する

---

## 1. Mac の準備（最初の1回だけ）

1. **Xcode** を App Store からインストールする（数十 GB あるので時間がかかります）。インストール後に一度起動し、追加コンポーネントのインストールを済ませる
2. Xcode の「Settings…」→「Accounts」→「＋」で、Apple Developer に登録している Apple ID でサインインする（チームが個人名で表示されれば OK）
3. **Node.js**（LTS 版）を https://nodejs.org/ からインストールする
4. ターミナルでリポジトリを取得する
   ```bash
   cd ~/Desktop   # 置きたい場所（どこでもよい）
   git clone https://github.com/techgymjp/click-trip.git
   cd click-trip
   npm ci
   ```
   `git` がないと言われたら、表示に従って「コマンドライン・デベロッパツール」をインストールしてから、もう一度実行します。

2回目以降は、`cd click-trip` のあと `git pull` と `npm ci` で最新にします。

---

## 2. 自分の iPhone で動作確認する（テスト広告）

```bash
npm run ios:sync    # ゲームのファイルを iOS のプロジェクトにコピー（テスト広告）
npm run ios:open    # Xcode で開く
```

1. iPhone を USB ケーブルで Mac につなぎ、iPhone で「このコンピュータを信頼」を許可する
2. iPhone の「設定」→「プライバシーとセキュリティ」→「デベロッパモード」をオンにする（再起動を求められます。項目がない場合は、Xcode で一度 iPhone を選ぶと表示されます）
3. Xcode の上部で、実行先に自分の iPhone を選ぶ
4. 左の「App」→「Signing & Capabilities」で、「Automatically manage signing」がオン、Team に自分（個人名）のチームが選ばれていることを確認する
5. ▶（Run）を押すと、iPhone にアプリが入って起動する

確認すること：

- 縦画面で全画面表示になり、上の文字がノッチ（Dynamic Island）に隠れない
- トラッキングの確認画面が出る
- 「現在地から旅をはじめる」で**位置情報の確認画面**が出て、許可すると旅が始まる
- 少し歩いて「移動距離を測る」を押すと距離がたまり、レーダーをスワイプすると進む
- 音が鳴る（消音スイッチがオンだと鳴りません）
- 画面下に**テスト広告のバナー**、到着画面を閉じたときに**テスト広告のインタースティシャル**、はずれたときの「広告を見てやり直す」で**テスト広告のリワード**が出る
- 到着画面の「共有して答えを募る」で共有メニューが出る
- 設定で「English」に切り替えると英語になる

歩かずに確かめるときは、はじめの画面の「GPSなしで遊ぶ（デモ）」か、設定のデモモードを使います。

---

## 3. App Store 用にビルドしてアップロードする（本番広告）

```bash
git pull && npm ci
npm run ios:release   # 本番の広告 ID でコピーする（ここが ios:sync と違う）
npm run ios:open
```

1. Xcode の左で「App」→「General」→「Identity」を開き、**Build の番号を前回より大きくする**（初回は 1。アップロードのたびに 2、3…と上げる。同じ番号は二度アップロードできない）。Version はストアに表示されるバージョン（1.0.0）
2. 上部の実行先を「**Any iOS Device (arm64)**」にする
3. メニューの「Product」→「**Archive**」（Product メニューは画面最上部のメニューバーにあります。全画面表示だと隠れるので、マウスを画面の上端に動かす）
4. 終わると Organizer が開くので、「**Distribute App**」→「**App Store Connect**」→「Upload」で進める（途中の確認は既定のまま「Next」でよい。「Xcode Cloud can automate…」は「Remind Me Later」で閉じる）
5. 10〜30 分ほどで、App Store Connect の「TestFlight」タブにビルドが表示される

輸出コンプライアンス（暗号化）の質問は、Info.plist で「独自の暗号化は使っていない」と設定済みなので、聞かれません。

**注意**：`ios:release` でビルドしたアプリは本番の広告が出ます。TestFlight で確認するときも、**本番の広告はタップしない**でください（AdMob のアカウント停止の対象）。Xcode から iPhone に直接入れて試すときは、`npm run ios:sync` でテスト広告に戻してから実行します。

---

## 4. TestFlight で確認し、審査用の画面録画を撮る

1. App Store Connect の「TestFlight」→「内部テスト」でグループを作り、自分を追加する
2. iPhone に「TestFlight」アプリを App Store から入れ、届いた招待からクリックトリップをインストールする
3. **審査用の画面録画を撮る**（新しいアカウントの初回審査では、実機の操作の録画を求められます。先に用意して、提出時に添えると早く進みます）

### 画面録画の撮り方

- iPhone の「設定」→「コントロールセンター」に「画面収録」を追加し、コントロールセンターから録画を始める
- 撮る前に、アプリを一度削除して入れ直す（初回の確認画面を撮るため）。iOS は最新版にしておく
- 録画する流れ（2〜3 分が目安）：
  1. ホーム画面からアプリを起動する
  2. トラッキングの確認画面 →（許可でも拒否でもよい）
  3. はじめの画面で「現在地から旅をはじめる」→ 位置情報の確認画面で「App の使用中は許可」
  4. 少し歩いてから「移動距離を測る」を押し、距離がたまるところ
  5. レーダーをスワイプして移動するところ（はずれたら「広告を見てやり直す」でテスト広告→元の場所に戻る）
  6. 観光地に到着する画面（解説・クイズ・共有ボタン）→「旅を続ける」で広告
  7. 旅の記録・日本地図・設定（言語の切り替え、デモモード）
- 歩いて観光地に着くのは難しいので、6 は**デモモード**（設定 → デモモード、またははじめの画面の「GPSなしで遊ぶ」）で距離をためて撮ってよい。録画の中で「デモモードで確認している」ことが分かるようにする
- ファイルが大きいと App Review への返信に添付できない（400MB でも失敗した例あり）。Mac の Finder で右クリック →「選択したビデオファイルをエンコード」→ 720p にするか、Google ドライブの共有リンクを返信に貼る

---

## 5. App Store Connect で審査に出す

「配信」タブ（iOS App のバージョン 1.0.0）で入力します。バージョンのページの「バージョン」が「1.0」になっていたら **1.0.0** に直して保存します（アプリの Version と違うと、アップロードしたビルドが選べません）。

| 項目 | 入力内容 |
| --- | --- |
| スクリーンショット | 「Dynamic Island 搭載 iPhone（中型ディスプレイ）」の欄に、`docs/store/ios/6.3inch/` の画像（**縦向き 1206 × 2622**）を入れる。日本語（ja-）と英語（en-）各 4 枚。このゲームは縦画面なので縦向きの画像にしている |
| ヘッダ・検索結果 | 「ヘッダと検索結果」タブに `docs/store/ios/appstore-header-3840x1646.png` と `appstore-search-3840x2560.png`（ヘッダを入れたら検索結果も入れる。片方だけだと赤枠になる） |
| サブタイトル・プロモーション用テキスト・概要・キーワード | `docs/store/ios/appstore-listing.md`（日英） |
| サポート URL | https://techgym.jp/ |
| マーケティング URL | https://techgym.jp/column/claude-code-game-click-trip/ |
| 著作権 | 2026 TECH GYM K.K. |
| ビルド | TestFlight で確認したビルドを選ぶ |
| App Review に関する情報 | ログイン不要。連絡先を入力。メモに下の「審査へのメモ」を入れる |

「アプリ情報」のページ：

| 項目 | 入力内容 |
| --- | --- |
| カテゴリ | プライマリ「ゲーム」（サブカテゴリ「アドベンチャー」）、セカンダリ「旅行」 |
| コンテンツの配信権 | 第三者のコンテンツ：「いいえ」（観光地の名前・位置は国土交通省のオープンデータを加工したもの。絵・音・文章は自前） |
| 年齢制限 | 質問にはすべて「なし」。暴力・性的表現・ギャンブルなし。位置情報を使うが、ほかの利用者とは共有しない |

「アプリのプライバシー」のページ：

- プライバシーポリシー URL：https://techgym.jp/privacy-policy/
- **位置情報**：アプリは移動距離を端末の中で計算するだけで、開発者のサーバーにも第三者にも送らない（＝アプリとしては「収集」しない）
- **AdMob が収集するデータ**（Google の「Apple の App Store のデータ開示要件への準備」（AdMob のヘルプ）で必ず最終確認する。目安）
  - 収集する：ID（デバイス ID）、使用状況データ（広告データ、製品の操作）、診断（クラッシュデータ、パフォーマンスデータ、その他の診断データ）、位置情報（おおよその場所）
  - 目的：サードパーティ広告、アナリティクス
  - ユーザーに関連付け：しない
  - トラッキングに使用：デバイス ID と広告データは「する」

入力が終わったら「審査用に追加」→「審査へ提出」。

### 審査へのメモ（App Review に関する情報の「メモ」と、「Guideline 2.1 - Information Needed」への返信に使う）

```
Thank you for reviewing Click Trip.

1. Screen recording
A screen recording on a physical iPhone (latest iOS), from launch, is attached / available here: <動画の URL>

2. Purpose and audience
Click Trip is a location-based travel game for players aged 13 and over. Each time the player taps "Measure distance", the game measures how far they have actually moved since the last tap, and the player travels that distance across a virtual map of Japan by swiping on a radar. Landing on one of 2,000 sightseeing spots shows an illustration, a short guide and a quiz question.

3. How to use / review the app
No login or account is needed. Because real movement is required, you can review the whole game without walking: tap "Play without GPS (demo)" on the first screen (or turn on Demo mode in Settings). In demo mode each tap on "Measure distance" adds a random distance. Swipe on the radar toward a nearby spot shown in the list to travel.

4. Third-party services
Google AdMob (banner, interstitial and rewarded ads) with Google's consent form (UMP) and App Tracking Transparency. Location is used only on the device to calculate distance and is never sent to us or anyone else.

5. Regional differences
None. The app is available in Japanese and English. Players outside Japan choose a starting point in Japan (e.g. Tokyo Station).

6. Regulated industries / third-party content
Not in a regulated industry. Spot names and locations are processed from open data published by Japan's Ministry of Land, Infrastructure, Transport and Tourism (National Land Numerical Information). All illustrations, music, sound effects and texts were made for this game.
```

---

## 6. 公開後にやること

- AdMob で iOS アプリを App Store のアプリに紐づける（「アプリ」→ iOS のクリックトリップ →「アプリの設定」）
- App Store からインストールして、起動・同意画面・トラッキングと位置情報の確認・広告を確認する

---

## 7. 自動化の準備（2回目以降を GitHub Actions に任せる場合）

JET STRIKE の `docs/IOS_BUILD.md` の 7 章と同じです。証明書（.p12）と App Store Connect の API キー（.p8）を作り、このリポジトリの Secrets（https://github.com/techgymjp/click-trip/settings/secrets/actions）に次の 5 つを登録します。JET STRIKE で作ったファイルとパスワードをそのまま使い回せます。

| 名前 | 内容 |
| --- | --- |
| `IOS_DIST_CERT_P12_BASE64` | 証明書（.p12）を `base64 -i 証明書.p12 \| tr -d '\n' \| pbcopy` で変換した文字列 |
| `IOS_DIST_CERT_PASSWORD` | .p12 を書き出したときのパスワード |
| `ASC_KEY_ID` | API キーのキー ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | API キー（.p8）を `base64 -i AuthKey_XXXXXXXXXX.p8 \| tr -d '\n' \| pbcopy` で変換した文字列 |

登録すると、既定ブランチに push するたびに GitHub Actions（`.github/workflows/ios-release.yml`）が次のことを自動で行います（10〜20 分）。

1. 本番広告の設定でゲームのファイルを iOS のプロジェクトにコピーする（`ios:release` と同じ）
2. 証明書を一時的なキーチェーンに入れ、App Store Connect API で App Store 用のプロビジョニングプロファイル（名前 `Click Trip App Store CI`）を用意する（なければ作る）
3. ビルド番号を **Actions の実行回数 × 100**（100、200、300…）にして Archive し、App Store Connect（TestFlight）にアップロードする。手元の Mac で Archive するビルド（1、2、3…）とは番号がぶつからない

アップロードが終わると、10〜30 分で App Store Connect の「TestFlight」タブにビルドが出ます。審査への提出は、これまでどおり App Store Connect で行います。
手動で動かすときは、GitHub の「Actions」→「iOS release (TestFlight)」→「Run workflow」。

**注意**：証明書（.p12）、そのパスワード、API キー（.p8）は、チャット・AI へのアップロード・リポジトリへのコミットで**絶対に共有しない**でください。

このほか `.github/workflows/ios.yml` が、push のたびに署名なしで「ビルドできるか」を確認しています（Secrets がなくても動きます）。

---

## つまずきやすいところ

| 症状 | 対処 |
| --- | --- |
| アップロードで「同じビルド番号がすでにある」 | General の Build の番号を上げてから Archive し直す |
| Signing でエラー（チームが選べない、証明書がない） | Xcode の Accounts で Apple ID にサインインし直し、Team に自分のチームを選ぶ。「Automatically manage signing」をオンにする |
| 実行先に iPhone が出ない | ケーブルをつなぎ直し、iPhone で「信頼」を許可。デベロッパモードをオンにする |
| 実行先に「iOS 26.x Not Installed」と出る | 「Get」で iOS のシミュレーターと部品をダウンロードする（8 GB ほど。Archive にも必要） |
| ビルドが古いゲームのまま | `npm run ios:sync`（または `ios:release`）を実行し忘れている。`git pull` してから実行し直す |
| 位置情報の確認画面が出ない・距離がたまらない | iPhone の「設定」→「クリックトリップ」→「位置情報」を「App の使用中」にする。「正確な位置情報」もオンにする |
| 音が鳴らない | 消音スイッチ（アクションボタン）を確認する。最初に画面に触れたときから鳴る |
| ビルドを選ぼうとしても、アップロードしたビルドが出てこない | バージョンのページの「バージョン」を 1.0.0 に直して保存する |
| 「審査用に追加できません」 | 「アプリ情報」の「コンテンツの配信権」と、「アプリのプライバシー」のプライバシーポリシー URL を入力して保存する |
| Actions の「iOS release」が証明書やプロファイルで失敗する | Secrets の .p12 が「Apple Distribution」の証明書か、取り消されていないかを確認する。API キーのアクセスが「管理」（Admin）になっているかも確認する |
| 本番広告とテスト広告の取り違え | App Store 用は必ず `npm run ios:release`。Xcode から実機で試すときは `npm run ios:sync` に戻す |
| App Store の審査で「Xcode が古い」と言われる | Xcode を最新版に更新してから Archive し直す |
