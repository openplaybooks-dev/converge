import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class StatusIndicator extends StatelessWidget {
  const StatusIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.only(bottom: 32),
      child: Center(
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: AppTheme.spaceMd,
            vertical: AppTheme.spaceSm,
          ),
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            boxShadow: const [
              BoxShadow(
                color: AppTheme.brandShadowDark,
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.brandGreen,
                ),
              ),
              const SizedBox(width: AppTheme.spaceSm),
              Text(
                'HỆ THỐNG ĐANG HOẠT ĐỘNG',
                style: textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.1,
                  color: AppTheme.brandOnSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
