import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';
import 'related_article_card.dart';

class RelatedArticlesSection extends StatelessWidget {
  const RelatedArticlesSection({super.key});

  static const _relatedArticles = [
    _RelatedArticle(title: 'Iron-Rich Foods for Pregnancy', topic: 'Nutrition'),
    _RelatedArticle(title: 'Hydration During Pregnancy', topic: 'Nutrition'),
    _RelatedArticle(title: 'Meal Planning for Two', topic: 'Nutrition'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Semantics(
      label: 'Related articles',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Related Articles',
            style: textTheme.headlineSmall?.copyWith(
              color: colorScheme.onSurface,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppTheme.spaceLg),
          SizedBox(
            height: 200,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _relatedArticles.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final article = _relatedArticles[index];
                return RelatedArticleCard(
                  title: article.title,
                  topic: article.topic,
                  index: index,
                );
              },
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(
          delay: const Duration(milliseconds: 240),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: const Duration(milliseconds: 240),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }

}

class _RelatedArticle {
  const _RelatedArticle({
    required this.title,
    required this.topic,
  });

  final String title;
  final String topic;
}
