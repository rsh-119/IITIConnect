# IITIConnect

IITIConnect is a mobile-first campus PWA for coordinating shared third-party taxi journeys and city item requests among verified IIT Indore members. It is an independent student project; no institutional endorsement is claimed.

**Status:** Local app code includes authentication, campus feed, trips, items, chat, notifications, moderation and optional browser push. The Supabase test project is linked, and all 21 migrations have been applied there. Institute-email confirmation, password sign-in and profile onboarding were verified by the owner. The first test trip exposed an ambiguous database join, now fixed and verified against its original URL. Temporary fictional accounts passed browser checks for trip and item posting, private image upload, seat joining, chat, and item offer acceptance; test records were removed. Push subscriptions, queueing and a protected sender are implemented, but delivery needs hosted scheduling and device verification. There is no deployment. See [progress](docs/PROGRESS.md).

The linked test project now also has aggregate product counts, moderator audit history and guarded campus zone controls. A four-account browser test confirmed immediate Realtime chat delivery, notifications, a final-seat race, zone changes, moderator decisions and suspension access denial. Deployment and real-device push remain pending.

## MVP scope

Verified-campus accounts; trip legs with independent seats and passengers; join requests; item requests and one active fulfilment; explainable matching; workflow-scoped private chat; in-app notifications; basic reporting, blocking and moderation. Web Push and PWA support follow the core flows. The app coordinates students and does not book taxis or process payments.

## Local setup

Requires Node.js 20.9 or newer and npm. Run `npm ci`, then `npm run dev`. On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`. Copy `.env.example` to `.env.local` when a Supabase project is available; never commit the latter. `ALLOWED_EMAIL_DOMAINS` uses `iiti.ac.in` from the domain supplied by the project owner. Without Supabase configuration, account entry shows an unavailable state.

### Connect a dedicated Supabase test project

1. Create a free **test** project in the [Supabase Dashboard](https://supabase.com/dashboard). In its Connect dialog, copy the Project URL and **publishable** key; never share a secret or service-role key. Put them in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and set `APP_ORIGIN=http://localhost:3000`.
2. Members sign in only with IIT Indore Google (next section); there is no password sign-in or sign-up form, so no email delivery is needed. The test project keeps its Email provider on only so the fictional-account QA scripts can create sessions.
3. The Supabase CLI and `supabase/config.toml` are initialized. The test project is already linked and all current migrations are applied. For future migrations, inspect `npx.cmd supabase db push --dry-run` before `npx.cmd supabase db push`; enter any credentials directly into the CLI prompt. Do not use `supabase db reset --linked`.
4. The expiration job was installed by `20261019000000_schedule_expiration.sql`. Check its run history in Supabase Cron after a test item or trip expires; `supabase/ops/schedule_expiration.sql` is a recovery snippet if the job is removed.
5. Run `npm.cmd run dev`, sign in with an IIT Indore Google account, then test the member, trip, item, chat and moderation flows. For optional push, run `node scripts/generate-vapid.mjs` to create local VAPID keys and a dispatch token without printing them. Add a **server-only** Supabase secret key as `SUPABASE_SECRET_KEY` in `.env.local`; never use it in a `NEXT_PUBLIC_` variable. The sender at `/api/push/dispatch` requires `Authorization: Bearer <PUSH_DISPATCH_SECRET>`. Schedule it from Supabase Cron only after a hosted HTTPS endpoint exists. See [deployment](docs/DEPLOYMENT.md) and [testing](docs/TESTING.md) for the remaining release checks.

### Enable IIT Indore Google sign-in in the test project

Google is the only sign-in method. The app rejects accounts unless Google verifies both an `@iiti.ac.in` address and the `iiti.ac.in` Workspace hosted-domain claim, which Supabase stores as `custom_claims.hd`. The linked test project's Google provider is enabled with an Internal client in the `iiti.ac.in` Google Cloud organization. For another project, repeat these steps:

1. In [Google Auth Platform](https://console.cloud.google.com/auth/overview), register a **Web application** OAuth client for this test app. Add `http://localhost:3000` as an authorized JavaScript origin. Use the exact Supabase Google provider callback shown in its dashboard as the authorized redirect URI: `https://heyfvsldcxxhuxotfyjt.supabase.co/auth/v1/callback`. Google may require IIT Indore Workspace administrator approval for a managed account.
2. In the linked Supabase project's **Authentication → Providers → Google** settings, enable Google and enter the client ID and client secret. Keep the secret in Google Cloud and Supabase settings; do not paste it into this repository or chat.
3. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/google/callback` to the redirect allow list. The Google Cloud redirect URI and this app callback are different URLs.
4. Restart the local app if needed and choose **Continue with IIT Indore Google** at `http://localhost:3000/auth`. Test once with an IIT Indore Workspace account and once with a personal Google account. The latter must return to the auth page without community access.

The Google `hd` request parameter only guides account selection. Access is decided after the PKCE exchange using Supabase's Google identity data and is checked again against the enabled campus domain during profile onboarding. See the [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) and [Google hosted-domain guidance](https://developers.google.com/identity/openid-connect/openid-connect).

| Command                | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start the local site                        |
| `npm run lint`         | ESLint                                      |
| `npm run typecheck`    | Strict TypeScript check                     |
| `npm run build`        | Production build                            |
| `npm run test`         | Vitest unit/component tests                 |
| `npm run format:check` | Prettier check                              |
| `npm run test:e2e`     | Playwright smoke test after `npm run build` |

Before the first browser run, install Chromium into the ignored `.playwright-browsers` directory using `PLAYWRIGHT_BROWSERS_PATH=<absolute path to .playwright-browsers> npx playwright install chromium` (set the environment variable with your shell's syntax). The E2E script uses that directory. Read [CLAUDE.md](CLAUDE.md), [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), and [testing](docs/TESTING.md) before starting another phase.

The owner created a Supabase test project; no production resources or deployment have been created here. The local environment file and CLI credentials must remain private. The owner authorized work on all remaining phases; no deployment or production database changes were authorized.
