# Needs: 03-rebind-ui/003-build-converge-widgets

## Expected Outputs

- `packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx`
- `packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx`
- `packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx`
- `packages/studio/src/components/dashboard/widgets/quick-actions-widget.tsx`

## Checks

- **all-four-widgets-exist**: All four converge widgets exist
- **widgets-use-converge-data**: Widgets reference converge data hooks or APIs
