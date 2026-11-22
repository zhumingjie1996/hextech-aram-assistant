class LiveConfig {
  final String service;
  final String gamePatch;
  final String dataVersion;
  final String generatedAt;

  LiveConfig.fromJson(Map<String, dynamic> j)
      : service = (j['service'] ?? '').toString(),
        gamePatch = (j['gamePatch'] ?? '').toString(),
        dataVersion = (j['dataVersion'] ?? '').toString(),
        generatedAt = (j['generatedAt'] ?? '').toString();
}
