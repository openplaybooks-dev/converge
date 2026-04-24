# Screen Specification: Onboarding

**Fidelity Source:** `.stitch/references/babyguard_onboarding_phase_2/code.html`

---
## 1. Screen Title
Onboarding

## 2. Purpose
First-time setup — explain app, request permissions, pair first beacon, invite family. PageView with horizontal swipe.

## 3. Route
`/onboarding`

## 4. Widget Name
`OnboardingScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#F4F2EE` | App background |
| Surface Container Lowest | `#ffffff` | Cards |
| Earthy Mint | `#4f635e` | Safe accent |
| Mint Tint | `#dff6ee` | Icon backgrounds |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |

**Typography:** Plus Jakarta Sans headlines (700/800), Manrope body (400–600)

## 6. Layout Rules

**Scaffold:** AppBar with progress indicator + skip button. Body: single page content (PageView handles swiping). No bottom nav. Footer with page indicators + CTA.

## 7. Sections

### 7.1 Top Bar
- Back button (leading, ghost)
- BabyGuard title (center)
- "Bỏ qua" skip button (trailing)

### 7.2 Hero Illustration
- Superhero kid image in 176×176dp circle
- White/50 backdrop

### 7.3 Headline + Copy
- "Chào mừng đến với BabyGuard"
- Description about Bluetooth low energy

### 7.4 Permission Cards
- Bluetooth card: icon + title + description
- Location card: icon + title + description
- Notifications card: icon + title + description
- Family Tracking card: icon + title + description + privacy note

### 7.5 Privacy Note
- "Chỉ chia sẻ vị trí gần - không theo dõi GPS trực tiếp"

### 7.6 Footer
- Page indicator dots (3 dots)
- "Bắt đầu" primary CTA button

## 8. Data

| Entity | Fields |
|--------|--------|
| OnboardingStep | currentStep, completedState |
| Permission | type, granted |

## 9. Motion

- Page transition: horizontal slide (300ms)
- Cards: translateY(-4px) on hover
- Button: scale(0.97) on press

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT animate layout properties
- Do NOT center hero sections (use left-aligned editorial)