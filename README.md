# 海斗助手 · Hextech ARAM Assistant

英雄联盟「海克斯大乱斗（ARAM: Mayhem）」的出装与符文参考工具。包含 Flutter App、移动端高保真原型、以及纯静态网页 Demo，三者共用同一份按版本冻结的真实数据快照。

当前数据版本：**16.23.1**（上游生成 2026-11-20，数据日期 2026-11-19，173 英雄 / 234 符文 / 305 装备）。

> 本项目为个人学习与演示用途，**非 Riot Games 官方产品，也未获得 Riot 官方背书**。

## 目录结构

| 路径 | 说明 |
|---|---|
| `flutter_app/` | **Flutter 主工程**（Android / iOS / Web，零第三方运行时依赖）。数据打包在 `assets/data/hex_data.json`，可完全离线运行（图标需联网） |
| `app/` | 纯静态网页 Demo（英雄查询 + 三选一助手 + 在线数据直连探测），双击 `index.html` 即可打开 |
| `app/prototype/` | 移动端 App 高保真可点击原型（手机外框、5 个主屏、详情页、底部选择器） |
| `app/data/data.js` | 网页端共用的清洗后数据（由 `scripts/build_data.py` 生成） |
| `scripts/sync.py` | 探测上游 `dataVersion`，按 manifest 增量同步原始快照并校验 `hash` |
| `scripts/build_data.py` | 清洗快照生成网页端 `data.js`，过滤胜率类字段 |
| `flutter_app/scripts/sync_data.py` | 从网页端数据转换为 Flutter 资产，并复核合规字段 |

原始快照目录 `data/` 与探测产物 `_probe/`、`_raw/` 不入库，可随时用同步脚本重新生成。

## 快速开始

### Flutter App

```bash
cd flutter_app
flutter pub get
flutter run              # 连接设备或模拟器
flutter build web        # Web 产物
flutter build apk        # 需要本机配置 Android SDK
```

已验证：`flutter analyze` 无问题、`flutter test` 3 项通过、`flutter build web` 成功。

### 网页 Demo / 原型

```bash
python -m http.server 8765 --directory app
# 浏览器打开 http://127.0.0.1:8765/
# 原型：http://127.0.0.1:8765/prototype/index.html
```

也可直接双击 `app/index.html` 或 `app/prototype/index.html`（数据用 `<script>` 加载，无 file:// 跨域问题）。

### 更新数据

```bash
python scripts/sync.py                 # 同步并冻结最新原始快照
python scripts/build_data.py           # 重建 app/data/data.js
python flutter_app/scripts/sync_data.py  # 重建 Flutter 资产
```

## 数据来源与口径

- **统计快照**：`data.dtodo.cn/api/client/v1/`（aramgg client api），国服公开只读数据，底层为腾讯服真实对局样本，由第三方自行采集清洗。**非 Riot 官方数据，也未获腾讯官方授权。**
- **官方静态资产**：Riot Data Dragon（英雄 / 装备 / 召唤师技能的名称与图标）。
- **中文符文文案**：aramgg 公开元数据 JSON。
- Riot 官方 API 不提供 ARAM: Mayhem 的符文统计，因此不存在「官方数据源」这条路径。

展示口径：

- **只展示适配分级、选取率、样本量与文字理由，不展示胜率**。清洗阶段会移除 `winRate / wins / adjustedWinRate`，否则同步脚本拒绝生成。
- 每个数字绑定版本与数据日期，跨版本不混算。
- 三选一助手给出多个候选及理由，**不替玩家做决定**，不暗示唯一最优解。
- 原始数据带 `source: tencent / region: CN` 仅表示样本来自国服，不代表腾讯官方发布或授权。

## 合规提醒

第三方接口的稳定性与授权不由本项目控制。对外发布或商业化前，请：

1. 向数据源方取得使用授权；
2. 在 Riot Developer Portal 书面确认第三方工具政策（特别是符文数据展示口径）；
3. 保留非官方背书声明，不使用 Riot 商标或暗示官方关系。

未经授权请勿上架 Apple App Store / Google Play。

## 验证脚本

```bash
node scripts/smoke_test.js           # 网页 Demo 逻辑冒烟测试
node scripts/prototype_smoke.js      # 原型逻辑冒烟测试
python scripts/static_check.py       # 原型静态一致性检查
node scripts/live_probe.js           # 真实在线数据源探针（需联网）
```
