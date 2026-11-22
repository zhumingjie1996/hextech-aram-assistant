#!/usr/bin/env python3
"""Build the desktop-first web portal into docs/ for GitHub Pages.

Replaces the previous Flutter Web build output with an independent static site:
  web_portal/            -> docs/          (HTML / CSS / JS)
  app/data/data.js       -> docs/data.js   (frozen snapshot)
  flutter_app/web/ic/    -> docs/ic/       (same-origin icons, no CORS issues)
"""
from pathlib import Path
import json
import shutil
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "web_portal"
OUT = ROOT / "docs"
DATA = ROOT / "app" / "data" / "data.js"
ICONS = ROOT / "flutter_app" / "web" / "ic"


def check_upstream_version():
    """每次构建都核对本地快照与上游版本，不一致时给出警告（不中断构建）。"""
    raw = DATA.read_text(encoding="utf-8")
    meta = json.loads(raw[raw.index("=") + 1:].strip().rstrip(";"))["meta"]
    local_v, local_p = meta.get("dataVersion"), meta.get("patch")
    try:
        req = urllib.request.Request(
            "https://data.dtodo.cn/api/client/v1/config",
            headers={"User-Agent": "hextech-web-portal-build"},
        )
        with urllib.request.urlopen(req, timeout=12) as r:
            cfg = json.loads(r.read().decode("utf-8"))
        remote_v, remote_p = cfg.get("dataVersion"), cfg.get("gamePatch")
        if remote_v == local_v and remote_p == local_p:
            print(f"version check: local {local_v} / {local_p} == upstream OK")
        else:
            print(f"WARNING: upstream {remote_v} / {remote_p} differs from local "
                  f"{local_v} / {local_p}; run scripts/sync.py before building")
    except Exception as e:  # noqa: BLE001
        print(f"version check: upstream unreachable ({type(e).__name__}); "
              f"building with frozen snapshot {local_v}")


def main():
    check_upstream_version()
    for p in (SRC, DATA, ICONS):
        if not p.exists():
            raise SystemExit(f"missing required path: {p}")

    OUT.mkdir(parents=True, exist_ok=True)
    for child in OUT.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()

    for item in SRC.iterdir():
        if item.is_dir():
            shutil.copytree(item, OUT / item.name)
        else:
            shutil.copy2(item, OUT / item.name)

    shutil.copy2(DATA, OUT / "data.js")
    shutil.copytree(ICONS, OUT / "ic", dirs_exist_ok=True)
    (OUT / ".nojekyll").write_text("", encoding="utf-8")

    files = list(OUT.rglob("*"))
    print(f"built web portal -> {OUT}")
    print(f"files: {sum(1 for f in files if f.is_file())}")
    print(f"icons: {sum(1 for f in (OUT / 'ic').rglob('*') if f.is_file())}")


if __name__ == "__main__":
    main()
