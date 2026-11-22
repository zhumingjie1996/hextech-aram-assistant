import 'package:flutter/material.dart';

import '../models.dart';
import '../services/live_check.dart';
import '../ui.dart';

class ProfilePage extends StatefulWidget {
  final HexData data;
  const ProfilePage({super.key, required this.data});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  String _status = '尚未请求 · 当前使用本地冻结快照';
  bool _loading = false;
  bool _ok = false;

  Future<void> _check() async {
    setState(() {
      _loading = true;
      _status = '正在请求线上 config …';
    });
    final sw = Stopwatch()..start();
    try {
      final c = await fetchLiveConfig();
      final same = c.dataVersion == widget.data.meta.dataVersion;
      setState(() {
        _loading = false;
        _ok = same;
        _status = '${same ? '✓ 已是最新' : '↑ 上游已更新'}：线上 ${c.gamePatch} / ${c.dataVersion}\n'
            '上游生成 ${c.generatedAt.substring(0, c.generatedAt.length > 10 ? 10 : c.generatedAt.length)}'
            ' · ${sw.elapsedMilliseconds} ms\n'
            '本地 ${widget.data.meta.dataVersion}${same ? ' · 与线上一致' : ' · 请运行同步脚本重建快照'}';
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _ok = false;
        _status = '直连失败：$e。本地快照仍可完整离线使用。';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final m = widget.data.meta;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
      children: [
        const SectionTitle('当前数据'),
        CardBox(child: Column(children: [
          kv('游戏版本', m.patch),
          kv('快照版本', m.dataVersion),
          kv('数据日期', m.dataDate),
          kv('上游生成', m.generatedAt.length > 10 ? m.generatedAt.substring(0, 10) : m.generatedAt),
          kv('条目', '${m.championCount} 英雄 / ${m.augmentCount} 符文 / ${m.itemCount} 装备'),
        ])),
        const SectionTitle('线上版本检查'),
        CardBox(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('直连上游 config 比对 dataVersion；失败时页面仍可离线使用。',
              style: TextStyle(fontSize: 11, color: Palette.faint)),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _loading ? null : _check,
              icon: _loading
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.cloud_download_outlined, size: 17),
              label: const Text('检查线上最新版本'),
              style: OutlinedButton.styleFrom(foregroundColor: Palette.accent,
                  side: const BorderSide(color: Palette.line)),
            ),
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Palette.surface2,
              border: Border.all(color: _ok ? Palette.accent : Palette.line),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Text(_status, style: TextStyle(fontSize: 11, height: 1.6,
                color: _ok ? Palette.accent : Palette.muted)),
          ),
        ])),
        const SectionTitle('数据来源'),
        const CardBox(
          padding: EdgeInsets.all(14),
          child: Text(
            '统计：国服第三方公开只读快照（aramgg client api），底层是腾讯服真实对局样本，由第三方自行采集清洗。\n'
            '静态资产：Riot Data Dragon（英雄 / 装备 / 召唤师技能名称与图标）。\n'
            '中文文案：aramgg 公开的符文元数据。',
            style: TextStyle(fontSize: 11.5, color: Palette.muted, height: 1.8),
          ),
        ),
        const SectionTitle('展示口径与合规'),
        const CardBox(
          child: Text(
            '仅展示适配分级、选取率、样本量与文字理由，不展示胜率；每个数字绑定版本与数据日期，'
            '跨版本不混算；三选一给出多个选项与理由，不替玩家做决定。',
            style: TextStyle(fontSize: 11.5, color: Palette.muted, height: 1.8),
          ),
        ),
        const NoteText(
          "海斗助手 isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games "
          'or anyone officially involved in producing or managing Riot Games properties. '
          '原型演示 · 数据来自第三方公开样本，非 Riot 官方产品。',
        ),
      ],
    );
  }
}
