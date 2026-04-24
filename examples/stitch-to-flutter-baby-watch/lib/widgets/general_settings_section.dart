import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:folio/providers/theme_provider.dart';
import 'package:folio/theme/app_theme.dart';

class GeneralSettingsSection extends StatelessWidget {
  const GeneralSettingsSection({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: [
          BoxShadow(
            color: AppTheme.brandShadow,
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          _ThemeToggleRow(
            icon: Icons.dark_mode,
            label: 'Dark Mode',
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const Divider(height: 1),
          _GeneralButton(
            icon: Icons.security,
            label: 'System Permissions',
            showChevron: true,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const Divider(height: 1),
          _GeneralToggleRow(
            icon: Icons.do_not_disturb_on,
            label: 'Do Not Disturb',
            isOn: false,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
        ],
      ),
    );
  }
}

class _GeneralButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool showChevron;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _GeneralButton({
    required this.icon,
    required this.label,
    required this.showChevron,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppTheme.spaceMd),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.brandSurfaceContainer,
            ),
            child: Icon(icon, color: colorScheme.onSurfaceVariant, size: 20),
          ),
          const SizedBox(width: AppTheme.spaceMd),
          Expanded(
            child: Text(
              label,
              style: textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
          ),
          Icon(
            Icons.chevron_right,
            color: colorScheme.onSurfaceVariant,
            size: 24,
          ),
        ],
      ),
    );
  }
}

class _GeneralToggleRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isOn;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _GeneralToggleRow({
    required this.icon,
    required this.label,
    required this.isOn,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppTheme.spaceMd),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.brandSurfaceContainer,
            ),
            child: Icon(icon, color: colorScheme.onSurfaceVariant, size: 20),
          ),
          const SizedBox(width: AppTheme.spaceMd),
          Expanded(
            child: Text(
              label,
              style: textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
          ),
          Container(
            width: 48,
            height: 24,
            decoration: BoxDecoration(
              color: AppTheme.brandSurfaceContainer,
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            ),
            alignment: Alignment.centerLeft,
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colorScheme.surface,
                boxShadow: [
                  BoxShadow(
                    color: colorScheme.shadow.withValues(alpha: 0.1),
                    blurRadius: 2,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ThemeToggleRow extends ConsumerWidget {
  final IconData icon;
  final String label;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _ThemeToggleRow({
    required this.icon,
    required this.label,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeNotifierProvider);
    final isDark = themeMode == ThemeMode.dark;

    return InkWell(
      onTap: () => ref.read(themeNotifierProvider.notifier).toggle(),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spaceMd),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.brandSurfaceContainer,
              ),
              child: Icon(icon, color: colorScheme.onSurfaceVariant, size: 20),
            ),
            const SizedBox(width: AppTheme.spaceMd),
            Expanded(
              child: Text(
                label,
                style: textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
            ),
            Container(
              width: 48,
              height: 24,
              decoration: BoxDecoration(
                color: isDark ? colorScheme.primary : AppTheme.brandSurfaceContainer,
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              ),
              child: AnimatedAlign(
                alignment: isDark ? Alignment.centerRight : Alignment.centerLeft,
                duration: const Duration(milliseconds: 200),
                child: Container(
                  width: 16,
                  height: 16,
                  margin: EdgeInsets.only(left: isDark ? 0 : 2, right: isDark ? 2 : 0),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: colorScheme.surface,
                    boxShadow: [
                      BoxShadow(
                        color: colorScheme.shadow.withValues(alpha: 0.1),
                        blurRadius: 2,
                        offset: const Offset(0, 1),
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
