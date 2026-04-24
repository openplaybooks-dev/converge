import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'nav_item.dart';

class BottomNav extends StatelessWidget {
  const BottomNav({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.9),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.04),
            blurRadius: 32,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: SafeArea(
        child: Container(
          height: 80,
          padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceMd),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              NavItem(icon: Icons.home, label: 'Trang chủ', isSelected: false),
              NavItem(icon: Icons.devices, label: 'Thiết bị', isSelected: false),
              NavItem(icon: Icons.security, label: 'An toàn', isSelected: true),
              NavItem(icon: Icons.settings, label: 'Cài đặt', isSelected: false),
            ],
          ),
        ),
      ),
    );
  }
}