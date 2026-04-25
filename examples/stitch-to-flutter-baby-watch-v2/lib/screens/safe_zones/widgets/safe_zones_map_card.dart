import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class SafeZonesMapCard extends StatelessWidget {
  const SafeZonesMapCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(AppRadius.md),
          boxShadow: const [
            BoxShadow(
              color: Color(0x66E7E3DC),
              offset: Offset(0, 8),
              blurRadius: 24,
            ),
          ],
        ),
        child: SizedBox(
          height: 256,
          width: double.infinity,
          child: Stack(
            children: [
              // Map background
              Positioned.fill(
                child: ColorFiltered(
                  colorFilter: const ColorFilter.matrix(<double>[
                    0.7, 0.2, 0.1, 0, 0, //
                    0.2, 0.7, 0.1, 0, 0, //
                    0.1, 0.2, 0.7, 0, 0, //
                    0, 0, 0, 0.6, 0, //
                  ]),
                  child: CachedNetworkImage(
                    imageUrl:
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuCP3WAqpEniQ7Z6u5lJcCIE6RJvIlgiYl7ubjE8qKiFJS0Xqd5bw2ABeepRagTr86Hfjez7C19sQO_XNfVtLuoX6aRh9O97AFVw2pKcGNkldyDm2NXRkjyDZ2f8mECaQwSadLqiTkU329PTy2aCSySXlyYIEe5E8IVW8AoJ2ZtSyFHCSAC9EbhZrwxudrCLEcgD_WtJmYZ_cA5GL9vMS3CzU9X3bXXAtqmEnGjOxewkg1nmiq4L9FEIhdWkzeutPDCiWC1APpqduZsf',
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(
                      color: colorScheme.surfaceContainer,
                    ),
                    errorWidget: (_, __, ___) => Container(
                      color: colorScheme.surfaceContainer,
                    ),
                  ),
                ),
              ),

              // Overlapping safe zone circles + baby marker
              const Center(
                child: SizedBox(
                  width: 192,
                  height: 192,
                  child: _SafeZoneOverlay(),
                ),
              ),

              // Glassmorphism status bar
              Positioned(
                left: AppSpacing.md,
                right: AppSpacing.md,
                bottom: AppSpacing.md,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.sm,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.8),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.verified_user,
                            color: colorScheme.tertiary,
                            size: 24,
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Tracking Active',
                                  style: textTheme.labelSmall?.copyWith(
                                    color: colorScheme.onSurface,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                                Text(
                                  '3 Active Zones Monitored',
                                  style: textTheme.labelSmall?.copyWith(
                                    color: colorScheme.onSurfaceVariant,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.sm + 2,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: colorScheme.tertiaryContainer,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.full),
                            ),
                            child: Text(
                              'LIVE',
                              style: textTheme.labelSmall?.copyWith(
                                color: colorScheme.tertiary,
                                fontWeight: FontWeight.w700,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
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

class _SafeZoneOverlay extends StatelessWidget {
  const _SafeZoneOverlay();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    const tertiaryDim = Color(0xFF435752);

    return Stack(
      children: [
        // Zone A — top-left
        Positioned(
          top: 0,
          left: 0,
          child: _ZoneCircle(
            size: 128,
            fillColor: colorScheme.tertiary.withValues(alpha: 0.2),
            borderColor: colorScheme.tertiary,
          ),
        ),
        // Zone B — bottom-right
        Positioned(
          bottom: 16,
          right: 0,
          child: _ZoneCircle(
            size: 112,
            fillColor: colorScheme.primary.withValues(alpha: 0.1),
            borderColor: colorScheme.primary.withValues(alpha: 0.3),
          ),
        ),
        // Zone C — top-right
        Positioned(
          top: 40,
          right: 16,
          child: _ZoneCircle(
            size: 96,
            fillColor: const Color(0xFFD1E7E0).withValues(alpha: 0.4),
            borderColor: tertiaryDim,
          ),
        ),
        // Baby marker
        const Center(child: _BabyMarker()),
      ],
    );
  }
}

class _ZoneCircle extends StatelessWidget {
  const _ZoneCircle({
    required this.size,
    required this.fillColor,
    required this.borderColor,
  });

  final double size;
  final Color fillColor;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: fillColor,
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: 2),
      ),
    );
  }
}

class _BabyMarker extends StatelessWidget {
  const _BabyMarker();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SizedBox(
      width: 40,
      height: 48,
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          Container(
            width: 40,
            height: 40,
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: colorScheme.onSurface,
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(
                  color: Color(0x33000000),
                  blurRadius: 16,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: ClipOval(
              child: CachedNetworkImage(
                imageUrl:
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuCz-clyJYBlQmqBRUaSg7q3rYd_pc-LnKXy_AJqyydyBnCBfsrVJwtukLiV60vScbG-IzvwYR-QhS76dNToeZY5kA0OTPTospWDBa1-tBphK7QA-Amrl9pL7f-OpoLJL5nzuexwWEqOUrq8KWpjWlzPwJgiUSzPWvOOTR7FuywdWRJ_DPr5Yv9_lpWtHLxB1vtGcfQwqtxVUZExmTYcxypfZKjGDLwrYNrTTYHiqN1Yhnu8WLuA82zbkyzTESsjO2SS5SxskJT6MQD3',
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(
                  color: colorScheme.surfaceContainerHigh,
                ),
                errorWidget: (_, __, ___) => Container(
                  color: colorScheme.surfaceContainerHigh,
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            child: Transform.rotate(
              angle: 0.7853981633974483, // 45deg
              child: Container(
                width: 12,
                height: 12,
                color: colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
