# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **dart-analysis-valid**

## ❌ dart-analysis-valid

**Command**: `dart analyze lib/`
**Exit code**: 2
**Output**:
```
Analyzing lib...

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
   info - screens/alert/alert_screen.dart:71:74 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/alert/alert_screen.dart:104:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:106:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:108:28 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:143:24 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:156:21 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:158:30 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:179:15 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:182:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/alert/alert_screen.dart:187:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
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
   info - screens/beacon_scanner/beacon_scanner_screen.dart:220:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/beacon_scanner/beacon_scanner_screen.dart:341:74 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
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
   info - screens/history/history_screen.dart:2:8 - The import of 'package:flutter/services.dart' is unnecessary because all of the used elements are also provided by the import of 'package:flutter/material.dart'. Try removing the import directive. - unnecessary_import
   info - screens/history/history_screen.dart:32:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:35:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:83:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:85:22 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:87:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:89:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:91:19 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:97:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:112:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/history/history_screen.dart:127:13 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
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
   info - screens/safe_zones/safe_zones_screen.dart:111:12 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:114:9 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:187:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:191:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:193:75 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:197:36 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:252:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:289:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:303:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:317:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:350:56 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:381:27 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:382:36 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:408:60 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:461:77 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:494:53 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:575:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:579:55 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
   info - screens/safe_zones/safe_zones_screen.dart:611:20 - Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation. - prefer_const_constructors
   info - screens/safe_zones/safe_zones_screen.dart:615:55 - Missing a required trailing comma. Try adding a trailing comma. - require_trailing_commas
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

186 issues found.
```
