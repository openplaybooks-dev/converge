import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class HeroImageCard extends StatelessWidget {
  const HeroImageCard({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Semantics(
      label: 'Illustration for Nutrition in Your First Trimester',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusHero),
          boxShadow: AppTheme.shadowProminent,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppTheme.radiusHero),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: CustomPaint(
              painter: _HeroIllustrationPainter(),
            ),
          ),
        ),
      ),
    )
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
        );
  }
}

class _HeroIllustrationPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Background
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = AppTheme.canvasColor,
    );

    final cx = size.width / 2;
    final cy = size.height * 0.62;

    // Bowl outer
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy), width: 144, height: 72),
      Paint()..color = AppTheme.canvasAltColor,
    );

    // Bowl inner
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy - 5), width: 128, height: 56),
      Paint()..color = AppTheme.surfaceColor,
    );

    // Floating accent circles
    canvas.drawCircle(
      Offset(cx - 57, cy - 30),
      4,
      Paint()..color = AppTheme.coralColor.withValues(alpha: 0.5),
    );
    canvas.drawCircle(
      Offset(cx + 23, cy - 28),
      3.5,
      Paint()..color = AppTheme.coralColor.withValues(alpha: 0.4),
    );
    canvas.drawCircle(
      Offset(cx, cy - 26),
      3,
      Paint()..color = AppTheme.lilacColor.withValues(alpha: 0.4),
    );
    canvas.drawCircle(
      Offset(cx - 57, size.height * 0.43),
      6,
      Paint()..color = AppTheme.lilacColor.withValues(alpha: 0.12),
    );
    canvas.drawCircle(
      Offset(cx + 58, size.height * 0.40),
      8,
      Paint()..color = AppTheme.coralColor.withValues(alpha: 0.1),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
