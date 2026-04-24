import 'enums.dart';

class User {
  final String id;
  final String displayName;
  final String? avatarUrl;
  final GuardianRole role;
  final ProximityStatus proximityStatus;
  final DateTime lastSeen;
  final bool isOnline;

  const User({
    required this.id,
    required this.displayName,
    this.avatarUrl,
    required this.role,
    required this.proximityStatus,
    required this.lastSeen,
    required this.isOnline,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String,
    displayName: json['displayName'] as String,
    avatarUrl: json['avatarUrl'] as String?,
    role: GuardianRole.values.firstWhere((e) => e.name == json['role']),
    proximityStatus: ProximityStatus.values.firstWhere((e) => e.name == json['proximityStatus']),
    lastSeen: DateTime.parse(json['lastSeen'] as String),
    isOnline: json['isOnline'] as bool,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'displayName': displayName,
    'avatarUrl': avatarUrl,
    'role': role.name,
    'proximityStatus': proximityStatus.name,
    'lastSeen': lastSeen.toIso8601String(),
    'isOnline': isOnline,
  };
}