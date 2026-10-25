# Contributing

Start with [agent instructions](../AGENTS.md) and [design](DESIGN.md).
Node 24 is local to this project (`nvm use`); do not upgrade the ERP as a side effect.
Use `npm ci`. The local stack is started with `npm run db:start`; generate ignored
local environment files with `node scripts/local-env.mjs`. Commands run at repo root.

## Source map

- src/: React UI, domain types, Supabase adapter and portable backup codec.
- supabase/migrations/: append-only schema, RPC, grants and RLS changes.
- supabase/functions/manage-access/: server-only invitation and recovery operations.
- scripts/: scoped CLI, local setup, backup/restore and integration verification.
- data/erp-cases.json: French pilot cases, no account secrets.
- tests/: unit and browser checks. Integration script uses the actual owned stack.
- src/coverage.ts and src/CaseCoverage.tsx: revision-aware roadmap coverage.
- data/erp-cases-phase2.json: optional ERP-011–ERP-013 catalog; starter cases unchanged.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
npm run test:integration
npm run test:browser
```

Integration checks require the local API, Storage and manage-access function, and
will reset the owned local stack to exercise empty-installation restoration.
They also require project ID `qa-workbench-validation` and reject every non-loopback
or unexpected-port target. Never pass hosted credentials. On the initial machine,
the test database is disposable RAM storage; see OPERATIONS.md.
Browser tests use the generated synthetic accounts file, which is ignored by Git.
For the approved HTTPS deployment, set `QA_BROWSER_URL` and
`QA_BROWSER_ACCOUNTS=.env.hosted.browser` to exercise the same journeys without
starting Vite. Keep this file private. The hosted acceptance project contains only
synthetic identities and results, separately from the owner's ERP campaigns.
CI repeats this sequence on disposable local Supabase containers.

For coverage acceptance, `npm run test:coverage:api` provisions a separate synthetic
project and four test accounts on the owned local validation stack, without resets.
Server credentials only provision isolated fixtures; imports, snapshots, results
and allow/deny assertions use user JWTs. Coverage is also computed from actual
API rows to check revision boundaries. It writes ignored `.env.coverage.browser`.
Run `QA_BROWSER_ACCOUNTS=.env.coverage.browser npm run test:browser` for coverage
and existing workflow/export journeys. The coverage journey skips if its dedicated
fixture IDs are absent. This local acceptance does not establish hosted delivery.
Repeated API runs retain separate synthetic projects for inspection.
CI runs this additive API acceptance and its dedicated browser journey after the
phase-1 integration and browser suite; a configured workflow is not an executed
remote CI run.

## API and agent interface

Auth supplies user JWTs; all ordinary data access uses the same RLS as the UI.
Do not use a service key for routine agent reads or case editing. Provision a
separate named user, assign the appropriate project role and store its credentials
in a secure environment. Scripts do not persist login sessions.

```sh
npm run qa -- projects
npm run qa -- cases PROJECT_UUID
npm run qa -- failures PROJECT_UUID
npm run qa -- import PROJECT_UUID data/erp-cases.json
npm run qa -- import PROJECT_UUID data/erp-cases-phase2.json
npm run qa -- backup PROJECT_UUID backups/project.zip
```

Set QA_EMAIL and QA_PASSWORD outside tracked files. QA_ACCESS_TOKEN/QA_REFRESH_TOKEN
may be used for a temporary session. CLI reads return JSON; failures exit nonzero.

RPCs: create_project, save_case, archive_case, start_campaign, assign_item,
set_campaign_status, begin_execution, save_execution, report_issue, update_issue,
reserve_attachment, finish_attachment, change_member, export_bundle. Each has typed
SQL arguments in the migrations and is exercised through scripts/integration.mjs.
Writes returning VERSION_CONFLICT must be refreshed and reviewed, never blindly retried.
The access Edge Function accepts POST with action=invite/recovery, project_id and
email (plus role for invitations), returning an individual link when needed.
No email is sent. Privileged bootstrap/restore RPCs are service-role only.

## Change protocol

Design behavior before migrations. Add focused regression checks, validate, audit
permissions/history/recovery, then update design if a permanent decision changed.
Update roadmap and current handoff with actual checks. For an ERP change, link
case IDs or record no manual-QA impact in the ERP task note. Never infer delivery
from a generated UI, historical green tests or a successful static deployment alone.
