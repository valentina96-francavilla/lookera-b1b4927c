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

## Important mismatch

The repository contains historical SQL files with version identifiers that do not all match the production migration history. Several changes from those files are visible in the current production schema, but their corresponding version identifiers are not recorded in `supabase_migrations.schema_migrations`.

This is migration-history drift. It does **not** by itself mean that the production schema is missing those changes.

## Safety rule

Do not run `supabase db push`, reset, or a bulk migration repair against production until each historical SQL file has been mapped to the exact production change it represents. Reapplying old SQL can fail or alter production unexpectedly.

The current three security/performance migrations are recorded in production and are present in this repository. This note is intended to prevent accidental replay of unmatched historical files while a full baseline/reconciliation is prepared.
