import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class WeightChartCard extends StatelessWidget {
  const WeightChartCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Semantics(
      label: 'Weight progress chart showing 6 entries',
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusHero),
          boxShadow: AppTheme.shadowProminent,
        ),
        padding: const EdgeInsets.all(AppTheme.spaceXl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Weight Trend',
              style: textTheme.titleLarge?.copyWith(
                color: AppTheme.textPrimaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 180,
              child: CustomPaint(
                size: const Size(double.infinity, 180),
                painter: _WeightChartPainter(),
              ),
            ),
          ],
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

// ── Weight Chart Painter ───────────────────────────────────

class _WeightChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final chartLeft = size.width * 0.13;
    final chartRight = size.width * 0.97;
    final chartTop = size.height * 0.12;
    final chartBottom = size.height * 0.78;
    final chartWidth = chartRight - chartLeft;
    final chartHeight = chartBottom - chartTop;

    // Grid lines
    final gridPaint = Paint()
      ..color = AppTheme.textPrimaryColor.withValues(alpha: 0.06)
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    for (var i = 0; i < 4; i++) {
      final y = chartTop + (chartHeight / 3) * i;
      _drawDashedLine(
        canvas,
        Offset(chartLeft, y),
        Offset(chartRight, y),
        gridPaint,
      );
    }

    // Y-axis labels
    const yLabels = ['62', '60', '58', '56'];
    for (var i = 0; i < yLabels.length; i++) {
      final y = chartTop + (chartHeight / 3) * i;
      _drawText(
        canvas,
        yLabels[i],
        Offset(chartLeft - 8, y),
        AppTheme.textSecondaryColor,
        9,
        TextAlign.right,
      );
    }

    // X-axis labels
    const xLabels = ['W15', 'W16', 'W17', 'W18', 'W19', 'W20'];
    for (var i = 0; i < xLabels.length; i++) {
      final x = chartLeft + (chartWidth / 5) * i;
      _drawText(
        canvas,
        xLabels[i],
        Offset(x, chartBottom + 14),
        AppTheme.textSecondaryColor,
        9,
        TextAlign.center,
      );
    }

    // Data points (weights mapped to chart coordinates)
    // Weight range: 56 to 62, chart range: chartBottom to chartTop
    const weights = [56.2, 56.8, 57.2, 57.6, 57.9, 58.3];
    const minW = 56.0;
    const maxW = 62.0;

    final points = <Offset>[];
    for (var i = 0; i < weights.length; i++) {
      final x = chartLeft + (chartWidth / 5) * i;
      final y = chartBottom -
          ((weights[i] - minW) / (maxW - minW)) * chartHeight;
      points.add(Offset(x, y));
    }

    // Gradient fill area
    final fillPath = Path()..moveTo(points.first.dx, points.first.dy);
    for (var i = 1; i < points.length; i++) {
      fillPath.lineTo(points[i].dx, points[i].dy);
    }
    fillPath.lineTo(points.last.dx, chartBottom);
    fillPath.lineTo(points.first.dx, chartBottom);
    fillPath.close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          AppTheme.lilacColor.withValues(alpha: 0.3),
          AppTheme.lilacColor.withValues(alpha: 0.0),
        ],
      ).createShader(
        Rect.fromLTRB(
          chartLeft,
          chartTop,
          chartRight,
          chartBottom,
        ),
      );
    canvas.drawPath(fillPath, fillPaint);

    // Line
    final linePaint = Paint()
      ..color = AppTheme.lilacColor
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final linePath = Path()..moveTo(points.first.dx, points.first.dy);
    for (var i = 1; i < points.length; i++) {
      linePath.lineTo(points[i].dx, points[i].dy);
    }
    canvas.drawPath(linePath, linePaint);

    // Data points
    final pointFill = Paint()..color = AppTheme.lilacColor;
    final pointStroke = Paint()
      ..color = AppTheme.surfaceColor
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    for (var i = 0; i < points.length - 1; i++) {
      canvas.drawCircle(points[i], 3, pointFill);
      canvas.drawCircle(points[i], 3, pointStroke);
    }

    // Active point (last)
    final last = points.last;
    canvas.drawCircle(last, 5, pointFill);
    canvas.drawCircle(last, 5, pointStroke);
    canvas.drawCircle(
      last,
      10,
      Paint()
        ..color = AppTheme.lilacColor.withValues(alpha: 0.3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );

    // Dashed line from active point to baseline
    _drawDashedLine(
      canvas,
      last,
      Offset(last.dx, chartBottom),
      Paint()
        ..color = AppTheme.lilacColor.withValues(alpha: 0.4)
        ..strokeWidth = 1,
    );

    // Value label bubble
    final bubbleRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(last.dx, last.dy - 16),
        width: 44,
        height: 18,
      ),
      const Radius.circular(9),
    );
    canvas.drawRRect(bubbleRect, Paint()..color = AppTheme.lilacColor);
    _drawText(
      canvas,
      '58.3',
      Offset(last.dx, last.dy - 16),
      AppTheme.surfaceColor,
      10,
      TextAlign.center,
    );
  }

  void _drawDashedLine(
    Canvas canvas,
    Offset start,
    Offset end,
    Paint paint,
  ) {
    const dashLen = 4.0;
    const gapLen = 4.0;
    final dx = end.dx - start.dx;
    final dy = end.dy - start.dy;
    final dist = (dx * dx + dy * dy);
    final totalDist = dist > 0
        ? (dx * dx + dy * dy) != 0
            ? Offset(dx, dy).distance
            : 0.0
        : 0.0;
    if (totalDist == 0) return;
    final ux = dx / totalDist;
    final uy = dy / totalDist;
    var drawn = 0.0;
    while (drawn < totalDist) {
      final segEnd =
          (drawn + dashLen).clamp(0, totalDist).toDouble();
      canvas.drawLine(
        Offset(start.dx + ux * drawn, start.dy + uy * drawn),
        Offset(start.dx + ux * segEnd, start.dy + uy * segEnd),
        paint,
      );
      drawn += dashLen + gapLen;
    }
  }

  void _drawText(
    Canvas canvas,
    String text,
    Offset position,
    Color color,
    double fontSize,
    TextAlign align,
  ) {
    final textPainter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
      textAlign: align,
    )..layout();

    final offset = Offset(
      position.dx - textPainter.width / 2,
      position.dy - textPainter.height / 2,
    );
    textPainter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
