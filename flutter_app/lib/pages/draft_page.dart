import 'package:flutter/material.dart';

import '../models.dart';
import '../ui.dart';

class _Result {
  final Augment aug;
  final AugRec? rec;
  final String reason;
  final String? synergy;
  _Result(this.aug, this.rec, this.reason, this.synergy);
}

class _PickItem {
  final int id;
  final String name;
  final String sub;
  final String icon;
  final int? tier;
  final bool circle;
  _PickItem(this.id, this.name, this.sub, this.icon, this.tier, {this.circle = false});
}

class DraftPage extends StatefulWidget {
  final HexData data;
  const DraftPage({super.key, required this.data});

  @override
  State<DraftPage> createState() => _DraftPageState();
}

class _DraftPageState extends State<DraftPage> {
  List<_Result>? _results;

  @override
  void initState() {
    super.initState();
    DraftState.instance.ensure(widget.data);
  }

  List<_PickItem> get _augItems => widget.data.sortedAugments
      .map((a) => _PickItem(a.id, a.name, '${a.rarityName} · 通用 ${gradeName(a.tier)}', a.icon, a.tier))
      .toList();

  List<_PickItem> get _champItems => widget.data.sorted
      .map((c) => _PickItem(c.id, c.name, '${c.title} · ${c.roles.map(roleName).join('/')}', c.icon, c.tier, circle: true))
      .toList();

  Future<int?> _openPicker(BuildContext context, String title, List<_PickItem> items) {
    return showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (_) => _PickerSheet(title: title, items: items),
    );
  }

  void _evaluate() {
    final st = DraftState.instance;
    if (st.cards.any((x) => x == 0)) {
      showToast(context, '请把三张候选卡都选上');
      return;
    }
    final recs = widget.data.detail(st.championId)?.augments ?? <AugRec>[];
    final out = <_Result>[];
    for (final id in st.cards) {
      final a = widget.data.augment(id);
      if (a == null) continue;
      AugRec? rec;
      for (final r in recs) {
        if (r.id == id) { rec = r; break; }
      }
      final syn = synergyFor(widget.data, st.championId, id, st.picked);
      out.add(_Result(a, rec, reasonFor(rec, a, syn), syn));
    }
    setState(() => _results = out);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: DraftState.instance,
      builder: (context, _) {
        final st = DraftState.instance;
        final champ = widget.data.champion(st.championId);
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
          children: [
            Row(children: [
              _step('1 · 英雄', true), const SizedBox(width: 6),
              _step('2 · 已拿符文', true), const SizedBox(width: 6),
              _step('3 · 三张卡', true),
            ]),
            const SectionTitle('当前英雄'),
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () async {
                final id = await _openPicker(context, '选择当前英雄', _champItems);
                if (id != null && id != st.championId) {
                  st.setChampion(id, widget.data);
                  _results = null;
                }
              },
              child: CardBox(child: Row(children: [
                NetIcon(champ?.icon ?? '', size: 46, circle: true),
                const SizedBox(width: 11),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(champ?.name ?? '选择英雄', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  Text('${champ?.title ?? ''} · 点此更换', style: const TextStyle(fontSize: 10.5, color: Palette.faint)),
                ])),
                GradeBadge(champ?.tier),
              ])),
            ),
            const SectionTitle('已拿到的符文', trailing: '可留空 · 最多 3 个'),
            Row(children: [
              for (var i = 0; i < 3; i++)
                Expanded(child: Padding(padding: EdgeInsets.only(right: i == 2 ? 0 : 8),
                    child: _slot(context, st, i, st.picked[i], picked: true))),
            ]),
            const SectionTitle('屏幕上的三张候选卡', trailing: '点卡片选择'),
            Row(children: [
              for (var i = 0; i < 3; i++)
                Expanded(child: Padding(padding: EdgeInsets.only(right: i == 2 ? 0 : 8),
                    child: _slot(context, st, i, st.cards[i], picked: false))),
            ]),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _evaluate,
                style: FilledButton.styleFrom(backgroundColor: Palette.accent, foregroundColor: Palette.bg),
                child: const Text('生成参考', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 14),
            if (_results == null)
              const NoteText('已自动预填该英雄适配靠前的三个符文做演示。替换成屏幕上真实出现的三张卡，再点「生成参考」。')
            else ...[
              for (var i = 0; i < _results!.length; i++) _resultCard(_results![i], i),
              const NoteText('以上只给出分级、选取率与理由，不替你做决定：结合已拿到的符文、双方阵容和这局想打的路线自己选。'
                  '数据日期与版本见页首 · 第三方公开样本，不展示胜率。'),
            ],
          ],
        );
      },
    );
  }

  Widget _step(String label, bool on) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 8),
          decoration: BoxDecoration(
            color: on ? Palette.accentDim : Palette.surface,
            border: Border.all(color: on ? Palette.accent : Palette.line),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(label, style: TextStyle(fontSize: 10, color: on ? Palette.accent : Palette.faint)),
        ),
      );

  Widget _slot(BuildContext context, DraftState st, int index, int id, {required bool picked}) {
    final a = widget.data.augment(id);
    return Stack(children: [
      InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          final v = await _openPicker(context, picked ? '已拿到的符文 · 第 ${index + 1} 个' : '候选卡 ${index + 1}', _augItems);
          if (v == null) return;
          if (picked) {
            st.setPicked(index, v);
          } else {
            st.setCard(index, v);
          }
          _results = null;
        },
        child: Container(
          height: 96,
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: id == 0 ? Palette.surface2 : Palette.surface,
            border: Border.all(color: id == 0 ? Palette.line : Palette.accent.withValues(alpha: 0.5)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: id == 0
              ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.add, size: 22, color: Palette.faint),
                  const SizedBox(height: 4),
                  Text(picked ? '已拿符文' : '候选卡 ${index + 1}',
                      style: const TextStyle(fontSize: 10, color: Palette.faint)),
                ])
              : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  NetIcon(a?.icon ?? '', size: 34, radius: 8),
                  const SizedBox(height: 4),
                  Text(a?.name ?? '#$id', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                      textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
                ]),
        ),
      ),
      if (picked && id != 0)
        Positioned(
          top: 2, right: 2,
          child: IconButton(
            icon: const Icon(Icons.close, size: 14),
            color: Palette.danger,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () { st.clearPicked(index); _results = null; },
          ),
        ),
    ]);
  }

  Widget _resultCard(_Result r, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Palette.surface,
        border: Border.all(color: r.rec?.tier == 1 ? Palette.accent : Palette.line),
        borderRadius: BorderRadius.circular(15),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('候选 ${index + 1}', style: const TextStyle(fontSize: 10, color: Palette.faint)),
        const SizedBox(height: 7),
        Row(children: [
          NetIcon(r.aug.icon, size: 42, radius: 10),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(r.aug.name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Text(r.aug.rarityName, style: const TextStyle(fontSize: 10, color: Palette.muted)),
          ])),
          GradeBadge(r.rec?.tier, large: true),
        ]),
        const SizedBox(height: 9),
        Text(r.aug.desc, style: const TextStyle(fontSize: 11, color: Palette.muted, height: 1.5)),
        const SizedBox(height: 7),
        Text(r.reason, style: const TextStyle(fontSize: 11, color: Palette.accent, height: 1.6)),
        const SizedBox(height: 9),
        Row(children: [
          Text('该英雄选取 ${pct(r.rec?.pick)}', style: const TextStyle(fontSize: 10.5, color: Palette.muted)),
          const SizedBox(width: 10),
          Text(gameText(r.rec?.games), style: const TextStyle(fontSize: 10.5, color: Palette.muted)),
        ]),
      ]),
    );
  }
}

class _PickerSheet extends StatefulWidget {
  final String title;
  final List<_PickItem> items;
  const _PickerSheet({required this.title, required this.items});

  @override
  State<_PickerSheet> createState() => _PickerSheetState();
}

class _PickerSheetState extends State<_PickerSheet> {
  final _search = TextEditingController();
  String _q = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final list = widget.items.where((x) => _q.isEmpty || (x.name + x.sub).toLowerCase().contains(_q)).toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 8),
        Container(width: 38, height: 4, decoration: BoxDecoration(color: Palette.line, borderRadius: BorderRadius.circular(3))),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(children: [
            Text(widget.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const Spacer(),
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('关闭')),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            controller: _search,
            onChanged: (v) => setState(() => _q = v.trim().toLowerCase()),
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              hintText: '搜索名称',
              hintStyle: const TextStyle(fontSize: 12, color: Palette.faint),
              prefixIcon: const Icon(Icons.search, size: 18, color: Palette.faint),
              filled: true,
              fillColor: Palette.surface2,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Palette.line)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Palette.line)),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Flexible(
          child: list.isEmpty
              ? const Padding(padding: EdgeInsets.all(30), child: Text('没有匹配项', style: TextStyle(color: Palette.faint)))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final x = list[i];
                    return InkWell(
                      onTap: () => Navigator.pop(context, x.id),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Palette.line))),
                        child: Row(children: [
                          NetIcon(x.icon, size: 40, circle: x.circle, radius: 10),
                          const SizedBox(width: 10),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(x.name, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                            Text(x.sub, style: const TextStyle(fontSize: 10.5, color: Palette.faint)),
                          ])),
                          GradeBadge(x.tier),
                        ]),
                      ),
                    );
                  },
                ),
        ),
      ]),
    );
  }
}
