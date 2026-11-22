/* 海斗助手 · 移动端 App 原型
   数据来自 ../data/data.js（真实 16.23.1 快照，已过滤胜率类字段）。
   纯静态、无框架、无构建；所有交互为前端模拟，离线可用。
*/
(function () {
  'use strict';

  var D = window.HEX_DATA;
  if (!D) {
    document.getElementById('vHome').innerHTML = '<div class="empty">数据未加载，请先运行 scripts/build_data.py</div>';
    return;
  }

  var CH = D.champions.slice().sort(function (a, b) {
    return (a.tier || 9) - (b.tier || 9) || (b.pick || 0) - (a.pick || 0);
  });
  var BY_ID = {};
  CH.forEach(function (c) { BY_ID[c.id] = c; });
  var AUG = D.augments, ITEMS = D.items, SPELLS = D.spells, DET = D.details;

  var GRADES = {
    1: { l: 'S', t: '强势', c: 's' }, 2: { l: 'A', t: '优选', c: 'a' },
    3: { l: 'B', t: '可用', c: 'b' }, 4: { l: 'C', t: '一般', c: 'c' },
    5: { l: 'D', t: '谨慎', c: 'd' }
  };
  var ROLES = [['fighter', '战士'], ['mage', '法师'], ['marksman', '射手'],
               ['assassin', '刺客'], ['tank', '坦克'], ['support', '辅助']];
  var RARITY = ['棱彩', '黄金', '白银', '其他'];
  var APPBAR = {
    home:  ['海斗助手', 'ARAM Mayhem · 出装与符文参考'],
    champs:['英雄查询', '按版本分级与选取率浏览'],
    draft: ['三选一助手', '选英雄 · 已拿符文 · 三张候选卡'],
    codex: ['符文图鉴', '按稀有度检索强化符文'],
    me:    ['数据与关于', '版本、来源与使用口径']
  };

  /* ---------- 工具 ---------- */
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
  function games(v) { return v == null ? '样本未披露' : Number(v).toLocaleString('zh-CN') + ' 场'; }
  function ico(url, cls) {
    return '<span class="ico ' + cls + '" style="background-image:url(\'' + esc(url || '') + '\')"></span>';
  }
  function badge(g, big) {
    return '<span class="grade g-' + g.c + (big ? ' lg' : '') + '" title="' + esc(g.t) + '">' + g.l + '</span>';
  }
  function augOf(id) { return AUG[String(id)] || {}; }
  function itemChip(id) {
    var it = ITEMS[String(id)];
    return '<span class="item-chip">' + ico(it ? it.icon : '', 'i-item') + esc(it ? it.name : '#' + id) + '</span>';
  }
  function spellChip(id) {
    var s = SPELLS[String(id)];
    return '<span class="item-chip">' + ico(s ? s.icon : '', 'i-item') + esc(s ? s.name : '#' + id) + '</span>';
  }
  function itemsLine(label, ids) {
    if (!ids || !ids.length) return '';
    return '<div class="line"><span class="lbl">' + esc(label) + '</span>' + ids.map(itemChip).join('') + '</div>';
  }
  function roleName(r) {
    for (var i = 0; i < ROLES.length; i++) if (ROLES[i][0] === r) return ROLES[i][1];
    return r;
  }
  function reason(rec, aug, synName) {
    if (!rec) return '该英雄下暂无这个符文的对局样本，只能按通用分级与符文描述参考，不确定性较高。';
    var t = rec.tier, p = rec.pick || 0, g = rec.games, s;
    if (t === 1 || t === 2) {
      s = p >= 0.04 ? '在该英雄上适配分级靠前、也是高频选择，通常是稳妥的优先项。'
                    : '适配分级靠前但选取率不高，可能是被低估的冷门好牌。';
    } else if (t === 4 || t === 5) {
      s = p >= 0.04 ? '很常见的选择，但在该英雄上适配分级偏后，别只按热度拿。'
                    : '该英雄上出现较少、分级也偏后，更适合当备选。';
    } else {
      s = '中规中矩的可选项，结合已拿到的符文和双方阵容来判断。';
    }
    if (g == null) s += ' 样本量未披露，结论不确定性较高。';
    else if (g < 100) s += ' 样本偏少，仅作线索，别当成定论。';
    if (aug && aug.rarity === 2) s += ' 棱彩级效果会明显改变这局的打法方向。';
    if (synName) s += ' 与已选的「' + synName + '」有成套组合记录。';
    return s;
  }
  function augRow(rec) {
    var a = augOf(rec.id), g = grade(rec.tier);
    return '<div class="aug-row">' + ico(a.icon, 'i-aug') +
      '<div class="body"><div class="top"><b>' + esc(a.name || ('#' + rec.id)) + '</b>' + badge(g) +
      '<span class="rarity">' + esc(a.rarityName || '') + '</span></div>' +
      '<div class="aug-desc">' + esc(a.desc || '暂无描述') + '</div>' +
      '<div class="aug-why">' + esc(reason(rec, a, null)) + '</div></div>' +
      '<div class="aug-side"><span>选取 ' + pct(rec.pick) + '</span><span>' + games(rec.games) + '</span></div></div>';
  }

  /* 反查：每个符文在哪些英雄上适配靠前（供符文详情用） */
  var AUG_HEROES = {};
  Object.keys(DET).forEach(function (cid) {
    (DET[cid].augments || []).forEach(function (r) {
      if (r.tier === 1 || r.tier === 2) {
        (AUG_HEROES[String(r.id)] = AUG_HEROES[String(r.id)] || [])
          .push({ id: Number(cid), tier: r.tier, pick: r.pick || 0 });
      }
    });
  });
  Object.keys(AUG_HEROES).forEach(function (k) {
    AUG_HEROES[k].sort(function (a, b) { return a.tier - b.tier || b.pick - a.pick; });
    AUG_HEROES[k] = AUG_HEROES[k].slice(0, 6);
  });

  /* ---------- 状态 ---------- */
  var view = 'home';
  var champQ = '', champRole = 'all';
  var codexQ = '', codexRarity = '全部';
  var draft = { champ: CH.length ? CH[0].id : 0, picked: [0, 0, 0], cards: [0, 0, 0], results: null };
  var picker = null, toastTimer = null;

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1900);
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    var top = CH.slice(0, 8);
    var tiles = top.map(function (c) {
      return '<button class="tile" data-act="open-champ" data-id="' + c.id + '">' +
        ico(c.icon, 'i-champ') + '<b>' + esc(c.name) + '</b><small>' + esc(c.title) + '</small>' +
        '<span class="foot">' + badge(grade(c.tier)) + '<span class="pick">' + pct(c.pick) + '</span></span></button>';
    }).join('');
    $('vHome').innerHTML =
      '<div class="hero-card">' +
        '<div class="hero-top"><span>●</span> 当前版本快照 · 已同步</div>' +
        '<div class="hero-ver">' + esc(D.meta.patch) + '</div>' +
        '<div class="hero-date">dataVersion ' + esc(D.meta.dataVersion) + ' · 数据日期 ' + esc(D.meta.dataDate) + '</div>' +
        '<div class="hero-stats"><div><b>' + D.meta.championCount + '</b>英雄</div>' +
        '<div><b>' + D.meta.augmentCount + '</b>强化符文</div>' +
        '<div><b>' + D.meta.itemCount + '</b>装备</div></div>' +
      '</div>' +
      '<button class="cta" data-act="go-draft"><span>开局三选一<small>选英雄 + 已拿符文 + 三张卡，看分级与理由</small></span><span class="arrow">→</span></button>' +
      '<div class="sec"><h2>本版本强势英雄</h2><span>横向滑动 · 按分级排序</span></div>' +
      '<div class="hscroll">' + tiles + '</div>' +
      '<div class="sec"><h2>快捷入口</h2></div>' +
      '<div class="quick">' +
        '<button data-act="go-view" data-v="champs"><b>英雄查询</b><span>出装 / 技能 / 符文</span></button>' +
        '<button data-act="go-view" data-v="codex"><b>符文图鉴</b><span>234 个强化符文</span></button>' +
        '<button data-act="go-view" data-v="draft"><b>三选一助手</b><span>决策那一刻用</span></button>' +
        '<button data-act="go-view" data-v="me"><b>版本与数据</b><span>来源与口径说明</span></button>' +
      '</div>' +
      '<div class="card tight" style="margin-top:12px"><div class="tiny faint">' +
        '所有数字都绑定版本与数据日期，跨版本不混算。统计来自国服第三方公开只读样本，' +
        '<span class="gold">非 Riot 官方</span>；仅展示分级、选取率、样本量与理由，不展示胜率。' +
      '</div></div>';
  }

  /* ---------- 英雄查询 ---------- */
  function champFiltered() {
    var q = champQ.trim().toLowerCase();
    return CH.filter(function (c) {
      if (champRole !== 'all' && (c.roles || []).indexOf(champRole) < 0) return false;
      if (!q) return true;
      return (c.name + ' ' + c.title + ' ' + c.alias).toLowerCase().indexOf(q) >= 0;
    });
  }
  function champGridHtml() {
    var list = champFiltered();
    return list.length ? list.map(function (c) {
      return '<button class="ccard" data-act="open-champ" data-id="' + c.id + '">' +
        ico(c.icon, 'i-champ') + '<b>' + esc(c.name) + '</b><small>' + esc(c.title) + '</small>' +
        '<span class="foot">' + badge(grade(c.tier)) + '<span class="pick">' + pct(c.pick) + '</span></span></button>';
    }).join('') : '<div class="empty">没有匹配的英雄</div>';
  }
  function renderChamps() {
    $('vChamps').innerHTML =
      '<input class="search" id="champSearch" data-input="champ" type="search" placeholder="搜索英雄：中文名 / 称号 / 英文名" autocomplete="off">' +
      '<div class="chips">' +
        ['all'].concat(ROLES.map(function (r) { return r[0]; })).map(function (r) {
          return '<button class="chip' + (champRole === r ? ' active' : '') + '" data-act="role" data-r="' + r + '">' +
            (r === 'all' ? '全部' : roleName(r)) + '</button>';
        }).join('') + '</div>' +
      '<div class="sec"><h2>英雄列表</h2><span id="champCount"></span></div>' +
      '<div class="grid2" id="champGrid"></div>';
    updateChampGrid();
  }
  function updateChampGrid() {
    var list = champFiltered();
    $('champGrid').innerHTML = champGridHtml();
    if ($('champCount')) $('champCount').textContent = list.length + ' 位 · 按分级排序';
  }

  /* ---------- 英雄详情子页 ---------- */
  function champDetailHtml(id) {
    var c = BY_ID[id], d = DET[String(id)];
    if (!c || !d) return '<div class="sp-bar"><button class="sp-back" data-act="back">← 返回</button><b>暂无数据</b></div>';
    var b = d.build || {}, g = grade(c.tier);
    var h = '<div class="sp-bar"><button class="sp-back" data-act="back">← 返回</button><b>' + esc(c.name) + '</b></div><div class="sp-body">';
    h += '<div class="sp-hero">' + ico(c.icon, 'i-champ i-lg') +
      '<div class="t"><h2>' + esc(c.name) + '</h2><p>' + esc(c.title) + ' · ' +
      esc((c.roles || []).map(roleName).join(' / ')) + '</p></div>' + badge(g, true) + '</div>';
    h += '<div class="card"><div class="tiny faint" style="margin-bottom:10px">英雄选取率 ' + pct(c.pick) +
      ' · 适配分级 ' + esc(g.t) + ' · 版本 ' + esc(D.meta.dataVersion) + '</div>' +
      '<button class="mini-btn" data-act="draft-from-champ" data-id="' + c.id + '">⚡ 用这个英雄开始三选一</button></div>';

    h += '<div class="sec"><h2>出装参考</h2><span>按选取率</span></div><div class="card">';
    (b.start || []).forEach(function (ids, i) { h += itemsLine(i === 0 ? '起手装' : '备选', ids); });
    (b.cores || []).forEach(function (core, i) {
      h += '<div class="line"><span class="lbl">核心 ' + String.fromCharCode(65 + i) + '</span>' +
        (core.ids || []).map(itemChip).join('') + '<span class="pick">选取 ' + pct(core.pick) + '</span></div>';
    });
    (b.skills || []).slice(0, 1).forEach(function (s) {
      h += '<div class="line"><span class="lbl">技能加点</span><span class="skill">' +
        esc((s.keys || []).join(' → ')) + '</span><span class="pick">选取 ' + pct(s.pick) + '</span></div>';
    });
    (b.spells || []).slice(0, 1).forEach(function (s) {
      h += '<div class="line"><span class="lbl">召唤师技能</span>' + (s.ids || []).map(spellChip).join('') +
        '<span class="pick">选取 ' + pct(s.pick) + '</span></div>';
    });
    if ((b.situational || []).length) {
      h += itemsLine('情境装备', (b.situational || []).slice(0, 5).map(function (x) { return x.id; }));
    }
    h += '</div>';

    var recs = d.augments || [];
    h += '<div class="sec"><h2>符文参考</h2><span>共 ' + recs.length + ' 个有记录 · 前 8</span></div>' +
      '<div class="card tight">' + (recs.length ? recs.slice(0, 8).map(augRow).join('') : '<div class="empty">暂无记录</div>') + '</div>';
    if ((d.trios || []).length) {
      h += '<div class="sec"><h2>成套组合线索</h2><span>' + d.trios.length + ' 组</span></div><div class="card tight">' +
        d.trios.slice(0, 3).map(function (t) {
          return '<div class="line">' + t.map(function (x) {
            var a = augOf(x);
            return '<span class="item-chip">' + esc(a.name || ('#' + x)) + '</span>';
          }).join('') + '</div>';
        }).join('') + '</div>';
    }
    h += '<p class="note">分级来自当前版本该英雄的适配分档；只展示选取率、样本量与理由，不展示胜率。' +
      '数据日期 ' + esc(D.meta.dataDate) + ' · 快照 ' + esc(D.meta.dataVersion) + ' · 第三方公开样本，非 Riot 官方。</p></div>';
    return h;
  }

  /* ---------- 三选一助手 ---------- */
  function slotHtml(kind, i, id) {
    var a = augOf(id);
    if (!id) {
      return '<button class="slot" data-act="pick-' + kind + '" data-i="' + i + '">' +
        '<span class="ph">＋</span><span>' + (kind === 'card' ? '候选卡 ' + (i + 1) : '已拿符文') + '</span></button>';
    }
    return '<button class="slot filled" data-act="pick-' + kind + '" data-i="' + i + '">' +
      ico(a.icon, 'ico') + '<b>' + esc(a.name || ('#' + id)) + '</b>' +
      (kind === 'picked' ? '<span class="clr" data-act="clear-picked" data-i="' + i + '">✕ 移除</span>' : '') +
      '</button>';
  }
  function autoFill() {
    var recs = (DET[String(draft.champ)] || {}).augments || [];
    draft.cards = [0, 0, 0];
    recs.slice(0, 3).forEach(function (r, i) { draft.cards[i] = r.id; });
    draft.picked = [0, 0, 0];
    draft.results = null;
  }
  function scoreCard(id, idx) {
    var d = DET[String(draft.champ)] || {};
    var rec = (d.augments || []).filter(function (r) { return r.id === id; })[0];
    var a = augOf(id), g = grade(rec && rec.tier);
    var syn = null;
    draft.picked.forEach(function (p) {
      if (!syn && (d.trios || []).some(function (t) { return t.indexOf(id) >= 0 && t.indexOf(p) >= 0; })) syn = p;
    });
    var synName = syn && augOf(syn).name ? augOf(syn).name : null;
    return '<div class="result-card' + ((rec && rec.tier === 1) ? ' win' : '') + '">' +
      '<div class="rc-no">候选 ' + (idx + 1) + '</div>' +
      '<div class="rc-head">' + ico(a.icon, 'i-aug') +
        '<div class="t"><b>' + esc(a.name || ('#' + id)) + '</b>' +
        '<div><span class="rarity">' + esc(a.rarityName || '') + '</span></div></div>' + badge(g, true) + '</div>' +
      '<p class="rc-desc">' + esc(a.desc || '暂无描述') + '</p>' +
      '<p class="rc-why">' + esc(reason(rec, a, synName)) + '</p>' +
      '<div class="rc-foot"><span>该英雄选取 ' + pct(rec && rec.pick) + '</span><span>' + games(rec && rec.games) +
        '</span><span>适配 ' + esc(g.t) + '</span></div></div>';
  }
  function draftHtml() {
    var c = BY_ID[draft.champ] || {};
    var h = '<div class="steps">' +
      '<div class="step on"><b>1 · 英雄</b>当前使用谁</div>' +
      '<div class="step on"><b>2 · 已拿符文</b>影响协同</div>' +
      '<div class="step on"><b>3 · 三张卡</b>给出参考</div></div>';
    h += '<div class="sec"><h2>当前英雄</h2></div>' +
      '<button class="card tight" style="width:100%;text-align:left;color:var(--text)" data-act="pick-champ">' +
      '<div style="display:flex;align-items:center;gap:10px">' + ico(c.icon, 'i-champ') +
      '<div style="flex:1"><b style="font-size:13px">' + esc(c.name || '选择英雄') + '</b>' +
      '<div class="tiny faint">' + esc(c.title || '') + ' · 点此更换</div></div>' +
      badge(grade(c.tier)) + '</div></button>';
    h += '<div class="sec"><h2>已拿到的符文</h2><span>可留空 · 最多 3 个</span></div>' +
      '<div class="slot-row">' + draft.picked.map(function (id, i) { return slotHtml('picked', i, id); }).join('') + '</div>';
    h += '<div class="sec"><h2>屏幕上的三张候选卡</h2><span>点卡片选择</span></div>' +
      '<div class="slot-row">' + draft.cards.map(function (id, i) { return slotHtml('card', i, id); }).join('') + '</div>';
    h += '<button class="bigbtn" data-act="eval">生成参考</button>';
    h += '<div id="draftResults" style="margin-top:14px">';
    if (draft.results) {
      h += draft.results.join('') +
        '<div class="note">以上只给出分级、选取率与理由，<span class="gold">不替你做决定</span>：' +
        '结合已拿到的符文、双方阵容和这局想打的路线自己选。数据日期 ' + esc(D.meta.dataDate) +
        ' · 快照 ' + esc(D.meta.dataVersion) + ' · 第三方公开样本，不展示胜率。</div>';
    } else {
      h += '<div class="note">已自动预填该英雄适配靠前的三个符文做演示。替换成屏幕上真实出现的三张卡，再点「生成参考」。</div>';
    }
    h += '</div>';
    return h;
  }
  function renderDraft(keepScroll) {
    var sc = $('scroll'), top = sc.scrollTop;
    $('vDraft').innerHTML = draftHtml();
    if (keepScroll && view === 'draft') sc.scrollTop = top;
  }

  /* ---------- 符文图鉴 ---------- */
  function augSorted() {
    return Object.keys(AUG).map(function (k) { return AUG[k]; }).sort(function (a, b) {
      var ia = RARITY.indexOf(a.rarityName || '其他'), ib = RARITY.indexOf(b.rarityName || '其他');
      return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib) ||
             (a.tier || 9) - (b.tier || 9) || (b.pick || 0) - (a.pick || 0);
    });
  }
  function codexListHtml() {
    var q = codexQ.trim().toLowerCase();
    var list = augSorted().filter(function (a) {
      if (codexRarity !== '全部' && (a.rarityName || '其他') !== codexRarity) return false;
      if (!q) return true;
      return ((a.name || '') + ' ' + (a.desc || '')).toLowerCase().indexOf(q) >= 0;
    });
    return list.length ? list.map(function (a) {
      return '<button class="list-row" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);text-align:left;color:var(--text)" ' +
        'data-act="open-aug" data-id="' + a.id + '">' + ico(a.icon, 'i-aug') +
        '<span class="t"><b>' + esc(a.name) + '</b><span class="sub">' + esc(a.desc || '暂无描述') + '</span></span>' +
        '<span style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">' +
        '<span class="rarity">' + esc(a.rarityName) + '</span>' + badge(grade(a.tier)) + '</span></button>';
    }).join('') : '<div class="empty">没有匹配的符文</div>';
  }
  function renderCodex() {
    $('vCodex').innerHTML =
      '<input class="search" id="codexSearch" data-input="codex" type="search" placeholder="搜索符文名称或效果" autocomplete="off">' +
      '<div class="chips">' + ['全部'].concat(RARITY).map(function (r) {
        return '<button class="chip' + (codexRarity === r ? ' active' : '') + '" data-act="codex-rarity" data-r="' + r + '">' + r + '</button>';
      }).join('') + '</div>' +
      '<div class="sec"><h2>强化符文</h2><span id="codexCount"></span></div>' +
      '<div class="card tight" id="codexList"></div>';
    updateCodexList();
  }
  function updateCodexList() {
    var q = codexQ.trim().toLowerCase();
    var n = augSorted().filter(function (a) {
      if (codexRarity !== '全部' && (a.rarityName || '其他') !== codexRarity) return false;
      return !q || ((a.name || '') + ' ' + (a.desc || '')).toLowerCase().indexOf(q) >= 0;
    }).length;
    $('codexList').innerHTML = codexListHtml();
    if ($('codexCount')) $('codexCount').textContent = n + ' 个 · 按稀有度与分级排序';
  }

  function augDetailHtml(id) {
    var a = augOf(id), g = grade(a.tier), heroes = AUG_HEROES[String(id)] || [];
    var h = '<div class="sp-bar"><button class="sp-back" data-act="back">← 返回</button><b>符文详情</b></div><div class="sp-body">';
    h += '<div class="sp-hero">' + ico(a.icon, 'i-aug i-lg') +
      '<div class="t"><h2>' + esc(a.name || ('#' + id)) + '</h2><p>' + esc(a.rarityName || '') + ' · 通用适配 ' + esc(g.t) + '</p></div>' +
      badge(g, true) + '</div>';
    h += '<div class="card"><div class="tiny muted" style="line-height:1.7">' + esc(a.desc || '暂无描述') + '</div>' +
      '<div class="kv" style="margin-top:10px;border:0"><span>通用选取率</span><b>' + pct(a.pick) + '</b></div>' +
      '<div class="kv" style="border:0"><span>当前版本</span><b>' + esc(D.meta.dataVersion) + '</b></div></div>';
    h += '<div class="card"><button class="mini-btn" data-act="try-aug" data-id="' + id + '">⚡ 放到三选一里试算</button></div>';
    h += '<div class="sec"><h2>适配靠前的英雄</h2><span>按该英雄下分级</span></div><div class="card tight">';
    h += heroes.length ? heroes.map(function (x) {
      var c = BY_ID[x.id] || {};
      return '<button class="list-row" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);text-align:left;color:var(--text)" ' +
        'data-act="open-champ" data-id="' + x.id + '">' + ico(c.icon, 'i-champ') +
        '<span class="t"><b>' + esc(c.name || ('#' + x.id)) + '</b><span class="sub">该英雄选取 ' + pct(x.pick) + '</span></span>' +
        badge(grade(x.tier)) + '</button>';
    }).join('') : '<div class="empty">暂无英雄级样本</div>';
    h += '</div><p class="note">分级与选取率来自第三方公开只读快照，非 Riot 官方；本页不展示胜率。</p></div>';
    return h;
  }

  /* ---------- 我的 / 数据 ---------- */
  function renderMe() {
    $('vMe').innerHTML =
      '<div class="card"><div class="sec" style="margin:0 0 6px"><h2>当前数据</h2></div>' +
        '<div class="kv"><span>游戏版本</span><b>' + esc(D.meta.patch) + '</b></div>' +
        '<div class="kv"><span>快照版本</span><b>' + esc(D.meta.dataVersion) + '</b></div>' +
        '<div class="kv"><span>数据日期</span><b>' + esc(D.meta.dataDate) + '</b></div>' +
        '<div class="kv"><span>上游生成</span><b>' + esc(String(D.meta.generatedAt).slice(0, 10)) + '</b></div>' +
        '<div class="kv"><span>条目</span><b>' + D.meta.championCount + ' / ' + D.meta.augmentCount + ' / ' + D.meta.itemCount + '</b></div>' +
      '</div>' +
      '<div class="card"><div class="sec" style="margin:0 0 8px"><h2>线上版本检查</h2></div>' +
        '<div class="tiny faint" style="margin-bottom:10px">直连上游 config 比对 dataVersion；接口允许浏览器跨域访问，失败时页面仍可离线使用。</div>' +
        '<button class="mini-btn" data-act="check-live">检查线上最新版本 →</button>' +
        '<div id="meStatus" class="status-line">尚未请求 · 当前使用本地冻结快照</div></div>' +
      '<div class="sec"><h2>数据来源</h2></div>' +
      '<div class="card"><div class="tiny muted" style="line-height:1.8">' +
        '<b class="accent">统计</b>：国服第三方公开只读快照（aramgg client api），底层是腾讯服真实对局样本，由第三方自行采集清洗。<br>' +
        '<b class="accent">静态资产</b>：Riot Data Dragon（英雄 / 装备 / 召唤师技能名称与图标）。<br>' +
        '<b class="accent">中文文案</b>：aramgg 公开的符文元数据。' +
      '</div></div>' +
      '<div class="sec"><h2>展示口径与合规</h2></div>' +
      '<div class="card"><div class="tiny muted" style="line-height:1.8">' +
        '仅展示适配分级、选取率、样本量与文字理由，<b class="gold">不展示胜率</b>；' +
        '每个数字绑定版本与数据日期，跨版本不混算；三选一给出多个选项与理由，不替玩家做决定。' +
      '</div><p class="note">海斗助手 isn\'t endorsed by Riot Games and doesn\'t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties.</p></div>' +
      '<p class="note" style="text-align:center;margin-top:16px">原型演示 · 数据来自第三方公开样本，非 Riot 官方产品</p>';
  }
  function checkLive() {
    var box = $('meStatus');
    box.className = 'status-line';
    box.textContent = '正在请求线上 config …';
    var t0 = Date.now();
    fetch('https://data.dtodo.cn/api/client/v1/config', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (c) {
        var same = c.dataVersion === D.meta.dataVersion;
        box.className = 'status-line ' + (same ? 'ok' : 'err');
        box.innerHTML = (same ? '✓ 已是最新：' : '↑ 上游已更新：') +
          '线上 <b>' + esc(c.gamePatch) + ' / ' + esc(c.dataVersion) + '</b>' +
          ' · 生成 ' + esc(String(c.generatedAt).slice(0, 10)) +
          ' · ' + (Date.now() - t0) + ' ms<br>本地 <b>' + esc(D.meta.dataVersion) + '</b>' +
          (same ? ' · 与线上一致' : ' · 请运行同步脚本重建快照');
      })
      .catch(function (e) {
        box.className = 'status-line err';
        box.textContent = '直连失败：' + e.message + '。本地快照仍可完整离线使用。';
      });
  }

  /* ---------- 底部选择器 ---------- */
  function champPickerItems() {
    return CH.map(function (c) {
      return { id: c.id, name: c.name, sub: c.title + ' · ' + (c.roles || []).map(roleName).join('/'),
               icon: c.icon, cls: 'i-champ', badge: badge(grade(c.tier)) };
    });
  }
  function augPickerItems() {
    return augSorted().map(function (a) {
      return { id: a.id, name: a.name, sub: a.rarityName + ' · 通用 ' + grade(a.tier).t,
               icon: a.icon, cls: 'i-aug', badge: badge(grade(a.tier)) };
    });
  }
  function openPicker(opts) {
    picker = opts;
    $('sheetTitle').textContent = opts.title;
    $('sheetSearch').value = '';
    $('sheetWrap').hidden = false;
    renderSheetList('');
  }
  function closeSheet() { $('sheetWrap').hidden = true; picker = null; }
  function renderSheetList(q) {
    if (!picker) return;
    var s = q.trim().toLowerCase();
    var list = picker.items.filter(function (x) {
      return !s || (x.name + ' ' + x.sub).toLowerCase().indexOf(s) >= 0;
    });
    $('sheetList').innerHTML = list.length ? list.map(function (x) {
      return '<button class="sheet-item" data-pick="' + x.id + '" style="width:100%;background:none;border:0;text-align:left">' +
        ico(x.icon, x.cls) + '<span class="t"><b>' + esc(x.name) + '</b><span>' + esc(x.sub) + '</span></span>' +
        x.badge + '</button>';
    }).join('') : '<div class="empty">没有匹配项</div>';
  }

  /* ---------- 子页 / 视图切换 ---------- */
  function openSub(html) { $('subpage').innerHTML = html; $('subpage').hidden = false; }
  function closeSub() { $('subpage').hidden = true; $('subpage').innerHTML = ''; }
  function setAppbar(v) {
    $('abTitle').textContent = APPBAR[v][0];
    $('abSub').textContent = APPBAR[v][1];
    $('abBadge').textContent = v === 'home' ? 'PROTOTYPE' : D.meta.dataVersion;
  }
  function go(v) {
    if (!APPBAR[v]) return;
    view = v;
    document.querySelectorAll('.view').forEach(function (s) { s.hidden = s.dataset.view !== v; });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.go === v); });
    setAppbar(v);
    closeSub();
    $('scroll').scrollTop = 0;
  }

  /* ---------- 事件 ---------- */
  $('tabbar').addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) go(b.dataset.go);
  });

  $('scroll').addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.input === 'champ') { champQ = el.value; updateChampGrid(); }
    if (el.dataset.input === 'codex') { codexQ = el.value; updateCodexList(); }
  });

  $('scroll').addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.dataset.act, id = Number(t.dataset.id), i = Number(t.dataset.i);
    switch (act) {
      case 'go-draft': go('draft'); break;
      case 'go-view': go(t.dataset.v); break;
      case 'open-champ': openSub(champDetailHtml(id)); break;
      case 'open-aug': openSub(augDetailHtml(id)); break;
      case 'role':
        champRole = t.dataset.r;
        $('vChamps').querySelectorAll('.chip').forEach(function (c) {
          c.classList.toggle('active', c.dataset.r === champRole);
        });
        updateChampGrid();
        break;
      case 'codex-rarity':
        codexRarity = t.dataset.r;
        $('vCodex').querySelectorAll('.chip').forEach(function (c) {
          c.classList.toggle('active', c.dataset.r === codexRarity);
        });
        updateCodexList();
        break;
      case 'pick-champ':
        openPicker({ title: '选择当前英雄', items: champPickerItems(), onPick: function (v) {
          if (v !== draft.champ) { draft.champ = v; autoFill(); renderDraft(false); }
          toast('已切换英雄并重新预填候选卡');
        }});
        break;
      case 'pick-picked':
        openPicker({ title: '已拿到的符文 · 第 ' + (i + 1) + ' 个', items: augPickerItems(), onPick: function (v) {
          draft.picked[i] = v; draft.results = null; renderDraft(true);
        }});
        break;
      case 'pick-card':
        openPicker({ title: '候选卡 ' + (i + 1), items: augPickerItems(), onPick: function (v) {
          draft.cards[i] = v; draft.results = null; renderDraft(true);
        }});
        break;
      case 'clear-picked':
        draft.picked[i] = 0; draft.results = null; renderDraft(true);
        break;
      case 'eval':
        if (draft.cards.some(function (x) { return !x; })) { toast('请把三张候选卡都选上'); return; }
        draft.results = draft.cards.map(function (x, k) { return scoreCard(x, k); });
        renderDraft(true);
        setTimeout(function () {
          var el = $('draftResults');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
        break;
      case 'check-live': checkLive(); break;
    }
  });

  $('subpage').addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.dataset.act, id = Number(t.dataset.id);
    if (act === 'back') { closeSub(); return; }
    if (act === 'open-champ') { openSub(champDetailHtml(id)); return; }
    if (act === 'open-aug') { openSub(augDetailHtml(id)); return; }
    if (act === 'draft-from-champ') {
      if (id !== draft.champ) { draft.champ = id; autoFill(); renderDraft(false); }
      go('draft'); toast('已带入该英雄');
      return;
    }
    if (act === 'try-aug') {
      draft.cards[0] = id; draft.results = null; renderDraft(false);
      go('draft'); toast('已放入候选卡 1');
    }
  });

  $('sheetWrap').addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { closeSheet(); return; }
    var it = e.target.closest('[data-pick]');
    if (it && picker) {
      var fn = picker.onPick;
      closeSheet();
      fn(Number(it.dataset.pick));
    }
  });
  $('sheetSearch').addEventListener('input', function (e) { renderSheetList(e.target.value); });

  /* ---------- 初始化 ---------- */
  renderHome();
  renderChamps();
  renderCodex();
  renderMe();
  autoFill();
  renderDraft(false);
  setAppbar('home');
})();
