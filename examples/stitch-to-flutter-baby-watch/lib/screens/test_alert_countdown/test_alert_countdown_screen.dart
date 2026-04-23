import 'package:flutter/material.dart';

class TestAlertCountdownScreen extends StatelessWidget {
  const TestAlertCountdownScreen({super.key});

  static const _error = Color(0xFF9F403D);
  static const _errorContainer = Color(0xFFEED9D2);
  static const _surfaceContainerLow = Color(0xFFF5F4EE);
  static const _onSurface = Color(0xFF31332E);
  static const _onSurfaceVariant = Color(0xFF5E6059);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFE8E8E8),
      body: SafeArea(
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 48),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFB1B3AB),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Thử cảnh báo',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: _onSurface,
                    letterSpacing: -0.02,
                  ),
                ),
                const SizedBox(height: 32),
                Column(
                  children: [
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 1.0, end: 1.05),
                      duration: const Duration(milliseconds: 500),
                      curve: Curves.easeInOut,
                      builder: (context, scale, child) {
                        return Transform.scale(
                          scale: scale,
                          child: Container(
                            width: 144,
                            height: 144,
                            decoration: BoxDecoration(
                              color: _errorContainer,
                              shape: BoxShape.circle,
                            ),
                            child: const Center(
                              child: Text(
                                '5',
                                style: TextStyle(
                                  fontSize: 72,
                                  fontWeight: FontWeight.w800,
                                  color: _error,
                                  height: 1.0,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'giây',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: _onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                Text.rich(
                  TextSpan(
                    text: 'Cảnh báo sẽ phát trong ',
                    style: TextStyle(
                      fontSize: 14,
                      color: _onSurfaceVariant,
                      height: 1.5,
                    ),
                    children: const [
                      TextSpan(
                        text: '5 giây',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: _error,
                        ),
                      ),
                    ],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                    label: const Text('Hủy'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _error,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      side: const BorderSide(color: _surfaceContainerLow),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
