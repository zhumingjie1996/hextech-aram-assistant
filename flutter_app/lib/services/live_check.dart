import 'live_check_stub.dart'
    if (dart.library.io) 'live_check_io.dart'
    if (dart.library.html) 'live_check_web.dart';
import 'live_config.dart';

/// 按平台选择实现：移动端/桌面用 dart:io，Web 用 dart:html，其他平台给出明确错误。
Future<LiveConfig> fetchLiveConfig() => fetchConfigImpl();
