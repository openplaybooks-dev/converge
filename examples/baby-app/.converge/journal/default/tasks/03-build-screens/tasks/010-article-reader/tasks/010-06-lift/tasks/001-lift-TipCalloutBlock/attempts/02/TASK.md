# Task: 03-build-screens/010-article-reader/010-06-lift/001-lift-TipCalloutBlock

# Lift: TipCalloutBlock

Move `TipCalloutBlock` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/article_reader/widgets/tip_callout_block.dart` → `lib/widgets/tip_callout_block.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/tip_callout_block.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files