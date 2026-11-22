/* 在线数据源可用性探针：直接请求上游，验证「能不能取到真实数据」。
   用法: node scripts/live_probe.js     （需要 Node 18+，使用内置 fetch）
   只读取版本/条目数/分级/选取率等字段，不输出任何胜率数值。
*/
'use strict';
const path = require('path');

const BASE = 'https://data.dtodo.cn';
const API = BASE + '/api/client/v1';
const root = path.resolve(__dirname, '..');

global.window = {};
require(path.join(root, 'app/data/data.js'));
const meta = global.window.HEX_DATA.meta;

async function get(url, label) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const txt = await r.text();
    let data = null;
    try { data = JSON.parse(txt); } catch (e) { /* 非 JSON 响应只报状态 */ }
    const cors = r.headers.get('access-control-allow-origin');
    const bytes = Buffer.byteLength(txt, 'utf8'); // txt.length 是 UTF-16 字符数，中文会偏小
    console.log(`[OK]   ${label.padEnd(24)} HTTP ${r.status} | ${String(bytes).padStart(7)} bytes | ${String(Date.now() - t0).padStart(5)} ms | CORS ${cors || '无'} | ${r.url}`);
    return { ok: true, status: r.status, txt, data, bytes, cors, url: r.url };
  } catch (e) {
    console.log(`[FAIL] ${label.padEnd(24)} ${e.name}: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

(async function main() {
  console.log('=== 在线数据源直连探针 · ' + new Date().toISOString());
  console.log('本地快照: dataVersion ' + meta.dataVersion + ' | patch ' + meta.patch + ' | 数据日期 ' + meta.dataDate);
  console.log('');

  const cfg = await get(API + '/config', 'config');
  if (!cfg.ok || !cfg.data) {
    console.log('\n结论: 上游此刻不可达，页面会自动回退本地快照，可继续离线使用。');
    return;
  }
  const c = cfg.data;
  const v = c.dataVersion;
  console.log('       service        = ' + c.service);
  console.log('       gamePatch      = ' + c.gamePatch);
  console.log('       dataVersion    = ' + v);
  console.log('       generatedAt    = ' + c.generatedAt);
  console.log('       manifest       = ' + c.manifest);
  console.log('       与本地快照一致 = ' + (v === meta.dataVersion));
  console.log('');

  const base = API + '/data/' + encodeURIComponent(v);
  const man = await get(BASE + c.manifest, 'manifest');
  if (man.ok && man.data && man.data.files) console.log('       manifest 文件数 = ' + man.data.files.length);

  for (const f of ['augments', 'champions', 'items']) {
    const r = await get(base + '/' + f + '.json', f + '.json');
    if (r.ok && r.data) console.log('       条目数 = ' + (r.data.total != null ? r.data.total : '未知') + ' | generatedAt = ' + r.data.generatedAt);
  }
  console.log('');

  const ch = await get(base + '/champions/1.json', 'champions/1.json');
  if (ch.ok && ch.data) {
    const a = ch.data.augments || [];
    const s = (a[0] && a[0].stats) || {};
    console.log('       英雄详情符文记录 = ' + a.length);
    console.log('       首条样例 = ' + (a[0] && a[0].name) + ' | tier ' + s.tier + ' | pickRate ' + s.pickRate + ' | games ' + s.games + ' | source ' + s.source);
    console.log('       注: 该响应含胜率类字段，本探针与前端均不读取/不展示。');
  }
  console.log('');

  const zh = await get('https://aramgg.com/data/aram-mayhem-augments.zh_cn.json', '中文符文元数据');
  if (zh.ok && zh.data) console.log('       条目数 = ' + Object.keys(zh.data).length);
  const ddr = await get('https://ddragon.leagueoflegends.com/api/versions.json', 'Riot Data Dragon');
  if (ddr.ok && ddr.data) console.log('       最新版本 = ' + ddr.data[0]);
  await get('https://data.v2.iesdev.com/api/v1/query_objects/prod/lol/aram_mayhem_augments', 'Blitz 备用源(已知故障)');
  console.log('');
  console.log('=== 结论: 统计类真实数据可直接从 ' + BASE + ' 取到（非 Riot 官方，第三方公开只读快照）；');
  console.log('    Riot 官方只提供 Data Dragon 静态资产；页面离线时回退本地冻结快照。');
})();
