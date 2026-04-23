import 'package:flutter/material.dart';

class TimeoutPickerScreen extends StatelessWidget {
  const TimeoutPickerScreen({super.key});

  static const _secondary = Color(0xFF4F635E);
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
                  const Text(
                    'Chọn thời gian chờ',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: _onSurface,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Thời gian trước khi phát cảnh báo khi mất kết nối beacon',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: _onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 24),
                  _TimeoutOption(
                    label: '2 phút',
                    subtitle: 'Khuyến nghị',
                    isSelected: true,
                    onTap: () => throw UnimplementedError(),
                  ),
                  const SizedBox(height: 12),
                  _TimeoutOption(
                    label: '5 phút',
                    isSelected: false,
                    onTap: () => throw UnimplementedError(),
                  ),
                  const SizedBox(height: 12),
                  _TimeoutOption(
                    label: '10 phút',
                    isSelected: false,
                    onTap: () => throw UnimplementedError(),
                  ),
                  const SizedBox(height: 12),
                  _TimeoutOption(
                    label: '15 phút',
                    isSelected: false,
                    onTap: () => throw UnimplementedError(),
                  ),
                  const SizedBox(height: 24),
                  const Divider(color: Color(0xFFE2E3DB)),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: TextButton.icon(
                      onPressed: () => throw UnimplementedError(),
                      icon: const Icon(Icons.edit, size: 20),
                      label: const Text('Tùy chỉnh thời gian'),
                      style: TextButton.styleFrom(
                        foregroundColor: _secondary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        textStyle: const TextStyle(
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

class _TimeoutOption extends StatelessWidget {
  final String label;
  final String? subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _TimeoutOption({
    required this.label,
    this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: onTap,
        style: FilledButton.styleFrom(
          backgroundColor:
              isSelected ? const Color(0xFF4F635E) : const Color(0xFFF5F4EE),
          foregroundColor: isSelected ? Colors.white : const Color(0xFF31332E),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(9999),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (subtitle != null)
              Text(
                subtitle!,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.7)
                      : const Color(0xFF5E6059),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
