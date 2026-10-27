# App Store の掲載情報（下書き）

App Store Connect の「配信」タブ（iOS App のバージョン 1.0.0）に貼り付けます。プライマリ言語は日本語、「English (U.S.)」をローカリゼーションに追加して英語を入れてください。
概要（説明文）は Google Play 用と同じです（`../listing.md`、`../listing-en.txt`）。

## 画像（このフォルダ）

| 用途 | ファイル | サイズ |
| --- | --- | --- |
| スクリーンショット（日本語）「Dynamic Island 搭載 iPhone（中型ディスプレイ）」 | `6.3inch/ja-1-radar.png` 〜 `ja-4-map.png` | 1206 × 2622（縦向き） |
| スクリーンショット（英語） | `6.3inch/en-1-radar.png` 〜 `en-4-map.png` | 1206 × 2622（縦向き） |
| ヘッダ | `appstore-header-3840x1646.png` | 3840 × 1646 |
| 検索結果 | `appstore-search-3840x2560.png` | 3840 × 2560 |

画像は `node tools/store-screenshots.js ios ja-JP ja`（`ios en-US en`、`art`）で作り直せます。

---

## 日本語

**名前**（30 文字以内・20 文字）

```
クリックトリップ 〜歩いて日本を旅する〜
```

**サブタイトル**（30 文字以内・19 文字）

```
歩いた距離だけ日本を進む位置情報ゲーム
```

**プロモーション用テキスト**（170 文字以内・73 文字。審査なしでいつでも変更できる）

```
「移動距離を測る」を押して、歩いて、スワイプ。実際に移動した距離だけ、ゲームの中の日本を旅しよう。全国2000の観光地に、ぴたりと着地できるかな？
```

**キーワード**（100 文字以内・62 文字。カンマ区切り、空白なし。名前とサブタイトルにある語は入れなくてよい）

```
位置情報,旅行,観光,散歩,ウォーキング,歩数,日本,観光地,レーダー,クイズ,レトロ,ドット,すごろく,旅,スタンプラリー
```

**概要**（4000 文字以内・814 文字）

```
歩いた距離が、そのまま旅の距離になる。

「移動距離を測る」ボタンを押すと、前回押した場所からあなたが実際に移動した距離がたまります。
レーダーを見て行きたい方角へスワイプすれば、その距離だけゲームの中の日本を進みます。
全国2000か所の観光地に、ぴたりと着地できるかな？

■ あそびかた
・ボタンを押して、散歩・通勤・旅行で実際に移動する
・もう一度押すと、移動した距離がチャリーンとたまる
・レーダーで観光地の方角と距離を確かめて、スワイプで出発
・観光地は2km四方のマス。ちょうどそのマスに着地できたら到着！
・距離は全部使い切るので、遠すぎるときは寄り道して三角形を描くように進むのがコツ

■ 全国2000の観光地
・国土交通省の観光資源データから、北海道から沖縄まで2000か所を収録
・お寺や神社、お城、温泉、滝、祭り、郷土の味まで
・到着すると、その場所をイメージしたイラストと解説が届く

■ クリックトリップ・クイズ
・観光地ごとにクイズの問いだけが出題される
・答えは友だちやSNSのみんなに聞いてみよう

■ レトロな電子音
・8ビット風のレトロなBGMと効果音
・レーダーのソナー音、距離のカウントアップ、到着のファンファーレ

■ その他
・旅の記録、都道府県ごとの達成度、日本地図で旅の軌跡を確認
・はずれても、広告を見れば移動をやり直してもう一度ねらえる
・海外からでも、東京・京都・大阪・札幌・沖縄などの玄関口を選んで日本の旅を始められる
・GPSなしで遊べるデモモードつき
・日本語と英語に対応

■ プライバシー
位置情報は、移動した距離を端末の中で計算するためだけに使います。端末の外に送ることはありません。

本作は、世界初の位置情報取得型ゲームとして生まれた「クリックトリップ」のリバイバル作品です。
観光地データ：「国土数値情報（観光資源データ）」（国土交通省）を加工して作成
```

---

## English (U.S.)

**名前**（30 文字以内・29 文字）

```
Click Trip: Walk Across Japan
```

**サブタイトル**（30 文字以内・27 文字）

```
Walk to travel across Japan
```

**プロモーション用テキスト**（170 文字以内・157 文字。審査なしでいつでも変更できる）

```
Tap "Measure distance", go for a walk, then swipe the radar. You travel across Japan exactly as far as you really moved. Can you land on one of 2,000 sights?
```

**キーワード**（100 文字以内・97 文字。カンマ区切り、空白なし。名前とサブタイトルにある語は入れなくてよい）

```
walking,travel,japan,location,gps,sightseeing,radar,quiz,retro,8-bit,walk,steps,tourism,adventure
```

**概要**（4000 文字以内・2091 文字）

```
The distance you walk becomes the distance you travel.

Tap "Measure distance" and the distance you have actually moved since your last tap is saved up. Look at the radar, swipe toward where you want to go, and you travel exactly that far across Japan in the game. Can you land right on one of 2,000 sightseeing spots?

■ HOW TO PLAY
• Tap the button, then really move — a walk, your commute, a trip
• Tap again and the distance you moved is added up with a satisfying count
• Check the direction and distance of nearby spots on the radar
• Swipe on the radar scope to set off in that direction
• Each spot is a 2 km square. Land right on it to arrive!
• You always use up all of your distance, so when a spot is too close, take a detour and travel in a triangle

■ PLAY FROM ANYWHERE IN THE WORLD
• Outside Japan? Choose a gateway — Tokyo, Kyoto, Osaka, Sapporo, Okinawa and more
• Then every step you take at home moves you across Japan

■ 2,000 SPOTS ACROSS JAPAN
• From Hokkaido to Okinawa, based on tourism resource data from Japan's Ministry of Land, Infrastructure, Transport and Tourism
• Temples, shrines, castles, hot springs, waterfalls, gorges, festivals and local food
• Every arrival brings a postcard-style illustration of the place and a short travel guide

■ CLICK TRIP QUIZ
• Each spot comes with a quiz question — but no answer
• Share it and ask your friends and followers to answer

■ RETRO CHIPTUNE SOUND
• 8-bit style music and sound effects
• Radar sonar pings, a counting distance meter and an arrival fanfare

■ MORE
• Travel log, progress by prefecture and your route on a map of Japan
• Missed a spot? Watch an ad to undo the move and aim again
• A demo mode lets you play without GPS
• Available in English and Japanese

■ YOUR PRIVACY
Your location is only used on your device to calculate how far you moved. It is never sent anywhere.

A revival of "Click Trip", born as the world's first location-based game.
Spot data: processed from "National Land Numerical Information (Tourism Resources)", Ministry of Land, Infrastructure, Transport and Tourism of Japan.
```
