# Deployment plan (no deployment performed)

## Local development

Use Node.js 20.9 or newer, `npm ci`, then `npm run dev` (`npm.cmd` on PowerShell if script execution blocks `npm.ps1`). Verify `lint`, `typecheck`, `format:check`, `test`, `build` and `test:e2e` before release. Playwright needs Chromium under the ignored `.playwright-browsers` directory as described in the README.

## Environment configuration

`.env.example` lists `APP_ORIGIN`, `ALLOWED_EMAIL_DOMAINS`, the Supabase URL and publishable key, and optional push settings. The owner supplied `iiti.ac.in` as the permitted test domain. The public Supabase pair is validated together at startup. `node scripts/generate-vapid.mjs` creates a VAPID key pair and a dispatch token in ignored `.env.local` without printing them. `VAPID_PRIVATE_KEY`, `PUSH_DISPATCH_SECRET` and `SUPABASE_SECRET_KEY` are server-only. Never put them in `NEXT_PUBLIC_` variables, logs or source control.

## Supabase test project

Google sign-in is implemented in the app, but Google OAuth is disabled in the linked test project's Auth settings. The README lists the Google Cloud web client, Supabase provider and exact callback allow-list setup. Never place the Google client secret in app source or public environment variables. A real IIT Indore Workspace sign-in and personal-account rejection must pass before release.

The linked test project has 27 migrations, including a five-minute expiration Cron job, private image Storage, push subscriptions, a delivery queue and aggregate product metrics. The owner confirmed an institute email and signed in. A fictional-account browser suite passed trip, item, image, join, chat and offer flows. A fresh real email link must still verify the callback fix. Realtime reconnect, concurrent seat/item acceptance and moderator review passed fictional-account browser runs; real-device push still needs a live check.

For new migrations, run `npx.cmd supabase db push --dry-run`, review the list, then apply only to the intended project. Never use `supabase db reset --linked` on shared data. Review Supabase Auth callback URLs, email delivery, project limits, storage rules, RLS advisors and the expiration job after each environment change.

## Operations and monitoring

The moderator page shows campus-level daily counts and recent moderation decisions. Server failures in critical auth, detail and push paths log a fixed operation name and database/error code without private form or message content. After a hosted deployment, review runtime error logs and Supabase Cron/push queue failures daily, set an alert for sustained 5xx responses, and record an incident contact. No hosted alert rule has been configured. Test-project metrics include fictional QA activity; use a separate production project.

## Hosted push

`POST /api/push/dispatch` requires `Authorization: Bearer <PUSH_DISPATCH_SECRET>`. It was checked locally against the live empty test queue: missing token returned 401 and a valid token returned 200. No hosted schedule exists. After deploying a secure HTTPS endpoint, run `supabase/ops/schedule_hosted_jobs.sql` in that environment's Supabase SQL editor with its placeholders replaced. It stores the token in Supabase Vault and uses Supabase Cron with `pg_net` to POST once a minute (about 43,000 Vercel function calls a month). It also schedules the daily 90-day retention purge at `POST /api/maintenance/retention`, which uses the same token. It has not been run anywhere. Verify actual sends, retry and invalid-endpoint behavior on supported desktop/Android browsers and an installed iOS Home Screen app before enabling a push claim. Notification permission is requested only after a user action.

## Vercel release checklist

The local production build passes. Before deployment, verify the chosen free Vercel subdomain, non-commercial Hobby eligibility, server/client environment scoping, HTTPS redirects, Auth Site URL and callback allowlist, security headers, service-worker scope, rate limits and provider usage. Run production smoke checks for account confirmation, trip/item/chat, RLS isolation, moderation, image uploads, push fallback and narrow mobile layouts. Deploy only with explicit approval. See [Vercel Hobby terms](https://vercel.com/docs/plans/hobby).

For a future production setup, create a separate Supabase project and Vercel project only after approval. Configure Vercel as a Next.js app with `npm run build`, then set `APP_ORIGIN=https://<confirmed-subdomain>.vercel.app`, `ALLOWED_EMAIL_DOMAINS=iiti.ac.in`, and that production project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Set `SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `PUSH_DISPATCH_SECRET` as server-only secrets; `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is the matching public key. In Supabase Auth, set the Site URL and allow the exact `https://<confirmed-subdomain>.vercel.app/auth/callback` redirect. Keep test and production keys, VAPID pairs and dispatch tokens separate. Review `npx.cmd supabase db push --dry-run` against the intended production ref before any approved migration. A production deployment, database migration, SMTP configuration and hosted push schedule have not been performed.

If Google sign-in is approved for production, register the production origin in Google Auth Platform, use the production Supabase project's `/auth/v1/callback` as Google's redirect URI, and allow `https://<confirmed-subdomain>.vercel.app/auth/google/callback` in Supabase Auth. Keep the Google client secret in provider settings. Verify both a managed IIT Indore account and an outside account before opening registration.

## Release runbook (awaiting approval)

Each step needs the owner's explicit approval; none has been performed.

1. Owner decisions: done on 2026-10-27 (ADR-011) except the backup approach.
2. Create a separate free production Supabase project. Run `npx.cmd supabase link --project-ref <prod-ref>`, `npx.cmd supabase db push --dry-run`, review the 27 migrations, then push. Relink to the test project afterwards.
3. In production Supabase Auth: enable Google with a production OAuth client, disable the Email provider (no member uses it, and that closes direct API sign-ups), set the Site URL and allow only `https://<confirmed-subdomain>.vercel.app/auth/google/callback`. No SMTP provider is needed.
4. Generate a separate VAPID pair and dispatch token for production (`node scripts/generate-vapid.mjs` writes to `.env.local`, so move the values out and restore the test file).
5. Import the repository into a Vercel Hobby project (framework Next.js, default build). Set the environment variables listed above, server-only secrets as encrypted variables without the `NEXT_PUBLIC_` prefix.
6. Deploy, then run `supabase/ops/schedule_hosted_jobs.sql` against production.
7. Production smoke: IIT Indore Google sign-in and personal-account rejection, trip/item/chat, cross-user denial, moderation, image upload, push on Android and installed iOS, narrow mobile layout. Do not run the fictional-account scripts against production; they refuse non-test hosts.

## Rollback and recovery

Keep a prior deployment available for rollback. Make database migrations forward-safe and test recovery before production schema changes. Define a verified backup/export and restore procedure; do not assume a free Supabase project supplies downloadable backups. Document incident contacts, retention and data-loss expectations. See the [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
