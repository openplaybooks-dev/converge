import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class EventCard extends StatelessWidget {
  final String category;
  final String title;
  final IconData icon;
  final bool iconFilled;
  final String badgeLabel;
  final Color badgeColor;
  final Color backgroundColor;
  final Color iconColor;
  final String childName;
  final String time;
  final String eventLabel;
  final Color eventLabelColor;

  const EventCard({
    super.key,
    required this.category,
    required this.title,
    required this.icon,
    required this.iconFilled,
    required this.badgeLabel,
    required this.badgeColor,
    required this.backgroundColor,
    required this.iconColor,
    required this.childName,
    required this.time,
    required this.eventLabel,
    required this.eventLabelColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category,
                    style: textTheme.labelSmall?.copyWith(
                      fontFamily: 'Manrope',
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.05,
                      color: iconColor.withValues(alpha: 0.7),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    title,
                    style: textTheme.titleLarge?.copyWith(
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: FontWeight.w700,
                      color: AppTheme.brandOnSurface,
                    ),
                  ),
                ],
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: colorScheme.surface.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  border: Border.all(color: badgeColor.withValues(alpha: 0.1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 16, color: badgeColor),
                    const SizedBox(width: 4),
                    Text(
                      badgeLabel,
                      style: textTheme.labelSmall?.copyWith(
                        fontFamily: 'Manrope',
                        fontWeight: FontWeight.w700,
                        color: badgeColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.spaceMd),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.child_care,
                        size: 18,
                        color: AppTheme.brandOnSurfaceVariant,
                      ),
                      const SizedBox(width: AppTheme.spaceSm),
                      Text(
                        childName,
                        style: textTheme.bodyMedium?.copyWith(
                          fontFamily: 'Manrope',
                          fontWeight: FontWeight.w500,
                          color: AppTheme.brandOnSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  Row(
                    children: [
                      const Icon(
                        Icons.schedule,
                        size: 18,
                        color: AppTheme.brandOnSurfaceVariant,
                      ),
                      const SizedBox(width: AppTheme.spaceSm),
                      Text(
                        time,
                        style: textTheme.bodyMedium?.copyWith(
                          fontFamily: 'Manrope',
                          fontWeight: FontWeight.w500,
                          color: AppTheme.brandOnSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppTheme.spaceMd, vertical: 6),
                decoration: BoxDecoration(
                  color: eventLabelColor.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  border:
                      Border.all(color: eventLabelColor.withValues(alpha: 0.2)),
                ),
                child: Text(
                  eventLabel,
                  style: textTheme.labelSmall?.copyWith(
                    fontFamily: 'Manrope',
                    fontWeight: FontWeight.w700,
                    color: eventLabelColor,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
