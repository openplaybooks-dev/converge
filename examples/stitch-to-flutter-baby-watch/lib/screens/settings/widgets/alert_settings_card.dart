import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class AlertSettingsCard extends StatelessWidget {
  const AlertSettingsCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
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
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'TIMEOUT INTERVAL',
                    style: textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.05,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.brandGreenLight,
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                    child: Text(
                      'Recommended',
                      style: textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.brandGreen,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _TimeoutButton(
                      label: '2 min',
                      isSelected: true,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _TimeoutButton(
                      label: '5 min',
                      isSelected: false,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _TimeoutButton(
                      label: '10 min',
                      isSelected: false,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 32),
          _ToggleRow(
            icon: Icons.volume_up,
            label: 'Audio Alert',
            isOn: true,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const SizedBox(height: AppTheme.spaceMd),
          _ToggleRow(
            icon: Icons.vibration,
            label: 'Vibration',
            isOn: true,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
        ],
      ),
    );
  }
}

class _TimeoutButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _TimeoutButton({
    required this.label,
    required this.isSelected,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: isSelected ? colorScheme.surfaceContainer : AppTheme.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: colorScheme.shadow.withValues(alpha: 0.05),
                  blurRadius: 2,
                  offset: const Offset(0, 1),
                ),
              ]
            : null,
      ),
      child: Center(
        child: Text(
          label,
          style: textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: isSelected
                ? colorScheme.onSurface
                : colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isOn;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _ToggleRow({
    required this.icon,
    required this.label,
    required this.isOn,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
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
            Text(
              label,
              style: textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
          ],
        ),
        Container(
          width: 48,
          height: 24,
          decoration: BoxDecoration(
            color: colorScheme.onSurface,
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          ),
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: colorScheme.surface,
            ),
          ),
        ),
      ],
    );
  }
}
