# QA Workbench design

Decision date: 2026-10-22. Approved baseline: owner request and implementation plan.
Product goal: a durable record of short manual checks, usable by humans and agents
across sessions, initially for the four-repository ERP.

## Architecture

One React/TypeScript/Vite app, built with Node 24. Cloudflare Pages hosts assets.
Supabase supplies Auth, PostgreSQL, private evidence Storage and one access-management
Edge Function. No ERP authentication, database access or runtime dependency is reused.
Local development has an owned Supabase project and fixed non-ERP ports.

The browser uses a publishable key and user JWT. Ordinary writes use bounded SQL
RPCs. Grants and RLS restrict every exposed table and Storage object. The access
function validates the caller with Auth and rechecks project administrator status.
Its service key never reaches the client. A bootstrap operator is the installation
owner and can recover other users' accounts; a project admin cannot reset an account
that may hold privileges in another project. Existing accounts receive membership
without generating a takeover link.

## Data model and invariants

- Projects have active memberships with admin/editor/tester roles. The last active
  project admin cannot be removed or demoted, even by concurrent requests.
- Test cases have stable project-scoped codes and an optimistic version. Every
  revision stores author, time and body. Archive/restore preserves revision history.
- Campaigns record the environment and per-brick build references. Their items
  store immutable case snapshots at campaign creation, not at first execution.
- Assignments are versioned. An unassigned item is open to project members; an
  assigned item can only be executed by its assignee.
- Executions have UUID request identity, actor, notes, duration and version.
  One draft per item/actor can be resumed. Finalization preserves its identity;
  identical replay succeeds without duplication. Later changes are rejected.
- Results are passed/failed/blocked/skipped; absence of a verdict means draft.
  Negative and skipped outcomes require an explanatory note. Retests append results.
- Issues distinguish defect/suggestion/case_error/environment. Status changes keep
  events. A defect cannot be verified or closed without a later passing execution
  of the same campaign item. Corrections must identify a commit, fix or decision.
- Evidence has pending/ready states. Private images accept PNG/JPEG/WebP, 1 byte to
  5 MiB. Browser checks include magic bytes; Storage enforces MIME/size, and the
  confirmation RPC verifies the stored object's metadata. This is not malware scanning.
  Failed uploads remain pending until retried or cancelled. Pending evidence blocks
  finalization and complete backup. Ready files are immutable through the client.
- Case authoring uses one action/expected pair per line. Ten minutes is an estimate,
  never an automatic success or forced timeout.

## Access matrix

| Operation                                            | Admin                      | Editor | Tester |
| ---------------------------------------------------- | -------------------------- | ------ | ------ |
| Read assigned project data and evidence              | yes                        | yes    | yes    |
| Create/revise/archive cases and campaigns            | yes                        | yes    | no     |
| Assign campaign items and manage issues              | yes                        | yes    | no     |
| Execute unassigned/own assigned items, report issues | yes                        | yes    | yes    |
| Change members or export the whole project           | yes                        | no     | no     |
| Reset another existing global account                | installation operator only | no     | no     |

Membership withdrawal blocks fresh database and object access. Previously issued
signed object URLs can remain valid for their 60-second lifetime. Previously viewed
content cannot be recalled. Invitations/recovery links are one-use bearer secrets
with a one-hour configured lifetime; users set their own password (12+ characters, mixed case, digit and symbol; maximum
72 UTF-8 bytes). Weak passwords are checked before consuming a one-use link.
No automatic email, public signup, billing, marketing page or ERP provisioning is included.

## Backup and portability

Version-1 ZIP bundles contain one project, memberships/profiles, case revisions,
campaigns/snapshots, executions, issues/events and evidence bytes. A single RPC
captures a consistent database snapshot. SHA-256 checks detect corruption of the
manifest and files; checksums are not signatures of trust.

Restore is a server-only operation into an empty application installation. It
recreates missing Auth identities with unknown random passwords, maps historical
actors to the equivalent target accounts, uploads evidence and inserts business
rows transactionally. Counts and downloaded files are checked afterwards. Existing
accounts keep their passwords; recreated users require new invitation/recovery links.
Auth password hashes and sessions are not part of the portable business bundle.
This is a documented account-reprovisioning recovery path, not a raw infrastructure clone.

## Three development phases

### Phase 1 — Start real manual QA

Deliver authenticated online app, the data model above, agent CLI, documented
backup/recovery, ten verified starter cases and two-user end-to-end acceptance.
Exit requires a real HTTPS deployment, tested database/Storage denial paths,
retained failed/passing attempts and verified restoration in an empty installation.

### Phase 2 — Broaden coverage and team coordination

Expand ERP coverage in dependency/risk order. Add case review, bulk changes and
coverage by roadmap work item. Verify twenty identities and concurrent editing.
Preserve phase-1 IDs and histories through migrations. No commercial user cap.

### Phase 3 — Remove repetitive work

Import deterministic automated results with their origin, connect code changes to
case review, schedule backups and add only indicators that support decisions.
Automation may suggest coverage changes; a human approves expected business behavior.

## Decisions and constraints

- 2026-10-22: standalone app, free hosting, manual invitation links, French UI,
  English engineering docs, ten starter cases, ERP local synthetic environment.
- Free hosting may pause after low activity; resume is operational, not a bug.
- Keep the code private until the owner selects a publication/license policy.
- Use provider-native APIs plus a small CLI for agents; no custom agent platform.
- Finalized test outcomes are historical evidence; fixing a case never rewrites them.

See [roadmap](ROADMAP.md) for status and [operations](OPERATIONS.md) for provider limits.
