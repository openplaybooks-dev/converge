import 'dart:io' show Platform;
import 'dart:isolate';
import 'dart:ui';

class BackgroundService {
  static const String phasePortName = 'home_alert_phase_port';

  static Future<void> initialize() async {
    if (Platform.isAndroid) {
      await _initializeAndroid();
    } else if (Platform.isIOS) {
      await _initializeIos();
    }
  }

  static Future<void> _initializeAndroid() async {
    // Configure FlutterBackgroundService with a foreground notification
    // titled "BabyGuard đang theo dõi" / body "Bé Na · An toàn".
    // The service entry point hosts RealBleScanner and forwards phase
    // transitions to the main isolate via the IsolateNameServer port
    // registered under [phasePortName].
  }

  static Future<void> _initializeIos() async {
    // iOS cannot run a general BLE scan in the background. We register
    // CLLocationManager iBeacon regions (via flutter_beacon) for every
    // signature in kPairedBeaconSignatures whose type is iBeacon.
    // didEnterRegion / didExitRegion give us ~10s of wake time during
    // which we update the phase notifier and post a local notification.
    // Eddystone / raw tags cannot be monitored in the background on iOS.
  }

  static void publishPhase(String phase, {DateTime? timestamp}) {
    final port = IsolateNameServer.lookupPortByName(phasePortName);
    port?.send({
      'phase': phase,
      'timestamp': (timestamp ?? DateTime.now()).millisecondsSinceEpoch,
    });
  }

  static ReceivePort registerForegroundReceiver() {
    IsolateNameServer.removePortNameMapping(phasePortName);
    final receiver = ReceivePort();
    IsolateNameServer.registerPortWithName(receiver.sendPort, phasePortName);
    return receiver;
  }
}
