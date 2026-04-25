import 'package:freezed_annotation/freezed_annotation.dart';

enum SignalStrength {
  @JsonValue('safe')
  safe,
  @JsonValue('weak')
  weak,
  @JsonValue('lost')
  lost,
}

enum BeaconSubjectKind {
  @JsonValue('child')
  child,
  @JsonValue('pet')
  pet,
  @JsonValue('bag')
  bag,
}

enum SafeZoneIcon {
  @JsonValue('home')
  home,
  @JsonValue('school')
  school,
  @JsonValue('favorite')
  favorite,
}

enum HistoryEventKind {
  @JsonValue('alert')
  alert,
  @JsonValue('safe')
  safe,
  @JsonValue('offline')
  offline,
}

enum GuardianRole {
  @JsonValue('owner')
  owner,
  @JsonValue('coGuardian')
  coGuardian,
}

enum GuardianProximity {
  @JsonValue('nearBeacon')
  nearBeacon,
  @JsonValue('farOrUnseen')
  farOrUnseen,
  @JsonValue('offline')
  offline,
}

enum InviteStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('accepted')
  accepted,
  @JsonValue('rejected')
  rejected,
  @JsonValue('expired')
  expired,
}

enum TimeoutInterval {
  @JsonValue('min2')
  min2,
  @JsonValue('min5')
  min5,
  @JsonValue('min10')
  min10,
}

enum MuteDuration {
  @JsonValue('min5')
  min5,
  @JsonValue('min10')
  min10,
  @JsonValue('min15')
  min15,
}

enum PermissionKey {
  @JsonValue('bluetooth')
  bluetooth,
  @JsonValue('location')
  location,
  @JsonValue('notifications')
  notifications,
  @JsonValue('familyShare')
  familyShare,
}

enum InsightKey {
  @JsonValue('weeklyAlerts')
  weeklyAlerts,
  @JsonValue('zoneCoverage')
  zoneCoverage,
}
