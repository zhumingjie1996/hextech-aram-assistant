#!/usr/bin/env python3
"""Build the desktop-first web portal into docs/ for GitHub Pages.

Replaces the previous Flutter Web build output with an independent static site:
  web_portal/            -> docs/          (HTML / CSS / JS)
  app/data/data.js       -> docs/data.js   (frozen snapshot)
  flutter_app/web/ic/    -> docs/ic/       (same-origin icons, no CORS issues)
"""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "web_portal"
OUT = ROOT / "docs"
DATA = ROOT / "app" / "data" / "data.js"
ICONS = ROOT / "flutter_app" / "web" / "ic"


def main():
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
