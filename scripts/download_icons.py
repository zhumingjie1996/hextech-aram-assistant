#!/usr/bin/env python3
"""下载所有图标到 Flutter Web 静态目录，解决 GitHub Pages 跨域图片无 CORS 头的问题。

- 数据源：flutter_app/assets/data/hex_data.json 中所有 icon 字段（完整 CDN URL）
- 输出：flutter_app/web/ic/<category>/<file>  ->  构建后 docs/ic/<category>/<file>
- 可复跑：已存在且非空的文件自动跳过；失败项会重试并汇总
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "flutter_app", "assets", "data", "hex_data.json")
OUT = os.path.join(ROOT, "flutter_app", "web", "ic")
CDN_PREFIX = "https://cdn.dtodo.cn/hextech/"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def collect_urls(data):
    urls = set()

    def walk(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == "icon" and isinstance(v, str) and v.startswith(CDN_PREFIX):
                    urls.add(v)
                else:
                    walk(v)
        elif isinstance(x, list):
            for i in x:
                walk(i)

    walk(data)
    return sorted(urls)


def local_path(url):
    rel = url[len(CDN_PREFIX):]
    return os.path.join(OUT, rel.replace("/", os.sep))


def download_one(url, retries=3):
    dest = local_path(url)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return (url, "skip", os.path.getsize(dest))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    last = ""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                blob = r.read()
            if not blob or not blob.startswith(b"\x89PNG"):
                last = "invalid-png(%d bytes)" % len(blob)
                time.sleep(1)
                continue
            tmp = dest + ".part"
            with open(tmp, "wb") as f:
                f.write(blob)
            os.replace(tmp, dest)
            return (url, "ok", len(blob))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                # 源站本身就没有这张图，无需重试；记录为缺失用于报告
                return (url, "missing", "源站404")
            last = "HTTP %d" % e.code
            time.sleep(1 + attempt)
        except Exception as e:  # noqa: BLE001
            last = "%s: %s" % (type(e).__name__, str(e)[:120])
            time.sleep(1 + attempt)
    return (url, "FAIL", last)


def main():
    with open(DATA, encoding="utf-8") as f:
        data = json.load(f)
    urls = collect_urls(data)
    print("图标总数(去重):", len(urls))

    done = {"ok": 0, "skip": 0, "missing": 0, "FAIL": 0}
    failed = []
    total_bytes = 0
    with ThreadPoolExecutor(max_workers=16) as ex:
        futures = [ex.submit(download_one, u) for u in urls]
        for n, fut in enumerate(as_completed(futures), 1):
            url, status, info = fut.result()
            done[status] = done.get(status, 0) + 1
            if status in ("ok", "skip"):
                total_bytes += info
            elif status == "FAIL":
                failed.append((url, info))
            if n % 100 == 0:
                print("  进度 %d/%d" % (n, len(urls)), flush=True)

    print("完成: 新下载 %d, 已存在 %d, 源站缺失 %d, 失败 %d" % (
        done.get("ok", 0), done.get("skip", 0), done.get("missing", 0), done.get("FAIL", 0)))
    print("本地图标总体积: %.2f MB" % (total_bytes / 1024 / 1024))
    if failed:
        print("失败样例(前10):")
        for u, info in failed[:10]:
            print("  ", u, "->", info)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
