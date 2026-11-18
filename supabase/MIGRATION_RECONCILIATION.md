# LookEra Supabase migration reconciliation

Checked on 2026-11-18 against the production Supabase project `geltsplcnfliozggscsx`.

## Active project

- Supabase organization: Valeya Studio (Free plan)
- Project: Lookera
- Region: `eu-west-1`
- Project status: `ACTIVE_HEALTHY`
- `supabase/config.toml` now points to this project.

## Production migration history

The production migration table currently records these versions:

| Version | Name |
|---|---|
| 20260930073204 | add_salon_location |
| 20260930102739 | add_activity_type_and_salon_images |
| 20261001104340 | enforce_registered_clients_on_appointments |
| 20261006070848 | force_new_appointments_pending |
| 20261118141705 | harden_lookera_security |
| 20261118141841 | optimize_lookera_rls_and_indexes |
| 20261118142000 | optimize_appointment_insert_policy |
| 20261118144132 | revoke_unused_salon_rating_rpc |

## Important mismatch

The three repository files whose migration names matched production records have now been renamed to the exact recorded production versions (`20260930073204`, `20261001104340`, `20261006070848`). The `20260930102739` file already matched. Other historical SQL files still have no corresponding version in production migration history. Their effects are partly visible in the current schema, but they have not been marked as applied in the migration ledger.

This is migration-history drift. It does **not** by itself mean that the production schema is missing those changes.

The remaining local-only historical versions are:

- `20260828142945`
- `20260828142959`
- `20260925094501`
- `20260925094517`
- `20260929120000`
- `20260929121500`
- `20260930105000`
- `20261001112000`
- `20261004170000`

The production versions all now have a matching migration file in the repository. These nine older files must be reconciled with the production ledger using the Supabase CLI migration-repair workflow after confirming each migration's effects; do not replay their SQL against production.

## Safety rule

Do not run `supabase db push`, reset, or a bulk migration repair against production until each historical SQL file has been mapped to the exact production change it represents. Reapplying old SQL can fail or alter production unexpectedly.

The current three security/performance migrations are recorded in production and are present in this repository. This note is intended to prevent accidental replay of unmatched historical files while a full baseline/reconciliation is prepared.
