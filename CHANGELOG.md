# Changelog

## Unreleased

### Added
- `slots.cancellation_cutoff_hours` column (integer, default 0) — controls how many hours before a slot starts a client can no longer cancel their registration (`007_add_cancellation_cutoff.sql`)
- `settings` table — key/value store for studio-wide configuration, RLS-restricted to authenticated users; seeded with `studio_name`, `client_app_url`, `admin_email`, `cancellation_cutoff_default` (`008_add_settings.sql`)
