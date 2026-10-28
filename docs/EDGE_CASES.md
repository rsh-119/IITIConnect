# Edge-case register

This register originated in Phase 0. Local PGlite and unit tests cover wrong-domain/confirmed profile creation, trip ownership, sequential seat capacity, one active item fulfilment, message nonce/access, IST conversion, notification recipient isolation and moderator role checks. A live four-account browser run also passed simultaneous final-seat acceptance, immediate Realtime chat, notification read, moderator dismissal/audit and suspension denial. The status column below is the original planning baseline; use [testing](TESTING.md) for current results and remaining device checks.

Additional local regression coverage now confirms overdue open items expire while purchased items remain active, offered fulfilments are cancelled on expiry, and moderation removal cancels accepted fulfilments. A moderator cannot cancel a purchased item through content removal; its dispute and handover record remains available.

Trip expiry tests confirm a departed outward leg expires independently while a future return leg stays open. Once both legs have departed, the trip expires and the organizer may mark it completed. The live Cron schedule is active in the test project. Live browser runs passed a final-seat race and a two-offer acceptance race. Chat reconnected after going offline and delivered a new message. Larger concurrent loads remain untested.

| ID      | Trigger                                           | Expected behavior                                    | Status / planned test                  |
| ------- | ------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| AUTH-01 | expired session or stale verification link        | require fresh authentication; safe recovery          | planned / auth integration             |
| AUTH-02 | unverified, wrong-domain or suspended user        | deny protected read/write, even by direct DB call    | planned / RLS + E2E                    |
| AUTH-03 | client supplies another user/campus ID            | ignore client identity; use trusted session          | planned / server integration           |
| TRIP-01 | duplicate join or own trip                        | reject or idempotently return existing request       | planned / DB integration               |
| TRIP-02 | two applicants for last seat                      | one confirmation only                                | passed / live two-request race         |
| TRIP-03 | return leg has different passengers               | separate count, fare and chat context                | planned / integration                  |
| TRIP-04 | organizer cancels or changes departure            | block new joins and notify affected users            | planned / integration                  |
| TRIP-05 | departure passed or no-show                       | expire opportunity; keep history/dispute route       | planned / state tests                  |
| ITEM-01 | two accepted offers race                          | at most one active fulfilment                        | passed / live two-offer race           |
| ITEM-02 | budget changes after agreement                    | require explicit re-agreement or reject              | planned / state tests                  |
| ITEM-03 | item unavailable, damaged or buyer absent         | record dispute/unfulfilled state; notify parties     | planned / integration                  |
| ITEM-04 | cancellation after purchase                       | no silent deletion; dispute path                     | planned / state tests                  |
| CHAT-01 | duplicate send or reconnect gap                   | deduplicate nonce; refetch ordered history           | reconnect passed / live browser        |
| CHAT-02 | blocked or unrelated user accesses chat           | deny read/send and Realtime channel                  | planned / RLS + integration            |
| PUSH-01 | denied/unsupported permission                     | keep in-app notifications; no repeated prompt        | planned / browser QA                   |
| PUSH-02 | invalid endpoint/multiple devices                 | retire bad endpoint; other devices remain            | planned / integration                  |
| GEN-01  | timezone boundary or daylight changes             | UTC source; Asia/Kolkata display; valid future check | planned / unit                         |
| GEN-02  | slow network, duplicate submit or back navigation | clear pending/error states; idempotent mutation      | planned / E2E                          |
| GEN-03  | database outage                                   | safe retry message; no false success                 | planned / integration                  |
| ENV-01  | malformed or incomplete environment values        | reject configuration before related service use      | parser implemented / 2 unit assertions |
