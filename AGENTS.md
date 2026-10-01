Use a SECURITY INVOKER RPC for public RDO progress, relying on the existing row-level access rules instead of granting visitors the internal SECURITY DEFINER progress function; this preserves the public map's visibility boundary.

Use the shared `fetchAllPaged` helper (`src/lib/supabasePaged.ts`) with a deterministic `.order('id')` + `.range(from, to)` for any bulk query over `medicao_items`, `aditivo_items`, `orcamento_items` or `rdo_reports` that spans multiple obras; a single request silently truncates at ~1000 rows and understates financial totals.

- Multi-tenant: org 1 has fixed UUID 00000000-0000-0000-0000-000000000001; one active org per user at launch (partial unique index); resolve via public.user_organization_id(). Why: safe backfill/default while single-tenant.
