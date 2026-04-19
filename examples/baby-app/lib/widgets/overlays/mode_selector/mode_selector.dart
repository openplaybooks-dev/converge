import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Mode options available in the app.
enum TrackingMode {
  pregnancy,
  wellness,
  postpartum,
}

/// Bottom-sheet overlay for switching between tracking modes.
///
/// Returns the selected [TrackingMode] via [Navigator.pop], or `null`
/// if dismissed without selection.
class ModeSelector extends StatelessWidget {
  const ModeSelector({
    super.key,
    this.currentMode = TrackingMode.pregnancy,
  });

  final TrackingMode currentMode;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.only(bottom: AppTheme.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 9.2 Title
            Padding(
              padding: const EdgeInsets.only(
                top: AppTheme.spaceMd,
                bottom: AppTheme.spaceLg,
              ),
              child: Text(
                'Select Mode',
                style: textTheme.titleLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
                textAlign: TextAlign.center,
              ),
            ),

            // 9.3 Mode Options List
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
              ),
              child: Column(
                children: [
                  _ModeOption(
                    icon: Icons.pregnant_woman,
                    iconColor: AppTheme.coralColor,
                    label: 'Pregnancy Mode',
                    description: 'Track your pregnancy week by week',
                    isSelected: currentMode == TrackingMode.pregnancy,
                    selectedTint: AppTheme.coralTintColor,
                    onTap: () => Navigator.pop(context, TrackingMode.pregnancy),
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  _ModeOption(
                    icon: Icons.self_improvement,
                    iconColor: AppTheme.lilacColor,
                    label: 'Wellness Mode',
                    description: 'General health and cycle tracking',
                    isSelected: currentMode == TrackingMode.wellness,
                    selectedTint: AppTheme.lilacTintColor,
                    onTap: () => Navigator.pop(context, TrackingMode.wellness),
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  _ModeOption(
                    icon: Icons.child_care,
                    iconColor: AppTheme.coralColor,
                    label: 'Postpartum Mode',
                    description: 'Recovery and newborn care tracking',
                    isSelected: currentMode == TrackingMode.postpartum,
                    selectedTint: AppTheme.coralTintColor,
                    onTap: () =>
                        Navigator.pop(context, TrackingMode.postpartum),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModeOption extends StatelessWidget {
  const _ModeOption({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.description,
    required this.isSelected,
    required this.selectedTint,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String description;
  final bool isSelected;
  final Color selectedTint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Semantics(
      label: 'Select $label. $description',
      selected: isSelected,
      button: true,
      child: Material(
        color: isSelected ? selectedTint : colorScheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
                vertical: AppTheme.spaceMd,
              ),
              child: Row(
                children: [
                  Icon(
                    icon,
                    size: 24,
                    color: iconColor,
                  ),
                  const SizedBox(width: AppTheme.cardSpacing),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          description,
                          style: textTheme.bodySmall?.copyWith(
                            color: AppTheme.textSecondaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isSelected)
                    Icon(
                      Icons.check,
                      size: 20,
                      color: iconColor,
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
