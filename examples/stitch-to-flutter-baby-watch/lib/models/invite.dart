enum InviteStatus {
  pending,
  accepted,
  rejected,
  expired,
}

class Invite {
  final String id;
  final String beaconId;
  final String inviterId;
  final String inviterName;
  final String code;
  final InviteStatus status;
  final DateTime createdAt;
  final DateTime? expiresAt;

  const Invite({
    required this.id,
    required this.beaconId,
    required this.inviterId,
    required this.inviterName,
    required this.code,
    required this.status,
    required this.createdAt,
    this.expiresAt,
  });
}