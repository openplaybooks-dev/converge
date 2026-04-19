import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class GreetingHeader extends StatelessWidget {
  final String userName;
  final String dateText;

  const GreetingHeader({
    super.key,
    required this.userName,
    required this.dateText,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                userName,
                style: textTheme.headlineSmall?.copyWith(
                  color: AppTheme.textPrimaryColor,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.015 * 24,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                dateText,
                style: textTheme.bodySmall?.copyWith(
                  color: AppTheme.textSecondaryColor,
                ),
              ),
            ],
          ),
        ),
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.coralTintColor,
            border: Border.all(
              color: AppTheme.surfaceColor,
              width: 2,
            ),
            boxShadow: const [
              BoxShadow(
                color: AppTheme.avatarShadowColor,
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Center(
            child: Text(
              userName.isNotEmpty ? userName[0].toUpperCase() : '',
              style: textTheme.labelLarge?.copyWith(
                color: AppTheme.coralColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
