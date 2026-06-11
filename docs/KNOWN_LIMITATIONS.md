# Known Limitations

## 1. Client Auth / IDOR

Clients are anonymous — identified by a studio-issued code stored in localStorage, not by Supabase auth. RLS policies on `slot_registrations` allow INSERT and DELETE for anyone (`WITH CHECK (true)`). This means any caller who knows a valid `slot_id` + `client_id` pair can register or cancel on behalf of another client via direct API call.

**Why acceptable now:** Small, trusted studio. UUIDs are not guessable. No sensitive personal or financial data is exposed via these operations.

**Fix when scaling:** Issue clients real Supabase auth sessions (even anonymous auth tied to their code). Tighten RLS to `client_id = auth.uid()` so only the authenticated client can modify their own registrations.

---

## 2. Cancellation Cutoff Is UI-Only

The per-slot `cancellation_cutoff_hours` field is enforced only in the client UI (`canClientCancel` in `src/lib/slots.js`). A direct API call bypasses it entirely.

**Why acceptable now:** Same trust model as #1 — small studio, no adversarial clients expected.

**Fix when scaling:** Same root fix as #1 (real auth + RLS). Additionally, enforce the cutoff in a database function or Edge Function that validates `now() < starts_at - interval '...'` before allowing a DELETE.

---

## 3. Punch Guard Is Per-Registration, Not Per-Client

The `punched` flag lives on the `slot_registrations` row. If an admin unregisters and re-registers a client for the same slot, the flag resets to `false`, allowing a second pass punch for the same client+class.

**Why acceptable now:** Requires deliberate admin action — not a client-exploitable path. Extremely unlikely in normal operation.

**Fix if it occurs:** Track punches durably outside the registration row — e.g. a separate `pass_punches` table keyed on `(client_id, slot_id)`, or check the `activity_log` for an existing `pass_punched` event before deducting.

---

## 4. Client Session in Plain-Text localStorage

The client code is stored in plain text in `localStorage` with a 7-day inactivity timeout. It unlocks only pass-count viewing and class registration — no admin capabilities, no payment data.

**Why acceptable as-is:** The data accessible via this session is not sensitive. Any device with access to the browser already has access to the studio's physical space.

**Revisit if:** The client session is expanded to expose sensitive data (e.g. billing info, personal details), or if the app goes multi-tenant.
