# Tailwind CSS → Flutter Mapping

Comprehensive mapping of Tailwind utility classes to Flutter widget properties. The converter parses each Tailwind class and produces the exact Flutter equivalent.

---

## 1. Layout → Widget Type

| Tailwind | Flutter Widget | Notes |
|----------|---------------|-------|
| `flex flex-col` | `Column()` | Vertical layout |
| `flex` or `flex flex-row` | `Row()` | Horizontal layout (default axis) |
| `inline-flex` | `Row(mainAxisSize: MainAxisSize.min)` | Inline row |
| `grid grid-cols-{n}` | `GridView.count(crossAxisCount: n)` | Grid |
| `block` | `SizedBox(width: double.infinity)` | Full width block |
| `hidden` | `SizedBox.shrink()` or omit | Hidden element |
| `relative` | `Stack()` (on parent) | Position context |
| `absolute` | `Positioned()` | Absolute positioning inside Stack |
| `fixed` | `Scaffold.bottomNavigationBar` or overlay | Fixed position |
| `sticky` | `SliverAppBar(pinned: true)` | Sticky header |

## 2. Flex Properties

| Tailwind | Flutter | Notes |
|----------|---------|-------|
| `flex-1` | `Expanded(flex: 1)` | Fill remaining space |
| `flex-auto` | `Expanded()` | Auto flex |
| `flex-none` | (no wrapper) | Don't flex |
| `flex-shrink-0` | (no wrapper) | Don't shrink |
| `grow` | `Expanded()` | Grow to fill |
| `flex-wrap` | `Wrap()` | Use Wrap instead of Row |
| `flex-nowrap` | `Row()` | Default — no wrap |

### Main Axis Alignment (Row → horizontal, Column → vertical)

| Tailwind | Flutter |
|----------|---------|
| `justify-start` | `MainAxisAlignment.start` |
| `justify-center` | `MainAxisAlignment.center` |
| `justify-end` | `MainAxisAlignment.end` |
| `justify-between` | `MainAxisAlignment.spaceBetween` |
| `justify-around` | `MainAxisAlignment.spaceAround` |
| `justify-evenly` | `MainAxisAlignment.spaceEvenly` |

### Cross Axis Alignment

| Tailwind | Flutter |
|----------|---------|
| `items-start` | `CrossAxisAlignment.start` |
| `items-center` | `CrossAxisAlignment.center` |
| `items-end` | `CrossAxisAlignment.end` |
| `items-stretch` | `CrossAxisAlignment.stretch` |
| `items-baseline` | `CrossAxisAlignment.baseline` |

### Self Alignment

| Tailwind | Flutter |
|----------|---------|
| `self-start` | `Align(alignment: Alignment.centerLeft)` |
| `self-center` | `Center()` |
| `self-end` | `Align(alignment: Alignment.centerRight)` |
| `self-stretch` | `SizedBox(width: double.infinity)` |

### Gap (spacing between children)

| Tailwind | Flutter |
|----------|---------|
| `gap-0` | No spacing |
| `gap-0.5` | 2px SizedBox between children |
| `gap-1` | 4px |
| `gap-1.5` | 6px |
| `gap-2` | 8px |
| `gap-2.5` | 10px |
| `gap-3` | 12px |
| `gap-4` | 16px |
| `gap-5` | 20px |
| `gap-6` | 24px |
| `gap-8` | 32px |
| `gap-10` | 40px |
| `gap-12` | 48px |
| `gap-x-{n}` | Horizontal gap only (Row) |
| `gap-y-{n}` | Vertical gap only (Column) |
| `space-x-{n}` | SizedBox(width: {n*4}px) between Row children |
| `space-y-{n}` | SizedBox(height: {n*4}px) between Column children |

**Implementation:** Insert `SizedBox(width/height: X)` between each child pair, or use Column/Row `spacing:` parameter (Flutter 3.27+).

---

## 3. Spacing Scale → Pixel Values

All spacing utilities (`p-`, `m-`, `gap-`, `w-`, `h-`, `inset-`, `top-`, etc.) use this scale:

| Tailwind | Pixels | Tailwind | Pixels |
|----------|--------|----------|--------|
| `0` | 0 | `10` | 40 |
| `px` | 1 | `11` | 44 |
| `0.5` | 2 | `12` | 48 |
| `1` | 4 | `14` | 56 |
| `1.5` | 6 | `16` | 64 |
| `2` | 8 | `20` | 80 |
| `2.5` | 10 | `24` | 96 |
| `3` | 12 | `28` | 112 |
| `3.5` | 14 | `32` | 128 |
| `4` | 16 | `36` | 144 |
| `5` | 20 | `40` | 160 |
| `6` | 24 | `44` | 176 |
| `7` | 28 | `48` | 192 |
| `8` | 32 | `52` | 208 |
| `9` | 36 | `56` | 224 |

---

## 4. Padding → EdgeInsets

| Tailwind | Flutter |
|----------|---------|
| `p-{n}` | `Padding(padding: EdgeInsets.all({px}))` |
| `px-{n}` | `EdgeInsets.symmetric(horizontal: {px})` |
| `py-{n}` | `EdgeInsets.symmetric(vertical: {px})` |
| `pt-{n}` | `EdgeInsets.only(top: {px})` |
| `pb-{n}` | `EdgeInsets.only(bottom: {px})` |
| `pl-{n}` | `EdgeInsets.only(left: {px})` |
| `pr-{n}` | `EdgeInsets.only(right: {px})` |
| `ps-{n}` | `EdgeInsetsDirectional.only(start: {px})` |
| `pe-{n}` | `EdgeInsetsDirectional.only(end: {px})` |

**Combined:** `px-4 py-2` → `EdgeInsets.symmetric(horizontal: 16, vertical: 8)`

**Wrapping:** Use `Padding()` widget wrapping the child.

---

## 5. Width & Height → SizedBox / Constraints

| Tailwind | Flutter |
|----------|---------|
| `w-{n}` | `SizedBox(width: {px})` or `width: {px}` in Container |
| `h-{n}` | `SizedBox(height: {px})` or `height: {px}` in Container |
| `w-full` | `SizedBox(width: double.infinity)` |
| `h-full` | `SizedBox(height: double.infinity)` |
| `w-screen` | `MediaQuery.of(context).size.width` |
| `h-screen` | `MediaQuery.of(context).size.height` |
| `min-w-0` | `ConstrainedBox(constraints: BoxConstraints(minWidth: 0))` |
| `min-h-screen` | `ConstrainedBox(constraints: BoxConstraints(minHeight: screenHeight))` |
| `max-w-sm` | `ConstrainedBox(constraints: BoxConstraints(maxWidth: 384))` |
| `max-w-md` | `maxWidth: 448` |
| `max-w-lg` | `maxWidth: 512` |
| `max-w-xl` | `maxWidth: 576` |
| `max-w-screen-sm` | `maxWidth: 640` |
| `size-{n}` | `SizedBox(width: {px}, height: {px})` |
| `aspect-square` | `AspectRatio(aspectRatio: 1)` |
| `aspect-video` | `AspectRatio(aspectRatio: 16/9)` |

---

## 6. Typography → TextStyle

### Font Size

| Tailwind | fontSize | lineHeight | Flutter TextTheme hint |
|----------|----------|------------|----------------------|
| `text-xs` | 12 | 16 | `labelSmall` |
| `text-sm` | 14 | 20 | `bodySmall` / `labelLarge` |
| `text-base` | 16 | 24 | `bodyLarge` |
| `text-lg` | 18 | 28 | `titleMedium` |
| `text-xl` | 20 | 28 | `titleLarge` |
| `text-2xl` | 24 | 32 | `headlineSmall` |
| `text-3xl` | 30 | 36 | `headlineMedium` |
| `text-4xl` | 36 | 40 | `headlineLarge` |
| `text-5xl` | 48 | 1.0 | `displaySmall` |
| `text-6xl` | 60 | 1.0 | `displayMedium` |
| `text-7xl` | 72 | 1.0 | `displayLarge` |

### Font Weight

| Tailwind | Flutter |
|----------|---------|
| `font-thin` | `FontWeight.w100` |
| `font-extralight` | `FontWeight.w200` |
| `font-light` | `FontWeight.w300` |
| `font-normal` | `FontWeight.w400` |
| `font-medium` | `FontWeight.w500` |
| `font-semibold` | `FontWeight.w600` |
| `font-bold` | `FontWeight.w700` |
| `font-extrabold` | `FontWeight.w800` |
| `font-black` | `FontWeight.w900` |

### Text Alignment

| Tailwind | Flutter |
|----------|---------|
| `text-left` | `TextAlign.left` |
| `text-center` | `TextAlign.center` |
| `text-right` | `TextAlign.right` |
| `text-justify` | `TextAlign.justify` |

### Text Overflow

| Tailwind | Flutter |
|----------|---------|
| `truncate` | `overflow: TextOverflow.ellipsis, maxLines: 1` |
| `text-ellipsis` | `overflow: TextOverflow.ellipsis` |
| `text-clip` | `overflow: TextOverflow.clip` |
| `line-clamp-{n}` | `maxLines: n, overflow: TextOverflow.ellipsis` |

### Text Decoration

| Tailwind | Flutter |
|----------|---------|
| `underline` | `decoration: TextDecoration.underline` |
| `line-through` | `decoration: TextDecoration.lineThrough` |
| `no-underline` | `decoration: TextDecoration.none` |
| `italic` | `fontStyle: FontStyle.italic` |
| `not-italic` | `fontStyle: FontStyle.normal` |
| `uppercase` | Transform text to uppercase in Dart |
| `lowercase` | Transform text to lowercase in Dart |
| `capitalize` | Capitalize in Dart |

### Letter & Line Spacing

| Tailwind | Flutter |
|----------|---------|
| `tracking-tighter` | `letterSpacing: -0.8` |
| `tracking-tight` | `letterSpacing: -0.4` |
| `tracking-normal` | `letterSpacing: 0` |
| `tracking-wide` | `letterSpacing: 0.4` |
| `tracking-wider` | `letterSpacing: 0.8` |
| `tracking-widest` | `letterSpacing: 1.6` |
| `leading-none` | `height: 1.0` (in TextStyle) |
| `leading-tight` | `height: 1.25` |
| `leading-snug` | `height: 1.375` |
| `leading-normal` | `height: 1.5` |
| `leading-relaxed` | `height: 1.625` |
| `leading-loose` | `height: 2.0` |

---

## 7. Colors → Color Values

### Format
Tailwind colors map to `Color(0xAARRGGBB)` in Flutter.

`text-{color}` → `TextStyle(color: Color(...))`
`bg-{color}` → Container/DecoratedBox color or widget background
`border-{color}` → `BorderSide(color: Color(...))`

### Opacity Modifier
`bg-black/50` → `Color(0xFF000000).withOpacity(0.5)` or `Colors.black.withValues(alpha: 0.5)`

### Slate (most used dark palette)

| Tailwind | Hex | Color() |
|----------|-----|---------|
| `slate-50` | #f8fafc | `Color(0xFFF8FAFC)` |
| `slate-100` | #f1f5f9 | `Color(0xFFF1F5F9)` |
| `slate-200` | #e2e8f0 | `Color(0xFFE2E8F0)` |
| `slate-300` | #cbd5e1 | `Color(0xFFCBD5E1)` |
| `slate-400` | #94a3b8 | `Color(0xFF94A3B8)` |
| `slate-500` | #64748b | `Color(0xFF64748B)` |
| `slate-600` | #475569 | `Color(0xFF475569)` |
| `slate-700` | #334155 | `Color(0xFF334155)` |
| `slate-800` | #1e293b | `Color(0xFF1E293B)` |
| `slate-900` | #0f172a | `Color(0xFF0F172A)` |
| `slate-950` | #020617 | `Color(0xFF020617)` |

### Amber (warm accent)

| Tailwind | Hex | Color() |
|----------|-----|---------|
| `amber-50` | #fffbeb | `Color(0xFFFFFBEB)` |
| `amber-100` | #fef3c7 | `Color(0xFFFEF3C7)` |
| `amber-200` | #fde68a | `Color(0xFFFDE68A)` |
| `amber-300` | #fcd34d | `Color(0xFFFCD34D)` |
| `amber-400` | #fbbf24 | `Color(0xFFFBBF24)` |
| `amber-500` | #f59e0b | `Color(0xFFF59E0B)` |
| `amber-600` | #d97706 | `Color(0xFFD97706)` |
| `amber-700` | #b45309 | `Color(0xFFB45309)` |
| `amber-800` | #92400e | `Color(0xFF92400E)` |
| `amber-900` | #78350f | `Color(0xFF78350F)` |
| `amber-950` | #451a03 | `Color(0xFF451A03)` |

### Common Utility Colors

| Tailwind | Flutter |
|----------|---------|
| `white` | `Colors.white` |
| `black` | `Colors.black` |
| `transparent` | `Colors.transparent` |
| `current` | `(inherit from parent)` |

### Full Palette Families

The following families follow the same 50-950 scale: `red`, `orange`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`, `stone`, `neutral`, `zinc`, `gray`.

For the full hex values, reference: https://tailwindcss.com/docs/customizing-colors

**Conversion strategy:** Extract the hex value from the Tailwind color reference and use `Color(0xFF{hex})`.

---

## 8. Borders → Border / BorderSide

| Tailwind | Flutter |
|----------|---------|
| `border` | `Border.all(width: 1)` |
| `border-0` | No border |
| `border-2` | `Border.all(width: 2)` |
| `border-4` | `Border.all(width: 4)` |
| `border-t` | `Border(top: BorderSide(width: 1))` |
| `border-b` | `Border(bottom: BorderSide(width: 1))` |
| `border-l` | `Border(left: BorderSide(width: 1))` |
| `border-r` | `Border(right: BorderSide(width: 1))` |
| `border-{color}` | `BorderSide(color: Color(...))` |
| `border-dashed` | Custom `Paint` with dashed style |
| `divide-y` | `ListView.separated` with `Divider()` |
| `divide-x` | `VerticalDivider()` between items |

---

## 9. Border Radius → BorderRadius

| Tailwind | Pixels | Flutter |
|----------|--------|---------|
| `rounded-none` | 0 | `BorderRadius.zero` |
| `rounded-sm` | 2 | `BorderRadius.circular(2)` |
| `rounded` | 4 | `BorderRadius.circular(4)` |
| `rounded-md` | 6 | `BorderRadius.circular(6)` |
| `rounded-lg` | 8 | `BorderRadius.circular(8)` |
| `rounded-xl` | 12 | `BorderRadius.circular(12)` |
| `rounded-2xl` | 16 | `BorderRadius.circular(16)` |
| `rounded-3xl` | 24 | `BorderRadius.circular(24)` |
| `rounded-full` | 9999 | `BorderRadius.circular(9999)` → pill/circle |
| `rounded-t-{size}` | | `BorderRadius.vertical(top: Radius.circular({px}))` |
| `rounded-b-{size}` | | `BorderRadius.vertical(bottom: Radius.circular({px}))` |
| `rounded-l-{size}` | | `BorderRadius.horizontal(left: Radius.circular({px}))` |
| `rounded-r-{size}` | | `BorderRadius.horizontal(right: Radius.circular({px}))` |

**Wrapping:** Use `ClipRRect(borderRadius: ...)` for clipping, or `DecoratedBox`/`Container` for decoration.

---

## 10. Shadows → BoxShadow

| Tailwind | Flutter BoxShadow |
|----------|-------------------|
| `shadow-sm` | `BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1))` |
| `shadow` | `BoxShadow(color: Color(0x1A000000), blurRadius: 3, offset: Offset(0, 1)), BoxShadow(color: Color(0x0F000000), blurRadius: 2, offset: Offset(0, 1))` |
| `shadow-md` | `BoxShadow(color: Color(0x1A000000), blurRadius: 6, offset: Offset(0, 4)), BoxShadow(color: Color(0x0F000000), blurRadius: 4, offset: Offset(0, 2))` |
| `shadow-lg` | `BoxShadow(color: Color(0x1A000000), blurRadius: 15, offset: Offset(0, 10)), BoxShadow(color: Color(0x0D000000), blurRadius: 6, offset: Offset(0, 4))` |
| `shadow-xl` | `BoxShadow(color: Color(0x1A000000), blurRadius: 25, offset: Offset(0, 20)), BoxShadow(color: Color(0x0D000000), blurRadius: 10, offset: Offset(0, 8))` |
| `shadow-2xl` | `BoxShadow(color: Color(0x40000000), blurRadius: 50, offset: Offset(0, 25))` |
| `shadow-none` | No shadow |

---

## 11. Overflow → Clip / Scroll

| Tailwind | Flutter |
|----------|---------|
| `overflow-hidden` | `clipBehavior: Clip.hardEdge` or `ClipRect`/`ClipRRect` |
| `overflow-auto` | `SingleChildScrollView()` |
| `overflow-scroll` | `SingleChildScrollView()` |
| `overflow-visible` | Default (no clip) |
| `overflow-x-auto` | `SingleChildScrollView(scrollDirection: Axis.horizontal)` |
| `overflow-y-auto` | `SingleChildScrollView(scrollDirection: Axis.vertical)` |

---

## 12. Opacity → Opacity Widget

| Tailwind | Flutter |
|----------|---------|
| `opacity-0` | `Opacity(opacity: 0)` |
| `opacity-5` | `Opacity(opacity: 0.05)` |
| `opacity-10` | `Opacity(opacity: 0.1)` |
| `opacity-25` | `Opacity(opacity: 0.25)` |
| `opacity-50` | `Opacity(opacity: 0.5)` |
| `opacity-75` | `Opacity(opacity: 0.75)` |
| `opacity-100` | (no wrapper needed) |

---

## 13. Position → Positioned

| Tailwind | Flutter (inside Stack) |
|----------|---------|
| `absolute inset-0` | `Positioned.fill()` |
| `absolute top-0 left-0` | `Positioned(top: 0, left: 0)` |
| `absolute bottom-0 right-0` | `Positioned(bottom: 0, right: 0)` |
| `absolute top-{n}` | `Positioned(top: {px})` |
| `absolute bottom-{n}` | `Positioned(bottom: {px})` |
| `z-{n}` | Child order in Stack (later = higher) |
| `z-10` | Order index 10 |

---

## 14. Effects → Flutter Equivalents

| Tailwind | Flutter |
|----------|---------|
| `backdrop-blur-sm` | `BackdropFilter(filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4))` |
| `backdrop-blur` | `ImageFilter.blur(sigmaX: 8, sigmaY: 8)` |
| `backdrop-blur-md` | `ImageFilter.blur(sigmaX: 12, sigmaY: 12)` |
| `backdrop-blur-lg` | `ImageFilter.blur(sigmaX: 16, sigmaY: 16)` |
| `backdrop-blur-xl` | `ImageFilter.blur(sigmaX: 24, sigmaY: 24)` |
| `bg-gradient-to-r` | `LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight)` |
| `bg-gradient-to-b` | `LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter)` |
| `from-{color}` | First color in gradient stops |
| `via-{color}` | Middle color in gradient stops |
| `to-{color}` | Last color in gradient stops |

---

## 15. Transitions & Animations

| Tailwind | Flutter |
|----------|---------|
| `transition-all` | `AnimatedContainer(duration: Duration(milliseconds: 150))` |
| `transition-colors` | `AnimatedDefaultTextStyle` or `AnimatedContainer` |
| `duration-75` | `Duration(milliseconds: 75)` |
| `duration-100` | `Duration(milliseconds: 100)` |
| `duration-150` | `Duration(milliseconds: 150)` |
| `duration-200` | `Duration(milliseconds: 200)` |
| `duration-300` | `Duration(milliseconds: 300)` |
| `duration-500` | `Duration(milliseconds: 500)` |
| `duration-700` | `Duration(milliseconds: 700)` |
| `duration-1000` | `Duration(milliseconds: 1000)` |
| `ease-linear` | `Curves.linear` |
| `ease-in` | `Curves.easeIn` |
| `ease-out` | `Curves.easeOut` |
| `ease-in-out` | `Curves.easeInOut` |

---

## 16. Image Fit → BoxFit

| Tailwind | Flutter |
|----------|---------|
| `object-contain` | `BoxFit.contain` |
| `object-cover` | `BoxFit.cover` |
| `object-fill` | `BoxFit.fill` |
| `object-none` | `BoxFit.none` |
| `object-scale-down` | `BoxFit.scaleDown` |

---

## 17. Cursor & Interaction

| Tailwind | Flutter |
|----------|---------|
| `cursor-pointer` | Wrap in `InkWell()` or `GestureDetector()` |
| `pointer-events-none` | `IgnorePointer()` |
| `select-none` | (default in Flutter) |
| `touch-manipulation` | (default in Flutter) |

---

## 18. Tailwind → Flutter Widget Decision Tree

When converting a `<div>` with Tailwind classes:

1. **Has `flex flex-col`?** → `Column()`
2. **Has `flex` or `flex flex-row`?** → `Row()`
3. **Has `grid`?** → `GridView()`
4. **Has `overflow-y-auto` or `overflow-auto`?** → `SingleChildScrollView()`
5. **Has `relative`?** → `Stack()` (its `absolute` children become `Positioned`)
6. **Has `bg-*` + `rounded-*` + `shadow-*`?** → `Container()` or `DecoratedBox()`
7. **Has only `p-*`?** → `Padding()`
8. **Has only `w-*` and/or `h-*`?** → `SizedBox()`
9. **Otherwise** → `Container()` or collapse into parent

For `<span>` / `<p>` / `<h1>-<h6>` with text classes → `Text()` with `TextStyle`

For `<button>` → Determine button type from styling:
- Has prominent background color → `FilledButton()` or `ElevatedButton()`
- Has border, no fill → `OutlinedButton()`
- Text only → `TextButton()`
- Icon only → `IconButton()`

For `<img>` → `CachedNetworkImage()` or `Image.asset()`

For `<svg>` → `Icon()` (Material) or `SvgPicture.string()`
