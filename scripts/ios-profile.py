#!/usr/bin/env python3
"""GitHub Actions で App Store 用のプロビジョニングプロファイルを用意する（App Store Connect API を使う）。

使い方: python3 scripts/ios-profile.py <Bundle ID> <配布用証明書のシリアル番号> <プロファイル名> <出力先 .mobileprovision>
環境変数: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH（.p8 のパス）

同じ名前の有効なプロファイルがあり、その証明書を含んでいればそれを使う。なければ作り直す。
必要なライブラリ: pip install pyjwt cryptography
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt

API = "https://api.appstoreconnect.apple.com/v1"


def token():
    key = open(os.environ["ASC_KEY_PATH"]).read()
    now = int(time.time())
    return jwt.encode({"iss": os.environ["ASC_ISSUER_ID"], "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
                      key, algorithm="ES256", headers={"kid": os.environ["ASC_KEY_ID"], "typ": "JWT"})


def call(method, path, params=None, body=None):
    url = API + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            raw = res.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        sys.exit(f"App Store Connect API error {e.code} {method} {path}: {e.read().decode()}")


def norm(serial):
    return serial.upper().lstrip("0")


def main(bundle_id, serial, name, out):
    bundles = call("GET", "/bundleIds", {"filter[identifier]": bundle_id, "filter[platform]": "IOS"})["data"]
    bundle = next((b for b in bundles if b["attributes"]["identifier"] == bundle_id), None)
    if not bundle:
        sys.exit(f"Bundle ID {bundle_id} が Apple Developer に登録されていません")

    certs = call("GET", "/certificates", {"filter[certificateType]": "DISTRIBUTION,IOS_DISTRIBUTION", "limit": 200})["data"]
    cert = next((c for c in certs if norm(c["attributes"]["serialNumber"]) == norm(serial)), None)
    if not cert:
        sys.exit("Secrets の証明書（.p12）が、Apple Developer の配布用証明書の一覧に見つかりません（取り消された可能性があります）")

    found = call("GET", "/profiles", {"filter[name]": name, "include": "certificates,bundleId", "limit": 50})["data"]
    for p in found:
        ok = (p["attributes"]["profileState"] == "ACTIVE"
              and p["attributes"]["profileType"] == "IOS_APP_STORE"
              and p["relationships"]["bundleId"]["data"]["id"] == bundle["id"]
              and any(c["id"] == cert["id"] for c in p["relationships"]["certificates"]["data"]))
        if ok:
            content = p["attributes"]["profileContent"]
            break
        call("DELETE", f"/profiles/{p['id']}")
    else:
        created = call("POST", "/profiles", body={"data": {
            "type": "profiles",
            "attributes": {"name": name, "profileType": "IOS_APP_STORE"},
            "relationships": {
                "bundleId": {"data": {"type": "bundleIds", "id": bundle["id"]}},
                "certificates": {"data": [{"type": "certificates", "id": cert["id"]}]},
            },
        }})
        content = created["data"]["attributes"]["profileContent"]

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(base64.b64decode(content))
    print(f"provisioning profile ready: {name}")


if __name__ == "__main__":
    main(*sys.argv[1:5])
