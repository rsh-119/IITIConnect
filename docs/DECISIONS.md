# Architecture decisions and roadmap

## ADR-001 — One web app and managed backend (proposed, 2026-10-18)

Context: a solo developer expects roughly 1,000 accounts and fewer than 100 daily active users on busy days. Decision: use one Next.js App Router app and Supabase Auth/Postgres/RLS/Realtime/Storage, with Vercel hosting, subject to Phase 1 compatibility and cost checks. Alternatives: custom API/socket server or microservices. Reasoning: a single codebase and managed services reduce operations. Tradeoffs: provider limits and vendor-specific RLS/Auth integration. Consequence: measure usage and document a path to change providers if needed.

## ADR-002 — Separate journey legs (proposed)

Context: outward and return travel can have different times, seats, passengers and fares. Decision: store a trip with one or two independent legs. Alternative: one trip row with shared passenger list. Reasoning: independent legs make capacity and fare rules explicit. Tradeoff: an extra relation and per-leg workflows. Consequence: join, matching and chat context refer to a leg.

## ADR-003 — Database-enforced access and invariants (proposed)

Context: clients are untrusted and concurrent requests can overbook or double-assign items. Decision: explicit grants/RLS and transactional functions plus unique/partial indexes. Alternative: server-only application checks. Reasoning: database enforcement protects direct API access and races. Tradeoff: policy/function tests and migration complexity. Consequence: Phase 2 must establish isolated database testing before member features.

## ADR-004 — Rule-based matching (proposed)

Context: a small campus needs understandable suggestions. Decision: deterministic filters and a simple score with reasons. Alternatives: ML/vector search or paid mapping. Reasoning: cost, transparency and testability. Tradeoff: less flexible geographic understanding. Consequence: use curated campus location zones and measure false matches.

## ADR-005 — Workflow-scoped chat (proposed)

Context: open direct messages invite spam. Decision: create conversations only for a join or item workflow between eligible users. Alternative: unrestricted user-to-user DMs. Reasoning: clear access control and abuse boundaries. Tradeoff: less spontaneous contact. Consequence: block/report and context eligibility apply to every send/read.

## ADR-006 — Candidate institute domain (2026-10-18)

Context: the project owner provided one `@iiti.ac.in` address to guide verification setup. Decision: use `iiti.ac.in` as the configurable initial allowed domain without storing the full address in the repository. Alternatives: keep the domain unset or hardcode a full address. Reasoning: the owner supplied enough information for foundation configuration. Tradeoff: this does not verify current institutional policy or prove ownership of any individual mailbox. Consequence: Phase 3 must enforce email confirmation and trusted campus membership before access.

## Phase roadmap

Every phase depends on the preceding verified phase, includes relevant static/tests/security/regression checks, documentation updates, and a stop for approval. Acceptance below is additional to those gates.

| Phase | Dependencies and deliverable | Phase acceptance |
|---|---|
| 0 Audit/planning | empty-repo audit; docs and architecture | docs reflect no implementation; risks and roadmap recorded |
| 1 Foundation | approved 0; Next.js, strict TS, styling, validation/test tooling, PWA shell | lint, typecheck, build and foundation tests pass |
| 2 Data/security | 1; migrations, grants, RLS, transaction functions | fresh migration and cross-user/campus denial tests pass |
| 3 Auth/profiles | 2; domain verification, sessions, profile | unverified/suspended access and impersonation tests pass |
| 4 Core UI/feed | 3; responsive screens and paginated feed | mobile navigation, accessible states and feed filters verified |
| 5 Trips | 4; legs, join workflow and fare | concurrent capacity, distinct return seats and permission tests pass |
| 6 Items | 5; request/offer state machine | one active fulfilment and cancellation/dispute paths tested |
| 7 Matching | 6; ranking with explanations | scenario tests and representative query measurement recorded |
| 8 Chat | 7; scoped Realtime messages and unread | access, block, duplicates, reconnect and pagination tested |
| 9 Notifications/PWA | 8; in-app and optional push | consent, iOS guidance, denied fallback and cache privacy tested |
| 10 Moderation/analytics | 9; reports, suspension, audit, minimal metrics | role denial, audit record and privacy review pass |
| 11 Full QA | 10; end-to-end and performance audit | severity-ranked findings resolved or explicitly accepted |
| 12 Deployment preparation | 11; production configuration plan | production build and smoke checklist pass; deployment awaits explicit approval |

Open design choices: item policy, backup approach and numeric rate limits. Record each final decision here when evidence is available.

## ADR-011 — Retention, account deletion, email and sign-in (2026-10-27)

The owner chose: finished trips, items, chats and notifications are deleted 90 days after they end; account deletion anonymizes the member (profile becomes `Deleted member`, sign-in and email removed, shared history kept until the 90-day purge); Resend's free tier will send production sign-up email; and Google sign-in is offered alongside password sign-in. Closed moderation records are kept for one year. Push and the purge are triggered by Supabase Cron with `pg_net` and share one scheduler token. The owner also chose to finish a fully working web application before any mobile app. Consequence: the privacy notice at `/privacy` states these rules; Resend and the Google provider still need owner-side setup.

## ADR-010 — IIT Indore Google Workspace sign-in (2026-10-20)

Context: the owner requested Google sign-in limited to IIT Indore accounts. Decision: add Supabase Google OAuth alongside existing password sign-in. The Google callback checks the verified email and Google hosted-domain claim after the PKCE exchange; the database still restricts profile enrollment to enabled campus domains. The `hd` request parameter is an account-picker hint, not authorization. Tradeoff: Google OAuth needs a configured Google Cloud client and Supabase provider, and managed Workspace policy may require an administrator. The linked test provider is still disabled, so live Google sign-in remains unverified.

## ADR-007 — Isolated PostgreSQL tests before Supabase provisioning (2026-10-18)

Context: the owner authorized work on remaining phases but has no Supabase project, and Docker/CLI are unavailable. Decision: use PGlite with a minimal Auth identity stub to test portable migrations, grants, RLS and workflow functions locally. Alternatives: defer every database check until project creation or provision external infrastructure now. Reasoning: this catches schema and authorization defects while keeping production data untouched. Tradeoff: it does not validate Supabase Auth, Realtime publication, Storage, concurrency across connections or hosted PostgREST behavior. Consequence: a fresh test Supabase project and signed-in E2E run remain release gates; no later phase is declared complete on PGlite evidence alone.

## ADR-008 — Aggregate product metrics (2026-10-20)

Context: product usage needs measurement without collecting student identities in analytics. Decision: database triggers increment campus/day/event counts for six workflow milestones; only same-campus moderators can read them. A pending migration adds aggregate compatible-trip opens through a validated member RPC. Alternatives: per-user event logs or a third-party analytics service. Reasoning: aggregate rows avoid unnecessary personal data and recurring cost, and transactional triggers count successful state changes. Tradeoff: small campus counts can still reveal activity timing, fictional test actions contribute to test-project totals, and repeated opens can increase the count. Consequence: keep the metrics view moderator-only and use a separate production project. The new count requires live migration verification.

## ADR-009 — Guarded campus zone controls (2026-10-20)

Context: moderators need limited campus management without disrupting open trips or item requests. Decision: allow same-campus moderators to activate or deactivate location zones through an audited RPC, and reject deactivation while active workflows reference the zone. Triggers lock and validate zones when new legs or items are inserted. Alternative: unrestricted direct table updates or removing zones. Reasoning: disabling a zone should affect future selection without breaking existing travel or item records. Tradeoff: extra locking and an audit table. Consequence: inactive zones remain readable to moderators and can be restored; members see only active zones.

## ADR-012 — IIT Indore Google as the only sign-in (2026-10-28)

Context: the owner asked for sign-in that works like apps using the Google account already on the device, with the college address only, and for the password and create-account forms to be removed. Decision: offer only "Continue with IIT Indore Google" (Supabase Google OAuth with `hd=iiti.ac.in` and `prompt=select_account`); the first sign-in leads to onboarding, which pre-fills the Google name. Password sign-in, sign-up, the email-confirmation callback and their status messages were removed. The Google client is Internal to the `iiti.ac.in` organization. Consequence: Resend (ADR-011) is no longer needed for sign-up; production should disable the Supabase Email provider. The test project keeps it enabled only for fictional-account QA scripts. A real fix during setup: Supabase stores Google's hosted-domain claim as `identity_data.custom_claims.hd`, which the callback now reads.

## ADR-013 — Fest-poster visual system (2026-10-28)

Context: the owner asked for a modern, eye-catching redesign of the home page and whole app, explicitly not a corporate SaaS template, with a live-looking trip board first. Decision: a campus fest-poster screenprint world chosen from a seeded direction round: indigo ink on halftone paper, pink and yellow overprint plates, condensed poster headings, one tabular face for data, one heavy 2px outline for every control, and trips presented as a lineup with a NOW rule. Alternatives offered: a station departure board and a standard shadcn-style app. Consequence: neutrals are ink tints (Tailwind slate remapped in `globals.css`), heading styles live in the base layer so user text can stay sentence case, and the home lineup uses clearly labelled sample data only.

## ADR-014 — Ask a traveller to carry an item (2026-10-28)

Context: the owner wanted trips to be quick to post and items to be asked of a specific traveller rather than posted for anyone. Decision: the trip form takes destination, time, seats and an "Open to bring items" toggle, always leaving from IIT Indore Campus. An ask creates an item request plus an `asked` fulfilment for the trip organizer; the organizer accepts (budget becomes the agreed price) or declines. A new status was chosen over reusing `offered` so old offer functions cannot act on an ask. Consequence: the open item feed and "Request item" page are gone; old item data remains readable until the 90-day purge.

## ADR-015 — Soft travel visual system (2026-10-28)

Context: the owner found the fest-poster look unprofessional and supplied a pastel travel landing page as the reference. Decision: gradient sky backgrounds with drawn hills, white rounded floating cards, Bodoni Moda plus Manrope, and one coral action colour (#cf4416, chosen for 4.68:1 contrast with white). This replaces ADR-013. Consequence: DESIGN.md and the surface brief were rewritten for this system.
