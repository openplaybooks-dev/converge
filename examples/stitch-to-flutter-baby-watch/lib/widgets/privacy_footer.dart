import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class PrivacyFooter extends StatelessWidget {
  const PrivacyFooter({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: AppTheme.brandSurface,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(AppTheme.radiusLg * 1.75),
          bottomRight: Radius.circular(AppTheme.radiusLg * 1.75),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.verified_user,
            size: 14,
            color: AppTheme.brandOnSurfaceVariant,
          ),
          const SizedBox(width: AppTheme.spaceSm),
          Text(
            'Bảo mật bởi hệ thống mã hóa BabyGuard',
            style: textTheme.bodySmall?.copyWith(
              color: AppTheme.brandOnSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}