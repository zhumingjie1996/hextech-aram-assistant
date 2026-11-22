import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';
import 'package:hextech_app/models.dart';
import 'package:hextech_app/ui.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('真实数据资产可解析，口径字段合规', () async {
    final data = await HexData.load();
    expect(data.meta.dataVersion, '16.23.1');
    expect(data.meta.patch, '16.23');
    expect(data.champions.length, 173);
    expect(data.augments.length, 234);
    expect(data.items.length, 305);
    expect(data.sorted.isNotEmpty, isTrue);
    expect(data.detail(data.sorted.first.id), isNotNull);

    final raw = await rootBundle.loadString('assets/data/hex_data.json');
    expect(raw.contains('winRate'), isFalse);
    expect(raw.contains('adjustedWinRate'), isFalse);
  });

  test('三选一草稿自动预填与英雄详情一致', () async {
    final data = await HexData.load();
    final st = DraftState.instance;
    st.ensure(data);
    final expected = data.sorted.first;
    expect(st.championId, expected.id);
    expect(st.cards.where((x) => x != 0).length, 3);
    final recs = data.detail(expected.id)!.augments;
    for (var i = 0; i < 3; i++) {
      expect(st.cards[i], recs[i].id);
    }
    st.setPicked(0, recs.first.id);
    expect(st.picked[0], recs.first.id);
    st.clearPicked(0);
    expect(st.picked[0], 0);
  });

  test('推荐理由按分级与样本量生成', () async {
    final data = await HexData.load();
    final rec = data.detail(data.sorted.first.id)!.augments.first;
    final text = reasonFor(rec, data.augment(rec.id), null);
    expect(text.isNotEmpty, isTrue);
    expect(pct(rec.pick).endsWith('%'), isTrue);
    expect(gradeLabel(rec.tier), isNotEmpty);
  });
}
