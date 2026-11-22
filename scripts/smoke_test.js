/* 无浏览器的逻辑冒烟测试：用最小 DOM stub 跑一遍页面初始化与三选一计算。
   用法: node scripts/smoke_test.js
*/
const path = require('path');
const root = path.resolve(__dirname, '..');

function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', hidden: false,
    dataset: {}, style: {}, _h: {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener(type, fn) { this._h[type] = fn; },
    querySelectorAll() { return []; },
    closest() { return null; },
    scrollIntoView() {}
  };
}

const els = {};
const picked = [makeEl(), makeEl(), makeEl()];
const cards = [makeEl(), makeEl(), makeEl()];
global.document = {
  getElementById(id) { return els[id] || (els[id] = makeEl()); },
  querySelectorAll(sel) {
    if (sel === '.picked') return picked;
    if (sel === '.card') return cards;
    return [];
  }
};
global.window = { innerWidth: 1400 };
require(path.join(root, 'app/data/data.js'));
const D = global.window.HEX_DATA;

// 浏览器里给 select 设置 innerHTML 后会自动选中第一个 option，这里模拟该行为
els.draftChamp = makeEl();
els.draftChamp.value = String(D.champions[0].id);
require(path.join(root, 'app/app.js'));

function assert(ok, msg) {
  if (!ok) throw new Error('FAIL: ' + msg);
  console.log('ok - ' + msg);
}

assert(els.metaBar.innerHTML.includes(D.meta.patch), '版本徽章渲染');
assert(els.champGrid.innerHTML.includes(D.champions[0].name), '英雄网格渲染');
assert(els.detailPanel.innerHTML.includes('核心 A'), '详情出装区块渲染');
assert(els.detailPanel.innerHTML.includes('符文参考'), '详情符文区块渲染');
assert(cards.every(s => s.value), '三张候选卡自动预填');

const fs = require('fs');
const appSrc = fs.readFileSync(path.join(root, 'app/app.js'), 'utf8');
assert(els.checkLive._h.click && els.fetchLive._h.click, '在线直连两个按钮已绑定事件');
assert(els.liveStatus.innerHTML.includes(D.meta.dataVersion), '在线状态条显示本地快照版本');
assert(!/\.winRate\b|\.adjustedWinRate\b/.test(appSrc), '在线模块不读取任何胜率类字段');
assert(appSrc.includes("tier / pickRate / games"), '在线模块只解析分级/选取率/样本量');

const augIds = Object.keys(D.augments);
cards[1].value = augIds[5];
cards[2].value = augIds[17];
picked[0].value = cards[0].value;
els.evalBtn._h.click();

assert(els.draftResults.innerHTML.includes('候选 1'), '三选一结果渲染');
assert(els.draftResults.innerHTML.includes('适配分级'), '结果包含分级与理由');
assert(!els.draftResults.innerHTML.includes('winRate'), '结果不含胜率字段');
assert(els.draftHint.textContent === '', '无输入校验报错');
console.log('冒烟测试全部通过');
