/* Minimal DOM-stub smoke test for the desktop web portal.
   Verifies that data loading and all initial render paths execute without errors. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const dataJs = fs.readFileSync(path.join(ROOT, 'app', 'data', 'data.js'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'web_portal', 'app.js'), 'utf8');

function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', hidden: false,
    dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, focus() {},
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    closest() { return null; }
  };
}

const cache = {};
const document = {
  querySelector(sel) { return cache[sel] || (cache[sel] = makeEl()); },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement() { return makeEl(); },
  body: makeEl()
};
const window = { scrollTo() {}, addEventListener() {} };
const ctx = { window, document, console, setTimeout, clearTimeout };
vm.createContext(ctx);

vm.runInContext(dataJs, ctx, { filename: 'data.js' });
if (!window.HEX_DATA) throw new Error('data.js did not define window.HEX_DATA');
vm.runInContext(appJs, ctx, { filename: 'app.js' });

const required = ['#statRow', '#homeTopChamps', '#homeTopAugs', '#champGrid', '#augGrid', '#draftCards', '#aboutMeta'];
for (const id of required) {
  if (!cache[id] || !cache[id].innerHTML.length) throw new Error('empty render: ' + id);
}
console.log('web portal smoke ok; meta:', window.HEX_DATA.meta.dataVersion);
console.log('rendered sections:', required.length);
