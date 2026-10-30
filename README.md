# QA Workbench

A private, standalone workspace for manual QA: versioned test cases, campaigns,
assigned executions, evidence and follow-up. French product interface and starter
cases; English source and engineering documentation. No subscription or commercial
user cap is implemented.

## Delivery status

The application is available at **https://qa-workbench.pages.dev**, including
revision-aware roadmap coverage and case reviews released on 2026-10-30.
Hosted coverage/review permissions, HTTPS two-account workflows, invitations,
private evidence and complete archive exports have passed. Portable restoration
has been exercised against an empty local installation. Published frontend source:
`c305e01`; production deployment: `218a2d56`; hosted migrations: 1–7.
The authoritative work status is [the roadmap](docs/ROADMAP.md); the latest executed
checks and next action are in [the handoff](docs/current_task.md).

## Start locally

Use Node.js 24 (`nvm install && nvm use`) and Docker. These are separate from the ERP.
On the initial machine, `bash scripts/npm ...` also uses the ignored project-local
Node 24 runtime when present (for example `bash scripts/npm run dev`).

```sh
npm ci
npm run db:start
npx supabase migration up --local
node scripts/local-env.mjs
npx supabase functions serve --env-file .env.functions.local
# In another terminal:
npm run dev
```

The app uses http://localhost:5178. The owned Supabase API uses 55321, database 55322
and optional Studio 55323. On the initial machine the validation database is
disposable RAM storage: see [operations](docs/OPERATIONS.md) before using it.
Never point local reset or integration tests at another database.
The generated environment files contain local credentials and are ignored by Git.
Bootstrap the first account through the server-only CLI; see [operations](docs/OPERATIONS.md).

## Documentation

- [Agent protocol](AGENTS.md): every specialist starts here.
- [Design](docs/DESIGN.md): architecture, invariants, decisions and three phases.
- [Roadmap](docs/ROADMAP.md): work items and acceptance status.
- [Current handoff](docs/current_task.md): session continuity and blockers.
- [Contributing](docs/CONTRIBUTING.md): development, API and validation.
- [Operations](docs/OPERATIONS.md): deploy, provision, recover and restore.
- [User guide](docs/USER_GUIDE.md): testing and reporting.

For first use, activate the private individual link provided separately, choose
**ERP multi-campus**, and follow the French [user guide](docs/USER_GUIDE.md).
The technical-acceptance project is reserved for synthetic Workbench checks.

The application tracks the ERP but does not run it or deploy it. The first ten cases
use local synthetic ERP data. Product coverage is intentionally incremental.

## Ownership

Source is private. No open-source license has been selected or granted. Do not
publish the repository, evidence, invitation links or backups without owner authorization.
