# QA Workbench delivery roadmap

This is the source of truth for work-item status. Definitions live in [design](DESIGN.md).
Dates and executed evidence live in [current handoff](current_task.md).

| ID    | Item                                           | Status      | Acceptance                                                    |
| ----- | ---------------------------------------------- | ----------- | ------------------------------------------------------------- |
| P1-01 | Independent repository and base documentation  | DONE        | Discoverable, documented, tracked independently               |
| P1-02 | Auth, membership and authorization             | DONE        | Allow/deny, invitation/recovery and removal checks pass       |
| P1-03 | Versioned cases and campaign snapshots         | DONE        | Stale writes refused; campaign instructions remain frozen     |
| P1-04 | Execution, evidence and issue follow-up        | DONE        | Two users, preserved failure/retest, private captures         |
| P1-05 | Backup, restore and agent access               | DONE        | Empty-target round trip preserves data, files and attribution |
| P1-06 | Ten ERP cases and references in four ERP repos | DONE        | Actual routes verified; no fixture credentials published      |
| P1-07 | Hosted release and handoff                     | DONE        | Real HTTPS and two-account acceptance; record commit          |
| P2-01 | Extend ERP case coverage and reviews           | IN PROGRESS | Case IDs linked to product work and review state              |
| P2-02 | Twenty-user collaboration and bulk work        | IN PROGRESS | Concurrent work verified with twenty accounts                 |
| P3-01 | Automated result ingestion and impact checks   | NOT STARTED | Provenance and history preserved                              |
| P3-02 | Scheduled backups and useful reporting         | NOT STARTED | Recovery exercised and indicators actionable                  |

Phase 1 is delivered. The bounded P2-01 coverage/review increments are now also
released at https://qa-workbench.pages.dev: frontend source `c305e01`, deployment
`218a2d56`, hosted migrations 1–7. On 2026-10-30 the owner explicitly authorized
the production migration/publication, superseding the earlier approval blocker.
Fresh verified backups preceded atomic migration; all original project history
was compared unchanged. Hosted acceptance passes 13 coverage, 28 review and 11
existing API/Storage checks, plus all five HTTPS browser journeys across the two
dedicated fixture runs. Desktop/mobile views and v2 archives were inspected.

Coverage groups current case revisions by roadmap reference/campaign and preserves
historical context. Case reviews retain author/revision history, refuse stale or
concurrent overwrites, allow tester reads and export in archive format 2 with
format-1 compatibility. Versioned read-only backup/SQL planning and local
rollback-only migration checks make this release procedure reproducible.

The optional ERP-011–ERP-013 catalog remains in data/erp-cases-phase2.json. These
cases cover direct cross-campus navigation, student/admin role separation and
hidden-module navigation, linked to existing ERP phase-1-B rows 2/3 and the CH-2
manual complement. ERP-001–ERP-010 and the real ERP workspace's ten-case catalog
were preserved; acceptance imported the optional catalog only in a synthetic
workspace. No ERP source, roadmap ordering, CH-* criteria or manual case content
changed during this Workbench release.

P2-01 remains IN PROGRESS for broader ERP coverage; its coverage/review delivery
milestone is complete. P2-02 twenty-account collaboration/bulk work has a locally verified increment
awaiting hosted delivery. Phase 3 has not started. Workbench
acceptance does not establish ERP CH-0, CH-2, CH-4 or other business acceptance.

P2-02 local increment (2026-10-30): atomic bulk assignment/unassignment for up to
200 campaign items is implemented with per-item version checks and current role
validation. Additive migration `202610300001` is installed only on the owned local
stack. Implementation commit `25bf7f3` passes 47 actual Auth/API checks, including
concurrent drafts/results across twenty identities, twenty overlapping batches,
whole-batch stale refusal and preserved history. A three-session bulk browser
journey passes with desktop/mobile inspection; 13 existing coverage API checks
and three existing coverage/export/workflow browser journeys also pass. Unit,
build and rollback-only release SQL checks pass. CI is configured, without a
claimed remote run. Production remains the verified P2-01 release above; hosted
migration/publication and acceptance are the next delivery step. No ERP source,
case content or CH-* acceptance changes are required for this coordination feature.

P2-02 release preparation (2026-10-30): the dedicated seven-to-eight entry point
is implemented, sharing the historical release safeguards while requiring
format-2 archives with review history. Both migration plans pass local
rollback-only rehearsal; the new plan refuses replay, expired/future backups and
changed inventories, preserving all local fingerprints. Hosted collaboration
acceptance is available behind an explicit flag/exact-target guard, with separate
private fixtures. Local acceptance reran successfully: 47 API checks, the
three-session browser journey with desktop/mobile inspection, 36 unit checks,
TypeScript/build and a zero-vulnerability npm audit. Production migration,
publication and hosted collaboration acceptance remain pending; these tooling
checks do not establish online P2-02 delivery. No ERP case changes are needed.
Tooling commit: `207eba8`. The attempted read-only hosted backup was rejected
before execution by automatic approval review, which requires explicit permission
for copying all project data, evidence and the database dump into private ignored
local backup directories. No fresh hosted archive/plan was created. This approval
and the pending production migration/publication approval are the next action;
the deployed P2-01 source, URL and seven-version schema remain unchanged.
