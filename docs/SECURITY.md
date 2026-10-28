# Security model and release gaps

## 2026-10-21 QA finding

An existing active profile continued to pass campus RLS after its confirmed Auth email changed to a different domain. A PGlite regression reproduced a campus trip read. Migration `20261021000000_recheck_campus_email.sql` changes the campus and moderator helpers to require the current confirmed Auth email to match an enabled domain for that profile's campus. A second regression showed an item requester could accept an offer after its supporting trip was cancelled. Migration `20261021010000_recheck_item_offer_trip.sql` checks the journey again at acceptance. Both migrations are local only: the CLI dry-run lacks an access token in this sandbox, and the linked Supabase host is unreachable. Direct Supabase access in that project retains the old behavior until both migrations are applied and verified. Treat these as release blockers.

Further PGlite reproductions showed a suspended applicant could still be awarded a seat and a suspended traveller's offer could still be accepted. `20261021020000_recheck_counterparty_membership.sql` locks each counterparty profile and verifies its current confirmed, enabled campus membership before acceptance. The aggregate match-open RPC validates a live same-campus leg and derives its trip ID on the server. None of the four QA migrations has been applied to the linked project; these defects remain live release blockers there.

## Threats and controls

| Threat                                       | Control                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Student impersonation or wrong-campus access | Confirmed institute email, trusted campus membership, server-side session and active-status checks.                        |
| Unauthorized row access                      | Explicit grants plus RLS on all public application tables; narrow transactional RPCs; moderator role checks.               |
| Seat or item-fulfilment races                | Row locks, state constraints, unique and partial unique indexes, versioned edits.                                          |
| Unsolicited chat and abuse                   | Workflow-scoped conversations, member checks on every send, blocking, reporting, write limits and moderator audit.         |
| Secret leakage                               | Ignored local environment file; publishable key only in browser; Supabase secret and VAPID private key only on the server. |
| Unsafe files or links                        | 2 MB private image bucket, format and signature checks, owner paths, signed retrieval; HTTP(S) product-link validation.    |
| Private content in push or cache             | Generic push payloads; service worker caches only a static offline explanation, never authenticated responses.             |
| Spam and replay                              | Per-member database write limits, unique message nonce, notification dedupe keys, bounded push retries.                    |

Never use a hidden button as proof of permission. Supabase secret keys bypass RLS and must remain server-side. Grants and RLS policies must both be reviewed. Moderator actions require actor, reason and time in the audit record. Email stays in Supabase Auth; the public feed does not expose it. See the [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

For Google sign-in, the account picker receives `hd=iiti.ac.in` only as a hint. The dedicated callback checks the Google identity's verified email and hosted-domain claim after Supabase exchanges the authorization code. Failed checks clear the session. The profile RPC independently requires a confirmed address in an enabled campus domain. Real OAuth behavior remains unverified until the Google provider is configured in the test project.

## Verification

PGlite tests exercise campus isolation, private messages and notifications, denied direct writes, reports, blocks, moderation and subscription/queue permissions. Live anonymous REST reads for member tables returned 401. A live read-only RLS check showed the trip owner can see a test trip and leg while an identity without a campus profile cannot. Fictional-account browser tests passed sign-in, onboarding, same-campus trip and item interactions, private chat and authenticated image upload/signed rendering. The original reported trip URL now renders.

The test project's security advisor reported no errors before the push migrations; its warnings identified intentionally callable `SECURITY DEFINER` member RPCs and leaked-password protection unavailable on the Free plan. Re-run the advisors before launch. The production dependency audit found zero vulnerabilities after the push dependency was added; the full audit previously found five high advisories in development-only lint dependencies.

Daily product metrics contain only campus, UTC day, event type and count. RLS allows only same-campus moderators to read them; direct authenticated writes are denied. Fictional QA activity contributes to test-project counts, so production must use a separate project. A live browser run verified moderator-only access, report/audit decisions and suspension denying community access. Simultaneous final-seat and item-offer acceptance tests left exactly one winner in each workflow. Offline navigation showed the static fallback, with no private cache entries.

Zone changes require an active same-campus moderator and an audit reason. An active trip or item request prevents deactivation. Database triggers lock zones while new legs/items are created, closing the deactivation race. Members cannot see inactive zones or the management audit. Isolated RLS tests and a fictional-zone browser run covered these rules.

## Known limits before public launch

Sign-in is IIT Indore Google only; password sign-in, sign-up and the email callback were removed. Production should disable the Supabase Email provider. Device push remains unverified. Push and retention scheduling are not active, and no real device delivery has been claimed. Retention, account deletion and the `/privacy` notice are implemented; account deletion passed a live fictional-account check. Backup recovery and any applicable legal review of the notice remain before public use. The app is an independent student project and must not claim institutional endorsement.
