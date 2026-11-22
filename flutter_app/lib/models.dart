import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;

/* 数据模型与推荐逻辑。
   数据来源：assets/data/hex_data.json（16.23.1 真实快照，已过滤胜率类字段）。
   合规口径：只保留 tier / pickRate / games 与文字理由，不展示胜率。 */

num? _num(dynamic v) => v is num ? v : null;
int? _int(dynamic v) => v is int ? v : (v is num ? v.toInt() : null);
String _str(dynamic v) => v == null ? '' : v.toString();
List<int> _ids(dynamic v) =>
    (v as List<dynamic>?)?.map((x) => _int(x) ?? 0).where((x) => x != 0).toList() ??
    <int>[];

class Meta {
  final String patch;
  final String dataVersion;
  final String generatedAt;
  final String syncedAt;
  final String dataDate;
  final String source;
  final String notice;
  final int championCount;
  final int augmentCount;
  final int itemCount;

  Meta.fromJson(Map<String, dynamic> j)
      : patch = _str(j['patch']),
        dataVersion = _str(j['dataVersion']),
        generatedAt = _str(j['generatedAt']),
        syncedAt = _str(j['syncedAt']),
        dataDate = _str(j['dataDate']),
        source = _str(j['source']),
        notice = _str(j['notice']),
        championCount = _int(j['championCount']) ?? 0,
        augmentCount = _int(j['augmentCount']) ?? 0,
        itemCount = _int(j['itemCount']) ?? 0;
}

class Champion {
  final int id;
  final String alias;
  final String name;
  final String title;
  final String icon;
  final List<String> roles;
  final int? tier;
  final double? pick;

  Champion.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']) ?? 0,
        alias = _str(j['alias']),
        name = _str(j['name']),
        title = _str(j['title']),
        icon = _str(j['icon']),
        roles = (j['roles'] as List<dynamic>?)?.map(_str).toList() ?? <String>[],
        tier = _int(j['tier']),
        pick = _num(j['pick'])?.toDouble();

  bool matches(String q) {
    if (q.isEmpty) return true;
    final s = q.toLowerCase();
    return '$alias $name $title'.toLowerCase().contains(s);
  }
}

class Augment {
  final int id;
  final String name;
  final String rarityName;
  final String icon;
  final String desc;
  final int? rarity;
  final int? tier;
  final double? pick;
  final bool enabled;

  Augment.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']) ?? 0,
        name = _str(j['name']),
        rarityName = _str(j['rarityName']),
        icon = _str(j['icon']),
        desc = _str(j['desc']),
        rarity = _int(j['rarity']),
        tier = _int(j['tier']),
        pick = _num(j['pick'])?.toDouble(),
        enabled = j['enabled'] == true;
}

class NamedIcon {
  final String name;
  final String icon;
  final num? price;
  NamedIcon.fromJson(Map<String, dynamic> j)
      : name = _str(j['name']),
        icon = _str(j['icon']),
        price = _num(j['price']);
}

class AugRec {
  final int id;
  final int? tier;
  final double? pick;
  final int? games;
  AugRec.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']) ?? 0,
        tier = _int(j['tier']),
        pick = _num(j['pick'])?.toDouble(),
        games = _int(j['games']);
}

class CoreBuild {
  final List<int> ids;
  final double? pick;
  CoreBuild.fromJson(Map<String, dynamic> j)
      : ids = _ids(j['ids']),
        pick = _num(j['pick'])?.toDouble();
}

class SkillOrder {
  final List<String> keys;
  final double? pick;
  SkillOrder.fromJson(Map<String, dynamic> j)
      : keys = (j['keys'] as List<dynamic>?)?.map(_str).toList() ?? <String>[],
        pick = _num(j['pick'])?.toDouble();
}

class SpellSet {
  final List<int> ids;
  final double? pick;
  SpellSet.fromJson(Map<String, dynamic> j)
      : ids = _ids(j['ids']),
        pick = _num(j['pick'])?.toDouble();
}

class Situational {
  final int id;
  final double? pick;
  Situational.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']) ?? 0,
        pick = _num(j['pick'])?.toDouble();
}

class Build {
  final List<List<int>> start;
  final List<CoreBuild> cores;
  final List<SkillOrder> skills;
  final List<SpellSet> spells;
  final List<Situational> situational;

  Build.fromJson(Map<String, dynamic> j)
      : start = (j['start'] as List<dynamic>?)
                ?.map((x) => _ids(x))
                .toList() ??
            <List<int>>[],
        cores = (j['cores'] as List<dynamic>?)
                ?.map((x) => CoreBuild.fromJson(x as Map<String, dynamic>))
                .toList() ??
            <CoreBuild>[],
        skills = (j['skills'] as List<dynamic>?)
                ?.map((x) => SkillOrder.fromJson(x as Map<String, dynamic>))
                .toList() ??
            <SkillOrder>[],
        spells = (j['spells'] as List<dynamic>?)
                ?.map((x) => SpellSet.fromJson(x as Map<String, dynamic>))
                .toList() ??
            <SpellSet>[],
        situational = (j['situational'] as List<dynamic>?)
                ?.map((x) => Situational.fromJson(x as Map<String, dynamic>))
                .toList() ??
            <Situational>[];
}

class ChampionDetail {
  final List<AugRec> augments;
  final Build build;
  final List<List<int>> trios;

  ChampionDetail.fromJson(Map<String, dynamic> j)
      : augments = (j['augments'] as List<dynamic>?)
                ?.map((x) => AugRec.fromJson(x as Map<String, dynamic>))
                .toList() ??
            <AugRec>[],
        build = Build.fromJson((j['build'] as Map<String, dynamic>?) ?? {}),
        trios = (j['trios'] as List<dynamic>?)
                ?.map((x) => _ids(x))
                .toList() ??
            <List<int>>[];
}

class HeroAug {
  final int championId;
  final int tier;
  final double pick;
  HeroAug(this.championId, this.tier, this.pick);
}

class HexData {
  final Meta meta;
  final List<Champion> champions;
  final Map<String, Augment> augments;
  final Map<String, NamedIcon> items;
  final Map<String, NamedIcon> spells;
  final Map<String, ChampionDetail> details;

  late final List<Champion> sorted;
  late final List<Augment> sortedAugments;
  late final Map<int, Champion> championById;
  late final Map<String, List<HeroAug>> augHeroes;

  HexData._({
    required this.meta,
    required this.champions,
    required this.augments,
    required this.items,
    required this.spells,
    required this.details,
  }) {
    sorted = List<Champion>.from(champions)
      ..sort((a, b) {
        final t = (a.tier ?? 9).compareTo(b.tier ?? 9);
        if (t != 0) return t;
        return (b.pick ?? 0).compareTo(a.pick ?? 0);
      });
    sortedAugments = augments.values.toList()
      ..sort((a, b) {
        const order = ['棱彩', '黄金', '白银', '其他'];
        final ia = order.indexOf(a.rarityName);
        final ib = order.indexOf(b.rarityName);
        final c = (ia < 0 ? 9 : ia).compareTo(ib < 0 ? 9 : ib);
        if (c != 0) return c;
        final t = (a.tier ?? 9).compareTo(b.tier ?? 9);
        if (t != 0) return t;
        return (b.pick ?? 0).compareTo(a.pick ?? 0);
      });
    championById = {for (final c in champions) c.id: c};

    final raw = <String, List<HeroAug>>{};
    details.forEach((cid, detail) {
      for (final r in detail.augments) {
        if (r.tier == 1 || r.tier == 2) {
          (raw[r.id.toString()] ??= <HeroAug>[])
              .add(HeroAug(int.tryParse(cid) ?? 0, r.tier ?? 9, r.pick ?? 0));
        }
      }
    });
    augHeroes = raw.map((k, v) {
      v.sort((a, b) {
        final t = a.tier.compareTo(b.tier);
        if (t != 0) return t;
        return b.pick.compareTo(a.pick);
      });
      return MapEntry(k, v.take(6).toList());
    });
  }

  static Future<HexData> load() async {
    final text = await rootBundle.loadString('assets/data/hex_data.json');
    final j = json.decode(text) as Map<String, dynamic>;
    return HexData._(
      meta: Meta.fromJson(j['meta'] as Map<String, dynamic>),
      champions: (j['champions'] as List<dynamic>)
          .map((x) => Champion.fromJson(x as Map<String, dynamic>))
          .toList(),
      augments: (j['augments'] as Map<String, dynamic>).map(
          (k, v) => MapEntry(k, Augment.fromJson(v as Map<String, dynamic>))),
      items: (j['items'] as Map<String, dynamic>).map(
          (k, v) => MapEntry(k, NamedIcon.fromJson(v as Map<String, dynamic>))),
      spells: (j['spells'] as Map<String, dynamic>).map(
          (k, v) => MapEntry(k, NamedIcon.fromJson(v as Map<String, dynamic>))),
      details: (j['details'] as Map<String, dynamic>).map(
          (k, v) => MapEntry(k, ChampionDetail.fromJson(v as Map<String, dynamic>))),
    );
  }

  Champion? champion(int id) => championById[id];
  Augment? augment(int id) => augments[id.toString()];
  NamedIcon? item(int id) => items[id.toString()];
  NamedIcon? spell(int id) => spells[id.toString()];
  ChampionDetail? detail(int id) => details[id.toString()];
}

/* 合规推荐理由：不读取、不展示任何胜率字段。 */
String reasonFor(AugRec? rec, Augment? aug, String? synergyName) {
  if (rec == null) {
    return '该英雄下暂无这个符文的对局样本，只能按通用分级与符文描述参考，不确定性较高。';
  }
  final t = rec.tier;
  final p = rec.pick ?? 0;
  final g = rec.games;
  late String s;
  if (t == 1 || t == 2) {
    s = p >= 0.04
        ? '在该英雄上适配分级靠前、也是高频选择，通常是稳妥的优先项。'
        : '适配分级靠前但选取率不高，可能是被低估的冷门好牌。';
  } else if (t == 4 || t == 5) {
    s = p >= 0.04
        ? '很常见的选择，但在该英雄上适配分级偏后，别只按热度拿。'
        : '该英雄上出现较少、分级也偏后，更适合当备选。';
  } else {
    s = '中规中矩的可选项，结合已拿到的符文和双方阵容来判断。';
  }
  if (g == null) {
    s += ' 样本量未披露，结论不确定性较高。';
  } else if (g < 100) {
    s += ' 样本偏少，仅作线索，别当成定论。';
  }
  if (aug?.rarity == 2) s += ' 棱彩级效果会明显改变这局的打法方向。';
  if (synergyName != null) s += ' 与已选的「$synergyName」有成套组合记录。';
  return s;
}

String? synergyFor(HexData data, int championId, int augId, List<int> picked) {
  final trios = data.detail(championId)?.trios ?? <List<int>>[];
  for (final p in picked) {
    if (p == 0) continue;
    if (trios.any((t) => t.contains(augId) && t.contains(p))) {
      return data.augment(p)?.name;
    }
  }
  return null;
}

/* 跨页面共享的三选一草稿状态。 */
class DraftState extends ChangeNotifier {
  static final DraftState instance = DraftState._();
  DraftState._();

  int championId = 0;
  List<int> picked = <int>[0, 0, 0];
  List<int> cards = <int>[0, 0, 0];
  bool _ready = false;

  void ensure(HexData data) {
    if (_ready) return;
    _ready = true;
    setChampion(data.sorted.isNotEmpty ? data.sorted.first.id : 0, data, notify: false);
  }

  void setChampion(int id, HexData data, {bool notify = true}) {
    championId = id;
    final recs = data.detail(id)?.augments ?? <AugRec>[];
    cards = <int>[0, 0, 0];
    for (var i = 0; i < recs.length && i < 3; i++) {
      cards[i] = recs[i].id;
    }
    picked = <int>[0, 0, 0];
    if (notify) notifyListeners();
  }

  void setPicked(int index, int id) {
    picked[index] = id;
    notifyListeners();
  }

  void clearPicked(int index) {
    picked[index] = 0;
    notifyListeners();
  }

  void setCard(int index, int id) {
    cards[index] = id;
    notifyListeners();
  }
}
