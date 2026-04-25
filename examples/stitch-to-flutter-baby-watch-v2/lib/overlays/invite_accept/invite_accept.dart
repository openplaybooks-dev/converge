import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import '../../theme/app_spacing.dart';
import '../../widgets/info_row.dart';
import '../../widgets/inviter_chip.dart';
import '../../widgets/pulsing_halo.dart';

enum InviteAcceptResult { accepted, declined, dismissed }

Future<InviteAcceptResult> showInviteAcceptDialog(BuildContext context) async {
  final result = await showDialog<InviteAcceptResult>(
    context: context,
    barrierDismissible: false,
    useRootNavigator: true,
    builder: (_) => const InviteAccept(),
  );
  return result ?? InviteAcceptResult.dismissed;
}

class InviteAccept extends StatefulWidget {
  const InviteAccept({super.key});

  @override
  State<InviteAccept> createState() => _InviteAcceptState();
}

class _InviteAcceptState extends State<InviteAccept> {
  final FocusNode _acceptFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _acceptFocus.requestFocus();
      SemanticsService.sendAnnouncement(
        View.of(context),
        'Lời mời theo dõi Bé Na',
        TextDirection.ltr,
      );
    });
  }

  @override
  void dispose() {
    _acceptFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Dialog(
      backgroundColor: colorScheme.surfaceContainerLowest,
      insetPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xl,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Semantics(
          label: 'Lời mời theo dõi từ Mẹ',
          container: true,
          scopesRoute: true,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const _DialogAvatar(),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Bé Na',
                      style: textTheme.headlineLarge
                          ?.copyWith(color: colorScheme.onSurface),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Flexible(
                          child: Text(
                            'Mẹ đã mời bạn',
                            style: textTheme.bodyMedium?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        InviterChip(
                          label: 'Người sở hữu',
                          background: colorScheme.surfaceContainerHigh,
                          foreground: colorScheme.onSurfaceVariant,
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    InfoRow(
                      icon: Icons.notifications_active,
                      iconColor: colorScheme.tertiary,
                      iconBackground: colorScheme.tertiaryContainer,
                      body:
                          'Bằng cách chấp nhận, bạn sẽ nhận được thông báo khi beacon này mất kết nối',
                    ),
                    const SizedBox(height: AppSpacing.md),
                    InfoRow(
                      icon: Icons.group_off,
                      iconColor: colorScheme.secondary,
                      iconBackground: colorScheme.surfaceContainerHigh,
                      body: 'Bạn có thể rời nhóm theo dõi bất kỳ lúc nào',
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    // @converge:element action:accept-invitation
                    Semantics(
                      button: true,
                      label: 'Chấp nhận lời mời',
                      child: FilledButton(
                        focusNode: _acceptFocus,
                        autofocus: true,
                        onPressed: () => Navigator.of(context)
                            .pop(InviteAcceptResult.accepted),
                        style: FilledButton.styleFrom(
                          backgroundColor: colorScheme.onSurface,
                          foregroundColor: colorScheme.surface,
                          minimumSize: const Size.fromHeight(56),
                          shape: const StadiumBorder(),
                        ),
                        child: Text(
                          'Chấp nhận',
                          style: textTheme.labelLarge
                              ?.copyWith(color: colorScheme.surface),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    // @converge:element action:decline-invitation
                    Semantics(
                      button: true,
                      label: 'Từ chối lời mời',
                      child: TextButton(
                        onPressed: () => Navigator.of(context)
                            .pop(InviteAcceptResult.declined),
                        style: TextButton.styleFrom(
                          foregroundColor: colorScheme.onSurfaceVariant,
                          minimumSize: const Size.fromHeight(56),
                          shape: const StadiumBorder(),
                        ),
                        child: Text(
                          'Từ chối',
                          style: textTheme.labelLarge
                              ?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                color: colorScheme.surfaceContainerLow,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.md,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.verified_user,
                      size: 16,
                      color: colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Flexible(
                      child: Text(
                        'Bảo mật bởi hệ thống mã hóa BabyGuard',
                        style: textTheme.labelSmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
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
    );
  }
}

class _DialogAvatar extends StatelessWidget {
  const _DialogAvatar();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    const double avatarSize = 96;
    const double haloSize = 116;
    const double badgeSize = 32;

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
                size: 18,
                color: colorScheme.onTertiary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
