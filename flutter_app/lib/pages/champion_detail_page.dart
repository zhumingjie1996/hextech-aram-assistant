import 'package:flutter/material.dart';

import '../models.dart';
import '../ui.dart';
import 'augment_detail_page.dart';

class ChampionDetailPage extends StatelessWidget {
  final HexData data;
  final Champion champion;
  final void Function(int)? onGoDraft;
  const ChampionDetailPage({super.key, required this.data, required this.champion, this.onGoDraft});

  @override
  Widget build(BuildContext context) {
    final detail = data.detail(champion.id);
    final b = detail?.build;
    final recs = detail?.augments ?? <AugRec>[];
    final roles = champion.roles.map(roleName).join(' / ');

    return Scaffold(
      appBar: AppBar(
        title: Text(champion.name),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.of(context).pop()),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 30),
        children: [
          Row(children: [
            NetIcon(champion.icon, size: 62, circle: true),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(champion.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              Text('$roles · ${champion.title}', style: const TextStyle(fontSize: 11.5, color: Palette.muted)),
            ])),
            GradeBadge(champion.tier, large: true),
          ]),
          const SizedBox(height: 14),
          CardBox(child: Column(children: [
            Row(children: [
              Text('英雄选取率 ${pct(champion.pick)} · 适配 ${gradeName(champion.tier)}',
                  style: const TextStyle(fontSize: 11, color: Palette.faint)),
            ]),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {
                  DraftState.instance.setChampion(champion.id, data);
                  Navigator.of(context).pop();
                  onGoDraft?.call(2);
                },
                icon: const Icon(Icons.bolt, size: 17),
                label: const Text('用这个英雄开始三选一'),
                style: FilledButton.styleFrom(backgroundColor: Palette.accent, foregroundColor: Palette.bg),
              ),
            ),
          ])),
          const SectionTitle('出装参考', trailing: '按选取率'),
          CardBox(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (b == null)
              const Text('暂无出装数据', style: TextStyle(color: Palette.faint, fontSize: 12))
            else ...[
              for (var i = 0; i < b.start.length; i++)
                _line(i == 0 ? '起手装' : '备选', b.start[i].map(_itemChip).toList(), null),
              for (var i = 0; i < b.cores.length; i++)
                _line('核心 ${String.fromCharCode(65 + i)}',
                    b.cores[i].ids.map(_itemChip).toList(), pct(b.cores[i].pick)),
              if (b.skills.isNotEmpty)
                _line('技能加点', [
                  Text(b.skills.first.keys.join(' → '),
                      style: const TextStyle(fontSize: 11.5, color: Palette.accent)),
                ], pct(b.skills.first.pick)),
              if (b.spells.isNotEmpty)
                _line('召唤师技能', b.spells.first.ids.map(_spellChip).toList(), pct(b.spells.first.pick)),
              if (b.situational.isNotEmpty)
                _line('情境装备', b.situational.take(5).map((x) => _itemChip(x.id)).toList(), null),
            ],
          ])),
          SectionTitle('符文参考', trailing: '共 ${recs.length} 个有记录 · 前 8'),
          CardBox(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
            child: recs.isEmpty
                ? const Padding(padding: EdgeInsets.all(20), child: Text('暂无记录', style: TextStyle(color: Palette.faint)))
                : Column(children: [
                    for (final r in recs.take(8)) _augRow(context, r),
                  ]),
          ),
          if ((detail?.trios ?? <List<int>>[]).isNotEmpty) ...[
            SectionTitle('成套组合线索', trailing: '${detail!.trios.length} 组'),
            CardBox(child: Column(children: [
              for (final trio in detail.trios.take(3))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 5),
                  child: Wrap(spacing: 6, children: [
                    for (final id in trio)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Palette.surface2, borderRadius: BorderRadius.circular(8)),
                        child: Text(data.augment(id)?.name ?? '#$id', style: const TextStyle(fontSize: 11)),
                      ),
                  ]),
                ),
            ])),
          ],
          NoteText('分级来自当前版本该英雄的适配分档；只展示选取率、样本量与理由，不展示胜率。'
              '数据日期 ${data.meta.dataDate} · 快照 ${data.meta.dataVersion} · 第三方公开样本，非 Riot 官方。'),
        ],
      ),
    );
  }

  Widget _itemChip(int id) {
    final it = data.item(id);
    return Container(
      margin: const EdgeInsets.only(right: 5, bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(color: Palette.surface2, borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        NetIcon(it?.icon ?? '', size: 23, radius: 5),
        const SizedBox(width: 5),
        Text(it?.name ?? '#$id', style: const TextStyle(fontSize: 11)),
      ]),
    );
  }

  Widget _spellChip(int id) {
    final sp = data.spell(id);
    return Container(
      margin: const EdgeInsets.only(right: 5, bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(color: Palette.surface2, borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        NetIcon(sp?.icon ?? '', size: 23, radius: 5),
        const SizedBox(width: 5),
        Text(sp?.name ?? '#$id', style: const TextStyle(fontSize: 11)),
      ]),
    );
  }

  Widget _line(String label, List<Widget> chips, String? pick) {
    if (chips.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 56, child: Text(label, style: const TextStyle(fontSize: 10.5, color: Palette.muted))),
        Expanded(child: Wrap(children: chips)),
        if (pick != null) Text(pick, style: const TextStyle(fontSize: 10.5, color: Palette.muted)),
      ]),
    );
  }

  Widget _augRow(BuildContext context, AugRec rec) {
    final a = data.augment(rec.id);
    return InkWell(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => AugmentDetailPage(data: data, augmentId: rec.id),
      )),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Palette.line))),
        child: Row(children: [
          NetIcon(a?.icon ?? '', size: 42, radius: 10),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Flexible(child: Text(a?.name ?? '#${rec.id}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600))),
              const SizedBox(width: 6),
              GradeBadge(rec.tier),
            ]),
            const SizedBox(height: 3),
            Text(a?.desc ?? '暂无描述', style: const TextStyle(fontSize: 10.5, color: Palette.muted),
                maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 3),
            Text(reasonFor(rec, a, null), style: const TextStyle(fontSize: 10.5, color: Palette.accent),
                maxLines: 2, overflow: TextOverflow.ellipsis),
          ])),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('选取 ${pct(rec.pick)}', style: const TextStyle(fontSize: 10, color: Palette.muted)),
            Text(gameText(rec.games), style: const TextStyle(fontSize: 10, color: Palette.muted)),
          ]),
        ]),
      ),
    );
  }
}
