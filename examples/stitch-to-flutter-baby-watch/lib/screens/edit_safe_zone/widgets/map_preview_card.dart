import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

class MapPreviewCard extends StatelessWidget {
  const MapPreviewCard({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: const [
          BoxShadow(
            color: AppTheme.brandShadow,
            blurRadius: 24,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: Container(
          height: 192,
          color: AppTheme.brandSurfaceContainer,
          child: Stack(
            children: [
              Positioned.fill(
                child: Image.network(
                  'https://picsum.photos/seed/map4/400/200',
                  fit: BoxFit.cover,
                  color: AppTheme.brandImageOverlay,
                  colorBlendMode: BlendMode.darken,
                ),
              ),
              Center(
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.brandGreen.withValues(alpha: 0.2),
                    border: Border.all(
                      color: AppTheme.brandGreen,
                      width: 2,
                    ),
                  ),
                ),
              ),
              Positioned(
                right: 16,
                bottom: 16,
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: colorScheme.surface,
                    boxShadow: const [
                      BoxShadow(
                        color: AppTheme.brandShadowDark,
                        blurRadius: 8,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Icon(
                    Icons.my_location,
                    color: AppTheme.brandGreen,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
