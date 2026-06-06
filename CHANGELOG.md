# Changelog

## Unreleased

### Added
- `slots.cancellation_cutoff_hours` column (integer, default 0) — controls how many hours before a slot starts a client can no longer cancel their registration (`007_add_cancellation_cutoff.sql`)
- `settings` table — key/value store for studio-wide configuration, RLS-restricted to authenticated users; seeded with `studio_name`, `client_app_url`, `admin_email`, `cancellation_cutoff_default` (`008_add_settings.sql`)
- `activity_log` table — audit log for studio events; INSERT open to anonymous users (client actions), SELECT restricted to authenticated users; indexed on `created_at` and `event_type` (`009_add_activity_log.sql`)
- 2026-06-05 `010_attendance_nullable.sql` — `slot_registrations.attended` is now three-state nullable: NULL (pending), true (attended), false (absent)
- 2026-06-05 `011_add_punched_flag.sql` — added `slot_registrations.punched` (boolean, default false) to prevent double-deducting a pass for the same client in the same class
- 2026-06-06 `012_client_registration_policies.sql` — RLS policies allowing anonymous INSERT and DELETE on `slot_registrations` so clients can register and cancel without authentication; UPDATE remains admin-only
