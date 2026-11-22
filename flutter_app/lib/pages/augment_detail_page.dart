import 'package:flutter/material.dart';

import '../models.dart';
import '../ui.dart';
import 'champion_detail_page.dart';

class AugmentDetailPage extends StatelessWidget {
  final HexData data;
  final int augmentId;
  final void Function(int)? onGoDraft;
  const AugmentDetailPage({super.key, required this.data, required this.augmentId, this.onGoDraft});

  @override
  Widget build(BuildContext context) {
    final a = data.augment(augmentId);
    final heroes = data.augHeroes[augmentId.toString()] ?? <HeroAug>[];
    if (a == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('符文详情')),
        body: const Center(child: Text('暂无数据', style: TextStyle(color: Palette.faint))),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('符文详情'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.of(context).pop()),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 30),
        children: [
          Row(children: [
            NetIcon(a.icon, size: 62, radius: 15),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(a.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              Text('${a.rarityName} · 通用适配 ${gradeName(a.tier)}',
                  style: const TextStyle(fontSize: 11.5, color: Palette.muted)),
            ])),
            GradeBadge(a.tier, large: true),
          ]),
          const SizedBox(height: 14),
          CardBox(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(a.desc.isEmpty ? '暂无描述' : a.desc,
                style: const TextStyle(fontSize: 12, color: Palette.muted, height: 1.7)),
            const SizedBox(height: 10),
            kv('通用选取率', pct(a.pick)),
            kv('当前版本', data.meta.dataVersion),
          ])),
          const SizedBox(height: 4),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () {
                DraftState.instance.setCard(0, augmentId);
                Navigator.of(context).pop();
                onGoDraft?.call(2);
              },
              icon: const Icon(Icons.bolt, size: 17),
              label: const Text('放到三选一里试算'),
              style: FilledButton.styleFrom(backgroundColor: Palette.accent, foregroundColor: Palette.bg),
            ),
          ),
          const SectionTitle('适配靠前的英雄', trailing: '按该英雄下分级'),
          CardBox(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
            child: heroes.isEmpty
                ? const Padding(padding: EdgeInsets.all(20), child: Text('暂无英雄级样本', style: TextStyle(color: Palette.faint)))
                : Column(children: [
                    for (final h in heroes) _heroRow(context, h),
                  ]),
          ),
          const NoteText('分级与选取率来自第三方公开只读快照，非 Riot 官方；本页不展示胜率。'),
        ],
      ),
    );
  }

  Widget _heroRow(BuildContext context, HeroAug h) {
    final c = data.champion(h.championId);
    return InkWell(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ChampionDetailPage(data: data, champion: c ?? Champion.fromJson({'id': h.championId, 'name': '#${h.championId}'})),
      )),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Palette.line))),
        child: Row(children: [
          NetIcon(c?.icon ?? '', size: 38, circle: true),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(c?.name ?? '#${h.championId}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
            Text('该英雄选取 ${pct(h.pick)}', style: const TextStyle(fontSize: 10.5, color: Palette.muted)),
          ])),
          GradeBadge(h.tier),
        ]),
      ),
    );
  }
}
