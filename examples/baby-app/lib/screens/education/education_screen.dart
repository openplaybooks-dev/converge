import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../theme/app_theme.dart';
import 'widgets/article_card.dart';
import 'widgets/featured_article_card.dart';
import 'widgets/bookmarked_article_card.dart';
import 'widgets/bottom_nav_bar.dart';
import 'widgets/topic_chip_bar.dart';

class EducationScreen extends StatefulWidget {
  const EducationScreen({super.key});

  @override
  State<EducationScreen> createState() => _EducationScreenState();
}

class _EducationScreenState extends State<EducationScreen> {
  int _selectedTopicIndex = 0;

  static const _topics = [
    'All',
    'Nutrition',
    'Body Changes',
    'Maternal Care',
    'Baby Development',
  ];

  static const _articles = [
    _Article(
      title: 'Understanding Body Changes in Week 20',
      topic: 'Body Changes',
      isBookmarked: true,
    ),
    _Article(
      title: 'Safe Exercises During Pregnancy',
      topic: 'Maternal Care',
      isBookmarked: false,
    ),
    _Article(
      title: 'Your Baby at 22 Weeks',
      topic: 'Baby Development',
      isBookmarked: true,
    ),
    _Article(
      title: 'Iron-Rich Foods for Pregnancy',
      topic: 'Nutrition',
      isBookmarked: false,
    ),
  ];

  List<_Article> get _filteredArticles {
    if (_selectedTopicIndex == 0) return _articles;
    final topic = _topics[_selectedTopicIndex];
    return _articles.where((a) => a.topic == topic).toList();
  }

  List<_Article> get _bookmarkedArticles =>
      _articles.where((a) => a.isBookmarked).toList();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // App bar
            SliverToBoxAdapter(
              child: Container(
                color: colorScheme.surface,
                padding: const EdgeInsets.fromLTRB(
                  AppTheme.screenHPadding,
                  AppTheme.spaceXl,
                  AppTheme.spaceSm,
                  AppTheme.spaceMd,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Learn',
                      style: textTheme.displaySmall?.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Semantics(
                      label: 'Search articles',
                      button: true,
                      child: IconButton(
                        onPressed: () {
                          showModalBottomSheet(
                            context: context,
                            builder: (_) => const Placeholder(),
                          );
                        },
                        icon: const Icon(Icons.search),
                        color: AppTheme.textSecondaryColor,
                        iconSize: 22,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Content
            SliverPadding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
              ),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: AppTheme.spaceMd),

                  // Topic chips
                  TopicChipBar(
                    topics: _topics,
                    selectedIndex: _selectedTopicIndex,
                    onSelected: (index) =>
                        setState(() => _selectedTopicIndex = index),
                  )
                      .animate()
                      .fadeIn(
                        duration: const Duration(milliseconds: 300),
                        curve: AppTheme.springCurve,
                      ),
                  const SizedBox(height: AppTheme.spaceLg),

                  // Featured article card
                  const FeaturedArticleCard()
                      .animate()
                      .fadeIn(
                        duration: AppTheme.cardDuration,
                        curve: AppTheme.springCurve,
                      )
                      .slideY(
                        begin: 0.05,
                        end: 0,
                        duration: AppTheme.cardDuration,
                        curve: AppTheme.springCurve,
                      ),
                  const SizedBox(height: AppTheme.spaceLg),

                  // Article list
                  ..._buildArticleList(textTheme, colorScheme),
                  const SizedBox(height: AppTheme.spaceLg),

                  // Bookmarked section
                  if (_bookmarkedArticles.isNotEmpty) ...[
                    Text(
                      'Bookmarked',
                      style: textTheme.headlineSmall?.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppTheme.spaceMd),
                    _buildBookmarkedScroll(textTheme, colorScheme),
                  ],
                  const SizedBox(height: 88),
                ]),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const BottomNavBar(),
    );
  }

  List<Widget> _buildArticleList(
    TextTheme textTheme,
    ColorScheme colorScheme,
  ) {
    final articles = _filteredArticles;
    return List.generate(articles.length, (index) {
      final article = articles[index];
      return Padding(
        padding: EdgeInsets.only(
          top: index == 0 ? 0 : AppTheme.cardSpacing,
        ),
        child: ArticleCard(
          title: article.title,
          topic: article.topic,
          isBookmarked: article.isBookmarked,
          index: index,
        ),
      );
    });
  }

  Widget _buildBookmarkedScroll(
    TextTheme textTheme,
    ColorScheme colorScheme,
  ) {
    final bookmarked = _bookmarkedArticles;
    return SizedBox(
      height: 220,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: bookmarked.length,
        separatorBuilder: (_, __) =>
            const SizedBox(width: AppTheme.cardSpacing),
        itemBuilder: (context, index) {
          final article = bookmarked[index];
          return BookmarkedArticleCard(
            title: article.title,
            topic: article.topic,
          );
        },
      ),
    )
        .animate()
        .fadeIn(
          delay: AppTheme.staggerDelay * (_filteredArticles.length + 1),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: AppTheme.staggerDelay * (_filteredArticles.length + 1),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }

}

class _Article {
  const _Article({
    required this.title,
    required this.topic,
    required this.isBookmarked,
  });

  final String title;
  final String topic;
  final bool isBookmarked;
}
