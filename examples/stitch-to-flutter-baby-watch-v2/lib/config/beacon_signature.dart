enum BeaconKind { ibeacon, eddystone, raw }

class BeaconSignature {
  final BeaconKind kind;
  final String? uuid;
  final int? major;
  final int? minor;
  final String? namespace;
  final String? instance;
  final List<int>? vendorAdData;
  final String label;

  const BeaconSignature({
    required this.kind,
    required this.label,
    this.uuid,
    this.major,
    this.minor,
    this.namespace,
    this.instance,
    this.vendorAdData,
  });
}

const kPairedBeaconSignatures = <BeaconSignature>[
  // Placeholder — replace with values captured by `flutter run -t tool/scan_dump.dart`
  // against the real Alibaba Nordic IoT Tag. See docs/beacon-fingerprint.md.
  BeaconSignature(
    kind: BeaconKind.ibeacon,
    label: 'BabyGuard tag #1',
    uuid: 'fda50693-a4e2-4fb1-afcf-c6eb07647825',
    major: 1,
    minor: 1,
  ),
];
