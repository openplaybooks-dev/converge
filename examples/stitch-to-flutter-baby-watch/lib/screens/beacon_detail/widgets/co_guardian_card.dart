import 'package:flutter/material.dart';

class CoGuardianCard extends StatelessWidget {
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const CoGuardianCard({
    super.key,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.12),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.group, size: 18),
              ),
              const SizedBox(width: 12),
              Text(
                'Người cùng theo dõi',
                style: textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          GuardianRow(
            avatarBg: colorScheme.primaryContainer,
            avatarText: 'Mẹ',
            avatarTextColor: colorScheme.onPrimaryContainer,
            name: 'Mẹ',
            time: '2 phút trước',
            statusType: GuardianStatusType.safe,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const SizedBox(height: 16),
          GuardianRow(
            avatarBg: colorScheme.tertiaryContainer,
            avatarText: 'Bố',
            avatarTextColor: colorScheme.onTertiaryContainer,
            name: 'Bố',
            time: '15 phút trước',
            statusType: GuardianStatusType.warning,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const SizedBox(height: 16),
          GuardianRow(
            avatarBg: colorScheme.surfaceContainerHighest,
            avatarText: 'Bà',
            avatarTextColor: colorScheme.onSurfaceVariant,
            name: 'Bà Ngoại',
            time: '1 giờ trước',
            statusType: GuardianStatusType.offline,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const SizedBox(height: 24),
          Container(height: 1, color: colorScheme.outlineVariant),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: FilledButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Mời người cùng theo dõi')),
                );
              },
              style: FilledButton.styleFrom(
                backgroundColor: colorScheme.primary,
                foregroundColor: colorScheme.onPrimary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(9999),
                ),
                elevation: 4,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.person_add, size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Mời người cùng theo dõi',
                    style: textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: TextButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Quản lý danh sách người cùng theo dõi')),
                );
              },
              style: TextButton.styleFrom(
                foregroundColor: colorScheme.primary,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Quản lý danh sách',
                    style: textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right, size: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum GuardianStatusType { safe, warning, offline }

class GuardianRow extends StatelessWidget {
  final Color avatarBg;
  final String avatarText;
  final Color avatarTextColor;
  final String name;
  final String time;
  final GuardianStatusType statusType;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const GuardianRow({
    super.key,
    required this.avatarBg,
    required this.avatarText,
    required this.avatarTextColor,
    required this.name,
    required this.time,
    required this.statusType,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: avatarBg,
              borderRadius: BorderRadius.circular(28),
            ),
            alignment: Alignment.center,
            child: Text(
              avatarText,
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: avatarTextColor,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  time.toUpperCase(),
                  style: textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.05,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          StatusPill(statusType: statusType, colorScheme: colorScheme, textTheme: textTheme),
        ],
      ),
    );
  }
}

class StatusPill extends StatelessWidget {
  final GuardianStatusType statusType;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const StatusPill({
    super.key,
    required this.statusType,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    switch (statusType) {
      case GuardianStatusType.safe:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(9999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: colorScheme.onPrimaryContainer,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                'Đang gần beacon',
                style: textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onPrimaryContainer,
                ),
              ),
            ],
          ),
        );
      case GuardianStatusType.warning:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: colorScheme.tertiaryContainer,
            borderRadius: BorderRadius.circular(9999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.warning, size: 16, color: colorScheme.onTertiaryContainer),
              const SizedBox(width: 6),
              Text(
                'Xa / không thấy',
                style: textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onTertiaryContainer,
                ),
              ),
            ],
          ),
        );
      case GuardianStatusType.offline:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(9999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_off, size: 16, color: colorScheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Text(
                'Ngoại tuyến',
                style: textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        );
    }
  }
}