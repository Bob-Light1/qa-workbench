# Current task and handoff

Last updated: 2026-10-22.
Status: IMPLEMENTATION AND VERIFICATION IN PROGRESS. No hosted release verified.

## Objective and decisions

Deliver the approved standalone QA Workbench phase 1, ten French ERP cases,
English engineering documentation, private source and free hosting. Preserve all
ERP admission changes. See DESIGN.md for durable decisions and ROADMAP.md for status.

## Verified implementation state

Canonical repository: /home/adminsecu/Projects/qa-workbench, branch main.
The current source is synchronized from /tmp/qa-workbench before release. Node 24
is project-local; ERP runtimes and application code are unchanged.

Cloudflare direct-upload Pages project qa-workbench is authorized. Dedicated Free
Supabase project QA Workbench: ref xtgaepikylepriipuyps, region eu-west-3.
Migrations 1–4 and manage-access are deployed; Auth public signup is disabled and
the email/password provider is enabled. Ten cases exist in ERP multi-campus and
in a separate synthetic acceptance project. Owner account is provisioned privately;
its activation link is never stored in documentation. Frontend deployment and
HTTPS acceptance are next; no online release is claimed yet.

## Checks actually run

- Eight unit checks PASS; TypeScript and production build PASS.
- npm dependency audit: zero vulnerabilities.
- Local integration: 47 checks PASS, covering RLS/API/Storage allow/deny,
  concurrent edits, frozen instructions, drafts/idempotent submissions, issue
  history, invitations/recovery/expiry/replay, withdrawal and export/restore.
- Empty-installation restore PASS with row counts, historical attribution and
  downloaded evidence bytes checked. Missing Auth identities are reprovisioned.
- Both Chrome journeys PASS: two accounts, failure/capture/fix/retest, draft reload,
  delayed save response after closing the dialog, mobile navigation/logout; and
  weak-password activation plus one-use invitation replay refusal.
- Desktop and 390px mobile screenshots inspected. The inspection found and fixed
  clipped navigation and hidden mobile logout. Explicit screenshots contain only
  synthetic QA identities. Screenshots during invitation display are disabled.

## Local infrastructure caution

The old volume supabase_db_qa-workbench is preserved. Automatic approval rejected
its deletion because absence of useful data was unverified. The separate
qa-workbench-validation database uses a disposable 768 MiB tmpfs volume on this
machine; never store durable results there. Required health checks remain active.
See OPERATIONS.md for startup, migrations and discarded-RAM-data behavior.

## Changes this session

Case technical-reference editing; direct issue-to-execution/evidence navigation;
restore-generated passwords meet the configured strength requirement; validation
stack guard before integration resets; additive case-body validation migration.
Existing documentation links in all four ERP repositories remain present. No ERP
business code or fixtures changed; admission work remains untouched.

## Remaining work and next action

Commit the reviewed source, publish the configured frontend, run both browser
journeys over HTTPS and hosted API denial checks, export hosted data and verify
recovery evidence. Record deployment/commit identifiers, finalize roadmap/docs,
refresh and deliver the private owner activation file, check all ERP references.
Do not mark phase 1 delivered until hosted acceptance passes.
