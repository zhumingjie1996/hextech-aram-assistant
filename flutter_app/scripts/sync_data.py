"""把网页版的清洗产物 app/data/data.js 转成 Flutter 资产 hex_data.json。

用法（在 hextech-app 目录）：
  python scripts/sync.py                 # 上游有新版本时先同步原始快照
  python scripts/build_data.py           # 重新生成 app/data/data.js（已过滤胜率）
  python flutter_app/scripts/sync_data.py # 同步到 Flutter 工程

数据源固定为本地已清洗文件，不直接请求外部接口；方便按版本冻结与复现。
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "app" / "data" / "data.js"
DST = ROOT / "flutter_app" / "assets" / "data" / "hex_data.json"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"找不到 {SRC}，请先运行 scripts/build_data.py")
    text = SRC.read_text(encoding="utf-8")
    m = re.search(r"window\.HEX_DATA\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not m:
        raise SystemExit("data.js 格式不符合预期")
    payload = json.loads(m.group(1))

    # 合规复核：胜率类字段不得进入前端资产
    forbidden = [k for k in ("winRate", "adjustedWinRate", "wins") if k in text]
    if forbidden:
        raise SystemExit(f"数据源包含被禁字段：{forbidden}，请先修正 build_data.py")

    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    meta = payload["meta"]
    print(f"已生成 {DST}")
    print(f"版本 {meta['dataVersion']} · 数据日期 {meta['dataDate']} · {DST.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
