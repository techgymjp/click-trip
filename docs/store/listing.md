# Google Play ストア掲載情報（下書き）

Play Console の「ストアの掲載情報」に貼り付けて使います。既定の言語を日本語にし、「翻訳を管理」から英語（en-US）を追加してください。

## 画像（このフォルダ）

| 用途 | ファイル | サイズ |
| --- | --- | --- |
| アプリのアイコン | `icon-512.png` | 512 × 512 |
| フィーチャー グラフィック | `feature-graphic.png` | 1024 × 500 |
| スマートフォンのスクリーンショット（日本語） | `ja-1-start.png` 〜 `ja-6-log.png` | 1080 × 1920 |
| スマートフォンのスクリーンショット（英語） | `en-1-start.png` 〜 `en-6-log.png` | 1080 × 1920 |

画像は `node tools/render-assets.js`（アイコン・フィーチャー グラフィック）で作り直せます。

---

## 日本語

**アプリ名**（30 文字以内）

```
クリックトリップ 〜歩いて日本を旅する〜
```

**簡単な説明**（80 文字以内）

```
歩いた距離だけ日本を旅する位置情報ゲーム。レーダーを見てスワイプ、全国2000の観光地をめざせ！
```

**詳しい説明**

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
・ファミコン風のBGMと効果音
・レーダーのソナー音、距離のカウントアップ、到着のファンファーレ

■ その他
・旅の記録、都道府県ごとの達成度、日本地図で旅の軌跡を確認
・位置情報は移動距離の計算にだけ使い、端末の外には送りません
・GPSなしで遊べるデモモードつき

本作は、世界初の位置情報取得型ゲームとして生まれた「クリックトリップ」のリバイバル作品です。
観光地データ：「国土数値情報（観光資源データ）」（国土交通省）を加工して作成
```

**リリースノート**

```
<ja-JP>
はじめてのリリースです。歩いた距離だけ日本を旅しよう！
</ja-JP>
<en-US>
First release. Travel across Japan as far as you actually walk!
</en-US>
```

---

## English (en-US)

**App name** (30 characters max)

```
Click Trip: Walk Across Japan
```

**Short description** (80 characters max)

```
A location game: travel Japan as far as you walk. Swipe the radar to 2,000 sights!
```

**Full description**

```
The distance you walk becomes the distance you travel.

Tap "Measure distance" and the distance you have actually moved since the last tap is saved up.
Look at the radar, swipe toward where you want to go, and you travel that far across Japan in the game.
Can you land exactly on one of 2,000 sightseeing spots?

■ How to play
- Tap the button, then actually move: a walk, your commute, a trip
- Tap again and the distance you moved is added up
- Check the direction and distance of nearby spots on the radar, then swipe to set off
- Each spot is a 2 km square. Land right on it to arrive!
- You always use up all your distance, so take a detour in a triangle when a spot is too close

■ 2,000 spots across Japan
- From Hokkaido to Okinawa, based on tourism resource data from Japan's Ministry of Land, Infrastructure, Transport and Tourism
- Temples, shrines, castles, hot springs, waterfalls, festivals and local food
- Each arrival brings an illustration of the place and a guide

■ Click Trip Quiz
- Each spot comes with a quiz question only
- Ask your friends and followers for the answer

■ Retro chiptune sound
- 8-bit style music and sound effects
- Radar sonar pings, a counting distance meter and an arrival fanfare

■ More
- Travel log, progress by prefecture and your route on a map of Japan
- Your location is only used to calculate distance and never leaves your device
- A demo mode lets you play without GPS

A revival of "Click Trip", born as the world's first location-based game.
Spot data: processed from "National Land Numerical Information (Tourism Resources)", MLIT Japan.
```

---

## アプリのコンテンツ（このゲーム固有の回答）

- **データセーフティ**：位置情報（正確な位置・おおよその位置）は端末内の計算にだけ使い、送信しないので「収集」には当たらない。AdMob が広告 ID とアプリの操作を広告・アナリティクス目的で収集・共有。通信は暗号化
- **権限の説明**：位置情報はアプリを使用中のみ（バックグラウンドでは使わない）
- **コンテンツのレーティング**：暴力・性的表現・ギャンブルなし。位置情報を使う（他のユーザーとは共有しない）
