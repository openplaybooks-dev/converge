import 'package:flutter/material.dart';

class PairingConfirmationScreen extends StatelessWidget {
  const PairingConfirmationScreen({super.key});

  static const _secondary = Color(0xFF4F635E);
  static const _surfaceContainerLow = Color(0xFFF5F4EE);
  static const _surfaceContainer = Color(0xFFEFEEE8);
  static const _onSurface = Color(0xFF31332E);
  static const _onSurfaceVariant = Color(0xFF5E6059);
  static const _secondaryContainer = Color(0xFFCDE3DC);
  static const _white = Colors.white;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          GestureDetector(
// @converge:element PairingConfirmationScreen-GestureDetector-onTap-1
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
                    'Xác nhận kết nối',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: _onSurface,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: _surfaceContainerLow,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: _secondaryContainer,
                            borderRadius: BorderRadius.circular(28),
                          ),
                          child: const Icon(
                            Icons.child_care,
                            color: _secondary,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Beacon: Bé Na',
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                  color: _onSurface,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'UUID: ...E2C4 • Major: 100',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: _onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Beacon sẽ được thêm vào nhóm theo dõi của bạn. Bạn có thể chia sẻ với người thân để cùng nhận thông báo.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: _onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
// @converge:element PairingConfirmationScreen-FilledButton-onPressed-1
                      onPressed: () {
                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('Đã thêm beacon thành công')),
                        );
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: _onSurface,
                        foregroundColor: _white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(9999),
                        ),
                      ),
                      child: const Text(
                        'Xác nhận',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
// @converge:element PairingConfirmationScreen-OutlinedButton-onPressed-1
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
