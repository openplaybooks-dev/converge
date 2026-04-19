import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_theme.dart';

class ArticleCard extends StatelessWidget {
  const ArticleCard({
    super.key,
    required this.title,
    required this.topic,
    required this.isBookmarked,
    required this.index,
  });

  final String title;
  final String topic;
  final bool isBookmarked;
  final int index;

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
      label:
          '$title, $topic, ${isBookmarked ? 'bookmarked' : 'not bookmarked'}',
      button: true,
      child: GestureDetector(
        onTap: () => context.push('/education/article/:id'),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusCard),
            boxShadow: AppTheme.shadowStandard,
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.screenHPadding),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Thumbnail
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppTheme.canvasColor,
                    borderRadius:
                        BorderRadius.circular(AppTheme.radiusLg),
                  ),
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: Center(
                      child: Icon(
                        _iconForTopic(topic),
                        size: 28,
                        color: AppTheme.lilacColor.withValues(alpha: 0.4),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Info
                Expanded(
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
                // Bookmark icon
                Semantics(
                  label: isBookmarked
                      ? 'Bookmarked'
                      : 'Not bookmarked',
                  child: SizedBox(
                    width: 44,
                    height: 44,
                    child: Center(
                      child: Icon(
                        isBookmarked
                            ? Icons.bookmark
                            : Icons.bookmark_border,
                        size: 18,
                        color: isBookmarked
                            ? AppTheme.coralColor
                            : AppTheme.textSecondaryColor,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(
          delay: AppTheme.staggerDelay * (index + 1),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: AppTheme.staggerDelay * (index + 1),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }
}
