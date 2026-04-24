# Checks: 03-build-screens/012-invite-accept/012-06-lift/001-lift-PulseAvatarBadge

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/pulse_avatar_badge.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/pulse_avatar_badge.dart`