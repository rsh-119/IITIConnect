# IITIConnect working instructions

Read `AGENTS.md`, the installed Next.js documentation it references, `docs/PROGRESS.md`, then the relevant product, architecture, database, API, security, and testing documents. Check that documentation agrees with the repository before work. The user authorized work through the remaining phases in one instruction; do not stop for phase-by-phase approval. Keep verification results and limitations explicit.

Architecture: Next.js App Router, strict TypeScript, Tailwind, Zod, ordered SQL migrations/RLS, Supabase SSR auth, trip/item/chat/notification/moderation workflows, private Storage images, a Web Push sender, and aggregate metrics. The dedicated Supabase test project has 27 migrations. Vercel hosting and hosted push scheduling are not configured.

Use strict TypeScript, small focused components, explicit state transitions, Zod for untrusted inputs, UTC in storage and Asia/Kolkata in display. Never trust client user IDs or use a service key in client code. Protect database rows through grants and RLS; test cross-user and cross-campus denial. Do not expose emails or exact personal locations.

Per phase: inspect existing files and baseline; implement authorized work; run configured lint, typecheck, build and relevant tests; review compatibility, security and regressions; update affected docs and `docs/PROGRESS.md`; report actual results. Do not describe unrun checks as passing.

Forbidden: commits, pushes, branch changes, destructive Git commands, production database changes, deployment, paid resources, invented endorsements, real secrets, and using mock services as proof of production readiness. Only `git add` of verified phase files is authorized if Git is initialized. Do not erase user work.

References: `docs/PRD.md` (requirements), `docs/ARCHITECTURE.md` (boundaries), `docs/DATABASE.md` (schema plan), `docs/API_CONTRACTS.md` (planned interfaces), `docs/SECURITY.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md`, `docs/EDGE_CASES.md`, `docs/COSTS.md`.
