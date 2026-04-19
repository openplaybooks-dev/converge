---
name: flutter-improving-accessibility
description: Configures a Flutter app to support assistive technologies like Screen Readers. Use when ensuring an application is usable for people with disabilities.
---
# Implementing Flutter Accessibility

## Contents
- [UI Design and Styling](#ui-design-and-styling)
- [Accessibility Widgets](#accessibility-widgets)
- [Workflows](#workflows)
- [Examples](#examples)

## UI Design and Styling

Design layouts to accommodate dynamic scaling and high visibility. Flutter automatically calculates font sizes based on OS-level accessibility settings.

* **Font Scaling:** Ensure layouts provide sufficient room to render all contents when font sizes are increased to maximum OS settings. Avoid hardcoding fixed heights on text containers.
* **Color Contrast:** Maintain a contrast ratio of at least 4.5:1 for small text and 3.0:1 for large text (18pt+ regular or 14pt+ bold) to meet W3C standards.
* **Tap Targets:** Enforce a minimum tap target size of 48x48 logical pixels to accommodate users with limited dexterity.

## Accessibility Widgets

Utilize Flutter's accessibility widgets to manipulate the semantics tree exposed to assistive technologies (TalkBack, VoiceOver).

* **`Semantics`**: Annotate the widget tree with descriptions of widget meaning. Assign specific roles using `SemanticsRole` enum (e.g., button, link, heading) for custom components.
* **`MergeSemantics`**: Wrap composite widgets to merge semantics of all descendants into a single selectable node for screen readers.
* **`ExcludeSemantics`**: Drop semantics of all descendants, hiding redundant or decorative sub-widgets from accessibility tools.

## Workflows

### Accessibility Implementation Checklist
- [ ] Verify all interactive elements have a minimum tap target of 48x48 pixels.
- [ ] Test layout with maximum OS font size settings — no text clipping or overflow.
- [ ] Validate color contrast ratios (4.5:1 for normal text, 3.0:1 for large text).
- [ ] Wrap custom interactive widgets in `Semantics` with appropriate `SemanticsRole`.
- [ ] Group complex composite widgets using `MergeSemantics`.
- [ ] Hide decorative elements from screen readers using `ExcludeSemantics`.

### Accessibility Validation Loop
1. Execute accessibility tests or use OS screen readers (VoiceOver/TalkBack) to navigate the view.
2. Identify unannounced interactive elements, trapped focus, or clipped text.
3. Apply `Semantics`, adjust constraints, or modify colors. Repeat until screen reader provides clear traversal.

## Examples

### Custom Component Semantics

```dart
class CustomListItem extends StatelessWidget {
  final String text;
  const CustomListItem({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      role: SemanticsRole.listItem,
      label: text,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Text(
          text,
          style: const TextStyle(fontSize: 16),
        ),
      ),
    );
  }
}
```
