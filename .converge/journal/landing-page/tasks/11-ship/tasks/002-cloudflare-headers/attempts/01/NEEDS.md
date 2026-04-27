# Needs: 11-ship/002-cloudflare-headers

## Expected Outputs

- `apps/landing/public/_headers`

## Checks

- **headers-exists**: public/_headers exists
- **has-csp**: has CSP or X-Frame-Options
- **has-cache-control**: has Cache-Control directives
