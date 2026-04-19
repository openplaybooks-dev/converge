import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

class HeroHeader extends StatelessWidget {
  const HeroHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppTheme.pregnancyPinkColor, AppTheme.canvasAltColor],
        ),
      ),
      padding: const EdgeInsets.fromLTRB(
        AppTheme.screenHPadding,
        72,
        AppTheme.screenHPadding,
        AppTheme.spaceLg,
      ),
      child: Column(
        children: [
          Semantics(
            label: 'Trimester 2',
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: AppTheme.chipBgColor,
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              ),
              child: Text(
                'TRIMESTER 2',
                style: textTheme.labelSmall?.copyWith(
                  color: AppTheme.lilacColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                  letterSpacing: 0.44,
                ),
              ),
            ),
          ),
          const SizedBox(height: AppTheme.spaceSm),
          Semantics(
            label: 'Week 22',
            child: Text(
              'Week 22',
              style: textTheme.displaySmall?.copyWith(
                color: AppTheme.coralColor,
                fontWeight: FontWeight.w800,
                fontSize: 36,
                height: 1.1,
                letterSpacing: -0.54,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Your baby is the size of a mango',
            style: textTheme.labelLarge?.copyWith(
              color: AppTheme.textSecondaryColor,
              fontWeight: FontWeight.w500,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: AppTheme.spaceMd),
          Expanded(
            child: Semantics(
              label: 'Illustration of baby development at week 22',
              child: _buildBabyIllustration(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBabyIllustration() {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 1.0, end: 1.015),
      duration: const Duration(seconds: 4),
      curve: Curves.easeInOut,
      builder: (context, scale, child) {
        return Transform.scale(scale: scale, child: child);
      },
      child: FractionallySizedBox(
        widthFactor: 0.7,
        child: CustomPaint(
          painter: _BabyIllustrationPainter(),
        ),
      ),
    );
  }
}

// ── Baby Illustration Painter ────────────────────────────────

class _BabyIllustrationPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height * 0.45;

    // Outer glow circle
    canvas.drawCircle(
      Offset(cx, cy),
      size.width * 0.325,
      Paint()..color = AppTheme.surfaceColor.withValues(alpha: 0.5),
    );

    // Body ellipse
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx, cy - 2),
        width: size.width * 0.45,
        height: size.width * 0.5,
      ),
      Paint()..color = AppTheme.canvasAltColor,
    );

    // Inner highlight
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx, cy - 4),
        width: size.width * 0.28,
        height: size.width * 0.32,
      ),
      Paint()..color = AppTheme.coralColor.withValues(alpha: 0.25),
    );

    // Eyes
    canvas.drawCircle(
      Offset(cx - 10, cy - 12),
      3.5,
      Paint()..color = AppTheme.textPrimaryColor.withValues(alpha: 0.55),
    );
    canvas.drawCircle(
      Offset(cx + 10, cy - 12),
      3.5,
      Paint()..color = AppTheme.textPrimaryColor.withValues(alpha: 0.55),
    );

    // Smile
    final smilePath = Path()
      ..moveTo(cx - 7, cy)
      ..quadraticBezierTo(cx, cy + 7, cx + 7, cy);
    canvas.drawPath(
      smilePath,
      Paint()
        ..color = AppTheme.textPrimaryColor.withValues(alpha: 0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..strokeCap = StrokeCap.round,
    );

    // Cheek blush
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx - 18, cy + 5),
        width: 12,
        height: 8,
      ),
      Paint()..color = AppTheme.coralColor.withValues(alpha: 0.2),
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx + 18, cy + 5),
        width: 12,
        height: 8,
      ),
      Paint()..color = AppTheme.coralColor.withValues(alpha: 0.2),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
