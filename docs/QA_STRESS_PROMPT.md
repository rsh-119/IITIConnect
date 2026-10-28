# Full QA, break-it and load-test prompt

Paste everything below the line into a fresh agent session at the repository root.

---

You are the QA lead and adversarial tester for IITIConnect. Your job is to find what breaks before real students do. Assume 100–500 concurrent signed-in members on a normal day, with peaks around evening trip planning and before holidays. Report findings, not reassurance.

## 0. Ground rules (non-negotiable)

- Read `CLAUDE.md`, `AGENTS.md`, `docs/PROGRESS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API_CONTRACTS.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/EDGE_CASES.md` and `docs/COSTS.md` first. Note any place where docs and code disagree.
- Target **only** the dedicated Supabase test project and a local `next build && next start` server. Never touch production. No deployment, commits, pushes, branch changes or paid resources.
- Use only fictional accounts created the way `scripts/live-smoke.mjs` does. Delete every test user, post, message, image and push row afterwards, and prove the cleanup with a count query.
- Never put the service key in client code or in logs. Never print real emails.
- Measure latency against the production build, not `next dev`.
- Before a load step that might hit Supabase free-tier limits (DB connections, Realtime concurrent connections, Storage egress, Auth rate limits), state the expected limit from `docs/COSTS.md` or the Supabase docs, then ramp up gradually. Stop when the limit is reached. Do not try to get around it.
- Do not report a check as passing unless you ran it. For every result, give the command or script, what you observed and the raw numbers.

## 1. Baseline

Run `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`, `npm test` and `npm run test:e2e`, plus the two live smoke scripts. Record pass/fail counts and durations. Anything already failing is finding #1.

## 2. Functional walkthrough (every feature, happy path + edge cases)

For each feature, test it as the owner, as a second member of the same campus, as an unverified/suspended user, and as a user with no campus profile.

| Area                 | Routes / objects                                  | Must check                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                 | `/auth`, `/auth/google/callback`                  | Only verified IIT Indore Google Workspace accounts get in. Test a tampered `next` redirect (open redirect), a replayed or expired callback code, a suspended user, and sign-out that actually invalidates access.                                                                                                                               |
| Onboarding           | `/community/onboarding`                           | A user can't skip it by typing a URL directly. Display-name limits, unicode/emoji/RTL text, empty and whitespace-only input.                                                                                                                                                                                                                    |
| Trips                | `/community/trips/new`, `/community/trips/[id]`   | Trips with one leg and with two legs. Departure in the past, now, and a year away. A DST/IST boundary: stored in UTC, shown in Asia/Kolkata. Seats 0, 1 and the maximum, negative and huge fares, cancelling and completing, editing after people have joined, the expiration cron.                                                             |
| Join                 | trip detail                                       | Joining your own leg, joining twice, withdrawing after being accepted, the organizer rejecting and then accepting, the final seat being taken by N members at once (expect exactly one winner), and acceptance after a cancel.                                                                                                                  |
| Fare                 | trip detail                                       | The estimate is the total divided by (organizer + confirmed passengers), with rounding, and updates after withdrawal.                                                                                                                                                                                                                           |
| Items                | `/community/items/new`, `/community/items/[id]`   | Budget, quantity and deadline bounds, link validation (`javascript:`, `data:`, very long URLs), images (2 MB limit, a wrong MIME type disguised by its extension, SVG, zero bytes, a polyglot file). Signed URLs must not work for another campus or after deletion. Only one accepted fulfilment at a time, including two acceptances at once. |
| Matching             | community feed                                    | Results stay on the same campus. Direction, zone, time and capacity filters. The 50-candidate cap. The explanation text is correct, and nothing is confirmed automatically.                                                                                                                                                                     |
| Chat                 | `/community/messages`, `/community/messages/[id]` | Only workflow peers can open a chat, including by guessing the conversation id. Blocked users can't send. Check message order under fast sends, nonce replay or duplicate sends, unread counts, the realtime path vs. the polling fallback, offline/reconnect, and 5,000-character and markup/script payloads (XSS).                            |
| Notifications        | `/community/notifications`, `/community/settings` | Preferences are respected, dedupe keys work, mark-read works. If push is denied, alerts still arrive in-app. `/api/push/dispatch` should answer 401 with no token, a wrong token, or a token sent by GET instead of POST.                                                                                                                       |
| Moderation           | `/community/report`, `/community/moderation`      | A non-moderator gets nothing, even by calling the RPCs directly. A moderator from another campus is denied. Every action leaves an audit row. A suspended user is locked out immediately. Disabling a zone that is in use is blocked.                                                                                                           |
| Activity / metrics   | `/community/activity`                             | Metrics are aggregate only: no member or post ids, and visible to moderators only.                                                                                                                                                                                                                                                              |
| Retention / deletion | `/api/maintenance/retention`, settings            | Deleting an account removes or anonymises the user's data. The retention route rejects unauthenticated calls.                                                                                                                                                                                                                                   |
| PWA                  | manifest, service worker                          | Offline navigation shows the static fallback. No private data appears in Cache Storage after browsing as a member.                                                                                                                                                                                                                              |

## 3. Security / break-it pass

Go straight at Supabase with the anon key and a member JWT, using `supabase-js` or `curl` against `/rest/v1` and `/rpc`. Skip the UI.

- Use another campus's JWT to read every table: trips, legs, items, messages, notifications, reports, metrics, push subscriptions and profiles. Expect zero rows.
- Insert, update and delete rows that belong to someone else. Call every `security definer` function with ids you don't own.
- Mass assignment: send extra columns such as `user_id`, `campus_id`, `status`, `role` and `is_moderator` in inserts and updates.
- Look for leaked email addresses or exact locations in any API response, in HTML, in `__NEXT_DATA__`/RSC payloads, and in error messages.
- IDOR: enumerate or guess UUIDs on every `[id]` route.
- Write-limit bypass: run parallel requests and requests from several sessions for the same user.
- Malformed input: wrong types, nulls, 1 MB strings, unicode NULL bytes, SQL-looking text, and nested JSON in each Zod-validated input.
- Check headers: CSP, frame-ancestors, cookie flags and CORS on the API routes.
- Run `npm audit --omit=dev`.

Rate each finding Critical, High, Medium or Low, with steps to reproduce.

## 4. Load and latency (100–500 concurrent users)

Write the load harness as a plain Node script in `scripts/` that uses `fetch` and `supabase-js`, so no new dependency is needed. If you really need k6 or autocannon, ask before installing. Create a pool of fictional members (start with 50 and reuse sessions to simulate more) spread over realistic zones and departure times. Seed about 2,000 trips, 1,000 items and 20,000 messages so the queries don't run against empty tables.

Model a realistic mix per virtual user, with 2–8 s think time:

- 50% browse the feed and open trip or item details
- 15% chat: open a conversation, send, and receive over Realtime
- 10% check notifications
- 10% create or edit a trip or item
- 10% join, withdraw or accept
- 5% upload an image

Run ramps of 25 → 100 → 250 → 500 concurrent users, holding each step for 5 minutes. Then run spikes:

- 300 users hit the feed within 10 s
- 200 users race for 10 final seats
- 100 users open chat at once to test Realtime connection limits

For each step, record:

- p50, p95 and p99 latency and error rate for each page and each RPC. Separate server render time (TTFB) from Supabase query time.
- Throughput, and the Supabase DB connection count, CPU and slow queries (`pg_stat_statements` or the dashboard) for the test project.
- Realtime: connect success rate, message delivery delay (p95 from send to receive), and what happens when the connection cap is reached. Does the polling fallback take over cleanly?
- Write-limit and Auth rate-limit responses: are they surfaced to the user correctly, or are they shown as generic errors?
- Correctness under load: no double-booked seats, no duplicate messages, no lost notifications, and unread counts that are still right afterwards.

Targets (flag anything worse):

- Feed or detail page TTFB p95 < 800 ms
- RPC p95 < 300 ms
- Chat delivery p95 < 1.5 s
- Error rate < 1% at 500 users

Run `EXPLAIN ANALYZE` on the five slowest queries and name any missing indexes. Keep slow-network checks separate: run Playwright with network throttled to 3G and with CPU throttled 4× on a mobile viewport.

## 5. Resilience

Test each of these and describe what the user sees in each case:

- Kill the Next server in the middle of a request.
- Block Supabase by pointing it at a bad URL.
- Expire a JWT mid-session.
- Use two tabs: sign out in one and act in the other.
- Change the clock skew.
- Let the expiration cron run during an accept.
- Stop the push queue while rows are pending.

## 6. Accessibility and cross-browser

Run axe (Playwright + `@axe-core/playwright` if approved, otherwise a manual pass) on every page. Check keyboard-only flows for posting, joining and chatting, screen-reader labels, colour contrast, and 200% zoom. Try Firefox and WebKit configs. If a browser won't launch, write down the reason.

## 7. Report

Write `docs/QA_REPORT.md` with:

1. A summary: is this ready for 500 concurrent users? Yes, no, or conditional, in one paragraph.
2. A findings table: ID, severity, area, steps to reproduce, observed vs. expected, suggested fix, effort.
3. Latency tables per load step, using raw numbers.
4. The capacity ceiling: the first thing that breaks, at how many users, and why (DB connections, Realtime cap, cold starts, a slow query, a rate limit).
5. Free-tier limits hit and what they would cost to raise, from `docs/COSTS.md`.
6. Checks that were not run, and why.
7. Cleanup proof.

Then update `docs/TESTING.md` and `docs/PROGRESS.md` with the actual results. Do not commit.
