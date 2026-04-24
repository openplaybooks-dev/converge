enum GuardianRole {
  owner,
  guardian,
}

enum ProximityStatus {
  near,
  far,
  offline,
  paused,
}

enum EventType {
  disconnect,
  reconnect,
  alert,
}

enum MonitoredStatus {
  safe,
  near,
  weak,
  lost,
  alert,
}