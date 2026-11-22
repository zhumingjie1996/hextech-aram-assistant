import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

const String _cdnIconPrefix = 'https://cdn.dtodo.cn/hextech/';

/// Web 端：把跨域 CDN 图标改写为站点同源的本地路径（由 base href 解析为
/// /hextech-aram-assistant/ic/...），规避 CanvasKit 图片无 CORS 头被拦截的问题。
/// 原生端：保留原始 CDN URL，行为不变。
String resolveIconUrl(String url) {
  if (kIsWeb && url.startsWith(_cdnIconPrefix)) {
    return 'ic/${url.substring(_cdnIconPrefix.length)}';
  }
  return url;
}

class Palette {
  static const bg = Color(0xFF0B1119);
  static const top = Color(0xFF0D1520);
  static const surface = Color(0xFF131C28);
  static const surface2 = Color(0xFF1A2636);
  static const line = Color(0xFF26344A);
  static const text = Color(0xFFE8EEF7);
  static const muted = Color(0xFF8FA2B8);
  static const faint = Color(0xFF6A7A8E);
  static const accent = Color(0xFF4FD1C5);
  static const accentDim = Color(0xFF173A3A);
  static const gold = Color(0xFFD9B26A);
  static const danger = Color(0xFFD97B7B);
  static const s = Color(0xFFE0B45C);
  static const a = Color(0xFF63C78D);
  static const b = Color(0xFF6EA8E8);
  static const c = Color(0xFF9AA8BB);
  static const d = Color(0xFF8C7F92);
  static const u = Color(0xFF6D7B8E);
}

String gradeLabel(int? tier) {
  switch (tier) {
    case 1: return 'S';
    case 2: return 'A';
    case 3: return 'B';
    case 4: return 'C';
    case 5: return 'D';
    default: return '?';
  }
}

String gradeName(int? tier) {
  switch (tier) {
    case 1: return '强势';
    case 2: return '优选';
    case 3: return '可用';
    case 4: return '一般';
    case 5: return '谨慎';
    default: return '样本不足';
  }
}

Color gradeColor(int? tier) {
  switch (tier) {
    case 1: return Palette.s;
    case 2: return Palette.a;
    case 3: return Palette.b;
    case 4: return Palette.c;
    case 5: return Palette.d;
    default: return Palette.u;
  }
}

String pct(double? v) {
  if (v == null) return '—';
  if (v > 0 && v < 0.001) return '<0.1%';
  return '${(v * 100).toStringAsFixed(1)}%';
}

String gameText(int? v) =>
    v == null ? '样本未披露' : '${v.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',')} 场';

String roleName(String r) {
  const map = <String, String>{
    'fighter': '战士', 'mage': '法师', 'marksman': '射手',
    'assassin': '刺客', 'tank': '坦克', 'support': '辅助',
  };
  return map[r] ?? r;
}

class GradeBadge extends StatelessWidget {
  final int? tier;
  final bool large;
  const GradeBadge(this.tier, {super.key, this.large = false});

  @override
  Widget build(BuildContext context) {
    final unknown = tier == null;
    return Container(
      width: large ? 38 : null,
      height: large ? 38 : 21,
      padding: EdgeInsets.symmetric(horizontal: large ? 0 : 6),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: gradeColor(tier),
        borderRadius: BorderRadius.circular(large ? 11 : 6),
      ),
      child: Text(
        gradeLabel(tier),
        style: TextStyle(
          color: unknown ? Palette.text : Palette.bg,
          fontWeight: FontWeight.w800,
          fontSize: large ? 18 : 11,
        ),
      ),
    );
  }
}

class NetIcon extends StatelessWidget {
  final String url;
  final double size;
  final bool circle;
  final double radius;
  const NetIcon(this.url, {super.key, this.size = 44, this.circle = false, this.radius = 11});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(circle ? size / 2 : radius),
      child: SizedBox(
        width: size,
        height: size,
        child: url.isEmpty
            ? Container(color: Palette.surface2)
            : Image.network(
                resolveIconUrl(url),
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  color: Palette.surface2,
                  child: Icon(Icons.image_not_supported_outlined,
                      size: size * 0.4, color: Palette.faint),
                ),
              ),
      ),
    );
  }
}

class CardBox extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? border;
  const CardBox({super.key, required this.child, this.padding = const EdgeInsets.all(14), this.border});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Palette.surface,
        border: Border.all(color: border ?? Palette.line),
        borderRadius: BorderRadius.circular(16),
      ),
      child: child,
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String? trailing;
  const SectionTitle(this.title, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 18, 2, 9),
      child: Row(
        children: [
          Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const Spacer(),
          if (trailing != null)
            Text(trailing!, style: const TextStyle(fontSize: 11, color: Palette.faint)),
        ],
      ),
    );
  }
}

class NoteText extends StatelessWidget {
  final String text;
  const NoteText(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Text(text, style: const TextStyle(fontSize: 11, color: Palette.faint, height: 1.6)),
    );
  }
}

class Pill extends StatelessWidget {
  final String text;
  final bool accent;
  const Pill(this.text, {super.key, this.accent = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: accent ? Palette.accentDim : Palette.surface,
        border: Border.all(color: accent ? Palette.accent : Palette.line),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(text, style: TextStyle(fontSize: 10.5, color: accent ? Palette.accent : Palette.muted)),
    );
  }
}

Widget kv(String label, String value) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 82, child: Text(label, style: const TextStyle(fontSize: 11.5, color: Palette.muted))),
        Expanded(child: Text(value, textAlign: TextAlign.right,
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600))),
      ],
    ),
  );
}

void showToast(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 2),
      backgroundColor: Palette.surface2,
    ));
}
