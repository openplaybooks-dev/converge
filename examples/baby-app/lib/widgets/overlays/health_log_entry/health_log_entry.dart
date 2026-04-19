import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Bottom-sheet overlay for creating a health log entry (visit, symptom, or reminder).
///
/// Returns a [Map] describing the entry via [Navigator.pop], or `null`
/// if dismissed without saving.
class HealthLogEntry extends StatefulWidget {
  const HealthLogEntry({super.key});

  @override
  State<HealthLogEntry> createState() => _HealthLogEntryState();
}

enum _EntryType { visit, symptom, reminder }

class _HealthLogEntryState extends State<HealthLogEntry> {
  _EntryType _selectedType = _EntryType.visit;
  DateTime _selectedDate = DateTime.now();

  // Visit fields
  final _doctorNameController = TextEditingController();
  final _summaryController = TextEditingController();
  final _notesController = TextEditingController();

  // Symptom fields
  String? _selectedSymptom;
  int _severity = 1;
  final _symptomNotesController = TextEditingController();

  // Reminder fields
  final _reminderTitleController = TextEditingController();

  static const _symptomTypes = [
    'Nausea',
    'Headache',
    'Fatigue',
    'Back Pain',
    'Cramps',
    'Swelling',
  ];

  @override
  void dispose() {
    _doctorNameController.dispose();
    _summaryController.dispose();
    _notesController.dispose();
    _symptomNotesController.dispose();
    _reminderTitleController.dispose();
    super.dispose();
  }

  bool get _canSave {
    switch (_selectedType) {
      case _EntryType.visit:
        return _summaryController.text.trim().isNotEmpty;
      case _EntryType.symptom:
        return _selectedSymptom != null;
      case _EntryType.reminder:
        return _reminderTitleController.text.trim().isNotEmpty;
    }
  }

  void _save() {
    if (!_canSave) return;

    final Map<String, dynamic> result;
    switch (_selectedType) {
      case _EntryType.visit:
        result = {
          'type': 'visit',
          'date': _selectedDate.toIso8601String(),
          'doctorName': _doctorNameController.text.isEmpty
              ? null
              : _doctorNameController.text,
          'summary': _summaryController.text,
          'notes':
              _notesController.text.isEmpty ? null : _notesController.text,
        };
      case _EntryType.symptom:
        result = {
          'type': 'symptom',
          'date': _selectedDate.toIso8601String(),
          'symptomType': _selectedSymptom,
          'severity': _severity,
          'notes': _symptomNotesController.text.isEmpty
              ? null
              : _symptomNotesController.text,
        };
      case _EntryType.reminder:
        result = {
          'type': 'reminder',
          'date': _selectedDate.toIso8601String(),
          'title': _reminderTitleController.text,
          'isDone': false,
        };
    }

    Navigator.pop(context, result);
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  String get _formattedDate {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return '${months[_selectedDate.month - 1]} ${_selectedDate.day}, ${_selectedDate.year}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
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
                  'New Entry',
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
                    // Entry Type Selector
                    Semantics(
                      label:
                          'Entry type. ${_selectedType.name} selected',
                      child: Row(
                        children: [
                          _TypeChip(
                            label: 'Visit',
                            selected: _selectedType == _EntryType.visit,
                            onTap: () => setState(
                              () => _selectedType = _EntryType.visit,
                            ),
                          ),
                          const SizedBox(width: AppTheme.spaceSm),
                          _TypeChip(
                            label: 'Symptom',
                            selected: _selectedType == _EntryType.symptom,
                            onTap: () => setState(
                              () => _selectedType = _EntryType.symptom,
                            ),
                          ),
                          const SizedBox(width: AppTheme.spaceSm),
                          _TypeChip(
                            label: 'Reminder',
                            selected: _selectedType == _EntryType.reminder,
                            onTap: () => setState(
                              () => _selectedType = _EntryType.reminder,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppTheme.spaceLg),

                    // Date Selector (shared across all types)
                    _buildLabel('Date', textTheme),
                    const SizedBox(height: AppTheme.spaceSm),
                    Semantics(
                      label: 'Select date. Currently $_formattedDate',
                      button: true,
                      child: GestureDetector(
                        onTap: _pickDate,
                        child: Container(
                          constraints: const BoxConstraints(minHeight: 44),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceTertiaryColor,
                            borderRadius:
                                BorderRadius.circular(AppTheme.radiusLg),
                            border: Border.all(
                              color: AppTheme.textPrimaryColor
                                  .withValues(alpha: 0.06),
                            ),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppTheme.screenHPadding,
                            vertical: AppTheme.spaceSm + 4,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _formattedDate,
                                  style: textTheme.bodySmall?.copyWith(
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

                    // Type-specific fields
                    ..._buildTypeFields(textTheme, colorScheme),

                    const SizedBox(height: AppTheme.spaceLg),

                    // Save Button
                    Semantics(
                      label: 'Save health log entry',
                      button: true,
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _canSave ? _save : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.coralColor,
                            foregroundColor: AppTheme.surfaceColor,
                            disabledBackgroundColor:
                                AppTheme.coralColor.withValues(alpha: 0.4),
                            disabledForegroundColor:
                                AppTheme.surfaceColor.withValues(alpha: 0.4),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                AppTheme.radiusFull,
                              ),
                            ),
                          ),
                          child: Text(
                            'Save',
                            style: textTheme.titleMedium?.copyWith(
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
      ),
    );
  }

  Widget _buildLabel(String text, TextTheme textTheme) {
    return Text(
      text,
      style: textTheme.bodySmall?.copyWith(
        fontWeight: FontWeight.w500,
        color: AppTheme.textSecondaryColor,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required String semanticsLabel,
    required TextTheme textTheme,
    required ColorScheme colorScheme,
    int maxLines = 1,
  }) {
    return Semantics(
      label: semanticsLabel,
      child: Container(
        constraints: BoxConstraints(minHeight: maxLines > 1 ? 56 : 44),
        decoration: BoxDecoration(
          color: AppTheme.surfaceTertiaryColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          border: Border.all(
            color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
          ),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.screenHPadding,
          vertical: AppTheme.spaceSm + 4,
        ),
        child: TextField(
          controller: controller,
          maxLines: maxLines,
          onChanged: (_) => setState(() {}),
          style: textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface,
          ),
          decoration: InputDecoration(
            border: InputBorder.none,
            isDense: true,
            contentPadding: EdgeInsets.zero,
            hintText: hint,
            hintStyle: textTheme.bodyMedium?.copyWith(
              color: AppTheme.textSecondaryColor.withValues(alpha: 0.7),
            ),
            filled: false,
          ),
        ),
      ),
    );
  }

  List<Widget> _buildTypeFields(
    TextTheme textTheme,
    ColorScheme colorScheme,
  ) {
    switch (_selectedType) {
      case _EntryType.visit:
        return [
          _buildLabel('Doctor Name (optional)', textTheme),
          const SizedBox(height: AppTheme.spaceSm),
          _buildTextField(
            controller: _doctorNameController,
            hint: 'Dr. ...',
            semanticsLabel: 'Doctor name',
            textTheme: textTheme,
            colorScheme: colorScheme,
          ),
          const SizedBox(height: AppTheme.spaceMd),
          _buildLabel('Summary', textTheme),
          const SizedBox(height: AppTheme.spaceSm),
          _buildTextField(
            controller: _summaryController,
            hint: 'Brief description of the visit...',
            semanticsLabel: 'Summary of the visit',
            textTheme: textTheme,
            colorScheme: colorScheme,
            maxLines: 2,
          ),
          const SizedBox(height: AppTheme.spaceMd),
          _buildLabel('Notes (optional)', textTheme),
          const SizedBox(height: AppTheme.spaceSm),
          _buildTextField(
            controller: _notesController,
            hint: 'Additional details...',
            semanticsLabel: 'Additional notes',
            textTheme: textTheme,
            colorScheme: colorScheme,
            maxLines: 3,
          ),
        ];
      case _EntryType.symptom:
        return [
          _buildLabel('Type', textTheme),
          const SizedBox(height: AppTheme.spaceSm),
          Wrap(
            spacing: AppTheme.spaceSm,
            runSpacing: AppTheme.spaceSm,
            children: _symptomTypes.map((type) {
              final selected = _selectedSymptom == type;
              return GestureDetector(
                onTap: () => setState(() => _selectedSymptom = type),
                child: Container(
                  constraints: const BoxConstraints(minHeight: 44),
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppTheme.spaceMd,
                    vertical: AppTheme.spaceSm,
                  ),
                  decoration: BoxDecoration(
                    color: selected
                        ? AppTheme.coralTintColor
                        : AppTheme.chipBgColor,
                    borderRadius:
                        BorderRadius.circular(AppTheme.radiusFull),
                  ),
                  child: Text(
                    type,
                    style: textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: selected
                          ? AppTheme.coralColor
                          : AppTheme.textSecondaryColor,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: AppTheme.spaceMd),
          _buildLabel('Severity', textTheme),
          const SizedBox(height: AppTheme.spaceSm),
          Row(
            children: [
              _SeverityChip(
                label: 'Mild',
                selected: _severity == 1,
                onTap: () => setState(() => _severity = 1),
                textTheme: textTheme,
              ),
              const SizedBox(width: AppTheme.spaceSm),
              _SeverityChip(
                label: 'Moderate',
                selected: _severity == 2,
                onTap: () => setState(() => _severity = 2),
                textTheme: textTheme,
              ),
              const SizedBox(width: AppTheme.spaceSm),
              _SeverityChip(
                label: 'Severe',
                selected: _severity == 3,
                onTap: () => setState(() => _severity = 3),
                textTheme: textTheme,
              ),
            ],
          ),
          const SizedBox(height: AppTheme.spaceMd),
          _buildLabel('Notes (optional)', textTheme),
          const SizedBox(height: AppTheme.spaceSm),
          _buildTextField(
            controller: _symptomNotesController,
            hint: 'Additional details...',
            semanticsLabel: 'Additional notes',
            textTheme: textTheme,
            colorScheme: colorScheme,
            maxLines: 3,
          ),
        ];
      case _EntryType.reminder:
        return [
          _buildLabel('Reminder', textTheme),
          const SizedBox(height: AppTheme.spaceSm),
          _buildTextField(
            controller: _reminderTitleController,
            hint: 'e.g. Glucose screening appointment',
            semanticsLabel: 'Reminder title',
            textTheme: textTheme,
            colorScheme: colorScheme,
          ),
        ];
    }
  }
}

class _TypeChip extends StatelessWidget {
  const _TypeChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spaceMd,
        ),
        decoration: BoxDecoration(
          color: selected ? AppTheme.coralTintColor : AppTheme.chipBgColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color:
                selected ? AppTheme.coralColor : AppTheme.textSecondaryColor,
          ),
        ),
      ),
    );
  }
}

class _SeverityChip extends StatelessWidget {
  const _SeverityChip({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.textTheme,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final TextTheme textTheme;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spaceMd,
          vertical: AppTheme.spaceSm,
        ),
        decoration: BoxDecoration(
          color: selected ? AppTheme.coralTintColor : AppTheme.chipBgColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color:
                selected ? AppTheme.coralColor : AppTheme.textSecondaryColor,
          ),
        ),
      ),
    );
  }
}
