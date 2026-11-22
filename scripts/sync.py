"""同步国服海克斯大乱斗公开只读快照。

用法: python scripts/sync.py
产物: data/<dataVersion>/ 下的不可变快照 + _sync_meta.json

数据源: https://data.dtodo.cn/api/client/v1/  (aramgg 客户端公开只读 API)
版本由 config 的 dataVersion 决定，不硬编码；manifest 里的 sha256 用于校验与增量跳过。
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://data.dtodo.cn"
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
GLOBAL_FILES = {"augments.json", "champions.json", "items.json", "summoner-spells.json"}


def http_get(url: str, dest: Path | None = None) -> bytes:
    cmd = ["curl", "-sS", "-L", "-m", "40", "--retry", "2"]
    if dest is not None:
        cmd += ["-o", str(dest)]
    cmd.append(url)
    last = ""
    for attempt in range(3):
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if proc.returncode == 0:
            return dest.read_bytes() if dest is not None else proc.stdout.encode("utf-8")
        last = (proc.stderr or "").strip()
        time.sleep(0.6 * (attempt + 1))
    raise RuntimeError(f"下载失败 {url}: {last}")


def digest(raw: bytes) -> str:
    return "sha256-" + hashlib.sha256(raw).hexdigest()


def main() -> None:
    config = json.loads(http_get(f"{BASE}/api/client/v1/config"))
    version = config["dataVersion"]
    manifest = json.loads(http_get(BASE + config["manifest"]))
    outdir = DATA / version
    outdir.mkdir(parents=True, exist_ok=True)

    wanted = [
        f for f in manifest["files"]
        if f["path"] in GLOBAL_FILES
        or (f["path"].startswith("champions/") and f["path"].endswith(".json"))
    ]
    print(f"版本 {config['gamePatch']} / {version}，上游生成 {config['generatedAt']}")
    print(f"需要同步 {len(wanted)} 个文件（含全部英雄详情）")

    def fetch_one(entry: dict) -> tuple[str, str]:
        rel = entry["path"]
        dest = outdir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        expected = entry.get("hash")
        if dest.exists() and expected and digest(dest.read_bytes()) == expected:
            return rel, "cached"
        raw = http_get(BASE + entry["url"], dest)
        if expected and digest(raw) != expected:
            return rel, "HASH_MISMATCH"
        return rel, "ok"

    results: dict[str, str] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(fetch_one, f) for f in wanted]
        for i, fut in enumerate(concurrent.futures.as_completed(futures), 1):
            rel, status = fut.result()
            results[rel] = status
            if status == "HASH_MISMATCH":
                print(f"  [{i}/{len(wanted)}] 校验失败 {rel}")
            elif i % 25 == 0:
                print(f"  [{i}/{len(wanted)}] 已处理")

    bad = [p for p, s in results.items() if s not in ("ok", "cached")]
    if bad:
        raise SystemExit(f"以下文件校验失败: {bad[:10]}")
    cached = sum(1 for s in results.values() if s == "cached")
    print(f"同步完成: {len(results)} 个文件（复用缓存 {cached} 个）")

    meta = {
        "source": BASE,
        "service": config.get("service"),
        "locale": config.get("locale"),
        "gamePatch": config.get("gamePatch"),
        "dataVersion": version,
        "upstreamGeneratedAt": config.get("generatedAt"),
        "syncedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fileCount": len(results),
    }
    (outdir / "_sync_meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DATA / "latest.txt").write_text(version, encoding="utf-8")
    print("快照目录:", outdir)


if __name__ == "__main__":
    main()
