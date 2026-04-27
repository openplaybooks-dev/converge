# Needs: 04-ui/019-purge-mc-surface

## Checks

- **catchall-deleted**: The [[...panel]] catch-all is gone
- **dashboard-tree-deleted**: src/components/dashboard, panels, modals, hud, terminal, chat, onboarding all deleted
- **layout-banners-deleted**: nav-rail, header-bar, live-feed, banner files in src/components/layout/ are deleted
- **mc-libs-deleted**: gateway-*, openclaw-*, onboarding-*, pty-*, websocket-* lib modules are deleted
- **api-purged**: src/app/api/ contains only converge-native routes
- **typecheck-passes**: Studio still typechecks after the purge
