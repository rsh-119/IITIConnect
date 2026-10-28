# Testing strategy and results

## 2026-10-21 live QA rerun

The existing local app responded with HTTP 200. Both linked-project smoke scripts were run but stopped at their first temporary Auth user creation (`Test user creation: unknown`). A direct HTTPS check could not connect to `heyfvsldcxxhuxotfyjt.supabase.co:443`, and `supabase db push --dry-run` reported `AccessTokenRequiredError`. Neither script received a user ID, opened an authenticated browser context, or reached its data-creation steps. No run-specific database IDs were created or available for cleanup; remote absence could not be independently queried. All signed-in UI plus authoritative Supabase row/RLS journeys are **not tested in this run**. Earlier historical passes below must not be read as a current live retest, especially while four security/metrics migrations remain unapplied.

The production-build Chromium suite passed 12/12, including new browser checks for visitor redirects from trip, item, message and moderator routes and non-campus signup rejection. It also covered narrow public layouts, keyboard focus, baseline response headers, PWA assets/service-worker registration and offline fallback. Google OAuth was intercepted only to inspect its local authorization request; no real Google login occurred. Lint, typecheck, format check, 57 Vitest tests in 14 files and production build passed. A disposable 5,000-leg PGlite query returned 50 matches in 35.777 ms with sequential scans and a hash join; this does not measure hosted performance. Offline npm audit reported zero cached advisories, while the online audit endpoint was unreachable.

## 2026-10-21 QA addendum

The email-change regression first failed on the original SQL: a profile with a newly confirmed `example.edu` address could still read an IIT Indore trip. A second regression accepted an item offer after its supporting trip was cancelled. The two pending migrations deny these actions in PGlite. Both results are local until applied and checked in the linked test project. The CLI initially failed to write telemetry outside the workspace; with telemetry disabled it reports no access token. The linked Supabase host is also unreachable from this sandbox. Both live smoke scripts stopped during their first temporary-user creation, so neither created test data here. The first full Vitest attempt had Windows worker startup errors. The final run with two workers and a 10-second timeout passed all 48 tests in 12 files, including 24 PGlite cases. Lint, typecheck, format check, production build and all 10 Chromium E2E cases passed. The production build preceded the second SQL migration and database test change; no app runtime code changed afterward.

The disposable 5,000-leg matching benchmark returned 50 candidates in 26.835 ms locally and used sequential scans plus a hash join. This is a single local measurement, not hosted latency evidence. A local anonymous `/community` redirect returned `Cache-Control: no-store`; authenticated response headers still need a live session check.

## 2026-10-21 follow-up

Two more PGlite regressions failed against the original acceptance functions: a suspended applicant received a confirmed seat, and a suspended traveller's offer was accepted. Migration `20261021020000_recheck_counterparty_membership.sql` closes both; the local database suite now passes 28 cases, including notification-preference suppression and re-enablement. The feed date filter now uses the next IST midnight as its exclusive endpoint, covering the final fractional second; its time test passes. The item upload has an accessible name. Community responses have an explicit private `no-store` header, verified by a production-build Chromium E2E request to the protected route. Compatible-trip suggestion buttons now call a validated aggregate match-open RPC; a local database test verifies counting, cross-campus denial and cancelled-trip denial. The linked project remains at 21 migrations, with four local migrations pending.

The final app build and 10 Chromium E2E cases passed. An opt-in Firefox project reached Playwright but stalled before its first test and was stopped; Firefox remains unverified in this Windows environment. The Google provider remains disabled in the linked test project, so only local redirect/callback checks passed. Hosted push, device behavior and authenticated response headers remain unverified.

Community navigation now has a route loading state, and the Google, password, trip and item forms show pending text and disable repeat submission while their server action runs. The final production build and 10 Chromium E2E cases passed after these changes; slow hosted-network behavior still requires live testing.

A focused component interaction test opens a suggested trip and asserts that the action receives the selected leg ID while the surrounding trip-post form is not submitted. The database RPC derives the destination trip from that leg and checks current same-campus visibility.

Until the match-open RPC is applied to the linked test project, suggestion navigation falls back only on PostgREST's missing-function error. It reads the open leg and trip through the current member's RLS-scoped client and records no metric. Other RPC errors still fail closed.

Server-action tests confirm that a submitted trip ID is ignored, the validated database trip controls navigation, the missing-RPC fallback works and other RPC errors fail closed.

Final local gates after all changes: lint, typecheck, format check, 57 Vitest tests in 14 files, production build and 10 Chromium E2E tests passed. The initial protected-route header assertion expected HTTP 307, but Next.js streaming can start with HTTP 200 before redirecting. The browser test still confirms navigation to `/auth`; the header assertion now verifies `no-store` on the response. No live Supabase run or real Google sign-in passed in this follow-up.

Offline npm audit reported zero production and development advisories from locally cached data. The online advisory request failed because this environment could not reach the npm audit endpoint, so current registry advisories are unverified.

## Current results (2026-10-20)

Google Workspace gate unit tests cover a valid IIT Indore identity, personal account, missing hosted-domain claim, unverified email and non-Google identity. Callback tests cover successful PKCE exchange, outsider sign-out and missing code. The linked Supabase test project's public Auth settings report Google disabled; a real OAuth browser run is pending provider setup. The Google `hd` request parameter is only a hint, so the callback checks the verified claim returned through Supabase.

`npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run format:check` and `npm.cmd run build` passed. Vitest passed 46 tests in 12 files. Ten Chromium public-route smoke tests passed, including the Google OAuth authorization redirect. The production dependency audit found zero vulnerabilities. The linked Supabase test project records all 21 migrations. The project homepage returned HTTP 200 locally.

Fictional-account browser tests passed sign-in, onboarding, the owner's originally reported trip URL, new trip and item posting, private image upload and signed rendering, seat request and acceptance, private chat, and item offer and acceptance. Test identities and dependent data were removed. A local production-server check of the push route returned HTTP 401 without its dispatch token and HTTP 200 with it; the queue was empty.

The owner's real institute address received a confirmation email and password sign-in worked. The email link confirmed the address but did not create a session in the app. The callback now forwards `sb_flow_id` to the PKCE exchange and has a focused regression test; a fresh link has not verified the fix.

The latest four-account interaction run passed immediate Realtime delivery, join/acceptance notification UI, marking a notification read, concurrent final-seat acceptance with exactly one participant, moderator report dismissal, audit history, aggregate metric rendering, and suspension denying community access. PGlite checked one-time aggregate transitions and moderator-only, same-campus visibility. These additions were verified after applying migration 20 to the test project; the script removed all temporary users and data.

A repeat live interaction run verified that chat reports delayed updates offline, reconnects and receives a second message. Two browser tabs accepted different offers for the same item concurrently; the database retained one accepted offer and declined the other. The script cleaned up its fictional accounts and posts. Chromium verified that an offline navigation shows a retry page while Cache Storage contains only the static offline explanation.

`node scripts/match-query-benchmark.mjs` built a disposable PGlite database with 5,000 synthetic trips and legs, 12.5% matching the target zone, and ran an authenticated 50-row item-match lookup. One run took 21.9 ms and used sequential scans and a hash join. This is a local baseline, not a Supabase latency guarantee; repeat with representative live volumes and indexes before a larger launch.

Migration 21 added audited campus zone controls. PGlite verified member denial, moderator access, inactive-zone visibility and refusal to disable a zone with an open trip. A live fictional-zone browser run passed disable, restore and audit history, then removed the zone and all test identities.

## Test layers

- **Unit and component:** Vitest covers time conversion, matching, input validation, image signatures, auth error mapping, callback parameters and push sender behavior.
- **Database and RLS:** PGlite runs portable migrations with a stub Auth schema. Tests cover campus isolation, denied direct writes, trip and item transitions, expiry, moderation, subscription ownership and push queue state. Live test-project checks confirmed anonymous member reads are denied and owner/outsider visibility differs as intended.
- **Public browser:** `npm.cmd run test:e2e` launches Chromium after a production build and checks landing, narrow viewport, protected routes, account entry, error copy, PWA assets, service worker registration, security headers and keyboard focus. The runner starts and stops its own server.
- **Signed-in browser:** With the local app running and the server-only test key in ignored `.env.local`, run `node scripts/live-smoke.mjs` and `node scripts/live-interaction-smoke.mjs`. `node scripts/live-offer-load.mjs` (set `IITI_CONNECT_OFFER_LOAD` for the traveller count, default 8) needs no running app and fires simultaneous offer acceptances at the database. `live-smoke.mjs` also deletes its account through Settings and checks the anonymized profile, removed image and blocked sign-in. These scripts create confirmed fictional accounts in the linked test project and clean them up. They refuse other project hosts. Set `IITI_CONNECT_REGRESSION_TRIP_ID` to an existing trip UUID to add a specific trip-detail regression check.
- **Manual devices:** Verify Android Chrome and installed iOS PWA installation, push permission, denied/unsupported fallback, touch targets, keyboard/focus behavior and screen readers.

Use fictional users and locations for tests. Do not send credentials or confirmation links to logs. Because the app only offers Google sign-in, the browser scripts sign each temporary admin-confirmed identity in server-side (`scripts/live-session.mjs`) and hand the browser its session cookies; this needs the test project's Email provider enabled and does not exercise the Google screen.

## Remaining QA

Verify a fresh email callback and the new Google OAuth flow with real accounts after provider setup, push delivery and notification preferences, larger competing-offer loads, slow-network behavior, deeper accessibility, and representative matching query performance. Offline navigation and a single two-offer race passed; offline posting and messaging are not supported. Real push delivery requires a hosted HTTPS sender schedule and compatible devices. Public-route E2E runs in Chromium (`npm run test:e2e`), Firefox (`--config playwright.firefox.config.ts`) and WebKit (`--config playwright.webkit.config.ts`). The offline-fallback case runs only in Chromium because Playwright's offline mode does not cover service worker fetches in the other engines. Keep regression tests for each defect found.

| Severity | Open issue                                                                                                                                                            | Release effect                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| High     | Real Android/iOS installation and push delivery, hosted push scheduling and alerting are unverified.                                                                  | Do not promise device push.                                                  |
| High     | Backup and restore have not been chosen or exercised; the `/privacy` notice has had no legal review.                                                                  | Public data collection is not release-ready.                                 |
| Medium   | Slow networks, screen readers and representative query performance remain untested. Firefox/WebKit cover public routes only; their offline fallback is not automated. | Broader reliability and accessibility are not established.                   |
| Low      | Automated hosted error alerts are not configured; local server paths log safe operation/error codes.                                                                  | Incident detection depends on manual log review until hosting is configured. |

On 2026-10-27 both `npm audit` and `npm audit --omit=dev` reported zero vulnerabilities; recheck before release. PGlite does not execute Supabase-specific Realtime, Cron or Storage migrations, so the live test project remains necessary for those checks.
