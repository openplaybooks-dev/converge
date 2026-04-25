import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_spacing.dart';

class LastLocationMapCard extends StatelessWidget {
  const LastLocationMapCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Card(
      color: colorScheme.surfaceContainerLowest,
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          CachedNetworkImage(
            imageUrl:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuBhzdtV7nQE09FxOx0ifZvhCuQLcaF2XK12AwG7o7XEYsinL1Wf6vpCrPJTIVBl0vj9UKAuTLsCVZZcqDpjfr54GLJWUP9-Cq7FUH9l3Mfgc3I7cPbsMwERZipBQhZXYWsF-D51L8Hv6w7nWuCyIUpenJ3884lejoCT_dRf12wDviPSHmfFgRSZU7oNZCmqpdBPAz4eVHgeuQK02oS73ROjO7YnazB5oyB3r5wUcPeLf00-5L9IxdijYnbaXDXr4tzep_69hv4DKV81',
            fit: BoxFit.cover,
            width: double.infinity,
            height: 240,
          ),
          Positioned.fill(
            child: Align(
              alignment: Alignment.center,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: colorScheme.error.withValues(alpha: 0.3),
                      shape: BoxShape.circle,
                    ),
                  ).animate(
                    onPlay: (c) => c.repeat(reverse: true),
                  ).fadeIn(duration: 800.ms).scale(
                        duration: 800.ms,
                        begin: const Offset(0.8, 0.8),
                        end: const Offset(1.2, 1.2),
                      ),
                  const CircleAvatar(
                    radius: 20,
                    backgroundImage: CachedNetworkImageProvider(
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuB9Y0Q3uB_YV4_HhTq3T7vU6B_V8W4_H9T6vU3B_W4_T7vU6B_V8W4_H9T6vU3B_W4_T7vU6B_V8W4_H9T6vU3B_W4_T7vU6B_V8W4_H9T6vU3B_W4_T7vU6B_V8W4_H9T6vU3B_W4_T7vU6B_V8W4_H9T6vU3B_W4_T7vU6B_V8W4_H9T6vU3B_W4_',
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: AppSpacing.sm,
            bottom: AppSpacing.sm,
            child: Card(
              color: colorScheme.surfaceContainerLowest,
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                child: Text(
                  'Vị trí cuối cùng: 2 phút trước',
                  style: textTheme.labelSmall
                      ?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
