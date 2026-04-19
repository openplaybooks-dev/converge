import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class HeroIllustrationCard extends StatelessWidget {
  final int weekNumber;
  final String sizeComparison;

  const HeroIllustrationCard({
    super.key,
    required this.weekNumber,
    required this.sizeComparison,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppTheme.spaceXl),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusHero),
        boxShadow: AppTheme.shadowProminent,
      ),
      child: Column(
        children: [
          FractionallySizedBox(
            widthFactor: 0.7,
            child: AspectRatio(
              aspectRatio: 1,
              child: CustomPaint(
                painter: _HeroIllustrationPainter(
                  sizeComparison: sizeComparison,
                ),
              ),
            )
                .animate(
                  onPlay: (controller) => controller.repeat(reverse: true),
                )
                .scale(
                  begin: const Offset(1.0, 1.0),
                  end: const Offset(1.015, 1.015),
                  duration: 2000.ms,
                  curve: Curves.easeInOut,
                ),
          ),
          const SizedBox(height: AppTheme.screenHPadding),
          Text(
            'Week $weekNumber',
            style: textTheme.headlineSmall?.copyWith(
              color: AppTheme.textPrimaryColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Your baby is about the size of a $sizeComparison',
            style: textTheme.labelLarge?.copyWith(
              color: AppTheme.textSecondaryColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroIllustrationPainter extends CustomPainter {
  final String sizeComparison;

  _HeroIllustrationPainter({required this.sizeComparison});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.45);

    // Outer circle — blush
    canvas.drawCircle(
      center,
      size.width * 0.3,
      Paint()..color = AppTheme.canvasAltColor,
    );

    // Middle ellipse — pink
    canvas.drawOval(
      Rect.fromCenter(
        center: center,
        width: size.width * 0.42,
        height: size.height * 0.46,
      ),
      Paint()..color = AppTheme.pregnancyPinkColor,
    );

    // Inner ellipse — coral transparent
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx, center.dy - 2),
        width: size.width * 0.24,
        height: size.height * 0.28,
      ),
      Paint()..color = AppTheme.coralColor.withValues(alpha: 0.3),
    );

    // Eyes
    final eyePaint = Paint()
      ..color = AppTheme.textPrimaryColor.withValues(alpha: 0.6);
    canvas.drawCircle(
      Offset(center.dx - size.width * 0.04, center.dy - size.width * 0.05),
      size.width * 0.015,
      eyePaint,
    );
    canvas.drawCircle(
      Offset(center.dx + size.width * 0.04, center.dy - size.width * 0.05),
      size.width * 0.015,
      eyePaint,
    );

    // Smile
    final smilePath = Path();
    final smileStart =
        Offset(center.dx - size.width * 0.03, center.dy + size.width * 0.0);
    final smileEnd =
        Offset(center.dx + size.width * 0.03, center.dy + size.width * 0.0);
    final smileControl = Offset(center.dx, center.dy + size.width * 0.03);
    smilePath.moveTo(smileStart.dx, smileStart.dy);
    smilePath.quadraticBezierTo(
      smileControl.dx,
      smileControl.dy,
      smileEnd.dx,
      smileEnd.dy,
    );
    canvas.drawPath(
      smilePath,
      Paint()
        ..color = AppTheme.textPrimaryColor.withValues(alpha: 0.5)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..strokeCap = StrokeCap.round,
    );

    // Caption text
    final textPainter = TextPainter(
      text: TextSpan(
        text: 'About the size of a $sizeComparison',
        style: TextStyle(
          fontSize: size.width * 0.055,
          color: AppTheme.textSecondaryColor,
          fontWeight: FontWeight.w500,
        ),
      ),
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );
    textPainter.layout(maxWidth: size.width);
    textPainter.paint(
      canvas,
      Offset(
        (size.width - textPainter.width) / 2,
        size.height * 0.77,
      ),
    );
  }

  @override
  bool shouldRepaint(covariant _HeroIllustrationPainter oldDelegate) =>
      sizeComparison != oldDelegate.sizeComparison;
}
