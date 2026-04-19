import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Bottom-sheet overlay for logging a new menstrual cycle entry.
///
/// Returns a [Map] with keys `startDate` (DateTime), optionally `endDate`
/// (DateTime), `isIrregular` (bool), and `notes` (String) via
/// [Navigator.pop], or `null` if dismissed without saving.
class CycleEntry extends StatefulWidget {
  const CycleEntry({super.key});

  @override
  State<CycleEntry> createState() => _CycleEntryState();
}

class _CycleEntryState extends State<CycleEntry> {
  DateTime _startDate = DateTime.now();
  DateTime? _endDate;
  bool _isIrregular = false;
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _startDate = picked;
        if (_endDate != null && _endDate!.isBefore(picked)) {
          _endDate = null;
        }
      });
    }
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? _startDate,
      firstDate: _startDate,
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (picked != null) {
      setState(() => _endDate = picked);
    }
  }

  void _save() {
    Navigator.pop(context, {
      'startDate': _startDate,
      'endDate': _endDate,
      'isIrregular': _isIrregular,
      'notes': _notesController.text.isEmpty ? null : _notesController.text,
    });
  }

  String _formatDate(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    final inputBorder = BoxDecoration(
      color: AppTheme.surfaceTertiaryColor,
      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      border: Border.all(
        color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
      ),
    );

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.only(bottom: AppTheme.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            Padding(
              padding: const EdgeInsets.only(
                left: AppTheme.screenHPadding,
                right: AppTheme.screenHPadding,
                top: AppTheme.spaceMd,
                bottom: AppTheme.spaceLg,
              ),
              child: Text(
                'Log Cycle',
                style: textTheme.titleLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
              ),
            ),

            // Content
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Start Date Selector
                  Text(
                    'Start Date',
                    style: textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  Semantics(
                    label:
                        'Select cycle start date. Currently ${_formatDate(_startDate)}',
                    button: true,
                    child: InkWell(
                      onTap: _pickStartDate,
                      borderRadius:
                          BorderRadius.circular(AppTheme.radiusLg),
                      child: Container(
                        decoration: inputBorder,
                        constraints: const BoxConstraints(minHeight: 44),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.screenHPadding,
                          vertical: AppTheme.spaceSm + 4,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                _formatDate(_startDate),
                                style: textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w500,
                                  color: colorScheme.onSurface,
                                ),
                              ),
                            ),
                            const Icon(
                              Icons.calendar_today,
                              size: 20,
                              color: AppTheme.textSecondaryColor,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: AppTheme.spaceMd),

                  // End Date Selector
                  Text(
                    'End Date (optional)',
                    style: textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  Semantics(
                    label: _endDate != null
                        ? 'Select cycle end date. Currently ${_formatDate(_endDate!)}'
                        : 'Select cycle end date. Currently not set',
                    button: true,
                    child: InkWell(
                      onTap: _pickEndDate,
                      borderRadius:
                          BorderRadius.circular(AppTheme.radiusLg),
                      child: Container(
                        decoration: inputBorder,
                        constraints: const BoxConstraints(minHeight: 44),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.screenHPadding,
                          vertical: AppTheme.spaceSm + 4,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                _endDate != null
                                    ? _formatDate(_endDate!)
                                    : 'Select end date',
                                style: _endDate != null
                                    ? textTheme.bodyMedium?.copyWith(
                                        fontWeight: FontWeight.w500,
                                        color: colorScheme.onSurface,
                                      )
                                    : textTheme.bodyMedium?.copyWith(
                                        color: AppTheme.textSecondaryColor
                                            .withValues(alpha: 0.7),
                                      ),
                              ),
                            ),
                            const Icon(
                              Icons.calendar_today,
                              size: 20,
                              color: AppTheme.textSecondaryColor,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: AppTheme.spaceMd),

                  // Irregular Cycle Toggle
                  Semantics(
                    label:
                        'Mark cycle as irregular. Currently ${_isIrregular ? "on" : "off"}',
                    toggled: _isIrregular,
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Mark as irregular',
                            style: textTheme.labelLarge?.copyWith(
                              fontWeight: FontWeight.w500,
                              color: colorScheme.onSurface,
                            ),
                          ),
                        ),
                        Switch(
                          value: _isIrregular,
                          onChanged: (value) {
                            setState(() => _isIrregular = value);
                          },
                          activeThumbColor: AppTheme.surfaceColor,
                          activeTrackColor: AppTheme.lilacColor,
                          inactiveThumbColor: AppTheme.surfaceColor,
                          inactiveTrackColor: AppTheme.chipBgColor,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: AppTheme.spaceMd),

                  // Notes Field
                  Text(
                    'Notes (optional)',
                    style: textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  Semantics(
                    label: 'Optional notes',
                    child: Container(
                      decoration: inputBorder,
                      constraints: const BoxConstraints(minHeight: 56),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppTheme.screenHPadding,
                        vertical: AppTheme.spaceSm + 4,
                      ),
                      child: TextField(
                        controller: _notesController,
                        maxLines: 3,
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                        decoration: InputDecoration(
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                          hintText: 'Add a note...',
                          hintStyle: textTheme.bodyMedium?.copyWith(
                            color: AppTheme.textSecondaryColor
                                .withValues(alpha: 0.7),
                          ),
                          filled: false,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: AppTheme.spaceLg),

                  // Save Button
                  Semantics(
                    label: 'Save cycle entry',
                    button: true,
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _save,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.coralColor,
                          foregroundColor: AppTheme.surfaceColor,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(
                              AppTheme.radiusFull,
                            ),
                          ),
                        ),
                        child: Text(
                          'Save',
                          style: textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppTheme.surfaceColor,
                          ),
                        ),
                      ),
                    ),
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
