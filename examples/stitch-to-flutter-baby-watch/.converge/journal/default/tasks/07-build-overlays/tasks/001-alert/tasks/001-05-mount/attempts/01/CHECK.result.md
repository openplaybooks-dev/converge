# RESULT.md — Attempt 1

**Outcome**: ❌ FAILED
**Duration**: 10m 41s
**Completed**: 2026-04-21T19:41:30.393Z

## Check Results — ❌ some failed

- ✗ **parent-imports-overlay**: Parent screen imports the overlay widget
- ✗ **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- ✗ **dart-valid**: Dart analysis passes for parent screen

## Failed Check Details

### parent-imports-overlay — ❌ FAILED
**Command**: `grep -q 'alert' `
**Exit code**: 1
**Output**: *(none)*

### parent-shows-overlay — ❌ FAILED
**Command**: `grep -qE 'showModalBottomSheet|showDialog' `
**Exit code**: 1
**Output**: *(none)*

### dart-valid — ❌ FAILED
**Command**: `dart analyze`
**Exit code**: 2
**Output**:
```
Analyzing stitch-to-flutter-baby-watch...

warning - analysis_options.yaml:21:7 - 'avoid_returning_null_for_future' was removed in Dart '3.3.0' Try removing the reference to 'avoid_returning_null_for_future'. - removed_lint
warning - lib/screens/filter_date/filter_date_screen.dart:8:16 - The value of the field '_surfaceContainer' isn't used. Try removing the field, or using it. - unused_field
warning - lib/screens/guardians/guardians_screen.dart:12:11 - The value of the local variable 'colorScheme' isn't used. Try removing the variable or using it. - unused_local_variable
warning - lib/screens/pairing_confirmation/pairing_confirmation_screen.dart:8:16 - The value of the field '_surfaceContainer' isn't used. Try removing the field, or using it. - unused_field
warning - lib/screens/timeout_picker/timeout_picker_screen.dart:7:16 - The value of the field '_surfaceContainerLow' isn't used. Try removing the field, or using it. - unused_field
warning - lib/screens/timeout_picker/timeout_picker_screen.dart:8:16 - The value of the field '_surfaceContainer' isn't used. Try removing the field, or using it. - unused_field
   info - lib/screens/add_safe_zone/add_safe_zone_screen.dart:52:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/add_safe_zone/add_safe_zone_screen.dart:54:16 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/add_safe_zone/add_safe_zone_screen.dart:61:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/add_safe_zone/widgets/active_toggle.dart:21:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/add_safe_zone/widgets/active_toggle.dart:38:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/add_safe_zone/widgets/map_preview_card.dart:58:23 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/add_safe_zone/widgets/radius_selector.dart:38:76 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/alert/alert_screen.dart:71:74 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/alert/alert_screen.dart:104:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/alert/alert_screen.dart:106:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/alert/alert_screen.dart:108:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/alert/alert_screen.dart:143:24 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/alert/alert_screen.dart:156:21 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/alert/alert_screen.dart:158:30 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/alert/alert_screen.dart:179:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/alert/alert_screen.dart:182:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/alert/alert_screen.dart:187:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_detail/widgets/co_guardian_card.dart:40:29 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_detail/widgets/co_guardian_card.dart:224:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_forget_confirmation/beacon_forget_confirmation_screen.dart:64:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_forget_confirmation/beacon_forget_confirmation_screen.dart:67:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_forget_confirmation/beacon_forget_confirmation_screen.dart:108:34 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:74:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:77:23 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:79:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:81:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:83:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_scanner/beacon_scanner_screen.dart:220:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/beacon_scanner/beacon_scanner_screen.dart:341:74 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/beacon_scanner/widgets/beacon_device_card.dart:106:73 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/beacon_scanner/widgets/beacon_device_card.dart:163:55 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart:53:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart:55:16 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart:61:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart:73:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/edit_safe_zone/widgets/active_toggle.dart:23:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/edit_safe_zone/widgets/map_preview_card.dart:68:26 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/edit_safe_zone/widgets/radius_selector.dart:46:75 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/event_delete_confirmation/event_delete_confirmation_screen.dart:64:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/event_delete_confirmation/event_delete_confirmation_screen.dart:67:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/event_delete_confirmation/event_delete_confirmation_screen.dart:108:34 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/event_detail/event_detail_screen.dart:62:23 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/event_detail/event_detail_screen.dart:96:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/event_detail/event_detail_screen.dart:101:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/event_detail/event_detail_screen.dart:106:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/event_detail/event_detail_screen.dart:114:29 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/event_detail/event_detail_screen.dart:116:38 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/filter_date/filter_date_screen.dart:154:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/filter_date/filter_date_screen.dart:156:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/filter_date/filter_date_screen.dart:163:67 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/filter_date/filter_date_screen.dart:166:68 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/filter_date_range/filter_date_range_screen.dart:53:17 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/filter_date_range/filter_date_range_screen.dart:66:17 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/filter_date_range/filter_date_range_screen.dart:70:66 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/guardians/guardians_screen.dart:52:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/guardians/guardians_screen.dart:66:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/guardians/guardians_screen.dart:80:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:31:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:34:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:82:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:84:22 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:86:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:88:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:90:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:96:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:111:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/history/history_screen.dart:126:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:29:43 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/home_screen.dart:66:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:68:16 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:72:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:116:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/home_screen.dart:120:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/home_screen.dart:124:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/home_screen.dart:185:39 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/home_screen.dart:210:9 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:212:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:214:22 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:223:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:225:22 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:250:76 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/home_screen.dart:290:49 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/home_screen.dart:317:45 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/home_screen.dart:352:35 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:359:51 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/home_screen.dart:474:14 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:498:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:500:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:500:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:502:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:502:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:504:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:504:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/home_screen.dart:528:76 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/home/widgets/map_card.dart:51:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/widgets/map_card.dart:204:37 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/home/widgets/status_section.dart:29:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/invite_accept/invite_accept_screen.dart:96:73 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/invite_accept/invite_accept_screen.dart:102:45 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/invite_accept/invite_accept_screen.dart:163:64 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/invite_accept/invite_accept_screen.dart:332:26 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/pairing_confirmation/pairing_confirmation_screen.dart:77:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/pairing_confirmation/pairing_confirmation_screen.dart:78:34 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/pairing_confirmation/pairing_confirmation_screen.dart:90:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/pairing_confirmation/pairing_confirmation_screen.dart:92:40 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/pairing_confirmation/pairing_confirmation_screen.dart:104:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/pairing_confirmation/pairing_confirmation_screen.dart:107:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zone_delete_confirmation/safe_zone_delete_confirmation_screen.dart:64:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zone_delete_confirmation/safe_zone_delete_confirmation_screen.dart:67:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zone_delete_confirmation/safe_zone_delete_confirmation_screen.dart:108:34 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/safe_zones_screen.dart:111:12 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/safe_zones_screen.dart:114:9 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/safe_zones_screen.dart:187:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:191:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:193:75 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:197:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:252:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:289:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:303:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:317:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:350:56 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:381:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/safe_zones_screen.dart:382:36 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/safe_zones_screen.dart:408:60 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:461:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:494:53 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:575:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/safe_zones_screen.dart:579:55 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/safe_zones_screen.dart:611:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/safe_zones_screen.dart:615:55 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - lib/screens/safe_zones/widgets/bottom_nav.dart:26:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/widgets/bottom_nav.dart:27:18 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/widgets/bottom_nav.dart:30:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/widgets/bottom_nav.dart:31:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/widgets/bottom_nav.dart:32:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/safe_zones/widgets/bottom_nav.dart:33:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/settings_screen.dart:58:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/settings_screen.dart:66:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/settings_screen.dart:163:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/settings_screen.dart:171:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/settings_screen.dart:211:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/settings_screen.dart:394:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/widgets/alert_settings_card.dart:19:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/widgets/alert_settings_card.dart:186:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/widgets/beacon_setup_card.dart:19:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/widgets/general_settings_section.dart:18:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/widgets/general_settings_section.dart:72:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/settings/widgets/general_settings_section.dart:123:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/test_alert/test_alert_screen.dart:53:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/test_alert/test_alert_screen.dart:56:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/test_alert/test_alert_screen.dart:125:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/test_alert/test_alert_screen.dart:128:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/test_alert_countdown/test_alert_countdown_screen.dart:59:41 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/test_alert_countdown/test_alert_countdown_screen.dart:90:17 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/test_alert_countdown/test_alert_countdown_screen.dart:91:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/test_alert_countdown/test_alert_countdown_screen.dart:93:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/timeout_picker/timeout_picker_screen.dart:54:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/screens/timeout_picker/timeout_picker_screen.dart:57:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/active_toggle.dart:21:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/active_toggle.dart:38:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/alert_settings_card.dart:19:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/alert_settings_card.dart:186:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/beacon_setup_card.dart:19:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/bottom_nav.dart:26:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/bottom_nav.dart:27:18 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/bottom_nav.dart:30:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/bottom_nav.dart:31:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/bottom_nav.dart:32:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/bottom_nav.dart:33:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - lib/widgets/overlays/alert/alert.dart:79:5 - Use 'const' for final variables initialized to a constant value. Try replacing 'final' with 'const'. - prefer_const_declarations
   info - lib/widgets/overlays/alert/alert.dart:281:5 - Use 'const' for final variables initialized to a constant value. Try replacing 'final' with 'const'. - prefer_const_declarations
   info - lib/widgets/radar_scanning_area.dart:94:29 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors

178 issues found.
An error occurred while executing an analyzer plugin: Failed to compile "/Users/hoangnguyen/.dartServer/.plugin_manager/9e820a09f9826aee5ce535ac929226a0/analyzer_plugin/bin/plugin.dart" to an AOT snapshot.
  pluginFolder = /Users/hoangnguyen/.dartServer/.plugin_manager/9e820a09f9826aee5ce535ac929226a0/analyzer_plugin
  exitCode = 254
  stdout = 
  stderr = ../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2133:32: Error: The argument type 'Element' can't be assigned to the parameter type 'Element2'.
 - 'Element' is from 'package:analyzer/dart/element/element.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element.dart').
 - 'Element2' is from 'package:analyzer/dart/element/element2.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element2.dart').
            .publiclyExporting(element, resultCache: resultCache) ??
                               ^
../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2133:54: Error: The argument type 'Map<Element, LibraryElement?>?' can't be assigned to the parameter type 'Map<Element2, LibraryElement2?>?'.
 - 'Map' is from 'dart:core'.
 - 'Element' is from 'package:analyzer/dart/element/element.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element.dart').
 - 'LibraryElement' is from 'package:analyzer/dart/element/element.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element.dart').
 - 'Element2' is from 'package:analyzer/dart/element/element2.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element2.dart').
 - 'LibraryElement2' is from 'package:analyzer/dart/element/element2.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element2.dart').
            .publiclyExporting(element, resultCache: resultCache) ??
                                                     ^
../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2137:40: Error: The getter 'source' isn't defined for the type 'Object'.
 - 'Object' is from 'dart:core'.
Try correcting the name to the name of an existing getter, or defining a getter or field named 'source'.
    var uriToImport = libraryToImport?.source.uri;
                                       ^^^^^^
../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2150:58: Error: The argument type 'Object?' can't be assigned to the parameter type 'LibraryElement?'.
 - 'Object' is from 'dart:core'.
 - 'LibraryElement' is from 'package:analyzer/dart/element/element.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element.dart').
      _removeUnnecessaryPendingElementImports(newImport, libraryToImport);
                                                         ^
../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2182:14: Error: The method 'publiclyExporting2' isn't defined for the type 'TopLevelDeclarations'.
 - 'TopLevelDeclarations' is from 'package:analyzer/src/services/top_level_declarations.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/src/services/top_level_declarations.dart').
Try correcting the name to the name of an existing method, or defining a method named 'publiclyExporting2'.
            .publiclyExporting2(element, resultCache: resultCache) ??
             ^^^^^^^^^^^^^^^^^^
Error: AOT compilation failed
Bad state: Generating AOT kernel dill failed!


#0      PluginManager._compileAsAot (package:analysis_server/src/plugin/plugin_manager.dart:589)
#1      PluginManager._computeFiles (package:analysis_server/src/plugin/plugin_manager.dart:641)
#2      PluginManager.filesFor (package:analysis_server/src/plugin/plugin_manager.dart:347)
#3      PluginManager.addPluginToContextRoot (package:analysis_server/src/plugin/plugin_manager.dart:179)
#4      PluginWatcher._addLegacyPlugins (package:analysis_server/src/plugin/plugin_watcher.dart:102)
#5      PluginWatcher.addedDriver (package:analysis_server/src/plugin/plugin_watcher.dart:49)
#6      AnalysisDriverScheduler.add (package:analyzer/src/dart/analysis/driver.dart:2665)
#7      new AnalysisDriver (package:analyzer/src/dart/analysis/driver.dart:341)
#8      ContextBuilderImpl.createContext (package:analyzer/src/dart/analysis/context_builder.dart:157)
#9      new AnalysisContextCollectionImpl (package:analyzer/src/dart/analysis/analysis_context_collection.dart:122)
#10     ContextManagerImpl._createAnalysisContexts.performContextRebuildGuarded.performContextRebuild (package:analysis_server/src/context_manager.dart:596)
<asynchronous suspension>
#11     ContextManagerImpl._createAnalysisContexts.performContextRebuildGuarded (package:analysis_server/src/context_manager.dart:732)
<asynchronous suspension>
#12     _CancellingTaskQueue.queue.<anonymous closure> (package:analysis_server/src/context_manager.dart:1041)
<asynchronous suspension>
#13     ContextManagerImpl.setRoots (package:analysis_server/src/context_manager.dart:386)
<asynchronous suspension>
#14     LegacyAnalysisServer.setAnalysisRoots (package:analysis_server/src/legacy_analysis_server.dart:901)
<asynchronous suspension>
#15     AnalysisSetAnalysisRootsHandler.handle (package:analysis_server/src/handler/legacy/analysis_set_analysis_roots.dart:56)
<asynchronous suspension>
#16     LegacyAnalysisServer.handleRequest.<anonymous closure>.<anonymous closure> (package:analysis_server/src/legacy_analysis_server.dart:648)
<asynchronous suspension>
#17     OperationPerformanceImpl.runAsync (package:analyzer/src/util/performance/operation_performance.dart:201)
<asynchronous suspension>
#18     LegacyAnalysisServer.handleRequest.<anonymous closure> (package:analysis_server/src/legacy_analysis_server.dart:628)
<asynchronous suspension>
```
