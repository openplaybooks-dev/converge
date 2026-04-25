import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import 'package:baby_watch/widgets/pulsing_halo.dart';

class AvatarWithShieldBadge extends StatelessWidget {
  const AvatarWithShieldBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    const double avatarSize = 128;
    const double haloSize = 152;
    const double badgeSize = 40;

    return SizedBox(
      width: haloSize,
      height: haloSize,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          PulsingHalo(
            size: haloSize,
            color: colorScheme.tertiaryContainer,
          ),
          Container(
            width: avatarSize,
            height: avatarSize,
            decoration: const BoxDecoration(shape: BoxShape.circle),
            clipBehavior: Clip.antiAlias,
            child: CachedNetworkImage(
              imageUrl:
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuCVq9tdpncLEkYm1ctPHgu7eFUvj4vxjI8TaVt1z7IClz4sutuWXcX_z9MOD7WjF-ir_so2ySpJMfrs5Bk7BPegSIVBEaupNHdssmp2qGhYHuyuV_IM0WNiNApW0EYxroPSOsc-KjBujQxr6ifudvUSUR5Z81DUt8m0LxHL0viQXv_-OhQexoGdrSs255JgrHtmnYEs-TI1bt3NPBWDreAwSvuHFcpUW3zpi_Cz1rSYImeh_zlTnBGaRVxVc7kxAKenLiyFvqgPrikH',
              fit: BoxFit.cover,
            ),
          ),
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: badgeSize,
              height: badgeSize,
              decoration: BoxDecoration(
                color: colorScheme.tertiary,
                shape: BoxShape.circle,
                border: Border.all(
                  color: colorScheme.surfaceContainerLowest,
                  width: 3,
                ),
              ),
              child: Icon(
                Icons.shield,
                size: 20,
                color: colorScheme.onTertiary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

