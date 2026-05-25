# Supabase Migration Changelog

| Date | Migration | Reason |
|------|-----------|--------|
| 2026-05-25 | 001_initial_schema.sql | Establish clients table with integer passes column as the starting schema |
| 2026-05-25 | 002_add_products_and_passes.sql | Replace single-column pass count with a products catalogue and per-product passes join table |
