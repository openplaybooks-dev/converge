import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class BookmarkedArticleCard extends StatelessWidget {
  const BookmarkedArticleCard({
    super.key,
    required this.title,
    required this.topic,
  });

  final String title;
  final String topic;

  IconData _iconForTopic(String topic) {
    switch (topic) {
      case 'Nutrition':
        return Icons.restaurant;
      case 'Body Changes':
        return Icons.accessibility_new;
      case 'Maternal Care':
        return Icons.favorite;
      case 'Baby Development':
        return Icons.child_care;
      default:
        return Icons.article;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Semantics(
      label: 'Bookmarked: $title, $topic',
      button: true,
      child: GestureDetector(
        onTap: () => debugPrint('Open bookmarked article: $title'),
        child: SizedBox(
          width: 200,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(AppTheme.radiusCard),
              boxShadow: AppTheme.shadowStandard,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Thumbnail
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(AppTheme.radiusCard),
                  ),
                  child: Container(
                    height: 120,
                    width: double.infinity,
                    color: AppTheme.canvasColor,
                    child: Center(
                      child: Icon(
                        _iconForTopic(topic),
                        size: 40,
                        color: AppTheme.lilacColor.withValues(alpha: 0.3),
                      ),
                    ),
                  ),
                ),
                // Info
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppTheme.screenHPadding,
                    12,
                    AppTheme.screenHPadding,
                    12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: textTheme.titleMedium?.copyWith(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        topic,
                        style: textTheme.bodySmall?.copyWith(
                          color: AppTheme.textSecondaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
