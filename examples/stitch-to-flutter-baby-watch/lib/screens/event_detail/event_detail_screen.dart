import 'package:flutter/material.dart';

class EventDetailScreen extends StatelessWidget {
  const EventDetailScreen({super.key});

  static const _error = Color(0xFF9F403D);
  static const _errorContainer = Color(0xFFEED9D2);
  static const _surfaceContainerLow = Color(0xFFF5F4EE);
  static const _surfaceContainer = Color(0xFFEFEEE8);
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
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: _errorContainer,
                          borderRadius: BorderRadius.circular(28),
                        ),
                        child: const Icon(
                          Icons.warning,
                          color: _error,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Alert Event',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: _error,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Left Safe Zone',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: _onSurface,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: _surfaceContainerLow,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        _DetailRow(
                          label: 'Thời gian',
                          value: '10:24 AM • 4 phút',
                        ),
                        const SizedBox(height: 16),
                        _DetailRow(
                          label: 'Beacon',
                          value: 'Bé Na',
                        ),
                        const SizedBox(height: 16),
                        _DetailRow(
                          label: 'Vùng an toàn',
                          value: 'Home',
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Trạng thái',
                              style: TextStyle(
                                fontSize: 14,
                                color: _onSurfaceVariant,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: _errorContainer,
                                borderRadius: BorderRadius.circular(9999),
                              ),
                              child: const Text(
                                'Đã xác nhận',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: _error,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      height: 128,
                      width: double.infinity,
                      child: Image.network(
                        'https://picsum.photos/seed/map5/400/150',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: _surfaceContainer,
                          child: const Center(
                            child: Icon(Icons.map, color: _onSurfaceVariant),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: FilledButton.styleFrom(
                        backgroundColor: _onSurface,
                        foregroundColor: _white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(9999),
                        ),
                      ),
                      child: const Text(
                        'Đóng',
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

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            color: Color(0xFF5E6059),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF31332E),
          ),
        ),
      ],
    );
  }
}
