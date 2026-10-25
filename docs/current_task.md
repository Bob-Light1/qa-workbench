# Current task and handoff

Last updated: 2026-10-25.
Status: PHASE 1 DELIVERED. P2-01 coverage and reviews validated locally; hosted release open.
Phase 3 not started.

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
credentials/configuration remain in private ignored files. At phase-1 delivery,
no paid upgrade, public source publication, remote Git hosting or phase-2 work
had been performed. The P2-01 milestones below supersede that phase-2 status.

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

## Phase-1 next action (historical)

The owner activates the private link, chooses ERP multi-campus and creates the first
real campaign using the French USER_GUIDE.md. No further product work is implicitly
authorized by this handoff. For the next requested ERP roadmap task, identify case
IDs to create/revise/archive, or document why manual QA is unaffected. Follow the
project roadmap for future phase-2 prioritization and operations for manual backups.

## Continuity review — 2026-10-22

Objective: assess readiness to resume the project at the owner's request. Read the
agent instructions, README, design, roadmap and existing handoff; inspected package
scripts and the source/test layout. Branch main was clean at 80f718e before this
documentation update. No application changes, test runs or live deployment checks
were performed during this review; the acceptance results above remain historical
evidence. The released application remains 891d37a at
https://qa-workbench.pages.dev. Phase-2 scope still needs an owner request; the next
action above and all operational caveats remain applicable.

## P2-01 milestone — 2026-10-23

The owner now authorizes continuation in roadmap order with browser verification.
Scope: revision-aware roadmap coverage and optional cases ERP-011–ERP-013, preserving
the ten-case pilot catalog. Case review state and later roadmap items remain open.
Implemented a coverage view within the case page, campaign/search filtering,
historical revision context and separate missing-reference/archived handling.
The three new cases reference inspected ERP route guards for campus, role and module
boundaries; they do not claim API authorization acceptance. No ERP files, schema,
hosted data or deployed frontend have been changed.

Checks so far: TypeScript and 15 unit checks pass. Production build and dedicated
local API/browser acceptance are in progress. Local Supabase initially timed out
during Auth health/provisioning; its existing validation data is preserved. New
acceptance fixtures are additive and isolated, without reset. The initial API run
failed on Auth provisioning with HTTP 504; no API/browser success is claimed yet.
Next: finish local acceptance, inspect desktop/mobile screenshots, and record the
verified state here. Released application remains 891d37a at
https://qa-workbench.pages.dev (deployment f485304d).

## P2-01 acceptance closeout — 2026-10-25

Objective: continue the existing revision-aware coverage increment in roadmap
order, validate it and commit the completed work. Case review state is the next
P2-01 increment; P2-02 and phase 3 remain outside this increment.
Validated local implementation commit: 0636102b1773468e5757749e30e6ed898b961a4b.

Changes: completed the existing coverage implementation and optional ERP-011–013
catalog; checked the referenced ERP route guards, including AdminRoutes for
ERP-012. Added confirmed private synthetic evidence to API fixtures so the full
browser suite can export the project independently. Coverage assertions use
actual user-JWT API rows. Corrected the browser fixture default so ordinary
phase-1 runs skip the dedicated coverage journey when its IDs are absent. CI now
includes additive coverage API/browser acceptance after phase-1 checks.

Checks completed: TypeScript, 15 unit checks, production build, formatting and 13
local API/Storage checks pass. A temporary mutant selected results without checking
the case revision; the regression test failed with result instead of stale, as
expected. The mutant was removed without modifying the running application.
Browser runs: coverage, archive and two-account failure/retest passed twice.
Invitation timed out awaiting the local function in those full runs. After
checking function readiness (OPTIONS 204 and anonymous POST 401), its targeted
browser rerun passed: weak password preserves the link, activation succeeds,
and replay is refused. All four journeys passed across these runs; no single
all-green full-suite run is claimed. Final TypeScript, unit and build rerun
also passed. Desktop/mobile
coverage screenshots were inspected; the mobile page has no document overflow,
and the table keeps its context columns in its horizontal scroll area.

Infrastructure: the owned local Supabase stack is healthy. Added separate
synthetic coverage projects without resetting the restored local database. The
ignored .env.coverage.browser contains private test credentials. No hosted data,
schema, frontend deployment, ERP files or original ERP-001–010 catalog changed.
The full destructive phase-1 integration/restore suite was not rerun; its earlier
47-check result remains historical. No hosted acceptance or remote CI run is
claimed for this increment. Vite retains its advisory chunk-size warning.

Next action: implement revision-bound case review state within P2-01, including
authorization, stale-write handling and preservation in backup/restore. Broader
ERP coverage and P2-02 remain open. The coverage increment is local and not a new
online release: the deployed application remains source 891d37a at
https://qa-workbench.pages.dev (deployment f485304d).

## P2-01 review closeout — 2026-10-25

Objective: continue the next planned review increment and commit validated work.
Initial main was clean at bdbe7ee. Implementation commit:
cb94df4878726baeaa92daa93c2ab58da58c16be. No subagents used.

Changes and decisions:

- Admins/editors append approved/changes-requested opinions to exact case revisions;
  testers read them. History keeps actor, timestamp, opinion and comment. Requested
  changes need a comment containing more than whitespace. Self-review is permitted.
- The RPC obtains the current role server-side, locks the case and compares both
  revision and previous review identity. Direct mutations are denied. Edits,
  archive/restore and conflicting opinions cannot silently carry forward approval.
  Reviews remain advisory and do not establish ERP acceptance or block campaigns.
- The catalog shows review state; a dialog displays the full current case and
  opinion history. Failed saves retain the dialog without claiming success.
- Archive format 2 includes review history; format 1 remains readable/restorable.
  The restore author-mapping loop includes the new table. New ordinary opinions
  reject blank whitespace; server-only restoration preserves earlier accepted
  opinions verbatim rather than rewriting history.
- Three append-only migrations were applied only locally. A focused API check
  exposed accepted newline/tab-only comments before repair. Applied migrations
  were preserved: the follow-ups tighten the RPC and retain restore compatibility.
  Design, French user guidance, operations, contributor commands and CI updated.
- No ERP source, roadmap ordering, CH-* rules or ERP-001–013 content changed. This
  Workbench coordination feature requires no manual ERP catalog revision.

Checks actually completed:

- TypeScript, 17 unit checks, production build, formatting and Git diff checks pass.
  Vite retains its advisory size warning (about 510 kB JS minified, 150 kB gzip).
- Review API acceptance: 29 checks pass using actual user JWTs and local Postgres.
  Includes anonymous/tester/outsider denial, direct mutation denial even for an
  admin, membership withdrawal, note validation, simultaneous opinions, stale
  revisions, archival, frozen campaign snapshots and exact exported review rows.
- The added newline/tab regression failed before repair, then passed. The real
  restore RPC passed with exact review rows/actors, legacy archives without a review
  table and earlier whitespace-only opinions, each in an empty transactional target
  rolled back afterwards. Existing local projects, Auth and Storage were preserved.
  The three-migration sequence also passed in a rolled-back recreation of the
  review table. No destructive stack reset was performed.
- Coverage API regression: all 13 checks pass on separately added synthetic fixtures.
- The dedicated review browser journey passed three times (the last two include
  downloading/decoding the v2 archive and checking all six opinions). It checks
  stale-opinion refusal, correction, revision invalidation, server failure without
  success, retained authors/history and tester read-only access. Final desktop and
  mobile screenshots were visually inspected; mobile has no document overflow.
- Existing browser coverage, complete archive including evidence, and two-account
  failure/evidence/correction/retest journeys pass. The invitation journey timed out
  awaiting its link. Subsequent local function readiness requests timed out, then
  returned 503; the edge runtime was observed Dead. A serve retry did not recover
  it and only that retry process was stopped. No all-green full browser run is
  claimed; invitation activation remains an explicit local infrastructure blocker.

Infrastructure and retained evidence:

- The CLI migration command could not reach the local PostgreSQL port. After a
  private public-schema data dump, migrations were applied transactionally through
  psql inside the owned qa-workbench-validation container and recorded in its
  migration ledger. Hosted schema/data/frontend and other applications are untouched.
- Private evidence: backups/review-acceptance.zip, backups/local-before-reviews.sql,
  backups/reviews-desktop.png and backups/reviews-mobile.png. The SQL file is a local
  public-data safety snapshot, not a replacement for a complete portable archive.
  Ignored .env.review.browser holds synthetic account credentials. Retained earlier
  backups and the validation tmpfs/old-volume caveats above remain applicable.
- The destructive phase-1 integration/empty-installation Auth reprovisioning and
  Storage round trip was not rerun; the earlier 47-check result remains historical.
  No hosted acceptance, deployment or remote CI execution is claimed. The online
  release remains 891d37a at https://qa-workbench.pages.dev (deployment f485304d),
  with hosted migrations 1–4. A working local increment is not online delivery.

Next action: recover only the owned local Edge Function runtime and rerun invitation
acceptance. Then prepare delivery of coverage/reviews with a fresh hosted archive,
new migrations, frontend deployment and hosted allow/deny/review/export acceptance.
Broader ERP coverage and P2-02 twenty-account/bulk work remain open. Do not reset
useful local data or restart shared infrastructure to recover the function.
