---
name: flutter-building-layouts
description: Builds Flutter layouts using the constraint system and layout widgets. Use when creating or refining the UI structure of a Flutter application.
---
# Architecting Flutter Layouts

## Contents
- [Core Layout Principles](#core-layout-principles)
- [Structural Widgets](#structural-widgets)
- [Adaptive and Responsive Design](#adaptive-and-responsive-design)
- [Workflow: Implementing a Complex Layout](#workflow-implementing-a-complex-layout)
- [Examples](#examples)

## Core Layout Principles

Master the fundamental Flutter layout rule: **Constraints go down. Sizes go up. Parent sets position.**

* **Pass Constraints Down:** Always pass constraints (minimum/maximum width and height) from the parent Widget to its children. A Widget cannot choose its own size independently of its parent's constraints.
* **Pass Sizes Up:** Calculate the child Widget's desired size within the given constraints and pass this size back up to the parent.
* **Set Position via Parent:** Define the `x` and `y` coordinates of a child Widget exclusively within the parent Widget. Children do not know their own position on the screen.
* **Avoid Unbounded Constraints:** Never pass unbounded constraints (e.g., `double.infinity`) in the cross-axis of a flex box (`Row` or `Column`) or within scrollable regions (`ListView`). This causes render exceptions.

## Structural Widgets

Select the appropriate structural Widget based on the required spatial arrangement.

* **Use `Row` and `Column`:** Implement `Row` for horizontal linear layouts and `Column` for vertical linear layouts. Control child alignment using `mainAxisAlignment` and `crossAxisAlignment`.
* **Use `Expanded` and `Flexible`:** Wrap children of `Row` or `Column` in `Expanded` to force them to fill available space, or `Flexible` to allow them to size themselves up to the available space.
* **Use `Container`:** Wrap Widgets in a `Container` when you need to apply padding, margins, borders, or background colors.
* **Use `Stack`:** Implement `Stack` when Widgets must overlap on the Z-axis. Use `Positioned` to anchor children to specific edges of the `Stack`.
* **Use `SizedBox`:** Enforce strict, tight constraints on a child Widget by wrapping it in a `SizedBox` with explicit `width` and `height` values.

## Adaptive and Responsive Design

Apply conditional logic to handle varying screen sizes and form factors.

* **If fitting UI into available space (Responsive):** Use `LayoutBuilder`, `Expanded`, and `Flexible` to dynamically adjust the size and placement of elements based on the parent's constraints.
* **If adjusting UI usability for a specific form factor (Adaptive):** Use conditional rendering to swap entire layout structures. For example, render a bottom navigation bar on mobile, but a side navigation rail on tablets/desktop.

## Workflow: Implementing a Complex Layout

### Phase 1: Visual Deconstruction
- [ ] Break down the target UI into a hierarchy of rows, columns, and grids.
- [ ] Identify overlapping elements (requiring `Stack`).
- [ ] Identify scrolling regions (requiring `ListView` or `SingleChildScrollView`).

### Phase 2: Constraint Planning
- [ ] Determine which Widgets require tight constraints (fixed size) vs. loose constraints (flexible size).
- [ ] Identify potential unbounded constraint risks (e.g., a `ListView` inside a `Column`).

### Phase 3: Implementation
- [ ] Build the layout from the outside in, starting with the `Scaffold` and primary structural Widgets.
- [ ] Extract deeply nested layout sections into separate, stateless Widgets to maintain readability.

### Phase 4: Validation
- [ ] Run the application on target devices/simulators.
- [ ] Check for yellow/black striped overflow warnings.
- [ ] If overflow occurs: Wrap the overflowing Widget in `Expanded` (if inside a flex box) or wrap the parent in a scrollable Widget.

## Examples

### Example: Resolving Unbounded Constraints in Flex Boxes

```dart
// BAD: Throws unbounded height exception
Column(
  children: [
    Text('Header'),
    ListView(
      children: [/* items */],
    ),
  ],
)

// GOOD: ListView is constrained to remaining space
Column(
  children: [
    Text('Header'),
    Expanded(
      child: ListView(
        children: [/* items */],
      ),
    ),
  ],
)
```

### Example: Responsive Layout with LayoutBuilder

```dart
Widget buildAdaptiveLayout(BuildContext context) {
  return LayoutBuilder(
    builder: (context, constraints) {
      if (constraints.maxWidth > 600) {
        return Row(
          children: [
            SizedBox(width: 250, child: SidebarWidget()),
            Expanded(child: MainContentWidget()),
          ],
        );
      } else {
        return Column(
          children: [
            Expanded(child: MainContentWidget()),
            BottomNavigationBarWidget(),
          ],
        );
      }
    },
  );
}
```
