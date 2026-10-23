#!/usr/bin/env python3
"""国土数値情報「観光資源（P12, 2014年版）」から、ゲームに配置する観光地 2000 件を選ぶ。

使い方:
  python3 tools/build_spots.py <P12-14_XX.geojson が入ったディレクトリ> > data/spots_base.json

選定方針:
  1. 種別（P12_005）が付いた全国的な観光資源はすべて採用する
  2. 残りは名称のキーワードで観光地らしさを採点し、都道府県ごとに均等になるよう
     上位から補充する。ゲーム盤の 2km マスが既に埋まっている候補は飛ばす
"""
import glob
import json
import math
import os
import re
import sys
from collections import defaultdict

TARGET = 2000
CELL_KM = 2.0

PREFS = ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県",
         "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
         "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
         "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県",
         "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"]

BAD = re.compile(
    r"ゴルフ|カントリー|ＣＣ|CC|倶楽部|クラブ|サービスエリア|運動公園|グラウンド|グランド|体育|プール|民宿|旅館|ホテル|"
    r"宿泊|センター|会館|組合|ツアー|マラソン|フェア|フェスタ|フェスティバル|キャンプ|保健|福祉|公民館|アリーナ|球場|"
    r"スポーツ|競技|大会|応援団|林間学校|研修|少年|青少年|直売|産業祭|農業まつり|菊花展|〜|～|【|ドライブイン|"
    r"観光協会|連盟|交流|商工|釣り|水泳場|パーク.*ゴルフ|朝市|日曜市|初市|物産|市場|カーニバル|コンサート|"
    r"ショッピング|ロイヤル|リフレッシュ|案内所|情報|ビジター|駐車|ふれあい|健康|イルミネーション|"
    r"（.*(宿泊|各種|旅館|観賞)）|全域|周辺|一帯|ほか|その他|等$|の家$|荘$|館$|湯$|屋$|店$")
GOOD = [
    (r"大社|神宮|天満宮|八幡宮|大仏", 6), (r"寺|神社|観音|権現|稲荷", 4), (r"城$|城跡|城址|御所|宮殿", 6),
    (r"温泉郷|温泉$", 5), (r"滝$|瀑", 5), (r"峡$|渓谷|峡谷|峡", 5), (r"岬$|海岸|浜$|浦$|半島", 4),
    (r"湖$|沼$|池$|潟$", 4), (r"島$|諸島", 4), (r"岳$|山$|峠$|連峰|火口", 4), (r"高原|湿原|原生林|原野", 5),
    (r"庭園|園$", 3), (r"美術館|博物館", 3), (r"古墳|遺跡|史跡|跡$", 4), (r"街並|町並|宿$|宿場|屋敷|通り$", 4),
    (r"灯台|橋$|洞$|鍾乳洞|岩$|石$", 4), (r"祭$|まつり$|祭り$|踊り?$|神楽", 3), (r"公園", 1), (r"桜|サクラ|梅林|ツツジ|紅葉", 2),
]


# 元データ（P12）の所在地・座標の誤りを直す。キーは (都道府県コード, P12_001)
CORRECTIONS = {
    # 仁和寺の御室桜。元データは金閣寺と同じ住所・座標になっている
    ("26", 10007): {"addr": "京都市右京区御室大内33", "lat": 35.0310, "lon": 135.7138},
    # 渋温泉は山ノ内町。元データは長野市の西に置かれている
    ("20", 10002): {"addr": "山ノ内町", "lat": 36.7322, "lon": 138.4265},
    # 野沢温泉は野沢温泉村（大湯のあたり）。元データは山ノ内町（渋温泉の近く）になっている
    ("20", 10443): {"addr": "野沢温泉村", "lat": 36.9227, "lon": 138.4404},
    # 有田焼の窯元が集まるのは有田町（内山地区）。元データは佐賀市になっている
    ("41", 10001): {"addr": "有田町", "lat": 33.1905, "lon": 129.8815},
}


def cell_of(lat, lon):
    dlat = CELL_KM / 111.32
    row = math.floor(lat / dlat)
    clat = (row + 0.5) * dlat
    dlon = CELL_KM / (111.32 * math.cos(math.radians(clat)))
    return row, math.floor(lon / dlon)


def coords_of(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "Point":
        return [c]
    if t in ("MultiPoint", "LineString"):
        return c
    if t in ("Polygon", "MultiLineString"):
        return [p for ring in c for p in ring]
    if t == "MultiPolygon":
        return [p for poly in c for ring in poly for p in ring]
    return []


def representative(points):
    """点群の重心にいちばん近い点（重心が海の上などに落ちないように実在の点を使う）"""
    cx = sum(p[0] for p in points) / len(points)
    cy = sum(p[1] for p in points) / len(points)
    return min(points, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)


GENERIC = re.compile(r"^(お?(桜|さくら|花|夏|秋|春|冬|納涼|花火|八朔|城|遊花|あゆみ|港|川|山|水|みなと|ふるさと|市民|町民|村民))?(まつり|祭り|祭|大会)$")


def score(name):
    if BAD.search(name) or GENERIC.search(name) or len(name) < 2:
        return -1
    s = sum(w for pat, w in GOOD if re.search(pat, name))
    if s == 0:
        return 0
    return s + max(0, 8 - len(name)) * 0.5


def main(src):
    raw = defaultdict(lambda: {"pts": []})
    for f in sorted(glob.glob(os.path.join(src, "P12-14_*.geojson"))):
        for feat in json.load(open(f, encoding="utf-8"))["features"]:
            p = feat["properties"]
            key = (p["P12_003"], p["P12_001"])
            r = raw[key]
            r["props"] = p
            r["pts"].extend(coords_of(feat["geometry"]))

    spots = []
    seen = set()
    for (pref, rid), r in raw.items():
        p = r["props"]
        name = p["P12_002"].strip().replace("　", " ")
        if not r["pts"] or (pref, name) in seen:
            continue
        seen.add((pref, name))
        lon, lat = representative(r["pts"])
        fix = CORRECTIONS.get((pref, rid), {})
        lat, lon = fix.get("lat", lat), fix.get("lon", lon)
        cat = p["P12_005"] if p["P12_005"] not in ("‐", "-", "") else ""
        if cat and re.search(r"[町市村]$|銀座|橋梁群", cat):  # 種別欄に地名が入っている誤データ
            cat = ""
        spots.append({
            "id": f"{pref}-{rid}",
            "name": name,
            "pref": PREFS[int(pref) - 1],
            "addr": fix.get("addr") or re.sub(r"[　 ]+", " ", p["P12_006"]).replace(" および ", "・").strip(),
            "cat": cat,
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "major": bool(cat) and p["P12_007"] == -1,
            "_score": 100 if (cat and p["P12_007"] == -1) else score(name),
        })

    chosen = [s for s in spots if s["major"]]
    cells = {cell_of(s["lat"], s["lon"]) for s in chosen}
    pool = defaultdict(list)
    for s in spots:
        if not s["major"] and s["_score"] > 0:
            pool[s["pref"]].append(s)
    for v in pool.values():
        v.sort(key=lambda s: -s["_score"])
    count = defaultdict(int)
    for s in chosen:
        count[s["pref"]] += 1

    # 都道府県ごとに少ない所から 1 件ずつ補充（水位を揃えるイメージ）
    while len(chosen) < TARGET:
        cands = [p for p in PREFS if pool[p]]
        if not cands:
            break
        pref = min(cands, key=lambda p: (count[p], -pool[p][0]["_score"]))
        s = pool[pref].pop(0)
        c = cell_of(s["lat"], s["lon"])
        if c in cells:
            continue
        cells.add(c)
        chosen.append(s)
        count[pref] += 1

    chosen.sort(key=lambda s: (PREFS.index(s["pref"]), s["id"]))
    for s in chosen:
        del s["_score"]
    json.dump(chosen, sys.stdout, ensure_ascii=False, indent=0)
    print(f"{len(chosen)} spots", file=sys.stderr)
    for p in PREFS:
        print(p, count[p], file=sys.stderr, end=" / ")


if __name__ == "__main__":
    main(sys.argv[1])
