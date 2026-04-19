import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'article.freezed.dart';
part 'article.g.dart';

@freezed
abstract class Article with _$Article {
  const factory Article({
    required String id,
    required String title,
    required ArticleTopic topic,
    required String body,
    String? illustrationUrl,
    String? readTime,
    required bool isBookmarked,
    required List<String> relatedArticleIds,
  }) = _Article;

  factory Article.fromJson(Map<String, dynamic> json) =>
      _$ArticleFromJson(json);
}
