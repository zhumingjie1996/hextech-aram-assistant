"""原型静态一致性检查：HTML 标签、JS 引用的 id、事件动作、CSS 关键规则。"""
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "app" / "prototype"
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "style.css").read_text(encoding="utf-8")
js = (ROOT / "app.js").read_text(encoding="utf-8")

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


class Checker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if "id" in d:
            self.ids.add(d["id"])
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if not self.stack:
            self.errors.append("多余闭合标签 </%s>" % tag)
        elif self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append("标签不匹配: 期望 </%s> 得到 </%s>" % (self.stack[-1], tag))


c = Checker()
c.feed(html)
print("HTML 标签检查:", "OK" if not c.errors and not c.stack else
      "%s | 未闭合 %s" % (c.errors[:4], c.stack[:4]))

referenced = set(re.findall(r"\$\('([A-Za-z0-9_]+)'\)", js))
dynamic = {"champSearch", "codexSearch", "champGrid", "champCount", "codexList",
           "codexCount", "draftResults", "meStatus"}
missing = sorted((referenced | dynamic) - c.ids - dynamic)
print("JS 引用的静态 id 数:", len(referenced), "| HTML 静态 id 数:", len(c.ids))
print("缺失的静态 id:", missing or "无")

acts = set(re.findall(r'data-act="([a-z-]+)"', js))
cases = set(re.findall(r"case '([a-z-]+)':", js))
subcases = set(re.findall(r"act === '([a-z-]+)'", js))
unhandled = sorted(acts - cases - subcases)
print("data-act 动作数:", len(acts), "| 未处理的动作:", unhandled or "无")

print("[hidden] 全局规则:", "OK" if "[hidden]{display:none!important}" in css else "缺失")
print("响应式规则:", "OK" if "@media(max-width:900px)" in css else "缺失")
print("数据脚本引用:", "OK" if '../data/data.js' in html else "错误")
print("胜率字段读取:", "无" if not re.search(r"\.winRate\b|\.adjustedWinRate\b", js) else "存在")

assert not c.errors and not c.stack
assert not missing
assert not unhandled
print("静态一致性检查通过")
