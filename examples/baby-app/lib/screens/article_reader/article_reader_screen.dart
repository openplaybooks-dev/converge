import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import 'widgets/article_title_block.dart';
import 'widgets/article_body_card.dart';
import 'widgets/hero_image_card.dart';
import 'widgets/related_articles_section.dart';

class ArticleReaderScreen extends StatelessWidget {
  const ArticleReaderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        scrolledUnderElevation: 2,
        leading: Semantics(
          label: 'Go back to articles',
          button: true,
          child: IconButton(
// @converge:element BackButton-onPressed-1
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.arrow_back),
            color: colorScheme.onSurface,
            iconSize: 22,
          ),
        ),
        title: Text(
          'Nutrition in Your First Trimester',
          style: textTheme.titleMedium?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w600,
          ),
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        ),
        actions: [
          Semantics(
            label: 'Bookmark article, bookmarked',
            button: true,
            child: IconButton(
// @converge:element BookmarkButton-onPressed-1
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Bookmark toggled')),
                );
              },
              icon: const Icon(Icons.bookmark),
              color: AppTheme.coralColor,
              iconSize: 22,
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTheme.screenHPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 7.1 Hero Image
            const HeroImageCard(),
            const SizedBox(height: AppTheme.spaceLg),

            // 7.2 Title & Metadata
            const ArticleTitleBlock(),
            const SizedBox(height: AppTheme.spaceLg),

            // 7.3 Article Body
            const ArticleBodyCard(),
            const SizedBox(height: AppTheme.spaceLg),

            // Divider
            const Divider(
              height: 1,
              thickness: 1,
              color: AppTheme.chipBgColor,
            ),
            const SizedBox(height: AppTheme.spaceLg),

            // 7.4 Related Articles
            const RelatedArticlesSection(),
            const SizedBox(height: AppTheme.spaceXl),
          ],
        ),
      ),
    );
  }

}
