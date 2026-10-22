# Current task and handoff

Last updated: 2026-10-22.
Status: PHASE 1 DELIVERED. Phases 2 and 3 have not started.

## Objective and released state

The approved standalone QA Workbench is online at https://qa-workbench.pages.dev.
Source repository: /home/adminsecu/Projects/qa-workbench, branch main, private local
Git repository. Application release: 891d37a35b0c51b9c9fed5874d7c0d812638068a;
Cloudflare production deployment f485304d. Final documentation/test evidence may
have later commits without changing the deployed application. Supabase Free project
xtgaepikylepriipuyps, region eu-west-3; migrations 1–4 and manage-access deployed.

The ERP multi-campus project has ten French starter cases. Separate synthetic
acceptance data verifies the Workbench itself; it does not establish ERP acceptance.
The owner's account is provisioned. Its initial one-use link is in the ignored,
private .env.admin-access.local file on this machine; never quote it in docs or logs.
Use the server-only `qa access-link` operation to replace an expired link. Provider
credentials/configuration remain in private ignored files. No paid upgrade, public
source publication, remote Git hosting or phase-2 work was performed.

## Acceptance evidence actually executed

- Eight unit checks PASS; TypeScript and production build PASS; npm audit reports
  zero vulnerabilities. Vite's single JavaScript chunk is about 502 kB minified
  (147 kB gzip); its advisory size warning remains, without a build failure.
- Local integration: 47 checks PASS. Actual Auth/Postgres/API/Storage cover allow
  and deny paths, project isolation, role restrictions, concurrent case edits,
  frozen snapshots, draft reload, idempotent finalization, preserved failure/retest,
  issue events, private captures, membership withdrawal and backup/restore.
- Invitations: activation, expiry, replay refusal, recovery, denied account reset,
  and weak-password rejection before link consumption are checked.
- Local and hosted Chrome workflow/activation journeys PASS. They verify two
  accounts, failed result/capture, referenced correction and successful retest,
  mobile navigation/logout, stable textarea labels after reload, delayed network
  responses after closing a dialog, and actual project-loading states.
- Hosted UI archive download PASS, including ZIP integrity, case count and evidence.
- Hosted API/Storage acceptance: all 11 checks PASS, including signup refusal,
  email login, cross-project isolation, direct/RPC write denial and private images.
- Hosted HTTPS returns 200 with CSP, no-referrer and framing-denial headers.
  The configured server key, database password and owner email are absent from
  published assets. Desktop/mobile views were visually inspected using synthetic
  identities. Invitation screens are excluded from automatic screenshots.
- A hosted export was restored into an empty owned local installation. Verified:
  1 project, 5 memberships/profiles, 10 cases/revisions, 1 campaign/10 items,
  2 executions, 1 issue/2 events, 1 attachment. Counts, evidence bytes and historical
  relationships passed; the restored admin regained access through a new invitation.
  The previous synthetic local history was exported before its reset.

Private acceptance backups are in backups/: integration.zip,
local-before-hosted-restore.zip, hosted-acceptance.zip and hosted-restore-evidence.json.
They are local copies; operations requires a separate private off-machine copy.
The hosted technical project retains the failure and successful verification.
CI configuration exists but no remote CI run is claimed.

## Corrections incorporated before release

Strict case-body validation at the database boundary; editable technical references;
issue-to-execution/capture navigation; correctly bounded random reprovisioning passwords;
email provider enabled with global public signup disabled; explicit field labels;
closed dialogs stay closed after delayed saves; mobile logout and all navigation
remain visible; loading/retry does not falsely claim that no project is assigned.

## Continuity and local infrastructure

All four ERP repositories link to this project in AGENTS.md and docs/context.md.
The ERP roadmap/QA strategy reference the external support without changing product
phase order or completing CH-* work. Unrelated admission changes are preserved.
The ERP application, consumers, fixtures and Node runtimes were not changed.

The old volume supabase_db_qa-workbench is preserved after an interrupted startup.
Automatic approval rejected deleting it because useful-data absence was unverified;
a safe separate validation volume was used. The owned qa-workbench-validation DB
uses 768 MiB tmpfs on this machine. It is disposable and currently contains the
restored hosted acceptance archive. Stopping it can discard its data. Read
OPERATIONS.md before restart/reset. Never use integration resets against hosted data.

The editing staging directory /tmp/qa-workbench is ephemeral. Persistent repository
source and private release files must be synchronized before leaving this session.
The final source, docs, test evidence and backups are retained in the project path.

## Next action

The owner activates the private link, chooses ERP multi-campus and creates the first
real campaign using the French USER_GUIDE.md. No further product work is implicitly
authorized by this handoff. For the next requested ERP roadmap task, identify case
IDs to create/revise/archive, or document why manual QA is unaffected. Follow the
project roadmap for future phase-2 prioritization and operations for manual backups.
