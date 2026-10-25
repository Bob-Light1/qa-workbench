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
| P2-02 | Twenty-user collaboration and bulk work        | NOT STARTED | Concurrent work verified with twenty accounts                 |
| P3-01 | Automated result ingestion and impact checks   | NOT STARTED | Provenance and history preserved                              |
| P3-02 | Scheduled backups and useful reporting         | NOT STARTED | Recovery exercised and indicators actionable                  |

Phase 1 is delivered: P1-07 passes on the verified HTTPS deployment. The first
bounded P2-01 increment is implemented and validated locally: revision-aware
roadmap coverage by campaign and the optional ERP-011–ERP-013 catalog in
data/erp-cases-phase2.json. It is not deployed. ERP-001–ERP-010 remain
unchanged. New cases cover direct cross-campus navigation, student/admin role
separation and hidden-module navigation, linked to existing ERP phase-1-B rows 2/3
and the CH-2 manual complement. No ERP roadmap ordering or acceptance boundary
changes. Revision-bound case reviews are also implemented and validated locally:
admin/editor opinions, immutable author/revision history, stale/concurrent-write
refusal, tester reads and portable archive format 2 with format-1 compatibility.
These two increments still require a hosted release and hosted acceptance.
The local invitation runtime blocker was recovered on 2026-10-25. Release readiness
and isolated hosted acceptance commands are prepared; production migrations and
frontend publication await explicit owner approval after automatic approval review
refused the schema change. No new online release is claimed.
Broader ERP coverage remains open; this coordination feature requires no ERP case changes.
P2-02 remains next after the P2-01 delivery/coverage milestone. Phase 3 has not
started. Building this app does not complete
ERP CH-0 acceptance, CH-2, CH-4 or other existing QA work items.
