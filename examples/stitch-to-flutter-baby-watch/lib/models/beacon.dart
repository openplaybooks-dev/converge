class Beacon {
  final String id;
  final String name;
  final String uuid;
  final int major;
  final int minor;
  final int txPower;
  final int lastRssi;
  final DateTime lastSeen;
  final bool isConnected;
  final int? batteryPercent;

  const Beacon({
    required this.id,
    required this.name,
    required this.uuid,
    required this.major,
    required this.minor,
    required this.txPower,
    required this.lastRssi,
    required this.lastSeen,
    required this.isConnected,
    this.batteryPercent,
  });

  factory Beacon.fromJson(Map<String, dynamic> json) => Beacon(
    id: json['id'] as String,
    name: json['name'] as String,
    uuid: json['uuid'] as String,
    major: json['major'] as int,
    minor: json['minor'] as int,
    txPower: json['txPower'] as int,
    lastRssi: json['lastRssi'] as int,
    lastSeen: DateTime.parse(json['lastSeen'] as String),
    isConnected: json['isConnected'] as bool,
    batteryPercent: json['batteryPercent'] as int?,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'uuid': uuid,
    'major': major,
    'minor': minor,
    'txPower': txPower,
    'lastRssi': lastRssi,
    'lastSeen': lastSeen.toIso8601String(),
    'isConnected': isConnected,
    'batteryPercent': batteryPercent,
  };
}