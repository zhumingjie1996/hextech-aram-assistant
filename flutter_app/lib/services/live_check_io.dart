import 'dart:convert';
import 'dart:io';

import 'live_config.dart';

Future<LiveConfig> fetchConfigImpl() async {
  final client = HttpClient();
  try {
    final req = await client.getUrl(Uri.parse('https://data.dtodo.cn/api/client/v1/config'));
    req.headers.set('Accept', 'application/json');
    final res = await req.close();
    if (res.statusCode != 200) throw StateError('HTTP ${res.statusCode}');
    final text = await utf8.decoder.bind(res).join();
    return LiveConfig.fromJson(json.decode(text) as Map<String, dynamic>);
  } finally {
    client.close();
  }
}
