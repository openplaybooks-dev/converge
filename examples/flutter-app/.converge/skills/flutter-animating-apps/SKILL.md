---
name: flutter-animating-apps
description: Implements animated effects, transitions, and motion in a Flutter app. Use when adding visual feedback, shared element transitions, or physics-based animations.
---
# Implementing Flutter Animations

## Contents
- [Core Concepts](#core-concepts)
- [Animation Strategies](#animation-strategies)
- [Workflows](#workflows)
- [Examples](#examples)

## Core Concepts

Manage Flutter animations using the core typed `Animation` system. Do not manually calculate frames; rely on the framework's ticker and interpolation classes.

* **`Animation<T>`**: An abstract representation of a value that changes over time. It holds state (completed, dismissed) and notifies listeners, but knows nothing about the UI.
* **`AnimationController`**: Drives the animation. Generates values (typically 0.0 to 1.0) tied to the screen refresh rate. Always provide a `vsync` (usually via `SingleTickerProviderStateMixin`). Always `dispose()` controllers to prevent memory leaks.
* **`Tween<T>`**: A stateless mapping from an input range (usually 0.0-1.0) to an output type (e.g., `Color`, `Offset`, `double`). Chain tweens with curves using `.animate()`.
* **`Curve`**: Apply non-linear timing (e.g., `Curves.easeIn`, `Curves.bounceOut`) via `CurvedAnimation` or `CurveTween`.

## Animation Strategies

* **Simple property changes (size, color, opacity) without playback control:** Use **Implicit Animations** (`AnimatedContainer`, `AnimatedOpacity`, `TweenAnimationBuilder`).
* **Playback control (play, pause, reverse, loop) or coordinating multiple properties:** Use **Explicit Animations** (`AnimationController` with `AnimatedBuilder` or `AnimatedWidget`).
* **Elements between two distinct routes:** Use **Hero Animations** (Shared Element Transitions).
* **Real-world motion (snapping back after drag):** Use **Physics-Based Animations** (`SpringSimulation`).
* **Sequence of overlapping or delayed motions:** Use **Staggered Animations** (multiple `Tween`s with `Interval` curves on a single `AnimationController`).

## Workflows

### Implementing Implicit Animations
- [ ] Identify target properties to animate (width, color, etc.).
- [ ] Replace the static widget with its animated counterpart (`AnimatedContainer`, etc.).
- [ ] Define the `duration` property.
- [ ] (Optional) Define the `curve` property.
- [ ] Trigger animation by updating properties inside `setState()`.

### Implementing Explicit Animations
- [ ] Add `SingleTickerProviderStateMixin` to the `State` class.
- [ ] Initialize `AnimationController` in `initState()` with `vsync: this` and `duration`.
- [ ] Define `Tween` and chain to controller using `.animate()`.
- [ ] Wrap target UI in `AnimatedBuilder`.
- [ ] Control playback: `controller.forward()`, `.reverse()`, `.repeat()`.
- [ ] Call `controller.dispose()` in `dispose()`.

### Implementing Hero Transitions
- [ ] Wrap source widget in `Hero` with unique `tag`.
- [ ] Wrap destination widget in `Hero` with the *exact same* `tag`.
- [ ] Ensure widget trees inside both `Hero`s are visually similar.
- [ ] Trigger transition by pushing the destination route.

### Implementing Physics-Based Animations
- [ ] Set up `AnimationController` (no fixed duration).
- [ ] Capture gesture velocity using `GestureDetector` (`onPanEnd`).
- [ ] Instantiate `SpringSimulation` with mass, stiffness, damping, velocity.
- [ ] Drive controller using `controller.animateWith(simulation)`.

## Examples

### Example: Staggered Animation with AnimatedBuilder

```dart
class StaggeredAnimationDemo extends StatefulWidget {
  @override
  State<StaggeredAnimationDemo> createState() => _StaggeredAnimationDemoState();
}

class _StaggeredAnimationDemoState extends State<StaggeredAnimationDemo>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _widthAnimation;
  late Animation<Color?> _colorAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _widthAnimation = Tween<double>(begin: 50.0, end: 200.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.5, curve: Curves.easeIn),
      ),
    );

    _colorAnimation = ColorTween(begin: Colors.blue, end: Colors.red).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.5, 1.0, curve: Curves.easeOut),
      ),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: _widthAnimation.value,
          height: 50.0,
          color: _colorAnimation.value,
        );
      },
    );
  }
}
```

### Example: Custom Page Route Transition

```dart
Route createCustomRoute(Widget destination) {
  return PageRouteBuilder(
    pageBuilder: (context, animation, secondaryAnimation) => destination,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      const begin = Offset(0.0, 1.0);
      const end = Offset.zero;
      const curve = Curves.easeOut;

      final tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
      final offsetAnimation = animation.drive(tween);

      return SlideTransition(position: offsetAnimation, child: child);
    },
  );
}
```
