/* 原型逻辑冒烟测试（最小 DOM stub，不依赖浏览器） */
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const proto = path.join(root, 'app/prototype');

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', hidden: false, scrollTop: 0,
    dataset: {}, className: '', style: {}, _h: {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener(t, f) { this._h[t] = f; },
    querySelectorAll() { return []; },
    closest() { return null; },
    scrollIntoView() {}
  };
}
const els = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  querySelectorAll() { return []; }
};
global.window = {};
global.performance = { now: () => Date.now() };
require(path.join(root, 'app/data/data.js'));
const D = global.window.HEX_DATA;
require(path.join(proto, 'app.js'));

let n = 0;
function assert(ok, msg) {
  if (!ok) throw new Error('FAIL: ' + msg);
  n++; console.log('ok - ' + msg);
}
function fire(act, extra) {
  const node = { dataset: Object.assign({ act }, extra || {}) };
  els.scroll._h.click({ target: { closest: () => node } });
}
function fireSub(act, extra) {
  const node = { dataset: Object.assign({ act }, extra || {}) };
  els.subpage._h.click({ target: { closest: () => node } });
}
const allHtml = ['vHome', 'vChamps', 'vDraft', 'vCodex', 'vMe', 'champGrid', 'codexList', 'subpage']
  .map(k => els[k] ? els[k].innerHTML : '').join('');

['vHome', 'vChamps', 'vDraft', 'vCodex', 'vMe'].forEach(k => assert(els[k].innerHTML.length > 200, k + ' 已渲染'));
assert(els.vHome.innerHTML.includes(D.meta.patch), '首页显示当前版本');
assert(els.vHome.innerHTML.includes('开局三选一'), '首页主入口');
assert(els.champGrid.innerHTML.includes(D.champions[0].name), '英雄列表含真实英雄');
assert(els.vDraft.innerHTML.includes('生成参考'), '三选一含生成按钮');
assert(els.vDraft.innerHTML.includes('屏幕上的三张候选卡'), '三选一含候选卡区');
assert(els.codexList.innerHTML.includes('泰坦的坚决'), '图鉴含真实符文');
assert(els.vMe.innerHTML.includes(D.meta.dataVersion), '我的页含快照版本');
assert(els.abTitle.textContent === '海斗助手', 'AppBar 标题');

const firstAug = (D.details[String(D.champions[0].id)].augments || [])[0];
assert(els.vDraft.innerHTML.includes(D.augments[String(firstAug.id)].name), '三张候选卡自动预填真实符文');

fire('eval');
assert(els.vDraft.innerHTML.includes('候选 1'), '生成参考渲染三张结果卡');
assert(els.vDraft.innerHTML.includes('适配'), '结果卡含适配分级');
assert(els.vDraft.innerHTML.includes('不替你做决定'), '结果含不替玩家决定的提示');

const cid = D.champions[0].id;
fire('open-champ', { id: cid });
assert(els.subpage.innerHTML.includes('出装参考'), '英雄详情含出装');
assert(els.subpage.innerHTML.includes('符文参考'), '英雄详情含符文');
assert(els.subpage.hidden === false, '子页已打开');

fireSub('open-aug', { id: firstAug.id });
assert(els.subpage.innerHTML.includes('适配靠前的英雄'), '符文详情含反查英雄');
fireSub('back');
assert(els.subpage.hidden === true, '子页可返回关闭');

fire('go-view', { v: 'codex' });
assert(els.abTitle.textContent === '符文图鉴', 'Tab 切换更新 AppBar');

assert(!/winRate|adjustedWinRate/.test(allHtml), '渲染结果不含胜率字段');
const src = fs.readFileSync(path.join(proto, 'app.js'), 'utf8');
assert(!/\.winRate\b|\.adjustedWinRate\b/.test(src), '源码不读取胜率类字段');
console.log('原型冒烟测试全部通过（' + n + ' 项）');
