# Product requirements (Phase 0 draft)

## Vision and users

Help verified members of one campus find compatible travel companions and coordinate small city purchases through structured posts and private conversations. Roles: visitor, verified member, trip organizer, join applicant, item requester, traveller, and moderator. One person can hold several member roles. Administrators manage campus membership and audit moderation actions.

## MVP boundaries

In: campus-scoped discovery, account verification, trip and independent journey-leg management, seats and fare estimates, item-request lifecycle, deterministic recommendations, workflow-scoped messaging, in-app notifications, optional Web Push, reporting/blocking, mobile PWA.

Out: taxi booking or dispatch, payments or escrow, driver marketplace, guaranteed purchase/delivery, live GPS, AI matching, paid mapping, multi-campus public federation, native apps, and offline writes.

## Functional requirements and acceptance

| ID     | Requirement                                                     | Acceptance criterion                                                                                                                                 |
| ------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH   | Verify allowed institutional email and active campus membership | Sign-in is IIT Indore Google only; it requires a verified IIT Indore email and Workspace claim; unverified/suspended users cannot access member data |
| TRIP   | Create/edit/cancel/complete trip with one or two legs           | Each leg has direction, UTC departure, origin/destination zones, seats, fare estimate and independent participation                                  |
| JOIN   | Request/withdraw and accept/reject join                         | Organizer alone decides; capacity is enforced atomically; a member cannot join their own leg or twice                                                |
| FARE   | Display estimate per leg                                        | Estimate uses agreed total fare divided by organizer plus confirmed passengers; no payment is collected                                              |
| ITEM   | Post and manage requested item                                  | Description, zone, budget, quantity, deadline and optional link/image; one active accepted fulfilment at a time                                      |
| MATCH  | Rank compatible trips and item requests                         | Same campus, direction, zones, time/deadline, capacity and preferences; return an explainable reason, never auto-confirm                             |
| CHAT   | Message only authorized workflow peers                          | Context-bound conversation, access-checked history, ordering, unread state, blocked-user enforcement                                                 |
| NOTICE | Notify relevant users                                           | In-app delivery with preferences; push only after user action and if supported; denied push leaves in-app path                                       |
| MOD    | Report, block, suspend and remove content                       | Only authorized moderators act; every moderation action is recorded                                                                                  |
| FEED   | Search/filter paginated campus content                          | Date, zone and text filters; loading, empty and error states; no other-campus content                                                                |

## Primary journeys

1. Member signs up with a permitted email and confirms it, or signs in with a verified IIT Indore Google Workspace account, then completes a minimal profile and enters the campus feed.
2. Organizer checks similar legs, posts a journey, reviews requests, confirms passengers, and sees per-leg fare estimates.
3. Requester posts an item and sees compatible trips; traveller offers; requester accepts one offer, agrees details, and confirms handover or opens a dispute.
4. Two workflow participants exchange messages, receive in-app updates, and may report or block abuse.
5. Moderator reviews reports, records a decision, and suspends an account or removes a post where warranted.

## Business rules

- Only verified, active users from the same campus may participate. Campus is taken from trusted membership state, never a posted client value.
- One trip can have outward and return legs. Return passengers, capacity, status and fare are independent.
- No overbooking; joining is an organizer-approved transaction. Expired/cancelled/completed legs reject joins.
- One item request has at most one active accepted fulfilment. A request cannot be silently reassigned after purchase.
- Item handover, disputes, no-shows and cancellations remain explicit states; the platform makes no financial guarantee.
- Dates are stored in UTC and shown in Asia/Kolkata initially. Expiration is enforced on reads/writes; scheduled cleanup is an optimization.

## Non-functional requirements

Mobile-first at common phone widths; labelled controls, focus states, keyboard access and touch targets; responsive loading/error states. Minimize personal data and recurring cost. Validate input on the server and enforce authorization in Postgres. Aim for queries with bounded pagination and indexed campus/status/time filters. Measure performance with representative data before setting numeric latency targets.

## Success metrics

Measure verified registrations, weekly active members, trip posts, accepted joins, completed item requests, match opens, message delivery failures, report volume, and monthly provider usage. Count events without message text, personal email, or exact locations. Target values require pilot data.

## Open product decisions before launch

The project owner supplied an `@iiti.ac.in` address in Phase 1, so `iiti.ac.in` is the configured candidate domain. Confirm institutional policy and actual Supabase email verification before activating signup. Also decide campus membership policy, acceptable item categories/size, operational moderation owner, cancellation/dispute policy, and privacy/retention notice.
