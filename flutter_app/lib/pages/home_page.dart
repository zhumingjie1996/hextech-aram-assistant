import 'package:flutter/material.dart';

import '../models.dart';
import '../ui.dart';
import 'champion_detail_page.dart';

class HomePage extends StatelessWidget {
  final HexData data;
  final void Function(int) onGo;
  const HomePage({super.key, required this.data, required this.onGo});

  @override
  Widget build(BuildContext context) {
    final top = data.sorted.take(8).toList();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _heroCard(),
        const SizedBox(height: 12),
        _cta(context),
        const SectionTitle('本版本强势英雄', trailing: '横向滑动 · 按分级排序'),
        SizedBox(
          height: 122,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: top.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) => _champTile(context, top[i]),
          ),
        ),
        const SectionTitle('快捷入口'),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 2.1,
          children: [
            _quick(Icons.person_search_outlined, '英雄查询', '出装 / 技能 / 符文', 1),
            _quick(Icons.auto_awesome, '符文图鉴', '${data.meta.augmentCount} 个强化符文', 3),
            _quick(Icons.style_outlined, '三选一助手', '决策那一刻用', 2),
            _quick(Icons.info_outline, '版本与数据', '来源与口径说明', 4),
          ],
        ),
        const SizedBox(height: 16),
        const CardBox(
          child: NoteText(
            '所有数字都绑定版本与数据日期，跨版本不混算。统计来自国服第三方公开只读样本，'
            '非 Riot 官方；仅展示分级、选取率、样本量与理由，不展示胜率。',
          ),
        ),
      ],
    );
  }

  Widget _heroCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF2A5C58)),
        gradient: const LinearGradient(
          colors: [Color(0xFF123A3D), Color(0xFF15293C), Color(0xFF1B2036)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.brightness_1, size: 8, color: Palette.accent),
            SizedBox(width: 6),
            Text('当前版本快照 · 已同步', style: TextStyle(fontSize: 11, color: Color(0xFF9FDED7))),
          ]),
          const SizedBox(height: 4),
          Text(data.meta.patch,
              style: const TextStyle(fontSize: 27, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
          Text('dataVersion ${data.meta.dataVersion} · 数据日期 ${data.meta.dataDate}',
              style: const TextStyle(fontSize: 11.5, color: Palette.muted)),
          const SizedBox(height: 12),
          Row(
            children: [
              _stat('${data.meta.championCount}', '英雄'),
              _stat('${data.meta.augmentCount}', '强化符文'),
              _stat('${data.meta.itemCount}', '装备'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _stat(String value, String label) => Padding(
        padding: const EdgeInsets.only(right: 26),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          Text(label, style: const TextStyle(fontSize: 11, color: Palette.muted)),
        ]),
      );

  Widget _cta(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => onGo(2),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            gradient: const LinearGradient(colors: [Palette.accent, Color(0xFF57B6D8)]),
          ),
          child: Row(children: [
            const Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('开局三选一', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Palette.bg)),
                Text('选英雄 + 已拿符文 + 三张卡，看分级与理由',
                    style: TextStyle(fontSize: 10.5, color: Color(0xFF0B1119))),
              ]),
            ),
            const Icon(Icons.arrow_forward, color: Palette.bg),
          ]),
        ),
      ),
    );
  }

  Widget _champTile(BuildContext context, Champion c) {
    return SizedBox(
      width: 104,
      child: InkWell(
        borderRadius: BorderRadius.circular(13),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => ChampionDetailPage(data: data, champion: c),
        )),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Palette.surface,
            border: Border.all(color: Palette.line),
            borderRadius: BorderRadius.circular(13),
          ),
          child: Column(children: [
            NetIcon(c.icon, size: 46, circle: true),
            const SizedBox(height: 5),
            Text(c.name, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
            Text(c.title, style: const TextStyle(fontSize: 10, color: Palette.faint),
                maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 6),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              GradeBadge(c.tier),
              const SizedBox(width: 5),
              Text(pct(c.pick), style: const TextStyle(fontSize: 10.5, color: Palette.muted)),
            ]),
          ]),
        ),
      ),
    );
  }

  Widget _quick(IconData icon, String title, String sub, int target) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => onGo(target),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Palette.surface,
          border: Border.all(color: Palette.line),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(children: [
          Icon(icon, size: 20, color: Palette.accent),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
            Text(sub, style: const TextStyle(fontSize: 10, color: Palette.faint)),
          ])),
        ]),
      ),
    );
  }
}
