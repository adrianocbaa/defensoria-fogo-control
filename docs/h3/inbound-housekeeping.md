# Inbound maintenance housekeeping — 2026-10-23

## Audit baseline
- Only images were processed: 8 MiB per file, 20 MiB per email; no count cap, content signature check, ticket/thread cap or tenant quota check.
- Invalid/over-limit files and upload failures were silently skipped. Thread replies did not persist attachments.
- `service-photos` is private, allows images, videos and documents, and caps a single object at 100 MiB; `documents` is private with no bucket-specific size/MIME cap. Neither bucket setting was changed.
- Usage counters are reconciled daily at 03:00 UTC, not atomically reserved per upload. They cannot safely enforce incoming batch quotas or concurrent usage; plan integration is intentionally deferred. No billing or entitlement changes, including DPE-MT.

## Adopted policy
- 10 attachments/email, 10 MiB/file, 25 MiB/email; bounded webhook input is 40 MiB (encoding overhead).
- PDF, JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC and HEIF: detected header, extension and supplied MIME must agree. Octet-stream/missing MIME can be resolved only through coherent extension and detected bytes; SVG, executables and dangerous intermediate extensions are rejected. This is type validation, not antivirus/content disarm.
- Common images stay in `service-photos`; PDF and other previously accepted image formats use `documents` because of the existing bucket MIME restrictions. Private `<org>/maintenance-inbound/<ticket>/<uuid>-<filename>` paths and canonical storage references are preserved.
- All attachments are validated before uploads or ticket/email writes. Rejected batches return sanitized 400/413/415 errors. Downloads are bounded and limited to HTTPS Supabase/Resend hosts, without redirects; failures return sanitized 502/503 errors. Confirm other legitimate providers before extending the allowlist.
- Failed upload batches attempt removal of earlier uploads; failed compensation is explicitly reported. A new-ticket email-row failure returns 500 with `ticket_created: true`, rather than pretending success; distributed DB/Storage writes are not an atomic transaction.
- New tickets retain image references; every new inbound email row (including thread replies) retains attachment metadata, with private opening buttons in the conversation.
- No cumulative ticket/thread cap added. A reliable atomic plan quota and optional antivirus remain future work.

## Configuration
- Existing `super_admin_set_maintenance_inbound` reinforced with normalized alias/domain validation and routing conflicts.
- New `super_admin_save_maintenance_inbound` transactionally saves settings and exact address mappings, serializing configuration changes and preserving unchanged address records/notes.
- Both check `is_super_admin(auth.uid())`; new RPC is inaccessible to anon/service_role, and no direct table write grants or RLS changes were added.
- Registered-or-domains can have an empty domain list (registered users still work); domains-only requires a nonempty list. Enabled configuration requires alias or exact address.
- Migration: `supabase/migrations/20261023014013_28b6801e-8b24-484b-b44c-fe494a68d882.sql`. No existing configuration data changed by the migration.
- New Super Admin tab: E-mail de Manutenção, with enabled switch, alias, sender policy, domains and exact addresses; no secrets.

## Verification
- 29 Node tests cover limits, type/signature checks, downloads, compensation, configuration normalization, complete handler fixtures and preserved tenant/thread/header/deduplication behavior.
- 3 Deno tests include an actual PostalMime multipart PDF parse.
- Existing destination regression tests passed; automatic frontend build/typecheck OK.
- Desktop/mobile browser mocks verified load, normalized save and read-back, with no runtime errors/overflow. No authenticated real Super Admin save was performed on the external Supabase connection.
- Only inbound-maintenance-email was redeployed. Live missing-secret and unresolved-recipient checks reject safely without writes.
- Linter: 61 preexisting findings, plus one intentional authenticated SECURITY DEFINER RPC finding. Its fixed search_path and mandatory super_admin guard were read back; anon and service_role execute are denied. Removing authenticated EXECUTE would break the explicitly requested guarded panel access, so the warning is documented rather than widening access or weakening authorization.
- Frontend requires Publish → Update; nothing published automatically.