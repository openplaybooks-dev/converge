import 'package:flutter/material.dart';

class QuickActions extends StatelessWidget {
  const QuickActions({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tạm dừng thông báo',
            style: textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.01,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tắt cảnh báo tạm thời khi bạn đang ở cùng bé.',
            style: textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w400,
              height: 1.6,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildMuteButton(context, '5 phút'),
              const SizedBox(width: 12),
              _buildMuteButton(context, '10 phút'),
              const SizedBox(width: 12),
              _buildMuteButton(context, '15 phút'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMuteButton(BuildContext context, String label) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return Expanded(
      child: GestureDetector(
        onTap: () => throw UnimplementedError(),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(9999),
            border: Border.all(
              color: colorScheme.outlineVariant,
            ),
            boxShadow: [
              BoxShadow(
                color: colorScheme.shadow.withValues(alpha: 0.03),
                blurRadius: 2,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Center(
            child: Text(
              label,
              style: textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
