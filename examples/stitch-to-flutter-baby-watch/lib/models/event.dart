import 'enums.dart';

class Event {
  final String id;
  final String beaconId;
  final String childName;
  final EventType type;
  final DateTime timestamp;
  final int? durationSeconds;
  final String? safeZoneId;
  final bool wasAcknowledged;
  final String category;
  final String title;
  final String icon;
  final bool iconFilled;
  final String badgeLabel;
  final String badgeColor;
  final String backgroundColor;
  final String iconColor;
  final String eventLabel;
  final String eventLabelColor;
  final String time;

  const Event({
    required this.id,
    required this.beaconId,
    required this.childName,
    required this.type,
    required this.timestamp,
    this.durationSeconds,
    this.safeZoneId,
    required this.wasAcknowledged,
    required this.category,
    required this.title,
    required this.icon,
    required this.iconFilled,
    required this.badgeLabel,
    required this.badgeColor,
    required this.backgroundColor,
    required this.iconColor,
    required this.eventLabel,
    required this.eventLabelColor,
    required this.time,
  });

  factory Event.fromJson(Map<String, dynamic> json) => Event(
    id: json['id'] as String,
    beaconId: json['beaconId'] as String,
    childName: json['childName'] as String,
    type: EventType.values.firstWhere((e) => e.name == json['type']),
    timestamp: DateTime.parse(json['timestamp'] as String),
    durationSeconds: json['durationSeconds'] as int?,
    safeZoneId: json['safeZoneId'] as String?,
    wasAcknowledged: json['wasAcknowledged'] as bool,
    category: json['category'] as String,
    title: json['title'] as String,
    icon: json['icon'] as String,
    iconFilled: json['iconFilled'] as bool,
    badgeLabel: json['badgeLabel'] as String,
    badgeColor: json['badgeColor'] as String,
    backgroundColor: json['backgroundColor'] as String,
    iconColor: json['iconColor'] as String,
    eventLabel: json['eventLabel'] as String,
    eventLabelColor: json['eventLabelColor'] as String,
    time: json['time'] as String,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'beaconId': beaconId,
    'childName': childName,
    'type': type.name,
    'timestamp': timestamp.toIso8601String(),
    'durationSeconds': durationSeconds,
    'safeZoneId': safeZoneId,
    'wasAcknowledged': wasAcknowledged,
    'category': category,
    'title': title,
    'icon': icon,
    'iconFilled': iconFilled,
    'badgeLabel': badgeLabel,
    'badgeColor': badgeColor,
    'backgroundColor': backgroundColor,
    'iconColor': iconColor,
    'eventLabel': eventLabel,
    'eventLabelColor': eventLabelColor,
    'time': time,
  };
}