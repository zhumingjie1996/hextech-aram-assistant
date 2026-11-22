import 'package:flutter/material.dart';

import 'models.dart';
import 'ui.dart';
import 'pages/home_page.dart';
import 'pages/champions_page.dart';
import 'pages/draft_page.dart';
import 'pages/codex_page.dart';
import 'pages/profile_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final data = await HexData.load();
  runApp(HexApp(data: data));
}

class HexApp extends StatelessWidget {
  final HexData data;
  const HexApp({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '海斗助手',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Palette.bg,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Palette.accent,
          brightness: Brightness.dark,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Palette.top,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Palette.text),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Palette.top,
          surfaceTintColor: Colors.transparent,
          indicatorColor: Palette.accentDim,
          labelTextStyle: WidgetStateProperty.all(
            const TextStyle(fontSize: 10.5, color: Palette.muted),
          ),
        ),
        cardTheme: CardThemeData(color: Palette.surface),
      ),
      home: MainShell(data: data),
    );
  }
}

class MainShell extends StatefulWidget {
  final HexData data;
  const MainShell({super.key, required this.data});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;
  late final List<Widget> _pages;

  static const _titles = ['海斗助手', '英雄查询', '三选一助手', '符文图鉴', '数据与关于'];
  static const _subs = [
    'ARAM Mayhem · 出装与符文参考',
    '按版本分级与选取率浏览',
    '英雄 + 已拿符文 + 三张候选卡',
    '按稀有度检索强化符文',
    '版本、来源与使用口径',
  ];

  @override
  void initState() {
    super.initState();
    void go(int i) => setState(() => _index = i);
    _pages = [
      HomePage(data: widget.data, onGo: go),
      ChampionsPage(data: widget.data, onGo: go),
      DraftPage(data: widget.data),
      CodexPage(data: widget.data, onGo: go),
      ProfilePage(data: widget.data),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_titles[_index]),
            Text(_subs[_index],
                style: const TextStyle(fontSize: 10.5, color: Palette.faint, fontWeight: FontWeight.normal)),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Pill(widget.data.meta.dataVersion, accent: true),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: '首页'),
          NavigationDestination(icon: Icon(Icons.person_search_outlined), selectedIcon: Icon(Icons.person_search), label: '英雄'),
          NavigationDestination(icon: Icon(Icons.style_outlined), selectedIcon: Icon(Icons.style), label: '三选一'),
          NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book), label: '图鉴'),
          NavigationDestination(icon: Icon(Icons.info_outline), selectedIcon: Icon(Icons.info), label: '我的'),
        ],
      ),
    );
  }
}
