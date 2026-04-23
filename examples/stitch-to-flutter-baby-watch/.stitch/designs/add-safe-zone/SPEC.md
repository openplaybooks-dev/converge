# Screen Specification: Add Safe Zone

**Fidelity Source:** Generated from UX.md §3.5 Add Safe Zone screen

---
## 1. Screen Title
Add Safe Zone

## 2. Purpose
Create a new safe zone with name, address, GPS capture, and radius selector.

## 3. Route
`/safe-zones/add`

## 4. Widget Name
`AddSafeZoneScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#fbf9f5` | App background |
| Surface Container Lowest | `#ffffff` | Cards, inputs |
| Surface Container Low | `#f5f4ee` | Section backgrounds |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Earthy Mint | `#4f635e` | Accent |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** AppBar with back + "Thêm vùng an toàn" title + Save button. Body: scrollable form. No bottom nav. No FAB.

## 7. Sections

### 7.1 Name Field
- Text input with "Tên vùng" label
- Placeholder "Nhập tên vùng"

### 7.2 Address Field
- Text input with "Địa chỉ" label
- GPS capture button (icon button, triggers geolocation)

### 7.3 Radius Selector
- Label "Bán kính"
- Preset buttons: 25m, 50m, 100m, 200m
- Selected state: earthy mint fill

### 7.4 Map Preview
- Static map image showing zone circle
- 200px height, rounded-xl

### 7.5 Active Toggle
- "Kích hoạt" label
- On/Off switch, defaulted to on

### 7.6 Save Button
- "Lưu" — primary button, full-width

## 8. Data

| Entity | Fields |
|--------|--------|
| SafeZone | name, address, latitude, longitude, radiusMeters, isActive |

## 9. Motion

- GPS capture: loading indicator
- Radius selection: 200ms background transition
- Save button: scale(0.98) on press

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT animate layout properties