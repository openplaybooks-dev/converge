import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

class RecommendationsCard extends StatelessWidget {
  const RecommendationsCard({super.key});

  static const _recommendations = [
    _Recommendation(
      icon: Icons.air,
      title: 'Try a breathing exercise',
      description:
          'A few minutes of deep breathing can help center your thoughts',
    ),
    _Recommendation(
      icon: Icons.directions_walk,
      title: 'Take a gentle walk',
      description: 'Fresh air and light movement boost energy and mood',
    ),
    _Recommendation(
      icon: Icons.favorite_outline,
      title: 'Log your gratitude today',
      description:
          'Writing down three things you\'re grateful for improves outlook',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Semantics(
      label: 'Wellness recommendations',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          boxShadow: AppTheme.shadowStandard,
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.screenHPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Recommendations',
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppTheme.spaceMd),
              ...List.generate(_recommendations.length, (index) {
                final rec = _recommendations[index];
                return Column(
                  children: [
                    if (index > 0)
                      const Divider(
                        color: AppTheme.chipBgColor,
                        height: 1,
                      ),
                    Semantics(
                      label: '${rec.title}: ${rec.description}',
                      button: true,
                      child: InkWell(
                        onTap: () => debugPrint('Recommendation: ${rec.title}'),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Row(
                            children: [
                              Icon(
                                rec.icon,
                                size: 22,
                                color: AppTheme.lilacColor,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      rec.title,
                                      style: textTheme.titleMedium?.copyWith(
                                        color: colorScheme.onSurface,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      rec.description,
                                      style: textTheme.bodySmall?.copyWith(
                                        color: AppTheme.textSecondaryColor,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(
                                Icons.chevron_right,
                                size: 18,
                                color: AppTheme.textSecondaryColor,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}

class _Recommendation {
  const _Recommendation({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;
}
