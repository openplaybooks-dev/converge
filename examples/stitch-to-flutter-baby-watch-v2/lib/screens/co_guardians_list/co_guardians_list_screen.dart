import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../overlays/invite_accept/invite_accept.dart';
import '../../theme/app_spacing.dart';
import 'widgets/invitation_card.dart';
import 'widgets/system_status_footer.dart';

// SCOPE: phase-2 — co-guardian flow not in realdevice playbook.

class CoGuardiansListScreen extends ConsumerWidget {
  const CoGuardiansListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        titleSpacing: 0,
        leading:
            // @converge:element navigate:back
            IconButton(
          icon: const Icon(Icons.close),
          color: colorScheme.onSurface,
          tooltip: 'Đóng',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/devices');
            }
          },
        ),
        title: Text(
          'BabyGuard',
          style: textTheme.titleLarge?.copyWith(color: colorScheme.onSurface),
        ),
        actions: [
          // @converge:element action:open-invite-accept
          TextButton.icon(
            onPressed: () async {
              final result = await showDialog<InviteAcceptResult>(
                context: context,
                barrierDismissible: false,
                useRootNavigator: true,
                builder: (_) => const InviteAccept(),
              );
              if (!context.mounted) return;
              switch (result ?? InviteAcceptResult.dismissed) {
                case InviteAcceptResult.accepted:
                  context.go('/devices');
                  break;
                case InviteAcceptResult.declined:
                  context.go('/home');
                  break;
                case InviteAcceptResult.dismissed:
                  break;
              }
            },
            icon: Icon(Icons.person_add, color: colorScheme.onSurface),
            label: Text(
              'Mời người',
              style:
                  textTheme.labelLarge?.copyWith(color: colorScheme.onSurface),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
        ],
      ),
      body: const SingleChildScrollView(
        padding: EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        child: InvitationCard(),
      ),
      bottomNavigationBar: const SystemStatusFooter(),
    );
  }
}
