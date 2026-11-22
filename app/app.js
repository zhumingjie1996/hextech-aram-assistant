(function () {
  'use strict';

  var D = window.HEX_DATA;
  if (!D) {
    document.getElementById('detailPanel').innerHTML = '<div class="empty">数据未加载，请先运行 scripts/build_data.py</div>';
    return;
  }

  var CH = D.champions.slice().sort(function (a, b) {
    return (a.tier || 9) - (b.tier || 9) || (b.pick || 0) - (a.pick || 0);
  });
  var BY_ID = {};
  CH.forEach(function (c) { BY_ID[c.id] = c; });
  var AUG = D.augments, ITEM = D.items, SPELL = D.spells, DET = D.details;

  var GRADES = {
    1: { l: 'S', t: '强势', c: 's' },
    2: { l: 'A', t: '优选', c: 'a' },
    3: { l: 'B', t: '可用', c: 'b' },
    4: { l: 'C', t: '一般', c: 'c' },
    5: { l: 'D', t: '谨慎', c: 'd' }
  };
  var ROLES = [
    ['fighter', '战士'], ['mage', '法师'], ['marksman', '射手'],
    ['assassin', '刺客'], ['tank', '坦克'], ['support', '辅助']
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function grade(t) { return GRADES[t] || { l: '?', t: '样本不足', c: 'u' }; }
  function pct(v) {
    if (v == null) return '—';
    if (v > 0 && v < 0.001) return '<0.1%';
    return (v * 100).toFixed(1) + '%';
  }
  function games(v) { return v == null ? '样本未披露' : v.toLocaleString('zh-CN') + ' 场'; }
  function ico(url, cls) {
    return '<span class="ico ' + cls + '" style="background-image:url(\'' + esc(url) + '\')"></span>';
  }
  function badge(g, big) {
    return '<span class="grade g-' + g.c + (big ? ' big' : '') + '" title="' + esc(g.t) + '">' + g.l + '</span>';
  }

  function reason(rec, aug, synergyName) {
    if (!rec) {
      return '该英雄下暂无这个符文的对局样本，只能按通用分级与符文描述参考，不确定性较高。';
    }
    var t = rec.tier, p = rec.pick || 0, g = rec.games, s;
    if (t === 1 || t === 2) {
      s = p >= 0.04
        ? '在该英雄上适配分级靠前、也是高频选择，通常是稳妥的优先项。'
        : '适配分级靠前但选取率不高，可能是被低估的冷门好牌。';
    } else if (t === 4 || t === 5) {
      s = p >= 0.04
        ? '很常见的选择，但在该英雄上适配分级偏后，别只按热度拿。'
        : '该英雄上出现较少、分级也偏后，更适合当备选。';
    } else {
      s = '中规中矩的可选项，结合已拿到的符文和双方阵容来判断。';
    }
    if (g == null) s += ' 样本量未披露，结论不确定性较高。';
    else if (g < 100) s += ' 样本偏少，仅作线索，别当成定论。';
    if (aug && aug.rarity === 2) s += ' 棱彩级效果会明显改变这局的打法方向。';
    if (synergyName) s += ' 与已选的「' + synergyName + '」有成套组合记录。';
    return s;
  }

  function itemChip(id) {
    var it = ITEM[String(id)];
    return '<span class="item-chip">' + ico(it ? it.icon : '', 'item-ico') + esc(it ? it.name : '#' + id) + '</span>';
  }
  function spellChip(id) {
    var sp = SPELL[String(id)];
    return '<span class="item-chip">' + ico(sp ? sp.icon : '', 'item-ico') + esc(sp ? sp.name : '#' + id) + '</span>';
  }
  function itemsLine(label, ids) {
    if (!ids || !ids.length) return '';
    return '<div class="line"><span class="build-label">' + esc(label) + '</span>' + ids.map(itemChip).join('') + '</div>';
  }

  function augRow(rec, synergyName) {
    var aug = AUG[String(rec.id)] || {};
    var g = grade(rec.tier);
    return '<div class="aug-row">' + ico(aug.icon || '', 'aug-ico') +
      '<div class="aug-body"><div class="aug-line"><b>' + esc(aug.name || ('#' + rec.id)) + '</b>' +
      badge(g) + '<span class="rarity">' + esc(aug.rarityName || '') + '</span></div>' +
      '<div class="aug-desc">' + esc(aug.desc || '暂无描述') + '</div>' +
      '<div class="aug-why">' + esc(reason(rec, aug, synergyName)) + '</div></div>' +
      '<div class="aug-stats"><span>选取 ' + pct(rec.pick) + '</span><span>' + games(rec.games) + '</span></div></div>';
  }

  /* ---------- 顶部与英雄列表 ---------- */
  $('metaBar').innerHTML =
    '<span class="pill accent">版本 <b>' + esc(D.meta.patch) + '</b></span>' +
    '<span class="pill">快照 <b>' + esc(D.meta.dataVersion) + '</b></span>' +
    '<span class="pill">数据日期 <b>' + esc(D.meta.dataDate) + '</b></span>' +
    '<span class="pill"><b>' + D.meta.championCount + '</b> 英雄 · <b>' + D.meta.augmentCount + '</b> 符文</span>' +
    '<span class="pill">第三方公开样本</span>';

  var roleFilter = 'all';
  var roleBox = $('roleChips');
  roleBox.innerHTML = '<button class="chip active" data-role="all">全部</button>' +
    ROLES.map(function (r) { return '<button class="chip" data-role="' + r[0] + '">' + r[1] + '</button>'; }).join('');
  roleBox.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    roleFilter = chip.dataset.role;
    roleBox.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('active', c === chip); });
    renderGrid();
  });

  var currentChamp = null;
  function renderGrid() {
    var q = $('champSearch').value.trim().toLowerCase();
    var list = CH.filter(function (c) {
      if (roleFilter !== 'all' && (c.roles || []).indexOf(roleFilter) < 0) return false;
      if (!q) return true;
      return (c.name + ' ' + c.title + ' ' + c.alias).toLowerCase().indexOf(q) >= 0;
    });
    $('gridCount').textContent = list.length + ' 位 · 按分级排序';
    $('champGrid').innerHTML = list.length ? list.map(function (c) {
      var g = grade(c.tier);
      return '<button class="champ-card' + (currentChamp === c.id ? ' sel' : '') + '" data-id="' + c.id + '">' +
        ico(c.icon, 'champ-ico') + '<span class="champ-name">' + esc(c.name) + '</span>' +
        '<span class="champ-title">' + esc(c.title) + '</span>' +
        '<span class="champ-foot">' + badge(g) + '<span class="pick">' + pct(c.pick) + '</span></span></button>';
    }).join('') : '<div class="empty">没有匹配的英雄</div>';
  }
  $('champSearch').addEventListener('input', renderGrid);
  $('champGrid').addEventListener('click', function (e) {
    var card = e.target.closest('.champ-card');
    if (card) selectChamp(Number(card.dataset.id));
  });

  /* ---------- 英雄详情 ---------- */
  function renderDetail(id) {
    var c = BY_ID[id], d = DET[String(id)];
    if (!c || !d) { $('detailPanel').innerHTML = '<div class="empty">暂无该英雄详情</div>'; return; }
    var g = grade(c.tier);
    var h = '<div class="detail-head">' + ico(c.icon, 'champ-ico') +
      '<div><h2>' + esc(c.name) + '</h2><p>' + esc(c.title) + ' · ' +
      esc((c.roles || []).map(function (r) {
        for (var i = 0; i < ROLES.length; i++) if (ROLES[i][0] === r) return ROLES[i][1];
        return r;
      }).join(' / ')) + '</p></div>' +
      '<div class="head-grade">' + badge(g, true) + '<span class="pick">选取 ' + pct(c.pick) + '</span></div></div>';

    var b = d.build || {};
    h += '<div class="block"><h3>出装参考<small>当前版本常见构建，按选取率排序</small></h3>';
    (b.start || []).forEach(function (ids, i) { h += itemsLine(i === 0 ? '起手装' : '备选起手', ids); });
    (b.cores || []).forEach(function (core, i) {
      h += '<div class="line"><span class="build-label">核心 ' + String.fromCharCode(65 + i) + '</span>' +
        (core.ids || []).map(itemChip).join('') +
        '<span class="pick">选取 ' + pct(core.pick) + '</span></div>';
    });
    (b.skills || []).slice(0, 1).forEach(function (s) {
      h += '<div class="line"><span class="build-label">技能加点</span><span class="skill-line">' +
        esc((s.keys || []).join(' → ')) + '</span><span class="pick">选取 ' + pct(s.pick) + '</span></div>';
    });
    (b.spells || []).slice(0, 1).forEach(function (s) {
      h += '<div class="line"><span class="build-label">召唤师技能</span>' +
        (s.ids || []).map(spellChip).join('') + '<span class="pick">选取 ' + pct(s.pick) + '</span></div>';
    });
    if ((b.situational || []).length) {
      h += itemsLine('情境装备', (b.situational || []).slice(0, 5).map(function (x) { return x.id; }));
    }
    h += '</div>';

    var recs = d.augments || [];
    h += '<div class="block"><h3>符文参考<small>共 ' + recs.length + ' 个有记录 · 按适配分级排序，显示前 20</small></h3>' +
      recs.slice(0, 20).map(function (r) { return augRow(r, null); }).join('') + '</div>';
    h += '<div class="block"><p class="result-note">分级来自当前版本该英雄的适配分档；只展示选取率、样本量与理由，不展示胜率。数据日期 ' +
      esc(D.meta.dataDate) + ' · 快照 ' + esc(D.meta.dataVersion) + '。</p></div>';
    $('detailPanel').innerHTML = h;
  }

  function selectChamp(id) {
    currentChamp = id;
    $('champGrid').querySelectorAll('.champ-card').forEach(function (c) {
      c.classList.toggle('sel', Number(c.dataset.id) === id);
    });
    renderDetail(id);
    if (window.innerWidth < 900) $('detailPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 三选一助手 ---------- */
  var RARITY_ORDER = ['棱彩', '黄金', '白银', '其他'];
  function augOptions(withEmpty) {
    var groups = {};
    Object.keys(AUG).forEach(function (k) {
      var a = AUG[k], key = a.rarityName || '其他';
      (groups[key] = groups[key] || []).push(a);
    });
    var keys = Object.keys(groups).sort(function (x, y) {
      var ix = RARITY_ORDER.indexOf(x), iy = RARITY_ORDER.indexOf(y);
      return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy);
    });
    var html = withEmpty ? '<option value="">— 无 —</option>' : '';
    keys.forEach(function (k) {
      var list = groups[k].sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
      html += '<optgroup label="' + esc(k) + '">' + list.map(function (a) {
        return '<option value="' + a.id + '">' + esc(a.name) + '</option>';
      }).join('') + '</optgroup>';
    });
    return html;
  }

  var champSel = $('draftChamp');
  champSel.innerHTML = CH.map(function (c) {
    return '<option value="' + c.id + '">' + esc(c.name) + ' · ' + esc(c.title) + '</option>';
  }).join('');
  var pickedSels = Array.prototype.slice.call(document.querySelectorAll('.picked'));
  var cardSels = Array.prototype.slice.call(document.querySelectorAll('.card'));
  pickedSels.forEach(function (s) { s.innerHTML = augOptions(true); });
  cardSels.forEach(function (s) { s.innerHTML = augOptions(false); });

  function autoFill(champId) {
    var recs = (DET[String(champId)] || {}).augments || [];
    cardSels.forEach(function (s, i) { if (recs[i]) s.value = String(recs[i].id); });
  }
  champSel.addEventListener('change', function () {
    autoFill(Number(champSel.value));
    $('draftResults').innerHTML = '';
    $('draftHint').textContent = '';
  });

  function draftCard(id, champId, picked, index) {
    var d = DET[String(champId)] || {};
    var rec = (d.augments || []).filter(function (r) { return r.id === id; })[0];
    var aug = AUG[String(id)] || {};
    var synergy = null;
    picked.forEach(function (p) {
      if (!synergy && (d.trios || []).some(function (t) { return t.indexOf(id) >= 0 && t.indexOf(p) >= 0; })) synergy = p;
    });
    var synName = synergy && AUG[String(synergy)] ? AUG[String(synergy)].name : null;
    var g = grade(rec && rec.tier);
    return '<article class="result-card"><div class="result-no">候选 ' + (index + 1) + '</div>' +
      '<div class="result-head">' + ico(aug.icon || '', 'aug-ico') +
      '<div><b>' + esc(aug.name || ('#' + id)) + '</b><div><span class="rarity">' + esc(aug.rarityName || '') + '</span></div></div>' +
      '<span style="margin-left:auto">' + badge(g, true) + '</span></div>' +
      '<p class="result-desc">' + esc(aug.desc || '暂无描述') + '</p>' +
      '<p class="result-why">' + esc(reason(rec, aug, synName)) + '</p>' +
      '<div class="result-stats">该英雄选取 ' + pct(rec && rec.pick) + ' · ' + games(rec && rec.games) +
      ' · 适配分级 ' + esc(g.t) + '</div></article>';
  }

  $('evalBtn').addEventListener('click', function () {
    var champId = Number(champSel.value);
    var picked = pickedSels.map(function (s) { return Number(s.value) || 0; }).filter(Boolean);
    var cards = cardSels.map(function (s) { return Number(s.value) || 0; });
    if (cards.some(function (x) { return !x; })) {
      $('draftHint').textContent = '请把三张候选卡都选上（已选符文可以留空）。';
      return;
    }
    $('draftHint').textContent = '';
    $('draftResults').innerHTML = cards.map(function (id, i) {
      return draftCard(id, champId, picked, i);
    }).join('') +
      '<div class="result-note">以上只给出分级、选取率与理由，不替你做决定：结合已拿到的符文、双方阵容和这局想打的路线自己选。' +
      '数据日期 ' + esc(D.meta.dataDate) + ' · 版本 ' + esc(D.meta.patch) + ' · 快照 ' + esc(D.meta.dataVersion) +
      ' · 第三方公开样本，不展示胜率。</div>';
  });

  /* ---------- Tab ---------- */
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
      ['lookup', 'draft'].forEach(function (name) { $(name).hidden = name !== tab.dataset.tab; });
    });
  });

  /* ---------- 在线数据直连：实测上游真实响应，失败自动回退本地快照 ---------- */
  var API = 'https://data.dtodo.cn/api/client/v1';
  var liveStatus = $('liveStatus'), liveDot = $('liveDot');
  var configPromise = null;
  liveStatus.innerHTML = '尚未请求线上接口 · 当前显示本地冻结快照 <b>' + esc(D.meta.dataVersion) + '</b>';

  function setLive(kind, html) {
    liveStatus.className = 'live-status ' + kind;
    liveStatus.innerHTML = html;
    liveDot.className = 'live-dot ' + (
      kind === 'ok' ? 'on' : kind === 'err' ? 'err' : kind === 'warn' ? 'warn' : 'busy'
    );
  }
  function fmtMs(ms) { return ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(2) + ' s'; }
  function byteLen(s) { return new TextEncoder().encode(s).length; }
  function kv(k, v) { return '<div class="kv"><span>' + esc(k) + '</span><b>' + v + '</b></div>'; }
  function failNote(e) {
    var msg = (e && e.message) || String(e);
    setLive('err', '<b>直连失败：' + esc(msg) + '</b>' +
      '<p>可能是离线、上游不可用或跨域被拦截；双击 <code>file://</code> 打开时部分浏览器会限制跨域请求，可改用本地 HTTP 服务打开。' +
      '本地快照 <b>' + esc(D.meta.dataVersion) + '</b> 仍可完整离线使用，页面功能不受影响。</p>');
  }
  function getConfig() {
    if (configPromise) return configPromise;
    var t0 = Date.now();
    configPromise = fetch(API + '/config', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text().then(function (txt) {
        return { status: r.status, txt: txt, cfg: JSON.parse(txt), ms: Date.now() - t0 };
      });
    }).catch(function (e) { configPromise = null; throw e; });
    return configPromise;
  }

  function checkLive() {
    setLive('busy', '正在直连 <code>' + esc(API + '/config') + '</code> …');
    getConfig().then(function (res) {
      var c = res.cfg, v = c.dataVersion, same = v === D.meta.dataVersion;
      var verdict = same
        ? '<b class="good">与本地快照一致</b> — 页面当前用的就是线上最新版数据。'
        : '<b class="warn">上游已更新</b> — 本地 ' + esc(D.meta.dataVersion) + '，线上 ' + esc(v || '-') +
          '。请在项目目录运行 <code>python scripts/sync.py &amp;&amp; python scripts/build_data.py</code> 重建快照。';
      setLive(same ? 'ok' : 'warn',
        '<div class="live-grid">' +
          kv('接口服务', esc(c.service || '-')) +
          kv('HTTP / CORS', res.status + ' · 浏览器直连成功') +
          kv('线上版本', 'patch ' + esc(c.gamePatch || '-') + ' · ' + esc(v || '-')) +
          kv('上游生成', esc(c.generatedAt || '-')) +
          kv('响应 / 耗时', byteLen(res.txt) + ' bytes · ' + fmtMs(res.ms)) +
          kv('本地快照', esc(D.meta.dataVersion)) +
        '</div><p>' + verdict + '</p>' +
        '<p class="live-note">这是第三方公开只读接口（aramgg client api），<b>非 Riot 官方</b>；线上响应仅用于版本核对，页面始终只展示分级 / 选取率 / 样本量 / 理由。</p>' +
        '<details><summary>查看原始响应片段</summary><pre>' + esc(res.txt.slice(0, 420)) + ' …</pre></details>');
    }).catch(failNote);
  }

  function fetchLive() {
    var id = currentChamp || (CH[0] && CH[0].id);
    if (!id) return;
    var c = BY_ID[id];
    setLive('busy', '正在实时拉取「' + esc(c ? c.name : '#' + id) + '」的英雄详情 …');
    getConfig().then(function (cfgRes) {
      var v = cfgRes.cfg.dataVersion || D.meta.dataVersion;
      var url = API + '/data/' + encodeURIComponent(v) + '/champions/' + id + '.json';
      var t0 = Date.now();
      return fetch(url, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text().then(function (txt) {
          return { txt: txt, raw: JSON.parse(txt), ms: Date.now() - t0, ver: v, url: url };
        });
      });
    }).then(function (res) {
      var list = res.raw.augments || [];
      var localN = ((DET[String(id)] || {}).augments || []).length;
      /* 合规：原始响应含胜率类字段，这里只读取 tier / pickRate / games，其余一律不解析 */
      var top = [];
      list.forEach(function (a) {
        var s = a.stats || {};
        if (top.length < 5 && (s.tier === 1 || s.tier === 2)) {
          top.push('<li>' + esc(a.name || ('#' + a.id)) + badge(grade(s.tier)) +
            '<span>选取 ' + pct(s.pickRate) + ' · ' + games(s.games) + '</span></li>');
        }
      });
      setLive('ok',
        '<div class="live-grid">' +
          kv('英雄', esc(c ? c.name : '#' + id)) +
          kv('线上 dataVersion', esc(res.ver)) +
          kv('HTTP 状态', '200 · 实时读取') +
          kv('响应 / 耗时', byteLen(res.txt) + ' bytes · ' + fmtMs(res.ms)) +
          kv('线上符文记录', list.length + ' 条') +
          kv('本地快照记录', localN + ' 条 · ' + (list.length === localN ? '一致' : '不一致')) +
        '</div><p><b>线上 S / A 级符文（前 5）</b></p>' +
        (top.length ? '<ul class="live-list">' + top.join('') + '</ul>' : '<p>该英雄线上暂无 S / A 级记录。</p>') +
        '<p class="live-note">以上由浏览器直接请求上游接口得到，未经过本地快照。原始响应包含胜率类字段，此处<b>未读取、未展示</b>，仅解析分级 / 选取率 / 样本量。数据来源为第三方公开样本，非 Riot 官方。</p>' +
        '<details><summary>查看请求地址</summary><pre>' + esc(res.url) + '</pre></details>');
    }).catch(failNote);
  }

  $('checkLive').addEventListener('click', checkLive);
  $('fetchLive').addEventListener('click', fetchLive);

  renderGrid();
  autoFill(Number(champSel.value));
  if (CH.length) selectChamp(CH[0].id);
})();
