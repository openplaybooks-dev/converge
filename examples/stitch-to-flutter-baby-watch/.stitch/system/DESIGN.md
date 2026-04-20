# Stitch design source — BabyGuard / Child Safety Beacon (Phase 2)

Mobile-first child safety app with multi-user co-guardian support.

## Visual principles

- **Neutral warm palette**: Warm Background `#F4F2EE` (beige gray warm) as primary background, white cards (`#FFFFFF`) with soft shadows, Primary Text `#1E1E1E` for main text
- **Không gian mở**: generous vertical spacing between status, map, beacon, buttons — **airy**, not a dense grid
- **Palette: neutral warm with accents** — Yellow `#F3D98C`, Mint `#CDE3DC`, Lavender `#C9D4F5`, Peach `#EED9D2`
- **Cards / surfaces**: large corner radius (20–28), very soft shadow, Soft Shadow Gray `#E7E3DC` borders
- **Super hero kid** only as a **small status SVG** (~24–40dp) beside the pill — not a large hero illustration
- **Phase 2 Focus**: PEOPLE not devices — UI lists "Mẹ", "Bố", never "phone 1/2"

## Color tokens — BabyGuard neutral warm palette

| Role | Hex | Usage |
|------|-----|-------|
| **Warm Background** | **`#F4F2EE`** | Primary app background |
| **Card Surface** | `#FFFFFF` | Cards, containers |
| **Soft Shadow Gray** | `#E7E3DC` | Light borders, dividers |
| **Primary Text** | `#1E1E1E` | Main text |
| **Secondary Text** | `#8E8E8E` | Secondary text, labels |
| **Accent Yellow** | `#F3D98C` | Warning, weak signal |
| **Accent Mint** | `#CDE3DC` | Safe, positive |
| **Accent Lavender** | `#C9D4F5` | Soft purple accent |
| **Accent Peach** | `#EED9D2` | Alert, warm emphasis |
| **Primary Button** | `#000000` | Primary CTA |
| **Button Text** | `#FFFFFF` | Text on buttons |

## Project

Stitch Project ID: `13807761494969939905` (BabyGuard - Child Safety Beacon App)

---

## Phase 2 Screens (Active)

### ✅ Home Screens
| Screen | Screen ID | Title | Notes |
|--------|-----------|-------|-------|
| Home Safe | e809e0138e9940db9121eacc62e5ca7b | BabyGuard Home - Phase 2 (Safe) Updated | + "Chi tiết beacon" link, co-guardian subtitle |
| Home Weak | ecf7582a990c4922aac1c27a3838ef8d | BabyGuard Home - Phase 2 (Weak Signal) | + co-guardian subtitle |
| Home Alert | 6b20f9196501432d8f39204323930aab | BabyGuard Home - Phase 2 (Alert) | + aggregate check hint |

### ✅ Core Screens (Phase 2)
| Screen | Screen ID | Title | Notes |
|--------|-----------|-------|-------|
| Onboarding | 5b7a69efb0d34ff49da142510a748edd | BabyGuard Onboarding - Phase 2 | + Family co-guardian panel |
| Add Beacon | a26fd30a00a645bd93294c5375dd7d53 | Thêm Beacon - Phase 2 | + Sync line |
| Settings | 54f105d04f6c4b4c9e7dcde48a309a53 | Settings - Phase 2 | + "Tài khoản & gia đình" section |

### ✅ NEW Phase 2 Screens
| Screen | Screen ID | Title | Notes |
|--------|-----------|-------|-------|
| Beacon Detail | c837e4a4975c464598590b6b5236b853 | Chi tiết Beacon - Phase 2 | Co-guardian list with user status |
| Co-guardians List | ba3b5e5f46714835ba8e18f979fbf8f5 | Co-guardians List - Phase 2 | Per-beacon user list with toolbar |
| Co-guardians Alt | fecb2159b13746499412ff62eb3a0a29 | Người cùng theo dõi | Alternative co-guardian view |
| Invite Accept | 2b1e0c48c03042ca85dd404dc5393ab9 | Chấp nhận lời mời | Card with beacon info, Accept/Reject |

### ⏳ Need Phase 2 Updates
| Screen | Screen ID | Status |
|--------|-----------|--------|
| Safe Zones | 0cc9ca8e68fc4fa6928e6eb56925df33 | Existing - needs Phase 2 review |
| History | 48974fb75bbb4fd187cc04e6e5fa1f0e | Existing - needs Phase 2 review |

### ❌ OLD SCREENS (DELETE FROM STITCH UI)
| Screen ID | Title | Reason |
|-----------|-------|--------|
| b709d7e0287b4670b05e69d4214bded7 | BabyGuard Home - Warm Edition | Old Home screen |
| 355bb0110faa4ea9a3c87acda5956684 | Safe Zones | Duplicate |
| e9cb5a127cc64adabe8084d0845dfd82 | Settings | Old Settings |
| a3e68c9096924b9c86aec09b4ae2ef8b | Settings | Old Settings |
| 81d91cee608b46ff9356b0a9c8b86611 | Chi tiết Beacon - Phase 2 | Duplicate |
| f49c709ec387459589fede4740bf7dea | Chấp nhận lời mời | Duplicate |

---

## Phase 2 Key Features

### Home Screen Updates
- **"Chi tiết beacon"** link with chevron on beacon strip
- **Status subtitle**: "Còn [tên] đang gần beacon" (user-first, e.g., "Còn Mẹ đang gần beacon")
- Same unified layout for all states (Safe, Weak, Lost, Alert)

### Onboarding Updates
- **"Theo dõi cùng gia đình"** panel
- Privacy note: "Chỉ chia sẻ vị trí gần - không theo dõi GPS trực tiếp"

### Beacon Detail Screen
- Beacon name + technical details (UUID/Major/Minor)
- **Co-guardian list** with user avatars and status chips:
  - "Đang gần beacon" (mint)
  - "Xa / không thấy" (yellow/peach)
  - "Ngoại tuyến" (gray)
  - "Tạm dừng theo dõi" (muted)
- Actions: Invite, Leave group, Manage list

### Co-guardians List Screen
- Per-beacon user list
- Toolbar: Invite, Remove (owner), Pull-to-refresh
- Vietnamese names only (Mẹ, Bố, etc.)

### Invite Accept Screen
- Beacon name preview
- Inviter display name + role
- Trust/safety microcopy
- Accept/Reject buttons

---

## Vietnamese Copy Guidelines

- **User-first names**: "Mẹ", "Bố", "Bà Ngoại" - NEVER "phone 1/2"
- **Status messages**: "Đang an toàn", "Tín hiệu yếu", "Mất kết nối", "Cảnh báo"
- **Actions**: "Chi tiết beacon", "Mời người cùng theo dõi", "Rời nhóm theo dõi"
- **Status chips**: "Đang gần beacon", "Xa", "Ngoại tuyến", "Tạm dừng theo dõi"
