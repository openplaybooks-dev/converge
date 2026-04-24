import 'package:flutter/material.dart';

const Color secondary = Color(0xFF4F635E);
const Color secondaryContainer = Color(0xFFCDE3DC);
const Color onSecondaryContainer = Color(0xFF00391C);
const Color onSurface = Color(0xFF31332E);
const Color onSurfaceVariant = Color(0xFF5E6059);
const Color white = Colors.white;

class BeaconPairingConfirmationScreen extends StatelessWidget {
  const BeaconPairingConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: Container(color: Colors.black.withValues(alpha: 0.4)),
          ),
          Center(
            child: Container(
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 64,
                    offset: const Offset(0, 24),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: secondaryContainer,
                      borderRadius: BorderRadius.circular(40),
                    ),
                    child: const Icon(
                      Icons.sensors,
                      color: secondary,
                      size: 40,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Ghép nối Beacon',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: onSurface,
                      letterSpacing: -0.02,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        children: [
                          _SignalBar(height: 8, isActive: true),
                          const SizedBox(width: 4),
                          _SignalBar(height: 12, isActive: true),
                          const SizedBox(width: 4),
                          _SignalBar(height: 16, isActive: true),
                        ],
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Tín hiệu mạnh',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () => throw UnimplementedError(),
                      icon: const Icon(Icons.bluetooth),
                      label: const Text('Ghép nối'),
                      style: FilledButton.styleFrom(
                        backgroundColor: secondary,
                        foregroundColor: white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(9999),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: TextButton.styleFrom(
                        foregroundColor: onSurfaceVariant,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text(
                        'Hủy',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SignalBar extends StatelessWidget {
  final double height;
  final bool isActive;

  const _SignalBar({required this.height, required this.isActive});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: height,
      decoration: BoxDecoration(
        color: isActive ? secondary : secondary.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }
}
