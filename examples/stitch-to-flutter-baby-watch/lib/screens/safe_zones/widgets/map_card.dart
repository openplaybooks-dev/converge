import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../theme/app_theme.dart';

class MapCard extends StatelessWidget {
  const MapCard({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      color: colorScheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Column(
        children: [
          AspectRatio(
            aspectRatio: 4 / 3,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CachedNetworkImage(
                  imageUrl: 'https://picsum.photos/seed/map2/400/300',
                  fit: BoxFit.cover,
                  color: colorScheme.surface,
                  colorBlendMode: BlendMode.srcATop,
                ),
                // Safe zone circles
                Center(
                  child: SizedBox(
                    width: 192,
                    height: 192,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Positioned(
                          top: 0,
                          left: 0,
                          child: Container(
                            width: 128,
                            height: 128,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color:
                                    colorScheme.tertiary.withValues(alpha: 0.3),
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 16,
                          right: 0,
                          child: Container(
                            width: 112,
                            height: 112,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: colorScheme.onSurface
                                    .withValues(alpha: 0.15),
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 40,
                          right: 16,
                          child: Container(
                            width: 96,
                            height: 96,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: colorScheme.tertiaryContainer,
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                        // Baby marker
                        Center(
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: colorScheme.onSurface,
                                  shape: BoxShape.circle,
                                ),
                                padding: const EdgeInsets.all(2),
                                child: ClipOval(
                                  child: CachedNetworkImage(
                                    imageUrl:
                                        'https://picsum.photos/seed/baby1/100/100',
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              Positioned(
                                bottom: -4,
                                child: Transform.rotate(
                                  angle: 0.785,
                                  child: Container(
                                    width: 12,
                                    height: 12,
                                    color: colorScheme.onSurface,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // Glassmorphism overlay
                Positioned(
                  bottom: AppTheme.spaceMd,
                  left: AppTheme.spaceMd,
                  right: AppTheme.spaceMd,
                  child: Container(
                    padding: const EdgeInsets.all(AppTheme.spaceMd),
                    decoration: BoxDecoration(
                      color: colorScheme.surface.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.verified_user,
                          color: colorScheme.tertiary,
                          size: 20,
                          fill: 1,
                        ),
                        const SizedBox(width: AppTheme.spaceSm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Tracking Active',
                                style: textTheme.labelSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: colorScheme.onSurface,
                                ),
                              ),
                              Text(
                                '3 Active Zones Monitored',
                                style: textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppTheme.spaceSm,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: colorScheme.tertiaryContainer,
                            borderRadius:
                                BorderRadius.circular(AppTheme.radiusFull),
                          ),
                          child: Text(
                            'LIVE',
                            style: textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: colorScheme.tertiary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.05);
  }
}
