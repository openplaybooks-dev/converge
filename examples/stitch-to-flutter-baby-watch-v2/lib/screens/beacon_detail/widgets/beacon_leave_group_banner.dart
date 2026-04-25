import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class BeaconLeaveGroupBanner extends StatelessWidget {
  const BeaconLeaveGroupBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Stack(
      alignment: Alignment.bottomCenter,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: CachedNetworkImage(
            imageUrl:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDkCC1mUUdMBbcG43jp0NXjhGUJgZBZnoDHsM7_iFc-EfG3uEQFVaOvL0UR_qT77FPJahmZoPhbLVQKsUxna89EUxNfpEqqUR_JTEaiW5WQYdbiN_UMN56TK4a-dUJE0EgbPLHxpSWMJcyFpZ0QmCRlot-FGtn9L--9afU1S-3tdgMVs9nNecwargy14qaEbN_h1-F2bx8MJ4-PybBAVGaYtjonz1gSsyT15_k76tql1nHGtkmUTJN-wBRQ_5rQyP2CXypfXrYrz36J',
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          // @converge:element action:leave-group
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: colorScheme.surface,
              foregroundColor: colorScheme.error,
            ),
            onPressed: () {
              showDialog<void>(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Rời nhóm theo dõi'),
                  content: const Text(
                    'Bạn có chắc chắn muốn rời nhóm theo dõi này?',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Huỷ'),
                    ),
                  ],
                ),
              );
            },
            child: const Text('Rời nhóm theo dõi'),
          ),
        ),
      ],
    );
  }
}
