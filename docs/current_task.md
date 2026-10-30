# Current task and handoff

Last updated: 2026-10-30.
Status: PHASE 1 DELIVERED. P2-01 coverage/review increment RELEASED AND VERIFIED.
Frontend c305e01, deployment 218a2d56, hosted migrations 1–7. All five HTTPS browser
journeys pass across two dedicated fixture runs. Broader ERP coverage remains open.
P2-02 bulk assignment and twenty-account API collaboration VERIFIED LOCALLY at
25bf7f3; NOT RELEASED. Phase 3 not started.
P2-02 release preparation tooling and hosted acceptance opt-in are locally
verified at 207eba8. Fresh hosted backup/plan preparation was rejected by automatic
approval review pending explicit authorization for its sensitive payload/destination.
No new hosted backup, production migration or Pages publication occurred.

## Objective and released state

The approved standalone QA Workbench is online at https://qa-workbench.pages.dev.
Source repository: /home/adminsecu/Projects/qa-workbench, branch main, private local
Git repository. Published frontend source: c305e0168ef76b0ae3dca94c108a43c4898e09a1;
Cloudflare production deployment 218a2d56. Later documentation/tooling maintenance
commits do not change the verified published assets. Supabase Free project
xtgaepikylepriipuyps, region eu-west-3; migrations 1–7 and manage-access deployed.

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

## P2-01 release preparation closeout — 2026-10-25

Objective: continue in documented order, recover invitation acceptance and deliver
the existing coverage/review increments, then commit the verified changes. Initial
main was clean at 93df62b. No subagents used. No ERP source or case content changes
are needed for this Workbench delivery/validation work.
Validated implementation commit: 27285676f7decabd9a89d4b2627fc8d0f851b6db.

The owned Edge Function was absent at session start. Starting only
`supabase functions serve --env-file .env.functions.local` recovered it without
restarting databases or shared services. Its initial
cold requests timed out; subsequent preflight and anonymous POST returned 204/401,
and an authenticated synthetic invitation succeeded without logging its link.
Added a bounded readiness command and CI gate, plus explicitly opted-in hosted
coverage/review acceptance restricted to the exact existing QA Supabase project.
Hosted fixtures and archives use separate private files; the transactional empty
restore check remains local-only. Browser invitation acceptance now checks its
real response status before reading the private link.

Checks actually completed:

- 24 unit checks, TypeScript, production build, changed-file formatting and Git diff
  checks pass. Predeploy validation and an asset scan confirm the hosted API target
  and absence of the configured service key, database password and owner contact.
  Vite retains its advisory size warning (about 510 kB JS, 150 kB gzip).
- A temporary mutant ignoring HTTP status made three readiness assertions fail,
  including a functioning preflight with a failed POST. The original was restored
  and all 24 unit checks passed again. Target guards check local allow/deny paths,
  hosted opt-in, exact URL matching and separate fixture names. Hosted P2 behavior
  itself remains unexecuted; these unit checks do not establish hosted permissions.
- The modified local review API script passes all 29 checks, including actual
  user-JWT permissions, concurrent opinions and the real restore RPC in a rolled-back
  empty transaction. The modified coverage API script passes all 13 checks.
- A single fresh-fixture local browser run passes coverage, complete export,
  two-account failure/evidence/correction/retest and invitation activation/replay:
  4 passed, with review intentionally skipped for that fixture file. The dedicated
  review journey then passes separately on fresh review fixtures, including decoding
  the v2 archive and checking the six retained opinions. Desktop/mobile screenshots
  of both features were visually inspected; there is no document overflow.
- The first cold invitation browser run exceeded its 20-second link wait. A later
  reused coverage fixture also failed because the prior browser journey had advanced
  its revision. Fresh fixtures and the bounded response-status check passed in the
  final runs above. CONTRIBUTING now documents fixture consumption and sequential
  browser runs. No application logic was changed to bypass either failure.
- Existing hosted API/Storage acceptance passes all 11 checks against the unchanged
  production schema, and the public HTTPS site returns 200. The destructive phase-1
  integration/Auth reprovisioning/Storage restoration suite, npm audit and remote CI
  were not rerun. Their earlier results remain historical.

Retained private release evidence:

- `backups/pre-p2-release-1792890709008/`: a PostgreSQL public/private/migration
  snapshot and two complete format-1 project archives. Checksums, manifest shape
  and evidence bytes passed decoding. The real ERP workspace has 10 cases and no
  executions; the separate technical workspace has 10 cases, 2 executions and one
  evidence file. These observations are not ERP acceptance.
- The host's pg_dump 14 cannot dump PostgreSQL 17. The owned container's pg_dump 17
  produced the hosted snapshot using a read-only operation; no local reset occurred.
- `backups/p2-release-local-coverage-*.png`, `backups/p2-release-local-reviews-*.png`,
  workflow screenshots and `backups/review-acceptance.zip` retain synthetic local
  evidence. Files/fixtures remain ignored and private. These are local backups;
  the existing separate-private-location backup requirement remains unresolved.
- Private preparation scripts in `backups/prepare-p2-release.mjs` and
  `backups/apply-p2-migrations.mjs` remain available for operator inspection. The
  migration script checks archives and the exact four-version hosted ledger before
  attempting all three files and ledger entries in one transaction. It was refused
  before execution, so no success is claimed for it.

Production release blocker: automatic approval review rejected the attempted
hosted migration command. Its stated reason was that the user authorized project
continuation and commits, but had not explicitly authorized this exact production
schema change, which can affect shared service behavior. The rejected action was
not retried or bypassed. No hosted schema, data, Auth configuration or frontend was
changed. Explicit owner approval must precede applying migrations `202610250001`–
`202610250003` and publishing coverage/reviews to the existing Pages site.

Next action after that approval: refresh the verified project backups, inspect and
apply the three existing additive migrations transactionally, run opted-in hosted
review/coverage API acceptance, publish the validated frontend and run the HTTPS
browser/export journeys. Record the new release only after checks pass. The online
release remains source 891d37a at https://qa-workbench.pages.dev (deployment
f485304d), with hosted migrations 1–4. P2-01 remains open; broader ERP coverage,
P2-02 and phase 3 have not started in this session. The owned local stack and
function are running; previous tmpfs, retained-volume and backup caveats remain.

## P2-01 reproducible release preparation — 2026-10-30

Objective: continue the next documented delivery step and commit completed work.
Initial main was clean at 0f73000. Implementation commit:
c956268. No subagents used. The earlier production approval refusal remains
applicable: the current general continuation request did not explicitly approve
the three production migrations. A targeted approval request was sent; no schema
application or frontend publication was attempted while it remained unanswered.

Changes:

- Replaced reliance on untracked private operator scripts with versioned
  `scripts/p2-release.mjs prepare|plan`. Both force read-only database sessions.
  Preparation captures every current project and ready evidence, a PostgreSQL 17
  application/ledger dump, source commit and artifact/migration SHA-256 hashes.
- Planning checks the actual project inventory instead of assuming two archives,
  rejects expired/future backups, verifies archives/evidence and dump integrity,
  and detects changed migration files or hosted migration history. It writes
  reviewable SQL without executing it. The SQL rechecks age, inventory and the
  four-migration baseline under locks before all three migrations/ledger writes.
- Added five focused unit checks and `npm run test:release:db`, also configured in
  CI. The latter targets only the owned local container and rolls back every
  migration rehearsal. Operations/contributor guidance documents prerequisites,
  separate snapshot boundaries, private artifacts and the approval boundary.
- No ERP source, case content, phase ordering or CH-* criteria changed. This
  Workbench release-tooling work needs no manual ERP case revision.

Checks actually executed:

- Final 29 unit checks pass; TypeScript/production build, changed-file formatting,
  Git diff checks, hosted frontend configuration and configured-secret asset scan
  pass. The existing Vite advisory remains (510 kB minified JS, 150 kB gzip).
- Removing only the backup-age guard in a temporary copy made its regression test
  fail as expected. Temporary mutant files were removed; final unit checks pass.
- Local PostgreSQL checks pass for migration replay denial, expired-backup denial,
  changed-inventory denial and successful execution of all three migrations/ledger
  inserts. RLS, grants and strict review notes were checked. Every rehearsal was
  rolled back; review-row, function-definition and ledger fingerprints match the
  original state. No stack reset, database restart or persistent local schema
  change occurred. The existing seven-version local ledger was inspected.
- The new preparation and planning commands succeeded against hosted QA using
  read-only sessions. Private evidence is under
  `backups/pre-p2-release-1793382007784/`: two complete archives, database.sql,
  release.json and apply.sql. It contains the ERP project's ten cases/no executions
  and the synthetic project's ten cases/two executions/one evidence file. Archives
  were decoded and all evidence checksums passed. These are separate snapshots,
  not an installation-wide point-in-time backup or ERP acceptance.
- All 11 existing hosted API/Storage allow/deny checks pass. HTTPS returns 200 with
  the existing security headers. The actual hosted browser export journey passes
  and decodes its complete archive. Coverage/reviews are still absent from the
  hosted schema/frontend, so no hosted acceptance for those features is claimed.
- Full phase-1 destructive restore, invitation activation, coverage/review API and
  browser journeys, npm audit and remote CI were not rerun. Their earlier results
  above remain historical. The local Edge Function container was absent on this
  session's inspection; it was not needed or started for these release-tool checks.

Next action: obtain the pending explicit approval for migrations 202610250001–003
and Pages publication; refresh the private backup/plan, inspect/apply the SQL and
run hosted coverage/review and HTTPS acceptance before declaring delivery. Backups
here are local/private; the separate off-machine-copy requirement remains open.
The retained-volume/tmpfs caveats still apply. P2-01 remains IN PROGRESS; broader
ERP coverage, P2-02 and phase 3 remain open. Production is unchanged: source
891d37a at https://qa-workbench.pages.dev, deployment f485304d, migrations 1–4.

## P2-01 authorized production release closeout — 2026-10-30

The owner explicitly approved refreshed private backups, production migrations
202610250001–202610250003, Pages publication and hosted acceptance. Initial main
was clean at 46f62ae. No subagents used. This supersedes the earlier approval blocker.

Released state and preservation:

- Refreshed and verified `backups/pre-p2-release-1793390592190/` with both original
  project archives, ready evidence, PostgreSQL 17 dump, hashes and guarded SQL plan.
  Applied only the three approved migrations and ledger entries in one transaction
  through private `backups/apply-approved-p2.mjs`. Actual hosted ledger contains
  versions 1–7. Compared all 12 exported tables of both original projects against
  their pre-migration archives: every historical row is unchanged.
- Published frontend source c305e0168ef76b0ae3dca94c108a43c4898e09a1 to the existing
  Pages project/main branch, deployment 218a2d56. Canonical origin:
  https://qa-workbench.pages.dev; deployment URL:
  https://218a2d56.qa-workbench.pages.dev. The prior f485304d frontend remains the
  phase-1 fallback. No Auth configuration or Edge Function deployment changed.
- Hosted acceptance added only separate synthetic coverage/review projects and
  identities. The real ERP project still has its original ten-case catalog;
  optional ERP-011–013 were imported only in the coverage acceptance project.
  No ERP source, case content, phase ordering or CH-* criteria changed. This
  Workbench release needs no manual ERP case revision and establishes no ERP verdict.

Checks actually executed:

- All 13 hosted coverage API checks and all 28 hosted review API checks pass using
  actual JWTs, including RLS/grants, anonymous/tester/outsider denial, withdrawn
  membership, simultaneous opinions, stale revisions, immutable history and v2
  export. Hosted reset/restore is explicitly excluded. All 11 original hosted
  Auth/API/Storage permission/evidence checks pass after migration.
- Canonical HTTPS browser run with fresh coverage fixtures: 4 passed in one run
  (coverage, complete archive with evidence, two-account failure/correction/retest,
  invitation activation/weak-password/link-replay refusal). The subsequent dedicated
  review browser run: 1 passed (stale review/edit invalidation, failed request with
  no false success, authors/history, tester read-only access and six-opinion v2 ZIP).
  Desktop/mobile coverage and review screenshots were visually inspected; no
  document overflow. Browser suites ran sequentially and invitation links were not
  logged or captured. All five journeys passed across these two runs.
- HTTPS returns 200 with the existing CSP/no-referrer/framing-denial headers.
  Downloaded JS/CSS match the validated local build byte for byte. Hosted target,
  publishable configuration and configured-secret asset scans passed. Private
  `published-assets.json` retains source/deployment identifiers and asset hashes.
- After browser acceptance, ordinary admin-JWT exports were saved and decoded as
  format 2: `backups/p2-hosted-218a2d56-coverage.zip` (16 cases, 2 evidence files)
  and `backups/p2-hosted-218a2d56-review.zip` (1 case, all 6 review opinions including
  the final v5 approval). Checksums and evidence pass. Screenshots are retained as
  `backups/p2-hosted-218a2d56-*.png`; fixtures remain private/ignored.
- The release audit initially found 3 vulnerabilities through Wrangler's
  Miniflare/Undici development dependencies. Targeted `npm update wrangler` changed
  only that toolchain: Wrangler 4.151.3 → 4.156.0, Miniflare
  5.20261019.1-beta → 5.20261023.3-beta, Undici 7.29.1 → 7.30.1 and Workerd binaries.
  Fix committed as e8ef298. Final `npm audit --audit-level=moderate`: 0
  vulnerabilities. Final 29 unit checks, TypeScript/build and the updated CLI's
  authenticated read-only Pages project check pass. Rebuilt assets match the
  already verified publication, so no second deployment was needed. See the
  [upstream Undici advisory](https://github.com/nodejs/undici/security/advisories/GHSA-4w7w-5xrc-9h26)
  and [Wrangler release](https://github.com/cloudflare/workers-sdk/releases/tag/wrangler%404.156.0).
  Npm noted unapproved install scripts for esbuild/workerd; no new script approvals
  were added. The build and required Pages CLI operation work without them.
- No local database reset/restart or destructive phase-1 Auth/Storage restoration
  rerun occurred. Earlier local restore/rollback acceptance remains historical.
  No remote CI execution is claimed. Vite retains its advisory 510 kB JS chunk
  warning (150 kB gzip); it does not fail the build.

Next action: P2-02 twenty-account collaboration and bulk-work design/acceptance is
the next engineering increment after this delivered milestone; broader ERP case
coverage remains open under P2-01. Keep the real ten-case workspace distinct from
synthetic acceptance data. Portable backups are verified local/private copies;
their separate off-machine copy remains outstanding. Retained-volume/tmpfs and
local Edge Function caveats above remain applicable. Phase 3 has not started.

## P2-02 collaboration closeout — 2026-10-30

Objective: continue the next engineering increment, validate it and commit the
completed work. Initial main was clean at 8979a90. Implementation commit: 25bf7f3.
No subagents used. Scope is atomic campaign-item assignment/unassignment and
actual twenty-account concurrent API work. Broader ERP coverage and phase 3 remain
open. This increment is locally complete; P2-02 delivery remains IN PROGRESS.

Changes and preservation:

- Added append-only migration `202610300001_bulk_assignments.sql` and the French
  bulk-selection interface. The RPC checks current roles, active target membership,
  one campaign, 1–200 distinct IDs and every expected version. Stable item lock
  order serializes overlapping batches and single assignments. A shared project
  lock serializes membership changes. Any invalid/stale item refuses the whole lot.
- Refresh/campaign navigation clears selection and target; failed requests retain
  the selection without displaying success. Explicit label association keeps the
  target select reliably addressable. Testers see no bulk controls. Closed
  campaigns may be organized without reopening them or allowing execution.
- The additive migration was applied only to the owned local validation stack.
  No existing migration was edited, no data reset occurred and no hosted state
  changed. No table or backup-format change was needed. Case snapshots and all
  submitted results remain unchanged by assignments. This Workbench feature needs
  no ERP case revision, phase-order change or CH-* acceptance change.
- Added local-only additive collaboration acceptance, a dedicated browser journey
  and CI steps. Updated the old release SQL rehearsal to verify the entire tracked
  local ledger and temporarily reconstruct its original ledger/review-table baseline
  only inside rolled-back transactions. It fingerprints the new function too.

Checks actually completed:

- Final 29 unit checks, TypeScript/production build, changed-file formatting and
  Git diff checks pass. Vite retains its advisory chunk warning (512 kB JS,
  151 kB gzip); the build succeeds.
- Final collaboration API acceptance: 47 checks pass through actual Auth and user
  JWTs. Includes anonymous/tester/outsider/direct-write denial, malformed and
  mixed-project/campaign selections, inactive targets/withdrawn editors, stale
  all-or-nothing refusal, single/bulk races, twenty overlapping batches with one
  winner/nineteen conflicts, twenty distinct concurrent drafts/failures/retests,
  immutable results, forty retained submitted outcomes in export and preserved
  snapshots. Twenty competing case edits use the two authorized editor identities;
  execution and history-read checks use all twenty identities. This is functional
  concurrency acceptance, not a capacity benchmark or twenty browser sessions.
- Final dedicated browser journey passes on freshly recreated collaboration
  fixtures using three isolated sessions. Actual stale writes and persisted bulk
  assignment/unassignment, injected HTTP failure without false success, refreshed
  selection, campaign switching, tester restrictions and mobile overflow are checked.
  Final desktop/mobile captures were visually inspected and retained privately as
  `backups/p2-02-local-collaboration-*.png`.
- Existing coverage API: all 13 checks pass on fresh separate local fixtures,
  including confirmed private evidence. Three existing browser journeys then pass
  sequentially: coverage, complete decoded ZIP export with evidence and two-account
  failure/evidence/correction/passing retest. This reruns campaign/execution behavior
  affected by the table integration. Captures are retained privately as
  `backups/p2-02-regression-*.png`. Together with the new journey, four browser
  journeys pass across two sequential fixture runs.
- All four old-release SQL rehearsal checks pass with local migrations 1–8:
  replay denial, stale-backup denial, changed-inventory denial and successful
  migration/ledger application inside a rollback. Review rows, relevant function
  definitions and the full migration ledger retain their fingerprints afterwards.
- The first browser attempt selected the owner's second synthetic project and
  failed before product assertions; the test now selects its intended project.
  The next attempt detected an unreliable implicit select-label association; the
  explicit label fix passes the same check. Final fresh-fixture runs pass.
- The first complementary coverage API attempt failed with Storage HTTP 504. The
  owned Storage container was unhealthy with timed-out probes. Restarted only
  `supabase_storage_qa-workbench-validation`, preserving its volumes and all data;
  health recovered and the fresh coverage/API/evidence/browser runs above passed.
  No database or ERP/shared service was restarted. Its failed synthetic fixture
  remains isolated, with any pending capture intact for inspection.
- Full destructive phase-1 Auth/Storage restoration, invitation activation,
  review-specific API/browser acceptance, npm audit and remote CI were not rerun.
  Their earlier release results remain historical. No hosted acceptance or new
  frontend deployment is claimed. No dependency change was made.

Private `.env.collaboration.browser`, `backups/collaboration-acceptance.json` and
screenshots remain ignored. No credentials, real ERP personal data or invitation
links were added to tracked files. Portable backups still need their separate
private off-machine copy. Retained-volume/tmpfs and local Edge Function caveats
above remain applicable; the owned database was preserved throughout.

Next action: prepare a fresh private backup and reviewed seven-to-eight migration
plan for `202610300001`, obtain explicit approval for that new production migration
and Pages publication, then validate hosted twenty-account/bulk and HTTPS behavior.
The old `scripts/p2-release.mjs` plan is specifically for the already delivered
four-to-seven release and must not be reused for this new migration. The previous
production approval covered only migrations 202610250001–003, already delivered.
Production remains source c305e01, deployment 218a2d56 at
https://qa-workbench.pages.dev (direct deployment:
https://218a2d56.qa-workbench.pages.dev), with hosted migrations 1–7.

## P2-02 release preparation milestone — 2026-10-30

Objective: continue in roadmap order and commit validated work. Initial main was
clean at d7b821c. No subagents used. Scope: make the seven-to-eight production
release concrete and reviewable; do not reuse the delivered four-to-seven plan.

Changes:

- Extracted the existing read-only backup/plan engine into `release-tool.mjs`;
  the historical P2-01 entry point retains its fixed baseline. New
  `collaboration-release.mjs` fixes migrations 1–7, only pending `202610300001`,
  separate private directories and format-2 archives preserving case reviews.
  One-hour expiry, complete inventory, source/snapshot/archive checksums and
  transaction-time locked baseline/age/inventory checks remain enforced.
- Added a local-only rollback rehearsal for the new plan and CI configuration.
  It reconstructs the seven-version baseline only inside a transaction which
  always rolls back. Fingerprints now also cover campaign snapshots and results.
- Added `--hosted` to additive collaboration acceptance with exact-target/strict
  argument checks before provisioning, and separate hosted private fixtures/report.
  This prepares the future acceptance command; it has not been run on hosted data.
- Updated operations/contributor guidance. No frontend, migration source, ERP case
  content, product phase ordering or CH-* rule changed; no manual ERP case revision
  is required for release tooling.

Checks actually completed:

- 36 unit checks PASS, including both release baselines, complete inventories,
  modified sources/snapshots/archives, expiry/future dates and actual CLI refusal
  before account provisioning. Removing only the archive-version guard in temporary
  mutant files caused the new missing-review-history regression to fail as
  expected; all temporary mutant files were removed.
- TypeScript/production build PASS; npm audit reports zero vulnerabilities.
  Frontend hosted configuration, changed-file formatting and Git diff checks pass.
  Vite retains the advisory 512 kB JS chunk warning (151 kB gzip).
- Both old/new SQL plans pass five checks each on the owned local database:
  replay, expired/future backup and changed-inventory denial, plus successful
  migration/ledger rehearsal and access checks. Every transaction rolls back;
  review rows, snapshots, executions, function definitions and full ledger retain
  their fingerprints. No database reset/restart or persistent schema edit occurred.
- Reran all 47 collaboration API checks on fresh local synthetic projects and
  twenty member identities plus an outsider. The three-session local browser
  journey passes with actual stale/persisted bulk writes, failed-request handling,
  tester restrictions and selection reset. Desktop/mobile captures were visually
  inspected; no document overflow. Private captures:
  `backups/p2-02-release-prep-desktop.png` and `-mobile.png`.
- No hosted write/publication, destructive integration/restore, invitation or
  coverage/review-specific rerun, or remote CI run is claimed. Those earlier checks
  remain historical. Existing local data and retained-volume/tmpfs caveats apply.

Next action: commit this verified tooling, then use it to prepare and inspect a
fresh private hosted backup/plan through read-only connections. Obtain explicit
approval for the new migration and Pages publication as required by the preceding
handoff, refresh expiring artifacts if necessary, then execute hosted API/HTTPS
acceptance. The separate private off-machine backup copy remains outstanding.
Production stays source c305e01, deployment 218a2d56 at
https://qa-workbench.pages.dev, with hosted migrations 1–7. Broader ERP coverage,
P2-02 online delivery and phase 3 remain open.

## P2-02 release preparation closeout — 2026-10-30

Verified tooling commit: `207eba8` (guarded seven-to-eight release and hosted
acceptance opt-in). All 36 unit checks pass again after the temporary mutation
experiment. The exact hosted target, publishable frontend configuration and a
configured-private-value scan of built assets pass. No configured server secret
or operator email was found in those assets. Earlier checks in the preceding
milestone were executed in this session; no new hosted acceptance is claimed.

The attempted `collaboration-release.mjs prepare` command was rejected by
automatic approval review before process creation. Its stated reason: exporting
hosted project data, evidence files and a database dump into local backup files
requires trusted user authorization specifying the sensitive payload and destination,
even though database sessions are read-only. No workaround or alternate hosted
export was attempted. The repository remains private and the production release
is unchanged. No new backup directory, release report or SQL plan was created.

Required next authorization: copy all projects in the owned hosted QA Supabase
installation, their ready evidence and a public/private/migration-schema database
dump into ignored private `backups/pre-collaboration-release-TIMESTAMP/` directories
in this repository (directory mode 700, file mode 600). The payload can contain
project contact information, test content and private evidence; it must remain
private. After authorization, run `prepare` and `plan`, inspect the generated SQL
and refresh it if older than one hour. Production application of migration
`202610300001` and publication to the existing Pages project still require the
explicit release approval recorded as pending in the prior handoff.

Once approved, compare pre/post-migration historical exports, run hosted
collaboration and existing access checks, publish and verify HTTPS browser behavior,
then record deployment/source and verified post-release archives. The separate
private off-machine backup copy remains outstanding; no destination was supplied.
Retained-volume/tmpfs caveats and earlier restoration evidence remain applicable.
No ERP case revision is needed for this Workbench tooling. P2-02 remains IN PROGRESS;
production stays source c305e01, deployment 218a2d56 at
https://qa-workbench.pages.dev (direct URL:
https://218a2d56.qa-workbench.pages.dev), with hosted migrations 1–7.
