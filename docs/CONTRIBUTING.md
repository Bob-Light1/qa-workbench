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
After starting `supabase functions serve`, run `npm run functions:wait` before
integration/browser acceptance. This bounded gate requires browser-compatible CORS,
preflight 204 and unauthenticated POST 401; it detects a running container whose
function handler is still unavailable. CI uses the same gate. It does not establish
authenticated invitation success; the API/browser journeys still verify that.
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
Coverage and review browser journeys revise their fixtures. Run the corresponding
API setup again before repeating a browser journey; reusing consumed fixtures does
not restore their initial revision/review state. Run browser suites sequentially
because Playwright clears the shared `test-results` directory at startup.
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
reserve_attachment, finish_attachment, change_member, review_case, export_bundle. Each has typed
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

For review acceptance, run `npm run test:reviews:api` on the same owned local stack,
then `QA_BROWSER_ACCOUNTS=.env.review.browser npx playwright test tests/browser/reviews.spec.ts`.
The API script adds isolated synthetic identities/projects without resetting existing
workspaces. User JWTs verify grants, RLS, role withdrawal, comments, immutable
history, concurrent reviews, stale case revisions and export. The real restore RPC
is exercised in an empty transaction which is rolled back, preserving all previous
local rows and Storage. This does not repeat Auth reprovisioning or evidence upload
from the phase-1 full restoration test. The dedicated browser journey checks stale
opinions, edits, persisted history, failed requests and tester read-only access.
Review fixtures and archives remain ignored/private. New ZIPs use format 2; the
codec/restore also accept format 1 with an absent review table.

For an authorized hosted release, the same additive coverage/review API scripts
accept `--hosted` only with the exact existing QA Supabase URL. Load the ignored
`.env.hosted.local` directly with Node 24; do not load it through the local npm
scripts. They provision isolated synthetic projects and use user JWTs for behavior.
Hosted review acceptance excludes the local transactional restore operation.

```sh
node --env-file=.env.hosted.local scripts/coverage-check.mjs --hosted
node --env-file=.env.hosted.local scripts/review-check.mjs --hosted
QA_BROWSER_URL=https://qa-workbench.pages.dev QA_BROWSER_ACCOUNTS=.env.coverage.hosted.browser npx playwright test tests/browser/coverage.spec.ts tests/browser/export.spec.ts tests/browser/workflow.spec.ts
QA_BROWSER_URL=https://qa-workbench.pages.dev QA_BROWSER_ACCOUNTS=.env.review.hosted.browser npx playwright test tests/browser/reviews.spec.ts
```

The explicit flag and exact target are required together; no other hosted project
is accepted. `.env.coverage.hosted.browser`, `.env.review.hosted.browser` and
`backups/review.hosted-acceptance.zip` stay private/ignored. Run hosted checks only
after a fresh verified backup and compatible migrations. Never run
`test:integration` or reset/restore operations against hosted data.
