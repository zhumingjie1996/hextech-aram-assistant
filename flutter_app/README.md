# 海斗助手 · Flutter 版

ARAM Mayhem（海克斯大乱斗）出装与符文参考 App。基于 Flutter 3.41 / Dart 3.11，零第三方运行时依赖，数据打包在本地资产中，可完全离线运行（图标除外）。

## 快速开始

```bash
cd hextech-app/flutter_app
flutter pub get
flutter run              # 连接设备/模拟器
flutter build web        # 或构建 Web 产物（build/web）
flutter build apk        # 需要本机配置 Android SDK
```

已验证：`flutter analyze` 无错误、`flutter test` 3 项通过、`flutter build web` 成功。

## 功能

- 五个主屏：首页（版本卡 / 开局入口 / 强势英雄）、英雄查询（搜索 + 职业筛选）、三选一助手、符文图鉴、数据与关于
- 英雄详情：起手装 / 核心三件套 / 技能加点 / 召唤师技能 / 情境装备 / 符文 Top8 / 成套组合，可一键带入三选一
- 符文详情：完整描述、通用分级、反查适配靠前的英雄，可放入三选一试算
- 三选一：选英雄 + 已拿符文（最多 3）+ 三张候选卡 → 每张卡的分级、选取率、样本量、理由与组合提示；自动预填该英雄适配靠前的符文
- 「我的」页可直连上游 `config` 比对 dataVersion（移动端/桌面用 `dart:io`，Web 用 `dart:html`，按平台条件导入）

## 数据来源与口径

- 统计快照：`data.dtodo.cn/api/client/v1/`（aramgg client api），国服公开只读数据，底层为腾讯服真实对局样本，由第三方自行采集清洗。**非 Riot 官方数据。**
- 静态资产：Riot Data Dragon（英雄/装备/召唤师技能名称与图标）；中文符文文案来自 aramgg 公开元数据。
- 当前版本 16.23 / 快照 16.23.1 / 数据日期 2026-11-19；173 英雄、234 符文、305 装备。
- **只展示适配分级、选取率、样本量与文字理由，不展示胜率**；每个数字绑定版本与数据日期，跨版本不混算；三选一给出多个选项与理由，不替玩家做决定。
- 上线前需向数据源方取得授权，并向 Riot Developer Portal 确认第三方工具条款；不得暗示官方背书。

## 数据更新

原始快照与网页版共用，按版本冻结：

```bash
cd hextech-app
python scripts/sync.py                    # config → manifest → 全量快照 + sha256 校验
python scripts/build_data.py              # 清洗生成 app/data/data.js（过滤胜率字段）
python flutter_app/scripts/sync_data.py   # 转为 Flutter 资产 assets/data/hex_data.json
```

`sync_data.py` 会复核数据源不含 `winRate / wins / adjustedWinRate`，否则拒绝生成。

## 目录

```
lib/
  main.dart              入口、主题、五页导航壳
  models.dart            数据模型、加载、推荐理由、草稿状态
  ui.dart                颜色/徽章/图标/卡片等通用组件
  services/              线上版本检查（条件导入 io / web / stub）
  pages/                 五个主屏 + 英雄/符文详情 + 三选一
assets/data/hex_data.json  本地快照（由 sync_data.py 生成）
test/widget_test.dart      数据解析、草稿预填、推荐理由测试
scripts/sync_data.py       数据同步脚本
```
