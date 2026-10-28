# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

IIT Indore students (confirmed: students only). They travel between the Simrol campus and Indore city (airport, railway station, Vijay Nagar, Palasia, Rajwada) and want to share a ride with someone going the same way, or get something bought in the city by a student who is already making the trip. They use it on phones as often as laptops, often while planning a trip a day or a few hours ahead.

## Product Purpose

A campus-only coordination app: post a trip (destination, time, seats, open to bring items), request a seat, ask a traveller on their trip to bring an item within a budget, and chat privately with the other person in each arrangement. Success is a student finding a ride or a carrier quickly and completing the arrangement without needing a hostel group chat.

## Positioning

Verified campus only (confirmed as the primary reason to choose it over WhatsApp groups). Every member signs in with an IIT Indore Google account (@iiti.ac.in); there are no strangers, no public posting, and each trip or item arrangement has its own private conversation. Automatic matching of trips within three hours supports this but is secondary.

## Operating Context

- Sign-in is IIT Indore Google only; first sign-in leads to a one-step profile (display name).
- Locations are campus-defined zones, never exact addresses.
- Times are stored in UTC and shown in Asia/Kolkata (IST).
- Signed-in areas: trip feed, post a trip, trip detail (join or ask to bring), item detail, messages, notifications, activity, settings (including account deletion), report, and moderator tools.
- Installable PWA with an offline explanation page; optional web push.
- Public pages: home, sign-in, privacy notice.

## Capabilities and Constraints

- Next.js App Router, strict TypeScript, Tailwind CSS v4, Supabase (auth, Postgres with RLS, Realtime, private Storage).
- Emails and exact personal locations are never shown to other members.
- Finished content is deleted after 90 days; account deletion anonymizes the member as "Deleted member".
- No new runtime dependencies without reason; the project keeps a small dependency set.
- Undecided: backup approach; production hosting is planned on Vercel but not deployed.

## Brand Commitments

- Visual direction pinned by the owner (2026-10-28): professional, modern, sleek and classy, like their soft pastel travel-site reference with gradient backgrounds. The earlier fest-poster look was rejected.

- The name IITIConnect stays exactly as written (confirmed).
- It is an independent student project. It must not claim or imply official IIT Indore endorsement (project rule in CLAUDE.md), so no institute logo or crest.

## Evidence on Hand

No testimonials, user counts, ratings, press or partner logos exist. Future work must not invent them. Real content available: campus zone names, the three workflows (share a journey, request an item, connect privately), the privacy notice.

## Product Principles

1. Trust first: make "verified IIT Indore members only" felt everywhere a stranger could otherwise appear.
2. Coordination, not a marketplace: the goal is two students agreeing on a trip or a handover, quickly.
3. Privacy by default: show zones, times and display names, never emails or exact locations.
4. Phone-first speed: the common actions (post a trip, find a seat, reply) must be fast on a small screen.
