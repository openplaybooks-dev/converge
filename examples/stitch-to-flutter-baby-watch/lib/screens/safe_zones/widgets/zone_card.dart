import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../theme/app_theme.dart';

class ZoneCard extends StatelessWidget {
  final String name;
  final String address;
  final String radius;
  final bool isActive;
  final int index;

  const ZoneCard({
    super.key,
    required this.name,
    required this.address,
    required this.radius,
    required this.isActive,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final toggleColor =
        isActive ? colorScheme.tertiary : colorScheme.outlineVariant;
    final badgeColor = isActive
        ? colorScheme.tertiaryContainer
        : colorScheme.surfaceContainerHighest;
    final badgeTextColor =
        isActive ? colorScheme.tertiary : colorScheme.onSurfaceVariant;

    return Card(
      elevation: 0,
      color: colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spaceMd),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerLow,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isActive ? Icons.home : Icons.favorite,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(width: AppTheme.spaceMd),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        name,
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: AppTheme.spaceSm),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: badgeColor,
                          borderRadius:
                              BorderRadius.circular(AppTheme.radiusFull),
                        ),
                        child: Text(
                          radius,
                          style: textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: badgeTextColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    address,
                    style: textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppTheme.spaceMd),
            Container(
              width: 48,
              height: 24,
              decoration: BoxDecoration(
                color: toggleColor,
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              ),
              alignment:
                  isActive ? Alignment.centerRight : Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  shape: BoxShape.circle,
                ),
              ),
            ),
            const SizedBox(width: AppTheme.spaceSm),
            Icon(
              Icons.edit,
              color: colorScheme.outlineVariant,
              size: 20,
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: (200 + index * 50).ms).slideX(begin: 0.05);
  }
}
