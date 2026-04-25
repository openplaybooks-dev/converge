import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import 'package:vibration/vibration.dart';

abstract class AlertPlayer {
  Future<void> start();
  Future<void> stop();
}

class AlertPlayerImpl implements AlertPlayer {
  AlertPlayerImpl({AudioPlayer? audio}) : _audio = audio ?? AudioPlayer();

  final AudioPlayer _audio;
  bool _running = false;

  @override
  Future<void> start() async {
    if (_running) return;
    _running = true;
    await _audio.setAsset('assets/sounds/alert.mp3');
    await _audio.setLoopMode(LoopMode.one);
    await _audio.play();
    await HapticFeedback.heavyImpact();
    if (await Vibration.hasVibrator()) {
      Vibration.vibrate(pattern: [0, 500, 200, 500, 200, 500], repeat: 0);
    }
  }

  @override
  Future<void> stop() async {
    _running = false;
    await _audio.stop();
    Vibration.cancel();
  }
}

final alertPlayerProvider = Provider<AlertPlayer>((ref) => AlertPlayerImpl());
