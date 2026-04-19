# BabyGuard — Stitch designs v1

Design notes for HTML mocks under this folder. **Global palette, screen registry, and Phase 2 copy guidelines** live in [../../DESIGN.md](../../DESIGN.md).

## App shell — Bottom navigation

Primary **fixed bottom bar**: exactly four tabs, **Vietnamese** labels, shared markup pattern from [`babyguard_home_phase_2_safe_updated/code.html`](babyguard_home_phase_2_safe_updated/code.html).

### Tabs

| Order | Label | Material Symbol | Role |
|-------|--------|-----------------|------|
| 1 | Trang chủ | `home` | Monitoring hub (all Home states: safe, weak, alert) |
| 2 | Thiết bị | `devices` | Beacons: scan, list, detail, co-guardians |
| 3 | An toàn | `security` | Safe zones and “reduce false alarm” context |
| 4 | Cài đặt | `settings` | Settings, account, family |

### Visual / layout tokens

- **Container:** `nav.fixed.bottom-0.w-full.z-50.pb-safe.bg-white/90.backdrop-blur-xl.border-t.border-black/5.shadow-2xl`
- **Row:** `div.flex.justify-around.items-center.h-20.px-4.max-w-lg.mx-auto`
- **Active tab:** link `text-primary`; icon `text-[26px]` with `style="font-variation-settings: 'FILL' 1;"` on the glyph
- **Inactive tabs:** `text-secondary/60 hover:text-secondary transition-colors`; icon without `FILL` 1 (outline)

### Exceptions

- **Onboarding** ([`babyguard_onboarding_phase_2`](babyguard_onboarding_phase_2/)): page indicators + primary CTA footer — **no** four-tab bar.
- **Invite accept** and similar single-task flows: no shell unless product adds it later.

### Screen → highlighted tab (for mock consistency)

| Folder / screen | Active tab |
|-----------------|------------|
| `babyguard_home_phase_2_safe_updated` | Trang chủ |
| `babyguard_home_phase_2_alert` | Trang chủ |
| `babyguard_home_phase_2_weak_signal` | Trang chủ |
| `history` | Trang chủ (history is hub-adjacent; no dedicated tab) |
| `th_m_beacon_phase_2` | Thiết bị |
| `chi_ti_t_beacon_phase_2` | Thiết bị |
| `co_guardians_list_phase_2` | Thiết bị |
| `safe_zones` | An toàn |
| `settings` | Cài đặt |

### Related v1 folders (BabyGuard Phase 2)

`babyguard_home_phase_2_*`, `babyguard_onboarding_phase_2`, `settings`, `safe_zones`, `history`, `co_guardians_list_phase_2`, `chi_ti_t_beacon_phase_2`, `th_m_beacon_phase_2`, `ch_p_nh_n_l_i_m_i` (invite flow).

### Content padding

Keep scrollable `<main>` (or primary column) with **bottom padding** at least ~`pb-32` (8rem) so content clears the `h-20` bar plus safe-area (`pb-safe` on `nav`).
