import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppNavBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final bool showBackButton;
  final List<Widget>? actions;
  final Widget? leading;
  final double? leadingWidth;

  const AppNavBar({
    super.key,
    required this.title,
    this.showBackButton = false,
    this.actions,
    this.leading,
    this.leadingWidth,
  });

  @override
  Size get preferredSize => const Size.fromHeight(80);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: Theme.of(context).colorScheme.surface,
      elevation: 0,
      scrolledUnderElevation: 0,
      toolbarHeight: 80,
      leadingWidth: leadingWidth,
      leading: leading ??
          (showBackButton
              ? IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => context.pop(),
                )
              : null),
      title: Text(
        title,
        style: const TextStyle(
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 20,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.02,
        ),
      ),
      centerTitle: false,
      actions: actions,
    );
  }
}
