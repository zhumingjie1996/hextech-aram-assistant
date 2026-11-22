import 'package:flutter/material.dart';

import '../models.dart';
import '../ui.dart';
import 'champion_detail_page.dart';

class ChampionsPage extends StatefulWidget {
  final HexData data;
  final void Function(int) onGo;
  const ChampionsPage({super.key, required this.data, required this.onGo});

  @override
  State<ChampionsPage> createState() => _ChampionsPageState();
}

class _ChampionsPageState extends State<ChampionsPage> {
  final _search = TextEditingController();
  String _role = 'all';
  String _q = '';

  static const _roles = <String>['fighter', 'mage', 'marksman', 'assassin', 'tank', 'support'];

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<Champion> get filtered => widget.data.sorted.where((c) {
        if (_role != 'all' && !c.roles.contains(_role)) return false;
        return c.matches(_q);
      }).toList();

  @override
  Widget build(BuildContext context) {
    final list = filtered;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
        child: TextField(
          controller: _search,
          onChanged: (v) => setState(() => _q = v.trim()),
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: '搜索英雄：中文名 / 称号 / 英文名',
            hintStyle: const TextStyle(fontSize: 12.5, color: Palette.faint),
            prefixIcon: const Icon(Icons.search, size: 18, color: Palette.faint),
            filled: true,
            fillColor: Palette.surface2,
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
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
          itemCount: _roles.length + 1,
          separatorBuilder: (_, _) => const SizedBox(width: 6),
          itemBuilder: (context, i) {
            final r = i == 0 ? 'all' : _roles[i - 1];
            final active = _role == r;
            return ChoiceChip(
              label: Text(r == 'all' ? '全部' : roleName(r)),
              selected: active,
              onSelected: (_) => setState(() => _role = r),
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
        child: Row(children: [
          Text('${list.length} 位 · 按分级排序', style: const TextStyle(fontSize: 11, color: Palette.faint)),
        ]),
      ),
      Expanded(
        child: list.isEmpty
            ? const Center(child: Text('没有匹配的英雄', style: TextStyle(color: Palette.faint, fontSize: 12)))
            : GridView.builder(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.42,
                ),
                itemCount: list.length,
                itemBuilder: (context, i) => _card(context, list[i]),
              ),
      ),
    ]);
  }

  Widget _card(BuildContext context, Champion c) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ChampionDetailPage(data: widget.data, champion: c, onGoDraft: widget.onGo),
      )),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Palette.surface,
          border: Border.all(color: Palette.line),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(children: [
          NetIcon(c.icon, size: 46, circle: true),
          const SizedBox(height: 4),
          Text(c.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          Text(c.title, style: const TextStyle(fontSize: 10, color: Palette.faint),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 5),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            GradeBadge(c.tier),
            const SizedBox(width: 6),
            Text(pct(c.pick), style: const TextStyle(fontSize: 10.5, color: Palette.muted)),
          ]),
        ]),
      ),
    );
  }
}
