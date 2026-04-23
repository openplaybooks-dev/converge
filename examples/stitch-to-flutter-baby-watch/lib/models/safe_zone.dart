class SafeZone {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final int radiusMeters;
  final bool isActive;
  final DateTime createdAt;

  const SafeZone({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
    required this.isActive,
    required this.createdAt,
  });

  factory SafeZone.fromJson(Map<String, dynamic> json) => SafeZone(
    id: json['id'] as String,
    name: json['name'] as String,
    address: json['address'] as String,
    latitude: (json['latitude'] as num).toDouble(),
    longitude: (json['longitude'] as num).toDouble(),
    radiusMeters: json['radiusMeters'] as int,
    isActive: json['isActive'] as bool,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'address': address,
    'latitude': latitude,
    'longitude': longitude,
    'radiusMeters': radiusMeters,
    'isActive': isActive,
    'createdAt': createdAt.toIso8601String(),
  };
}