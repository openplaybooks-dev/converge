import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AddBeaconBottomNav extends StatelessWidget {
  const AddBeaconBottomNav({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return BottomAppBar(
      color: colorScheme.surfaceContainerLowest,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          // @converge:element navigate:home
          IconButton(
            onPressed: () => context.go('/home'),
            tooltip: 'Trang chủ',
            icon: Icon(
              Icons.home,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          // @converge:element navigate:devices
          IconButton(
            onPressed: () => context.go('/devices'),
            tooltip: 'Thiết bị',
            icon: Icon(
              Icons.devices,
              color: colorScheme.primary,
            ),
          ),
          // @converge:element navigate:safety
          IconButton(
            onPressed: () => context.go('/safe-zones'),
            tooltip: 'An toàn',
            icon: Icon(
              Icons.security,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          // @converge:element navigate:settings
          IconButton(
            onPressed: () => context.go('/settings'),
            tooltip: 'Cài đặt',
            icon: Icon(
              Icons.settings,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
