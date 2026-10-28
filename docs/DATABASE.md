# Database design

## Ask to carry (2026-10-28)

`20261028000000_ask_to_carry.sql` adds the `asked` status to `item_fulfilments`. `ask_to_carry(leg, description, quantity, budget)` lets an active same-campus member (not the organizer, not blocked) ask the organizer of an open trip that accepts items; it creates an open item request (zone = leg destination, deadline = departure) and an `asked` fulfilment, rate-limited through the requester's daily item limit. `answer_carry_request(fulfilment, accept)` is traveller-only: accept sets the fulfilment to `accepted` with the request's description and budget and the request to `agreed`; decline sets `declined` and `cancelled`. Notifications run in the reverse direction from offers. Chats are allowed while an ask is pending. Requester cancel, trip cancel or completion, expiry and account deletion all end pending asks. `offer_item` and `update_item_request` refuse a request with a pending ask. All 27 migrations are applied to the test project.

## Account deletion and retention (2026-10-27)

`20261027000000_account_deletion_and_retention.sql` adds `delete_own_account()` and the service-role-only `purge_expired_content(p_cutoff)`. Deletion cancels the member's open trips, seat requests, item requests and pending offers through the existing workflow RPCs, removes their notifications, push subscriptions and blocks, unlinks their images and sets the profile to `Deleted member` with status `deleted`. The server action then removes the images from Storage and soft-deletes the Auth identity, which clears the email and sign-in. In-progress item handovers (purchased, ready, disputed) are left for the other party. The purge deletes completed, cancelled or expired items and trips 90 days after their last update, with their offers, join requests, chats and images; it keeps disputed items and any trip still supporting a retained offer. Notifications older than 90 days, invalid push subscriptions and closed moderation records older than one year are also removed. Anonymous profiles stay because shared history references them. `POST /api/maintenance/retention` runs the purge and removes returned images.

The four 2026-10-21 security and metrics migrations are applied. The schema begins in `supabase/migrations/20261018150000_foundation.sql`. All 26 ordered migrations are applied to the dedicated Supabase test project. Portable migrations also run in PGlite with a minimal Auth stub. Supabase Realtime, Cron and Storage migrations require the live test project. Application identifiers are UUIDs; messages, notifications, push deliveries and audit records use ordered bigint IDs. Times are stored as `timestamptz` and displayed in IST.

## Tables and constraints

| Area    | Tables                                                       | Important relationships and controls                                                                                                   |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Campus  | `campuses`, `campus_domains`, `location_zones`               | Unique campus codes and domains; zones belong to a campus.                                                                             |
| Members | `profiles`                                                   | `user_id` references Supabase Auth; trusted campus, role and status. Auth retains private email.                                       |
| Trips   | `trips`, `journey_legs`, `join_requests`, `leg_participants` | Legs belong to trips and have distinct outward/return seats and fares; unique trip/direction, leg/requester and leg/participant pairs. |
| Items   | `item_requests`, `item_fulfilments`                          | Campus and zone keys; one active accepted fulfilment per request through a partial unique index.                                       |
| Chat    | `conversations`, `messages`, `conversation_reads`            | One conversation per workflow context; unique sender/client nonce; ordered message index and member read markers.                      |
| Alerts  | `notifications`, `push_subscriptions`, `push_deliveries`     | Recipient/dedupe uniqueness; unique push endpoint; one delivery per notification/subscription.                                         |
| Safety  | `blocks`, `reports`, `moderation_actions`                    | Unique block pair, report workflow, append-only moderator audit.                                                                       |
| Usage   | `daily_product_metrics`                                      | Aggregate campus/day/event counts with no user or post identifier.                                                                     |
| Admin   | `campus_management_actions`                                  | Moderator-only zone changes with actor, reason and timestamp.                                                                          |

Status fields have explicit check constraints. Feed, match, message, notification, subscription and review paths have targeted indexes. The complete columns, foreign keys and checks are in the migrations, which are the source of truth.

## Transactional guarantees

The join-acceptance RPC locks the leg, checks status and capacity, and updates participation atomically. Item-offer acceptance locks the request and enforces one active fulfilment. Trip and item edits use versions to reject stale writes. Messaging checks workflow membership, blocking and a client nonce in one transaction. Database write limits cover trips, items, joins/offers, messages and reports. Scheduled functions expire overdue open items and departed trip legs; a future return leg keeps its trip open. The Supabase Cron job runs every five minutes and has successful test-project history.

## Access rules

RLS is enabled on all 21 public application tables. Anonymous users cannot read member data. Active members see same-campus public trip/item information, while requests, fulfilments, chat, notifications, subscriptions and reports have narrower rules. Daily metrics are visible only to same-campus moderators. Direct authenticated writes are denied where transactional RPCs are required. Push deliveries are service-role-only. Security-definer functions fix `search_path`, check server-derived identity and limit `EXECUTE` grants. Live read-only checks confirmed an owner can see the test trip and leg while an identity without an active campus profile cannot.

The private `item-images` Storage bucket accepts one linked image per open item, up to 2 MB, in JPEG, PNG or WebP. Upload paths and attach RPCs verify the active owner. Active same-campus members can retrieve linked images by signed URL; owners can remove unlinked uploads. A fictional-account browser upload and signed-image render passed.

Push subscription RPCs bind endpoints to their authenticated owner. A notification trigger queues deliveries only for active opted-in recipients. Service-role-only claim and finish RPCs handle retries and invalid subscriptions. Hosted scheduling and device delivery remain unverified.

Product metrics increment transactionally for trip/item creation and completion and join request/acceptance. They use the UTC event day and store no actor or target IDs. Fictional test activity contributes to counts in the test project; use a separate production project before launch.

`set_zone_active` is moderator-only, same-campus and audited. Disabling a zone is rejected while an open trip leg or active item request references it. New legs and item requests lock and require active zones in database triggers, so concurrent creation cannot slip past deactivation. Inactive zones remain visible to moderators for reactivation and are hidden from ordinary member selection.

## Migrations and retention

Add forward-safe ordered SQL in `supabase/migrations`; dry-run before applying to the linked test project. Do not reset a shared or production database. Retention and account deletion are described at the top of this document. The hosted daily purge schedule is in `supabase/ops/schedule_hosted_jobs.sql` and has not been run. A tested backup and restore procedure is still required before launch.
