import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class AlertMapCard extends StatelessWidget {
  const AlertMapCard({super.key});

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
          AspectRatio(
            aspectRatio: 16 / 10,
            child: CachedNetworkImage(
              imageUrl:
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuClLDeh_glbBXLnz8njNNM8bx_WHce4UUCtSJMDeBDVfeooh1NAGffddo-akQ_Qrja64ZeM2gkoZ5qm_EnQpfftJX1YfDPuQworYRc5C6AWm7vbV-ez5Upx6vXHmbblz7256u2X2ChGOFTP7MMnE3BsqqYnlIoB1IQWyqQsTahlLPvaflpdRLUU-uNW0EUPqfx92g7yLsY6phPr3Bsqf2U8V5eyK3rwYHzw7IA--Ay2xubMAMeAa4TLqit7uXRNJTvAQawCiqWtc6ZR',
              fit: BoxFit.cover,
            ),
          ),
          Align(
            alignment: Alignment.center,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    color: colorScheme.error.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                ),
                const CircleAvatar(
                  radius: 32,
                  backgroundImage: CachedNetworkImageProvider(
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuD8eDzHZAxj2_6I_l-3CZcMiz-Ux6kegNIi95nIlGRbZuShU-I1W5dkN5sRR_HM0Yhqywf9NXQCzI4_ATqVPd5ivE_tT0us6EeELP47Aafcu0t9aSLwSWYfPZ7u4GuTC0Hsaxr0dcch3Kw7WjBgnce0tm5ID79nNsqxoscss9cMd5fmGWHVylyqX_b2Ut5_O1-HAPFbCTz8w0B_Fm0I3iBzL1Hq12X4rTz9Qy1t-H4GnoT8ZpIUxga0H-Vk8Peem1f6AJrAkYAU5M2N',
                  ),
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.xs),
                    decoration: BoxDecoration(
                      color: colorScheme.error,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.warning,
                      size: 16,
                      color: colorScheme.onError,
                    ),
                  ),
                ),
              ],
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
                            'Cảnh báo vị trí',
                            style: textTheme.labelSmall
                                ?.copyWith(color: colorScheme.error),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            'Công viên Lê Văn Tám',
                            style: textTheme.titleSmall?.copyWith(
                                color: colorScheme.onSurface),
                          ),
                        ],
                      ),
                    ),
                    // @converge:element action:locate-beacon
                    IconButton(
                      style: IconButton.styleFrom(
                        backgroundColor: colorScheme.error,
                        foregroundColor: colorScheme.onError,
                      ),
                      icon: const Icon(Icons.near_me),
                      tooltip: 'Định vị beacon',
                      onPressed: () {
                        showModalBottomSheet(
                          context: context,
                          builder: (_) => const Placeholder(),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
