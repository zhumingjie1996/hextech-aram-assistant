(function () {
  'use strict';

  var D = window.HEX_DATA;
  if (!D) {
    document.querySelector('.shell').innerHTML =
      '<div class="view-head"><h1>数据未加载</h1><p>请先运行 scripts/build_data.py 生成 data.js，再刷新页面。</p></div>';
    return;
  }

  var CDN = 'https://cdn.dtodo.cn/hextech/';
  var GRADES = { 1: { l: 'S', t: '强势' }, 2: { l: 'A', t: '优选' }, 3: { l: 'B', t: '可用' }, 4: { l: 'C', t: '一般' }, 5: { l: 'D', t: '谨慎' } };
  var ROLES = [['fighter', '战士'], ['mage', '法师'], ['marksman', '射手'], ['assassin', '刺客'], ['tank', '坦克'], ['support', '辅助']];
  var RARITIES = [['all', '全部'], ['0', '白银'], ['1', '黄金'], ['2', '棱彩']];

  var CH = D.champions.slice();
  var BY_ID = {};
  CH.forEach(function (c) { BY_ID[c.id] = c; });
  var AUG = D.augments || {};
  var ITEM = D.items || {};
  var SPELL = D.spells || {};
  var DET = D.details || {};

  var AUG_LIST = Object.keys(AUG).map(function (k) { return AUG[k]; });
  var state = {
    view: 'home', role: 'all', tier: 'all', champSort: 'tier', champQuery: '',
    rarity: 'all', augQuery: '', augSort: 'pick',
    draftChamp: null, round: 0, picks: [], options: []
  };

  /* ---------------- utils ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function iconUrl(u) { return u && u.indexOf(CDN) === 0 ? './ic/' + u.slice(CDN.length) : (u || ''); }
  function pct(v) {
    if (v == null) return '—';
    if (v > 0 && v < 0.001) return '<0.1%';
    return (v * 100).toFixed(1) + '%';
  }
  function games(v) { return v == null ? '—' : Number(v).toLocaleString('zh-CN'); }
  function grade(t) { return GRADES[t] || { l: '?', t: '样本不足' }; }
  function gradeClass(t) { return t >= 1 && t <= 5 ? ['s', 'a', 'b', 'c', 'd'][t - 1] : 'u'; }
  function badge(t, big) {
    var g = grade(t);
    return '<span class="grade ' + gradeClass(t) + (big ? ' big' : '') + '" title="' + esc(g.t) + '">' + g.l + '</span>';
  }
  function avatar(url, cls, label) {
    var src = iconUrl(url);
    return '<span class="avatar ' + (cls || '') + '" title="' + esc(label || '') + '">' +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" onerror="this.classList.add(\'broken\')">' : '') + '</span>';
  }
  function roleName(r) { for (var i = 0; i < ROLES.length; i++) if (ROLES[i][0] === r) return ROLES[i][1]; return r; }
  function toast(msg) {
    var el = $('#toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, 2200);
  }

  /* ---------------- version check ---------------- */
  var LIVE_CONFIG_URL = 'https://data.dtodo.cn/api/client/v1/config';
  var vcheck = { status: 'idle', remote: null, http: 0, elapsed: 0, checkedAt: '', error: '' };
  var V_LABEL = { idle: '未检测', checking: '检测中', ok: '已是最新', new: '版本有更新', fail: '检测失败' };

  function vstate(s) { return '<span class="vstate ' + s + '"><i></i>' + esc(V_LABEL[s] || s) + '</span>'; }

  function versionSummary() {
    if (vcheck.status === 'checking') return '正在连接 data.dtodo.cn 检查版本…';
    if (vcheck.status === 'fail') return '无法连接数据源：' + (vcheck.error || '网络不可达') + '，继续使用本地冻结快照，不影响查询。';
    if (vcheck.status === 'new') return '线上已更新为 ' + (vcheck.remote ? vcheck.remote.version : '新版') + '，本地快照为 ' + D.meta.dataVersion + '，需要重新同步数据。';
    if (vcheck.status === 'ok') return '本地快照 ' + D.meta.dataVersion + ' 与线上一致 · 耗时 ' + vcheck.elapsed + 'ms · ' + vcheck.checkedAt;
    return '尚未检测版本';
  }

  function renderVersionUI() {
    var st = $('#versionState'), ast = $('#aboutVersionState');
    if (!st || !ast) return;
    st.className = 'vstate ' + vcheck.status; st.innerHTML = '<i></i>' + V_LABEL[vcheck.status];
    ast.className = 'vstate ' + vcheck.status; ast.innerHTML = '<i></i>' + V_LABEL[vcheck.status];
    $('#aboutVersionText').textContent = versionSummary();
    $('#versionPill').title = versionSummary();
    if (!$('#versionModal').hidden) renderVersionModal();
  }

  function renderVersionModal() {
    var rows = [
      ['本地快照版本', D.meta.dataVersion],
      ['线上数据版本', vcheck.remote ? vcheck.remote.version : '—'],
      ['游戏版本', vcheck.remote ? vcheck.remote.patch : D.meta.patch],
      ['上游生成时间', vcheck.remote ? vcheck.remote.generatedAt : D.meta.generatedAt],
      ['检测结果', V_LABEL[vcheck.status]],
      ['HTTP / 耗时', (vcheck.http || '—') + ' / ' + (vcheck.elapsed ? vcheck.elapsed + 'ms' : '—')],
      ['检测时间', vcheck.checkedAt || '—']
    ];
    var h = '<div class="version-title">' + vstate(vcheck.status) + '<h2>版本检测</h2></div>' +
      '<p class="version-summary">' + esc(versionSummary()) + '</p><div class="kv-list">' +
      rows.map(function (r) { return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>' +
      '<div class="version-actions"><button class="btn primary small" id="recheckModalBtn">重新检测</button>' +
      '<button class="btn ghost small" id="goAboutBtn">查看数据来源</button></div>' +
      '<p class="result-note">每次打开页面都会自动检测。只读取上游 config 的版本字段，不读取任何统计或胜率数据；检测失败时自动使用本地冻结快照。</p>';
    $('#versionModalBody').innerHTML = h;
    $('#recheckModalBtn').onclick = checkVersion;
    $('#goAboutBtn').onclick = function () { $('#versionModal').hidden = true; switchView('about'); };
  }

  function checkVersion() {
    vcheck.status = 'checking'; vcheck.error = '';
    renderVersionUI();
    if (typeof fetch !== 'function') { vcheck.status = 'fail'; vcheck.error = '浏览器不支持 fetch'; renderVersionUI(); return; }
    var t0 = Date.now();
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 10000);
    fetch(LIVE_CONFIG_URL, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { vcheck.http = r.status; if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (cfg) {
        clearTimeout(timer);
        vcheck.remote = { patch: cfg.gamePatch || '', version: cfg.dataVersion || '', generatedAt: cfg.generatedAt || '' };
        vcheck.elapsed = Date.now() - t0;
        vcheck.checkedAt = new Date().toLocaleString('zh-CN');
        var changed = (vcheck.remote.version && vcheck.remote.version !== D.meta.dataVersion) ||
                      (vcheck.remote.patch && vcheck.remote.patch !== D.meta.patch);
        vcheck.status = changed ? 'new' : 'ok';
        renderVersionUI();
      })
      .catch(function (e) {
        clearTimeout(timer);
        vcheck.status = 'fail';
        vcheck.error = (e && e.name === 'AbortError') ? '检测超时' : ((e && e.message) || '网络不可达');
        vcheck.elapsed = Date.now() - t0;
        vcheck.checkedAt = new Date().toLocaleString('zh-CN');
        renderVersionUI();
      });
  }

  function initVersionCheck() {
    $('#versionPill').addEventListener('click', function () { renderVersionModal(); $('#versionModal').hidden = false; });
    $('#recheckBtn').addEventListener('click', checkVersion);
    $$('[data-close-version]').forEach(function (el) {
      el.addEventListener('click', function () { $('#versionModal').hidden = true; });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#versionModal').hidden = true; });
  }

  /* ---------------- navigation ---------------- */
  function switchView(name) {
    state.view = name;
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    $$('.nav-item').forEach(function (b) { b.classList.toggle('active', b.dataset.view === name); });
    if (name !== 'champs') $('#detailPanel').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#mainNav').addEventListener('click', function (e) {
    var b = e.target.closest('.nav-item'); if (b) switchView(b.dataset.view);
  });
  $('.brand').addEventListener('click', function () { switchView('home'); });
  $('.brand').addEventListener('keydown', function (e) { if (e.key === 'Enter') switchView('home'); });
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-jump]'); if (j) switchView(j.dataset.jump);
  });

  /* ---------------- home ---------------- */
  function renderHome() {
    var m = D.meta;
    $('#topVersion').textContent = '版本 ' + m.patch;
    $('#homePatch').textContent = m.patch;
    $('#homeVersion').textContent = m.dataVersion;
    $('#homeDate').textContent = m.dataDate;
    $('#homeSource').textContent = m.source;
    $('#footerMeta').textContent = m.patch + ' · 数据日期 ' + m.dataDate;

    var stats = [
      ['收录英雄', m.championCount, '位 · 含分级与选取率'],
      ['强化符文', m.augmentCount, '个 · 含效果与适配'],
      ['装备条目', m.itemCount, '件 · 含核心出装'],
      ['数据快照', m.dataVersion, '生成于 ' + m.generatedAt.slice(0, 10)]
    ];
    $('#statRow').innerHTML = stats.map(function (s) {
      return '<div class="stat-card"><div class="k">' + esc(s[0]) + '</div><div class="v">' + esc(s[1]) + '</div><div class="s">' + esc(s[2]) + '</div></div>';
    }).join('');

    var topCh = CH.slice().sort(function (a, b) { return (a.tier || 9) - (b.tier || 9) || (b.pick || 0) - (a.pick || 0); }).slice(0, 8);
    $('#homeTopChamps').innerHTML = topCh.map(function (c, i) {
      return '<div class="rank-row"><span class="rank-index">' + String(i + 1).padStart(2, '0') + '</span>' +
        avatar(c.icon) + '<span class="rank-name"><b>' + esc(c.name) + '</b><small>' + esc(c.title) + '</small></span>' +
        badge(c.tier) + '<span class="rank-val">' + pct(c.pick) + '</span></div>';
    }).join('');

    var topAug = AUG_LIST.filter(function (a) { return a.enabled !== false; })
      .sort(function (a, b) { return (b.pick || 0) - (a.pick || 0); }).slice(0, 8);
    $('#homeTopAugs').innerHTML = topAug.map(function (a, i) {
      return '<div class="rank-row"><span class="rank-index">' + String(i + 1).padStart(2, '0') + '</span>' +
        avatar(a.icon, 'aug') + '<span class="rank-name"><b>' + esc(a.name) + '</b><small>' + esc(a.rarityName || '') + '</small></span>' +
        '<span class="rank-val">' + pct(a.pick) + '</span></div>';
    }).join('');

    var features = [
      ['◈', '英雄榜单', '按职业和分级筛选，查看每个英雄的出装、技能与符文适配。', 'champs'],
      ['✦', '符文图鉴', '234 个强化符文的效果说明与高频携带英雄。', 'augments'],
      ['◇', '三选一模拟', '按英雄适配权重模拟三轮强化符文选择。', 'draft']
    ];
    $('#featureRow').innerHTML = features.map(function (f) {
      return '<div class="feature-card" data-jump="' + f[3] + '"><div class="fi">' + f[0] + '</div><h3>' + f[1] + '</h3><p>' + f[2] + '</p></div>';
    }).join('');
  }

  /* ---------------- champions ---------------- */
  function initChamps() {
    $('#roleChips').innerHTML = [['all', '全部']].concat(ROLES).map(function (r) {
      return '<button class="chip' + (r[0] === 'all' ? ' active' : '') + '" data-role="' + r[0] + '">' + r[1] + '</button>';
    }).join('');
    $('#tierChips').innerHTML = [['all', '全部分级'], ['1', 'S 强势'], ['2', 'A 优选'], ['3', 'B 可用'], ['4', 'C 一般']].map(function (t) {
      return '<button class="chip' + (t[0] === 'all' ? ' active' : '') + '" data-tier="' + t[0] + '">' + t[1] + '</button>';
    }).join('');

    $('#roleChips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      state.role = b.dataset.role;
      $$('.chip', this).forEach(function (c) { c.classList.toggle('active', c === b); });
      renderChamps();
    });
    $('#tierChips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      state.tier = b.dataset.tier;
      $$('.chip', this).forEach(function (c) { c.classList.toggle('active', c === b); });
      renderChamps();
    });
    $('#champSort').addEventListener('change', function () { state.champSort = this.value; renderChamps(); });
    $('#champSearch').addEventListener('input', function () { state.champQuery = this.value.trim().toLowerCase(); renderChamps(); });
    $('#resetFilters').addEventListener('click', function () {
      state.role = 'all'; state.tier = 'all'; state.champSort = 'tier'; state.champQuery = '';
      $('#champSearch').value = ''; $('#champSort').value = 'tier';
      $$('#roleChips .chip').forEach(function (c, i) { c.classList.toggle('active', i === 0); });
      $$('#tierChips .chip').forEach(function (c, i) { c.classList.toggle('active', i === 0); });
      renderChamps();
    });
    $('#champGrid').addEventListener('click', function (e) {
      var b = e.target.closest('.champ-card'); if (!b) return;
      selectChamp(Number(b.dataset.id));
    });
    $('#detailPanel').addEventListener('click', function (e) {
      if (e.target.closest('#detailClose')) $('#detailPanel').classList.remove('open');
    });
    renderChamps();
  }

  function renderChamps() {
    var q = state.champQuery;
    var list = CH.filter(function (c) {
      if (state.role !== 'all' && (c.roles || []).indexOf(state.role) < 0) return false;
      if (state.tier !== 'all' && String(c.tier) !== state.tier) return false;
      if (q && (c.name + ' ' + c.title + ' ' + c.alias).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (state.champSort === 'pick') list.sort(function (a, b) { return (b.pick || 0) - (a.pick || 0); });
    else if (state.champSort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });
    else list.sort(function (a, b) { return (a.tier || 9) - (b.tier || 9) || (b.pick || 0) - (a.pick || 0); });

    $('#champCount').textContent = list.length + ' / ' + CH.length + ' 位英雄';
    $('#gridMeta').textContent = '显示 ' + list.length + ' 位 · ' +
      (state.champSort === 'pick' ? '按选取率排序' : state.champSort === 'name' ? '按名称排序' : '按分级排序');
    $('#champGrid').innerHTML = list.length ? list.map(function (c) {
      return '<button class="champ-card" data-id="' + c.id + '">' + avatar(c.icon) +
        '<span class="champ-name">' + esc(c.name) + '</span><span class="champ-title">' + esc(c.title) + '</span>' +
        '<span class="champ-foot">' + badge(c.tier) + '<span class="pick">' + pct(c.pick) + '</span></span></button>';
    }).join('') : '<div class="empty" style="color:var(--muted);padding:30px">没有匹配的英雄</div>';
  }

  function itemChip(id) {
    var it = ITEM[String(id)];
    return '<span class="item-chip">' + avatar(it ? it.icon : '', '', it ? it.name : '#' + id) + esc(it ? it.name : '#' + id) + '</span>';
  }
  function spellChip(id) {
    var sp = SPELL[String(id)];
    return '<span class="item-chip">' + avatar(sp ? sp.icon : '', '', sp ? sp.name : '#' + id) + esc(sp ? sp.name : '#' + id) + '</span>';
  }
  function buildLine(label, html, extra) {
    return '<div class="build-line"><span class="build-label">' + esc(label) + '</span>' + html +
      (extra ? '<span class="pick" style="margin-left:auto">' + extra + '</span>' : '') + '</div>';
  }

  function selectChamp(id) {
    var c = BY_ID[id], d = DET[String(id)];
    $$('.champ-card').forEach(function (b) { b.classList.toggle('sel', Number(b.dataset.id) === id); });
    if (!c || !d) return;
    var h = '<button class="modal-close detail-close" id="detailClose" aria-label="关闭">×</button>';
    h += '<div class="detail-hero">' + avatar(c.icon) + '<div><h2>' + esc(c.name) + '</h2><p>' + esc(c.title) + ' · ' +
      esc((c.roles || []).map(roleName).join(' / ')) + '</p></div>' +
      '<div class="head-grade">' + badge(c.tier, true) + '<span class="pick">选取 ' + pct(c.pick) + '</span></div></div>';

    var b = d.build || {};
    h += '<div class="detail-section"><h3>出装参考 <small>按选取率排序</small></h3>';
    (b.start || []).slice(0, 2).forEach(function (ids, i) { h += buildLine(i ? '备选起手' : '起手装', (ids || []).map(itemChip).join('')); });
    (b.cores || []).slice(0, 3).forEach(function (core, i) {
      h += buildLine('核心 ' + String.fromCharCode(65 + i), (core.ids || []).map(itemChip).join(''), '选取 ' + pct(core.pick));
    });
    if ((b.skills || []).length) {
      var s = b.skills[0];
      h += buildLine('技能加点', '<span class="skill-line">' + esc((s.keys || []).join(' → ')) + '</span>', '选取 ' + pct(s.pick));
    }
    if ((b.spells || []).length) {
      var sp = b.spells[0];
      h += buildLine('召唤师技能', (sp.ids || []).map(spellChip).join(''), '选取 ' + pct(sp.pick));
    }
    if ((b.situational || []).length) {
      h += buildLine('情境装备', (b.situational || []).slice(0, 5).map(function (x) { return itemChip(x.id); }).join(''));
    }
    h += '</div>';

    var recs = (d.augments || []).slice(0, 14);
    h += '<div class="detail-section"><h3>强化符文 <small>显示前 ' + recs.length + ' / ' + (d.augments || []).length + ' 项</small></h3><div class="rec-list">';
    recs.forEach(function (r) {
      var a = AUG[String(r.id)] || {};
      h += '<div class="rec-row">' + avatar(a.icon, 'aug') + '<div class="rec-main">' +
        '<div class="rec-line"><b>' + esc(a.name || ('#' + r.id)) + '</b>' + badge(r.tier) +
        '<span class="rarity">' + esc(a.rarityName || '') + '</span></div>' +
        '<div class="rec-desc">' + esc(a.desc || '暂无描述') + '</div>' +
        '<div class="rec-stats"><span>选取 ' + pct(r.pick) + '</span><span>' + games(r.games) + ' 场样本</span></div>' +
        '</div></div>';
    });
    h += '</div></div>';
    h += '<p class="result-note">分级来自当前版本该英雄的适配分档；只展示选取率与样本量，不展示胜率。数据日期 ' + esc(D.meta.dataDate) + '。</p>';
    $('#detailPanel').innerHTML = h;
    $('#detailPanel').classList.add('open');
  }

  /* ---------------- augments ---------------- */
  function initAugments() {
    $('#rarityChips').innerHTML = RARITIES.map(function (r) {
      return '<button class="chip' + (r[0] === 'all' ? ' active' : '') + '" data-rarity="' + r[0] + '">' + r[1] + '</button>';
    }).join('');
    $('#rarityChips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      state.rarity = b.dataset.rarity;
      $$('.chip', this).forEach(function (c) { c.classList.toggle('active', c === b); });
      renderAugments();
    });
    $('#augSearch').addEventListener('input', function () { state.augQuery = this.value.trim().toLowerCase(); renderAugments(); });
    $('#augSort').addEventListener('change', function () { state.augSort = this.value; renderAugments(); });
    $('#augGrid').addEventListener('click', function (e) {
      var b = e.target.closest('.aug-card'); if (b) openAugment(Number(b.dataset.id));
    });
    $$('[data-close-modal]').forEach(function (el) {
      el.addEventListener('click', function () { $('#augModal').hidden = true; });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#augModal').hidden = true; });
    renderAugments();
  }

  function renderAugments() {
    var q = state.augQuery;
    var list = AUG_LIST.filter(function (a) {
      if (state.rarity !== 'all' && String(a.rarity) !== state.rarity) return false;
      if (q && (a.name + ' ' + (a.desc || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (state.augSort === 'pick') list.sort(function (a, b) { return (b.pick || 0) - (a.pick || 0); });
    else if (state.augSort === 'tier') list.sort(function (a, b) { return (a.tier || 9) - (b.tier || 9) || (b.pick || 0) - (a.pick || 0); });
    else list.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });
    $('#augCount').textContent = list.length + ' / ' + AUG_LIST.length + ' 个符文';
    $('#augGrid').innerHTML = list.length ? list.map(function (a) {
      return '<button class="aug-card" data-id="' + a.id + '"><div class="aug-card-top">' + avatar(a.icon, 'aug') +
        '<div><h3>' + esc(a.name) + '</h3><div class="aug-meta">' + badge(a.tier) +
        '<span class="rarity">' + esc(a.rarityName || '') + '</span></div></div></div>' +
        '<p>' + esc(a.desc || '暂无描述') + '</p>' +
        '<div class="aug-bottom"><span>选取率 ' + pct(a.pick) + '</span><span>适配 ' + grade(a.tier).l + '</span></div></button>';
    }).join('') : '<div style="color:var(--muted);padding:30px">没有匹配的符文</div>';
  }

  function openAugment(id) {
    var a = AUG[String(id)]; if (!a) return;
    var users = [];
    Object.keys(DET).forEach(function (cid) {
      var rec = (DET[cid].augments || []).filter(function (r) { return Number(r.id) === Number(id); })[0];
      if (rec) users.push({ id: cid, rec: rec });
    });
    users.sort(function (x, y) { return (y.rec.pick || 0) - (x.rec.pick || 0); });
    var h = '<div class="modal-hero">' + avatar(a.icon, 'aug') + '<div><h2 id="modalName">' + esc(a.name) + '</h2>' +
      '<div class="aug-meta">' + badge(a.tier, false) + '<span class="rarity">' + esc(a.rarityName || '') + '</span>' +
      '<span class="pick">通用选取 ' + pct(a.pick) + '</span></div></div></div>' +
      '<div class="modal-desc">' + esc(a.desc || '暂无描述') + '</div>' +
      '<div class="modal-stat"><div><b>' + pct(a.pick) + '</b><span>全局选取率</span></div>' +
      '<div><b>' + grade(a.tier).l + '</b><span>通用适配分档</span></div>' +
      '<div><b>' + users.length + '</b><span>有记录的英雄</span></div></div>';
    h += '<div class="modal-sub"><h3>携带该符文最多的英雄</h3><div class="hero-tags">';
    h += users.slice(0, 12).map(function (u) {
      var c = BY_ID[Number(u.id)];
      return c ? '<span class="hero-tag">' + avatar(c.icon) + esc(c.name) + ' <b style="color:var(--cyan);margin-left:3px">' + pct(u.rec.pick) + '</b></span>' : '';
    }).join('') || '<span style="color:var(--muted);font-size:11px">暂无记录</span>';
    h += '</div></div>';
    h += '<p class="result-note">不展示胜率类指标。适配分档与选取率来自 ' + esc(D.meta.dataVersion) + ' 版本公开样本，仅供参考。</p>';
    $('#modalBody').innerHTML = h;
    $('#augModal').hidden = false;
  }

  /* ---------------- draft ---------------- */
  function weightedPick(recs, count) {
    var pool = recs.slice(0, 45).filter(function (r) { return r && r.id; });
    var picked = [];
    while (picked.length < count && pool.length) {
      var total = 0;
      var weights = pool.map(function (r) {
        var w = Math.pow(6 - Math.min(5, r.tier || 5), 2) * (0.35 + (r.pick || 0) * 8);
        total += w; return w;
      });
      var x = Math.random() * total, idx = 0;
      for (var i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) { idx = i; break; } }
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }

  function renderDraftChamps() {
    var q = $('#draftSearch').value.trim().toLowerCase();
    var list = CH.filter(function (c) { return !q || (c.name + ' ' + c.title + ' ' + c.alias).toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return (a.tier || 9) - (b.tier || 9) || (b.pick || 0) - (a.pick || 0); });
    $('#draftChampList').innerHTML = list.map(function (c) {
      return '<button class="draft-champ' + (state.draftChamp === c.id ? ' sel' : '') + '" data-id="' + c.id + '">' +
        avatar(c.icon) + '<span>' + esc(c.name) + '</span>' + badge(c.tier) + '</button>';
    }).join('');
  }

  function renderDraft() {
    var c = state.draftChamp ? BY_ID[state.draftChamp] : null;
    if (!c) {
      $('#draftTarget').innerHTML = '<div class="empty-icon">◇</div><div><b>请先选择一位英雄</b><p style="margin:0;color:var(--muted);font-size:11px">左侧列表按分级排序，也可以搜索。</p></div>';
      $('#draftCards').innerHTML = '<div style="grid-column:1/-1;color:var(--muted-2);text-align:center;padding:50px 0">选择英雄后生成三选一卡片</div>';
      $('#draftTitle').textContent = '2 · 本轮选择';
      return;
    }
    var d = DET[String(c.id)] || { augments: [] };
    $('#draftTarget').innerHTML = avatar(c.icon) + '<div><b>' + esc(c.name) + '</b><p>' + esc(c.title) + ' · 已选 ' + state.picks.length + ' / 3 轮</p></div>';
    if (state.round >= 3) {
      $('#draftTitle').textContent = '本局完成';
      $('#draftCards').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px 0">' +
        '<div style="font-size:34px;color:var(--cyan)">✦</div><h3 style="margin:10px 0">三轮选择已完成</h3>' +
        '<p style="color:var(--muted);font-size:12px">可在右侧查看记录，或点击「重新随机」再练一次。</p></div>';
      return;
    }
    $('#draftTitle').textContent = '2 · 第 ' + (state.round + 1) + ' 轮选择';
    $('#draftCards').innerHTML = (state.options || []).map(function (r) {
      var a = AUG[String(r.id)] || {};
      return '<button class="draft-option" data-id="' + r.id + '">' + avatar(a.icon, 'aug') +
        '<h3>' + esc(a.name || ('#' + r.id)) + '</h3><p>' + esc((a.desc || '').slice(0, 70)) + ((a.desc || '').length > 70 ? '…' : '') + '</p>' +
        '<div class="pick-rate">该英雄选取 ' + pct(r.pick) + '</div>' +
        '<div class="rarity-line">' + badge(r.tier) + ' <span class="rarity">' + esc(a.rarityName || '') + '</span></div></button>';
    }).join('');
  }

  function renderDraftLog() {
    if (!state.picks.length) { $('#draftLog').innerHTML = '<div class="log-empty">还没有选择记录</div>'; return; }
    $('#draftLog').innerHTML = state.picks.map(function (p, i) {
      var a = AUG[String(p.id)] || {};
      return '<div class="log-row"><span class="rank-index">' + (i + 1) + '</span>' + avatar(a.icon, 'aug') +
        '<div><b>' + esc(a.name || ('#' + p.id)) + '</b><small>第 ' + (i + 1) + ' 轮 · ' + pct(p.pick) + '</small></div></div>';
    }).join('');
  }

  function rollOptions() {
    if (!state.draftChamp) { toast('请先选择英雄'); return; }
    state.options = weightedPick((DET[String(state.draftChamp)] || {}).augments || [], 3);
    renderDraft();
  }

  function initDraft() {
    $('#draftSearch').addEventListener('input', renderDraftChamps);
    $('#draftChampList').addEventListener('click', function (e) {
      var b = e.target.closest('.draft-champ'); if (!b) return;
      state.draftChamp = Number(b.dataset.id);
      state.round = 0; state.picks = []; state.options = [];
      renderDraftChamps(); rollOptions(); renderDraftLog();
    });
    $('#draftCards').addEventListener('click', function (e) {
      var b = e.target.closest('.draft-option'); if (!b || state.round >= 3) return;
      var id = Number(b.dataset.id);
      var rec = state.options.filter(function (o) { return Number(o.id) === id; })[0];
      if (!rec) return;
      state.picks.push(rec); state.round++;
      renderDraftLog();
      if (state.round < 3) rollOptions(); else renderDraft();
    });
    $('#rerollBtn').addEventListener('click', function () {
      if (!state.draftChamp) { toast('请先选择英雄'); return; }
      if (state.round >= 3) { state.round = 0; state.picks = []; renderDraftLog(); toast('已开始新一轮'); }
      rollOptions();
    });
    $('#clearDraft').addEventListener('click', function () {
      state.picks = []; state.round = 0; renderDraftLog(); renderDraft();
    });
    renderDraftChamps(); renderDraft(); renderDraftLog();
  }

  /* ---------------- about ---------------- */
  function renderAbout() {
    var m = D.meta;
    $('#aboutMeta').innerHTML =
      '<h2>当前数据快照</h2><table class="meta-table">' +
      [['版本', m.patch], ['快照版本', m.dataVersion], ['上游生成时间', m.generatedAt], ['同步时间', m.syncedAt], ['数据日期', m.dataDate],
        ['数据量', m.championCount + ' 英雄 / ' + m.augmentCount + ' 符文 / ' + m.itemCount + ' 装备'],
        ['来源', m.source]].map(function (r) {
        return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>';
      }).join('') + '</table>' +
      '<div class="about-block"><h3>我们展示什么</h3><p>英雄的适配分级、选取率、样本量；每个英雄的核心出装、起始装备、技能加点、召唤师技能；强化符文的效果说明与适配记录。所有字段均来自版本冻结的静态快照。</p></div>' +
      '<div class="about-block"><h3>我们不展示什么</h3><p>胜率、调整胜率、胜场等结论性指标。分级是第三方样本给出的适配分档，不等于胜率排名。</p></div>' +
      '<div class="about-block"><h3>如何更新</h3><p>在项目根目录依次运行 <code>python scripts/sync.py</code>、<code>python scripts/build_data.py</code>、<code>python scripts/build_web_portal.py</code>，然后把 <code>docs/</code> 提交到 GitHub Pages。</p></div>';
  }

  /* ---------------- boot ---------------- */
  renderHome();
  initChamps();
  initAugments();
  initDraft();
  renderAbout();
  initVersionCheck();
  checkVersion();
})();
