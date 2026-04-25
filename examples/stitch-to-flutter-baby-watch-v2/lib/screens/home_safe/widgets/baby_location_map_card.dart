import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_spacing.dart';

class BabyLocationMapCard extends StatelessWidget {
  const BabyLocationMapCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Card(
      color: colorScheme.surfaceContainerLowest,
      clipBehavior: Clip.antiAlias,
      child: SizedBox(
        height: 280,
        child: Stack(
          children: [
            Positioned.fill(
              child: CachedNetworkImage(
                imageUrl:
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuC_6MZ0wh_8xIFXdyD3lL0lHjtSsUeecgov4GE8R_V1SgVBcnlfMekcovUvyJIPZ0HHgqb9hWeDwpwJQurnCxiqFWUI3V_cs8cthvP6heT-lTOkjQVI2JsmjVbwK60c1R1J-z11rI2bTAuem9kKuyUd55M9QlC9dZp3TJ1FQ93eDyxutIgUf3PEsZJN0OWpX8-guHfiQ5JpjrkTR4RPqSneEbdoRdFbL7YQCpxS4ZqZrqO2Oolj9N5oyAsTIEjObRBdyikootSg9g5p',
                fit: BoxFit.cover,
              ),
            ),
            Center(
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.child_care,
                  size: 24,
                  color: colorScheme.onPrimary,
                ),
              ).animate(onPlay: (c) => c.repeat()).fadeIn(
                    duration: const Duration(milliseconds: 800),
                  ),
            ),
            Positioned(
              left: AppSpacing.md,
              right: AppSpacing.md,
              bottom: AppSpacing.md,
              child: Card(
                color: colorScheme.surfaceContainerLowest,
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'VỊ TRÍ GẦN NHẤT',
                              style: textTheme.labelSmall?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              'Phòng khách • 2 phút trước',
                              style: textTheme.titleSmall?.copyWith(
                                color: colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // @converge:element action:locate-beacon
                      IconButton.filled(
                        onPressed: () {
                          showModalBottomSheet<void>(
                            context: context,
                            builder: (_) => const Placeholder(),
                          );
                        },
                        tooltip: 'Định vị beacon',
                        style: IconButton.styleFrom(
                          backgroundColor: colorScheme.primary,
                          foregroundColor: colorScheme.onPrimary,
                        ),
                        icon: const Icon(Icons.near_me, size: 24),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
