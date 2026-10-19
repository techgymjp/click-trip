#!/usr/bin/env python3
"""spots_base.json に解説文・クイズ・イラスト指定（content/*.json）を合わせて data/spots.json を作る。

使い方: python3 tools/merge_content.py
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KINDS = {"temple", "shrine", "castle", "onsen", "mountain", "highland", "waterfall", "gorge", "lake", "coast", "island",
         "cave", "garden", "museum", "town", "ruins", "festival", "food", "nature", "park"}
CAT2KIND = {"神社・寺院・教会": "temple", "山岳": "mountain", "温泉": "onsen", "年中行事": "festival", "海岸・岬": "coast",
            "郷土景観": "town", "河川・峡谷": "gorge", "集落・街": "town", "食": "food", "植物": "nature",
            "博物館・美術館": "museum", "城跡・城郭・宮殿": "castle", "高原・湿原・原野": "highland", "湖沼": "lake",
            "建造物": "town", "芸能・興行・イベント": "festival", "庭園・公園": "garden", "動物": "nature",
            "自然現象": "nature", "岩石・洞窟": "cave", "史跡": "ruins", "滝": "waterfall",
            "テーマ・公園テーマ施設": "park", "動植物園・水族館": "park"}


def main():
    base = json.load(open(os.path.join(ROOT, "data", "spots_base.json"), encoding="utf-8"))
    content = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "content", "*.json"))):
        for c in json.load(open(f, encoding="utf-8")):
            content[c["id"]] = c
    out, missing = [], 0
    for s in base:
        c = content.get(s["id"])
        s = dict(s)
        if not s["major"]:
            del s["major"]
        if c:
            s["kind"] = c.get("kind") if c.get("kind") in KINDS else CAT2KIND.get(s["cat"], "nature")
            s["desc"] = c.get("desc", "").strip()
            s["quiz"] = c.get("quiz", "").strip()
            art = c.get("art") or {}
            s["art"] = {k: art[k] for k in ("time", "season", "motifs", "accent") if k in art}
        else:
            missing += 1
            s["kind"] = CAT2KIND.get(s["cat"], "nature")
        out.append(s)
    with open(os.path.join(ROOT, "data", "spots.json"), "w", encoding="utf-8") as fp:
        json.dump(out, fp, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(out)} spots, {len(out) - missing} with content, {missing} missing", file=sys.stderr)


if __name__ == "__main__":
    main()
