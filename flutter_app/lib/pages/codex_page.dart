import 'package:flutter/material.dart';

import '../models.dart';
import '../ui.dart';
import 'augment_detail_page.dart';

class CodexPage extends StatefulWidget {
  final HexData data;
  final void Function(int) onGo;
  const CodexPage({super.key, required this.data, required this.onGo});

  @override
  State<CodexPage> createState() => _CodexPageState();
}

class _CodexPageState extends State<CodexPage> {
  final _search = TextEditingController();
  String _q = '';
  String _rarity = '全部';
  static const _rarities = <String>['全部', '棱彩', '黄金', '白银', '其他'];

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<Augment> get filtered => widget.data.sortedAugments.where((a) {
        if (_rarity != '全部' && a.rarityName != _rarity) return false;
        return _q.isEmpty || (a.name + a.desc).toLowerCase().contains(_q);
      }).toList();

  @override
  Widget build(BuildContext context) {
    final list = filtered;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
        child: TextField(
          controller: _search,
          onChanged: (v) => setState(() => _q = v.trim().toLowerCase()),
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: '搜索符文名称或效果',
            hintStyle: const TextStyle(fontSize: 12.5, color: Palette.faint),
            prefixIcon: const Icon(Icons.search, size: 18, color: Palette.faint),
            filled: true,
            fillColor: Palette.surface2,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Palette.line)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Palette.line)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Palette.accent)),
          ),
        ),
      ),
      SizedBox(
        height: 42,
        child: ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          scrollDirection: Axis.horizontal,
          itemCount: _rarities.length,
          separatorBuilder: (_, _) => const SizedBox(width: 6),
          itemBuilder: (context, i) {
            final r = _rarities[i];
            final active = _rarity == r;
            return ChoiceChip(
              label: Text(r),
              selected: active,
              onSelected: (_) => setState(() => _rarity = r),
              backgroundColor: Palette.surface,
              selectedColor: Palette.accentDim,
              side: BorderSide(color: active ? Palette.accent : Palette.line),
              labelStyle: TextStyle(fontSize: 11.5, color: active ? Palette.accent : Palette.muted),
              showCheckmark: false,
              visualDensity: VisualDensity.compact,
            );
          },
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(18, 6, 18, 4),
        child: Text('${list.length} 个 · 按稀有度与分级排序', style: const TextStyle(fontSize: 11, color: Palette.faint)),
      ),
      Expanded(
        child: list.isEmpty
            ? const Center(child: Text('没有匹配的符文', style: TextStyle(color: Palette.faint, fontSize: 12)))
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: 1),
                itemBuilder: (context, i) => _row(context, list[i]),
              ),
      ),
    ]);
  }

  Widget _row(BuildContext context, Augment a) {
    return InkWell(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => AugmentDetailPage(data: widget.data, augmentId: a.id, onGoDraft: widget.onGo),
      )),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: const BoxDecoration(
          color: Palette.surface,
          border: Border(bottom: BorderSide(color: Palette.line)),
        ),
        child: Row(children: [
          NetIcon(a.icon, size: 42, radius: 10),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(a.name, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(a.desc, style: const TextStyle(fontSize: 10.5, color: Palette.muted),
                maxLines: 2, overflow: TextOverflow.ellipsis),
          ])),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(color: Palette.surface2, borderRadius: BorderRadius.circular(5)),
              child: Text(a.rarityName, style: const TextStyle(fontSize: 10, color: Palette.muted)),
            ),
            const SizedBox(height: 4),
            GradeBadge(a.tier),
          ]),
        ]),
      ),
    );
  }
}
