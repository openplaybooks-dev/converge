import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class PulseAvatarBadge extends StatelessWidget {
  const PulseAvatarBadge({
    super.key,
    required this.animation,
  });

  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.brandGreenLight.withValues(
                  alpha: 0.2 * animation.value,
                ),
              ),
            ),
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.brandSurfaceContainer,
              ),
              child: ClipOval(
                child: Image.network(
                  'https://picsum.photos/seed/baby2/200/200',
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppTheme.brandGreen,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.shield,
                  size: 14,
                  color: colorScheme.surface,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
