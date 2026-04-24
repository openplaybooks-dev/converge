import 'package:flutter/material.dart';

class TestAlertScreen extends StatelessWidget {
  const TestAlertScreen({super.key});

  static const _secondary = Color(0xFF4F635E);
  static const _surfaceContainerLow = Color(0xFFF5F4EE);
  static const _onSurface = Color(0xFF31332E);
  static const _onSurfaceVariant = Color(0xFF5E6059);
  static const _white = Colors.white;

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
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: const BoxDecoration(
                color: _white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E3DB),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Kiểm tra cảnh báo',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: _onSurface,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Cảnh báo sẽ phát sau khoảng thời gian đã chọn',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: _onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: 128,
                    height: 128,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 128,
                          height: 128,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: const Color(0xFFE2E3DB),
                              width: 4,
                            ),
                          ),
                        ),
                        Container(
                          width: 128,
                          height: 128,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: _secondary,
                              width: 4,
                            ),
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                _secondary,
                                _secondary.withValues(alpha: 0.3),
                              ],
                            ),
                          ),
                        ),
                        Transform.rotate(
                          angle: 0.785,
                          child: Container(
                            width: 128,
                            height: 128,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: _secondary,
                                width: 4,
                                strokeAlign: BorderSide.strokeAlignInside,
                              ),
                            ),
                          ),
                        ),
                        const Text(
                          '10',
                          style: TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w800,
                            color: _secondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Nhấn nút bên dưới để bắt đầu đếm ngược',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: _onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () => throw UnimplementedError(),
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Bắt đầu kiểm tra'),
                      style: FilledButton.styleFrom(
                        backgroundColor: _secondary,
                        foregroundColor: _white,
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
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _onSurface,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(9999),
                        ),
                        side: const BorderSide(color: _surfaceContainerLow),
                      ),
                      child: const Text(
                        'Hủy',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
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
