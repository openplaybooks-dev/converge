import 'package:flutter/material.dart';

class StatusSection extends StatelessWidget {
  const StatusSection({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return Column(
      children: [
        // Safe state pill
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
          decoration: BoxDecoration(
            color: colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(9999),
            boxShadow: [
              BoxShadow(
                color: colorScheme.shadow.withValues(alpha: 1),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.verified_user,
                size: 20,
                color: colorScheme.onPrimaryContainer,
              ),
              const SizedBox(width: 8),
              Text(
                'Đang an toàn',
                style: textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onPrimaryContainer,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        // Child name and subtitle
        Column(
          children: [
            Text(
              'Bé Na',
              style: textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: -0.02,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Còn Mẹ đang gần beacon',
              style: textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ],
    );
  }
}