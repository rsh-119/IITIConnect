# Progress log

## Soft redesign, simpler trips and ask-to-carry (2026-10-28)

The owner rejected the fest-poster look and shared a reference: a soft pastel travel landing with an elegant headline and floating white cards. The whole interface was rebuilt in that direction (ADR-015): blush, peach and mint gradient backgrounds, drawn SVG hills and road, white rounded cards, Bodoni Moda serif plus Manrope sans, one coral action colour.

Product changes requested by the owner (ADR-014): posting a trip now asks only for destination, time, seats and "Open to bring items" (origin is always IIT Indore Campus, no return leg or fare). Standalone item requests were removed; a student asks a specific traveller from their trip page with the item, quantity and maximum budget, and the traveller accepts or declines. Migration `20261028000000_ask_to_carry.sql` adds the `asked` fulfilment status, `ask_to_carry` and `answer_carry_request`, reversed notifications (`item_asked`, `item_ask_accepted`, `item_ask_declined`), chat during a pending ask, and clean-up of pending asks on cancel, trip end, expiry and account deletion. Old item data and offer functions still work. The feed shows trips only; My activity gained "Items I'm bringing".

Verification: lint and typecheck passed; Vitest 65 tests passed, including six new PGlite ask tests and three action tests; production build passed; the design detector reported only advisories against the outdated DESIGN.md; Chromium E2E passed 12 cases. The migration was dry-run and applied to the test project (27 migrations, histories match). `live-smoke.mjs` (now asks a second fictional traveller) passed; `live-interaction-smoke.mjs` (ask, notification, accept, and a concurrent accept/decline race) passed three runs; `live-offer-load.mjs` passed. A streaming loading state made one script check race; it now waits for content.

A fresh design review asked for eight fixes (nav width on narrow pages, one edit card on the organizer trip page, destination and departure in My activity, no repeated campus label, hills fading into the page with the placeholder skyline removed, serif/sans headings on more pages, a tidier ask form, no nested panels). The organizer edit now uses one `editTrip` action for time, seats, note and the bring-items toggle. After the fixes: lint, typecheck, format check, 65 Vitest tests, build, 12 Chromium E2E cases, `live-smoke.mjs` and two `live-interaction-smoke.mjs` runs passed.

## Fest-poster redesign (2026-10-28)

The owner confirmed that IIT Indore Google sign-in works with their college account. At their request the whole interface was redesigned (ADR-013): a riso screenprint look with indigo ink on halftone paper, pink and yellow spot colours, Big Shoulders poster headings, Archivo body text and JetBrains Mono for times, fares and seats. The home page now leads with a labelled sample "lineup" of trips (live clock, rows departing every five seconds, hover flip to pick-up details) and a ticket-shaped Google button; the out-of-date "member features are not open yet" copy was replaced. The signed-in feed is a lineup board, the community nav is an app bar with a phone tab bar and current-page state, and every other screen inherits the look through `globals.css`. `PRODUCT.md` and the surface brief in `.impeccable/surfaces/` record the product facts and direction.

Messaging fix found during QA: the offline/online status in a conversation waited on the Realtime heartbeat, so "Live updates are delayed" could take over 45 seconds to appear. It now reacts to the browser's offline and online events at once. This was the cause of the earlier intermittent `live-interaction-smoke.mjs` failure.

Verification: lint, typecheck passed; Vitest 57 tests in 12 files passed (the unused feature-card component and its test were removed); production build passed; the design detector reported no findings; Chromium E2E passed 12 cases (two home-page assertions and one keyboard selector updated to the new copy and wordmark). `live-smoke.mjs` passed, and `live-interaction-smoke.mjs` passed three runs in a row after the messaging fix (it had failed two of three before). Screenshots at 1440 and 390 px are in `.impeccable/review/`. `docs/QA_STRESS_PROMPT.md` is not Prettier-formatted; it was not created in this session and was left untouched.

A fresh design review (finish reviewer) returned eight material fixes: the trip page now reads as an event bill (destination headline, mono showtime, ticket-stub seats, fare in the data face), direction labels no longer sit above headings, green is reserved for confirmed or accepted states, feed rows show seat stubs and fares with one-line times (`formatIstShort`, unit-tested), home lineup rows are tappable and keyboard-operable buttons that no longer truncate on phones, the four guarantees became one admission ticket, the phone tab bar has five one-line tabs (Alerts moved to the top bar, Sign out into Settings on phones), and the paper ground was restored to #f3f1ec. Its verdict pass scored all eight resolved and returned ship for those fixes. Messages, a message thread, notifications, my activity, privacy and an item page were not captured and remain unreviewed. After the fixes: lint, typecheck, 57 Vitest tests, build, 12 Chromium E2E cases, `live-smoke.mjs` and `live-interaction-smoke.mjs` all passed.

## Google-only sign-in (2026-10-28)

The owner created an Internal Google OAuth client in the `iiti.ac.in` Google Cloud organization and enabled the Google provider in the test project. Their first college sign-in returned `status=google-domain`: Supabase stores the hosted-domain claim under `custom_claims.hd`, and the check only read `hd`. That was fixed with unit tests. At the owner's request, sign-in is now Google only: the password, create-account and email-callback paths were removed, the Google request adds `prompt=select_account`, and onboarding pre-fills the Google name (ADR-012). Live QA scripts now sign in through `scripts/live-session.mjs`.

Verification: lint, typecheck and format check passed; Vitest passed 58 tests in 13 files (the removed email-callback and signup-error tests account for the drop); the production build passed; Chromium E2E passed 12 cases, including no password field and the `select_account` prompt. `live-smoke.mjs` and `live-interaction-smoke.mjs` both passed against the test project. A successful real college Google sign-in after the fix, and rejection of a personal account, have not yet been confirmed by the owner.

## Owner decisions implemented (2026-10-27)

The owner chose 90-day retention, anonymizing account deletion, Resend for production email, and Google sign-in alongside password (ADR-011). They asked for a fully working web application first, with a mobile app later. Added `20261027000000_account_deletion_and_retention.sql`, a Delete account section in Settings, `POST /api/maintenance/retention`, a public `/privacy` notice linked from the home page and sign-up form, and the daily purge in `supabase/ops/schedule_hosted_jobs.sql` (renamed from the push-only file, not run). Two new PGlite cases cover deletion and the purge, and a route test covers the retention endpoint.

Verification: lint, typecheck and format check passed; Vitest passed 61 tests in 15 files; the production build passed; Chromium E2E passed 12 cases. The migration was dry-run and applied to the test project (26 migrations). `live-smoke.mjs` deleted its account through Settings and confirmed the anonymized profile, cancelled item, removed Storage image, cleared Auth email and rejected sign-in. The retention endpoint returned 200 with a valid token and 401 without one; nothing in the test project was old enough to purge. `live-interaction-smoke.mjs` failed once without its error being captured, then passed twice in a row; treat it as possibly flaky. Afterwards only the owner's account and trip remained. Remaining: Resend and Google provider setup, a backup approach, hosting and hosted schedules.

## Migrations applied and live QA (2026-10-27)

The Supabase CLI was logged in and the linked test project (`heyfvsldcxxhuxotfyjt`) was reachable. A dry run listed exactly the four pending migrations; `supabase db push` applied them, and `supabase migration list` shows local and remote histories match at 25. No production database exists or was touched.

Against a local production build, `scripts/live-smoke.mjs` passed (sign-in, onboarding, trip and item posting, private image). `scripts/live-interaction-smoke.mjs` first failed because it waited for a "View trip" link that became a button with match-open counting; after updating that selector it passed seat request/acceptance, notifications, Realtime chat and reconnect, item offer acceptance, both concurrency races, zone moderation, report dismissal, audit and suspension denial. Both scripts removed their data; zero fictional QA users remain. Lint, typecheck and build passed; all 57 Vitest tests passed, though three files timed out under full-suite load on this machine and passed when rerun alone. Match-open counting itself is not exercised by the live scripts. Remaining release gaps are unchanged except the migration gap, which is closed.

Follow-up the same day: the interaction script now clicks a compatible trip and checks the aggregate `match_opened` count rises by exactly one; it passed live and cleaned up. Vitest timeouts were raised (20 s tests, 60 s hooks) so full runs no longer time out on this machine. Firefox, retried, and newly installed WebKit each passed 11 public-route E2E cases; the offline-fallback case is skipped outside Chromium because Playwright's offline mode does not reach service worker fetches there. Chromium passed all 12. Full and production npm audits reported zero vulnerabilities.

Load and Phase 12 preparation (same day): `scripts/live-offer-load.mjs` created fictional travellers who all offered on one item, then fired every acceptance at once. With 8 offers one won in 780 ms; with 20 offers one won in 1,293 ms; the rest were declined and all data was removed. For Phase 12, `supabase/ops/schedule_hosted_jobs.sql` holds the hosted push schedule (Vault token, Cron and `pg_net`) and `docs/DEPLOYMENT.md` has an ordered release runbook. Nothing was deployed, no Vercel or production Supabase project was created, and the schedule was not run; each runbook step awaits explicit approval.

## Live QA rerun (2026-10-21)

The local app and 12 production-build Chromium public-route tests passed; two new browser cases cover protected workflow redirects and wrong-domain signup rejection. Lint, typecheck, format check, 57 unit/database tests and production build passed. Both live smoke scripts stopped before creating their first fictional user because the linked Supabase host could not be reached. No signed-in journey or database/RLS result was verified in this run, no temporary IDs were obtained, and remote cleanup state could not be queried. The Supabase CLI dry-run still lacks an access token, so four local migrations remain unapplied. The historical live results below are prior evidence, not a current release gate.

## Follow-up fixes (2026-10-21)

Reproduced and locally fixed acceptance of a suspended seat applicant and suspended item traveller. Added aggregate match-open counting, an IST feed-day boundary fix, a product-image input label and an explicit private no-store header for community responses. Local database tests pass 28 cases with all four pending QA migrations; the notification preference test covers off and on delivery. The Supabase test project remains unreachable here and has not received these migrations; no hosted or real-device claim is made. Chromium passed 10 production-build E2E cases. Firefox stalled before its first case and remains unverified.

Added a community loading fallback and pending states on account, trip and item forms to make slow actions visible and prevent repeat submission. Final verification follows these UI changes.

Final local follow-up gates passed: lint, typecheck, format check, 57 Vitest tests in 14 files, production build and 10 Chromium E2E cases. The compatible-trip action also has tests for database-derived navigation and a read-only fallback before the aggregate metric RPC is installed. The linked Supabase project still needs all four migrations and signed-in smoke checks. Google OAuth remains disabled in its provider settings; the app's button, callback and Workspace claim checks have only local test evidence.

## QA review (2026-10-21)

Found and reproduced an RLS gap for a member whose confirmed Auth email changes away from their profile's campus domain, plus an item-offer transition that accepted a cancelled supporting trip. Added two forward migrations and PGlite regressions. The linked Supabase test project still has 21 migrations; both are pending because the CLI lacks an access token in this sandbox and the linked host is unreachable. Both live smoke scripts stopped before creating a test user. Do not treat the local fixes as deployed or the release gate as complete.

Local QA gates passed after the edits: 48 Vitest tests, lint, typecheck and format check. The production build and 10 Chromium E2E cases passed before the second SQL/test change, which did not touch app runtime code. An anonymous `/community` response sent `Cache-Control: no-store`; an authenticated response could not be inspected because the linked Supabase host was unreachable.

## Current status (2026-10-20)

Google sign-in code is now added alongside password sign-in. Its dedicated callback requires a confirmed `@iiti.ac.in` address and Google's verified `hd=iiti.ac.in` Workspace claim before allowing a session into the community. The linked test project's Google provider currently reports disabled, so this flow is not yet verified with a real Google account. Google Cloud and Supabase setup steps are in `README.md`.

IITIConnect is implemented locally through the main trip, item, messaging, notification, moderation and PWA workflows. The linked Supabase **test** project has all 21 ordered migrations. No Vercel deployment or production database exists. The owner authorized work through the remaining phases, while the original prompt reserves deployment and production database changes for explicit approval.

The owner confirmed an institute email, signed in and completed onboarding. A real trip post exposed a `PGRST201` ambiguous relationship between trips and journey legs. The app now names the correct foreign key in every nested query. A fictional account subsequently opened the exact trip URL that had returned 404.

Temporary fictional accounts passed browser checks for sign-in, onboarding, posting and opening trips and items, uploading a private image and rendering its signed URL, requesting and accepting a seat, private messaging, and offering and accepting item fulfilment. Both smoke scripts removed their test users and dependent data. Live read-only RLS checks showed the trip owner can see the trip and leg while an identity without a campus profile cannot.

The database has an active five-minute expiration Cron job. Private Storage limits images to 2 MB and JPEG, PNG or WebP. Push subscription, queue and sender code exists; an authorized local sender request reached the live empty queue with HTTP 200 and a missing-token request returned HTTP 401. VAPID credentials and the server-only Supabase test key are in ignored `.env.local`. No hosted push schedule or real-device delivery has been verified.

Realtime chat now sets the session token before subscribing. A two-member browser run received a new message before the polling fallback. The live browser suite also verified join/acceptance notifications, marking an alert read, a concurrent final-seat race with exactly one accepted participant, moderator-only access, report dismissal, audit history, aggregate counts and suspension denying community access. Temporary data and all four fictional accounts were removed. The new daily metric rows contain no member or post identifiers.

A second live run took the conversation offline, observed the delayed-update state, restored the connection and received another message. It also submitted two item-offer acceptances at once; one offer was accepted and the other declined. The service worker now caches only a static offline explanation and uses it when navigation fails. An installed-app browser check confirmed the fallback and found no private cache entries.

Moderators can now disable and restore campus zones with an audit reason. Database checks prevent disabling a zone used by active trips or item requests, and require active zones for new posts. A fictional zone was toggled both ways in the live browser suite, its two audit entries were checked, and it was removed during cleanup.

Item-match retrieval now filters by purchase zone and orders by departure before applying its 50-candidate limit. Public browser checks cover keyboard focus and local service worker registration. The E2E runner owns its server process and exits cleanly on Windows.

A disposable local PGlite benchmark ran the item-match lookup against 5,000 synthetic legs, with 12.5% in the target zone. The 50-row query took 21.9 ms in one run. This is a development-machine baseline; hosted performance with real distribution and traffic remains open.

## Verification performed

- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run format:check` and `npm.cmd run build` passed.
- Vitest passed 46 tests in 12 files, including Google Workspace authorization, portable PostgreSQL/RLS and push sender cases.
- Ten public-route Chromium smoke tests passed, including Google OAuth redirect wiring and offline navigation.
- `scripts/live-smoke.mjs` and `scripts/live-interaction-smoke.mjs` passed against the linked test project and cleaned up.
- Local and remote migration histories match at 21 migrations.
- Production dependency audit reported zero vulnerabilities. The full audit previously reported five high advisories in development-only lint dependencies.
- The local app returned HTTP 200 at `http://localhost:3000/`.

## Remaining work and limits

The release gaps are a fresh real email callback, real-device push/install checks, representative matching-query performance, deeper accessibility, slow-network and cross-browser QA, privacy/retention and backup decisions, a production email provider, hosted error alerts, match-open metrics, Vercel setup and hosted push scheduling. Firefox was downloaded for a browser check but did not start in this Windows environment; Chromium remains the configured suite. Severity and release effects are listed in `docs/TESTING.md`.

## Next phase

Phase 12 preparation is ready for review in `docs/DEPLOYMENT.md`. The remaining Phase 11 items need owner action: email provider, Google provider, real devices and privacy/retention decisions. Keep the test project and local secrets separate from any production configuration. Do not deploy or modify production data without explicit approval.

## Key implementation changes

The app lives in `src/app`, `src/components` and `src/lib`; ordered SQL is in `supabase/migrations`. The latest migration adds audited zone management. The push route is `src/app/api/push/dispatch/route.ts`. Reusable fictional-account browser checks are in `scripts/live-smoke.mjs` and `scripts/live-interaction-smoke.mjs`. See `docs/TESTING.md`, `docs/DATABASE.md` and `docs/DEPLOYMENT.md` for procedures and limits.
