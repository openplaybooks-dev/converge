# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **no-empty-handlers**
- ❌ **dart-analysis-valid**

## ❌ no-empty-handlers

**Command**: `node .converge/playbooks/default/tasks/06-wire-screens/004-verify/check-all-handlers.mjs`
**Exit code**: 1
**Output**:
```
FAIL: 36 empty handler(s) found:

  lib/screens/add_safe_zone/add_safe_zone_screen.dart:41 — onPressed is empty
  lib/screens/add_safe_zone/add_safe_zone_screen.dart:189 — onPressed is empty
  lib/screens/add_safe_zone/widgets/address_field.dart:53 — onPressed is empty
  lib/screens/beacon_detail/widgets/technical_accordion.dart:33 — onTap is empty
  lib/screens/beacon_detail/widgets/co_guardian_card.dart:98 — onPressed is empty
  lib/screens/beacon_detail/widgets/co_guardian_card.dart:119 — onPressed is empty
  lib/screens/beacon_edit/widgets/avatar_section.dart:29 — onPressed is empty
  lib/screens/beacon_edit/widgets/delete_button.dart:14 — onPressed is empty
  lib/screens/beacon_forget_confirmation/beacon_forget_confirmation_screen.dart:99 — onPressed is empty
  lib/screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:101 — onPressed is empty
  lib/screens/edit_safe_zone/edit_safe_zone_screen.dart:42 — onPressed is empty
  lib/screens/edit_safe_zone/widgets/address_field.dart:56 — onPressed is empty
  lib/screens/edit_safe_zone/widgets/delete_button.dart:15 — onPressed is empty
  lib/screens/event_delete_confirmation/event_delete_confirmation_screen.dart:99 — onPressed is empty
  lib/screens/filter_date/filter_date_screen.dart:174 — onPressed is empty
  lib/screens/filter_date/filter_date_screen.dart:196 — onPressed is empty
  lib/screens/filter_date_range/filter_date_range_screen.dart:175 — onPressed is empty
  lib/screens/filter_date_range/filter_date_range_screen.dart:229 — onTap is empty
  lib/screens/guardians/widgets/invite_guardian_button.dart:17 — onPressed is empty
  lib/screens/history/history_screen.dart:162 — onPressed is empty
  lib/screens/home/home_screen.dart:433 — onPressed is empty
  lib/screens/home/widgets/beacon_strip.dart:63 — onPressed is empty
  lib/screens/home/widgets/quick_actions.dart:54 — onTap is empty
  lib/screens/invite_accept/invite_accept_screen.dart:295 — onPressed is empty
  lib/screens/onboarding/onboarding_screen.dart:196 — onPressed is empty
  lib/screens/safe_zone_delete_confirmation/safe_zone_delete_confirmation_screen.dart:99 — onPressed is empty
  lib/screens/settings/settings_screen.dart:180 — onPressed is empty
  lib/screens/test_alert/test_alert_screen.dart:137 — onPressed is empty
  lib/screens/timeout_picker/timeout_picker_screen.dart:67 — onTap is empty
  lib/screens/timeout_picker/timeout_picker_screen.dart:73 — onTap is empty
  lib/screens/timeout_picker/timeout_picker_screen.dart:79 — onTap is empty
  lib/screens/timeout_picker/timeout_picker_screen.dart:85 — onTap is empty
  lib/screens/timeout_picker/timeout_picker_screen.dart:93 — onPressed is empty
  lib/widgets/address_field.dart:56 — onPressed is empty
  lib/widgets/beacon_strip.dart:65 — onTap is empty
  lib/widgets/quick_actions.dart:55 — onTap is empty
```

## ❌ dart-analysis-valid

**Command**: `dart analyze lib/`
**Exit code**: 3
**Output**:
```
Analyzing lib...

  error - screens/alert/alert_screen.dart:198:44 - The method 'pop' isn't defined for the type 'BuildContext'. Try correcting the name to the name of an existing method, or defining a method named 'pop'. - undefined_method
  error - screens/beacon_scanner/beacon_scanner_screen.dart:50:36 - The method 'pop' isn't defined for the type 'BuildContext'. Try correcting the name to the name of an existing method, or defining a method named 'pop'. - undefined_method
  error - screens/beacon_scanner/beacon_scanner_screen.dart:459:40 - The method 'push' isn't defined for the type 'BuildContext'. Try correcting the name to the name of an existing method, or defining a method named 'push'. - undefined_method
  error - screens/history/history_screen.dart:60:38 - The method 'push' isn't defined for the type 'BuildContext'. Try correcting the name to the name of an existing method, or defining a method named 'push'. - undefined_method
  error - screens/history/history_screen.dart:146:19 - Undefined name 'Share'. Try correcting the name to one that is defined, or defining the name. - undefined_identifier
  error - screens/onboarding/onboarding_screen.dart:27:36 - The method 'pop' isn't defined for the type 'BuildContext'. Try correcting the name to the name of an existing method, or defining a method named 'pop'. - undefined_method
  error - screens/onboarding/onboarding_screen.dart:40:38 - The method 'go' isn't defined for the type 'BuildContext'. Try correcting the name to the name of an existing method, or defining a method named 'go'. - undefined_method
  error - screens/safe_zones/safe_zones_screen.dart:91:34 - The method 'push' isn't defined for the type 'BuildContext'. Try correcting the name to the name of an existing method, or defining a method named 'push'. - undefined_method
warning - screens/add_safe_zone/add_safe_zone_screen.dart:79:7 - The declaration '_FormField' isn't referenced. Try removing the declaration of '_FormField'. - unused_element
warning - screens/add_safe_zone/add_safe_zone_screen.dart:140:7 - The declaration '_AddressField' isn't referenced. Try removing the declaration of '_AddressField'. - unused_element
warning - screens/beacon-detail/beacon_detail_screen.dart:114:10 - The declaration '_buildGuardianRow' isn't referenced. Try removing the declaration of '_buildGuardianRow'. - unused_element
warning - screens/event_detail/event_detail_screen.dart:8:16 - The value of the field '_secondary' isn't used. Try removing the field, or using it. - unused_field
warning - screens/filter_date/filter_date_screen.dart:8:16 - The value of the field '_surfaceContainer' isn't used. Try removing the field, or using it. - unused_field
warning - screens/guardians/guardians_screen.dart:12:11 - The value of the local variable 'colorScheme' isn't used. Try removing the variable or using it. - unused_local_variable
warning - screens/pairing_confirmation/pairing_confirmation_screen.dart:8:16 - The value of the field '_surfaceContainer' isn't used. Try removing the field, or using it. - unused_field
warning - screens/settings/settings_screen.dart:3:8 - Unused import: 'widgets/alert_settings_card.dart'. Try removing the import directive. - unused_import
warning - screens/test_alert_countdown/test_alert_countdown_screen.dart:8:16 - The value of the field '_secondary' isn't used. Try removing the field, or using it. - unused_field
warning - screens/timeout_picker/timeout_picker_screen.dart:7:16 - The value of the field '_surfaceContainerLow' isn't used. Try removing the field, or using it. - unused_field
warning - screens/timeout_picker/timeout_picker_screen.dart:8:16 - The value of the field '_surfaceContainer' isn't used. Try removing the field, or using it. - unused_field
   info - screens/add_safe_zone/add_safe_zone_screen.dart:52:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/add_safe_zone/add_safe_zone_screen.dart:54:16 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/add_safe_zone/add_safe_zone_screen.dart:61:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/add_safe_zone/add_safe_zone_screen.dart:190:21 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/add_safe_zone/widgets/active_toggle.dart:21:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/add_safe_zone/widgets/active_toggle.dart:38:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/add_safe_zone/widgets/map_preview_card.dart:58:23 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/add_safe_zone/widgets/radius_selector.dart:38:76 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/alert/alert_screen.dart:70:74 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/alert/alert_screen.dart:103:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:105:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:107:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:142:24 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:155:21 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:157:30 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:178:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:181:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:186:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon-detail/beacon_detail_screen.dart:199:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_detail/widgets/co_guardian_card.dart:40:29 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_detail/widgets/co_guardian_card.dart:224:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_forget_confirmation/beacon_forget_confirmation_screen.dart:64:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_forget_confirmation/beacon_forget_confirmation_screen.dart:67:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_forget_confirmation/beacon_forget_confirmation_screen.dart:108:34 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:74:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:77:23 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:79:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:81:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart:83:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_scanner/beacon_scanner_screen.dart:219:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_scanner/beacon_scanner_screen.dart:340:74 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/beacon_scanner/widgets/beacon_device_card.dart:106:73 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/beacon_scanner/widgets/beacon_device_card.dart:163:55 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/edit_safe_zone/edit_safe_zone_screen.dart:53:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/edit_safe_zone/edit_safe_zone_screen.dart:55:16 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/edit_safe_zone/edit_safe_zone_screen.dart:61:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/edit_safe_zone/edit_safe_zone_screen.dart:73:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/edit_safe_zone/widgets/active_toggle.dart:23:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/edit_safe_zone/widgets/map_preview_card.dart:68:26 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/edit_safe_zone/widgets/radius_selector.dart:46:75 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/event_delete_confirmation/event_delete_confirmation_screen.dart:64:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/event_delete_confirmation/event_delete_confirmation_screen.dart:67:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/event_delete_confirmation/event_delete_confirmation_screen.dart:108:34 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/event_detail/event_detail_screen.dart:63:23 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/event_detail/event_detail_screen.dart:97:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/event_detail/event_detail_screen.dart:102:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/event_detail/event_detail_screen.dart:107:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/event_detail/event_detail_screen.dart:115:29 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/event_detail/event_detail_screen.dart:117:38 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/filter_date/filter_date_screen.dart:154:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/filter_date/filter_date_screen.dart:156:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/filter_date/filter_date_screen.dart:163:67 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/filter_date/filter_date_screen.dart:166:68 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/filter_date_range/filter_date_range_screen.dart:53:17 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/filter_date_range/filter_date_range_screen.dart:66:17 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/filter_date_range/filter_date_range_screen.dart:70:66 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/guardians/guardians_screen.dart:52:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/guardians/guardians_screen.dart:66:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/guardians/guardians_screen.dart:80:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:30:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:33:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:81:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:83:22 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:85:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:87:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:89:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:95:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:110:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:125:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:28:43 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/home_screen.dart:64:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:66:16 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:70:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:114:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/home_screen.dart:118:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/home_screen.dart:122:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/home_screen.dart:183:39 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/home_screen.dart:208:9 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:210:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:212:22 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:221:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:223:22 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:248:76 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/home_screen.dart:288:49 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/home_screen.dart:315:45 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/home_screen.dart:350:35 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:357:51 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/home_screen.dart:472:14 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:496:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:498:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:498:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:500:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:500:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:502:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:502:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/home_screen.dart:526:76 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/home/widgets/map_card.dart:51:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/widgets/map_card.dart:204:37 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/home/widgets/status_section.dart:29:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/invite_accept/invite_accept_screen.dart:96:73 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/invite_accept/invite_accept_screen.dart:102:45 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/invite_accept/invite_accept_screen.dart:163:64 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/invite_accept/invite_accept_screen.dart:332:26 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/pairing_confirmation/pairing_confirmation_screen.dart:77:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/pairing_confirmation/pairing_confirmation_screen.dart:78:34 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/pairing_confirmation/pairing_confirmation_screen.dart:90:31 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/pairing_confirmation/pairing_confirmation_screen.dart:92:40 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/pairing_confirmation/pairing_confirmation_screen.dart:104:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/pairing_confirmation/pairing_confirmation_screen.dart:107:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zone_delete_confirmation/safe_zone_delete_confirmation_screen.dart:64:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zone_delete_confirmation/safe_zone_delete_confirmation_screen.dart:67:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zone_delete_confirmation/safe_zone_delete_confirmation_screen.dart:108:34 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:110:12 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:113:9 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:186:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:190:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:192:75 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:196:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:251:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:288:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:302:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:316:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:349:56 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:380:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:381:36 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:407:60 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:460:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:493:53 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:574:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:578:55 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:610:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:614:55 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/widgets/bottom_nav.dart:26:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/widgets/bottom_nav.dart:27:18 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/widgets/bottom_nav.dart:30:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/widgets/bottom_nav.dart:31:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/widgets/bottom_nav.dart:32:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/widgets/bottom_nav.dart:33:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/settings_screen.dart:59:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/settings_screen.dart:67:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/settings_screen.dart:164:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/settings_screen.dart:172:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/settings_screen.dart:212:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/settings_screen.dart:395:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/widgets/alert_settings_card.dart:19:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/widgets/alert_settings_card.dart:186:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/widgets/beacon_setup_card.dart:19:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/widgets/general_settings_section.dart:18:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/widgets/general_settings_section.dart:72:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/settings/widgets/general_settings_section.dart:123:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/test_alert/test_alert_screen.dart:53:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/test_alert/test_alert_screen.dart:56:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/test_alert/test_alert_screen.dart:125:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/test_alert/test_alert_screen.dart:128:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/test_alert_countdown/test_alert_countdown_screen.dart:60:41 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/test_alert_countdown/test_alert_countdown_screen.dart:91:17 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/test_alert_countdown/test_alert_countdown_screen.dart:92:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/test_alert_countdown/test_alert_countdown_screen.dart:94:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/timeout_picker/timeout_picker_screen.dart:54:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/timeout_picker/timeout_picker_screen.dart:57:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/active_toggle.dart:21:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/active_toggle.dart:38:25 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/alert_settings_card.dart:19:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/alert_settings_card.dart:186:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/beacon_setup_card.dart:19:11 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/bottom_nav.dart:26:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/bottom_nav.dart:27:18 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/bottom_nav.dart:30:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/bottom_nav.dart:31:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/bottom_nav.dart:32:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/bottom_nav.dart:33:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - widgets/overlays/alert/alert.dart:79:5 - Use 'const' for final variables initialized to a constant value. Try replacing 'final' with 'const'. - prefer_const_declarations
   info - widgets/overlays/alert/alert.dart:281:5 - Use 'const' for final variables initialized to a constant value. Try replacing 'final' with 'const'. - prefer_const_declarations
   info - widgets/radar_scanning_area.dart:94:29 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors

193 issues found.
```
