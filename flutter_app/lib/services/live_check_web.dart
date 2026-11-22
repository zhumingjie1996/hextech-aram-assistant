import 'dart:convert';
// Web 平台专用实现：dart:html 虽被标记 deprecated，但在 Flutter Web 仍可正常工作。
// ignore: deprecated_member_use, avoid_web_libraries_in_flutter
import 'dart:html' as html;

import 'live_config.dart';

Future<LiveConfig> fetchConfigImpl() async {
  final text = await html.HttpRequest.getString('https://data.dtodo.cn/api/client/v1/config');
  return LiveConfig.fromJson(json.decode(text) as Map<String, dynamic>);
}
