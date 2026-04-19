import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_theme.dart';

class RelatedArticleCard extends StatelessWidget {
  const RelatedArticleCard({
    super.key,
    required this.title,
    required this.topic,
    required this.index,
  });

  final String title;
  final String topic;
  final int index;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Semantics(
      label: '$title, $topic',
      button: true,
      child: GestureDetector(
        onTap: () => context.push('/education/article/:id'),
        child: SizedBox(
          width: 180,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(AppTheme.radiusCard),
              boxShadow: AppTheme.shadowStandard,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(AppTheme.radiusCard),
                  ),
                  child: SizedBox(
                    height: 100,
                    width: double.infinity,
                    child: CustomPaint(
                      painter: _RelatedThumbPainter(index: index),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppTheme.spaceSm + 4,
                    AppTheme.spaceSm + 4,
                    AppTheme.screenHPadding,
                    AppTheme.spaceSm + 4,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: textTheme.titleMedium?.copyWith(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                          height: 1.3,
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

class _RelatedThumbPainter extends CustomPainter {
  const _RelatedThumbPainter({required this.index});

  final int index;

  @override
  void paint(Canvas canvas, Size size) {
    final bgColor = index.isEven ? AppTheme.canvasAltColor : AppTheme.canvasColor;
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = bgColor,
    );

    final cx = size.width / 2;
    final cy = size.height / 2;

    canvas.drawCircle(
      Offset(cx, cy),
      16,
      Paint()..color = AppTheme.lilacColor.withValues(alpha: 0.15),
    );
    canvas.drawCircle(
      Offset(cx - 12, cy - 6),
      8,
      Paint()..color = AppTheme.coralColor.withValues(alpha: 0.12),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
