class AlertConfig {
  final int timeoutSeconds;
  final bool audioEnabled;
  final bool vibrationEnabled;
  final double sensitivity;

  const AlertConfig({
    required this.timeoutSeconds,
    required this.audioEnabled,
    required this.vibrationEnabled,
    required this.sensitivity,
  });

  factory AlertConfig.fromJson(Map<String, dynamic> json) => AlertConfig(
    timeoutSeconds: json['timeoutSeconds'] as int,
    audioEnabled: json['audioEnabled'] as bool,
    vibrationEnabled: json['vibrationEnabled'] as bool,
    sensitivity: (json['sensitivity'] as num).toDouble(),
  );

  Map<String, dynamic> toJson() => {
    'timeoutSeconds': timeoutSeconds,
    'audioEnabled': audioEnabled,
    'vibrationEnabled': vibrationEnabled,
    'sensitivity': sensitivity,
  };
}