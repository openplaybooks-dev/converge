import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';

part 'article_provider.g.dart';

@riverpod
List<Article> articles(Ref ref) {
  return mockArticles;
}
