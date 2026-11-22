"""把原始快照清洗成前端可直接 <script> 加载的 app/data/data.js。

口径约束（对应选定的「选取率 + 分级 + 理由」方案）：
winRate / wins / adjustedWinRate 一律不进入前端产物，只保留 tier、pickRate、样本量、描述。
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = ROOT / "app" / "data" / "data.js"


def clean_text(value: str | None) -> str:
    text = re.sub(r"<br\s*/?>", " ", value or "", flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def version_key(value: str) -> tuple[int, ...]:
    return tuple(int(x) for x in re.findall(r"\d+", value))


def load(folder: Path, name: str) -> dict:
    return json.loads((folder / name).read_text(encoding="utf-8"))


def main() -> None:
    metas = sorted(
        (json.loads(p.read_text(encoding="utf-8")) for p in DATA.glob("*/_sync_meta.json")),
        key=lambda m: version_key(m["dataVersion"]),
    )
    if not metas:
        raise SystemExit("没有找到快照，请先运行 scripts/sync.py")
    sync = metas[-1]
    folder = DATA / sync["dataVersion"]

    champions_raw = load(folder, "champions.json")
    augments_raw = load(folder, "augments.json")
    items_raw = load(folder, "items.json")
    spells_raw = load(folder, "summoner-spells.json")

    champions = []
    dates: dict[str, int] = {}
    for c in champions_raw["data"]:
        st = c.get("stats") or {}
        if st.get("date"):
            dates[st["date"]] = dates.get(st["date"], 0) + 1
        champions.append({
            "id": c["id"],
            "alias": c.get("alias", ""),
            "name": c.get("name", ""),
            "title": c.get("title", ""),
            "roles": c.get("roles") or [],
            "icon": c.get("iconUrl", ""),
            "tier": st.get("tier"),
            "pick": st.get("pickRate"),
        })
    data_date = max(dates, key=dates.get) if dates else sync["upstreamGeneratedAt"][:10]

    augments = {}
    for a in augments_raw["data"]:
        st = a.get("stats") or {}
        augments[str(a["id"])] = {
            "id": a["id"],
            "name": a.get("name", ""),
            "rarity": a.get("rarity"),
            "rarityName": a.get("rarityDisplayName") or a.get("rarityName") or "其他",
            "icon": a.get("iconUrl", ""),
            "desc": clean_text(a.get("description")),
            "tier": st.get("tier"),
            "pick": st.get("pickRate"),
            "enabled": bool(a.get("enabled", True)),
        }

    items = {
        str(i["id"]): {"name": i.get("name", ""), "icon": i.get("iconUrl", ""),
                       "price": i.get("priceTotal") or i.get("price")}
        for i in items_raw["data"]
    }
    spells = {
        str(s["id"]): {"name": s.get("name", ""), "icon": s.get("iconUrl", "")}
        for s in spells_raw["data"]
    }

    details = {}
    trio_heroes = 0
    for path in sorted((folder / "champions").glob("*.json")):
        j = json.loads(path.read_text(encoding="utf-8"))
        cid = str(j.get("championId") or path.stem)

        recs = []
        for a in j.get("augments") or []:
            st = a.get("stats") or {}
            recs.append({
                "id": a["id"],
                "tier": st.get("tier"),
                "pick": st.get("pickRate"),
                "games": st.get("games"),
            })
        recs.sort(key=lambda r: (r["tier"] if r["tier"] is not None else 9, -(r["pick"] or 0)))

        b = j.get("build") or (j.get("builds") or [{}])[0]
        build = {
            "start": [x.get("itemIds", []) for x in (b.get("startingItems") or [])[:2]],
            "cores": [{"ids": x.get("itemIds", []), "pick": x.get("pickRate")}
                      for x in (b.get("coreItems") or [])[:3]],
            "skills": [{"keys": (x.get("skillKeys") or [])[:9], "pick": x.get("pickRate")}
                       for x in (b.get("skillOrders") or [])[:2]],
            "spells": [{"ids": x.get("summonerSpellIds", []), "pick": x.get("pickRate")}
                       for x in (b.get("summonerSpells") or [])[:2]],
            "situational": [{"id": x.get("id"), "pick": x.get("pickRate"),
                             "score": x.get("distinctiveScore")}
                            for x in (b.get("situationalItems") or [])[:6]],
        }

        trios = []
        for t in (j.get("augmentTrios") or [])[:12]:
            ids = t.get("augmentIds") or t.get("ids") if isinstance(t, dict) else t
            if isinstance(ids, list) and len(ids) >= 2:
                trios.append([int(x) for x in ids[:3]])
        if trios:
            trio_heroes += 1

        details[cid] = {"augments": recs, "build": build, "trios": trios}

    payload = {
        "meta": {
            "patch": sync["gamePatch"],
            "dataVersion": sync["dataVersion"],
            "generatedAt": sync["upstreamGeneratedAt"],
            "syncedAt": sync["syncedAt"],
            "dataDate": data_date,
            "championCount": len(champions),
            "augmentCount": len(augments),
            "itemCount": len(items),
            "source": "国服公开只读快照 + Riot Data Dragon 静态资产",
            "notice": "仅展示选取率、分级与理由；数据来自第三方公开样本，非 Riot 官方。",
        },
        "champions": champions,
        "augments": augments,
        "items": items,
        "spells": spells,
        "details": details,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "window.HEX_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"已生成 {OUT}")
    print(f"英雄 {len(champions)} / 符文 {len(augments)} / 装备 {len(items)} / 英雄详情 {len(details)}")
    print(f"数据日期 {data_date}；含成套组合数据的英雄 {trio_heroes} 个")
    print(f"文件大小 {OUT.stat().st_size / 1024:.0f} KB（已过滤 winRate/wins 等字段）")


if __name__ == "__main__":
    main()
